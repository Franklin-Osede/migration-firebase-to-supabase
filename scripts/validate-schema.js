#!/usr/bin/env node

require('dotenv').config();
const { program } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const { supabase } = require('../src/config/database');

// Lista de todas las tablas esperadas
const EXPECTED_TABLES = [
  // Fase 1: Tablas base
  'countries', 'transaction_types', 'system_config', 'cache_data', 'project_statuses',
  
  // Fase 2: Usuarios
  'users', 'user_profiles', 'two_factor_auth',
  
  // Fase 3: Roles
  'roles', 'permissions', 'role_assignments', 'admin_audit_log',
  
  // Fase 4: Proyectos e inversiones
  'investments', 'project_timeline', 'investors', 'user_investments',
  
  // Fase 5: Transacciones
  'transactions_mangopay', 'transactions_blockchain', 'bank_transfers', 'withdrawals',
  
  // Fase 6: Reservas
  'reserves', 'reserves_blockchain',
  
  // Fase 7: Dividendos
  'dividends', 'dividend_claims',
  
  // Fase 8: Carteras
  'wallets', 'wallet_transactions', 'wallet_balances',
  
  // Fase 9: Blockchain
  'blockchain_balances',
  
  // Fase 10: KYC y documentos
  'kyc_verifications', 'documents', 'fiscal_documents',
  
  // Fase 11: Funcionalidades adicionales
  'user_bonuses', 'user_notifications', 'user_preferences', 'audit_logs'
];

// Relaciones esperadas entre tablas
const EXPECTED_RELATIONS = [
  // Usuarios
  { from: 'user_profiles', to: 'users', column: 'user_id' },
  { from: 'two_factor_auth', to: 'users', column: 'user_id' },
  
  // Roles
  { from: 'permissions', to: 'roles', column: 'role_id' },
  { from: 'role_assignments', to: 'users', column: 'user_id' },
  { from: 'role_assignments', to: 'roles', column: 'role_id' },
  { from: 'admin_audit_log', to: 'users', column: 'admin_id' },
  
  // Proyectos e inversiones
  { from: 'project_timeline', to: 'investments', column: 'investment_id' },
  { from: 'investors', to: 'users', column: 'user_id' },
  { from: 'user_investments', to: 'users', column: 'user_id' },
  { from: 'user_investments', to: 'investments', column: 'investment_id' },
  
  // Transacciones
  { from: 'transactions_mangopay', to: 'users', column: 'user_id' },
  { from: 'transactions_mangopay', to: 'investments', column: 'investment_id' },
  { from: 'bank_transfers', to: 'users', column: 'user_id' },
  { from: 'withdrawals', to: 'users', column: 'user_id' },
  
  // Reservas
  { from: 'reserves', to: 'users', column: 'user_id' },
  { from: 'reserves', to: 'investments', column: 'investment_id' },
  { from: 'reserves_blockchain', to: 'users', column: 'user_id' },
  { from: 'reserves_blockchain', to: 'investments', column: 'investment_id' },
  
  // Dividendos
  { from: 'dividends', to: 'investments', column: 'investment_id' },
  { from: 'dividend_claims', to: 'users', column: 'user_id' },
  { from: 'dividend_claims', to: 'investments', column: 'investment_id' },
  { from: 'dividend_claims', to: 'dividends', column: 'dividend_id' },
  
  // Carteras
  { from: 'wallets', to: 'users', column: 'user_id' },
  { from: 'wallet_transactions', to: 'wallets', column: 'wallet_id' },
  { from: 'wallet_balances', to: 'wallets', column: 'wallet_id' },
  
  // Blockchain
  { from: 'blockchain_balances', to: 'users', column: 'user_id' },
  { from: 'blockchain_balances', to: 'investments', column: 'investment_id' },
  
  // KYC y documentos
  { from: 'kyc_verifications', to: 'users', column: 'user_id' },
  { from: 'documents', to: 'users', column: 'user_id' },
  { from: 'fiscal_documents', to: 'users', column: 'user_id' },
  
  // Funcionalidades adicionales
  { from: 'user_bonuses', to: 'users', column: 'user_id' },
  { from: 'user_notifications', to: 'users', column: 'user_id' },
  { from: 'user_preferences', to: 'users', column: 'user_id' },
  { from: 'audit_logs', to: 'users', column: 'user_id' }
];

// Función para verificar si una tabla existe
async function checkTableExists(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error && error.code === '42P01') {
      return false; // Tabla no existe
    }
    
    return true; // Tabla existe
  } catch (error) {
    return false;
  }
}

