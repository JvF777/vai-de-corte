-- =============================================================================
-- SEED DE DESENVOLVIMENTO: DADOS FICTÍCIOS
-- Duas barbearias inventadas, para testar o sistema e o isolamento entre elas.
-- Nomes, telefones e clientes NÃO são reais. Não rode isto em produção.
--
-- Usuários do painel não são criados aqui (o Supabase Auth cuida disso).
-- Depois de criar um usuário, vincule com supabase/scripts/vincular_usuario.sql.
-- =============================================================================

-- IDs fixos para facilitar testes e scripts.
--   Barbearia 1: a1111111-...   Barbearia 2: b2222222-...

insert into public.barbearias
  (id, slug, nome, descricao, whatsapp, instagram, endereco, cidade, uf,
   intervalo_slot_minutos, antecedencia_minima_minutos, janela_agendamento_dias)
values
  ('a1111111-1111-4111-8111-111111111111', 'ficticia-navalha-de-ouro',
   '[FICTÍCIA] Barbearia Navalha de Ouro',
   'Barbearia fictícia para testes. Cortes clássicos e barba na toalha quente.',
   '5511900000000', 'ficticia.navalha', 'Rua Exemplo, 100 - Centro', 'Mogi das Cruzes', 'SP',
   30, 60, 30),
  ('b2222222-2222-4222-8222-222222222222', 'ficticia-corte-fino',
   '[FICTÍCIA] Corte Fino Barber',
   'Outra barbearia fictícia, usada para testar o isolamento entre barbearias.',
   '5511911111111', 'ficticia.cortefino', 'Avenida Teste, 2000 - Vila Exemplo', 'Mogi das Cruzes', 'SP',
   30, 120, 21);

-- Barbeiros
insert into public.barbeiros (id, barbearia_id, nome, bio, ordem) values
  ('c1111111-1111-4111-8111-111111111111', 'a1111111-1111-4111-8111-111111111111', 'Carlos (fictício)', 'Especialista em degradê.', 1),
  ('c2222222-2222-4222-8222-222222222222', 'a1111111-1111-4111-8111-111111111111', 'Rafael (fictício)', 'Barba e navalha.', 2),
  ('d1111111-1111-4111-8111-111111111111', 'b2222222-2222-4222-8222-222222222222', 'Diego (fictício)', 'Cortes infantis e social.', 1);

-- Serviços (preço em centavos)
insert into public.servicos (id, barbearia_id, nome, preco_centavos, duracao_minutos, ordem) values
  ('e1111111-1111-4111-8111-111111111111', 'a1111111-1111-4111-8111-111111111111', 'Corte',          4000, 30, 1),
  ('e1111111-2222-4111-8111-111111111111', 'a1111111-1111-4111-8111-111111111111', 'Barba',          3000, 30, 2),
  ('e1111111-3333-4111-8111-111111111111', 'a1111111-1111-4111-8111-111111111111', 'Corte + barba',  6500, 60, 3),
  ('f2222222-1111-4222-8222-222222222222', 'b2222222-2222-4222-8222-222222222222', 'Corte',          3500, 30, 1),
  ('f2222222-2222-4222-8222-222222222222', 'b2222222-2222-4222-8222-222222222222', 'Sobrancelha',    1500, 15, 2);

-- Quem faz o quê
insert into public.barbeiro_servicos (barbearia_id, barbeiro_id, servico_id) values
  ('a1111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111', 'e1111111-1111-4111-8111-111111111111'),
  ('a1111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111', 'e1111111-3333-4111-8111-111111111111'),
  ('a1111111-1111-4111-8111-111111111111', 'c2222222-2222-4222-8222-222222222222', 'e1111111-1111-4111-8111-111111111111'),
  ('a1111111-1111-4111-8111-111111111111', 'c2222222-2222-4222-8222-222222222222', 'e1111111-2222-4111-8111-111111111111'),
  ('a1111111-1111-4111-8111-111111111111', 'c2222222-2222-4222-8222-222222222222', 'e1111111-3333-4111-8111-111111111111'),
  ('b2222222-2222-4222-8222-222222222222', 'd1111111-1111-4111-8111-111111111111', 'f2222222-1111-4222-8222-222222222222'),
  ('b2222222-2222-4222-8222-222222222222', 'd1111111-1111-4111-8111-111111111111', 'f2222222-2222-4222-8222-222222222222');

-- Funcionamento (0 = domingo ... 6 = sábado)
-- Navalha de Ouro: terça a sábado, 09:00-19:00. Corte Fino: segunda a sábado, 08:30-18:00.
insert into public.horarios_funcionamento (barbearia_id, dia_semana, abre, fecha)
select 'a1111111-1111-4111-8111-111111111111'::uuid, d, '09:00'::time, '19:00'::time from generate_series(2, 6) d
union all
select 'b2222222-2222-4222-8222-222222222222', d, '08:30', '18:00' from generate_series(1, 6) d;

