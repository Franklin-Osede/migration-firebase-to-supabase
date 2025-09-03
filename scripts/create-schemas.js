#!/usr/bin/env node

require('dotenv').config();
const { program } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const { supabase } = require('../src/config/database');

// Esquemas SQL completos para Supabase
const SCHEMAS = {
  // 1. Sistema de Roles (4 tablas)
  roles: `
    CREATE TABLE IF NOT EXISTS roles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      permissions JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `,
  
  permissions: `
    CREATE TABLE IF NOT EXISTS permissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
      resource TEXT NOT NULL,
      action TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(role_id, resource, action)
    );
  `,
  
  role_assignments: `
    CREATE TABLE IF NOT EXISTS role_assignments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
      assigned_by UUID REFERENCES users(id),
      assigned_at TIMESTAMPTZ DEFAULT NOW(),
      expires_at TIMESTAMPTZ,
      UNIQUE(user_id, role_id)
    );
  `,
  
  admin_audit_log: `
    CREATE TABLE IF NOT EXISTS admin_audit_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      admin_id UUID REFERENCES users(id) ON DELETE CASCADE,
      action_type TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT,
      details JSONB,
      ip_address INET,
      user_agent TEXT,
      severity_level TEXT CHECK (severity_level IN ('medium', 'high', 'critical')),
      session_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `,
  
  // 2. Usuarios y Autenticación (3 tablas)
  users: `
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      firebase_uid TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      display_name TEXT,
      phone TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      is_verified BOOLEAN DEFAULT FALSE,
      profile_type TEXT CHECK (profile_type IN ('individual', 'company')),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `,
  
  user_profiles: `
    CREATE TABLE IF NOT EXISTS user_profiles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      profile_type TEXT CHECK (profile_type IN ('individual', 'company')),
      
      -- Datos individuales
      first_name TEXT,
      last_name TEXT,
      date_of_birth DATE,
      nationality TEXT,
      residence_country TEXT,
      address TEXT,
      city TEXT,
      postal_code TEXT,
      
      -- Datos de empresa
      company_name TEXT,
      tax_id TEXT,
      representative_name TEXT,
      representative_last_name TEXT,
      
      -- Datos comunes
      kyc_status TEXT CHECK (kyc_status IN ('pending', 'approved', 'rejected')),
      kyc_data JSONB,
      
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `,
  
  two_factor_auth: `
    CREATE TABLE IF NOT EXISTS two_factor_auth (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      secret_key TEXT NOT NULL,
      backup_codes TEXT[],
      is_enabled BOOLEAN DEFAULT FALSE,
      last_used TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `,
  
  // 3. Inversiones y Proyectos (3 tablas)
  investments: `
    CREATE TABLE IF NOT EXISTS investments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      firebase_id TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      company TEXT,
      token_symbol TEXT,
      token_address TEXT,
      seller_address TEXT,
      project_wallet TEXT,
      
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
      
      -- Metadatos
      main_image TEXT,
      images TEXT[],
      documents JSONB,
      
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `,
  
  user_investments: `
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
      
      -- Metadatos
      firebase_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      
      UNIQUE(user_id, investment_id)
    );
  `,
  
  investors: `
    CREATE TABLE IF NOT EXISTS investors (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      
      -- Estadísticas agregadas del inversor
      total_projects INTEGER DEFAULT 0,
      total_volume DECIMAL(15,2) DEFAULT 0,
      average_ticket DECIMAL(15,2) DEFAULT 0,
      last_investment_date TIMESTAMPTZ,
      
      -- Metadatos
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      
      UNIQUE(user_id)
    );
  `,
  
  project_timeline: `
    CREATE TABLE IF NOT EXISTS project_timeline (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      investment_id UUID REFERENCES investments(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      event_date TIMESTAMPTZ NOT NULL,
      metadata JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `,
  
  project_statuses: `
    CREATE TABLE IF NOT EXISTS project_statuses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      status_code TEXT UNIQUE NOT NULL,
      status_name TEXT NOT NULL,
      description TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `,
  
  // 4. Transacciones (4 tablas)
  transactions_mangopay: `
    CREATE TABLE IF NOT EXISTS transactions_mangopay (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      investment_id UUID REFERENCES investments(id) ON DELETE CASCADE,
      
      -- Datos de transacción
      transfer_id TEXT UNIQUE NOT NULL,
      amount DECIMAL(15,2) NOT NULL,
      quantity DECIMAL(15,2),
      wallet TEXT NOT NULL,
      retention_rate DECIMAL(5,2) DEFAULT 0,
      
      -- Estado
      status TEXT CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')) NOT NULL DEFAULT 'pending',
      
      -- Metadatos
      firebase_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `,
  
  transactions_blockchain: `
    CREATE TABLE IF NOT EXISTS transactions_blockchain (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      address TEXT NOT NULL,
      amount TEXT NOT NULL,
      project TEXT NOT NULL,
      timestamp BIGINT NOT NULL,
      user TEXT NOT NULL,
      
      -- Metadatos adicionales
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `,
  
  bank_transfers: `
    CREATE TABLE IF NOT EXISTS bank_transfers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      
      -- Datos de la transferencia
      transfer_id TEXT UNIQUE NOT NULL,
      amount DECIMAL(15,2) NOT NULL,
      currency TEXT DEFAULT 'EUR',
      
      -- Estado
      status TEXT CHECK (status IN ('pending', 'confirmed', 'failed')),
      
      -- Metadatos
      confirmed_at TIMESTAMPTZ,
      firebase_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `,
  
  withdrawals: `
    CREATE TABLE IF NOT EXISTS withdrawals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      
      -- Datos de retiro
      amount DECIMAL(15,2) NOT NULL,
      currency TEXT DEFAULT 'EUR',
      bank_account_id TEXT,
      
      -- Estado
      status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
      
      -- Metadatos
      firebase_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      processed_at TIMESTAMPTZ
    );
  `,
  
  // 5. Reservas (2 tablas)
  reserves: `
    CREATE TABLE IF NOT EXISTS reserves (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      investment_id UUID REFERENCES investments(id) ON DELETE CASCADE,
      
      -- Datos de reserva
      token_quantity DECIMAL(15,2) NOT NULL,
      user_wallet TEXT,
      project_wallet TEXT,
      transfer_id TEXT,
      
      -- Estado
      status TEXT CHECK (status IN ('PENDING', 'CONFIRMED', 'MINTED', 'FAILED')),
      is_external BOOLEAN DEFAULT FALSE,
      
      -- Metadatos
      firebase_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `,
  
  reserves_blockchain: `
    CREATE TABLE IF NOT EXISTS reserves_blockchain (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      investment_id UUID REFERENCES investments(id) ON DELETE CASCADE,
      
      -- Datos de reserva
      token_quantity DECIMAL(15,2) NOT NULL,
      wallet_address TEXT NOT NULL,
      transaction_hash TEXT,
      
      -- Estado
      status TEXT CHECK (status IN ('pending', 'confirmed', 'expired', 'failed')),
      expire_at TIMESTAMPTZ NOT NULL,
      
      -- Metadatos
      firebase_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `,
  
  // 6. Dividendos (2 tablas)
  dividends: `
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
      
      -- Metadatos
      firebase_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `,
  
  dividend_claims: `
    CREATE TABLE IF NOT EXISTS dividend_claims (
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
      wallet_address TEXT,
      transaction_hash TEXT,
      
      -- Estado
      status TEXT CHECK (status IN ('pending', 'claimed', 'failed')) DEFAULT 'pending',
      
      -- Metadatos
      firebase_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `,
  
  // 7. Carteras (4 tablas)
  wallets: `
    CREATE TABLE IF NOT EXISTS wallets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      
      -- Datos de la cartera
      wallet_id TEXT UNIQUE NOT NULL,
      wallet_type TEXT CHECK (wallet_type IN ('company', 'personal')),
      currency TEXT DEFAULT 'EUR',
      description TEXT,
      
      -- Estado
      is_active BOOLEAN DEFAULT TRUE,
      is_primary BOOLEAN DEFAULT FALSE,
      
      -- Metadatos
      firebase_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `,
  
  wallet_transactions: `
    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
      
      -- Datos de transacción
      transaction_type TEXT CHECK (transaction_type IN ('credit', 'debit')),
      amount DECIMAL(15,2) NOT NULL,
      currency TEXT DEFAULT 'EUR',
      description TEXT,
      
      -- Metadatos
      firebase_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `,
  
  wallet_balances: `
    CREATE TABLE IF NOT EXISTS wallet_balances (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
      
      -- Balance actual
      balance DECIMAL(15,2) NOT NULL,
      currency TEXT DEFAULT 'EUR',
      
      -- Metadatos
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `,
  
  // 8. Blockchain (2 tablas)
  blockchain_balances: `
    CREATE TABLE IF NOT EXISTS blockchain_balances (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      investment_id UUID REFERENCES investments(id) ON DELETE CASCADE,
      
      -- Balance actual
      token_address TEXT NOT NULL,
      balance_wei TEXT NOT NULL,
      balance_tokens DECIMAL(15,2),
      
      -- Metadatos
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      
      UNIQUE(user_id, investment_id, token_address)
    );
  `,
  
  // 9. KYC (1 tabla)
  kyc_verifications: `
    CREATE TABLE IF NOT EXISTS kyc_verifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      
      -- Datos de verificación
      external_identifier TEXT UNIQUE NOT NULL,
      status TEXT CHECK (status IN ('pending', 'approved', 'rejected')),
      verification_data JSONB,
      error_details JSONB,
      
      -- Metadatos
      firebase_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `,
  
  // 10. Documentos (2 tablas)
  documents: `
    CREATE TABLE IF NOT EXISTS documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      
      -- Datos del documento
      document_type TEXT NOT NULL,
      title TEXT NOT NULL,
      filename TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size BIGINT,
      mime_type TEXT,
      
      -- Metadatos
      firebase_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `,
  
  fiscal_documents: `
    CREATE TABLE IF NOT EXISTS fiscal_documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      
      -- Datos fiscales
      document_type TEXT NOT NULL,
      tax_id TEXT,
      country TEXT,
      status TEXT CHECK (status IN ('pending', 'approved', 'rejected')),
      
      -- Metadatos
      firebase_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `,
  
  // 11. Configuración (2 tablas)
  system_config: `
    CREATE TABLE IF NOT EXISTS system_config (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      config_key TEXT UNIQUE NOT NULL,
      config_value JSONB NOT NULL,
      description TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `,
  
  cache_data: `
    CREATE TABLE IF NOT EXISTS cache_data (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      cache_key TEXT UNIQUE NOT NULL,
      cache_value JSONB NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `,
  
  // 12. Catálogos (4 tablas)
  countries: `
    CREATE TABLE IF NOT EXISTS countries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      country_code TEXT UNIQUE NOT NULL,
      country_name TEXT NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `,
  
  transaction_types: `
    CREATE TABLE IF NOT EXISTS transaction_types (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      type_code TEXT UNIQUE NOT NULL,
      type_name TEXT NOT NULL,
      description TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `,
  
  // 13. Bonificaciones (1 tabla)
  user_bonuses: `
    CREATE TABLE IF NOT EXISTS user_bonuses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      
      -- Datos de bonificación
      bonus_type TEXT NOT NULL,
      amount DECIMAL(15,2) NOT NULL,
      percentage DECIMAL(5,2),
      project_name TEXT,
      project_id TEXT,
      user_email TEXT,
      
      -- Estado
      is_applied BOOLEAN DEFAULT FALSE,
      email_sent BOOLEAN DEFAULT FALSE,
      
      -- Metadatos
      firebase_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `,
  
  // 14. Auditoría (1 tabla)
  audit_logs: `
    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      
      -- Datos de auditoría
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      action_type TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT,
      old_values JSONB,
      new_values JSONB,
      
      -- Metadatos
      ip_address INET,
      user_agent TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `,
  
  // 15. Notificaciones y Preferencias (2 tablas)
  user_notifications: `
    CREATE TABLE IF NOT EXISTS user_notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      
      -- Datos de notificación
      notification_type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      
      -- Metadatos
      firebase_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      read_at TIMESTAMPTZ
    );
  `,
  
  user_preferences: `
    CREATE TABLE IF NOT EXISTS user_preferences (
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
      
      -- Metadatos
      firebase_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `
};

