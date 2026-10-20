-- Etapa 1 / Migration 4: funções RPC do link público.
--
-- O visitante (anon) não tem acesso direto a clientes, agendamentos e bloqueios.
-- Ele usa só estas funções, que validam tudo no Postgres:
--   horarios_ocupados(...)              intervalos ocupados para montar a grade
--   criar_agendamento_publico(...)      revalida o horário e grava, com lock
--   consultar_agendamento_publico(...)  dados da tela de confirmação
--
-- Erros são lançados com a mensagem igual a um código estável (ex.: HORARIO_INDISPONIVEL)
-- e o texto amigável em DETAIL, para o app traduzir.
--
-- Grade de horários: os inícios possíveis são múltiplos de intervalo_slot_minutos
-- contados a partir da meia-noite (09:00, 09:30, 10:00...). lib/availability deve
-- seguir a mesma regra.

-- ---------------------------------------------------------------------------
-- Normaliza WhatsApp brasileiro para só dígitos com DDI 55.
-- "(11) 99999-8888" -> "5511999998888". Retorna nulo se não parecer válido.
-- ---------------------------------------------------------------------------
create or replace function public.normalizar_whatsapp(p_numero text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when d ~ '^55[0-9]{10,11}$' then d
    when d ~ '^[0-9]{10,11}$'   then '55' || d
    else null
  end
  from (select regexp_replace(coalesce(p_numero, ''), '[^0-9]', '', 'g') as d) s;
$$;

-- ---------------------------------------------------------------------------
-- Valida se um horário pode ser reservado pelo link público.
-- Retorna nulo se puder, ou o código do motivo.
-- Não trava nada: quem chama deve segurar o lock do barbeiro antes.
-- ---------------------------------------------------------------------------
create or replace function privado.motivo_horario_indisponivel(
  p_barbearia_id uuid,
  p_barbeiro_id  uuid,
  p_servico_id   uuid,
  p_inicio       timestamptz
)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  v_tz          text := privado.fuso();
  v_barbearia   public.barbearias;
  v_duracao     integer;
  v_fim         timestamptz;
  v_local_ini   timestamp;
  v_local_fim   timestamp;
  v_dia         smallint;
  v_minuto_dia  integer;
begin
  select * into v_barbearia from public.barbearias where id = p_barbearia_id and ativo;
  if not found then
    return 'BARBEARIA_NAO_ENCONTRADA';
  end if;

  select duracao_minutos into v_duracao
    from public.servicos
   where id = p_servico_id and barbearia_id = p_barbearia_id and ativo;
  if not found then
    return 'SERVICO_INVALIDO';
  end if;

  if not exists (
    select 1
      from public.barbeiros b
      join public.barbeiro_servicos bs on bs.barbeiro_id = b.id and bs.servico_id = p_servico_id
     where b.id = p_barbeiro_id and b.barbearia_id = p_barbearia_id and b.ativo
  ) then
    return 'BARBEIRO_INVALIDO';
  end if;

  v_fim       := p_inicio + make_interval(mins => v_duracao);
  v_local_ini := p_inicio at time zone v_tz;
  v_local_fim := v_fim at time zone v_tz;
  v_dia       := extract(dow from v_local_ini)::smallint;
  v_minuto_dia := extract(hour from v_local_ini)::integer * 60 + extract(minute from v_local_ini)::integer;

  -- Antecedência mínima (também impede horário no passado) e janela máxima.
  if p_inicio < now() + make_interval(mins => v_barbearia.antecedencia_minima_minutos) then
    return 'ANTECEDENCIA_MINIMA';
  end if;
  if p_inicio > now() + make_interval(days => v_barbearia.janela_agendamento_dias) then
    return 'FORA_DA_JANELA';
  end if;

  -- Precisa cair na grade e não pode atravessar a meia-noite.
  if extract(second from v_local_ini) <> 0
     or v_minuto_dia % v_barbearia.intervalo_slot_minutos <> 0 then
    return 'FORA_DA_GRADE';
  end if;
  if v_local_fim::date <> v_local_ini::date then
    return 'FORA_DO_EXPEDIENTE';
  end if;

  -- Horário de funcionamento da barbearia.
  if not exists (
    select 1 from public.horarios_funcionamento
     where barbearia_id = p_barbearia_id
       and dia_semana = v_dia
       and abre <= v_local_ini::time
       and fecha >= v_local_fim::time
  ) then
    return 'FORA_DO_EXPEDIENTE';
  end if;

  -- Jornada do barbeiro (sem linha no dia = folga fixa) e almoço.
  if not exists (
    select 1 from public.horarios_barbeiros
     where barbeiro_id = p_barbeiro_id
       and dia_semana = v_dia
       and inicio <= v_local_ini::time
       and fim >= v_local_fim::time
       and (
         almoco_inicio is null
         or v_local_fim::time <= almoco_inicio
         or v_local_ini::time >= almoco_fim
       )
  ) then
    return 'FORA_DO_EXPEDIENTE';
  end if;

  -- Bloqueios, folgas e feriados (do barbeiro ou da barbearia toda).
  if exists (
    select 1 from public.bloqueios_agenda
     where barbearia_id = p_barbearia_id
       and (barbeiro_id is null or barbeiro_id = p_barbeiro_id)
       and tstzrange(inicio, fim, '[)') && tstzrange(p_inicio, v_fim, '[)')
  ) then
    return 'HORARIO_BLOQUEADO';
  end if;

  -- Outro agendamento ativo do mesmo barbeiro.
  if exists (
    select 1 from public.agendamentos
     where barbeiro_id = p_barbeiro_id
       and status in ('agendado', 'confirmado', 'concluido')
       and tstzrange(inicio, fim, '[)') && tstzrange(p_inicio, v_fim, '[)')
  ) then
    return 'HORARIO_INDISPONIVEL';
  end if;

  return null;
end;
$$;

revoke all on function privado.motivo_horario_indisponivel(uuid, uuid, uuid, timestamptz) from public;

-- Lock transacional por barbeiro: serializa reservas concorrentes no mesmo barbeiro.
create or replace function privado.travar_barbeiro(p_barbeiro_id uuid)
returns void
language sql
set search_path = ''
as $$
  select pg_advisory_xact_lock(hashtextextended('agenda:' || p_barbeiro_id::text, 0));
$$;

revoke all on function privado.travar_barbeiro(uuid) from public;

-- ---------------------------------------------------------------------------
-- Intervalos ocupados de uma barbearia num período (datas locais, inclusive).
-- barbeiro_id nulo = bloqueio da barbearia inteira.
-- Não expõe nome de cliente nem motivo de bloqueio.
-- ---------------------------------------------------------------------------
create or replace function public.horarios_ocupados(
  p_slug text,
  p_de   date,
  p_ate  date
)
returns table (barbeiro_id uuid, inicio timestamptz, fim timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tz           text := privado.fuso();
  v_barbearia_id uuid;
  v_de           timestamptz;
  v_ate          timestamptz;
begin
  if p_de is null or p_ate is null or p_ate < p_de or p_ate - p_de > 62 then
    raise exception 'PERIODO_INVALIDO' using detail = 'Período inválido (máximo de 62 dias).';
  end if;

  select id into v_barbearia_id from public.barbearias where slug = p_slug and ativo;
  if not found then
    raise exception 'BARBEARIA_NAO_ENCONTRADA' using detail = 'Barbearia não encontrada.';
  end if;

  v_de  := p_de::timestamp at time zone v_tz;
  v_ate := (p_ate + 1)::timestamp at time zone v_tz;

  return query
    select a.barbeiro_id, a.inicio, a.fim
      from public.agendamentos a
     where a.barbearia_id = v_barbearia_id
       and a.status in ('agendado', 'confirmado', 'concluido')
       and a.inicio < v_ate and a.fim > v_de
    union all
    select b.barbeiro_id, b.inicio, b.fim
      from public.bloqueios_agenda b
     where b.barbearia_id = v_barbearia_id
       and b.inicio < v_ate and b.fim > v_de
    order by 2;
end;
$$;

-- ---------------------------------------------------------------------------
-- Monta o JSON usado na confirmação (sem dados sensíveis do cliente).
-- ---------------------------------------------------------------------------
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
    'cliente_nome', split_part(c.nome, ' ', 1),
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

revoke all on function privado.agendamento_json(uuid) from public;

-- ---------------------------------------------------------------------------
-- Cria um agendamento pelo link público.
-- p_barbeiro_id nulo = "qualquer disponível": escolhe o barbeiro livre com
-- menos agendamentos no dia.
-- ---------------------------------------------------------------------------
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
      barbearia_id, barbeiro_id, servico_id, cliente_id, inicio, status, origem, observacoes
    )
    values (
      v_barbearia_id, v_barbeiro_id, p_servico_id, v_cliente_id, p_inicio, 'agendado', 'link_publico',
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

-- ---------------------------------------------------------------------------
-- Dados da tela de confirmação, a partir do id (uuid aleatório) do agendamento.
-- ---------------------------------------------------------------------------
create or replace function public.consultar_agendamento_publico(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select privado.agendamento_json(p_id);
$$;

revoke all on function
  public.horarios_ocupados(text, date, date),
  public.criar_agendamento_publico(text, uuid, uuid, timestamptz, text, text, boolean, text),
  public.consultar_agendamento_publico(uuid)
from public;

grant execute on function
  public.normalizar_whatsapp(text),
  public.horarios_ocupados(text, date, date),
  public.criar_agendamento_publico(text, uuid, uuid, timestamptz, text, text, boolean, text),
  public.consultar_agendamento_publico(uuid)
to anon, authenticated, service_role;
