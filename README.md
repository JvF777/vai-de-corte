# Vai de Corte

Agendamento online para barbearias: o cliente marca sozinho por um link e o barbeiro organiza a agenda num painel.
Projeto do time "Programadores da Fiel" no Startup Challenge UMC 2026. Escopo e decisões em [CLAUDE.md](CLAUDE.md).

Stack: Next.js 16 (App Router) + TypeScript + Tailwind CSS 4, Supabase (Postgres, Auth, RLS), Zod, Lucide e GSAP.

## Rodar no seu computador

Precisa do [Node.js 20 ou mais novo](https://nodejs.org/) (o LTS serve).

```bash
npm install
cp .env.example .env.local     # no Windows (PowerShell): copy .env.example .env.local
```

Abra o `.env.local` e preencha com os dados do projeto no Supabase:

| Variável | Onde achar no painel do Supabase |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings > Data API > Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Project Settings > API Keys > Publishable key (`sb_publishable_...`). A chave `anon` antiga também funciona. |

Nunca use a `service_role` / secret key no `.env.local`: tudo que começa com `NEXT_PUBLIC_` vai para o navegador.

```bash
npm run dev
```

Abra http://localhost:3000.

## Criar o primeiro login (dono de teste)

Ainda não existe tela de cadastro: os usuários do painel são criados pelo Supabase.

1. No Supabase, vá em **Authentication > Users > Add user > Create new user**.
2. Preencha e-mail e senha (mínimo 6 caracteres), deixe marcado **Auto Confirm User** e clique em **Create user**.
3. Vá em **SQL Editor > New query**, cole o SQL abaixo trocando o e-mail e clique em **Run**:

   ```sql
   insert into public.barbearia_usuarios (barbearia_id, usuario_id, papel)
   select b.id, u.id, 'dono'
     from public.barbearias b, auth.users u
    where b.slug = 'ficticia-navalha-de-ouro'
      and u.email = 'seu-email@exemplo.com'
   on conflict (barbearia_id, usuario_id) do update set papel = excluded.papel;
   ```

   Deve aparecer `Success. 1 row affected` (ou `INSERT 0 1`). Se aparecer `0 rows`, o e-mail ou o slug está errado.
4. Entre em http://localhost:3000/login com esse e-mail e senha. O painel mostra o nome da barbearia e as contagens.

O mesmo SQL, com a versão para barbeiro, está em [`supabase/scripts/vincular_usuario.sql`](supabase/scripts/vincular_usuario.sql).

Recomendado: em **Authentication > Sign In / Providers**, desligue **Allow new users to sign up**. Assim ninguém cria conta sozinho pela API; só você, pelo painel do Supabase.

## Como o login funciona

| Arquivo | O que faz |
| --- | --- |
| `proxy.ts` + `lib/supabase/proxy.ts` | Roda antes de `/painel` e `/login`: renova a sessão e manda para `/login` quem não está logado (e para `/painel` quem já está) |
| `lib/supabase/server.ts` | Cliente Supabase do servidor, com a sessão do usuário. O RLS do banco vale em toda consulta |
| `lib/supabase/env.ts` | Lê e valida as variáveis do `.env.local` |
| `lib/auth.ts` | `obterContextoPainel()`: usuário logado, barbearias a que ele tem acesso e a barbearia atual. Toda página do painel parte daqui |
| `app/login/` | Tela e Server Action de login (e-mail e senha) |
| `app/painel/` | Layout com menu (troca de barbearia e sair) e a página inicial do painel |

Não existe cliente Supabase no navegador por enquanto: login, logout e consultas rodam no servidor.

## Link público de agendamento

Cada barbearia tem o seu endereço: `/barbearia/<slug>` (no seed: http://localhost:3000/barbearia/ficticia-navalha-de-ouro). O cliente agenda sem login, em quatro etapas: serviço, barbeiro (ou qualquer um disponível), dia e horário, e nome + WhatsApp com o aceite da LGPD. Depois cai na tela de confirmação, com botões de WhatsApp, Google Agenda e arquivo `.ics`.

| Arquivo | O que faz |
| --- | --- |
| `lib/availability/` | **Única** lógica de disponibilidade do app: grade a partir da meia-noite, duração do serviço, funcionamento, jornada e almoço do barbeiro, folgas, bloqueios, antecedência mínima e janela. Funções puras, com testes em `availability.test.ts` |
| `lib/vitrine.ts` | Lê o catálogo público (barbearia, serviços, barbeiros, horários) e chama as RPCs `horarios_ocupados` e `consultar_agendamento_publico` |
| `lib/supabase/publico.ts` | Cliente Supabase do link público: sempre como visitante, sem sessão nem cookies |
| `app/barbearia/[slug]/` | Página da barbearia, fluxo de agendamento e Server Actions (`buscarHorarios` e `agendar`) |
| `app/barbearia/[slug]/agendamento/[id]/` | Tela de confirmação e o arquivo `agenda.ics` |
| `lib/agenda-links.ts`, `lib/formatos.ts` | Link do Google Agenda, arquivo `.ics`, preço, duração, datas e links `wa.me` |

Os horários aparecem calculados no servidor na hora em que o cliente escolhe o dia. Ao confirmar, a RPC `criar_agendamento_publico` confere tudo de novo no Postgres, com lock por barbeiro; se alguém pegou o horário um instante antes, a tela volta para a escolha de horário já atualizada.

## Painel da barbearia

| Tela | O que faz |
| --- | --- |
| `/painel/agenda` | Agenda do dia: no computador, uma coluna por barbeiro com horas, almoço, bloqueios e a linha de agora; no celular, uma lista por barbeiro. Tocar num cliente abre os detalhes para confirmar, concluir, cancelar ou marcar falta (concluir e falta só depois que o horário começa). Também tem "Bloquear horário" e "Novo agendamento" (com encaixe fora da grade). O dono vê todos; o barbeiro, só a própria agenda |
| `/painel/servicos` | Tabela de serviços com preço, duração e quem faz; criar, editar, tirar do link ou excluir (se ainda não tiver agendamento) |
| `/painel/barbeiros` e `/painel/barbeiros/[id]` | Equipe; por barbeiro: foto, apresentação, dias e horários com almoço, serviços que faz, folgas e férias |
| `/painel/barbearia` | Nome, endereço, WhatsApp, Instagram, Maps, logo, até 12 fotos, horário de funcionamento e regras do link (intervalo, antecedência, quantos dias à frente) |

| Arquivo | O que faz |
| --- | --- |
| `lib/painel/dados.ts` | Leituras do painel com a sessão do usuário (cadastro completo, agenda do dia, folgas) e `obterAcesso()` (papel e barbeiro ligado ao login) |
| `lib/painel/agenda.ts` | Regras puras da agenda: ações permitidas por status, faixa de horas da grade, resumo do dia. Testes em `agenda.test.ts` |
| `lib/painel/imagens.ts` | Envio e remoção de imagens no Storage (bucket `barbearias`) |
| `app/painel/*/actions.ts` | Server Actions: validam com Zod, conferem o papel e gravam com a sessão do usuário (o RLS vale sempre) |
| `components/ui/modal.tsx` | Modal com `<dialog>` nativo: folha de baixo no celular, centro no desktop |

Só o dono vê Serviços, Barbeiros e Barbearia no menu. O agendamento manual usa a RPC `criar_agendamento_manual`, que trava o barbeiro e recusa bloqueios e choque de horário.

## Design system

Tema escuro com dourado champanhe, Manrope nos títulos e Inter na interface.

| Onde | O que tem |
| --- | --- |
| `app/globals.css` (bloco `@theme`) | **Todos os tokens**: cores, fontes, tamanhos de texto, raios e sombra. As cores padrão do Tailwind estão desligadas, então só existem as do Vai de Corte (e nenhum verde). |
| `app/layout.tsx` | Carrega Manrope (600, 700) e Inter (400, 500, 600) pelo `next/font` |
| `components/ui/` | `Botao` (primário, secundário, contorno, destrutivo, fantasma, com carregamento), `BotaoEnviar`, `Campo`, `Aviso` (sucesso, erro, atenção, info), `SeloStatus` (status do agendamento) e `Painel` |
| `components/animacao/` | GSAP: `Revelar` (entrada em sequência), `Contador` (números que contam até o valor real) e o registro dos plugins |
| `components/marca.tsx` | Logo e nome |

Regras: use só classes com os tokens (`bg-card`, `text-texto-sec`, `border-borda`...), nunca cores soltas. Texto discreto (`text-texto-disc`) não vai sobre `bg-elevado` e o dourado discreto não é usado como texto (os dois ficam abaixo de 4,5:1 nesses fundos). Toda animação usa só transform e opacidade e respeita "reduzir movimento" do sistema.

As skills de design usadas no redesign estão em `.agents/skills` (instaladas com `npx skills add`).

## Comandos

```bash
npm run dev     # servidor de desenvolvimento
npm run build   # build de produção (precisa do .env.local preenchido)
npm run lint    # ESLint
npm test        # testes da disponibilidade e da agenda (Vitest)
```

Banco, migrations, RLS e testes do banco: veja [supabase/README.md](supabase/README.md).