// Función para crear una tabla
async function createTable(tableName, schema) {
  try {
    const { error } = await supabase.rpc('exec_sql', { sql: schema });
    
    if (error) {
      // Si no existe la función exec_sql, usar query directo
      const { error: queryError } = await supabase.from(tableName).select('*').limit(1);
      if (queryError && queryError.code === '42P01') {
        // Tabla no existe, crearla con SQL directo
        const { error: createError } = await supabase.rpc('exec_sql', { sql: schema });
        if (createError) {
          throw new Error(`Error creando tabla ${tableName}: ${createError.message}`);
        }
      }
    }
    
    return true;
  } catch (error) {
    throw new Error(`Error creando tabla ${tableName}: ${error.message}`);
  }
}

// Función para crear todas las tablas
async function createAllTables() {
  const spinner = ora('Creando esquemas en Supabase...').start();
  
  try {
    const tableNames = Object.keys(SCHEMAS);
    const results = [];
    
    for (const tableName of tableNames) {
      try {
        spinner.text = `Creando tabla: ${tableName}`;
        await createTable(tableName, SCHEMAS[tableName]);
        results.push({ table: tableName, status: 'success' });
      } catch (error) {
        console.error(chalk.red(`❌ Error en ${tableName}:`, error.message));
        results.push({ table: tableName, status: 'error', error: error.message });
      }
    }
    
    spinner.succeed('Esquemas creados');
    
    // Resumen
    console.log(chalk.blue('\n📊 RESUMEN DE CREACIÓN DE ESQUEMAS'));
    console.log(chalk.white('='.repeat(50)));
    
    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    
    results.forEach(result => {
      if (result.status === 'success') {
        console.log(chalk.green(`✓ ${result.table}`));
      } else {
        console.log(chalk.red(`✗ ${result.table}: ${result.error}`));
      }
    });
    
    console.log(chalk.white('='.repeat(50)));
    console.log(chalk.green(`✓ Exitosas: ${successCount}`));
    if (errorCount > 0) {
      console.log(chalk.red(`✗ Errores: ${errorCount}`));
    }
    
    if (errorCount === 0) {
      console.log(chalk.green('\n🎉 ¡Todos los esquemas creados exitosamente!'));
    } else {
      console.log(chalk.yellow('\n⚠ Algunos esquemas tuvieron errores. Revisa los logs.'));
    }
    
    return results;
    
  } catch (error) {
    spinner.fail('Error creando esquemas');
    console.error(chalk.red(error.message));
    throw error;
  }
}

