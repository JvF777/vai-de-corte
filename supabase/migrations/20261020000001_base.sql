-- Etapa 1 / Migration 1: extensões, schema privado, tipos e utilitários.
--
-- Convenções:
--   * Toda tabela de negócio tem barbearia_id (multi barbearia).
--   * Valores em centavos (integer).
--   * Datas/horas absolutas em timestamptz; horários semanais em time,
--     interpretados no fuso fixo America/Sao_Paulo.
--   * Funções security definer ficam no schema "privado" (não exposto pela API)
--     ou em public quando precisam ser chamadas via RPC, sempre com search_path vazio.

create extension if not exists btree_gist with schema extensions;

create schema if not exists privado;
revoke all on schema privado from public;
grant usage on schema privado to anon, authenticated, service_role;

-- Fuso fixo do produto.
create or replace function privado.fuso()
returns text
language sql
immutable
as $$ select 'America/Sao_Paulo'::text $$;

create type public.papel_barbearia as enum ('dono', 'barbeiro');

create type public.status_agendamento as enum (
  'agendado',    -- criado, aguardando confirmação do barbeiro
  'confirmado',
  'concluido',
  'cancelado',
  'falta'        -- cliente não compareceu
);

create type public.origem_agendamento as enum ('link_publico', 'manual');

create type public.tipo_bloqueio as enum (
  'bloqueio',    -- horário bloqueado pontual
  'folga',       -- folga/férias do barbeiro
  'feriado'      -- barbearia fechada (normalmente sem barbeiro_id)
);

-- Mantém updated_at.
create or replace function privado.tocar_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
