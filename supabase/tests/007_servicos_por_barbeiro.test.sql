-- Cadastro de barbearia com serviços diferentes por barbeiro (pgTAP).
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(5);

insert into auth.users (id, email) values ('f0f0f0f0-0000-4000-8000-00000000000f', 'servicos@teste.local');

select set_config('request.jwt.claims',
  json_build_object('sub', 'f0f0f0f0-0000-4000-8000-00000000000f', 'role', 'authenticated')::text, true);
set local role authenticated;

create function pg_temp.criar(p_slug text, p_barbeiros jsonb) returns jsonb language sql as $$
  select public.criar_barbearia('Loja Servicos', p_slug, '11988887777', null, null, null,
    '[{"dia": 2, "abre": "09:00", "fecha": "19:00"}]',
    '[{"nome": "Corte", "preco_centavos": 4000, "duracao_minutos": 30},
      {"nome": "Barba", "preco_centavos": 3000, "duracao_minutos": 30},
      {"nome": "Luzes", "preco_centavos": 18000, "duracao_minutos": 180}]',
    p_barbeiros)
$$;

select lives_ok(
  $$ select pg_temp.criar('loja-servicos', '[{"nome": "Ana", "servicos": [0, 2]}, {"nome": "Beto", "servicos": [1]}, {"nome": "Caio"}]') $$,
  'cria com serviços escolhidos por barbeiro');

select is(
  (select string_agg(s.nome, ',' order by s.ordem) from public.barbeiro_servicos bs
     join public.barbeiros b on b.id = bs.barbeiro_id join public.servicos s on s.id = bs.servico_id
    where b.nome = 'Ana'),
  'Corte,Luzes', 'Ana faz só Corte e Luzes');
select is(
  (select count(*)::int from public.barbeiro_servicos bs join public.barbeiros b on b.id = bs.barbeiro_id where b.nome = 'Caio'),
  3, 'sem a lista, o barbeiro faz todos');

select throws_ok(
  $$ select pg_temp.criar('loja-sem-luzes', '[{"nome": "Ana", "servicos": [0]}, {"nome": "Beto", "servicos": [1]}]') $$,
  'P0001', 'DADOS_INVALIDOS', 'serviço que ninguém faz é recusado');
select throws_ok(
  $$ select pg_temp.criar('loja-indice-ruim', '[{"nome": "Ana", "servicos": [0, 1, 2, 9]}]') $$,
  'P0001', 'DADOS_INVALIDOS', 'posição de serviço inexistente é recusada');

select * from finish();
rollback;
