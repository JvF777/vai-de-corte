-- Vincula um usuário do Supabase Auth a uma barbearia (enquanto não existe admin da plataforma).
-- Rode no SQL Editor do Supabase (ou psql) depois de o usuário se cadastrar.
-- Troque os valores marcados com <...>.

-- 1) Dono/admin da barbearia
insert into public.barbearia_usuarios (barbearia_id, usuario_id, papel)
select b.id, u.id, 'dono'
  from public.barbearias b, auth.users u
 where b.slug = '<slug-da-barbearia>'
   and u.email = '<email-do-dono>'
on conflict (barbearia_id, usuario_id) do update set papel = excluded.papel;

-- 2) Barbeiro com login (opcional): dá acesso ao painel e liga ao cadastro do barbeiro
-- insert into public.barbearia_usuarios (barbearia_id, usuario_id, papel)
-- select b.id, u.id, 'barbeiro'
--   from public.barbearias b, auth.users u
--  where b.slug = '<slug-da-barbearia>' and u.email = '<email-do-barbeiro>'
-- on conflict (barbearia_id, usuario_id) do update set papel = excluded.papel;
--
-- update public.barbeiros
--    set usuario_id = (select id from auth.users where email = '<email-do-barbeiro>')
--  where id = '<id-do-barbeiro>';
