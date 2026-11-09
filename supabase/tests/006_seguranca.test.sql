-- Testes da auditoria de segurança (pgTAP).
-- Rodar com: supabase test db   (precisa do seed.sql carregado)
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(12);

-- dono_a -> dono da Navalha de Ouro (a1111111-...)
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-4000-8000-00000000000a', 'dono_a@teste.local');
insert into public.barbearia_usuarios (barbearia_id, usuario_id, papel) values
  ('a1111111-1111-4111-8111-111111111111', 'aaaaaaaa-0000-4000-8000-00000000000a', 'dono');

create function pg_temp.como(p_usuario uuid) returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', p_usuario, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;

create function pg_temp.como_anon() returns void language sql as $$
  select set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
$$;

-- ---------------------------------------------------------------------------
-- Funções dos avisos: só o servidor
-- ---------------------------------------------------------------------------
select ok(not has_function_privilege('anon', 'public.destinatarios_aviso_agendamento(uuid)', 'execute'),
  'anon não chama destinatarios_aviso_agendamento');
select ok(not has_function_privilege('authenticated', 'public.destinatarios_aviso_agendamento(uuid)', 'execute'),
  'usuário logado não chama destinatarios_aviso_agendamento');
select ok(not has_function_privilege('anon', 'public.descartar_inscricoes_push(text[])', 'execute'),
  'anon não apaga aparelhos');
select ok(not has_function_privilege('anon', 'public.salvar_inscricao_push(text, text, text, text)', 'execute'),
  'anon não liga avisos');
select ok(not has_table_privilege('authenticated', 'public.agendamentos', 'truncate'),
  'ninguém do app pode dar TRUNCATE (ignora o RLS)');

-- ---------------------------------------------------------------------------
-- Links só https://
-- ---------------------------------------------------------------------------
select pg_temp.como('aaaaaaaa-0000-4000-8000-00000000000a');

select throws_ok(
  $$ update public.barbearias set maps_url = 'javascript:alert(1)' where id = 'a1111111-1111-4111-8111-111111111111' $$,
  '23514', null, 'mapa com javascript: é recusado');
select throws_ok(
  $$ update public.barbearias set fotos = array['https://ok.teste/a.jpg', 'data:text/html,oi'] where id = 'a1111111-1111-4111-8111-111111111111' $$,
  '23514', null, 'foto que não é https é recusada');
select throws_ok(
  $$ update public.barbeiros set foto_url = 'http://inseguro.teste/x.jpg' where barbearia_id = 'a1111111-1111-4111-8111-111111111111' $$,
  '23514', null, 'foto de barbeiro em http é recusada');
select lives_ok(
  $$ update public.barbearias set maps_url = 'https://maps.app.goo.gl/abc123', logo_url = null where id = 'a1111111-1111-4111-8111-111111111111' $$,
  'link https normal continua valendo');

-- ---------------------------------------------------------------------------
-- Freio do link público: 15 agendamentos novos em 10 minutos por barbearia
-- ---------------------------------------------------------------------------
reset role;
-- Simula 15 agendamentos recentes pelo link (direto na tabela, como o seed faz).
create temp table futuro as
select g as n, ((current_date + 3 + (g / 8)) + make_time(9 + (g % 8), 0, 0)) at time zone 'America/Sao_Paulo' as inicio
  from generate_series(0, 15) g;

select lives_ok($$
  insert into public.clientes (barbearia_id, nome, whatsapp)
  values ('a1111111-1111-4111-8111-111111111111', 'Robô de Teste', '5511900000001')
  on conflict (barbearia_id, whatsapp) do nothing;
$$, 'cliente de teste');

-- Apaga os recentes do seed para a conta ficar exata.
update public.agendamentos set created_at = now() - interval '1 hour'
 where barbearia_id = 'a1111111-1111-4111-8111-111111111111';

select lives_ok($$
  insert into public.agendamentos (barbearia_id, barbeiro_id, servico_id, cliente_id, inicio, status, origem)
  select 'a1111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111',
         'e1111111-1111-4111-8111-111111111111',
         (select id from public.clientes where whatsapp = '5511900000001' and barbearia_id = 'a1111111-1111-4111-8111-111111111111'),
         f.inicio, 'cancelado', 'link_publico'
    from futuro f where f.n < 15;
$$, 'até 15 agendamentos pelo link em 10 minutos passam');

select throws_ok($$
  insert into public.agendamentos (barbearia_id, barbeiro_id, servico_id, cliente_id, inicio, status, origem)
  select 'a1111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111',
         'e1111111-1111-4111-8111-111111111111',
         (select id from public.clientes where whatsapp = '5511900000001' and barbearia_id = 'a1111111-1111-4111-8111-111111111111'),
         f.inicio, 'cancelado', 'link_publico'
    from futuro f where f.n = 15;
$$, 'MUITOS_AGENDAMENTOS', 'o 16º em 10 minutos é recusado');

select * from finish();
rollback;
