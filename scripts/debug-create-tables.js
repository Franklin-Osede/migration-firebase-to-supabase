const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './config.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Función para crear una tabla con debug completo
async function createTableWithDebug(tableName, sql) {
  console.log(`\n🔍 DEBUGGING: Creando tabla ${tableName}`);
  console.log(`📝 SQL: ${sql.substring(0, 100)}...`);
  
  try {
    // Ejecutar la consulta
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: sql 
    });
    
    console.log(`📊 Respuesta de exec_sql:`, JSON.stringify(data, null, 2));
    console.log(`❌ Error de exec_sql:`, error);
    
    if (error) {
      console.log(`❌ Error creando ${tableName}: ${error.message}`);
      return false;
    }
    
    // Verificar que la tabla se creó realmente
    console.log(`🔍 Verificando que la tabla existe...`);
    const { data: verifyData, error: verifyError } = await supabase.rpc('exec_sql', {
      sql_query: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${tableName}';`
    });
    
    console.log(`📊 Verificación:`, JSON.stringify(verifyData, null, 2));
    console.log(`❌ Error verificación:`, verifyError);
    
    if (verifyError) {
      console.log(`❌ Error verificando ${tableName}: ${verifyError.message}`);
      return false;
    }
    
    if (Array.isArray(verifyData) && verifyData.length > 0) {
      console.log(`✅ Tabla ${tableName} creada y verificada exitosamente`);
      return true;
    } else {
      console.log(`❌ Tabla ${tableName} NO se encontró después de crearla`);
      return false;
    }
    
  } catch (err) {
    console.log(`❌ Error inesperado creando ${tableName}: ${err.message}`);
    return false;
  }
}

// Función para probar la función exec_sql
async function testExecSQL() {
  console.log('🧪 Probando función exec_sql...');
  
  try {
    // Probar consulta simple
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: 'SELECT 1 as test_number;'
    });
    
    console.log('📊 Resultado consulta simple:', JSON.stringify(data, null, 2));
    console.log('❌ Error consulta simple:', error);
    
    // Probar consulta de tablas
    const { data: tablesData, error: tablesError } = await supabase.rpc('exec_sql', {
      sql_query: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"
    });
    
    console.log('📊 Resultado consulta tablas:', JSON.stringify(tablesData, null, 2));
    console.log('❌ Error consulta tablas:', tablesError);
    
  } catch (err) {
    console.log('❌ Error inesperado:', err.message);
  }
}

// Función principal
async function main() {
  try {
    console.log('🔍 DEBUGGING CREACIÓN DE TABLAS\n');
    
    // Probar función exec_sql
    await testExecSQL();
    
    // Crear tabla de prueba
    const testTableSQL = `
      CREATE TABLE IF NOT EXISTS test_debug (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    
    const success = await createTableWithDebug('test_debug', testTableSQL);
    
    if (success) {
      console.log('\n✅ Tabla de prueba creada exitosamente');
      console.log('🎯 El problema está en el script original, no en la función exec_sql');
    } else {
      console.log('\n❌ No se pudo crear la tabla de prueba');
      console.log('🎯 El problema está en la función exec_sql o en los permisos');
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
  createTableWithDebug,
  testExecSQL
};
