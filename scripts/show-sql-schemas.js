const fs = require('fs');
const path = require('path');

// Función para extraer esquemas de las definiciones SQL
function extractTableSchemas() {
  const filePath = './scripts/create-tables-with-rls.js';
  const content = fs.readFileSync(filePath, 'utf8');
  
  const schemas = {};
  
  // Buscar todas las definiciones de tablas
  const tableRegex = /CREATE TABLE IF NOT EXISTS (\w+)\s*\(([\s\S]*?)\);/gi;
  let match;
  
  while ((match = tableRegex.exec(content)) !== null) {
    const tableName = match[1];
    const tableDefinition = match[2];
    
    // Extraer columnas
    const columns = [];
    const lines = tableDefinition.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('--') && !trimmedLine.startsWith('UNIQUE') && !trimmedLine.startsWith('PRIMARY KEY') && !trimmedLine.startsWith('FOREIGN KEY')) {
        // Es una línea de columna
        const columnMatch = trimmedLine.match(/^(\w+)\s+([^,\s]+(?:\([^)]+\))?)\s*(.*)$/);
        if (columnMatch) {
          const [, name, type, constraints] = columnMatch;
          columns.push({
            name: name.trim(),
            type: type.trim(),
            constraints: constraints.trim()
          });
        }
      }
    }
    
    schemas[tableName] = {
      columns,
      definition: tableDefinition
    };
  }
  
  return schemas;
}

// Función para mostrar el esquema de una tabla
function showTableSchema(tableName, schemas) {
  if (!schemas[tableName]) {
    console.log(`❌ Tabla '${tableName}' no encontrada`);
    return;
  }
  
  console.log(`\n📊 ESQUEMA DE LA TABLA: ${tableName.toUpperCase()}`);
  console.log('=' .repeat(70));
  
  const schema = schemas[tableName];
  
  console.log('📋 COLUMNAS:');
  console.log('─'.repeat(70));
  
  schema.columns.forEach((col, index) => {
    const constraints = col.constraints ? ` ${col.constraints}` : '';
    console.log(`   ${(index + 1).toString().padStart(2)}. ${col.name.padEnd(25)} ${col.type}${constraints}`);
  });
  
  console.log(`\n📊 Total de columnas: ${schema.columns.length}`);
  
  // Mostrar información adicional basada en el nombre de la tabla
  showTableInfo(tableName);
}

// Función para mostrar información adicional de la tabla
function showTableInfo(tableName) {
  console.log('\n🔍 INFORMACIÓN ADICIONAL:');
  console.log('─'.repeat(70));
  
  const tableInfo = {
    'users': {
      description: 'Tabla principal de usuarios del sistema',
      keyFeatures: ['Firebase UID', 'Email único', 'Tipo de perfil', 'Soft delete'],
      relatedTables: ['user_profiles', 'user_investments', 'two_factor_auth']
    },
    'investments': {
      description: 'Proyectos de inversión disponibles',
      keyFeatures: ['Firebase ID', 'Estado del proyecto', 'Monto a vender', 'Retorno anual'],
      relatedTables: ['user_investments', 'transactions_mangopay', 'dividends']
    },
    'user_investments': {
      description: 'Relación entre usuarios e inversiones',
      keyFeatures: ['Cantidad de tokens', 'Monto total', 'Tipo de inversión'],
      relatedTables: ['users', 'investments']
    },
    'transactions_mangopay': {
      description: 'Transacciones procesadas por MangoPay',
      keyFeatures: ['Transfer ID único', 'Estado de transacción', 'Wallet'],
      relatedTables: ['users', 'investments']
    },
    'user_profiles': {
      description: 'Perfiles detallados de usuarios',
      keyFeatures: ['Datos personales/empresa', 'KYC status', 'Documentos'],
      relatedTables: ['users', 'documents']
    },
    'roles': {
      description: 'Sistema de roles y permisos',
      keyFeatures: ['Nombre único', 'Permisos JSONB', 'Soft delete'],
      relatedTables: ['permissions', 'role_assignments']
    },
    'wallets': {
      description: 'Carteras digitales de usuarios',
      keyFeatures: ['Tipo de cartera', 'Dirección', 'Estado activo'],
      relatedTables: ['users', 'wallet_transactions']
    },
    'audit_logs': {
      description: 'Logs de auditoría del sistema',
      keyFeatures: ['Tipo de acción', 'Recurso afectado', 'Valores antiguos/nuevos'],
      relatedTables: ['users']
    }
  };
  
  const info = tableInfo[tableName];
  if (info) {
    console.log(`   📝 Descripción: ${info.description}`);
    console.log(`   🔑 Características clave:`);
    info.keyFeatures.forEach(feature => {
      console.log(`      • ${feature}`);
    });
    console.log(`   🔗 Tablas relacionadas: ${info.relatedTables.join(', ')}`);
  } else {
    console.log(`   ℹ️  Tabla del sistema de migración Firebase → Supabase`);
  }
  
  // Mostrar campos especiales comunes
  const specialFields = [];
  if (tableName !== 'roles' && tableName !== 'countries' && tableName !== 'transaction_types' && tableName !== 'project_statuses') {
    specialFields.push('Soft delete (is_deleted, deleted_at, deleted_by)');
    specialFields.push('Version control (version)');
    specialFields.push('Timestamps (created_at, updated_at)');
  }
  
  if (specialFields.length > 0) {
    console.log(`   ⚙️  Campos del sistema:`);
    specialFields.forEach(field => {
      console.log(`      • ${field}`);
    });
  }
}

// Función para listar todas las tablas con información
function listAllTables(schemas) {
  console.log('📋 TABLAS DISPONIBLES:');
  console.log('=' .repeat(70));
  
  const tables = Object.keys(schemas).sort();
  
  tables.forEach((table, index) => {
    const columnCount = schemas[table].columns.length;
    console.log(`   ${(index + 1).toString().padStart(2)}. ${table.padEnd(25)} (${columnCount} columnas)`);
  });
  
  console.log(`\n📊 Total de tablas: ${tables.length}`);
  return tables;
}

// Función para mostrar esquemas de todas las tablas
function showAllSchemas(schemas) {
  console.log('🏗️ ESQUEMAS DE TODAS LAS TABLAS');
  console.log('=' .repeat(80));
  console.log(`📅 Fecha: ${new Date().toLocaleString()}`);
  
  const tables = Object.keys(schemas).sort();
  
  console.log(`📊 Mostrando esquemas de ${tables.length} tablas...`);
  
  tables.forEach(table => {
    showTableSchema(table, schemas);
  });
  
  console.log('\n🎉 ESQUEMAS COMPLETADOS');
  console.log('=' .repeat(80));
}

// Función principal
function main() {
  const args = process.argv.slice(2);
  
  try {
    console.log('🔍 EXTRAYENDO ESQUEMAS DE DEFINICIONES SQL...');
    
    const schemas = extractTableSchemas();
    
    if (Object.keys(schemas).length === 0) {
      console.log('❌ No se encontraron definiciones de tablas');
      return;
    }
    
    console.log(`✅ Se encontraron ${Object.keys(schemas).length} definiciones de tablas`);
    
    if (args.length === 0) {
      // Mostrar todas las tablas
      showAllSchemas(schemas);
    } else if (args[0] === 'list') {
      // Solo listar tablas
      listAllTables(schemas);
    } else {
      // Mostrar tabla específica
      showTableSchema(args[0], schemas);
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
  extractTableSchemas,
  showTableSchema,
  listAllTables,
  showAllSchemas
};
