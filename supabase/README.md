# Banco de dados (Supabase)

Etapa 1 do projeto: modelo de dados, migrations, RLS e seed.

## Arquivos

| Arquivo | O que tem |
| --- | --- |
| `migrations/20261020000001_base.sql` | Extensão `btree_gist`, schema `privado`, enums (papel, status, origem, tipo de bloqueio) |
| `migrations/20261020000002_tabelas.sql` | As 11 tabelas, FKs compostas por `barbearia_id`, constraint anti reserva dupla, triggers |
| `migrations/20261020000003_rls.sql` | Funções auxiliares de permissão, grants e todas as políticas de RLS |
| `migrations/20261020000004_agendamento_publico.sql` | RPCs do link público: `horarios_ocupados`, `criar_agendamento_publico`, `consultar_agendamento_publico` |
| `migrations/20261023000001_painel.sql` | Painel: RPC `criar_agendamento_manual` e o bucket público `barbearias` no Storage (logo e fotos), com escrita só do dono |
| `seed.sql` | Duas barbearias **fictícias** (`ficticia-navalha-de-ouro` e `ficticia-corte-fino`) com serviços, barbeiros, horários, clientes e agendamentos de exemplo |
| `scripts/vincular_usuario.sql` | Liga um usuário do Auth a uma barbearia como dono ou barbeiro |
| `tests/*.test.sql` | Testes pgTAP: isolamento entre barbearias, permissões por papel e regras de agendamento |

## Modelo

```
barbearias ─┬─ barbearia_usuarios ── auth.users ── perfis
            ├─ barbeiros ─┬─ barbeiro_servicos ── servicos
            │             └─ horarios_barbeiros
            ├─ horarios_funcionamento
            ├─ bloqueios_agenda      (barbeiro_id nulo = barbearia inteira)
            ├─ clientes              (único por barbearia + WhatsApp)
            └─ agendamentos ── barbeiro, servico, cliente
```

Decisões que valem para o app:

- **Multi barbearia**: toda tabela tem `barbearia_id`. As filhas usam FK composta `(id, barbearia_id)`, então o banco recusa misturar dados de barbearias diferentes mesmo que o app erre.
- **Dinheiro** em centavos (`preco_centavos`). O agendamento guarda cópia do preço e da duração do serviço.
- **Fuso** fixo `America/Sao_Paulo`. Horários semanais são `time` locais; agendamentos e bloqueios são `timestamptz`.
- **Dia da semana** segue `extract(dow)`: 0 = domingo ... 6 = sábado. Dia sem linha em `horarios_funcionamento` = fechado; sem linha em `horarios_barbeiros` = folga fixa do barbeiro.
- **Grade**: os inícios possíveis são múltiplos de `intervalo_slot_minutos` a partir da meia-noite (09:00, 09:30...). O `lib/availability` da etapa 3 deve seguir essa regra.
- **WhatsApp** guardado só com dígitos e DDI: `5511999998888`. `public.normalizar_whatsapp()` converte.
- **Status**: `agendado`, `confirmado`, `concluido`, `cancelado`, `falta`. Cancelado e falta liberam o horário.
- **Reserva dupla**: a constraint `agendamentos_sem_conflito` (exclusão com `btree_gist`) impede dois agendamentos ativos sobrepostos do mesmo barbeiro. A RPC pública ainda segura um lock por barbeiro antes de validar.

## Quem pode o quê (RLS)

| | anon (link público) | barbeiro | dono |
| --- | --- | --- | --- |
| barbearia, serviços, barbeiros, horários | lê os ativos | lê | lê e edita |
| clientes | não | lê, cria, edita | tudo |
| agendamentos | só via RPC | só os seus (cria manual, muda status) | todos |
| bloqueios | só via RPC (sem motivo) | os seus | todos, inclusive da barbearia inteira |
| equipe (`barbearia_usuarios`) | não | vê o próprio vínculo | gerencia, mas não remove nem rebaixa a si mesmo |

Criar ou apagar barbearia fica com a plataforma (seed/script com service_role).

## RPCs do link público

Chamadas com a chave `anon` via `supabase.rpc(...)`:

- `horarios_ocupados(p_slug, p_de, p_ate)`: intervalos ocupados (agendamentos ativos e bloqueios) por barbeiro, para montar a grade. No máximo 62 dias.
- `criar_agendamento_publico(p_slug, p_servico_id, p_barbeiro_id, p_inicio, p_nome, p_whatsapp, p_aceite_lgpd, p_observacoes)`: revalida tudo e grava. `p_barbeiro_id = null` é "qualquer disponível" (escolhe o barbeiro livre com menos agendamentos no dia). Limite de 3 agendamentos futuros por WhatsApp.
- `consultar_agendamento_publico(p_id)`: dados da tela de confirmação (só o primeiro nome do cliente).

Erros vêm com `message` = código estável e `details` = texto em português:
`BARBEARIA_NAO_ENCONTRADA`, `SERVICO_INVALIDO`, `BARBEIRO_INVALIDO`, `DADOS_INVALIDOS`, `LGPD_OBRIGATORIO`, `ANTECEDENCIA_MINIMA`, `FORA_DA_JANELA`, `FORA_DA_GRADE`, `FORA_DO_EXPEDIENTE`, `HORARIO_BLOQUEADO`, `HORARIO_INDISPONIVEL`, `LIMITE_AGENDAMENTOS`, `PERIODO_INVALIDO`.

## RPC do painel

- `criar_agendamento_manual(p_barbearia_id, p_barbeiro_id, p_servico_id, p_inicio, p_nome, p_whatsapp, p_observacoes)`: só para usuário logado (dono para qualquer barbeiro, barbeiro só para si). Não exige grade nem expediente (encaixe), aceita até 30 min no passado, nasce `confirmado` com origem `manual`. Recusa bloqueio (`HORARIO_BLOQUEADO`), outro cliente no horário (`HORARIO_INDISPONIVEL`) e falta de permissão (`SEM_PERMISSAO`).

## Storage

Bucket público `barbearias`, arquivos em `<barbearia_id>/...`, até 3 MB, JPG/PNG/WebP. Qualquer um lê (são as fotos do link); só o dono da barbearia grava ou apaga na pasta dela.

## Como testar

Precisa do Docker e do [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started).

```bash
supabase start       # sobe o Supabase local
supabase db reset    # aplica as migrations e o seed.sql
supabase test db     # roda os testes pgTAP de supabase/tests
```

Para mandar para o projeto na nuvem:

```bash
supabase link --project-ref <ref-do-projeto>
supabase db push     # aplica as migrations (o seed NÃO vai para a nuvem)
```

Depois de criar seu usuário em Authentication, rode `scripts/vincular_usuario.sql` no SQL Editor para virar dono de uma barbearia.
