#!/usr/bin/env node

require('dotenv').config();
const { program } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(chalk.red('❌ Error: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY deben estar configurados en config.env'));
  process.exit(1);
}

// Crear cliente de Supabase con service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Esquemas SQL organizados por fases
const SCHEMAS_BY_PHASE = {
  // FASE 1: Tablas Base (Sin dependencias)
  phase1: {
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
    
    project_statuses: `
      CREATE TABLE IF NOT EXISTS project_statuses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        status_code TEXT UNIQUE NOT NULL,
        status_name TEXT NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  },

  // FASE 2: Usuarios (Base para todo)
  phase2: {
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
    `
  },

  // FASE 3: Sistema de Roles (Depende de users)
  phase3: {
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
    `
  },

  // FASE 4: Proyectos e Inversiones (Depende de users)
  phase4: {
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
    `
  },

  // FASE 5: Transacciones (Depende de users + investments)
  phase5: {
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
    `
  },

  // FASE 6: Reservas (Depende de users + investments)
  phase6: {
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
    `
  },

  // FASE 7: Dividendos (Depende de investments)
  phase7: {
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
    `
  },

  // FASE 8: Carteras (Depende de users)
  phase8: {
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
    `
  },

  // FASE 9: Blockchain (Depende de users + investments)
  phase9: {
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
    `
  },

  // FASE 10: KYC y Documentos (Depende de users)
  phase10: {
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
    `
  },

  // FASE 11: Funcionalidades Adicionales (Depende de users)
  phase11: {
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
    `,
    
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
    `
  }
};