// Función para verificar relaciones
async function checkRelation(fromTable, toTable, column) {
  try {
    // Verificar que la tabla origen existe
    const fromExists = await checkTableExists(fromTable);
    if (!fromExists) {
      return { exists: false, error: `Tabla origen '${fromTable}' no existe` };
    }
    
    // Verificar que la tabla destino existe
    const toExists = await checkTableExists(toTable);
    if (!toExists) {
      return { exists: false, error: `Tabla destino '${toTable}' no existe` };
    }
    
    // Verificar que la columna existe en la tabla origen
    const { data, error } = await supabase
      .from(fromTable)
      .select(column)
      .limit(1);
    
    if (error) {
      return { exists: false, error: `Columna '${column}' no existe en '${fromTable}'` };
    }
    
    return { exists: true };
  } catch (error) {
    return { exists: false, error: error.message };
  }
}

// Función para verificar índices
async function checkIndexes() {
  try {
    const { data, error } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT 
            schemaname,
            tablename,
            indexname,
            indexdef
          FROM pg_indexes 
          WHERE schemaname = 'public' 
          AND indexname LIKE 'idx_%'
          ORDER BY tablename, indexname;
        `
      });
    
    if (error) {
      return { indexes: [], error: error.message };
    }
    
    return { indexes: data || [], error: null };
  } catch (error) {
    return { indexes: [], error: error.message };
  }
}

// Función para verificar triggers
async function checkTriggers() {
  try {
    const { data, error } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT 
            trigger_name,
            event_object_table,
            action_statement
          FROM information_schema.triggers 
          WHERE trigger_schema = 'public'
          AND trigger_name LIKE '%updated_at%'
          ORDER BY event_object_table;
        `
      });
    
    if (error) {
      return { triggers: [], error: error.message };
    }
    
    return { triggers: data || [], error: null };
  } catch (error) {
    return { triggers: [], error: error.message };
  }
}

// Función principal de validación
async function validateSchema() {
  const spinner = ora('Validando esquema de Supabase...').start();
  
  try {
    const results = {
      tables: { existing: [], missing: [] },
      relations: { valid: [], invalid: [] },
      indexes: [],
      triggers: []
    };
    
    // 1. Verificar tablas
    spinner.text = 'Verificando tablas...';
    for (const table of EXPECTED_TABLES) {
      const exists = await checkTableExists(table);
      if (exists) {
        results.tables.existing.push(table);
      } else {
        results.tables.missing.push(table);
      }
    }
    
    // 2. Verificar relaciones
    spinner.text = 'Verificando relaciones...';
    for (const relation of EXPECTED_RELATIONS) {
      const result = await checkRelation(relation.from, relation.to, relation.column);
      if (result.exists) {
        results.relations.valid.push(relation);
      } else {
        results.relations.invalid.push({
          ...relation,
          error: result.error
        });
      }
    }
    
    // 3. Verificar índices
    spinner.text = 'Verificando índices...';
    const indexResult = await checkIndexes();
    if (indexResult.error) {
      console.log(chalk.yellow(`⚠ No se pudieron verificar índices: ${indexResult.error}`));
    } else {
      results.indexes = indexResult.indexes;
    }
    
    // 4. Verificar triggers
    spinner.text = 'Verificando triggers...';
    const triggerResult = await checkTriggers();
    if (triggerResult.error) {
      console.log(chalk.yellow(`⚠ No se pudieron verificar triggers: ${triggerResult.error}`));
    } else {
      results.triggers = triggerResult.triggers;
    }
    
    spinner.succeed('Validación completada');
    
    // Mostrar resultados
    console.log(chalk.blue('\n📊 RESULTADOS DE VALIDACIÓN'));
    console.log(chalk.white('='.repeat(60)));
    
    // Tablas
    console.log(chalk.blue('\n🔹 TABLAS:'));
    console.log(chalk.green(`✓ Existentes: ${results.tables.existing.length}/${EXPECTED_TABLES.length}`));
    if (results.tables.missing.length > 0) {
      console.log(chalk.red(`✗ Faltantes: ${results.tables.missing.length}`));
      results.tables.missing.forEach(table => {
        console.log(chalk.red(`  - ${table}`));
      });
    }
    
    // Relaciones
    console.log(chalk.blue('\n🔹 RELACIONES:'));
    console.log(chalk.green(`✓ Válidas: ${results.relations.valid.length}/${EXPECTED_RELATIONS.length}`));
    if (results.relations.invalid.length > 0) {
      console.log(chalk.red(`✗ Inválidas: ${results.relations.invalid.length}`));
      results.relations.invalid.forEach(relation => {
        console.log(chalk.red(`  - ${relation.from}.${relation.column} → ${relation.to}: ${relation.error}`));
      });
    }
    
    // Índices
    console.log(chalk.blue('\n🔹 ÍNDICES:'));
    console.log(chalk.green(`✓ Encontrados: ${results.indexes.length}`));
    if (results.indexes.length > 0) {
      const tableIndexes = {};
      results.indexes.forEach(index => {
        if (!tableIndexes[index.tablename]) {
          tableIndexes[index.tablename] = [];
        }
        tableIndexes[index.tablename].push(index.indexname);
      });
      
      Object.keys(tableIndexes).forEach(table => {
        console.log(chalk.white(`  ${table}: ${tableIndexes[table].length} índices`));
      });
    }
    
    // Triggers
    console.log(chalk.blue('\n🔹 TRIGGERS:'));
    console.log(chalk.green(`✓ Encontrados: ${results.triggers.length}`));
    if (results.triggers.length > 0) {
      const tableTriggers = {};
      results.triggers.forEach(trigger => {
        if (!tableTriggers[trigger.event_object_table]) {
          tableTriggers[trigger.event_object_table] = [];
        }
        tableTriggers[trigger.event_object_table].push(trigger.trigger_name);
      });
      
      Object.keys(tableTriggers).forEach(table => {
        console.log(chalk.white(`  ${table}: ${tableTriggers[table].length} triggers`));
      });
    }
    
    // Resumen final
    const totalIssues = results.tables.missing.length + results.relations.invalid.length;
    
    console.log(chalk.white('\n' + '='.repeat(60)));
    if (totalIssues === 0) {
      console.log(chalk.green('🎉 ¡Esquema válido! Todas las tablas y relaciones están correctas.'));
    } else {
      console.log(chalk.yellow(`⚠ Esquema con ${totalIssues} problemas. Revisa los errores arriba.`));
    }
    
    return results;
    
  } catch (error) {
    spinner.fail('Error en la validación');
    console.error(chalk.red(error.message));
    throw error;
  }
}

