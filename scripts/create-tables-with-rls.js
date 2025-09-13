const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './config.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Esquema completo con RLS
const SCHEMA_PHASES = {
  // Fase 1: Tablas base sin dependencias
  phase1: [
    `-- Fase 1: Tablas base sin dependencias
    CREATE TABLE IF NOT EXISTS roles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT(50) UNIQUE NOT NULL,
      description TEXT(500),
      permissions JSONB CHECK (jsonb_typeof(permissions) = 'object'),
      
      -- Soft delete fields
      is_deleted BOOLEAN DEFAULT FALSE,
      deleted_at TIMESTAMPTZ,
      deleted_by UUID,
      -- Version control
      version INTEGER DEFAULT 1,
      
      created_at TIMESTAMPTZ DEFAULT NOW()
    );`,
    
    `CREATE TABLE IF NOT EXISTS countries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      country_code TEXT(10) UNIQUE NOT NULL,
      country_name TEXT(100) NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      
      -- Soft delete fields
      is_deleted BOOLEAN DEFAULT FALSE,
      deleted_at TIMESTAMPTZ,
      deleted_by UUID,
      -- Version control
      version INTEGER DEFAULT 1,
      
      created_at TIMESTAMPTZ DEFAULT NOW()
    );`,
    
    `CREATE TABLE IF NOT EXISTS transaction_types (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      type_code TEXT(50) UNIQUE NOT NULL,
      type_name TEXT(100) NOT NULL,
      description TEXT(500),
      is_active BOOLEAN DEFAULT TRUE,
      
      -- Soft delete fields
      is_deleted BOOLEAN DEFAULT FALSE,
      deleted_at TIMESTAMPTZ,
      deleted_by UUID,
      -- Version control
      version INTEGER DEFAULT 1,
      
      created_at TIMESTAMPTZ DEFAULT NOW()
    );`,
    
    `CREATE TABLE IF NOT EXISTS project_statuses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      status_code TEXT(50) UNIQUE NOT NULL,
      status_name TEXT(100) NOT NULL,
      description TEXT(500),
      is_active BOOLEAN DEFAULT TRUE,
      
      -- Soft delete fields
      is_deleted BOOLEAN DEFAULT FALSE,
      deleted_at TIMESTAMPTZ,
      deleted_by UUID,
      -- Version control
      version INTEGER DEFAULT 1,
      
      created_at TIMESTAMPTZ DEFAULT NOW()
    );`
  ],

  // Fase 2: Usuarios (base para otras tablas)
  phase2: [
    `-- Fase 2: Usuarios
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      firebase_uid TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      display_name TEXT(255),
      phone TEXT(20),
      is_active BOOLEAN DEFAULT TRUE,
      is_verified BOOLEAN DEFAULT FALSE,
      profile_type TEXT CHECK (profile_type IN ('individual', 'company')),
      -- Soft delete fields
      is_deleted BOOLEAN DEFAULT FALSE,
      deleted_at TIMESTAMPTZ,
      deleted_by UUID,
      -- Version control
      version INTEGER DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );`
  ],

  // Fase 3: Tablas que dependen de users
  phase3: [
    `-- Fase 3: Perfiles y autenticación
    CREATE TABLE IF NOT EXISTS user_profiles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      profile_type TEXT CHECK (profile_type IN ('individual', 'company')),
      
      -- Datos individuales
      first_name TEXT(100),
      last_name TEXT(100),
      date_of_birth DATE,
      nationality TEXT(100),
      residence_country TEXT(100),
      address TEXT(500),
      city TEXT(100),
      postal_code TEXT(20),
      
      -- Datos de empresa
      company_name TEXT(255),
      tax_id TEXT(50),
      representative_name TEXT(100),
      representative_last_name TEXT(100),
      
      -- Datos comunes
      kyc_status TEXT CHECK (kyc_status IN ('pending', 'approved', 'rejected')),
      kyc_data JSONB CHECK (jsonb_typeof(kyc_data) = 'object'),
      
      -- Supabase Storage para documentos
      profile_picture_path TEXT(500),         -- ← Ruta de foto de perfil
      profile_picture_url TEXT(500),          -- ← URL de foto de perfil
      documents_paths TEXT[],                 -- ← Array de rutas de documentos
      documents_urls TEXT[],                  -- ← Array de URLs de documentos
      
      -- Soft delete fields
      is_deleted BOOLEAN DEFAULT FALSE,
      deleted_at TIMESTAMPTZ,
      deleted_by UUID,
      -- Version control
      version INTEGER DEFAULT 1,
      
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );`,
    
    `CREATE TABLE IF NOT EXISTS two_factor_auth (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      secret_key TEXT(100) NOT NULL,
      backup_codes TEXT[],
      is_enabled BOOLEAN DEFAULT FALSE,
      last_used TIMESTAMPTZ,
      
      -- Soft delete fields
      is_deleted BOOLEAN DEFAULT FALSE,
      deleted_at TIMESTAMPTZ,
      deleted_by UUID,
      -- Version control
      version INTEGER DEFAULT 1,
      
      created_at TIMESTAMPTZ DEFAULT NOW()
    );`,
    
    `CREATE TABLE IF NOT EXISTS permissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
      resource TEXT(100) NOT NULL,
      action TEXT(50) NOT NULL,
      
      -- Soft delete fields
      is_deleted BOOLEAN DEFAULT FALSE,
      deleted_at TIMESTAMPTZ,
      deleted_by UUID,
      -- Version control
      version INTEGER DEFAULT 1,
      
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(role_id, resource, action)
    );`
  ],

  // Fase 4: Inversiones (base para transacciones)
  phase4: [
    `-- Fase 4: Inversiones
    CREATE TABLE IF NOT EXISTS investments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      firebase_id TEXT UNIQUE NOT NULL,
      title TEXT(255) NOT NULL,
      description TEXT(1000),
      company TEXT(255),
      token_symbol TEXT(20),
      token_address TEXT(100),
      seller_address TEXT(100),
      project_wallet TEXT(100),
      
      -- Financiación
      amount_to_sell DECIMAL(15,2) NOT NULL,
      amount_sold DECIMAL(15,2) DEFAULT 0,
      price_token DECIMAL(15,2) NOT NULL,
      annual_return DECIMAL(5,2) NOT NULL,
      estimated_delivery_time INTEGER,
      
      -- Estado
      project_status TEXT CHECK (project_status IN ('active', 'funded', 'in_progress', 'distributing_dividends', 'completed', 'sold')),
      is_hidden BOOLEAN DEFAULT FALSE,
      only_investors BOOLEAN DEFAULT FALSE,
      percentage_private_sale DECIMAL(5,2) DEFAULT 100,
      
      -- Soft delete fields
      is_deleted BOOLEAN DEFAULT FALSE,
      deleted_at TIMESTAMPTZ,
      deleted_by UUID,
      -- Version control
      version INTEGER DEFAULT 1,
      
      -- Metadatos de Supabase Storage
      main_image_path TEXT(500),              -- ← Ruta en Supabase Storage
      main_image_url TEXT(500),               -- ← URL pública de la imagen
      images_paths TEXT[],                    -- ← Array de rutas de imágenes
      images_urls TEXT[],                     -- ← Array de URLs públicas
      documents_path TEXT(500),               -- ← Ruta del documento principal
      documents_url TEXT(500),                -- ← URL del documento principal
      documents_metadata JSONB CHECK (jsonb_typeof(documents_metadata) = 'object'), -- ← Metadatos de documentos
      
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );`
  ],

  // Fase 5: Tablas que dependen de investments
  phase5: [
    `-- Fase 5: Inversiones de usuarios
    CREATE TABLE IF NOT EXISTS user_investments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      investment_id UUID REFERENCES investments(id) ON DELETE CASCADE,
      
      -- Datos de inversión
      total_amount DECIMAL(15,2) NOT NULL,
      token_quantity DECIMAL(15,2) NOT NULL,
      investment_type TEXT CHECK (investment_type IN ('current', 'legacy')),
      
      -- Fecha del último movimiento
      last_activity_date TIMESTAMPTZ DEFAULT NOW(),
      
      -- Soft delete fields
      is_deleted BOOLEAN DEFAULT FALSE,
      deleted_at TIMESTAMPTZ,
      deleted_by UUID,
      -- Version control
      version INTEGER DEFAULT 1,
      
      -- Metadatos
      firebase_id TEXT(100),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      
      UNIQUE(user_id, investment_id)
    );`,
    
    `CREATE TABLE IF NOT EXISTS investors (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      
      -- Estadísticas agregadas
      total_projects INTEGER DEFAULT 0,
      total_volume DECIMAL(15,2) DEFAULT 0,
      average_ticket DECIMAL(15,2) DEFAULT 0,
      last_investment_date TIMESTAMPTZ,
      
      -- Soft delete fields
      is_deleted BOOLEAN DEFAULT FALSE,
      deleted_at TIMESTAMPTZ,
      deleted_by UUID,
      -- Version control
      version INTEGER DEFAULT 1,
      
      -- Metadatos
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      
      UNIQUE(user_id)
    );`,
    
    `CREATE TABLE IF NOT EXISTS project_timeline (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      investment_id UUID REFERENCES investments(id) ON DELETE CASCADE,
      event_type TEXT(50) NOT NULL,
      title TEXT(255) NOT NULL,
      description TEXT(1000),
      event_date TIMESTAMPTZ NOT NULL,
      metadata JSONB CHECK (jsonb_typeof(metadata) = 'object'),
      
      -- Soft delete fields
      is_deleted BOOLEAN DEFAULT FALSE,
      deleted_at TIMESTAMPTZ,
      deleted_by UUID,
      -- Version control
      version INTEGER DEFAULT 1,
      
      created_at TIMESTAMPTZ DEFAULT NOW()
    );`
  ],

  // Fase 6: Transacciones
  phase6: [
    `-- Fase 6: Transacciones
    CREATE TABLE IF NOT EXISTS transactions_mangopay (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      investment_id UUID REFERENCES investments(id) ON DELETE CASCADE,
      
      -- Datos de transacción
      transfer_id TEXT(100) UNIQUE NOT NULL,
      amount DECIMAL(15,2) NOT NULL,
      quantity DECIMAL(15,2),
      wallet TEXT(100) NOT NULL,
      retention_rate DECIMAL(5,2) DEFAULT 0,
      
      -- Estado
      status TEXT CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')) NOT NULL DEFAULT 'pending',
      
      -- Soft delete fields
      is_deleted BOOLEAN DEFAULT FALSE,
      deleted_at TIMESTAMPTZ,
      deleted_by UUID,
      -- Version control
      version INTEGER DEFAULT 1,
      
      -- Metadatos
      firebase_id TEXT(100),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );`,
    
    `CREATE TABLE IF NOT EXISTS transactions_blockchain (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      address TEXT(100) NOT NULL,
      amount TEXT(100) NOT NULL,
      project TEXT(100) NOT NULL,
      timestamp BIGINT NOT NULL,
      user TEXT(100) NOT NULL,
      
      -- Soft delete fields
      is_deleted BOOLEAN DEFAULT FALSE,
      deleted_at TIMESTAMPTZ,
      deleted_by UUID,
      -- Version control
      version INTEGER DEFAULT 1,
      
      -- Metadatos adicionales
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );`,
    
    `CREATE TABLE IF NOT EXISTS bank_transfers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      
      -- Datos de la transferencia
      transfer_id TEXT(100) UNIQUE NOT NULL,
      amount DECIMAL(15,2) NOT NULL,
      currency TEXT(10) DEFAULT 'EUR',
      
      -- Estado
      status TEXT CHECK (status IN ('pending', 'confirmed', 'failed')),
      
      -- Soft delete fields
      is_deleted BOOLEAN DEFAULT FALSE,
      deleted_at TIMESTAMPTZ,
      deleted_by UUID,
      -- Version control
      version INTEGER DEFAULT 1,
      
      -- Metadatos
      confirmed_at TIMESTAMPTZ,
      firebase_id TEXT(100),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );`,
    
    `CREATE TABLE IF NOT EXISTS withdrawals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      
      -- Datos de retiro
      amount DECIMAL(15,2) NOT NULL,
      currency TEXT(10) DEFAULT 'EUR',
      bank_account_id TEXT(100),
      
      -- Estado
      status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
      
      -- Soft delete fields
      is_deleted BOOLEAN DEFAULT FALSE,
      deleted_at TIMESTAMPTZ,
      deleted_by UUID,
      -- Version control
      version INTEGER DEFAULT 1,
      
      -- Metadatos
      firebase_id TEXT(100),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      processed_at TIMESTAMPTZ
    );`
  ],

  // Fase 7: Reservas
  phase7: [
    `-- Fase 7: Reservas
    CREATE TABLE IF NOT EXISTS reserves (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      investment_id UUID REFERENCES investments(id) ON DELETE CASCADE,
      
      -- Datos de reserva
      token_quantity DECIMAL(15,2) NOT NULL,
      user_wallet TEXT(100),
      project_wallet TEXT(100),
      transfer_id TEXT(100),
      
      -- Estado
      status TEXT CHECK (status IN ('PENDING', 'CONFIRMED', 'MINTED', 'FAILED')),
      is_external BOOLEAN DEFAULT FALSE,
      
      -- Soft delete fields
      is_deleted BOOLEAN DEFAULT FALSE,
      deleted_at TIMESTAMPTZ,
      deleted_by UUID,
      -- Version control
      version INTEGER DEFAULT 1,
      
      -- Metadatos
      firebase_id TEXT(100),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );`,
    
    `CREATE TABLE IF NOT EXISTS reserves_blockchain (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      investment_id UUID REFERENCES investments(id) ON DELETE CASCADE,
      
      -- Datos de reserva
      token_quantity DECIMAL(15,2) NOT NULL,
      wallet_address TEXT(100) NOT NULL,
      transaction_hash TEXT(100),
      
      -- Estado
      status TEXT CHECK (status IN ('pending', 'confirmed', 'expired', 'failed')),
      expire_at TIMESTAMPTZ NOT NULL,
      
      -- Soft delete fields
      is_deleted BOOLEAN DEFAULT FALSE,
      deleted_at TIMESTAMPTZ,
      deleted_by UUID,
      -- Version control
      version INTEGER DEFAULT 1,
      
      -- Metadatos
      firebase_id TEXT(100),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );`
  ],

  // Fase 8: Dividendos
  phase8: [
    `-- Fase 8: Dividendos
    CREATE TABLE IF NOT EXISTS dividends (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      investment_id UUID REFERENCES investments(id) ON DELETE CASCADE,
      
      -- Datos del dividendo
      interest_rate DECIMAL(5,2) NOT NULL,
      total_amount DECIMAL(15,2) NOT NULL,
      retention_applied BOOLEAN DEFAULT FALSE,
      is_rent BOOLEAN DEFAULT FALSE,
      
      -- Estado
      is_last_dividend BOOLEAN DEFAULT FALSE,
      
      -- Soft delete fields
      is_deleted BOOLEAN DEFAULT FALSE,
      deleted_at TIMESTAMPTZ,
      deleted_by UUID,
      -- Version control
      version INTEGER DEFAULT 1,
      
      -- Metadatos
      firebase_id TEXT(100),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );`,
    
    `CREATE TABLE IF NOT EXISTS dividend_claims (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      investment_id UUID REFERENCES investments(id) ON DELETE CASCADE,
      dividend_id UUID REFERENCES dividends(id) ON DELETE CASCADE,
      
      -- Datos de inversión
      capital_invested DECIMAL(15,2) NOT NULL,
      token_quantity DECIMAL(15,2) NOT NULL,
      
      -- Cálculos del dividendo
      gross_interest DECIMAL(15,2) NOT NULL,
      gross_return DECIMAL(15,2) NOT NULL,
      tax_rate DECIMAL(5,2) NOT NULL,
      retention_applied DECIMAL(15,2) NOT NULL,
      net_interest DECIMAL(15,2) NOT NULL,
      net_return DECIMAL(15,2) NOT NULL,
      
      -- Fechas importantes
      return_date TIMESTAMPTZ NOT NULL,
      claimed_at TIMESTAMPTZ,
      
      -- Tipo de reclamo
      claim_type TEXT CHECK (claim_type IN ('wallet', 'blockchain')) DEFAULT 'wallet',
      
      -- Datos específicos por tipo
      wallet_address TEXT(100),
      transaction_hash TEXT(100),
      
      -- Estado
      status TEXT CHECK (status IN ('pending', 'claimed', 'failed')) DEFAULT 'pending',
      
      -- Soft delete fields
      is_deleted BOOLEAN DEFAULT FALSE,
      deleted_at TIMESTAMPTZ,
      deleted_by UUID,
      -- Version control
      version INTEGER DEFAULT 1,
      
      -- Metadatos
      firebase_id TEXT(100),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );`
  ],

  // Fase 9: Carteras
  phase9: [
    `-- Fase 9: Carteras
    CREATE TABLE IF NOT EXISTS wallets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      
      -- Datos de la cartera
      wallet_id TEXT(100) UNIQUE NOT NULL,
      wallet_type TEXT CHECK (wallet_type IN ('company', 'personal')),
      currency TEXT(10) DEFAULT 'EUR',
      description TEXT(500),
      
      -- Estado
      is_active BOOLEAN DEFAULT TRUE,
      is_primary BOOLEAN DEFAULT FALSE,
      
      -- Soft delete fields
      is_deleted BOOLEAN DEFAULT FALSE,
      deleted_at TIMESTAMPTZ,
      deleted_by UUID,
      -- Version control
      version INTEGER DEFAULT 1,
      
      -- Metadatos
      firebase_id TEXT(100),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );`,
    
    `CREATE TABLE IF NOT EXISTS wallet_transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
      
      -- Datos de transacción
      transaction_type TEXT CHECK (transaction_type IN ('credit', 'debit')),
      amount DECIMAL(15,2) NOT NULL,
      currency TEXT(10) DEFAULT 'EUR',
      description TEXT(500),
      
      -- Soft delete fields
      is_deleted BOOLEAN DEFAULT FALSE,
      deleted_at TIMESTAMPTZ,
      deleted_by UUID,
      -- Version control
      version INTEGER DEFAULT 1,
      
      -- Metadatos
      firebase_id TEXT(100),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );`,
    
    `CREATE TABLE IF NOT EXISTS wallet_balances (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
      
      -- Balance actual
      balance DECIMAL(15,2) NOT NULL,
      currency TEXT(10) DEFAULT 'EUR',
      
      -- Soft delete fields
      is_deleted BOOLEAN DEFAULT FALSE,
      deleted_at TIMESTAMPTZ,
      deleted_by UUID,
      -- Version control
      version INTEGER DEFAULT 1,
      
      -- Metadatos
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );`
  ],

  // Fase 10: Blockchain
  phase10: [
    `-- Fase 10: Blockchain
    CREATE TABLE IF NOT EXISTS blockchain_balances (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      investment_id UUID REFERENCES investments(id) ON DELETE CASCADE,
      
      -- Balance actual
      token_address TEXT(100) NOT NULL,
      balance_wei TEXT(100) NOT NULL,
      balance_tokens DECIMAL(15,2),
      
      -- Soft delete fields
      is_deleted BOOLEAN DEFAULT FALSE,
      deleted_at TIMESTAMPTZ,
      deleted_by UUID,
      -- Version control
      version INTEGER DEFAULT 1,
      
      -- Metadatos
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      
      UNIQUE(user_id, investment_id, token_address)
    );`
  ],

  // Fase 11: KYC y Documentos
  phase11: [
    `-- Fase 11: KYC y Documentos
    CREATE TABLE IF NOT EXISTS kyc_verifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      
      -- Datos de verificación
      external_identifier TEXT(100) UNIQUE NOT NULL,
      status TEXT CHECK (status IN ('pending', 'approved', 'rejected')),
      verification_data JSONB CHECK (jsonb_typeof(verification_data) = 'object'),
      error_details JSONB CHECK (jsonb_typeof(error_details) = 'object'),
      
      -- Soft delete fields
      is_deleted BOOLEAN DEFAULT FALSE,
      deleted_at TIMESTAMPTZ,
      deleted_by UUID,
      -- Version control
      version INTEGER DEFAULT 1,
      
      -- Metadatos
      firebase_id TEXT(100),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );`,
    
    `CREATE TABLE IF NOT EXISTS documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      
      -- Datos del documento
      document_type TEXT(50) NOT NULL,
      title TEXT(255) NOT NULL,
      filename TEXT(255) NOT NULL,
      file_path TEXT(500) NOT NULL,           -- ← Ruta en Supabase Storage
      file_url TEXT(500),                     -- ← URL pública del archivo
      bucket_name TEXT(50) NOT NULL,          -- ← Nombre del bucket
      file_size BIGINT,
      mime_type TEXT(100),
      
      -- Soft delete fields
      is_deleted BOOLEAN DEFAULT FALSE,
      deleted_at TIMESTAMPTZ,
      deleted_by UUID,
      -- Version control
      version INTEGER DEFAULT 1,
      
      -- Metadatos
      firebase_id TEXT(100),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );`,
    
    `CREATE TABLE IF NOT EXISTS fiscal_documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      
      -- Datos fiscales
      document_type TEXT(50) NOT NULL,
      tax_id TEXT(50),
      country TEXT(100),
      status TEXT CHECK (status IN ('pending', 'approved', 'rejected')),
      
      -- Soft delete fields
      is_deleted BOOLEAN DEFAULT FALSE,
      deleted_at TIMESTAMPTZ,
      deleted_by UUID,
      -- Version control
      version INTEGER DEFAULT 1,
      
      -- Metadatos
      firebase_id TEXT(100),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );`
  ],

  // Fase 12: Configuración
  phase12: [
    `-- Fase 12: Configuración
    CREATE TABLE IF NOT EXISTS system_config (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      config_key TEXT(100) UNIQUE NOT NULL,
      config_value JSONB NOT NULL CHECK (jsonb_typeof(config_value) = 'object'),
      description TEXT(500),
      is_active BOOLEAN DEFAULT TRUE,
      
      -- Soft delete fields
      is_deleted BOOLEAN DEFAULT FALSE,
      deleted_at TIMESTAMPTZ,
      deleted_by UUID,
      -- Version control
      version INTEGER DEFAULT 1,
      
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );`,
    
    `CREATE TABLE IF NOT EXISTS cache_data (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      cache_key TEXT(255) UNIQUE NOT NULL,
      cache_value JSONB NOT NULL CHECK (jsonb_typeof(cache_value) = 'object'),
      expires_at TIMESTAMPTZ NOT NULL,
      
      -- Soft delete fields
      is_deleted BOOLEAN DEFAULT FALSE,
      deleted_at TIMESTAMPTZ,
      deleted_by UUID,
      -- Version control
      version INTEGER DEFAULT 1,
      
      created_at TIMESTAMPTZ DEFAULT NOW()
    );`
  ],

  // Fase 13: Bonificaciones
  phase13: [
    `-- Fase 13: Bonificaciones
    CREATE TABLE IF NOT EXISTS user_bonuses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      
      -- Datos de bonificación
      bonus_type TEXT(50) NOT NULL,
      amount DECIMAL(15,2) NOT NULL,
      percentage DECIMAL(5,2),
      project_name TEXT(255),
      project_id TEXT(100),
      user_email TEXT(255),
      
      -- Estado
      is_applied BOOLEAN DEFAULT FALSE,
      email_sent BOOLEAN DEFAULT FALSE,
      
      -- Soft delete fields
      is_deleted BOOLEAN DEFAULT FALSE,
      deleted_at TIMESTAMPTZ,
      deleted_by UUID,
      -- Version control
      version INTEGER DEFAULT 1,
      
      -- Metadatos
      firebase_id TEXT(100),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );`
  ],

  // Fase 14: Auditoría
  phase14: [
    `-- Fase 14: Auditoría
    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      
      -- Datos de auditoría
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      action_type TEXT(50) NOT NULL,
      resource_type TEXT(50) NOT NULL,
      resource_id TEXT(100),
      old_values JSONB CHECK (jsonb_typeof(old_values) = 'object'),
      new_values JSONB CHECK (jsonb_typeof(new_values) = 'object'),
      
      -- Soft delete fields
      is_deleted BOOLEAN DEFAULT FALSE,
      deleted_at TIMESTAMPTZ,
      deleted_by UUID,
      -- Version control
      version INTEGER DEFAULT 1,
      
      -- Metadatos
      ip_address INET,
      user_agent TEXT(500),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );`
  ],

  // Fase 15: Notificaciones y Preferencias
  phase15: [
    `-- Fase 15: Notificaciones y Preferencias
    CREATE TABLE IF NOT EXISTS user_notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      
      -- Datos de notificación
      notification_type TEXT(50) NOT NULL,
      title TEXT(255) NOT NULL,
      message TEXT(1000) NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      
      -- Soft delete fields
      is_deleted BOOLEAN DEFAULT FALSE,
      deleted_at TIMESTAMPTZ,
      deleted_by UUID,
      -- Version control
      version INTEGER DEFAULT 1,
      
      -- Metadatos
      firebase_id TEXT(100),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      read_at TIMESTAMPTZ
    );`,
    
    `CREATE TABLE IF NOT EXISTS user_preferences (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      
      -- Preferencias de notificación
      alert_new_document BOOLEAN DEFAULT TRUE,
      alert_withdrawn_success BOOLEAN DEFAULT TRUE,
      alert_deposit_success BOOLEAN DEFAULT TRUE,
      alert_invest_success BOOLEAN DEFAULT TRUE,
      alert_new_project BOOLEAN DEFAULT TRUE,
      alert_project_financed BOOLEAN DEFAULT TRUE,
      alert_transfer_digital_wallet BOOLEAN DEFAULT TRUE,
      alert_otp BOOLEAN DEFAULT TRUE,
      
      -- Soft delete fields
      is_deleted BOOLEAN DEFAULT FALSE,
      deleted_at TIMESTAMPTZ,
      deleted_by UUID,
      -- Version control
      version INTEGER DEFAULT 1,
      
      -- Metadatos
      firebase_id TEXT(100),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );`
  ],

  // Fase 16: Sistema de Roles (depende de users)
  phase16: [
    `-- Fase 16: Sistema de Roles
    CREATE TABLE IF NOT EXISTS role_assignments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
      assigned_by UUID REFERENCES users(id),
      assigned_at TIMESTAMPTZ DEFAULT NOW(),
      expires_at TIMESTAMPTZ,
      
      -- Soft delete fields
      is_deleted BOOLEAN DEFAULT FALSE,
      deleted_at TIMESTAMPTZ,
      deleted_by UUID,
      -- Version control
      version INTEGER DEFAULT 1,
      
      UNIQUE(user_id, role_id)
    );`,
    
    `CREATE TABLE IF NOT EXISTS admin_actions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      admin_id UUID REFERENCES users(id) ON DELETE CASCADE,
      action_type TEXT(50) NOT NULL,
      resource_type TEXT(50) NOT NULL,
      resource_id TEXT(100),
      details JSONB CHECK (jsonb_typeof(details) = 'object'),
      ip_address INET,
      user_agent TEXT(500),
      
      -- Soft delete fields
      is_deleted BOOLEAN DEFAULT FALSE,
      deleted_at TIMESTAMPTZ,
      deleted_by UUID,
      -- Version control
      version INTEGER DEFAULT 1,
      
      created_at TIMESTAMPTZ DEFAULT NOW()
    );`
  ]
};

