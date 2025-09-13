const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './config.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Función para ejecutar SQL usando la API REST de Supabase
async function executeSQL(sql) {
  try {
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY
      },
      body: JSON.stringify({ sql_query: sql })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }
    
    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    console.error('❌ Error ejecutando SQL:', error.message);
    return { data: null, error };
  }
}

// Función para verificar conexión
async function testConnection() {
  try {
    // Usar la función exec_sql que ya sabemos que funciona
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: 'SELECT 1 as test_connection;' 
    });
    
    if (error) {
      console.error('❌ Error de conexión:', error.message);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
    return false;
  }
}

// Función para crear tablas usando exec_sql
async function createTable(tableName, sql) {
  try {
    console.log(`   📝 Creando tabla: ${tableName}...`);
    
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: sql 
    });
    
    if (error) {
      console.error(`   ❌ Error creando ${tableName}: ${error.message}`);
      return false;
    }
    
    // Verificar si la respuesta indica éxito real
    if (data && typeof data === 'object' && data.success === false) {
      console.error(`   ❌ Error SQL creando ${tableName}: ${data.error} (SQLState: ${data.sqlstate})`);
      return false;
    }
    
    console.log(`   ✅ Tabla ${tableName} creada exitosamente`);
    return true;
  } catch (err) {
    console.error(`   ❌ Error inesperado creando ${tableName}: ${err.message}`);
    return false;
  }
}

// Esquema simplificado - solo las tablas más importantes
const ESSENTIAL_TABLES = [
  {
    name: 'roles',
    sql: `
      CREATE TABLE IF NOT EXISTS roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT(50) UNIQUE NOT NULL,
        description TEXT(500),
        permissions JSONB CHECK (jsonb_typeof(permissions) = 'object'),
        is_deleted BOOLEAN DEFAULT FALSE,
        deleted_at TIMESTAMPTZ,
        deleted_by UUID,
        version INTEGER DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  },
  {
    name: 'users',
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        firebase_uid TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        display_name TEXT(255),
        phone TEXT(20),
        is_active BOOLEAN DEFAULT TRUE,
        is_verified BOOLEAN DEFAULT FALSE,
        profile_type TEXT CHECK (profile_type IN ('individual', 'company')),
        is_deleted BOOLEAN DEFAULT FALSE,
        deleted_at TIMESTAMPTZ,
        deleted_by UUID,
        version INTEGER DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  },
  {
    name: 'user_profiles',
    sql: `
      CREATE TABLE IF NOT EXISTS user_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        profile_type TEXT CHECK (profile_type IN ('individual', 'company')),
        first_name TEXT(100),
        last_name TEXT(100),
        company_name TEXT(255),
        kyc_status TEXT CHECK (kyc_status IN ('pending', 'approved', 'rejected')),
        is_deleted BOOLEAN DEFAULT FALSE,
        deleted_at TIMESTAMPTZ,
        deleted_by UUID,
        version INTEGER DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  },
  {
    name: 'investments',
    sql: `
      CREATE TABLE IF NOT EXISTS investments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        firebase_id TEXT UNIQUE NOT NULL,
        title TEXT(255) NOT NULL,
        description TEXT(1000),
        company TEXT(255),
        amount_to_sell DECIMAL(15,2) NOT NULL,
        amount_sold DECIMAL(15,2) DEFAULT 0,
        price_token DECIMAL(15,2) NOT NULL,
        annual_return DECIMAL(5,2) NOT NULL,
        project_status TEXT CHECK (project_status IN ('active', 'funded', 'in_progress', 'completed')),
        is_hidden BOOLEAN DEFAULT FALSE,
        is_deleted BOOLEAN DEFAULT FALSE,
        deleted_at TIMESTAMPTZ,
        deleted_by UUID,
        version INTEGER DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  },
  {
    name: 'user_investments',
    sql: `
      CREATE TABLE IF NOT EXISTS user_investments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        investment_id UUID REFERENCES investments(id) ON DELETE CASCADE,
        total_amount DECIMAL(15,2) NOT NULL,
        token_quantity DECIMAL(15,2) NOT NULL,
        investment_type TEXT CHECK (investment_type IN ('current', 'legacy')),
        is_deleted BOOLEAN DEFAULT FALSE,
        deleted_at TIMESTAMPTZ,
        deleted_by UUID,
        version INTEGER DEFAULT 1,
        firebase_id TEXT(100),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, investment_id)
      );
    `
  }
];

// Función principal
async function main() {
  try {
    console.log('🔗 Conectando a Supabase...');
    
    // Verificar conexión
    const connected = await testConnection();
    if (!connected) {
      console.error('❌ No se pudo conectar a Supabase');
      return;
    }
    
    console.log('✅ Conexión exitosa a Supabase');
    
    // Crear tablas esenciales
    console.log('\n🚀 Creando tablas esenciales...');
    
    for (const table of ESSENTIAL_TABLES) {
      const success = await createTable(table.name, table.sql);
      if (!success) {
        console.error(`\n❌ Error creando tabla ${table.name}. Deteniendo proceso.`);
        return;
      }
    }
    
    console.log('\n🎉 ¡TABLAS ESENCIALES CREADAS EXITOSAMENTE!');
    console.log('📊 Se crearon 5 tablas básicas');
    console.log('🔗 Tu base de datos está lista para la migración');
    console.log('\n💡 Para crear el esquema completo, ejecuta:');
    console.log('   node scripts/create-tables-with-rls.js');
    
  } catch (error) {
    console.error('❌ Error inesperado:', error.message);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

module.exports = {
  createTable,
  testConnection,
  executeSQL
};
