# Projeto: SaaS de agendamento para barbearias

## Contexto
Projeto do time "Programadores da Fiel" (João, Leonardo, Samuel) no Startup Challenge UMC 2026, trilha T1 (SaaS para pequenas e médias empresas).
Entrega do MVP até 25/11/2026: link do MVP, vídeo de até 3 minutos e provas de uso por clientes reais.
Meta: pelo menos duas barbearias reais usando o sistema a partir de ~9/11.
O João programa tudo. Leonardo e Samuel cuidam de clientes, testes, provas de uso e vídeo.

## Problema
Barbeiros perdem tempo respondendo mensagens no WhatsApp para marcar horário. O cliente deve agendar sozinho por um link.

## Stack (tudo gratuito)
- Next.js (App Router) + TypeScript + Tailwind CSS + React
- Supabase (Postgres, Auth, RLS)
- Lucide React para ícones
- Zod para validação
- Vercel para hospedagem
- Sem serviços pagos, sem API oficial do WhatsApp, sem pagamento online

## Decisões já tomadas
- Nome do produto: **Vai de Corte**. Tema escuro, dourado champanhe, Manrope (títulos) e Inter (interface). Tokens só em `app/globals.css`; nada de verde na interface.
- Animações com GSAP (`components/animacao`), só transform/opacidade e respeitando prefers-reduced-motion.
- Multi barbearia desde o início: `barbearia_id` nas tabelas, RLS no Supabase e validação no servidor.
- Link público por slug: `/barbearia/[slug]`.
- Cliente agenda sem login. Cliente identificado pelo WhatsApp dentro da mesma barbearia.
- Fuso fixo: America/Sao_Paulo.
- Slots de 30 minutos (configurável por barbearia).
- Valores em centavos (inteiro).
- WhatsApp apenas por links wa.me com mensagem pré preenchida (nada de bibliotecas não oficiais).
- Google Agenda por link de criação de evento ou arquivo .ics.
- Aviso de LGPD no formulário de agendamento.
- O barbeiro usa número pessoal; a saudação automática depende de migrar para o WhatsApp Business (fora do código). Link também vai na bio do Instagram e em QR Code no balcão.

## Escopo do MVP
Cliente (público, mobile first):
1. Página da barbearia: nome, logo, fotos, serviços com preço e duração, barbeiros, endereço, horário, botão de agendar e de WhatsApp.
2. Fluxo: serviço, barbeiro ou "qualquer disponível", data, horários livres, nome e WhatsApp, confirmação.
3. Tela de confirmação com botões de WhatsApp e Google Agenda.

Painel (com login):
1. Dashboard com números reais: agendamentos de hoje, do mês, concluídos, cancelamentos, faltas, serviços mais procurados, agendamentos por barbeiro.
2. Agenda diária por barbeiro: confirmar, concluir, cancelar, marcar falta, bloquear horário, criar agendamento manual.
3. Cadastro de serviços, barbeiros (serviços que fazem, horários, folgas) e dados da barbearia.
4. Botão de lembrete que abre o WhatsApp do cliente com mensagem pronta.

Papéis: dono/admin da barbearia e barbeiro. Admin da plataforma fica para depois (barbearias cadastradas por seed/script).

## Regras de disponibilidade
- Agenda individual por barbeiro; mesmo horário pode estar livre em outro barbeiro.
- Considerar duração do serviço, horário de funcionamento, horário do barbeiro, almoço, folgas e bloqueios.
- Sem reservas no passado; antecedência mínima configurável.
- Revalidar no servidor ao confirmar e impedir reserva simultânea no Postgres (constraint de exclusão ou função com lock).
- Lógica de disponibilidade centralizada em `lib/availability`.

## Banco (tabelas sugeridas)
barbearias, perfis, barbearia_usuarios, barbeiros, servicos, barbeiro_servicos, horarios_funcionamento, horarios_barbeiros, bloqueios_agenda, clientes, agendamentos (com campo `origem`: link_publico ou manual).
Migrations versionadas em `supabase/migrations` e `supabase/seed.sql` com duas barbearias fictícias claramente marcadas.

## Segurança
- Nunca expor a service_role no navegador.
- Server Components por padrão.
- `.env.example` sem credenciais reais.

## Testes mínimos
- Função de disponibilidade (conflitos, duração, folgas, bloqueios).
- Isolamento entre duas barbearias.

## Ordem de trabalho
1. Modelo de dados, migrations e RLS
2. Estrutura Next.js + Supabase Auth
3. Fluxo público de agendamento
4. Painel e agenda
5. WhatsApp, Google Agenda e métricas
6. Testes, README e deploy na Vercel

Ao fim de cada etapa: listar arquivos criados, como testar e o que depende do João configurar.
