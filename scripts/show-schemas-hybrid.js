const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './config.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Función para ejecutar SQL (con mejor manejo de errores)
async function executeSQL(sql) {
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      return { data: null, error: error };
    }
    
    if (data && typeof data === 'object' && data.success === false) {
      return { 
        data: null, 
        error: new Error(`SQL Error: ${data.error} (SQLState: ${data.sqlstate})`) 
      };
    }
    
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// Función para obtener columnas usando SQL directo
async function getTableColumnsSQL(tableName) {
  console.log(`\n📊 ESQUEMA DETALLADO: ${tableName.toUpperCase()}`);
  console.log('=' .repeat(70));
  
  try {
    // Obtener información de columnas usando SQL
    const { data: columns, error: colError } = await executeSQL(`
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default,
        ordinal_position
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = '${tableName}'
      ORDER BY ordinal_position;
    `);
    
    if (colError) {
      console.log(`⚠️  Error con SQL directo: ${colError.message}`);
      console.log('🔄 Intentando con API directa...');
      return await getTableColumnsAPI(tableName);
    }
    
    if (!columns || columns.length === 0) {
      console.log(`❌ Tabla '${tableName}' no encontrada`);
      return;
    }
    
    console.log('📋 COLUMNAS (desde information_schema):');
    console.log('─'.repeat(70));
    
    columns.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
      const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
      
      console.log(`   ${col.ordinal_position.toString().padStart(2)}. ${col.column_name.padEnd(25)} ${col.data_type}${length} ${nullable}${defaultVal}`);
    });
    
    // Obtener constraints
    const { data: constraints, error: constError } = await executeSQL(`
      SELECT 
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      LEFT JOIN information_schema.constraint_column_usage ccu 
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_name = '${tableName}'
      ORDER BY tc.constraint_type, tc.constraint_name;
    `);
    
    if (!constError && constraints && constraints.length > 0) {
      console.log('\n🔗 CONSTRAINTS:');
      console.log('─'.repeat(70));
      
      const groupedConstraints = {};
      constraints.forEach(constraint => {
        if (!groupedConstraints[constraint.constraint_name]) {
          groupedConstraints[constraint.constraint_name] = {
            type: constraint.constraint_type,
            columns: [],
            foreign_table: constraint.foreign_table_name,
            foreign_column: constraint.foreign_column_name
          };
        }
        if (constraint.column_name) {
          groupedConstraints[constraint.constraint_name].columns.push(constraint.column_name);
        }
      });
      
      Object.entries(groupedConstraints).forEach(([name, constraint]) => {
        const columns = constraint.columns.join(', ');
        switch (constraint.type) {
          case 'PRIMARY KEY':
            console.log(`   🔑 PRIMARY KEY: ${columns}`);
            break;
          case 'FOREIGN KEY':
            console.log(`   🔗 FOREIGN KEY: ${columns} → ${constraint.foreign_table}(${constraint.foreign_column})`);
            break;
          case 'UNIQUE':
            console.log(`   ⭐ UNIQUE: ${columns}`);
            break;
          case 'CHECK':
            console.log(`   ✅ CHECK: ${name}`);
            break;
        }
      });
    }
    
    // Obtener índices
    const { data: indexes, error: idxError } = await executeSQL(`
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename = '${tableName}'
      ORDER BY indexname;
    `);
    
    if (!idxError && indexes && indexes.length > 0) {
      console.log('\n🔍 ÍNDICES:');
      console.log('─'.repeat(70));
      indexes.forEach(index => {
        console.log(`   📊 ${index.indexname}`);
      });
    }
    
    // Verificar RLS
    const { data: rlsStatus, error: rlsError } = await executeSQL(`
      SELECT rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = '${tableName}';
    `);
    
    if (!rlsError && rlsStatus && rlsStatus.length > 0) {
      const rlsEnabled = rlsStatus[0].rowsecurity;
      console.log(`\n🔒 RLS: ${rlsEnabled ? '✅ HABILITADO' : '❌ DESHABILITADO'}`);
    }
    
    console.log(`\n📊 Total de columnas: ${columns.length}`);
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

// Función de respaldo usando API directa
async function getTableColumnsAPI(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error) {
      console.log(`❌ Error: ${error.message}`);
      return;
    }
    
    if (!data || data.length === 0) {
      console.log('📋 TABLA VACÍA - No hay datos para analizar');
      return;
    }
    
    const columns = Object.keys(data[0]);
    console.log('📋 COLUMNAS (desde API directa):');
    console.log('─'.repeat(70));
    
    columns.forEach((col, index) => {
      const value = data[0][col];
      const type = typeof value;
      const isNull = value === null;
      const isArray = Array.isArray(value);
      
      let typeInfo = type;
      if (isArray) typeInfo = 'array';
      if (isNull) typeInfo += ' (NULL)';
      
      console.log(`   ${(index + 1).toString().padStart(2)}. ${col.padEnd(25)} ${typeInfo}`);
    });
    
    console.log(`\n📊 Total de columnas: ${columns.length}`);
    
  } catch (error) {
    console.error(`❌ Error con API directa: ${error.message}`);
  }
}

// Función para listar todas las tablas
async function listAllTables() {
  console.log('📋 TABLAS DISPONIBLES:');
  console.log('=' .repeat(70));
  
  // Primero intentar con SQL
  const { data: sqlData, error: sqlError } = await executeSQL(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);
  
  if (sqlError) {
    console.log(`⚠️  Error con SQL: ${sqlError.message}`);
    console.log('🔄 Usando lista predefinida...');
    
    // Lista de respaldo
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
    
    expectedTables.forEach((table, index) => {
      console.log(`   ${(index + 1).toString().padStart(2)}. ${table}`);
    });
    
    return expectedTables;
  }
  
  const tables = sqlData.map(row => row.table_name);
  
  tables.forEach((table, index) => {
    console.log(`   ${(index + 1).toString().padStart(2)}. ${table}`);
  });
  
  return tables;
}

// Función para mostrar esquema de todas las tablas
async function showAllSchemas() {
  console.log('🏗️ ESQUEMAS COMPLETOS DE TODAS LAS TABLAS');
  console.log('=' .repeat(80));
  console.log(`📅 Fecha: ${new Date().toLocaleString()}`);
  console.log(`🌐 Proyecto: ${process.env.SUPABASE_URL}`);
  
  const tables = await listAllTables();
  
  if (tables.length === 0) {
    console.log('❌ No se encontraron tablas');
    return;
  }
  
  console.log(`\n📊 Mostrando esquemas de ${tables.length} tablas...`);
  
  for (const table of tables) {
    await getTableColumnsSQL(table);
  }
  
  console.log('\n🎉 ESQUEMAS COMPLETADOS');
  console.log('=' .repeat(80));
}

// Función principal
async function main() {
  const args = process.argv.slice(2);
  
  try {
    console.log('🔗 Conectando a Supabase...');
    
    // Verificar conexión
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: 'SELECT 1 as test_connection;' 
    });
    
    if (error) {
      console.error('❌ No se pudo conectar a Supabase');
      return;
    }
    
    console.log('✅ Conexión exitosa a Supabase');
    
    if (args.length === 0) {
      // Mostrar todas las tablas
      await showAllSchemas();
    } else if (args[0] === 'list') {
      // Solo listar tablas
      await listAllTables();
    } else {
      // Mostrar tabla específica
      await getTableColumnsSQL(args[0]);
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
  getTableColumnsSQL,
  listAllTables,
  showAllSchemas
};
