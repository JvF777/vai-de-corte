-- Testes do agendamento pelo link público (pgTAP).
-- Rodar com: supabase test db   (precisa do seed.sql carregado)
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(27);

-- IDs do seed
--   Carlos c1111111-...  (ter-sáb 09-18, almoço 12-13)
--   Rafael c2222222-...  (qua-sáb 10-19, almoço 13-14)
--   Corte e1111111-1111 (30 min)  Barba e1111111-2222 (só Rafael)  Corte+barba e1111111-3333 (60 min)

-- Dia de teste: próxima quarta, quinta ou sexta a pelo menos 2 dias de hoje.
create temp table t as
select
  (select d::date from generate_series(current_date + 2, current_date + 9, interval '1 day') g(d)
    where extract(dow from d) in (3, 4, 5) order by d limit 1) as dia,
  (select d::date from generate_series(current_date + 2, current_date + 9, interval '1 day') g(d)
    where extract(dow from d) = 1 limit 1) as segunda;
grant select on t to anon;

-- Horário local -> timestamptz no fuso da barbearia.
create function pg_temp.h(p_hora text, p_dia date default null) returns timestamptz language sql stable as $$
  select (coalesce(p_dia, (select dia from t)) + p_hora::time) at time zone 'America/Sao_Paulo'
$$;

-- Atalho: reservar na Navalha de Ouro como visitante.
create function pg_temp.reservar(p_servico uuid, p_barbeiro uuid, p_inicio timestamptz, p_whats text default '11 98888-0001')
returns jsonb language sql as $$
  select public.criar_agendamento_publico('ficticia-navalha-de-ouro', p_servico, p_barbeiro, p_inicio,
                                          'Visitante de Teste', p_whats, true)
$$;

create function pg_temp.como_anon() returns void language sql as $$
  select set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
$$;

select pg_temp.como_anon();

-- ---------------------------------------------------------------------------
-- Reserva e conflitos
-- ---------------------------------------------------------------------------
create temp table r1 as
select pg_temp.reservar('e1111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111', pg_temp.h('10:00')) as j;

select is((select j -> 'barbeiro' ->> 'nome' from r1), 'Carlos (fictício)',
  'visitante reserva corte com o Carlos às 10:00');

select throws_ok(
  $$ select pg_temp.reservar('e1111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111',
                             pg_temp.h('10:00'), '11 98888-0002') $$,
  'P0001', 'HORARIO_INDISPONIVEL', 'mesmo horário do mesmo barbeiro é recusado');

select throws_ok(
  $$ select pg_temp.reservar('e1111111-3333-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111',
                             pg_temp.h('09:30'), '11 98888-0002') $$,
  'P0001', 'HORARIO_INDISPONIVEL', 'serviço de 60 min que invade um horário ocupado é recusado');

select is(
  pg_temp.reservar('e1111111-1111-4111-8111-111111111111', null, pg_temp.h('10:00'), '11 98888-0003')
    -> 'barbeiro' ->> 'nome',
  'Rafael (fictício)', '"qualquer disponível" escolhe o Rafael quando o Carlos está ocupado');

select throws_ok(
  $$ select pg_temp.reservar('e1111111-1111-4111-8111-111111111111', null, pg_temp.h('10:00'), '11 98888-0004') $$,
  'P0001', 'HORARIO_INDISPONIVEL', '"qualquer disponível" recusa quando todos estão ocupados');

select lives_ok(
  $$ select pg_temp.reservar('e1111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111',
                             pg_temp.h('10:30'), '11 98888-0005') $$,
  'horário encostado no anterior é aceito');

-- ---------------------------------------------------------------------------
-- Expediente, almoço, grade, antecedência e janela
-- ---------------------------------------------------------------------------
select lives_ok(
  $$ select pg_temp.reservar('e1111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111',
                             pg_temp.h('11:30'), '11 98888-0006') $$,
  'corte que termina exatamente no início do almoço é aceito');

select throws_ok(
  $$ select pg_temp.reservar('e1111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111',
                             pg_temp.h('12:00'), '11 98888-0007') $$,
  'P0001', 'FORA_DO_EXPEDIENTE', 'horário de almoço é recusado');

select throws_ok(
  $$ select pg_temp.reservar('e1111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111',
                             pg_temp.h('18:00'), '11 98888-0007') $$,
  'P0001', 'FORA_DO_EXPEDIENTE', 'serviço que passa do fim da jornada é recusado');

select throws_ok(
  $$ select pg_temp.reservar('e1111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111',
                             pg_temp.h('10:00', (select segunda from t)), '11 98888-0007') $$,
  'P0001', 'FORA_DO_EXPEDIENTE', 'segunda-feira (barbearia fechada) é recusada');

select throws_ok(
  $$ select pg_temp.reservar('e1111111-2222-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111',
                             pg_temp.h('15:00'), '11 98888-0007') $$,
  'P0001', 'BARBEIRO_INVALIDO', 'barbeiro que não faz o serviço é recusado');

select throws_ok(
  $$ select pg_temp.reservar('e1111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111',
                             pg_temp.h('15:15'), '11 98888-0007') $$,
  'P0001', 'FORA_DA_GRADE', 'horário fora da grade de 30 min é recusado');

