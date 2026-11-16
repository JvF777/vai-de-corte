-- Nome digitado em cada agendamento pelo link público.
--
-- O cadastro do cliente é identificado pelo WhatsApp e, por segurança, o link
-- público não troca o nome de um cliente que já existe (qualquer um poderia
-- digitar o número de outra pessoa). Só que isso fazia a confirmação, a
-- mensagem de WhatsApp e o aviso no celular mostrarem o nome antigo quando a
-- mesma pessoa agendava de novo com outro nome.
--
-- Agora cada agendamento guarda o nome que foi digitado nele. O cadastro do
-- cliente continua igual; telas e avisos usam o nome do agendamento quando ele
-- existe (os antigos e os manuais continuam usando o nome do cadastro).

alter table public.agendamentos
  add column if not exists cliente_nome text
    check (cliente_nome is null or length(cliente_nome) between 2 and 120);

comment on column public.agendamentos.cliente_nome is
  'Nome digitado pelo cliente neste agendamento (link público). Nulo = usar clientes.nome.';

create or replace function privado.agendamento_json(p_agendamento_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', a.id,
    'inicio', a.inicio,
    'fim', a.fim,
    'status', a.status,
    'preco_centavos', a.preco_centavos,
    'duracao_minutos', a.duracao_minutos,
    'cliente_nome', split_part(coalesce(a.cliente_nome, c.nome), ' ', 1),
    'servico', jsonb_build_object('id', s.id, 'nome', s.nome),
    'barbeiro', jsonb_build_object('id', b.id, 'nome', b.nome),
    'barbearia', jsonb_build_object(
      'nome', ba.nome,
      'slug', ba.slug,
      'whatsapp', ba.whatsapp,
      'endereco', ba.endereco,
      'cidade', ba.cidade,
      'uf', ba.uf,
      'maps_url', ba.maps_url
    )
  )
  from public.agendamentos a
  join public.clientes c   on c.id = a.cliente_id
  join public.servicos s   on s.id = a.servico_id
  join public.barbeiros b  on b.id = a.barbeiro_id
  join public.barbearias ba on ba.id = a.barbearia_id
  where a.id = p_agendamento_id;
$$;