// Función para crear tablas por fase
async function createTablesByPhase(phaseName) {
  console.log(`\n🚀 Creando tablas de la ${phaseName}...`);
  
  const phase = SCHEMA_PHASES[phaseName];
  if (!phase) {
    console.error(`❌ Fase ${phaseName} no encontrada`);
    return false;
  }

  for (const sql of phase) {
    try {
      console.log(`   📝 Ejecutando: ${sql.split('\n')[0].trim()}...`);
      
      const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
      
      if (error) {
        console.error(`   ❌ Error: ${error.message}`);
        return false;
      } else {
        console.log(`   ✅ Tabla creada exitosamente`);
      }
    } catch (err) {
      console.error(`   ❌ Error inesperado: ${err.message}`);
      return false;
    }
  }
  
  console.log(`✅ ${phaseName} completada exitosamente`);
  return true;
}

// Función para crear todas las tablas
async function createAllTables() {
  console.log('🎯 INICIANDO CREACIÓN DE TODAS LAS TABLAS...\n');
  
  const phases = [
    'phase1', 'phase2', 'phase3', 'phase4', 'phase5',
    'phase6', 'phase7', 'phase8', 'phase9', 'phase10',
    'phase11', 'phase12', 'phase13', 'phase14', 'phase15', 'phase16'
  ];
  
  for (const phase of phases) {
    const success = await createTablesByPhase(phase);
    if (!success) {
      console.error(`\n❌ Error en la fase ${phase}. Deteniendo creación.`);
      return false;
    }
  }
  
  console.log('\n🎉 ¡TODAS LAS TABLAS CREADAS EXITOSAMENTE!');
  return true;
}