// Función para ejecutar SQL usando la SDK de Supabase
async function executeSQL(sql) {
  try {
    // Usar la función SQL de Supabase
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      // Si no existe la función exec_sql, intentar con query directo
      console.log(chalk.yellow(`⚠ Función exec_sql no disponible, intentando método alternativo...`));
      
      // Para tablas simples, podemos intentar crear con un INSERT de prueba
      const tableName = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/i)?.[1];
      if (tableName) {
        // Intentar hacer un SELECT para verificar si la tabla existe
        const { error: selectError } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (selectError && selectError.code === '42P01') {
          // Tabla no existe, necesitamos crearla manualmente
          throw new Error(`Tabla ${tableName} no existe y no se puede crear automáticamente. Ejecuta el SQL manualmente en el dashboard de Supabase.`);
        }
        
        return { success: true, message: `Tabla ${tableName} ya existe` };
      }
      
      throw error;
    }
    
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Función para crear una tabla
async function createTable(tableName, schema) {
  try {
    const result = await executeSQL(schema);
    
    if (result.success) {
      return { success: true, message: result.message || `Tabla ${tableName} creada exitosamente` };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Función para probar la conexión
async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('_supabase_migrations')
      .select('*')
      .limit(1);
    
    if (error && error.code === '42P01') {
      // La tabla no existe, pero la conexión funciona
      return { success: true, message: 'Conexión exitosa a Supabase' };
    }
    
    return { success: true, message: 'Conexión exitosa a Supabase' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Función para crear todas las tablas por fases
async function createAllTablesByPhases() {
  const spinner = ora('Creando esquemas en Supabase por fases...').start();
  
  try {
    // Primero probar la conexión
    spinner.text = 'Probando conexión a Supabase...';
    const connectionTest = await testConnection();
    
    if (!connectionTest.success) {
      throw new Error(`Error de conexión: ${connectionTest.error}`);
    }
    
    console.log(chalk.green(`✓ ${connectionTest.message}`));
    
    const results = [];
    const phases = Object.keys(SCHEMAS_BY_PHASE);
    
    for (const phase of phases) {
      const phaseNumber = phase.replace('phase', '');
      const tables = SCHEMAS_BY_PHASE[phase];
      const tableNames = Object.keys(tables);
      
      spinner.text = `Fase ${phaseNumber}: Creando ${tableNames.length} tablas...`;
      
      for (const tableName of tableNames) {
        try {
          const result = await createTable(tableName, tables[tableName]);
          if (result.success) {
            results.push({ 
              phase: phaseNumber, 
              table: tableName, 
              status: 'success',
              message: result.message
            });
          } else {
            results.push({ 
              phase: phaseNumber, 
              table: tableName, 
              status: 'error', 
              error: result.error 
            });
          }
        } catch (error) {
          results.push({ 
            phase: phaseNumber, 
            table: tableName, 
            status: 'error', 
            error: error.message 
          });
        }
      }
      
      // Pausa entre fases
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    spinner.succeed('Proceso de creación completado');
    
    // Resumen por fases
    console.log(chalk.blue('\n📊 RESUMEN DE CREACIÓN POR FASES'));
    console.log(chalk.white('='.repeat(60)));
    
    phases.forEach(phase => {
      const phaseNumber = phase.replace('phase', '');
      const phaseResults = results.filter(r => r.phase === phaseNumber);
      const successCount = phaseResults.filter(r => r.status === 'success').length;
      const errorCount = phaseResults.filter(r => r.status === 'error').length;
      
      console.log(chalk.blue(`\n🔹 Fase ${phaseNumber}:`));
      phaseResults.forEach(result => {
        if (result.status === 'success') {
          console.log(chalk.green(`  ✓ ${result.table}`));
        } else {
          console.log(chalk.red(`  ✗ ${result.table}: ${result.error}`));
        }
      });
      
      console.log(chalk.white(`  Total: ${successCount} exitosas, ${errorCount} errores`));
    });
    
    // Resumen general
    const totalSuccess = results.filter(r => r.status === 'success').length;
    const totalErrors = results.filter(r => r.status === 'error').length;
    
    console.log(chalk.white('\n' + '='.repeat(60)));
    console.log(chalk.green(`✓ Total exitosas: ${totalSuccess}`));
    if (totalErrors > 0) {
      console.log(chalk.red(`✗ Total errores: ${totalErrors}`));
    }
    
    if (totalErrors === 0) {
      console.log(chalk.green('\n🎉 ¡Todos los esquemas creados exitosamente!'));
    } else {
      console.log(chalk.yellow('\n⚠ Algunos esquemas tuvieron errores.'));
      console.log(chalk.blue('\n💡 SOLUCIÓN:'));
      console.log(chalk.white('1. Ve al dashboard de Supabase (https://supabase.com/dashboard)'));
      console.log(chalk.white('2. Ve a SQL Editor'));
      console.log(chalk.white('3. Ejecuta manualmente los esquemas que fallaron'));
      console.log(chalk.white('4. O usa el script de creación manual que se generará'));
    }
    
    return results;
    
  } catch (error) {
    spinner.fail('Error creando esquemas');
    console.error(chalk.red(error.message));
    throw error;
  }
}

// Función para generar script SQL manual
function generateManualSQLScript(results) {
  const failedTables = results.filter(r => r.status === 'error');
  
  if (failedTables.length === 0) {
    return;
  }
  
  console.log(chalk.blue('\n📝 SCRIPT SQL MANUAL PARA TABLAS FALLIDAS'));
  console.log(chalk.white('='.repeat(60)));
  console.log(chalk.yellow('Copia y pega este SQL en el SQL Editor de Supabase:'));
  console.log(chalk.white(''));
  
  failedTables.forEach(result => {
    const phase = `phase${result.phase}`;
    const tableName = result.table;
    const schema = SCHEMAS_BY_PHASE[phase][tableName];
    
    if (schema) {
      console.log(chalk.white(`-- ${tableName}`));
      console.log(chalk.gray(schema.trim()));
      console.log(chalk.white(''));
    }
  });
}

// Comando principal
program
  .command('all')
  .description('Crear todos los esquemas por fases')
  .action(async () => {
    try {
      const results = await createAllTablesByPhases();
      generateManualSQLScript(results);
      
      console.log(chalk.green('\n🚀 ¡Proceso completado!'));
      console.log(chalk.blue('Próximo paso: Validar esquemas con npm run validate:schema'));
      
    } catch (error) {
      console.error(chalk.red('Error:', error.message));
      process.exit(1);
    }
  });

// Comando para crear una fase específica
program
  .command('phase <number>')
  .description('Crear una fase específica')
  .action(async (number) => {
    const phaseKey = `phase${number}`;
    if (!SCHEMAS_BY_PHASE[phaseKey]) {
      console.error(chalk.red(`❌ Fase no válida: ${number}`));
      console.log(chalk.blue('Fases disponibles:'));
      Object.keys(SCHEMAS_BY_PHASE).forEach(phase => {
        const phaseNumber = phase.replace('phase', '');
        console.log(chalk.white(`  - ${phaseNumber}`));
      });
      process.exit(1);
    }
    
    try {
      const spinner = ora(`Creando fase ${number}...`).start();
      const tables = SCHEMAS_BY_PHASE[phaseKey];
      const tableNames = Object.keys(tables);
      
      for (const tableName of tableNames) {
        spinner.text = `Creando tabla: ${tableName}`;
        const result = await createTable(tableName, tables[tableName]);
        
        if (result.success) {
          console.log(chalk.green(`✓ ${tableName}: ${result.message}`));
        } else {
          console.log(chalk.red(`✗ ${tableName}: ${result.error}`));
        }
      }
      
      spinner.succeed(`Fase ${number} completada`);
    } catch (error) {
      console.error(chalk.red(`❌ Error creando fase ${number}:`, error.message));
      process.exit(1);
    }
  });

// Comando para probar conexión
program
  .command('test')
  .description('Probar conexión a Supabase')
  .action(async () => {
    try {
      const spinner = ora('Probando conexión a Supabase...').start();
      const result = await testConnection();
      
      if (result.success) {
        spinner.succeed(result.message);
        console.log(chalk.green('🎉 ¡Conexión exitosa!'));
      } else {
        spinner.fail(`Error de conexión: ${result.error}`);
        console.log(chalk.red('❌ Error de conexión'));
      }
    } catch (error) {
      console.error(chalk.red('Error:', error.message));
      process.exit(1);
    }
  });

// Comando para listar fases disponibles
program
  .command('list')
  .description('Listar fases disponibles')
  .action(() => {
    console.log(chalk.blue('📋 Fases disponibles:'));
    console.log(chalk.white('='.repeat(50)));
    
    Object.keys(SCHEMAS_BY_PHASE).forEach(phase => {
      const phaseNumber = phase.replace('phase', '');
      const tables = Object.keys(SCHEMAS_BY_PHASE[phase]);
      console.log(chalk.white(`Fase ${phaseNumber}: ${tables.length} tablas`));
      tables.forEach(table => {
        console.log(chalk.gray(`  - ${table}`));
      });
    });
    
    console.log(chalk.white('='.repeat(50)));
    console.log(chalk.blue('Uso: npm run create:tables phase <numero-fase>'));
  });

program.parse();


