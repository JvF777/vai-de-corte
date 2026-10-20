-- Testes de isolamento entre barbearias e permissões por papel (pgTAP).
-- Rodar com: supabase test db   (precisa do seed.sql carregado)
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(30);

-- ---------------------------------------------------------------------------
-- Preparação: usuários de teste
--   dono_a  -> dono da Navalha de Ouro (barbearia 1)
--   carlos  -> barbeiro da Navalha de Ouro, ligado ao barbeiro Carlos
--   dono_b  -> dono da Corte Fino (barbearia 2)
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-4000-8000-00000000000a', 'dono_a@teste.local'),
  ('cccccccc-0000-4000-8000-00000000000c', 'carlos@teste.local'),
  ('bbbbbbbb-0000-4000-8000-00000000000b', 'dono_b@teste.local');

insert into public.barbearia_usuarios (barbearia_id, usuario_id, papel) values
  ('a1111111-1111-4111-8111-111111111111', 'aaaaaaaa-0000-4000-8000-00000000000a', 'dono'),
  ('a1111111-1111-4111-8111-111111111111', 'cccccccc-0000-4000-8000-00000000000c', 'barbeiro'),
  ('b2222222-2222-4222-8222-222222222222', 'bbbbbbbb-0000-4000-8000-00000000000b', 'dono');

update public.barbeiros set usuario_id = 'cccccccc-0000-4000-8000-00000000000c'
 where id = 'c1111111-1111-4111-8111-111111111111';

select is(
  (select count(*)::int from public.perfis where id in (
    'aaaaaaaa-0000-4000-8000-00000000000a', 'cccccccc-0000-4000-8000-00000000000c', 'bbbbbbbb-0000-4000-8000-00000000000b')),
  3, 'trigger cria perfil para cada usuário novo');

-- Executa um UPDATE/DELETE e devolve quantas linhas o RLS deixou alterar.
create function pg_temp.afetadas(p_sql text) returns integer language plpgsql as $$
declare n integer;
begin
  execute p_sql;
  get diagnostics n = row_count;
  return n;
end;
$$;

create function pg_temp.como(p_usuario uuid) returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', p_usuario, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;

-- ---------------------------------------------------------------------------
-- Dono da barbearia B não enxerga nem altera nada da barbearia A
-- ---------------------------------------------------------------------------
select pg_temp.como('bbbbbbbb-0000-4000-8000-00000000000b');

select is((select count(*)::int from public.clientes), 1, 'dono B vê só os clientes da B');
select is((select count(*)::int from public.clientes where barbearia_id = 'a1111111-1111-4111-8111-111111111111'), 0,
  'dono B não vê clientes da A');
select is((select count(*)::int from public.agendamentos where barbearia_id = 'a1111111-1111-4111-8111-111111111111'), 0,
  'dono B não vê agendamentos da A');
select is((select count(*)::int from public.agendamentos), 2, 'dono B vê os agendamentos da B');
select is((select count(*)::int from public.bloqueios_agenda), 0, 'dono B não vê bloqueios da A');
select is((select count(*)::int from public.barbearia_usuarios), 1, 'dono B vê só a própria equipe');

select is(
  pg_temp.afetadas($q$ update public.barbearias set nome = 'invadida' where id = 'a1111111-1111-4111-8111-111111111111' $q$), 0, 'dono B não edita a barbearia A');

select is(
  pg_temp.afetadas($q$ update public.servicos set preco_centavos = 1 where barbearia_id = 'a1111111-1111-4111-8111-111111111111' $q$), 0, 'dono B não edita serviços da A');

select throws_ok(
  $$ insert into public.clientes (barbearia_id, nome, whatsapp)
     values ('a1111111-1111-4111-8111-111111111111', 'Intruso', '5511988887777') $$,
  '42501', null, 'dono B não cria cliente na A');

select throws_ok(
  $$ insert into public.barbearia_usuarios (barbearia_id, usuario_id, papel)
     values ('a1111111-1111-4111-8111-111111111111', 'bbbbbbbb-0000-4000-8000-00000000000b', 'dono') $$,
  '42501', null, 'dono B não se adiciona como dono da A');

