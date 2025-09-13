const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './config.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Función para obtener columnas usando la API directa de Supabase
async function getTableColumns(tableName) {
  console.log(`\n📊 COLUMNAS DE LA TABLA: ${tableName.toUpperCase()}`);
  console.log('=' .repeat(60));
  
  try {
    // Intentar hacer un SELECT para obtener la estructura
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error) {
      if (error.code === '42P01') {
        console.log(`❌ Tabla '${tableName}' no encontrada`);
        return;
      } else {
        console.log(`⚠️  Error accediendo a la tabla: ${error.message}`);
        return;
      }
    }
    
    if (data && data.length > 0) {
      // Hay datos, podemos analizar la estructura
      const columns = Object.keys(data[0]);
      console.log('📋 COLUMNAS ENCONTRADAS:');
      console.log('─'.repeat(60));
      
      columns.forEach((col, index) => {
        const value = data[0][col];
        const type = typeof value;
        const isNull = value === null;
        const isArray = Array.isArray(value);
        const isUUID = typeof value === 'string' && value.length === 36 && value.includes('-');
        const isDate = value instanceof Date || (typeof value === 'string' && value.includes('T'));
        const isBoolean = typeof value === 'boolean';
        const isNumber = typeof value === 'number';
        
        let typeInfo = type;
        if (isArray) typeInfo = 'array';
        if (isUUID) typeInfo = 'UUID';
        if (isDate) typeInfo = 'TIMESTAMP';
        if (isBoolean) typeInfo = 'BOOLEAN';
        if (isNumber) typeInfo = 'NUMERIC';
        if (isNull) typeInfo += ' (NULL)';
        
        console.log(`   ${(index + 1).toString().padStart(2)}. ${col.padEnd(25)} ${typeInfo}`);
      });
      
      console.log(`\n📊 Total de columnas: ${columns.length}`);
    } else {
      // Tabla vacía, pero existe
      console.log('📋 TABLA VACÍA - No hay datos para analizar la estructura');
      console.log('💡 Para ver la estructura completa, inserta un registro de prueba');
      
      // Intentar obtener información de la tabla usando una consulta simple
      console.log('\n🔍 Intentando obtener información de la tabla...');
      
      // Crear un registro temporal para analizar la estructura
      const tempData = await createTempRecord(tableName);
      if (tempData) {
        const columns = Object.keys(tempData);
        console.log('📋 COLUMNAS INFERIDAS:');
        console.log('─'.repeat(60));
        
        columns.forEach((col, index) => {
          const value = tempData[col];
          const type = typeof value;
          const isArray = Array.isArray(value);
          const isUUID = typeof value === 'string' && value.length === 36 && value.includes('-');
          const isDate = value instanceof Date || (typeof value === 'string' && value.includes('T'));
          const isBoolean = typeof value === 'boolean';
          const isNumber = typeof value === 'number';
          
          let typeInfo = type;
          if (isArray) typeInfo = 'array';
          if (isUUID) typeInfo = 'UUID';
          if (isDate) typeInfo = 'TIMESTAMP';
          if (isBoolean) typeInfo = 'BOOLEAN';
          if (isNumber) typeInfo = 'NUMERIC';
          
          console.log(`   ${(index + 1).toString().padStart(2)}. ${col.padEnd(25)} ${typeInfo}`);
        });
        
        console.log(`\n📊 Total de columnas: ${columns.length}`);
        
        // Limpiar el registro temporal
        await deleteTempRecord(tableName, tempData.id);
      }
    }
    
  } catch (error) {
    console.error(`❌ Error obteniendo columnas: ${error.message}`);
  }
}

