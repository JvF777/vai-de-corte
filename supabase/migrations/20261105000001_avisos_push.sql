-- Avisos no celular (Web Push).
--
-- Cada aparelho que liga os avisos no painel vira uma linha em inscricoes_push,
-- ligada ao usuário logado. Quando um cliente agenda pelo link público, o
-- servidor pede os destinatários com destinatarios_aviso_agendamento(...) e
-- manda a notificação para o dono da barbearia e para o barbeiro do horário.
--
-- O endereço de uma inscrição sozinho não deixa ninguém mandar notificação:
-- o envio é assinado com a chave VAPID privada, que só existe no servidor.

create table public.inscricoes_push (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint    text not null unique check (endpoint ~ '^https://' and length(endpoint) <= 1000),
  p256dh      text not null check (length(p256dh) between 20 and 200),
  auth        text not null check (length(auth) between 8 and 100),
  aparelho    text check (length(aparelho) <= 200),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.inscricoes_push is 'Aparelhos que recebem aviso de agendamento novo (Web Push).';

create index inscricoes_push_usuario_idx on public.inscricoes_push (usuario_id);

create trigger inscricoes_push_updated_at before update on public.inscricoes_push
  for each row execute function privado.tocar_updated_at();

alter table public.inscricoes_push enable row level security;

revoke all on public.inscricoes_push from anon;
grant select, delete on public.inscricoes_push to authenticated;
grant all on public.inscricoes_push to service_role;

-- Cada um só vê e apaga os próprios aparelhos. Gravar é pela RPC abaixo.
create policy "inscricoes_push: ver as próprias"
  on public.inscricoes_push for select to authenticated
  using (usuario_id = (select auth.uid()));

create policy "inscricoes_push: apagar as próprias"
  on public.inscricoes_push for delete to authenticated
  using (usuario_id = (select auth.uid()));

-- Marca de quando o aviso do agendamento já foi pedido (evita aviso repetido).
alter table public.agendamentos add column aviso_push_em timestamptz;

-- ---------------------------------------------------------------------------
-- Liga o aparelho ao usuário logado. Se o mesmo navegador já estava com outra
-- pessoa (trocou de login no celular), passa a ser de quem está logado agora.
-- ---------------------------------------------------------------------------
create or replace function public.salvar_inscricao_push(
  p_endpoint text,
  p_p256dh   text,
  p_auth     text,
  p_aparelho text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := (select auth.uid());
begin
  if v_usuario is null then
    raise exception 'SEM_PERMISSAO' using detail = 'Entre no painel para ligar os avisos.';
  end if;
  if not exists (select 1 from public.barbearia_usuarios where usuario_id = v_usuario) then
    raise exception 'SEM_PERMISSAO' using detail = 'Seu usuário não está ligado a nenhuma barbearia.';
  end if;

  insert into public.inscricoes_push (usuario_id, endpoint, p256dh, auth, aparelho)
  values (v_usuario, p_endpoint, p_p256dh, p_auth, left(p_aparelho, 200))
  on conflict (endpoint) do update
    set usuario_id = excluded.usuario_id,
        p256dh     = excluded.p256dh,
        auth       = excluded.auth,
        aparelho   = excluded.aparelho;
end;
$$;

revoke all on function public.salvar_inscricao_push(text, text, text, text) from public;
grant execute on function public.salvar_inscricao_push(text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Dados do aviso de um agendamento recém criado pelo link público e os
-- aparelhos que devem receber: donos da barbearia e o barbeiro do horário.
-- Só responde uma vez por agendamento e só nos primeiros 10 minutos.
-- ---------------------------------------------------------------------------
create or replace function public.destinatarios_aviso_agendamento(p_agendamento_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ag public.agendamentos;
  v_resultado jsonb;
begin
  update public.agendamentos
     set aviso_push_em = now()
   where id = p_agendamento_id
     and origem = 'link_publico'
     and aviso_push_em is null
     and created_at > now() - interval '10 minutes'
  returning * into v_ag;

  if not found then
    return null;
  end if;

  select jsonb_build_object(
           'barbearia', b.nome,
           'barbeiro_id', v_ag.barbeiro_id,
           'barbeiro', br.nome,
           'servico', s.nome,
           'cliente', c.nome,
           'inicio', v_ag.inicio,
           'inscricoes', coalesce((
             select jsonb_agg(jsonb_build_object('endpoint', i.endpoint, 'p256dh', i.p256dh, 'auth', i.auth))
               from public.inscricoes_push i
              where i.usuario_id in (
                      select bu.usuario_id
                        from public.barbearia_usuarios bu
                       where bu.barbearia_id = v_ag.barbearia_id
                         and (bu.papel = 'dono' or bu.usuario_id = br.usuario_id)
                    )
           ), '[]'::jsonb)
         )
    into v_resultado
    from public.barbearias b
    join public.barbeiros br on br.id = v_ag.barbeiro_id
    join public.servicos s on s.id = v_ag.servico_id
    join public.clientes c on c.id = v_ag.cliente_id
   where b.id = v_ag.barbearia_id;

  return v_resultado;
end;
$$;

revoke all on function public.destinatarios_aviso_agendamento(uuid) from public;
grant execute on function public.destinatarios_aviso_agendamento(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Apaga aparelhos que o serviço de push disse que não existem mais (410/404),
-- por exemplo quando a pessoa desinstalou o app ou bloqueou as notificações.
-- ---------------------------------------------------------------------------
create or replace function public.descartar_inscricoes_push(p_endpoints text[])
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.inscricoes_push where endpoint = any (p_endpoints);
$$;

revoke all on function public.descartar_inscricoes_push(text[]) from public;
grant execute on function public.descartar_inscricoes_push(text[]) to anon, authenticated;
