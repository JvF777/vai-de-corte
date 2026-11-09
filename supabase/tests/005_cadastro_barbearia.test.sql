-- Testes do cadastro de barbearia pelo próprio dono (pgTAP).
-- Rodar com: supabase test db   (precisa do seed.sql carregado)
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(18);

insert into auth.users (id, email) values
  ('dddddddd-0000-4000-8000-00000000000d', 'novo_dono@teste.local'),
  ('eeeeeeee-0000-4000-8000-00000000000e', 'outro@teste.local');

create function pg_temp.como(p_usuario uuid) returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', p_usuario, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;

create function pg_temp.criar(p_slug text, p_barbeiros jsonb default '[{"nome": "Dono Teste", "sou_eu": true}, {"nome": "Ajudante"}]')
returns jsonb language sql as $$
  select public.criar_barbearia(
    'Barbearia Nova', p_slug, '(11) 98888-7777', 'Mogi das Cruzes', 'sp', 'Rua A, 10',
    '[{"dia": 2, "abre": "09:00", "fecha": "19:00"}, {"dia": 6, "abre": "08:00", "fecha": "14:00"}]',
    '[{"nome": "Corte", "preco_centavos": 4000, "duracao_minutos": 30},
      {"nome": "Barba", "preco_centavos": 3000, "duracao_minutos": 20}]',
    p_barbeiros)
$$;

-- ---------------------------------------------------------------------------
-- Visitante sem login não cria nada.
-- ---------------------------------------------------------------------------
set local role anon;
select throws_ok($$ select pg_temp.criar('anonima') $$, '42501', null, 'anon não pode chamar criar_barbearia');
reset role;

-- ---------------------------------------------------------------------------
-- Usuário logado cria a barbearia completa.
-- ---------------------------------------------------------------------------
select pg_temp.como('dddddddd-0000-4000-8000-00000000000d');

select ok(public.slug_disponivel('barbearia-nova'), 'link livre aparece como disponível');
select ok(not public.slug_disponivel('ficticia-navalha-de-ouro'), 'link do seed aparece como ocupado/reservado');
select ok(not public.slug_disponivel('Com Espaço'), 'link fora do formato não é aceito');

select lives_ok($$ select pg_temp.criar('barbearia-nova') $$, 'cria barbearia com horários, serviços e barbeiros');

select is((select papel::text from public.barbearia_usuarios bu join public.barbearias b on b.id = bu.barbearia_id
            where b.slug = 'barbearia-nova'), 'dono', 'quem cadastrou vira dono');
select is((select whatsapp || '|' || uf from public.barbearias where slug = 'barbearia-nova'),
          '5511988887777|SP', 'WhatsApp e UF normalizados');
select is((select count(*)::int from public.horarios_funcionamento hf join public.barbearias b on b.id = hf.barbearia_id
            where b.slug = 'barbearia-nova'), 2, 'dois dias de funcionamento');
select is((select count(*)::int from public.barbeiro_servicos bs join public.barbearias b on b.id = bs.barbearia_id
            where b.slug = 'barbearia-nova'), 4, 'cada barbeiro faz os dois serviços');
select is((select count(*)::int from public.horarios_barbeiros hb join public.barbearias b on b.id = hb.barbearia_id
            where b.slug = 'barbearia-nova'), 4, 'barbeiros seguem o horário da barbearia');
select is((select nome from public.barbeiros where usuario_id = 'dddddddd-0000-4000-8000-00000000000d'),
          'Dono Teste', 'barbeiro "sou eu" fica ligado ao login do dono');

-- ---------------------------------------------------------------------------
-- Recusas
-- ---------------------------------------------------------------------------
select throws_ok($$ select pg_temp.criar('barbearia-nova') $$, 'P0001', 'SLUG_EM_USO', 'link repetido é recusado');
select throws_ok($$ select pg_temp.criar('admin') $$, 'P0001', 'SLUG_INVALIDO', 'link reservado é recusado');
select throws_ok($$ select pg_temp.criar('dois-eus', '[{"nome": "A", "sou_eu": true}, {"nome": "Bb", "sou_eu": true}]') $$,
                 'P0001', 'DADOS_INVALIDOS', 'só um barbeiro pode ser o dono');

select lives_ok($$ select pg_temp.criar('segunda-loja') $$, 'segunda barbearia do mesmo dono');
select lives_ok($$ select pg_temp.criar('terceira-loja') $$, 'terceira barbearia do mesmo dono');
select throws_ok($$ select pg_temp.criar('quarta-loja') $$, 'P0001', 'LIMITE_BARBEARIAS', 'no máximo 3 barbearias por dono');

-- ---------------------------------------------------------------------------
-- Isolamento: outro usuário não vê os clientes nem vira membro da barbearia nova.
-- ---------------------------------------------------------------------------
select pg_temp.como('eeeeeeee-0000-4000-8000-00000000000e');
select is((select count(*)::int from public.barbearia_usuarios), 0, 'outro usuário não enxerga vínculos alheios');

select * from finish();
rollback;