-- Jornada dos barbeiros
-- Carlos: terça a sábado 09-18, almoço 12-13. Rafael: quarta a sábado 10-19, almoço 13-14.
-- Diego: segunda a sábado 08:30-18, almoço 12-13.
insert into public.horarios_barbeiros (barbearia_id, barbeiro_id, dia_semana, inicio, fim, almoco_inicio, almoco_fim)
select 'a1111111-1111-4111-8111-111111111111'::uuid, 'c1111111-1111-4111-8111-111111111111'::uuid, d, '09:00'::time, '18:00'::time, '12:00'::time, '13:00'::time
  from generate_series(2, 6) d
union all
select 'a1111111-1111-4111-8111-111111111111', 'c2222222-2222-4222-8222-222222222222', d, '10:00', '19:00', '13:00', '14:00'
  from generate_series(3, 6) d
union all
select 'b2222222-2222-4222-8222-222222222222', 'd1111111-1111-4111-8111-111111111111', d, '08:30', '18:00', '12:00', '13:00'
  from generate_series(1, 6) d;

-- Clientes fictícios (números claramente falsos)
insert into public.clientes (id, barbearia_id, nome, whatsapp, consentimento_lgpd_em) values
  ('0a000000-0000-4000-8000-000000000001', 'a1111111-1111-4111-8111-111111111111', 'Cliente Fictício Um',   '5511900000001', now()),
  ('0a000000-0000-4000-8000-000000000002', 'a1111111-1111-4111-8111-111111111111', 'Cliente Fictício Dois', '5511900000002', now()),
  ('0b000000-0000-4000-8000-000000000001', 'b2222222-2222-4222-8222-222222222222', 'Cliente Fictício Três', '5511900000003', now());

-- Agendamentos de exemplo: no último sábado (passado) e no próximo sábado (futuro),
-- dia em que todos os barbeiros trabalham. Preço e fim vêm do serviço via trigger.
do $$
declare
  v_tz      text := 'America/Sao_Paulo';
  v_hoje    date := (now() at time zone v_tz)::date;
  v_passado date := v_hoje - case when extract(dow from v_hoje) = 6 then 7 else (extract(dow from v_hoje)::int + 1) % 7 end;  -- sábado anterior
  v_futuro  date := v_hoje + (6 - extract(dow from v_hoje)::int) + case when extract(dow from v_hoje) = 6 then 7 else 0 end;
begin
  insert into public.agendamentos (barbearia_id, barbeiro_id, servico_id, cliente_id, inicio, status, origem)
  values
    -- Navalha de Ouro, passado
    ('a1111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111', 'e1111111-1111-4111-8111-111111111111',
     '0a000000-0000-4000-8000-000000000001', (v_passado + time '10:00') at time zone v_tz, 'concluido', 'link_publico'),
    ('a1111111-1111-4111-8111-111111111111', 'c2222222-2222-4222-8222-222222222222', 'e1111111-3333-4111-8111-111111111111',
     '0a000000-0000-4000-8000-000000000002', (v_passado + time '15:00') at time zone v_tz, 'falta', 'link_publico'),
    ('a1111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111', 'e1111111-1111-4111-8111-111111111111',
     '0a000000-0000-4000-8000-000000000002', (v_passado + time '16:00') at time zone v_tz, 'cancelado', 'manual'),
    -- Navalha de Ouro, futuro
    ('a1111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111', 'e1111111-3333-4111-8111-111111111111',
     '0a000000-0000-4000-8000-000000000001', (v_futuro + time '10:00') at time zone v_tz, 'confirmado', 'link_publico'),
    ('a1111111-1111-4111-8111-111111111111', 'c2222222-2222-4222-8222-222222222222', 'e1111111-2222-4111-8111-111111111111',
     '0a000000-0000-4000-8000-000000000002', (v_futuro + time '11:00') at time zone v_tz, 'agendado', 'link_publico'),
    -- Corte Fino
    ('b2222222-2222-4222-8222-222222222222', 'd1111111-1111-4111-8111-111111111111', 'f2222222-1111-4222-8222-222222222222',
     '0b000000-0000-4000-8000-000000000001', (v_passado + time '09:00') at time zone v_tz, 'concluido', 'manual'),
    ('b2222222-2222-4222-8222-222222222222', 'd1111111-1111-4111-8111-111111111111', 'f2222222-1111-4222-8222-222222222222',
     '0b000000-0000-4000-8000-000000000001', (v_futuro + time '09:00') at time zone v_tz, 'agendado', 'link_publico');

  -- Almoço estendido do Carlos no próximo sábado (exemplo de bloqueio).
  insert into public.bloqueios_agenda (barbearia_id, barbeiro_id, tipo, inicio, fim, motivo)
  values ('a1111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111', 'bloqueio',
          (v_futuro + time '13:00') at time zone v_tz, (v_futuro + time '14:00') at time zone v_tz,
          'Compromisso pessoal (fictício)');
end;
$$;
