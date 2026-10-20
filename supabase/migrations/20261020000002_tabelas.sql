-- Etapa 1 / Migration 2: tabelas, constraints e índices.
--
-- Integridade entre barbearias: as tabelas filhas referenciam (id, barbearia_id)
-- do pai com FK composta. Assim é impossível, mesmo com bug no app, ligar um
-- agendamento da barbearia A a um barbeiro/serviço/cliente da barbearia B.

-- ---------------------------------------------------------------------------
-- barbearias
-- ---------------------------------------------------------------------------
create table public.barbearias (
  id                          uuid primary key default gen_random_uuid(),
  slug                        text not null unique
                              check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 3 and 60),
  nome                        text not null check (length(trim(nome)) between 2 and 120),
  descricao                   text check (length(descricao) <= 1000),
  logo_url                    text,
  fotos                       text[] not null default '{}' check (cardinality(fotos) <= 12),
  whatsapp                    text check (whatsapp ~ '^[0-9]{12,13}$'),  -- só dígitos, com DDI: 5511999998888
  instagram                   text check (length(instagram) <= 60),
  endereco                    text check (length(endereco) <= 300),
  cidade                      text check (length(cidade) <= 100),
  uf                          char(2) check (uf ~ '^[A-Z]{2}$'),
  maps_url                    text,
  intervalo_slot_minutos      integer not null default 30 check (intervalo_slot_minutos between 5 and 120),
  antecedencia_minima_minutos integer not null default 60 check (antecedencia_minima_minutos between 0 and 10080),
  janela_agendamento_dias     integer not null default 30 check (janela_agendamento_dias between 1 and 180),
  ativo                       boolean not null default true,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

comment on column public.barbearias.intervalo_slot_minutos is 'Passo da grade de horários oferecidos (padrão 30 min).';
comment on column public.barbearias.antecedencia_minima_minutos is 'Quanto tempo antes o cliente ainda pode agendar pelo link.';
comment on column public.barbearias.janela_agendamento_dias is 'Até quantos dias à frente o link público aceita agendamentos.';

