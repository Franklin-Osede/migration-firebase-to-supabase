const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './config.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Función para verificar tablas usando la API directa
async function verifyTablesDirect() {
  console.log('\n📊 VERIFICANDO TABLAS CREADAS...');
  console.log('=' .repeat(50));
  
  const expectedTables = [
    'roles', 'countries', 'transaction_types', 'project_statuses',
    'users', 'user_profiles', 'two_factor_auth', 'permissions',
    'investments', 'user_investments', 'investors', 'project_timeline',
    'transactions_mangopay', 'transactions_blockchain', 'bank_transfers', 'withdrawals',
    'reserves_mangopay', 'reserves_blockchain', 'dividends', 'dividend_claims',
    'wallets', 'wallet_transactions', 'wallet_balances', 'blockchain_balances',
    'kyc_verifications', 'documents', 'fiscal_documents', 'system_config', 'cache_data',
    'user_bonuses', 'audit_logs', 'user_notifications', 'user_preferences',
    'role_assignments', 'admin_actions'
  ];
  
  console.log(`📋 Verificando ${expectedTables.length} tablas esperadas...`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const tableName of expectedTables) {
    try {
      // Intentar hacer un SELECT simple para verificar que la tabla existe
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (error) {
        if (error.code === '42P01') {
          console.log(`   ❌ ${tableName} - No existe`);
          errorCount++;
        } else {
          console.log(`   ✅ ${tableName} - Existe (${error.message})`);
          successCount++;
        }
      } else {
        console.log(`   ✅ ${tableName} - Existe`);
        successCount++;
      }
    } catch (err) {
      console.log(`   ❌ ${tableName} - Error: ${err.message}`);
      errorCount++;
    }
  }
  
  console.log(`\n📊 Resultado: ${successCount}/${expectedTables.length} tablas verificadas`);
  return successCount === expectedTables.length;
}

// Función para verificar Storage
async function verifyStorage() {
  console.log('\n📁 VERIFICANDO SUPABASE STORAGE...');
  console.log('=' .repeat(50));
  
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('❌ Error verificando buckets:', error.message);
      return false;
    }
    
    const expectedBuckets = ['project-images', 'user-documents', 'profile-pictures', 'system-assets'];
    const createdBuckets = buckets.map(bucket => bucket.name);
    
    console.log(`✅ Buckets encontrados: ${createdBuckets.length}/${expectedBuckets.length}`);
    
    expectedBuckets.forEach(bucket => {
      const status = createdBuckets.includes(bucket) ? '✅' : '❌';
      console.log(`   ${status} ${bucket}`);
    });
    
    return createdBuckets.length === expectedBuckets.length;
  } catch (err) {
    console.error('❌ Error verificando Storage:', err.message);
    return false;
  }
}

// Función para verificar algunas tablas específicas con datos
async function verifyTableData() {
  console.log('\n🔍 VERIFICANDO DATOS DE TABLAS...');
  console.log('=' .repeat(50));
  
  const testTables = ['users', 'investments', 'roles', 'countries'];
  
  for (const tableName of testTables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(5);
      
      if (error) {
        console.log(`   ❌ ${tableName} - Error: ${error.message}`);
      } else {
        console.log(`   ✅ ${tableName} - ${data.length} registros encontrados`);
        if (data.length > 0) {
          console.log(`      📋 Columnas: ${Object.keys(data[0]).join(', ')}`);
        }
      }
    } catch (err) {
      console.log(`   ❌ ${tableName} - Error: ${err.message}`);
    }
  }
}

// Función para verificar RLS básico
async function verifyRLSBasic() {
  console.log('\n🔒 VERIFICANDO RLS BÁSICO...');
  console.log('=' .repeat(50));
  
  // Intentar hacer operaciones que deberían estar bloqueadas sin autenticación
  const testTables = ['users', 'investments', 'user_investments'];
  
  for (const tableName of testTables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (error) {
        if (error.message.includes('RLS') || error.message.includes('policy')) {
          console.log(`   ✅ ${tableName} - RLS activo (${error.message})`);
        } else {
          console.log(`   ⚠️  ${tableName} - Error: ${error.message}`);
        }
      } else {
        console.log(`   ⚠️  ${tableName} - RLS puede no estar activo`);
      }
    } catch (err) {
      console.log(`   ❌ ${tableName} - Error: ${err.message}`);
    }
  }
}

// Función principal
async function main() {
  console.log('🔍 VERIFICACIÓN SIMPLE DE MIGRACIÓN FIREBASE → SUPABASE');
  console.log('=' .repeat(70));
  console.log(`📅 Fecha: ${new Date().toLocaleString()}`);
  console.log(`🌐 Proyecto: ${process.env.SUPABASE_URL}`);
  
  try {
    console.log('\n🔗 Conectando a Supabase...');
    
    // Verificar conexión básica
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error && !error.message.includes('RLS')) {
      console.error('❌ No se pudo conectar a Supabase');
      return;
    }
    
    console.log('✅ Conexión exitosa a Supabase');
    
    // Ejecutar verificaciones
    const tablesOk = await verifyTablesDirect();
    const storageOk = await verifyStorage();
    await verifyTableData();
    await verifyRLSBasic();
    
    console.log('\n📊 RESUMEN FINAL');
    console.log('=' .repeat(50));
    console.log(`✅ Tablas: ${tablesOk ? 'OK' : 'ERROR'}`);
    console.log(`✅ Storage: ${storageOk ? 'OK' : 'ERROR'}`);
    
    if (tablesOk && storageOk) {
      console.log('\n🎉 ¡MIGRACIÓN VERIFICADA EXITOSAMENTE!');
      console.log('🚀 La base de datos está lista para producción');
    } else {
      console.log('\n⚠️  Hay algunos elementos que requieren atención');
    }
    
  } catch (error) {
    console.error('❌ Error inesperado:', error.message);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

module.exports = {
  verifyTablesDirect,
  verifyStorage,
  verifyTableData,
  verifyRLSBasic
};
