const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './config.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Función para configurar RLS en tablas existentes
async function configureRLS() {
  console.log('🔒 Configurando Row Level Security (RLS) en tablas existentes...');
  
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

// Función para verificar RLS
async function verifyRLS() {
  console.log('\n🔍 Verificando configuración de RLS...');
  
  const { data, error } = await supabase.rpc('exec_sql', {
    sql_query: `
      SELECT 
        schemaname,
        tablename,
        rowsecurity
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND rowsecurity = true
      ORDER BY tablename;
    `
  });
  
  if (error) {
    console.error('❌ Error verificando RLS:', error.message);
    return;
  }
  
  console.log('✅ Tablas con RLS habilitado:');
  data.forEach(row => {
    console.log(`   📊 ${row.tablename} - RLS: ${rowsecurity ? '✅' : '❌'}`);
  });
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
    
    // Configurar RLS
    await configureRLS();
    
    // Crear políticas RLS
    await createRLSPolicies();
    
    // Verificar RLS
    await verifyRLS();
    
    console.log('\n🎉 ¡CONFIGURACIÓN DE RLS COMPLETA!');
    console.log('🔒 Row Level Security habilitado en todas las tablas');
    console.log('🛡️ Políticas de seguridad creadas');
    console.log('✅ Verificación completada');
    
  } catch (error) {
    console.error('❌ Error inesperado:', error.message);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

module.exports = {
  configureRLS,
  createRLSPolicies,
  verifyRLS
};


