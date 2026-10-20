-- Etapa 1 / Migration 3: Row Level Security.
--
-- Papéis:
--   anon          visitante do link público. Lê só o catálogo de barbearias ativas
--                 (dados, serviços, barbeiros, horários). Nunca lê clientes,
--                 agendamentos ou bloqueios: para isso usa as funções RPC da migration 4.
--   authenticated usuário logado. Só enxerga barbearias onde está em barbearia_usuarios.
--     dono        tudo da própria barbearia.
--     barbeiro    lê o cadastro da barbearia e os clientes; gerencia só a própria
--                 agenda (agendamentos e bloqueios do seu barbeiro_id).
--   service_role  ignora RLS. Só no servidor (seed/scripts). Nunca no navegador.

-- ---------------------------------------------------------------------------
-- Funções auxiliares. security definer para não cair em recursão de RLS
-- ao consultar barbearia_usuarios/barbeiros dentro das políticas.
-- ---------------------------------------------------------------------------
create or replace function privado.eh_membro(p_barbearia_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.barbearia_usuarios
     where barbearia_id = p_barbearia_id
       and usuario_id = (select auth.uid())
  );
$$;

create or replace function privado.eh_dono(p_barbearia_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.barbearia_usuarios
     where barbearia_id = p_barbearia_id
       and usuario_id = (select auth.uid())
       and papel = 'dono'
  );
$$;