// Comando principal
program
  .command('all')
  .description('Crear todos los esquemas')
  .action(async () => {
    try {
      await createAllTables();
    } catch (error) {
      console.error(chalk.red('Error:', error.message));
      process.exit(1);
    }
  });

// Comando para crear una tabla específica
program
  .command('table <name>')
  .description('Crear una tabla específica')
  .action(async (name) => {
    if (!SCHEMAS[name]) {
      console.error(chalk.red(`❌ Tabla no válida: ${name}`));
      console.log(chalk.blue('Tablas disponibles:'));
      Object.keys(SCHEMAS).forEach(table => {
        console.log(chalk.white(`  - ${table}`));
      });
      process.exit(1);
    }
    
    try {
      const spinner = ora(`Creando tabla: ${name}`).start();
      await createTable(name, SCHEMAS[name]);
      spinner.succeed(`Tabla ${name} creada exitosamente`);
    } catch (error) {
      console.error(chalk.red(`❌ Error creando ${name}:`, error.message));
      process.exit(1);
    }
  });

// Comando para listar tablas disponibles
program
  .command('list')
  .description('Listar tablas disponibles')
  .action(() => {
    console.log(chalk.blue('📋 Tablas disponibles:'));
    console.log(chalk.white('='.repeat(50)));
    
    Object.keys(SCHEMAS).forEach(table => {
      console.log(chalk.white(`  - ${table}`));
    });
    
    console.log(chalk.white('='.repeat(50)));
    console.log(chalk.blue('Uso: npm run schemas table <nombre-tabla>'));
  });

program.parse();
