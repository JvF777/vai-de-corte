-- Cadastro de barbearia pelo próprio dono (sem o time rodar SQL).
--
--   slug_disponivel(p_slug)   o link escolhido está livre?
--   criar_barbearia(...)      cria barbearia, vínculo de dono, horários, serviços e
--                             barbeiros numa transação só. O link já sai pronto para agendar.
--
-- As tabelas continuam sem política de INSERT em barbearias: a única porta de
-- entrada para quem está logado é esta função, que valida tudo e limita a
-- quantidade de barbearias por usuário.

-- Links que não podem ser usados por barbearias reais.
create or replace function privado.slug_reservado(p_slug text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_slug like 'ficticia-%'
      or p_slug in ('admin', 'painel', 'login', 'cadastro', 'api', 'suporte', 'ajuda', 'teste',
                    'vai-de-corte', 'vaidecorte', 'barbearia', 'barbearias');
$$;

-- ---------------------------------------------------------------------------
-- O link está livre? (só para quem está logado, durante o cadastro)
-- ---------------------------------------------------------------------------
create or replace function public.slug_disponivel(p_slug text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
     and length(p_slug) between 3 and 60
     and not privado.slug_reservado(p_slug)
     and not exists (select 1 from public.barbearias where slug = p_slug);
$$;

revoke all on function public.slug_disponivel(text) from public, anon;
grant execute on function public.slug_disponivel(text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Cria a barbearia completa para o usuário logado, que vira o dono.
--
-- p_horarios   [{"dia": 2, "abre": "09:00", "fecha": "19:00"}, ...]   (0 = domingo)
-- p_servicos   [{"nome": "Corte", "preco_centavos": 4000, "duracao_minutos": 30}, ...]
-- p_barbeiros  [{"nome": "Carlos", "sou_eu": true}, ...]
--
-- Cada barbeiro faz todos os serviços e trabalha no horário da barbearia.
-- O barbeiro marcado com sou_eu fica ligado ao login do dono (vê a própria agenda).
-- Erros: NAO_AUTENTICADO, LIMITE_BARBEARIAS, DADOS_INVALIDOS, SLUG_INVALIDO, SLUG_EM_USO.
-- ---------------------------------------------------------------------------
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
              (v_item ->> 'duracao_minutos')::integer, v_ordem);
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

    insert into public.barbeiro_servicos (barbearia_id, barbeiro_id, servico_id)
    select v_barbearia_id, v_barbeiro_id, s.id from public.servicos s where s.barbearia_id = v_barbearia_id;

    insert into public.horarios_barbeiros (barbearia_id, barbeiro_id, dia_semana, inicio, fim)
    select v_barbearia_id, v_barbeiro_id, hf.dia_semana, hf.abre, hf.fecha
      from public.horarios_funcionamento hf where hf.barbearia_id = v_barbearia_id;
  end loop;

  return jsonb_build_object('id', v_barbearia_id, 'slug', v_slug);
end;
$$;

revoke all on function public.criar_barbearia(text, text, text, text, text, text, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.criar_barbearia(text, text, text, text, text, text, jsonb, jsonb, jsonb)
  to authenticated, service_role;

revoke all on function privado.slug_reservado(text) from public;
grant execute on function privado.slug_reservado(text) to authenticated, service_role;
