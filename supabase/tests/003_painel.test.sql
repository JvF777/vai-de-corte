-- Testes do painel: agendamento manual e imagens no Storage (pgTAP).
-- Rodar com: supabase test db   (precisa do seed.sql carregado)
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(14);

-- dono_a -> dono da Navalha de Ouro | carlos -> barbeiro Carlos (Navalha) | dono_b -> dono da Corte Fino
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

-- Dia de teste: próxima quarta, quinta ou sexta a pelo menos 2 dias de hoje (Carlos e Rafael trabalham).
create temp table t as
select (select d::date from generate_series(current_date + 2, current_date + 9, interval '1 day') g(d)
         where extract(dow from d) in (3, 4, 5) order by d limit 1) as dia;
grant select on t to authenticated;

create function pg_temp.h(p_hora text) returns timestamptz language sql stable as $$
  select ((select dia from t) + p_hora::time) at time zone 'America/Sao_Paulo'
$$;

create function pg_temp.como(p_usuario uuid) returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', p_usuario, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;

-- Agendamento manual na Navalha (Corte, 30 min).
create function pg_temp.manual(p_barbeiro uuid, p_inicio timestamptz, p_whats text default '11 97777-0001',
                               p_barbearia uuid default 'a1111111-1111-4111-8111-111111111111')
returns uuid language sql as $$
  select public.criar_agendamento_manual(p_barbearia, p_barbeiro, 'e1111111-1111-4111-8111-111111111111',
                                         p_inicio, 'Cliente do Balcão', p_whats)
$$;

-- ---------------------------------------------------------------------------
-- Dono
-- ---------------------------------------------------------------------------
select pg_temp.como('aaaaaaaa-0000-4000-8000-00000000000a');

select lives_ok(
  $$ select pg_temp.manual('c2222222-2222-4222-8222-222222222222', pg_temp.h('10:00')) $$,
  'dono agenda manualmente para o Rafael');

select is(
  (select row(status, origem)::text from public.agendamentos
    where barbeiro_id = 'c2222222-2222-4222-8222-222222222222' and inicio = pg_temp.h('10:00')),
  '(confirmado,manual)', 'agendamento manual nasce confirmado e com origem manual');

select lives_ok(
  $$ select pg_temp.manual('c2222222-2222-4222-8222-222222222222', pg_temp.h('19:10'), '11 97777-0002') $$,
  'encaixe fora da grade e do expediente é aceito no manual');

select throws_ok(
  $$ select pg_temp.manual('c2222222-2222-4222-8222-222222222222', pg_temp.h('10:15'), '11 97777-0003') $$,
  'P0001', 'HORARIO_INDISPONIVEL', 'manual não sobrepõe outro agendamento');

insert into public.bloqueios_agenda (barbearia_id, barbeiro_id, inicio, fim, motivo)
values ('a1111111-1111-4111-8111-111111111111', 'c2222222-2222-4222-8222-222222222222',
        pg_temp.h('15:00'), pg_temp.h('16:00'), 'Teste');

select throws_ok(
  $$ select pg_temp.manual('c2222222-2222-4222-8222-222222222222', pg_temp.h('15:30'), '11 97777-0004') $$,
  'P0001', 'HORARIO_BLOQUEADO', 'manual respeita bloqueios');

select throws_ok(
  $$ select pg_temp.manual('c2222222-2222-4222-8222-222222222222', now() - interval '2 hours', '11 97777-0005') $$,
  'P0001', 'ANTECEDENCIA_MINIMA', 'manual não aceita horário que já passou');

select throws_ok(
  $$ select public.criar_agendamento_manual('a1111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111',
       'e1111111-2222-4111-8111-111111111111', pg_temp.h('16:00'), 'Cliente', '11 97777-0006') $$,
  'P0001', 'BARBEIRO_INVALIDO', 'manual recusa serviço que o barbeiro não faz');

select is(
  (select count(*)::int from public.clientes where whatsapp = '5511977770001'), 1,
  'cliente novo é cadastrado pelo WhatsApp normalizado');

-- ---------------------------------------------------------------------------
-- Barbeiro: só a própria agenda
-- ---------------------------------------------------------------------------
reset role;
select pg_temp.como('cccccccc-0000-4000-8000-00000000000c');

select lives_ok(
  $$ select pg_temp.manual('c1111111-1111-4111-8111-111111111111', pg_temp.h('11:00'), '11 97777-0007') $$,
  'barbeiro agenda para si mesmo');

select throws_ok(
  $$ select pg_temp.manual('c2222222-2222-4222-8222-222222222222', pg_temp.h('11:00'), '11 97777-0008') $$,
  'P0001', 'SEM_PERMISSAO', 'barbeiro não agenda para outro barbeiro');

-- ---------------------------------------------------------------------------
-- Outra barbearia
-- ---------------------------------------------------------------------------
reset role;
select pg_temp.como('bbbbbbbb-0000-4000-8000-00000000000b');

select throws_ok(
  $$ select pg_temp.manual('c2222222-2222-4222-8222-222222222222', pg_temp.h('12:00'), '11 97777-0009') $$,
  'P0001', 'SEM_PERMISSAO', 'dono B não agenda na barbearia A');

select throws_ok(
  $$ select public.criar_agendamento_manual('b2222222-2222-4222-8222-222222222222', 'c2222222-2222-4222-8222-222222222222',
       'f2222222-1111-4222-8222-222222222222', pg_temp.h('12:00'), 'Cliente', '11 97777-0009') $$,
  'P0001', 'BARBEIRO_INVALIDO', 'dono B não usa barbeiro da A dentro da própria barbearia');

-- ---------------------------------------------------------------------------
-- Storage: cada dono só grava na pasta da própria barbearia
-- ---------------------------------------------------------------------------
select is(privado.eh_dono_da_pasta('b2222222-2222-4222-8222-222222222222/logo.webp'), true,
  'dono B pode gravar na pasta da B');
select is(privado.eh_dono_da_pasta('a1111111-1111-4111-8111-111111111111/logo.webp'), false,
  'dono B não pode gravar na pasta da A');

select * from finish();
rollback;
