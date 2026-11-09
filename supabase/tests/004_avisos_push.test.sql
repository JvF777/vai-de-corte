-- Testes dos avisos no celular (Web Push) (pgTAP).
-- Rodar com: supabase test db   (precisa do seed.sql carregado)
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(16);

-- dono_a -> dono da Navalha | carlos -> barbeiro Carlos (Navalha) | rafael -> barbeiro Rafael (Navalha)
-- dono_b -> dono da Corte Fino
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-4000-8000-00000000000a', 'dono_a@teste.local'),
  ('cccccccc-0000-4000-8000-00000000000c', 'carlos@teste.local'),
  ('dddddddd-0000-4000-8000-00000000000d', 'rafael@teste.local'),
  ('bbbbbbbb-0000-4000-8000-00000000000b', 'dono_b@teste.local'),
  ('eeeeeeee-0000-4000-8000-00000000000e', 'sem_barbearia@teste.local');

insert into public.barbearia_usuarios (barbearia_id, usuario_id, papel) values
  ('a1111111-1111-4111-8111-111111111111', 'aaaaaaaa-0000-4000-8000-00000000000a', 'dono'),
  ('a1111111-1111-4111-8111-111111111111', 'cccccccc-0000-4000-8000-00000000000c', 'barbeiro'),
  ('a1111111-1111-4111-8111-111111111111', 'dddddddd-0000-4000-8000-00000000000d', 'barbeiro'),
  ('b2222222-2222-4222-8222-222222222222', 'bbbbbbbb-0000-4000-8000-00000000000b', 'dono');

update public.barbeiros set usuario_id = 'cccccccc-0000-4000-8000-00000000000c'
 where id = 'c1111111-1111-4111-8111-111111111111';
update public.barbeiros set usuario_id = 'dddddddd-0000-4000-8000-00000000000d'
 where id = 'c2222222-2222-4222-8222-222222222222';

create temp table t as
select (select d::date from generate_series(current_date + 2, current_date + 9, interval '1 day') g(d)
         where extract(dow from d) in (3, 4, 5) order by d limit 1) as dia;
create temp table ids (nome text primary key, id uuid);
grant select on t to anon, authenticated, service_role;
grant select, insert on ids to anon, authenticated, service_role;

create function pg_temp.como(p_usuario uuid) returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', p_usuario, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;

create function pg_temp.como_anon() returns void language sql as $$
  select set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
$$;

create function pg_temp.como_servidor() returns void language sql as $$
  select set_config('request.jwt.claims', '{"role":"service_role"}', true);
  set local role service_role;
$$;

create function pg_temp.ligar(p_endpoint text) returns void language sql as $$
  select public.salvar_inscricao_push(p_endpoint, repeat('p', 87), repeat('a', 22), 'Teste');
$$;

-- ---------------------------------------------------------------------------
-- Cada um liga os avisos no próprio aparelho
-- ---------------------------------------------------------------------------
select pg_temp.como('aaaaaaaa-0000-4000-8000-00000000000a');
select lives_ok($$ select pg_temp.ligar('https://push.teste/dono-a') $$, 'dono liga os avisos');

select pg_temp.como('cccccccc-0000-4000-8000-00000000000c');
select pg_temp.ligar('https://push.teste/carlos');

select pg_temp.como('dddddddd-0000-4000-8000-00000000000d');
select pg_temp.ligar('https://push.teste/rafael');

select pg_temp.como('bbbbbbbb-0000-4000-8000-00000000000b');
select pg_temp.ligar('https://push.teste/dono-b');

select is((select count(*)::int from public.inscricoes_push), 1, 'cada um só vê os próprios aparelhos');

select pg_temp.como('eeeeeeee-0000-4000-8000-00000000000e');
select throws_ok($$ select pg_temp.ligar('https://push.teste/intruso') $$, 'SEM_PERMISSAO',
  'quem não está em nenhuma barbearia não liga avisos');

select throws_ok(
  $$ insert into public.inscricoes_push (endpoint, p256dh, auth) values ('https://push.teste/x', repeat('p', 87), repeat('a', 22)) $$,
  '42501', null, 'não dá para gravar direto na tabela, só pela RPC');

-- Mesmo celular, outro login: o aparelho passa a ser do Carlos.
select pg_temp.como('cccccccc-0000-4000-8000-00000000000c');
select pg_temp.ligar('https://push.teste/rafael');
select is((select count(*)::int from public.inscricoes_push), 2, 'aparelho trocado de login fica com quem entrou');
select pg_temp.como('dddddddd-0000-4000-8000-00000000000d');
select is((select count(*)::int from public.inscricoes_push), 0, '... e sai de quem estava antes');
select pg_temp.ligar('https://push.teste/rafael-2');

-- ---------------------------------------------------------------------------
-- Agendamento pelo link: avisa o dono e o barbeiro do horário, e só eles
-- ---------------------------------------------------------------------------
select pg_temp.como_anon();
insert into ids
select 'link', (public.criar_agendamento_publico('ficticia-navalha-de-ouro', 'e1111111-1111-4111-8111-111111111111',
  'c2222222-2222-4222-8222-222222222222', ((select dia from t) + time '16:00') at time zone 'America/Sao_Paulo',
  'Cliente do Link', '11 96666-0001', true) ->> 'id')::uuid;

select throws_ok($$ select * from public.inscricoes_push $$, '42501', null, 'visitante não lê a tabela de aparelhos');

select throws_ok($$ select public.destinatarios_aviso_agendamento((select id from ids where nome = 'link')) $$,
  '42501', null, 'visitante não pede os aparelhos do dono (só o servidor)');
select throws_ok($$ select public.descartar_inscricoes_push(array['https://push.teste/dono-a']) $$,
  '42501', null, 'visitante não apaga aparelhos');

select pg_temp.como_servidor();
create temp table r as select public.destinatarios_aviso_agendamento((select id from ids where nome = 'link')) as j;
grant select on r to anon, authenticated, service_role;

select is(
  (select array_agg(e ->> 'endpoint' order by e ->> 'endpoint') from r, jsonb_array_elements(j -> 'inscricoes') e),
  array['https://push.teste/dono-a', 'https://push.teste/rafael-2'],
  'aviso vai para o dono e para o barbeiro do horário (não para o Carlos nem para outra barbearia)');

select is((select j ->> 'cliente' from r), 'Cliente do Link', 'aviso traz o nome do cliente');
select is((select j ->> 'servico' from r), 'Corte', 'aviso traz o serviço');

select is(public.destinatarios_aviso_agendamento((select id from ids where nome = 'link')), null,
  'o aviso só sai uma vez por agendamento');

-- Agendamento manual não gera aviso.
select pg_temp.como('aaaaaaaa-0000-4000-8000-00000000000a');
insert into ids
select 'manual', public.criar_agendamento_manual('a1111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111',
  'e1111111-1111-4111-8111-111111111111', ((select dia from t) + time '16:00') at time zone 'America/Sao_Paulo',
  'Cliente do Balcão', '11 97777-0002');
select pg_temp.como_servidor();
select is(public.destinatarios_aviso_agendamento((select id from ids where nome = 'manual')), null,
  'agendamento manual não gera aviso');

-- Aparelho que o serviço de push recusou é apagado.
select lives_ok($$ select public.descartar_inscricoes_push(array['https://push.teste/dono-a']) $$, 'descarta aparelho expirado');
select pg_temp.como('aaaaaaaa-0000-4000-8000-00000000000a');
select is((select count(*)::int from public.inscricoes_push), 0, 'aparelho expirado some');

select * from finish();
rollback;