// Comando principal
program
  .command('all')
  .description('Validar todo el esquema')
  .action(async () => {
    try {
      await validateSchema();
    } catch (error) {
      console.error(chalk.red('Error:', error.message));
      process.exit(1);
    }
  });

// Comando para validar solo tablas
program
  .command('tables')
  .description('Validar solo las tablas')
  .action(async () => {
    const spinner = ora('Validando tablas...').start();
    
    try {
      const results = { existing: [], missing: [] };
      
      for (const table of EXPECTED_TABLES) {
        const exists = await checkTableExists(table);
        if (exists) {
          results.existing.push(table);
        } else {
          results.missing.push(table);
        }
      }
      
      spinner.succeed('Validación de tablas completada');
      
      console.log(chalk.blue('\n📊 RESULTADOS DE TABLAS'));
      console.log(chalk.white('='.repeat(40)));
      console.log(chalk.green(`✓ Existentes: ${results.existing.length}/${EXPECTED_TABLES.length}`));
      
      if (results.missing.length > 0) {
        console.log(chalk.red(`✗ Faltantes: ${results.missing.length}`));
        results.missing.forEach(table => {
          console.log(chalk.red(`  - ${table}`));
        });
      } else {
        console.log(chalk.green('🎉 ¡Todas las tablas existen!'));
      }
      
    } catch (error) {
      spinner.fail('Error validando tablas');
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// Comando para validar solo relaciones
program
  .command('relations')
  .description('Validar solo las relaciones')
  .action(async () => {
    const spinner = ora('Validando relaciones...').start();
    
    try {
      const results = { valid: [], invalid: [] };
      
      for (const relation of EXPECTED_RELATIONS) {
        const result = await checkRelation(relation.from, relation.to, relation.column);
        if (result.exists) {
          results.valid.push(relation);
        } else {
          results.invalid.push({
            ...relation,
            error: result.error
          });
        }
      }
      
      spinner.succeed('Validación de relaciones completada');
      
      console.log(chalk.blue('\n📊 RESULTADOS DE RELACIONES'));
      console.log(chalk.white('='.repeat(40)));
      console.log(chalk.green(`✓ Válidas: ${results.valid.length}/${EXPECTED_RELATIONS.length}`));
      
      if (results.invalid.length > 0) {
        console.log(chalk.red(`✗ Inválidas: ${results.invalid.length}`));
        results.invalid.forEach(relation => {
          console.log(chalk.red(`  - ${relation.from}.${relation.column} → ${relation.to}: ${relation.error}`));
        });
      } else {
        console.log(chalk.green('🎉 ¡Todas las relaciones son válidas!'));
      }
      
    } catch (error) {
      spinner.fail('Error validando relaciones');
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

program.parse();


