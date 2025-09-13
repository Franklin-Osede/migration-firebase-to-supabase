const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './config.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Función para crear la función exec_sql usando la API REST
async function createExecSQLFunction() {
  console.log('🔧 Creando función exec_sql...');
  
  const functionSQL = `
    CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
    RETURNS json
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      result json;
    BEGIN
      EXECUTE sql_query;
      RETURN '{"success": true, "message": "Query executed successfully"}'::json;
    EXCEPTION
      WHEN OTHERS THEN
        RETURN json_build_object(
          'success', false,
          'error', SQLERRM,
          'sqlstate', SQLSTATE
        );
    END;
    $$;
  `;

  try {
    // Usar la API REST para ejecutar SQL
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY
      },
      body: JSON.stringify({ sql_query: functionSQL })
    });

    if (response.ok) {
      console.log('✅ Función exec_sql creada exitosamente');
      return true;
    } else {
      const errorText = await response.text();
      console.log(`❌ Error creando función: ${response.status} - ${errorText}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Error inesperado: ${error.message}`);
    return false;
  }
}

// Función alternativa usando SQL directo
async function createExecSQLFunctionAlternative() {
  console.log('🔧 Intentando crear función exec_sql con método alternativo...');
  
  try {
    // Intentar crear la función usando una consulta directa
    const { data, error } = await supabase
      .from('_supabase_migrations')
      .select('*')
      .limit(1);

    if (error && error.message.includes('relation "_supabase_migrations" does not exist')) {
      console.log('ℹ️  Tabla _supabase_migrations no existe, esto es normal');
    }

    // Crear la función usando una consulta SQL directa
    const functionSQL = `
      CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
      RETURNS json
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        result json;
      BEGIN
        EXECUTE sql_query;
        RETURN '{"success": true, "message": "Query executed successfully"}'::json;
      EXCEPTION
        WHEN OTHERS THEN
          RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'sqlstate', SQLSTATE
          );
      END;
      $$;
    `;

    // Usar la API REST para ejecutar la consulta
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY
      },
      body: JSON.stringify({ sql_query: functionSQL })
    });

    if (response.ok) {
      console.log('✅ Función exec_sql creada exitosamente');
      return true;
    } else {
      console.log(`❌ Error creando función: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Error inesperado: ${error.message}`);
    return false;
  }
}

// Función para verificar si la función existe
async function checkExecSQLFunction() {
  console.log('🔍 Verificando si la función exec_sql existe...');
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: 'SELECT 1 as test;' 
    });
    
    if (error) {
      console.log(`❌ Función exec_sql no disponible: ${error.message}`);
      return false;
    } else {
      console.log('✅ Función exec_sql disponible');
      return true;
    }
  } catch (error) {
    console.log(`❌ Error verificando función: ${error.message}`);
    return false;
  }
}

// Función principal
async function main() {
  try {
    console.log('🚀 CONFIGURANDO FUNCIÓN EXEC_SQL\n');
    
    // Verificar si ya existe
    const exists = await checkExecSQLFunction();
    if (exists) {
      console.log('✅ La función exec_sql ya existe y está funcionando');
      return;
    }
    
    // Intentar crear la función
    console.log('📝 Creando función exec_sql...');
    const success = await createExecSQLFunction();
    
    if (!success) {
      console.log('⚠️  Método principal falló, intentando método alternativo...');
      const altSuccess = await createExecSQLFunctionAlternative();
      
      if (!altSuccess) {
        console.log('\n❌ No se pudo crear la función exec_sql');
        console.log('💡 SOLUCIÓN MANUAL:');
        console.log('1. Ve a tu panel de Supabase');
        console.log('2. Ve a SQL Editor');
        console.log('3. Ejecuta este SQL:');
        console.log(`
CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  EXECUTE sql_query;
  RETURN '{"success": true, "message": "Query executed successfully"}'::json;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'sqlstate', SQLSTATE
    );
END;
$$;
        `);
        return;
      }
    }
    
    // Verificar que funciona
    console.log('\n🧪 Verificando que la función funciona...');
    const working = await checkExecSQLFunction();
    
    if (working) {
      console.log('\n🎉 ¡FUNCIÓN EXEC_SQL CONFIGURADA EXITOSAMENTE!');
      console.log('✅ Ahora puedes ejecutar: npm run create:tables:simple');
    } else {
      console.log('\n❌ La función se creó pero no está funcionando correctamente');
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
  createExecSQLFunction,
  checkExecSQLFunction
};

