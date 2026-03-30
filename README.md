# Cathedral Voucher System

Sistema de vouchers de consumação 100% gratuito.
Custo mensal: R$ 0,00

---

## PASSO 1 — Criar conta no Supabase

1. Acesse https://supabase.com > "Start your project"
2. Crie conta gratuita (pode usar Google)
3. Clique em "New Project"
   - Nome: cathedral-voucher
   - Região: South America (São Paulo)
4. Aguarde ~2 minutos

---

## PASSO 2 — Criar as tabelas

1. No Supabase, clique em SQL Editor > New Query
2. Cole TODO o conteúdo do arquivo supabase-setup.sql
3. Clique Run

---

## PASSO 3 — Criar seu usuário administrador

1. Supabase > Authentication > Users > Add User > Create new user
2. Preencha seu email e senha
3. Copie o UUID gerado
4. No SQL Editor, rode:

INSERT INTO operators (auth_user_id, name, email, role)
VALUES ('COLE_O_UUID_AQUI', 'Guilherme', 'seu@email.com', 'admin');

5. Adicione os locais do bar:

INSERT INTO locations (name) VALUES ('Cathedral Centro');
INSERT INTO locations (name) VALUES ('Cathedral Zona Sul');

---

## PASSO 4 — Configurar o .env

1. Copie .env.example e renomeie para .env
2. No Supabase > Settings > API, copie:
   - Project URL  →  VITE_SUPABASE_URL
   - anon public  →  VITE_SUPABASE_ANON_KEY

---

## PASSO 5 — Testar localmente

Abra o CMD dentro da pasta cathedral-voucher:

  npm install
  npm run dev

Acesse http://localhost:5173

---

## PASSO 6 — Deploy no Vercel (deixar online de graça)

1. Crie conta em https://vercel.com
2. No CMD, dentro da pasta:

  npm install -g vercel
  vercel

3. Quando pedir variáveis de ambiente, adicione:
   VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY

4. Você recebe uma URL pública tipo:
   https://cathedral-voucher.vercel.app

---

## URLs do sistema

- Admin (você):    /admin
- Operador caixa:  /operador
- Login:           /login

---

## Tecnologias usadas (todas gratuitas)

- React + Vite (frontend)
- Supabase (banco PostgreSQL + autenticação)
- Vercel (hospedagem)
- html2canvas + jsPDF (geração da arte)
- wa.me (envio WhatsApp sem custo)