// Función para crear un registro temporal para analizar la estructura
async function createTempRecord(tableName) {
  try {
    // Datos de prueba basados en el nombre de la tabla
    let testData = {};
    
    switch (tableName) {
      case 'users':
        testData = {
          firebase_uid: 'test-uid-123',
          email: 'test@example.com',
          display_name: 'Test User',
          phone: '+1234567890',
          is_active: true,
          is_verified: false,
          profile_type: 'individual'
        };
        break;
      case 'investments':
        testData = {
          firebase_id: 'test-investment-123',
          title: 'Test Investment',
          description: 'Test Description',
          company: 'Test Company',
          token_symbol: 'TEST',
          amount_to_sell: 1000.00,
          price_token: 10.00,
          annual_return: 5.00,
          project_status: 'active'
        };
        break;
      case 'user_profiles':
        testData = {
          user_id: '00000000-0000-0000-0000-000000000000',
          first_name: 'Test',
          last_name: 'User',
          date_of_birth: '1990-01-01',
          nationality: 'US',
          address: '123 Test St',
          city: 'Test City',
          postal_code: '12345',
          country: 'US',
          phone: '+1234567890',
          is_kyc_verified: false,
          kyc_status: 'pending'
        };
        break;
      default:
        // Datos genéricos
        testData = {
          name: 'Test',
          description: 'Test Description',
          is_active: true
        };
    }
    
    const { data, error } = await supabase
      .from(tableName)
      .insert(testData)
      .select()
      .single();
    
    if (error) {
      console.log(`⚠️  No se pudo crear registro de prueba: ${error.message}`);
      return null;
    }
    
    return data;
  } catch (error) {
    console.log(`⚠️  Error creando registro de prueba: ${error.message}`);
    return null;
  }
}

// Función para eliminar el registro temporal
async function deleteTempRecord(tableName, id) {
  try {
    await supabase
      .from(tableName)
      .delete()
      .eq('id', id);
  } catch (error) {
    // Ignorar errores de limpieza
  }
}

// Función para listar todas las tablas
async function listAllTables() {
  console.log('📋 TABLAS DISPONIBLES:');
  console.log('=' .repeat(60));
  
  // Lista de tablas esperadas
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
  
  console.log('🔍 Verificando tablas...');
  console.log('');
  
  let foundTables = [];
  let notFoundTables = [];
  
  for (const table of expectedTables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        if (error.code === '42P01') {
          notFoundTables.push(table);
        } else {
          foundTables.push(table);
        }
      } else {
        foundTables.push(table);
      }
    } catch (err) {
      notFoundTables.push(table);
    }
  }
  
  console.log(`✅ Tablas encontradas (${foundTables.length}):`);
  foundTables.forEach((table, index) => {
    console.log(`   ${(index + 1).toString().padStart(2)}. ${table}`);
  });
  
  if (notFoundTables.length > 0) {
    console.log(`\n❌ Tablas no encontradas (${notFoundTables.length}):`);
    notFoundTables.forEach((table, index) => {
      console.log(`   ${(index + 1).toString().padStart(2)}. ${table}`);
    });
  }
  
  return foundTables;
}

// Función para mostrar columnas de todas las tablas
async function showAllColumns() {
  console.log('🏗️ COLUMNAS DE TODAS LAS TABLAS');
  console.log('=' .repeat(80));
  console.log(`📅 Fecha: ${new Date().toLocaleString()}`);
  console.log(`🌐 Proyecto: ${process.env.SUPABASE_URL}`);
  
  const tables = await listAllTables();
  
  if (tables.length === 0) {
    console.log('❌ No se encontraron tablas');
    return;
  }
  
  console.log(`\n📊 Mostrando columnas de ${tables.length} tablas...`);
  
  for (const table of tables) {
    await getTableColumns(table);
  }
  
  console.log('\n🎉 ANÁLISIS DE COLUMNAS COMPLETADO');
  console.log('=' .repeat(80));
}

// Función principal
async function main() {
  const args = process.argv.slice(2);
  
  try {
    console.log('🔗 Conectando a Supabase...');
    
    // Verificar conexión
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error && !error.message.includes('RLS')) {
      console.error('❌ No se pudo conectar a Supabase');
      return;
    }
    
    console.log('✅ Conexión exitosa a Supabase');
    
    if (args.length === 0) {
      // Mostrar todas las tablas
      await showAllColumns();
    } else if (args[0] === 'list') {
      // Solo listar tablas
      await listAllTables();
    } else {
      // Mostrar tabla específica
      await getTableColumns(args[0]);
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
  getTableColumns,
  listAllTables,
  showAllColumns
};