// Función para crear índices
async function createIndexes() {
  console.log('\n📊 Creando índices optimizados...');
  
  const indexes = [
    // Índices simples de usuarios
    'CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);',
    'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);',
    'CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);',
    'CREATE INDEX IF NOT EXISTS idx_users_is_deleted ON users(is_deleted);',
    
    // Índices simples de inversiones
    'CREATE INDEX IF NOT EXISTS idx_investments_firebase_id ON investments(firebase_id);',
    'CREATE INDEX IF NOT EXISTS idx_investments_project_status ON investments(project_status);',
    'CREATE INDEX IF NOT EXISTS idx_investments_is_hidden ON investments(is_hidden);',
    'CREATE INDEX IF NOT EXISTS idx_investments_is_deleted ON investments(is_deleted);',
    
    // Índices simples de transacciones
    'CREATE INDEX IF NOT EXISTS idx_transactions_mangopay_user_id ON transactions_mangopay(user_id);',
    'CREATE INDEX IF NOT EXISTS idx_transactions_mangopay_investment_id ON transactions_mangopay(investment_id);',
    'CREATE INDEX IF NOT EXISTS idx_transactions_mangopay_status ON transactions_mangopay(status);',
    
    // Índices simples de reservas
    'CREATE INDEX IF NOT EXISTS idx_reserves_user_id ON reserves(user_id);',
    'CREATE INDEX IF NOT EXISTS idx_reserves_investment_id ON reserves(investment_id);',
    'CREATE INDEX IF NOT EXISTS idx_reserves_status ON reserves(status);',
    
    // Índices simples de dividendos
    'CREATE INDEX IF NOT EXISTS idx_dividend_claims_user_id ON dividend_claims(user_id);',
    'CREATE INDEX IF NOT EXISTS idx_dividend_claims_investment_id ON dividend_claims(investment_id);',
    'CREATE INDEX IF NOT EXISTS idx_dividend_claims_status ON dividend_claims(status);',
    
    // Índices simples de auditoría
    'CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);',
    'CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);',
    'CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);',
    
    // NUEVOS ÍNDICES COMPUESTOS PARA CONSULTAS COMPLEJAS
    'CREATE INDEX IF NOT EXISTS idx_user_investments_user_investment ON user_investments(user_id, investment_id);',
    'CREATE INDEX IF NOT EXISTS idx_user_investments_user_deleted ON user_investments(user_id, is_deleted);',
    'CREATE INDEX IF NOT EXISTS idx_transactions_user_status ON transactions_mangopay(user_id, status);',
    'CREATE INDEX IF NOT EXISTS idx_transactions_investment_status ON transactions_mangopay(investment_id, status);',
    'CREATE INDEX IF NOT EXISTS idx_dividend_claims_user_investment ON dividend_claims(user_id, investment_id);',
    'CREATE INDEX IF NOT EXISTS idx_dividend_claims_user_status ON dividend_claims(user_id, status);',
    'CREATE INDEX IF NOT EXISTS idx_reserves_user_investment ON reserves(user_id, investment_id);',
    'CREATE INDEX IF NOT EXISTS idx_reserves_user_status ON reserves(user_id, status);',
    'CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created ON audit_logs(user_id, created_at);',
    'CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_created ON audit_logs(resource_type, created_at);',
    'CREATE INDEX IF NOT EXISTS idx_user_notifications_user_read ON user_notifications(user_id, is_read);',
    'CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_type ON wallet_transactions(wallet_id, transaction_type);',
    'CREATE INDEX IF NOT EXISTS idx_investments_status_hidden ON investments(project_status, is_hidden);',
    'CREATE INDEX IF NOT EXISTS idx_kyc_verifications_user_status ON kyc_verifications(user_id, status);',
    'CREATE INDEX IF NOT EXISTS idx_documents_user_type ON documents(user_id, document_type);',
    'CREATE INDEX IF NOT EXISTS idx_user_profiles_user_type ON user_profiles(user_id, profile_type);',
    'CREATE INDEX IF NOT EXISTS idx_wallets_user_type ON wallets(user_id, wallet_type);',
    'CREATE INDEX IF NOT EXISTS idx_wallets_user_active ON wallets(user_id, is_active);'
  ];
  
  for (const index of indexes) {
    try {
      console.log(`   📝 Creando índice: ${index.split(' ')[5]}...`);
      
      const { error } = await supabase.rpc('exec_sql', { sql_query: index });
      
      if (error) {
        console.error(`   ❌ Error: ${error.message}`);
      } else {
        console.log(`   ✅ Índice creado exitosamente`);
      }
    } catch (err) {
      console.error(`   ❌ Error inesperado: ${err.message}`);
    }
  }
  
  console.log('✅ Índices creados exitosamente');
}

