-- Cadastro de barbearia: cada barbeiro pode fazer só alguns serviços.
--
-- Cada item de p_barbeiros aceita "servicos": [0, 2], que são as posições (a partir de 0)
-- dos serviços em p_servicos que aquele barbeiro faz. Sem a chave, ele faz todos
-- (igual à versão anterior). Todo serviço precisa de pelo menos um barbeiro.

create or replace function public.criar_barbearia(
  p_nome       text,
  p_slug       text,
  p_whatsapp   text,
  p_cidade     text,
  p_uf         text,
  p_endereco   text,
  p_horarios   jsonb,
  p_servicos   jsonb,
  p_barbeiros  jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_usuario      uuid := auth.uid();
  v_nome         text := trim(regexp_replace(coalesce(p_nome, ''), '\s+', ' ', 'g'));
  v_slug         text := lower(trim(coalesce(p_slug, '')));
  v_whatsapp     text := public.normalizar_whatsapp(p_whatsapp);
  v_cidade       text := nullif(trim(coalesce(p_cidade, '')), '');
  v_uf           text := nullif(upper(trim(coalesce(p_uf, ''))), '');
  v_endereco     text := nullif(trim(coalesce(p_endereco, '')), '');
  v_barbearia_id uuid;
  v_barbeiro_id  uuid;
  v_item         jsonb;
  v_ordem        integer;
  v_texto        text;
  v_servicos     uuid[] := '{}';
  v_servico_id   uuid;
  v_indices      jsonb;
begin
  if v_usuario is null then
    raise exception 'NAO_AUTENTICADO' using detail = 'Entre na sua conta para cadastrar a barbearia.';
  end if;

  -- Uma pessoa cadastra no máximo 3 barbearias (evita abuso; o time libera mais se precisar).
  -- O lock por usuário impede dois cliques simultâneos de passarem do limite.
  perform pg_advisory_xact_lock(hashtext('criar_barbearia'), hashtext(v_usuario::text));
  if (select count(*) from public.barbearia_usuarios where usuario_id = v_usuario and papel = 'dono') >= 3 then
    raise exception 'LIMITE_BARBEARIAS' using detail = 'Você já cadastrou o limite de barbearias. Fale com o time do Vai de Corte.';
  end if;

  -- Dados da barbearia ------------------------------------------------------
  if length(v_nome) < 2 or length(v_nome) > 120 then
    raise exception 'DADOS_INVALIDOS' using detail = 'Digite o nome da barbearia.';
  end if;
  if v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(v_slug) not between 3 and 60 or privado.slug_reservado(v_slug) then
    raise exception 'SLUG_INVALIDO' using detail = 'Escolha outro link: use de 3 a 60 letras, números e hífens.';
  end if;
  if v_whatsapp is null then
    raise exception 'DADOS_INVALIDOS' using detail = 'Digite o WhatsApp da barbearia com DDD.';
  end if;
  if v_uf is not null and v_uf !~ '^[A-Z]{2}$' then
    raise exception 'DADOS_INVALIDOS' using detail = 'Use a sigla do estado, como SP.';
  end if;
  if length(v_cidade) > 100 or length(v_endereco) > 300 then
    raise exception 'DADOS_INVALIDOS' using detail = 'Endereço ou cidade muito longos.';
  end if;

  -- Listas ------------------------------------------------------------------
  if jsonb_typeof(p_horarios) is distinct from 'array' or jsonb_array_length(p_horarios) not between 1 and 7 then
    raise exception 'DADOS_INVALIDOS' using detail = 'Marque pelo menos um dia de funcionamento.';
  end if;
  if jsonb_typeof(p_servicos) is distinct from 'array' or jsonb_array_length(p_servicos) not between 1 and 30 then
    raise exception 'DADOS_INVALIDOS' using detail = 'Cadastre pelo menos um serviço.';
  end if;
  if jsonb_typeof(p_barbeiros) is distinct from 'array' or jsonb_array_length(p_barbeiros) not between 1 and 20 then
    raise exception 'DADOS_INVALIDOS' using detail = 'Cadastre pelo menos um barbeiro.';
  end if;
  if (select count(*) from jsonb_array_elements(p_barbeiros) b where (b ->> 'sou_eu')::boolean is true) > 1 then
    raise exception 'DADOS_INVALIDOS' using detail = 'Só um barbeiro pode ser você.';
  end if;

  -- Gravação ----------------------------------------------------------------
  begin
    insert into public.barbearias (nome, slug, whatsapp, cidade, uf, endereco)
    values (v_nome, v_slug, v_whatsapp, v_cidade, v_uf, v_endereco)
    returning id into v_barbearia_id;
  exception when unique_violation then
    raise exception 'SLUG_EM_USO' using detail = 'Esse link já é de outra barbearia. Escolha outro.';
  end;

  insert into public.barbearia_usuarios (barbearia_id, usuario_id, papel)
  values (v_barbearia_id, v_usuario, 'dono');

  begin
    insert into public.horarios_funcionamento (barbearia_id, dia_semana, abre, fecha)
    select v_barbearia_id, (h ->> 'dia')::smallint, (h ->> 'abre')::time, (h ->> 'fecha')::time
      from jsonb_array_elements(p_horarios) h;
  exception when others then
    raise exception 'DADOS_INVALIDOS' using detail = 'Confira os horários: cada dia uma vez, e o fechamento depois da abertura.';
  end;

  v_ordem := 0;
  for v_item in select * from jsonb_array_elements(p_servicos) loop
    v_ordem := v_ordem + 1;
    v_texto := trim(regexp_replace(coalesce(v_item ->> 'nome', ''), '\s+', ' ', 'g'));
    begin
      insert into public.servicos (barbearia_id, nome, preco_centavos, duracao_minutos, ordem)
      values (v_barbearia_id, v_texto, (v_item ->> 'preco_centavos')::integer,
              (v_item ->> 'duracao_minutos')::integer, v_ordem)
      returning id into v_servico_id;
      v_servicos := v_servicos || v_servico_id;
    exception when others then
      raise exception 'DADOS_INVALIDOS' using detail = 'Confira os serviços: nome, preço e duração de 5 min a 8 h.';
    end;
  end loop;

  v_ordem := 0;
  for v_item in select * from jsonb_array_elements(p_barbeiros) loop
    v_ordem := v_ordem + 1;
    v_texto := trim(regexp_replace(coalesce(v_item ->> 'nome', ''), '\s+', ' ', 'g'));
    begin
      insert into public.barbeiros (barbearia_id, nome, ordem, usuario_id)
      values (v_barbearia_id, v_texto, v_ordem,
              case when (v_item ->> 'sou_eu')::boolean is true then v_usuario end)
      returning id into v_barbeiro_id;
    exception when others then
      raise exception 'DADOS_INVALIDOS' using detail = 'Confira o nome dos barbeiros (de 2 a 80 letras).';
    end;

    -- "servicos": posições (a partir de 0) em p_servicos. Sem a chave, faz todos.
    v_indices := v_item -> 'servicos';
    if v_indices is null then
      insert into public.barbeiro_servicos (barbearia_id, barbeiro_id, servico_id)
      select v_barbearia_id, v_barbeiro_id, s from unnest(v_servicos) s;
    else
      if jsonb_typeof(v_indices) is distinct from 'array' or jsonb_array_length(v_indices) = 0
         or exists (select 1 from jsonb_array_elements(v_indices) x
                     where jsonb_typeof(x) <> 'number' or (x::text)::integer not between 0 and cardinality(v_servicos) - 1) then
        raise exception 'DADOS_INVALIDOS' using detail = format('Marque pelo menos um serviço para %s.', v_texto);
      end if;
      insert into public.barbeiro_servicos (barbearia_id, barbeiro_id, servico_id)
      select distinct v_barbearia_id, v_barbeiro_id, v_servicos[(x::text)::integer + 1]
        from jsonb_array_elements(v_indices) x;
    end if;

    insert into public.horarios_barbeiros (barbearia_id, barbeiro_id, dia_semana, inicio, fim)
    select v_barbearia_id, v_barbeiro_id, hf.dia_semana, hf.abre, hf.fecha
      from public.horarios_funcionamento hf where hf.barbearia_id = v_barbearia_id;
  end loop;

  -- Serviço que nenhum barbeiro faz não aparece no link: melhor avisar agora.
  if exists (select 1 from unnest(v_servicos) s
              where not exists (select 1 from public.barbeiro_servicos bs where bs.servico_id = s)) then
    raise exception 'DADOS_INVALIDOS' using detail = 'Todo serviço precisa de pelo menos um barbeiro que faça.';
  end if;

  return jsonb_build_object('id', v_barbearia_id, 'slug', v_slug);
end;
$$;

