-- Etapa 4 / Migration 5: painel da barbearia.
--
--   criar_agendamento_manual(...)  agendamento criado pelo dono ou barbeiro, com lock
--   bucket "barbearias"            logo, fotos da barbearia e fotos dos barbeiros
--
-- O resto do painel (mudar status, bloqueios, cadastros) usa as tabelas direto,
-- protegido pelo RLS da migration 3.

-- ---------------------------------------------------------------------------
-- Agendamento manual (painel). Diferenças em relação ao link público:
--   * não exige a grade nem o expediente (encaixe é decisão do barbeiro);
--   * aceita até 30 min no passado (cliente que chegou agora);
--   * nasce confirmado e com origem = 'manual'.
-- Continua recusando bloqueios, folgas e outro agendamento no mesmo horário.
-- ---------------------------------------------------------------------------
create or replace function public.criar_agendamento_manual(
  p_barbearia_id uuid,
  p_barbeiro_id  uuid,
  p_servico_id   uuid,
  p_inicio       timestamptz,
  p_nome         text,
  p_whatsapp     text,
  p_observacoes  text default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_nome        text := trim(regexp_replace(coalesce(p_nome, ''), '\s+', ' ', 'g'));
  v_whatsapp    text := public.normalizar_whatsapp(p_whatsapp);
  v_duracao     integer;
  v_fim         timestamptz;
  v_cliente_id  uuid;
  v_agendamento uuid;
begin
  -- Mesmas regras do RLS: o dono agenda para qualquer barbeiro; o barbeiro, só para si.
  if not (
    privado.eh_dono(p_barbearia_id)
    or coalesce(p_barbeiro_id = privado.meu_barbeiro_id(p_barbearia_id), false)
  ) then
    raise exception 'SEM_PERMISSAO' using detail = 'Você não pode agendar para esse barbeiro.';
  end if;

  if length(v_nome) < 2 or length(v_nome) > 120 then
    raise exception 'DADOS_INVALIDOS' using detail = 'Informe o nome do cliente.';
  end if;
  if v_whatsapp is null then
    raise exception 'DADOS_INVALIDOS' using detail = 'Informe um WhatsApp válido com DDD.';
  end if;
  if p_inicio is null then
    raise exception 'DADOS_INVALIDOS' using detail = 'Escolha o horário.';
  end if;

  select duracao_minutos into v_duracao
    from public.servicos
   where id = p_servico_id and barbearia_id = p_barbearia_id and ativo;
  if not found then
    raise exception 'SERVICO_INVALIDO' using detail = 'Serviço indisponível.';
  end if;

  if not exists (
    select 1
      from public.barbeiros b
      join public.barbeiro_servicos bs on bs.barbeiro_id = b.id and bs.servico_id = p_servico_id
     where b.id = p_barbeiro_id and b.barbearia_id = p_barbearia_id and b.ativo
  ) then
    raise exception 'BARBEIRO_INVALIDO' using detail = 'Esse barbeiro não faz esse serviço.';
  end if;

  if p_inicio < now() - interval '30 minutes' then
    raise exception 'ANTECEDENCIA_MINIMA' using detail = 'Esse horário já passou.';
  end if;

  v_fim := p_inicio + make_interval(mins => v_duracao);
  if (v_fim at time zone privado.fuso())::date <> (p_inicio at time zone privado.fuso())::date then
    raise exception 'FORA_DO_EXPEDIENTE' using detail = 'O atendimento não pode passar da meia-noite.';
  end if;

  perform privado.travar_barbeiro(p_barbeiro_id);

  if exists (
    select 1 from public.bloqueios_agenda
     where barbearia_id = p_barbearia_id
       and (barbeiro_id is null or barbeiro_id = p_barbeiro_id)
       and tstzrange(inicio, fim, '[)') && tstzrange(p_inicio, v_fim, '[)')
  ) then
    raise exception 'HORARIO_BLOQUEADO' using detail = 'Esse horário está bloqueado na agenda.';
  end if;

  if exists (
    select 1 from public.agendamentos
     where barbeiro_id = p_barbeiro_id
       and status in ('agendado', 'confirmado', 'concluido')
       and tstzrange(inicio, fim, '[)') && tstzrange(p_inicio, v_fim, '[)')
  ) then
    raise exception 'HORARIO_INDISPONIVEL' using detail = 'Esse barbeiro já tem cliente nesse horário.';
  end if;

  -- Cliente já cadastrado (mesmo WhatsApp) mantém o nome do cadastro.
  insert into public.clientes (barbearia_id, nome, whatsapp)
  values (p_barbearia_id, v_nome, v_whatsapp)
  on conflict (barbearia_id, whatsapp) do update set updated_at = now()
  returning id into v_cliente_id;

  begin
    insert into public.agendamentos (
      barbearia_id, barbeiro_id, servico_id, cliente_id, inicio, status, origem, observacoes, criado_por
    )
    values (
      p_barbearia_id, p_barbeiro_id, p_servico_id, v_cliente_id, p_inicio, 'confirmado', 'manual',
      nullif(left(trim(coalesce(p_observacoes, '')), 500), ''), (select auth.uid())
    )
    returning id into v_agendamento;
  exception when exclusion_violation then
    raise exception 'HORARIO_INDISPONIVEL' using detail = 'Esse barbeiro já tem cliente nesse horário.';
  end;

  return v_agendamento;
end;
$$;

revoke all on function public.criar_agendamento_manual(uuid, uuid, uuid, timestamptz, text, text, text) from public, anon;
grant execute on function public.criar_agendamento_manual(uuid, uuid, uuid, timestamptz, text, text, text)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Storage: bucket público "barbearias" para imagens da vitrine.
-- Caminho: <barbearia_id>/<arquivo>. Só o dono da barbearia grava na pasta dela.
-- Leitura é pública (são as fotos que aparecem no link de agendamento).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('barbearias', 'barbearias', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- O primeiro pedaço do caminho é o id da barbearia; o usuário logado é dono dela?
create or replace function privado.eh_dono_da_pasta(p_nome text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when split_part(p_nome, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then privado.eh_dono(split_part(p_nome, '/', 1)::uuid)
    else false
  end;
$$;

revoke all on function privado.eh_dono_da_pasta(text) from public;
grant execute on function privado.eh_dono_da_pasta(text) to authenticated, service_role;

create policy "barbearias: dono envia imagens"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'barbearias' and privado.eh_dono_da_pasta(name));

create policy "barbearias: dono substitui imagens"
  on storage.objects for update to authenticated
  using (bucket_id = 'barbearias' and privado.eh_dono_da_pasta(name))
  with check (bucket_id = 'barbearias' and privado.eh_dono_da_pasta(name));

create policy "barbearias: dono remove imagens"
  on storage.objects for delete to authenticated
  using (bucket_id = 'barbearias' and privado.eh_dono_da_pasta(name));

-- O dono precisa ler os objetos da própria pasta para o Storage aceitar remove/upsert.
create policy "barbearias: dono lista imagens"
  on storage.objects for select to authenticated
  using (bucket_id = 'barbearias' and privado.eh_dono_da_pasta(name));