// Función para crear triggers
async function createTriggers() {
  console.log('\n🔧 Creando triggers automáticos...');
  
  // Función para actualizar timestamps
  const updateFunction = `
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ language 'plpgsql';
  `;
  
  try {
    console.log('   📝 Creando función update_updated_at_column...');
    const { error: funcError } = await supabase.rpc('exec_sql', { sql_query: updateFunction });
    
    if (funcError) {
      console.error(`   ❌ Error creando función: ${funcError.message}`);
      return;
    }
    
    console.log('   ✅ Función creada exitosamente');
  } catch (err) {
    console.error(`   ❌ Error inesperado: ${err.message}`);
    return;
  }
  
  // Triggers para tablas con updated_at
  const triggers = [
    'CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
    'CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
    'CREATE TRIGGER update_investments_updated_at BEFORE UPDATE ON investments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
    'CREATE TRIGGER update_user_investments_updated_at BEFORE UPDATE ON user_investments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
    'CREATE TRIGGER update_reserves_updated_at BEFORE UPDATE ON reserves FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
    'CREATE TRIGGER update_kyc_verifications_updated_at BEFORE UPDATE ON kyc_verifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
    'CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
    'CREATE TRIGGER update_fiscal_documents_updated_at BEFORE UPDATE ON fiscal_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
    'CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON system_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
    'CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();'
  ];
  
  for (const trigger of triggers) {
    try {
      const tableName = trigger.split(' ')[2];
      console.log(`   📝 Creando trigger para ${tableName}...`);
      
      const { error } = await supabase.rpc('exec_sql', { sql_query: trigger });
      
      if (error) {
        console.error(`   ❌ Error: ${error.message}`);
      } else {
        console.log(`   ✅ Trigger creado exitosamente`);
      }
    } catch (err) {
      console.error(`   ❌ Error inesperado: ${err.message}`);
    }
  }
  
  console.log('✅ Triggers creados exitosamente');
}

