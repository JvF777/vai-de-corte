-- Auditoria de segurança (2026-11-09).
--
-- 1. Avisos no celular: destinatarios_aviso_agendamento e descartar_inscricoes_push
--    deixam de ser públicas. Antes, qualquer visitante que fizesse um agendamento
--    podia pedir os aparelhos (endpoint + chaves) do dono, "gastar" o aviso antes do
--    servidor e apagar os aparelhos dele. Agora só o servidor chama, com a chave
--    secreta do Supabase (SUPABASE_SECRET_KEY, nunca no navegador).
-- 2. Privilégios que sobravam: salvar_inscricao_push para anon; INSERT/UPDATE em
--    inscricoes_push e TRUNCATE/REFERENCES/TRIGGER nas tabelas (o RLS já barrava,
--    isto é defesa em profundidade).
-- 3. Links de imagens e do mapa só com https:// (impede "javascript:" gravado direto
--    pela API, sem passar pelo painel).
-- 4. Freio no link público: no máximo 15 agendamentos novos pelo link em 10 minutos
--    por barbearia, para um robô não lotar a agenda de uma vez.

-- ---------------------------------------------------------------------------
-- 1. RPCs dos avisos só para o servidor
-- ---------------------------------------------------------------------------
revoke all on function public.destinatarios_aviso_agendamento(uuid) from public, anon, authenticated;
grant execute on function public.destinatarios_aviso_agendamento(uuid) to service_role;

revoke all on function public.descartar_inscricoes_push(text[]) from public, anon, authenticated;
grant execute on function public.descartar_inscricoes_push(text[]) to service_role;

-- ---------------------------------------------------------------------------
-- 2. Privilégios que sobravam
-- ---------------------------------------------------------------------------
revoke all on function public.salvar_inscricao_push(text, text, text, text) from anon;

revoke insert, update on public.inscricoes_push from authenticated;

-- TRUNCATE ignora o RLS; ninguém do app precisa dele.
revoke truncate, references, trigger on all tables in schema public from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Só links https:// em imagens e mapa
-- ---------------------------------------------------------------------------
create or replace function privado.url_segura(p_url text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_url is null or (p_url ~ '^https://[^\s<>"''`\\]+$' and length(p_url) <= 1000);
$$;

create or replace function privado.urls_seguras(p_urls text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_urls is null or coalesce((select bool_and(privado.url_segura(u)) from unnest(p_urls) u), true);
$$;

revoke all on function privado.url_segura(text), privado.urls_seguras(text[]) from public;
grant execute on function privado.url_segura(text), privado.urls_seguras(text[])
  to anon, authenticated, service_role;

-- NOT VALID: vale para tudo que for gravado daqui em diante, sem travar a
-- migration se já existir algum dado antigo fora do padrão.
alter table public.barbearias
  add constraint barbearias_logo_url_https check (privado.url_segura(logo_url)) not valid,
  add constraint barbearias_maps_url_https check (privado.url_segura(maps_url)) not valid,
  add constraint barbearias_fotos_https check (privado.urls_seguras(fotos)) not valid;

alter table public.barbeiros
  add constraint barbeiros_foto_url_https check (privado.url_segura(foto_url)) not valid;

-- ---------------------------------------------------------------------------
-- 4. Freio de agendamentos pelo link público
-- ---------------------------------------------------------------------------
create index if not exists agendamentos_link_recentes_idx
  on public.agendamentos (barbearia_id, created_at)
  where origem = 'link_publico';

create or replace function privado.limitar_agendamentos_publicos()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.origem = 'link_publico' and (
    select count(*)
      from public.agendamentos
     where barbearia_id = new.barbearia_id
       and origem = 'link_publico'
       and created_at > now() - interval '10 minutes'
  ) >= 15 then
    raise exception 'MUITOS_AGENDAMENTOS'
      using detail = 'Muitos agendamentos ao mesmo tempo. Tente de novo em alguns minutos ou chame a barbearia no WhatsApp.';
  end if;
  return new;
end;
$$;

revoke all on function privado.limitar_agendamentos_publicos() from public;

create trigger agendamentos_limitar_link before insert on public.agendamentos
  for each row execute function privado.limitar_agendamentos_publicos();