-- ---------------------------------------------------------------------------
-- perfis (1:1 com auth.users)
-- ---------------------------------------------------------------------------
create table public.perfis (
  id          uuid primary key references auth.users (id) on delete cascade,
  nome        text check (length(nome) <= 120),
  telefone    text check (telefone ~ '^[0-9]{12,13}$'),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- barbearia_usuarios: quem tem acesso ao painel de cada barbearia
-- ---------------------------------------------------------------------------
create table public.barbearia_usuarios (
  barbearia_id  uuid not null references public.barbearias (id) on delete cascade,
  usuario_id    uuid not null references auth.users (id) on delete cascade,
  papel         public.papel_barbearia not null,
  created_at    timestamptz not null default now(),
  primary key (barbearia_id, usuario_id)
);

create index barbearia_usuarios_usuario_idx on public.barbearia_usuarios (usuario_id);

-- ---------------------------------------------------------------------------
-- barbeiros
-- ---------------------------------------------------------------------------
create table public.barbeiros (
  id            uuid primary key default gen_random_uuid(),
  barbearia_id  uuid not null references public.barbearias (id) on delete cascade,
  usuario_id    uuid references auth.users (id) on delete set null,  -- login do barbeiro (opcional)
  nome          text not null check (length(trim(nome)) between 2 and 80),
  foto_url      text,
  bio           text check (length(bio) <= 500),
  ativo         boolean not null default true,
  ordem         integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (id, barbearia_id),
  unique (barbearia_id, usuario_id)
);

create index barbeiros_barbearia_idx on public.barbeiros (barbearia_id);

-- ---------------------------------------------------------------------------
-- servicos
-- ---------------------------------------------------------------------------
create table public.servicos (
  id               uuid primary key default gen_random_uuid(),
  barbearia_id     uuid not null references public.barbearias (id) on delete cascade,
  nome             text not null check (length(trim(nome)) between 2 and 80),
  descricao        text check (length(descricao) <= 500),
  preco_centavos   integer not null check (preco_centavos >= 0),
  duracao_minutos  integer not null check (duracao_minutos between 5 and 480),
  ativo            boolean not null default true,
  ordem            integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (id, barbearia_id)
);

create index servicos_barbearia_idx on public.servicos (barbearia_id);

-- ---------------------------------------------------------------------------
-- barbeiro_servicos: quais serviços cada barbeiro faz
-- ---------------------------------------------------------------------------
create table public.barbeiro_servicos (
  barbearia_id  uuid not null,
  barbeiro_id   uuid not null,
  servico_id    uuid not null,
  primary key (barbeiro_id, servico_id),
  foreign key (barbeiro_id, barbearia_id) references public.barbeiros (id, barbearia_id) on delete cascade,
  foreign key (servico_id, barbearia_id) references public.servicos (id, barbearia_id) on delete cascade
);

create index barbeiro_servicos_servico_idx on public.barbeiro_servicos (servico_id);
create index barbeiro_servicos_barbearia_idx on public.barbeiro_servicos (barbearia_id);

-- ---------------------------------------------------------------------------
-- horarios_funcionamento: um intervalo por dia da semana. Dia sem linha = fechado.
-- dia_semana segue extract(dow): 0 = domingo ... 6 = sábado.
-- ---------------------------------------------------------------------------
create table public.horarios_funcionamento (
  id            uuid primary key default gen_random_uuid(),
  barbearia_id  uuid not null references public.barbearias (id) on delete cascade,
  dia_semana    smallint not null check (dia_semana between 0 and 6),
  abre          time not null,
  fecha         time not null,
  check (fecha > abre),
  unique (barbearia_id, dia_semana)
);

-- ---------------------------------------------------------------------------
-- horarios_barbeiros: jornada semanal de cada barbeiro, com almoço opcional.
-- Dia sem linha = folga fixa daquele barbeiro.
-- ---------------------------------------------------------------------------
create table public.horarios_barbeiros (
  id             uuid primary key default gen_random_uuid(),
  barbearia_id   uuid not null,
  barbeiro_id    uuid not null,
  dia_semana     smallint not null check (dia_semana between 0 and 6),
  inicio         time not null,
  fim            time not null,
  almoco_inicio  time,
  almoco_fim     time,
  foreign key (barbeiro_id, barbearia_id) references public.barbeiros (id, barbearia_id) on delete cascade,
  unique (barbeiro_id, dia_semana),
  check (fim > inicio),
  check ((almoco_inicio is null) = (almoco_fim is null)),
  check (almoco_inicio is null or (almoco_inicio >= inicio and almoco_fim <= fim and almoco_fim > almoco_inicio))
);

create index horarios_barbeiros_barbearia_idx on public.horarios_barbeiros (barbearia_id);

-- ---------------------------------------------------------------------------
-- bloqueios_agenda: bloqueios pontuais, folgas e feriados.
-- barbeiro_id nulo = vale para a barbearia inteira.
-- ---------------------------------------------------------------------------
create table public.bloqueios_agenda (
  id            uuid primary key default gen_random_uuid(),
  barbearia_id  uuid not null references public.barbearias (id) on delete cascade,
  barbeiro_id   uuid,
  tipo          public.tipo_bloqueio not null default 'bloqueio',
  inicio        timestamptz not null,
  fim           timestamptz not null,
  motivo        text check (length(motivo) <= 200),
  criado_por    uuid references auth.users (id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now(),
  foreign key (barbeiro_id, barbearia_id) references public.barbeiros (id, barbearia_id) on delete cascade,
  check (fim > inicio)
);

create index bloqueios_agenda_barbearia_inicio_idx on public.bloqueios_agenda (barbearia_id, inicio);
create index bloqueios_agenda_periodo_idx on public.bloqueios_agenda using gist (barbearia_id, tstzrange(inicio, fim, '[)'));

-- ---------------------------------------------------------------------------
-- clientes: identificados pelo WhatsApp dentro da mesma barbearia.
-- ---------------------------------------------------------------------------
create table public.clientes (
  id                      uuid primary key default gen_random_uuid(),
  barbearia_id            uuid not null references public.barbearias (id) on delete cascade,
  nome                    text not null check (length(trim(nome)) between 2 and 120),
  whatsapp                text not null check (whatsapp ~ '^[0-9]{12,13}$'),
  observacoes             text check (length(observacoes) <= 500),
  consentimento_lgpd_em   timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (barbearia_id, whatsapp),
  unique (id, barbearia_id)
);

-- ---------------------------------------------------------------------------
-- agendamentos
-- ---------------------------------------------------------------------------
create table public.agendamentos (
  id                   uuid primary key default gen_random_uuid(),
  barbearia_id         uuid not null references public.barbearias (id) on delete cascade,
  barbeiro_id          uuid not null,
  servico_id           uuid not null,
  cliente_id           uuid not null,
  inicio               timestamptz not null,
  fim                  timestamptz not null,
  status               public.status_agendamento not null default 'agendado',
  origem               public.origem_agendamento not null default 'manual',
  -- Cópia do serviço no momento do agendamento (preço/duração podem mudar depois).
  preco_centavos       integer not null check (preco_centavos >= 0),
  duracao_minutos      integer not null check (duracao_minutos between 5 and 480),
  observacoes          text check (length(observacoes) <= 500),
  lembrete_enviado_em  timestamptz,
  status_alterado_em   timestamptz,
  criado_por           uuid references auth.users (id) on delete set null,  -- nulo = link público
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  foreign key (barbeiro_id, barbearia_id) references public.barbeiros (id, barbearia_id),
  foreign key (servico_id, barbearia_id) references public.servicos (id, barbearia_id),
  foreign key (cliente_id, barbearia_id) references public.clientes (id, barbearia_id),
  check (fim > inicio),
  -- Trava final contra reserva dupla: o mesmo barbeiro não pode ter dois
  -- agendamentos ativos sobrepostos, nem com duas requisições simultâneas.
  constraint agendamentos_sem_conflito exclude using gist (
    barbeiro_id with =,
    tstzrange(inicio, fim, '[)') with &&
  ) where (status in ('agendado', 'confirmado', 'concluido'))
);

create index agendamentos_barbearia_inicio_idx on public.agendamentos (barbearia_id, inicio);
create index agendamentos_barbeiro_inicio_idx on public.agendamentos (barbeiro_id, inicio);
create index agendamentos_cliente_idx on public.agendamentos (cliente_id);
create index agendamentos_servico_idx on public.agendamentos (servico_id);

-- ---------------------------------------------------------------------------
-- Triggers de updated_at
-- ---------------------------------------------------------------------------
create trigger barbearias_updated_at before update on public.barbearias
  for each row execute function privado.tocar_updated_at();
create trigger perfis_updated_at before update on public.perfis
  for each row execute function privado.tocar_updated_at();
create trigger barbeiros_updated_at before update on public.barbeiros
  for each row execute function privado.tocar_updated_at();
create trigger servicos_updated_at before update on public.servicos
  for each row execute function privado.tocar_updated_at();
create trigger clientes_updated_at before update on public.clientes
  for each row execute function privado.tocar_updated_at();
create trigger agendamentos_updated_at before update on public.agendamentos
  for each row execute function privado.tocar_updated_at();

-- ---------------------------------------------------------------------------
-- Agendamento: preenche fim/preço/duração a partir do serviço quando omitidos,
-- e registra quando o status muda.
-- ---------------------------------------------------------------------------
create or replace function privado.agendamentos_preencher()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_servico public.servicos;
begin
  if tg_op = 'INSERT' then
    select * into v_servico
      from public.servicos
     where id = new.servico_id and barbearia_id = new.barbearia_id;

    if found then
      new.duracao_minutos := coalesce(new.duracao_minutos, v_servico.duracao_minutos);
      new.preco_centavos  := coalesce(new.preco_centavos, v_servico.preco_centavos);
    end if;
    new.fim := coalesce(new.fim, new.inicio + make_interval(mins => new.duracao_minutos));
    new.criado_por := coalesce(new.criado_por, auth.uid());
  elsif new.status is distinct from old.status then
    new.status_alterado_em := now();
  end if;

  if tg_op = 'UPDATE' and new.barbearia_id <> old.barbearia_id then
    raise exception 'Não é permitido mover agendamento entre barbearias';
  end if;

  return new;
end;
$$;

create trigger agendamentos_preencher before insert or update on public.agendamentos
  for each row execute function privado.agendamentos_preencher();

-- ---------------------------------------------------------------------------
-- Cria o perfil automaticamente quando um usuário se cadastra no Supabase Auth.
-- ---------------------------------------------------------------------------
create or replace function privado.criar_perfil_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfis (id, nome)
  values (new.id, nullif(trim(new.raw_user_meta_data ->> 'nome'), ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger criar_perfil_novo_usuario after insert on auth.users
  for each row execute function privado.criar_perfil_novo_usuario();