select throws_ok(
  $$ insert into public.agendamentos (barbearia_id, barbeiro_id, servico_id, cliente_id, inicio)
     values ('b2222222-2222-4222-8222-222222222222', 'c1111111-1111-4111-8111-111111111111',
             'f2222222-1111-4222-8222-222222222222', '0b000000-0000-4000-8000-000000000001', now() + interval '3 days') $$,
  '23503', null, 'FK composta impede usar barbeiro da A num agendamento da B');

select is(
  pg_temp.afetadas($q$ delete from public.barbearia_usuarios where usuario_id = 'bbbbbbbb-0000-4000-8000-00000000000b' $q$), 0, 'dono não remove o próprio vínculo');

reset role;

-- ---------------------------------------------------------------------------
-- Dono da A vê tudo da A
-- ---------------------------------------------------------------------------
select pg_temp.como('aaaaaaaa-0000-4000-8000-00000000000a');

select is((select count(*)::int from public.clientes), 2, 'dono A vê os 2 clientes da A');
select is((select count(*)::int from public.agendamentos), 5, 'dono A vê os 5 agendamentos da A');
select is((select count(*)::int from public.barbearia_usuarios), 2, 'dono A vê a equipe da A');
select is((select count(*)::int from public.perfis), 2, 'dono A vê perfis só da própria equipe');
select is(
  pg_temp.afetadas($q$ update public.barbearias set descricao = 'nova descrição' where id = 'a1111111-1111-4111-8111-111111111111' $q$), 1, 'dono A edita a própria barbearia');

reset role;

-- ---------------------------------------------------------------------------
-- Barbeiro Carlos: só a própria agenda
-- ---------------------------------------------------------------------------
select pg_temp.como('cccccccc-0000-4000-8000-00000000000c');

select is((select count(*)::int from public.agendamentos), 3, 'Carlos vê só os próprios agendamentos');
select is(
  pg_temp.afetadas($q$ update public.agendamentos set status = 'cancelado'
               where barbeiro_id = 'c2222222-2222-4222-8222-222222222222' $q$), 0, 'Carlos não altera agendamentos do Rafael');
select is(
  pg_temp.afetadas($q$ update public.agendamentos set status = 'concluido'
               where barbeiro_id = 'c1111111-1111-4111-8111-111111111111' and status = 'confirmado' $q$), 1, 'Carlos conclui o próprio agendamento');
select throws_ok(
  $$ insert into public.bloqueios_agenda (barbearia_id, barbeiro_id, inicio, fim)
     values ('a1111111-1111-4111-8111-111111111111', null, now() + interval '1 day', now() + interval '1 day 1 hour') $$,
  '42501', null, 'barbeiro não bloqueia a barbearia inteira');
select lives_ok(
  $$ insert into public.bloqueios_agenda (barbearia_id, barbeiro_id, inicio, fim)
     values ('a1111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111',
             now() + interval '1 day', now() + interval '1 day 1 hour') $$,
  'barbeiro bloqueia o próprio horário');
select is(
  pg_temp.afetadas($q$ update public.servicos set preco_centavos = 1 $q$), 0,
  'barbeiro não altera preços');
select is(
  pg_temp.afetadas($q$ update public.barbearias set nome = 'x' $q$), 0,
  'barbeiro não edita dados da barbearia');

reset role;

-- ---------------------------------------------------------------------------
-- Visitante anônimo (link público)
-- ---------------------------------------------------------------------------
update public.barbearias set ativo = false where id = 'b2222222-2222-4222-8222-222222222222';
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;

select is((select count(*)::int from public.barbearias), 1, 'anon vê só barbearias ativas');
select is((select count(*)::int from public.servicos where barbearia_id = 'b2222222-2222-4222-8222-222222222222'), 0,
  'anon não vê serviços de barbearia inativa');
select throws_ok($$ select * from public.clientes $$, '42501', null, 'anon não lê clientes');
select throws_ok($$ select * from public.agendamentos $$, '42501', null, 'anon não lê agendamentos');
select throws_ok(
  $$ update public.servicos set preco_centavos = 1 $$, '42501', null, 'anon não altera o catálogo');

reset role;

select * from finish();
rollback;