create or replace function public.criar_agendamento_publico(
  p_slug         text,
  p_servico_id   uuid,
  p_barbeiro_id  uuid,
  p_inicio       timestamptz,
  p_nome         text,
  p_whatsapp     text,
  p_aceite_lgpd  boolean,
  p_observacoes  text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  c_max_futuros  constant integer := 3;  -- agendamentos futuros ativos por WhatsApp
  v_tz           text := privado.fuso();
  v_barbearia_id uuid;
  v_nome         text := trim(regexp_replace(coalesce(p_nome, ''), '\s+', ' ', 'g'));
  v_whatsapp     text := public.normalizar_whatsapp(p_whatsapp);
  v_cliente_id   uuid;
  v_barbeiro_id  uuid;
  v_motivo       text;
  v_candidato    uuid;
  v_agendamento  uuid;
begin
  select id into v_barbearia_id from public.barbearias where slug = p_slug and ativo;
  if not found then
    raise exception 'BARBEARIA_NAO_ENCONTRADA' using detail = 'Barbearia não encontrada.';
  end if;

  if coalesce(p_aceite_lgpd, false) is false then
    raise exception 'LGPD_OBRIGATORIO' using detail = 'É preciso aceitar o uso dos dados para agendar.';
  end if;
  if length(v_nome) < 2 or length(v_nome) > 120 then
    raise exception 'DADOS_INVALIDOS' using detail = 'Informe seu nome.';
  end if;
  if v_whatsapp is null then
    raise exception 'DADOS_INVALIDOS' using detail = 'Informe um WhatsApp válido com DDD.';
  end if;
  if p_inicio is null or p_servico_id is null then
    raise exception 'DADOS_INVALIDOS' using detail = 'Escolha o serviço e o horário.';
  end if;
  if not exists (
    select 1 from public.servicos where id = p_servico_id and barbearia_id = v_barbearia_id and ativo
  ) then
    raise exception 'SERVICO_INVALIDO' using detail = 'Serviço indisponível.';
  end if;

  -- Escolha/validação do barbeiro, sempre com o lock do barbeiro seguro.
  if p_barbeiro_id is not null then
    perform privado.travar_barbeiro(p_barbeiro_id);
    v_motivo := privado.motivo_horario_indisponivel(v_barbearia_id, p_barbeiro_id, p_servico_id, p_inicio);
    if v_motivo is null then
      v_barbeiro_id := p_barbeiro_id;
    end if;
  else
    for v_candidato in
      select b.id
        from public.barbeiros b
        join public.barbeiro_servicos bs on bs.barbeiro_id = b.id and bs.servico_id = p_servico_id
       where b.barbearia_id = v_barbearia_id and b.ativo
       order by (
         select count(*) from public.agendamentos a
          where a.barbeiro_id = b.id
            and a.status in ('agendado', 'confirmado', 'concluido')
            and (a.inicio at time zone v_tz)::date = (p_inicio at time zone v_tz)::date
       ), b.ordem, b.id
    loop
      perform privado.travar_barbeiro(v_candidato);
      v_motivo := privado.motivo_horario_indisponivel(v_barbearia_id, v_candidato, p_servico_id, p_inicio);
      if v_motivo is null then
        v_barbeiro_id := v_candidato;
        exit;
      end if;
    end loop;
    v_motivo := coalesce(v_motivo, 'HORARIO_INDISPONIVEL');
  end if;

  if v_barbeiro_id is null then
    raise exception '%', v_motivo using detail = case v_motivo
      when 'SERVICO_INVALIDO'     then 'Serviço indisponível.'
      when 'BARBEIRO_INVALIDO'    then 'Este barbeiro não faz esse serviço.'
      when 'ANTECEDENCIA_MINIMA'  then 'Esse horário já passou ou está muito em cima da hora.'
      when 'FORA_DA_JANELA'       then 'Ainda não é possível agendar para essa data.'
      else 'Esse horário não está mais disponível. Escolha outro.'
    end;
  end if;

  -- Cliente identificado pelo WhatsApp dentro da barbearia. Não sobrescreve o nome
  -- de um cliente já cadastrado (qualquer um poderia digitar o número de outra pessoa).
  insert into public.clientes (barbearia_id, nome, whatsapp, consentimento_lgpd_em)
  values (v_barbearia_id, v_nome, v_whatsapp, now())
  on conflict (barbearia_id, whatsapp)
    do update set consentimento_lgpd_em = now()
  returning id into v_cliente_id;

  if (
    select count(*) from public.agendamentos
     where cliente_id = v_cliente_id
       and status in ('agendado', 'confirmado')
       and inicio > now()
  ) >= c_max_futuros then
    raise exception 'LIMITE_AGENDAMENTOS'
      using detail = 'Você já tem agendamentos marcados. Fale com a barbearia pelo WhatsApp.';
  end if;

  begin
    insert into public.agendamentos (
      barbearia_id, barbeiro_id, servico_id, cliente_id, cliente_nome, inicio, status, origem, observacoes
    )
    values (
      v_barbearia_id, v_barbeiro_id, p_servico_id, v_cliente_id, v_nome, p_inicio, 'agendado', 'link_publico',
      nullif(left(trim(coalesce(p_observacoes, '')), 500), '')
    )
    returning id into v_agendamento;
  exception when exclusion_violation then
    -- Rede de segurança: um agendamento manual concorrente ocupou o horário.
    raise exception 'HORARIO_INDISPONIVEL' using detail = 'Esse horário não está mais disponível. Escolha outro.';
  end;

  return privado.agendamento_json(v_agendamento);
end;
$$;

create or replace function public.destinatarios_aviso_agendamento(p_agendamento_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ag public.agendamentos;
  v_resultado jsonb;
begin
  update public.agendamentos
     set aviso_push_em = now()
   where id = p_agendamento_id
     and origem = 'link_publico'
     and aviso_push_em is null
     and created_at > now() - interval '10 minutes'
  returning * into v_ag;

  if not found then
    return null;
  end if;

  select jsonb_build_object(
           'barbearia', b.nome,
           'barbeiro_id', v_ag.barbeiro_id,
           'barbeiro', br.nome,
           'servico', s.nome,
           'cliente', coalesce(v_ag.cliente_nome, c.nome),
           'inicio', v_ag.inicio,
           'inscricoes', coalesce((
             select jsonb_agg(jsonb_build_object('endpoint', i.endpoint, 'p256dh', i.p256dh, 'auth', i.auth))
               from public.inscricoes_push i
              where i.usuario_id in (
                      select bu.usuario_id
                        from public.barbearia_usuarios bu
                       where bu.barbearia_id = v_ag.barbearia_id
                         and (bu.papel = 'dono' or bu.usuario_id = br.usuario_id)
                    )
           ), '[]'::jsonb)
         )
    into v_resultado
    from public.barbearias b
    join public.barbeiros br on br.id = v_ag.barbeiro_id
    join public.servicos s on s.id = v_ag.servico_id
    join public.clientes c on c.id = v_ag.cliente_id
   where b.id = v_ag.barbearia_id;

  return v_resultado;
end;
$$;