-- barbeiro_id do usuário logado naquela barbearia (nulo se não for barbeiro).
create or replace function privado.meu_barbeiro_id(p_barbearia_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select b.id
    from public.barbeiros b
    join public.barbearia_usuarios bu
      on bu.barbearia_id = b.barbearia_id and bu.usuario_id = b.usuario_id
   where b.barbearia_id = p_barbearia_id
     and b.usuario_id = (select auth.uid());
$$;

create or replace function privado.barbearia_ativa(p_barbearia_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.barbearias where id = p_barbearia_id and ativo);
$$;

-- O usuário logado e p_usuario_id trabalham em alguma barbearia em comum?
create or replace function privado.compartilha_barbearia(p_usuario_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.barbearia_usuarios eu
      join public.barbearia_usuarios outro on outro.barbearia_id = eu.barbearia_id
     where eu.usuario_id = (select auth.uid())
       and outro.usuario_id = p_usuario_id
  );
$$;

revoke all on all functions in schema privado from public;
grant execute on function
  privado.eh_membro(uuid),
  privado.eh_dono(uuid),
  privado.meu_barbeiro_id(uuid),
  privado.barbearia_ativa(uuid),
  privado.compartilha_barbearia(uuid),
  privado.fuso()
to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Privilégios de tabela (defesa em profundidade além do RLS).
-- O Supabase concede tudo para anon/authenticated por padrão; aqui o anon
-- fica só com SELECT no catálogo público.
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
grant select on
  public.barbearias,
  public.barbeiros,
  public.servicos,
  public.barbeiro_servicos,
  public.horarios_funcionamento,
  public.horarios_barbeiros
to anon;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;

-- ---------------------------------------------------------------------------
-- Liga o RLS em todas as tabelas.
-- ---------------------------------------------------------------------------
alter table public.barbearias              enable row level security;
alter table public.perfis                  enable row level security;
alter table public.barbearia_usuarios      enable row level security;
alter table public.barbeiros               enable row level security;
alter table public.servicos                enable row level security;
alter table public.barbeiro_servicos       enable row level security;
alter table public.horarios_funcionamento  enable row level security;
alter table public.horarios_barbeiros      enable row level security;
alter table public.bloqueios_agenda        enable row level security;
alter table public.clientes                enable row level security;
alter table public.agendamentos            enable row level security;

-- ---------------------------------------------------------------------------
-- barbearias: criação/remoção só pela plataforma (service_role / seed).
-- ---------------------------------------------------------------------------
create policy "barbearias: leitura pública das ativas e dos membros"
  on public.barbearias for select
  to anon, authenticated
  using (ativo or privado.eh_membro(id));

create policy "barbearias: dono edita"
  on public.barbearias for update
  to authenticated
  using (privado.eh_dono(id))
  with check (privado.eh_dono(id));

-- ---------------------------------------------------------------------------
-- perfis
-- ---------------------------------------------------------------------------
create policy "perfis: ver o próprio e os colegas"
  on public.perfis for select
  to authenticated
  using (id = (select auth.uid()) or privado.compartilha_barbearia(id));

create policy "perfis: criar o próprio"
  on public.perfis for insert
  to authenticated
  with check (id = (select auth.uid()));

create policy "perfis: editar o próprio"
  on public.perfis for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- barbearia_usuarios: o dono gerencia a equipe, mas não remove nem rebaixa a si mesmo
-- (evita a barbearia ficar sem dono).
-- ---------------------------------------------------------------------------
create policy "barbearia_usuarios: ver o próprio vínculo ou a equipe (dono)"
  on public.barbearia_usuarios for select
  to authenticated
  using (usuario_id = (select auth.uid()) or privado.eh_dono(barbearia_id));

create policy "barbearia_usuarios: dono adiciona"
  on public.barbearia_usuarios for insert
  to authenticated
  with check (privado.eh_dono(barbearia_id));

create policy "barbearia_usuarios: dono altera outros"
  on public.barbearia_usuarios for update
  to authenticated
  using (privado.eh_dono(barbearia_id) and usuario_id <> (select auth.uid()))
  with check (privado.eh_dono(barbearia_id) and usuario_id <> (select auth.uid()));

create policy "barbearia_usuarios: dono remove outros"
  on public.barbearia_usuarios for delete
  to authenticated
  using (privado.eh_dono(barbearia_id) and usuario_id <> (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Catálogo (barbeiros, servicos, barbeiro_servicos, horários):
-- público lê o que está ativo; membros leem tudo; dono escreve.
-- ---------------------------------------------------------------------------
create policy "barbeiros: leitura"
  on public.barbeiros for select
  to anon, authenticated
  using ((ativo and privado.barbearia_ativa(barbearia_id)) or privado.eh_membro(barbearia_id));

create policy "barbeiros: dono insere"
  on public.barbeiros for insert to authenticated
  with check (privado.eh_dono(barbearia_id));
create policy "barbeiros: dono edita"
  on public.barbeiros for update to authenticated
  using (privado.eh_dono(barbearia_id)) with check (privado.eh_dono(barbearia_id));
create policy "barbeiros: dono remove"
  on public.barbeiros for delete to authenticated
  using (privado.eh_dono(barbearia_id));

create policy "servicos: leitura"
  on public.servicos for select
  to anon, authenticated
  using ((ativo and privado.barbearia_ativa(barbearia_id)) or privado.eh_membro(barbearia_id));

create policy "servicos: dono insere"
  on public.servicos for insert to authenticated
  with check (privado.eh_dono(barbearia_id));
create policy "servicos: dono edita"
  on public.servicos for update to authenticated
  using (privado.eh_dono(barbearia_id)) with check (privado.eh_dono(barbearia_id));
create policy "servicos: dono remove"
  on public.servicos for delete to authenticated
  using (privado.eh_dono(barbearia_id));

create policy "barbeiro_servicos: leitura"
  on public.barbeiro_servicos for select
  to anon, authenticated
  using (privado.barbearia_ativa(barbearia_id) or privado.eh_membro(barbearia_id));

create policy "barbeiro_servicos: dono insere"
  on public.barbeiro_servicos for insert to authenticated
  with check (privado.eh_dono(barbearia_id));
create policy "barbeiro_servicos: dono remove"
  on public.barbeiro_servicos for delete to authenticated
  using (privado.eh_dono(barbearia_id));

create policy "horarios_funcionamento: leitura"
  on public.horarios_funcionamento for select
  to anon, authenticated
  using (privado.barbearia_ativa(barbearia_id) or privado.eh_membro(barbearia_id));

create policy "horarios_funcionamento: dono insere"
  on public.horarios_funcionamento for insert to authenticated
  with check (privado.eh_dono(barbearia_id));
create policy "horarios_funcionamento: dono edita"
  on public.horarios_funcionamento for update to authenticated
  using (privado.eh_dono(barbearia_id)) with check (privado.eh_dono(barbearia_id));
create policy "horarios_funcionamento: dono remove"
  on public.horarios_funcionamento for delete to authenticated
  using (privado.eh_dono(barbearia_id));

create policy "horarios_barbeiros: leitura"
  on public.horarios_barbeiros for select
  to anon, authenticated
  using (privado.barbearia_ativa(barbearia_id) or privado.eh_membro(barbearia_id));

create policy "horarios_barbeiros: dono insere"
  on public.horarios_barbeiros for insert to authenticated
  with check (privado.eh_dono(barbearia_id));
create policy "horarios_barbeiros: dono edita"
  on public.horarios_barbeiros for update to authenticated
  using (privado.eh_dono(barbearia_id)) with check (privado.eh_dono(barbearia_id));
create policy "horarios_barbeiros: dono remove"
  on public.horarios_barbeiros for delete to authenticated
  using (privado.eh_dono(barbearia_id));

-- ---------------------------------------------------------------------------
-- bloqueios_agenda: membros leem; dono gerencia todos; barbeiro gerencia os seus.
-- Bloqueio da barbearia inteira (barbeiro_id nulo) é só do dono.
-- ---------------------------------------------------------------------------
create policy "bloqueios: membros leem"
  on public.bloqueios_agenda for select to authenticated
  using (privado.eh_membro(barbearia_id));

create policy "bloqueios: dono ou o próprio barbeiro insere"
  on public.bloqueios_agenda for insert to authenticated
  with check (
    privado.eh_dono(barbearia_id)
    or (barbeiro_id is not null and barbeiro_id = privado.meu_barbeiro_id(barbearia_id))
  );

create policy "bloqueios: dono ou o próprio barbeiro edita"
  on public.bloqueios_agenda for update to authenticated
  using (
    privado.eh_dono(barbearia_id)
    or (barbeiro_id is not null and barbeiro_id = privado.meu_barbeiro_id(barbearia_id))
  )
  with check (
    privado.eh_dono(barbearia_id)
    or (barbeiro_id is not null and barbeiro_id = privado.meu_barbeiro_id(barbearia_id))
  );

create policy "bloqueios: dono ou o próprio barbeiro remove"
  on public.bloqueios_agenda for delete to authenticated
  using (
    privado.eh_dono(barbearia_id)
    or (barbeiro_id is not null and barbeiro_id = privado.meu_barbeiro_id(barbearia_id))
  );

-- ---------------------------------------------------------------------------
-- clientes: membros leem, criam e editam; só o dono apaga (pedido de exclusão LGPD).
-- ---------------------------------------------------------------------------
create policy "clientes: membros leem"
  on public.clientes for select to authenticated
  using (privado.eh_membro(barbearia_id));

create policy "clientes: membros inserem"
  on public.clientes for insert to authenticated
  with check (privado.eh_membro(barbearia_id));

create policy "clientes: membros editam"
  on public.clientes for update to authenticated
  using (privado.eh_membro(barbearia_id)) with check (privado.eh_membro(barbearia_id));

create policy "clientes: dono remove"
  on public.clientes for delete to authenticated
  using (privado.eh_dono(barbearia_id));

-- ---------------------------------------------------------------------------
-- agendamentos: dono vê/gerencia todos; barbeiro só os seus.
-- Pelo painel só se cria agendamento manual; o link público usa a RPC.
-- Exclusão física só pelo dono (o normal é cancelar).
-- ---------------------------------------------------------------------------
create policy "agendamentos: dono ou o próprio barbeiro lê"
  on public.agendamentos for select to authenticated
  using (
    privado.eh_dono(barbearia_id)
    or barbeiro_id = privado.meu_barbeiro_id(barbearia_id)
  );

create policy "agendamentos: dono ou o próprio barbeiro cria manual"
  on public.agendamentos for insert to authenticated
  with check (
    origem = 'manual'
    and (
      privado.eh_dono(barbearia_id)
      or barbeiro_id = privado.meu_barbeiro_id(barbearia_id)
    )
  );

create policy "agendamentos: dono ou o próprio barbeiro edita"
  on public.agendamentos for update to authenticated
  using (
    privado.eh_dono(barbearia_id)
    or barbeiro_id = privado.meu_barbeiro_id(barbearia_id)
  )
  with check (
    privado.eh_dono(barbearia_id)
    or barbeiro_id = privado.meu_barbeiro_id(barbearia_id)
  );

create policy "agendamentos: dono remove"
  on public.agendamentos for delete to authenticated
  using (privado.eh_dono(barbearia_id));