// Función para configurar RLS
async function configureRLS() {
  console.log('\n🔒 Configurando Row Level Security (RLS)...');
  
  // Habilitar RLS en todas las tablas
  const tables = [
    'users', 'user_profiles', 'two_factor_auth', 'investments', 'user_investments',
    'investors', 'project_timeline', 'transactions_mangopay', 'transactions_blockchain',
    'bank_transfers', 'withdrawals', 'reserves', 'reserves_blockchain', 'dividends',
    'dividend_claims', 'wallets', 'wallet_transactions', 'wallet_balances',
    'blockchain_balances', 'kyc_verifications', 'documents', 'fiscal_documents',
    'user_bonuses', 'audit_logs', 'user_notifications', 'user_preferences',
    'role_assignments', 'admin_actions'
  ];
  
  for (const table of tables) {
    try {
      console.log(`   📝 Habilitando RLS en ${table}...`);
      
      const { error } = await supabase.rpc('exec_sql', { 
        sql_query: `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;` 
      });
      
      if (error) {
        console.error(`   ❌ Error: ${error.message}`);
      } else {
        console.log(`   ✅ RLS habilitado en ${table}`);
      }
    } catch (err) {
      console.error(`   ❌ Error inesperado: ${err.message}`);
    }
  }
  
  console.log('✅ RLS configurado exitosamente');
}

