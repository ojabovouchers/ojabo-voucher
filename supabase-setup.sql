-- ============================================
-- CATHEDRAL VOUCHER SYSTEM — Setup do Banco
-- Execute este SQL completo no Supabase SQL Editor
-- Versão 1.2 — 02/04/2026
-- ============================================

-- ============================================
-- 1. TABELAS PRINCIPAIS
-- ============================================

-- Locais / Unidades
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Operadores (vinculados ao auth do Supabase)
CREATE TABLE IF NOT EXISTS operators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('admin', 'operator')),
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  is_master BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Clientes (quem comprou os vouchers)
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'PIX',
  pix_account TEXT,
  purchase_date TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Vouchers
CREATE TABLE IF NOT EXISTS vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  value NUMERIC(10,2) NOT NULL,
  expires_at TIMESTAMPTZ,
  is_used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMPTZ,
  operator_id UUID REFERENCES operators(id) ON DELETE SET NULL,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Chaves PIX
CREATE TABLE IF NOT EXISTS pix_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  key_type TEXT NOT NULL,
  key_value TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Configurações do sistema (branding, voucher, etc.)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 2. ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers(code);
CREATE INDEX IF NOT EXISTS idx_vouchers_client ON vouchers(client_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_is_used ON vouchers(is_used);

-- ============================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE pix_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- LOCATIONS: qualquer autenticado lê; admin escreve
CREATE POLICY "locations_read" ON locations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "locations_write" ON locations
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM operators WHERE auth_user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM operators WHERE auth_user_id = auth.uid() AND role = 'admin'));

-- OPERATORS: autenticado lê o próprio; admin lê todos
CREATE POLICY "operators_read" ON operators
  FOR SELECT TO authenticated
  USING (
    auth_user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM operators o WHERE o.auth_user_id = auth.uid() AND o.role = 'admin')
  );

CREATE POLICY "operators_write" ON operators
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- CLIENTS: autenticados leem; admin e operador (quando permitido) escrevem
CREATE POLICY "clients_read" ON clients
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "clients_write" ON clients
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- VOUCHERS: autenticados leem; admin e operador (quando permitido) escrevem
CREATE POLICY "vouchers_read" ON vouchers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "vouchers_write" ON vouchers
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- PIX_KEYS: autenticados leem; admin escreve
CREATE POLICY "pix_keys_read" ON pix_keys
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "pix_keys_write" ON pix_keys
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM operators WHERE auth_user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM operators WHERE auth_user_id = auth.uid() AND role = 'admin'));

-- SETTINGS: autenticados leem; admin escreve
CREATE POLICY "settings_read" ON settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "settings_write" ON settings
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ============================================
-- 4. FUNÇÕES AUXILIARES
-- ============================================

-- Desativa operador (se tiver histórico) ou deleta (se não tiver)
CREATE OR REPLACE FUNCTION delete_or_deactivate_operator(p_operator_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  has_history BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM vouchers WHERE operator_id = p_operator_id
  ) INTO has_history;

  IF has_history THEN
    UPDATE operators SET is_active = false WHERE id = p_operator_id;
  ELSE
    DELETE FROM operators WHERE id = p_operator_id;
  END IF;
END;
$$;

-- Reativa operador desativado
CREATE OR REPLACE FUNCTION reactivate_operator(p_operator_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE operators SET is_active = true WHERE id = p_operator_id;
END;
$$;

-- ============================================
-- 5. CONFIGURAÇÕES INICIAIS PADRÃO
-- ============================================

INSERT INTO settings (key, value) VALUES
  ('sidebar_name', 'CATHEDRAL'),
  ('sidebar_color', '#1a1a2e'),
  ('sidebar_name_color', '#e2b04a'),
  ('sidebar_menu_color', 'rgba(255,255,255,0.65)'),
  ('sidebar_font', '''Segoe UI'', Arial, sans-serif'),
  ('app_title', 'Cathedral Vouchers'),
  ('voucher_prefix', 'CATH'),
  ('establishment_name', 'Cathedral Sports Bar'),
  ('voucher_template', 'classico'),
  ('voucher_footer_text', 'Apresente este voucher ao operador de caixa para efetuar o desconto'),
  ('operator_can_generate', 'false')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- 6. CRIAR O ADMINISTRADOR INICIAL
-- ============================================
-- Após rodar este SQL:
-- 1. Vá em Authentication > Users > Add User
-- 2. Informe o email e senha do admin
-- 3. Copie o UUID gerado
-- 4. Rode o INSERT abaixo substituindo os valores:

-- INSERT INTO operators (auth_user_id, name, email, role, is_master)
-- VALUES (
--   'COLE-AQUI-O-UUID-DO-AUTH',
--   'Nome do Admin',
--   'email@dominio.com',
--   'admin',
--   true
-- );

-- ============================================
-- 7. SUPABASE STORAGE — BUCKET BRANDING
-- ============================================
-- Após rodar o SQL, configure o bucket manualmente:
-- 1. Vá em Storage > New bucket
-- 2. Nome: branding
-- 3. Marque: Public bucket
-- 4. Clique em Save
--
-- O bucket armazenará:
-- - logo       (logo do estabelecimento nos vouchers)
-- - icon-192.png  (ícone PWA 192x192)
-- - icon-512.png  (ícone PWA 512x512)
-- - favicon.png   (ícone da aba do navegador)
--
-- Os ícones são gerados automaticamente pelo Painel Dev > Ícones do App

-- ============================================
-- FIM DO SETUP
-- ============================================
