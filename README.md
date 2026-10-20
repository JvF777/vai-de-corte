# Barbeiro SaaS

Agendamento online para barbearias: o cliente marca sozinho por um link e o barbeiro organiza a agenda num painel.
Projeto do time "Programadores da Fiel" no Startup Challenge UMC 2026. Escopo e decisões em [CLAUDE.md](CLAUDE.md).

Stack: Next.js 16 (App Router) + TypeScript + Tailwind CSS 4, Supabase (Postgres, Auth, RLS), Zod e Lucide.

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

## Comandos

```bash
npm run dev     # servidor de desenvolvimento
npm run build   # build de produção (precisa do .env.local preenchido)
npm run lint    # ESLint
```

Banco, migrations, RLS e testes do banco: veja [supabase/README.md](supabase/README.md).