select throws_ok(
  $$ select pg_temp.reservar('e1111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111',
                             pg_temp.h('10:00', current_date - 1), '11 98888-0007') $$,
  'P0001', 'ANTECEDENCIA_MINIMA', 'horário no passado é recusado');

select throws_ok(
  $$ select pg_temp.reservar('e1111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111',
                             pg_temp.h('10:00', current_date + 45), '11 98888-0007') $$,
  'P0001', 'FORA_DA_JANELA', 'horário além da janela de agendamento é recusado');

-- ---------------------------------------------------------------------------
-- Bloqueios (criados pelo painel/admin)
-- ---------------------------------------------------------------------------
reset role;
insert into public.bloqueios_agenda (barbearia_id, barbeiro_id, tipo, inicio, fim) values
  ('a1111111-1111-4111-8111-111111111111', 'c2222222-2222-4222-8222-222222222222', 'bloqueio', pg_temp.h('15:00'), pg_temp.h('16:00')),
  ('a1111111-1111-4111-8111-111111111111', null, 'feriado', pg_temp.h('17:00'), pg_temp.h('19:00'));
select pg_temp.como_anon();

select throws_ok(
  $$ select pg_temp.reservar('e1111111-2222-4111-8111-111111111111', 'c2222222-2222-4222-8222-222222222222',
                             pg_temp.h('15:30'), '11 98888-0007') $$,
  'P0001', 'HORARIO_BLOQUEADO', 'bloqueio do barbeiro é respeitado');

select throws_ok(
  $$ select pg_temp.reservar('e1111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111',
                             pg_temp.h('17:00'), '11 98888-0007') $$,
  'P0001', 'HORARIO_BLOQUEADO', 'bloqueio da barbearia inteira vale para todos os barbeiros');

-- ---------------------------------------------------------------------------
-- Dados do formulário e isolamento
-- ---------------------------------------------------------------------------
select throws_ok(
  $$ select public.criar_agendamento_publico('ficticia-navalha-de-ouro', 'e1111111-1111-4111-8111-111111111111',
       null, pg_temp.h('16:00'), 'Fulano', '11 98888-0008', false) $$,
  'P0001', 'LGPD_OBRIGATORIO', 'sem aceite da LGPD não agenda');

select throws_ok(
  $$ select public.criar_agendamento_publico('ficticia-navalha-de-ouro', 'e1111111-1111-4111-8111-111111111111',
       null, pg_temp.h('16:00'), 'Fulano', '123', true) $$,
  'P0001', 'DADOS_INVALIDOS', 'WhatsApp inválido é recusado');

select throws_ok(
  $$ select public.criar_agendamento_publico('ficticia-corte-fino', 'e1111111-1111-4111-8111-111111111111',
       null, pg_temp.h('10:00'), 'Fulano', '11 98888-0008', true) $$,
  'P0001', 'SERVICO_INVALIDO', 'serviço de outra barbearia é recusado');

select lives_ok(
  $$ select pg_temp.reservar('e1111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111', pg_temp.h('14:00')),
            pg_temp.reservar('e1111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111', pg_temp.h('14:30')) $$,
  'mesmo WhatsApp pode ter até 3 agendamentos futuros');

select throws_ok(
  $$ select pg_temp.reservar('e1111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111', pg_temp.h('15:00')) $$,
  'P0001', 'LIMITE_AGENDAMENTOS', 'o 4º agendamento futuro do mesmo WhatsApp é recusado');

-- ---------------------------------------------------------------------------
-- Funções de leitura pública
-- ---------------------------------------------------------------------------
select is(
  (select count(*)::int from public.horarios_ocupados('ficticia-navalha-de-ouro', (select dia from t), (select dia from t))
    where barbeiro_id = 'c1111111-1111-4111-8111-111111111111' and inicio = pg_temp.h('10:00')),
  1, 'horarios_ocupados mostra o horário reservado');

select is(
  public.consultar_agendamento_publico((select (j ->> 'id')::uuid from r1)) ->> 'cliente_nome',
  'Visitante', 'confirmação mostra só o primeiro nome do cliente');

select throws_ok(
  $$ select privado.motivo_horario_indisponivel(null, null, null, now()) $$,
  '42501', null, 'anon não chama funções internas');

-- ---------------------------------------------------------------------------
-- Verificações no banco
-- ---------------------------------------------------------------------------
reset role;

select ok(
  (select origem = 'link_publico' and preco_centavos = 4000 and criado_por is null
          and fim = inicio + interval '30 minutes'
     from public.agendamentos where id = (select (j ->> 'id')::uuid from r1)),
  'agendamento público grava origem, preço e fim a partir do serviço');

select throws_ok(
  $$ insert into public.agendamentos (barbearia_id, barbeiro_id, servico_id, cliente_id, inicio)
     values ('a1111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111',
             'e1111111-1111-4111-8111-111111111111', '0a000000-0000-4000-8000-000000000001', pg_temp.h('10:15')) $$,
  '23P01', null, 'constraint de exclusão barra sobreposição mesmo em insert direto');

update public.agendamentos set status = 'cancelado' where id = (select (j ->> 'id')::uuid from r1);
select pg_temp.como_anon();

select lives_ok(
  $$ select pg_temp.reservar('e1111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111',
                             pg_temp.h('10:00'), '11 98888-0009') $$,
  'horário cancelado volta a ficar disponível');

reset role;
select * from finish();
rollback;