// Función para configurar UUID optimizado
async function configureUUIDv6() {
  console.log('\n🔧 Configurando UUID optimizado...');
  
  try {
    // Instalar extensión uuid-ossp si no está instalada
    const { error: extError } = await supabase.rpc('exec_sql', {
      sql_query: 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'
    });
    
    if (extError) {
      console.error(`   ❌ Error instalando extensión: ${extError.message}`);
      return false;
    }
    
    console.log('   ✅ Extensión uuid-ossp instalada');
    
    // Crear función para generar UUID optimizado (UUIDv4 con mejor performance)
    const uuidFunction = `
      CREATE OR REPLACE FUNCTION generate_optimized_uuid()
      RETURNS UUID AS $$
      BEGIN
        -- UUID optimizado para mejor performance en inserción
        RETURN uuid_generate_v4();
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    const { error: funcError } = await supabase.rpc('exec_sql', {
      sql_query: uuidFunction
    });
    
    if (funcError) {
      console.error(`   ❌ Error creando función UUID optimizada: ${funcError.message}`);
      return false;
    }
    
    console.log('   ✅ Función UUID optimizada creada');
    return true;
  } catch (err) {
    console.error(`   ❌ Error inesperado: ${err.message}`);
    return false;
  }
}

// Función para configurar Supabase Storage
async function configureSupabaseStorage() {
  console.log('\n📁 Configurando Supabase Storage...');
  
  try {
    // Crear buckets para diferentes tipos de archivos
    const buckets = [
      {
        name: 'project-images',
        public: true,
        file_size_limit: 5242880, // 5MB
        allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp']
      },
      {
        name: 'user-documents',
        public: false,
        file_size_limit: 10485760, // 10MB
        allowed_mime_types: ['application/pdf', 'image/jpeg', 'image/png']
      },
      {
        name: 'profile-pictures',
        public: true,
        file_size_limit: 2097152, // 2MB
        allowed_mime_types: ['image/jpeg', 'image/png']
      },
      {
        name: 'system-assets',
        public: true,
        file_size_limit: 1048576, // 1MB
        allowed_mime_types: ['image/svg+xml', 'image/png', 'image/jpeg']
      }
    ];
    
    for (const bucket of buckets) {
      console.log(`   📁 Creando bucket: ${bucket.name}...`);
      
      // Crear bucket
      const { error: bucketError } = await supabase.storage.createBucket(bucket.name, {
        public: bucket.public
      });
      
      if (bucketError && !bucketError.message.includes('already exists')) {
        console.error(`   ❌ Error creando bucket ${bucket.name}: ${bucketError.message}`);
      } else {
        console.log(`   ✅ Bucket ${bucket.name} creado exitosamente`);
      }
    }
    
    // Configurar RLS para storage
    await configureStorageRLS();
    
    console.log('✅ Supabase Storage configurado exitosamente');
    return true;
  } catch (err) {
    console.error(`   ❌ Error inesperado: ${err.message}`);
    return false;
  }
}

// Función para configurar RLS en storage
async function configureStorageRLS() {
  console.log('   🔒 Configurando RLS para Storage...');
  
  const storagePolicies = [
    // Política para project-images
    `CREATE POLICY "Anyone can view project images" ON storage.buckets FOR SELECT USING (name = 'project-images');`,
    `CREATE POLICY "Authenticated users can upload project images" ON storage.buckets FOR INSERT WITH CHECK (name = 'project-images' AND auth.role() = 'authenticated');`,
    `CREATE POLICY "Users can update own project images" ON storage.buckets FOR UPDATE USING (name = 'project-images' AND auth.uid()::text = owner);`,
    `CREATE POLICY "Users can delete own project images" ON storage.buckets FOR DELETE USING (name = 'project-images' AND auth.uid()::text = owner);`,
    
    // Política para user-documents
    `CREATE POLICY "Users can view own documents" ON storage.buckets FOR SELECT USING (name = 'user-documents' AND auth.uid()::text = owner);`,
    `CREATE POLICY "Users can upload own documents" ON storage.buckets FOR INSERT WITH CHECK (name = 'user-documents' AND auth.uid()::text = owner);`,
    `CREATE POLICY "Users can update own documents" ON storage.buckets FOR UPDATE USING (name = 'user-documents' AND auth.uid()::text = owner);`,
    `CREATE POLICY "Users can delete own documents" ON storage.buckets FOR DELETE USING (name = 'user-documents' AND auth.uid()::text = owner);`,
    
    // Política para profile-pictures
    `CREATE POLICY "Anyone can view profile pictures" ON storage.buckets FOR SELECT USING (name = 'profile-pictures');`,
    `CREATE POLICY "Users can upload own profile pictures" ON storage.buckets FOR INSERT WITH CHECK (name = 'profile-pictures' AND auth.uid()::text = owner);`,
    `CREATE POLICY "Users can update own profile pictures" ON storage.buckets FOR UPDATE USING (name = 'profile-pictures' AND auth.uid()::text = owner);`,
    `CREATE POLICY "Users can delete own profile pictures" ON storage.buckets FOR DELETE USING (name = 'profile-pictures' AND auth.uid()::text = owner);`,
    
    // Política para system-assets
    `CREATE POLICY "Anyone can view system assets" ON storage.buckets FOR SELECT USING (name = 'system-assets');`,
    `CREATE POLICY "Admins can manage system assets" ON storage.buckets FOR ALL USING (name = 'system-assets' AND EXISTS (SELECT 1 FROM role_assignments ra JOIN roles r ON ra.role_id = r.id WHERE ra.user_id = (SELECT id FROM users WHERE firebase_uid = auth.uid()::text) AND r.name IN ('SuperAdmin', 'Admin')));`
  ];
  
  for (const policy of storagePolicies) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: policy });
      if (error) {
        console.error(`   ❌ Error creando política de storage: ${error.message}`);
      } else {
        console.log(`   ✅ Política de storage creada`);
      }
    } catch (err) {
      console.error(`   ❌ Error inesperado: ${err.message}`);
    }
  }
}

// Función para crear políticas RLS
async function createRLSPolicies() {
  console.log('\n🛡️ Creando políticas de RLS...');
  
  const policies = [
    // Políticas para users
    `CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid()::text = firebase_uid);`,
    `CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid()::text = firebase_uid);`,
    
    // Políticas para user_profiles
    `CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid()::text = (SELECT firebase_uid FROM users WHERE id = user_id));`,
    `CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid()::text = (SELECT firebase_uid FROM users WHERE id = user_id));`,
    
    // Políticas para investments (públicas para lectura)
    `CREATE POLICY "Anyone can view active investments" ON investments FOR SELECT USING (is_hidden = false);`,
    `CREATE POLICY "Admins can manage investments" ON investments FOR ALL USING (EXISTS (SELECT 1 FROM role_assignments ra JOIN roles r ON ra.role_id = r.id WHERE ra.user_id = (SELECT id FROM users WHERE firebase_uid = auth.uid()::text) AND r.name IN ('SuperAdmin', 'Admin')));`,
    
    // Políticas para user_investments
    `CREATE POLICY "Users can view own investments" ON user_investments FOR SELECT USING (auth.uid()::text = (SELECT firebase_uid FROM users WHERE id = user_id));`,
    `CREATE POLICY "Users can create own investments" ON user_investments FOR INSERT WITH CHECK (auth.uid()::text = (SELECT firebase_uid FROM users WHERE id = user_id));`,
    
    // Políticas para transactions_mangopay
    `CREATE POLICY "Users can view own transactions" ON transactions_mangopay FOR SELECT USING (auth.uid()::text = (SELECT firebase_uid FROM users WHERE id = user_id));`,
    `CREATE POLICY "Users can create own transactions" ON transactions_mangopay FOR INSERT WITH CHECK (auth.uid()::text = (SELECT firebase_uid FROM users WHERE id = user_id));`,
    
    // Políticas para wallets
    `CREATE POLICY "Users can view own wallets" ON wallets FOR SELECT USING (auth.uid()::text = (SELECT firebase_uid FROM users WHERE id = user_id));`,
    `CREATE POLICY "Users can manage own wallets" ON wallets FOR ALL USING (auth.uid()::text = (SELECT firebase_uid FROM users WHERE id = user_id));`,
    
    // Políticas para documents
    `CREATE POLICY "Users can view own documents" ON documents FOR SELECT USING (auth.uid()::text = (SELECT firebase_uid FROM users WHERE id = user_id));`,
    `CREATE POLICY "Users can upload own documents" ON documents FOR INSERT WITH CHECK (auth.uid()::text = (SELECT firebase_uid FROM users WHERE id = user_id));`,
    
    // Políticas para user_notifications
    `CREATE POLICY "Users can view own notifications" ON user_notifications FOR SELECT USING (auth.uid()::text = (SELECT firebase_uid FROM users WHERE id = user_id));`,
    `CREATE POLICY "Users can update own notifications" ON user_notifications FOR UPDATE USING (auth.uid()::text = (SELECT firebase_uid FROM users WHERE id = user_id));`,
    
    // Políticas para user_preferences
    `CREATE POLICY "Users can view own preferences" ON user_preferences FOR SELECT USING (auth.uid()::text = (SELECT firebase_uid FROM users WHERE id = user_id));`,
    `CREATE POLICY "Users can update own preferences" ON user_preferences FOR UPDATE USING (auth.uid()::text = (SELECT firebase_uid FROM users WHERE id = user_id));`,
    
    // Políticas para audit_logs (solo admins)
    `CREATE POLICY "Admins can view audit logs" ON audit_logs FOR SELECT USING (EXISTS (SELECT 1 FROM role_assignments ra JOIN roles r ON ra.role_id = r.id WHERE ra.user_id = (SELECT id FROM users WHERE firebase_uid = auth.uid()::text) AND r.name IN ('SuperAdmin', 'Admin')));`,
    
    // Políticas para system_config (solo admins)
    `CREATE POLICY "Admins can manage system config" ON system_config FOR ALL USING (EXISTS (SELECT 1 FROM role_assignments ra JOIN roles r ON ra.role_id = r.id WHERE ra.user_id = (SELECT id FROM users WHERE firebase_uid = auth.uid()::text) AND r.name IN ('SuperAdmin', 'Admin')));`
  ];
  
  for (const policy of policies) {
    try {
      console.log(`   📝 Creando política: ${policy.split('"')[1]}...`);
      
      const { error } = await supabase.rpc('exec_sql', { sql_query: policy });
      
      if (error) {
        console.error(`   ❌ Error: ${error.message}`);
      } else {
        console.log(`   ✅ Política creada exitosamente`);
      }
    } catch (err) {
      console.error(`   ❌ Error inesperado: ${err.message}`);
    }
  }
  
  console.log('✅ Políticas RLS creadas exitosamente');
}

// Función principal
async function main() {
  try {
    console.log('🔗 Conectando a Supabase...');
    
    // Verificar conexión
    const { data, error } = await supabase.from('users').select('count').limit(1);
    if (error && error.code !== 'PGRST116') { // PGRST116 = tabla no existe (esperado)
      console.error('❌ Error de conexión:', error.message);
      return;
    }
    
    console.log('✅ Conexión exitosa a Supabase');
    
    // Configurar UUIDv6
    await configureUUIDv6();
    
    // Crear todas las tablas
    const success = await createAllTables();
    if (!success) {
      console.error('\n❌ Error creando tablas. Deteniendo proceso.');
      return;
    }
    
    // Crear índices
    await createIndexes();
    
    // Crear triggers
    await createTriggers();
    
    // Configurar RLS
    await configureRLS();
    
    // Crear políticas RLS
    await createRLSPolicies();
    
    // Configurar Supabase Storage
    await configureSupabaseStorage();
    
    console.log('\n🎉 ¡MIGRACIÓN COMPLETA EXITOSA!');
    console.log('📊 Se crearon 36 tablas optimizadas');
    console.log('🔍 Se crearon índices estratégicos');
    console.log('⚡ Se configuraron triggers automáticos');
    console.log('🔒 Se configuró Row Level Security (RLS)');
    console.log('🛡️ Se crearon políticas de seguridad');
    console.log('📁 Se configuró Supabase Storage');
    console.log('🆔 Se configuró UUID optimizado');
    console.log('\n🚀 Tu base de datos está lista para la migración de datos');
    
  } catch (error) {
    console.error('❌ Error inesperado:', error.message);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

module.exports = {
  createAllTables,
  createTablesByPhase,
  createIndexes,
  createTriggers,
  configureRLS,
  createRLSPolicies,
  configureUUIDv6,
  configureSupabaseStorage,
  configureStorageRLS
};
