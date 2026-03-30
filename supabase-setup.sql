-- ============================================
-- CATHEDRAL VOUCHER SYSTEM — Setup do Banco
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- 1. Locais / Unidades do bar
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Operadores (vinculados ao auth do Supabase)
CREATE TABLE operators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('admin', 'operator')),
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Clientes (quem comprou os vouchers)
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'PIX',
  pix_account TEXT,
  purchase_date TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Vouchers
CREATE TABLE vouchers (
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

-- Índices para performance
CREATE INDEX idx_vouchers_code ON vouchers(code);
CREATE INDEX idx_vouchers_client ON vouchers(client_id);
CREATE INDEX idx_vouchers_is_used ON vouchers(is_used);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;

-- Locations: qualquer autenticado pode ler; só admin escreve
CREATE POLICY "locations_read" ON locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "locations_write" ON locations FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM operators WHERE auth_user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM operators WHERE auth_user_id = auth.uid() AND role = 'admin'));

-- Operators: qualquer autenticado pode ler o próprio; admin vê todos
CREATE POLICY "operators_read_own" ON operators FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid() OR
         EXISTS (SELECT 1 FROM operators o WHERE o.auth_user_id = auth.uid() AND o.role = 'admin'));
CREATE POLICY "operators_write_admin" ON operators FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM operators WHERE auth_user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM operators WHERE auth_user_id = auth.uid() AND role = 'admin'));

-- Clients: autenticados leem; admin escreve
CREATE POLICY "clients_read" ON clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "clients_write_admin" ON clients FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM operators WHERE auth_user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM operators WHERE auth_user_id = auth.uid() AND role = 'admin'));

-- Vouchers: autenticados leem; admin insere; operador atualiza (validar)
CREATE POLICY "vouchers_read" ON vouchers FOR SELECT TO authenticated USING (true);
CREATE POLICY "vouchers_insert_admin" ON vouchers FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM operators WHERE auth_user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "vouchers_update_operator" ON vouchers FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

-- ============================================
-- FUNÇÃO: criar operador (admin only)
-- Chame via supabase.functions.invoke ou direto
-- ============================================
CREATE OR REPLACE FUNCTION create_operator(
  p_name TEXT,
  p_email TEXT,
  p_password TEXT,
  p_location_id UUID DEFAULT NULL,
  p_role TEXT DEFAULT 'operator'
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Verifica se quem chama é admin
  IF NOT EXISTS (SELECT 1 FROM operators WHERE auth_user_id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem criar operadores.';
  END IF;

  -- Cria o usuário no auth do Supabase
  INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  )
  VALUES (
    gen_random_uuid(),
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(), now()
  )
  RETURNING id INTO new_user_id;

  -- Cria o registro do operador
  INSERT INTO operators (auth_user_id, name, email, role, location_id)
  VALUES (new_user_id, p_name, p_email, p_role, p_location_id);

  RETURN json_build_object('success', true, 'user_id', new_user_id);
END;
$$;

-- ============================================
-- DADOS INICIAIS
-- Crie o admin APÓS rodar este SQL:
-- Vá em Authentication > Users > Add User
-- Email: seu email, senha: sua senha
-- Depois rode o INSERT abaixo com o UUID gerado:
-- ============================================

-- INSERT INTO operators (auth_user_id, name, email, role)
-- VALUES ('COLE_AQUI_O_UUID_DO_AUTH', 'Guilherme', 'seu@email.com', 'admin');

-- Exemplo de local inicial:
-- INSERT INTO locations (name) VALUES ('Cathedral Centro');
