const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './config.env' });

console.log('🔍 DIAGNÓSTICO DE CONEXIÓN SUPABASE\n');

// Verificar variables de entorno
console.log('📋 Verificando variables de entorno...');
console.log(`SUPABASE_URL: ${process.env.SUPABASE_URL ? '✅ Configurado' : '❌ Faltante'}`);
console.log(`SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Configurado' : '❌ Faltante'}`);

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('\n❌ ERROR: Faltan variables de entorno necesarias');
  console.log('📝 Verifica tu archivo config.env');
  process.exit(1);
}

// Crear cliente Supabase
console.log('\n🔗 Creando cliente Supabase...');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('✅ Cliente creado exitosamente');

// Función para probar diferentes tipos de conexión
async function testConnection() {
  console.log('\n🧪 Probando diferentes métodos de conexión...\n');

  // Test 1: Verificar URL de Supabase
  console.log('1️⃣ Verificando URL de Supabase...');
  try {
    const response = await fetch(process.env.SUPABASE_URL);
    if (response.ok) {
      console.log('   ✅ URL de Supabase accesible');
    } else {
      console.log(`   ❌ URL de Supabase no accesible: ${response.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Error accediendo a URL: ${error.message}`);
  }

  // Test 2: Verificar API REST
  console.log('\n2️⃣ Verificando API REST...');
  try {
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/`, {
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    });
    
    if (response.ok) {
      console.log('   ✅ API REST accesible');
    } else {
      console.log(`   ❌ API REST no accesible: ${response.status}`);
      const errorText = await response.text();
      console.log(`   📝 Error: ${errorText}`);
    }
  } catch (error) {
    console.log(`   ❌ Error accediendo a API REST: ${error.message}`);
  }

  // Test 3: Verificar autenticación
  console.log('\n3️⃣ Verificando autenticación...');
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.log(`   ❌ Error de autenticación: ${error.message}`);
    } else {
      console.log('   ✅ Autenticación exitosa');
    }
  } catch (error) {
    console.log(`   ❌ Error en autenticación: ${error.message}`);
  }

  // Test 4: Verificar acceso a base de datos
  console.log('\n4️⃣ Verificando acceso a base de datos...');
  try {
    // Intentar una consulta simple que no requiera tablas existentes
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: 'SELECT version();' 
    });
    
    if (error) {
      console.log(`   ❌ Error ejecutando SQL: ${error.message}`);
    } else {
      console.log('   ✅ Acceso a base de datos exitoso');
      console.log(`   📝 Versión PostgreSQL: ${data?.[0]?.version || 'No disponible'}`);
    }
  } catch (error) {
    console.log(`   ❌ Error en consulta SQL: ${error.message}`);
  }

  // Test 5: Verificar esquemas disponibles
  console.log('\n5️⃣ Verificando esquemas disponibles...');
  try {
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: 'SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN (\'information_schema\', \'pg_catalog\', \'pg_toast\');' 
    });
    
    if (error) {
      console.log(`   ❌ Error consultando esquemas: ${error.message}`);
    } else {
      console.log('   ✅ Esquemas disponibles:');
      data?.forEach(schema => {
        console.log(`      - ${schema.schema_name}`);
      });
    }
  } catch (error) {
    console.log(`   ❌ Error consultando esquemas: ${error.message}`);
  }

  // Test 6: Verificar tablas existentes
  console.log('\n6️⃣ Verificando tablas existentes...');
  try {
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: 'SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\';' 
    });
    
    if (error) {
      console.log(`   ❌ Error consultando tablas: ${error.message}`);
    } else {
      if (data && data.length > 0) {
        console.log('   ✅ Tablas existentes en esquema public:');
        data.forEach(table => {
          console.log(`      - ${table.table_name}`);
        });
      } else {
        console.log('   ℹ️  No hay tablas en el esquema public (esto es normal para un proyecto nuevo)');
      }
    }
  } catch (error) {
    console.log(`   ❌ Error consultando tablas: ${error.message}`);
  }
}

// Función para mostrar información de configuración
function showConfigInfo() {
  console.log('\n📋 INFORMACIÓN DE CONFIGURACIÓN:');
  console.log(`   URL: ${process.env.SUPABASE_URL}`);
  console.log(`   Key: ${process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20)}...`);
  console.log(`   Proyecto: ${process.env.PROJECT_NAME || 'No especificado'}`);
  console.log(`   Organización: ${process.env.ORGANIZATION || 'No especificada'}`);
}

// Función principal
async function main() {
  try {
    showConfigInfo();
    await testConnection();
    
    console.log('\n🎯 RECOMENDACIONES:');
    console.log('1. Verifica que tu proyecto de Supabase esté activo');
    console.log('2. Confirma que las credenciales sean correctas');
    console.log('3. Asegúrate de que el Service Role Key tenga permisos de administrador');
    console.log('4. Si todo está bien, intenta crear las tablas nuevamente');
    
  } catch (error) {
    console.error('\n❌ Error inesperado:', error.message);
  }
}

// Ejecutar diagnóstico
main();

