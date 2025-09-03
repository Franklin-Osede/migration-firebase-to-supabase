#!/usr/bin/env node

require('dotenv').config();
const { program } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const cliProgress = require('cli-progress');
const { supabase, firebase } = require('../src/config/database');

program
  .name('migrate')
  .description('Migración de datos de Firebase a Supabase')
  .version('1.0.0');

// Configuración de migración
const MIGRATION_CONFIG = {
  batchSize: parseInt(process.env.BATCH_SIZE) || 1000,
  delayBetweenBatches: parseInt(process.env.DELAY_BETWEEN_BATCHES) || 1000,
  logLevel: process.env.LOG_LEVEL || 'info'
};

// Mapeo de colecciones Firebase a tablas Supabase
const COLLECTION_MAPPING = {
  'users': 'users',
  'investments': 'investments',
  'user-investments': 'user_investments',
  'transactions-mangopay': 'transactions_mangopay',
  'transactions-blockchain': 'transactions_blockchain',
  'reserves': 'reserves',
  'dividends': 'dividends',
  'dividend-claims': 'dividend_claims',
  'wallets': 'wallets',
  'kyc-results': 'kyc_verifications',
  'documents': 'documents',
  'fiscal-documents': 'fiscal_documents',
  'user-bonuses': 'user_bonuses',
  'user-notifications': 'user_notifications',
  'user-panel': 'user_preferences'
};

// Función para extraer datos de Firebase
async function extractFromFirebase(collectionName, batchSize = 1000) {
  const spinner = ora(`Extrayendo datos de ${collectionName}...`).start();
  
  try {
    const collectionRef = firebase.collection(collectionName);
    const snapshot = await collectionRef.get();
    
    if (snapshot.empty) {
      spinner.succeed(`No hay datos en ${collectionName}`);
      return [];
    }
    
    const documents = [];
    snapshot.forEach(doc => {
      documents.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    spinner.succeed(`Extraídos ${documents.length} documentos de ${collectionName}`);
    return documents;
    
  } catch (error) {
    spinner.fail(`Error extrayendo ${collectionName}`);
    throw error;
  }
}

// Función para transformar datos según el esquema
function transformData(collectionName, documents) {
  const spinner = ora(`Transformando datos de ${collectionName}...`).start();
  
  try {
    let transformedData = [];
    
    switch (collectionName) {
      case 'users':
        transformedData = documents.map(doc => ({
          firebase_uid: doc.id,
          email: doc.email || '',
          display_name: doc.displayName || doc.name || '',
          phone: doc.phone || '',
          is_active: doc.isActive !== false,
          is_verified: doc.emailVerified || false,
          profile_type: doc.profileType || 'individual',
          created_at: doc.createdAt ? new Date(doc.createdAt.toDate()) : new Date(),
          updated_at: doc.updatedAt ? new Date(doc.updatedAt.toDate()) : new Date()
        }));
        break;
        
      case 'investments':
        transformedData = documents.map(doc => ({
          firebase_id: doc.id,
          title: doc.title || '',
          description: doc.description || '',
          company: doc.company || '',
          token_symbol: doc.tokenSymbol || '',
          token_address: doc.tokenAddress || '',
          seller_address: doc.sellerAddress || '',
          project_wallet: doc.projectWallet || '',
          amount_to_sell: parseFloat(doc.amountToSell) || 0,
          amount_sold: parseFloat(doc.amountSold) || 0,
          price_token: parseFloat(doc.priceToken) || 0,
          annual_return: parseFloat(doc.annualReturn) || 0,
          estimated_delivery_time: parseInt(doc.estimatedDeliveryTime) || 0,
          project_status: doc.projectStatus || 'active',
          is_hidden: doc.isHidden || false,
          only_investors: doc.onlyInvestors || false,
          percentage_private_sale: parseFloat(doc.percentagePrivateSale) || 100,
          main_image: doc.mainImage || '',
          images: doc.images || [],
          documents: doc.documents || {},
          created_at: doc.createdAt ? new Date(doc.createdAt.toDate()) : new Date(),
          updated_at: doc.updatedAt ? new Date(doc.updatedAt.toDate()) : new Date()
        }));
        break;
        
      case 'user-investments':
        transformedData = documents.map(doc => ({
          firebase_id: doc.id,
          user_id: doc.userId || '',
          investment_id: doc.investmentId || '',
          total_amount: parseFloat(doc.totalAmount) || 0,
          token_quantity: parseFloat(doc.tokenQuantity) || 0,
          investment_type: doc.investmentType || 'current',
          last_activity_date: doc.lastActivityDate ? new Date(doc.lastActivityDate.toDate()) : new Date(),
          created_at: doc.createdAt ? new Date(doc.createdAt.toDate()) : new Date(),
          updated_at: doc.updatedAt ? new Date(doc.updatedAt.toDate()) : new Date()
        }));
        break;
        
      default:
        // Para otras colecciones, mantener estructura básica
        transformedData = documents.map(doc => ({
          firebase_id: doc.id,
          ...doc,
          created_at: doc.createdAt ? new Date(doc.createdAt.toDate()) : new Date(),
          updated_at: doc.updatedAt ? new Date(doc.updatedAt.toDate()) : new Date()
        }));
    }
    
    spinner.succeed(`Transformados ${transformedData.length} documentos de ${collectionName}`);
    return transformedData;
    
  } catch (error) {
    spinner.fail(`Error transformando ${collectionName}`);
    throw error;
  }
}

// Función para insertar datos en Supabase
async function insertToSupabase(tableName, data, batchSize = 1000) {
  const spinner = ora(`Insertando datos en ${tableName}...`).start();
  
  try {
    const progressBar = new cliProgress.SingleBar({
      format: `Migrando ${tableName} |{bar}| {percentage}% | {value}/{total} registros`,
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });
    
    progressBar.start(data.length, 0);
    
    let insertedCount = 0;
    let errorCount = 0;
    
    // Procesar en lotes
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      try {
        const { error } = await supabase
          .from(tableName)
          .insert(batch);
        
        if (error) {
          console.error(chalk.red(`Error en lote ${i / batchSize + 1}:`, error.message));
          errorCount += batch.length;
        } else {
          insertedCount += batch.length;
        }
        
        progressBar.update(insertedCount + errorCount);
        
        // Pausa entre lotes para no sobrecargar la base de datos
        if (i + batchSize < data.length) {
          await new Promise(resolve => setTimeout(resolve, MIGRATION_CONFIG.delayBetweenBatches));
        }
        
      } catch (error) {
        console.error(chalk.red(`Error crítico en lote ${i / batchSize + 1}:`, error.message));
        errorCount += batch.length;
        progressBar.update(insertedCount + errorCount);
      }
    }
    
    progressBar.stop();
    
    if (errorCount > 0) {
      spinner.warn(`Migración de ${tableName} completada con ${errorCount} errores`);
      console.log(chalk.yellow(`✓ Insertados: ${insertedCount}`));
      console.log(chalk.red(`✗ Errores: ${errorCount}`));
    } else {
      spinner.succeed(`Migración de ${tableName} completada exitosamente`);
      console.log(chalk.green(`✓ Total insertados: ${insertedCount}`));
    }
    
    return { insertedCount, errorCount };
    
  } catch (error) {
    spinner.fail(`Error migrando ${tableName}`);
    throw error;
  }
}

// Función principal de migración
async function migrateCollection(collectionName) {
  console.log(chalk.blue(`\n🔄 Migrando colección: ${collectionName}`));
  
  try {
    // 1. Extraer datos de Firebase
    const documents = await extractFromFirebase(collectionName, MIGRATION_CONFIG.batchSize);
    
    if (documents.length === 0) {
      console.log(chalk.yellow(`⚠ No hay datos para migrar en ${collectionName}`));
      return;
    }
    
    // 2. Transformar datos según el esquema
    const transformedData = transformData(collectionName, documents);
    
    // 3. Insertar en Supabase
    const tableName = COLLECTION_MAPPING[collectionName];
    if (!tableName) {
      console.log(chalk.yellow(`⚠ No hay mapeo definido para ${collectionName}`));
      return;
    }
    
    const result = await insertToSupabase(tableName, transformedData, MIGRATION_CONFIG.batchSize);
    
    // 4. Guardar log de migración
    const logEntry = {
      collection: collectionName,
      table: tableName,
      total_documents: documents.length,
      inserted: result.insertedCount,
      errors: result.errorCount,
      migrated_at: new Date().toISOString()
    };
    
    console.log(chalk.green(`✅ Migración de ${collectionName} completada`));
    return logEntry;
    
  } catch (error) {
    console.error(chalk.red(`❌ Error migrando ${collectionName}:`, error.message));
    throw error;
  }
}

// Comando principal de migración
program
  .command('all')
  .description('Migrar todas las colecciones')
  .action(async () => {
    const spinner = ora('Iniciando migración completa...').start();
    
    try {
      const collections = Object.keys(COLLECTION_MAPPING);
      const results = [];
      
      spinner.succeed('Migración iniciada');
      
      for (const collection of collections) {
        try {
          const result = await migrateCollection(collection);
          if (result) results.push(result);
        } catch (error) {
          console.error(chalk.red(`Error en ${collection}:`, error.message));
          // Continuar con la siguiente colección
        }
      }
      
      // Resumen final
      console.log(chalk.blue('\n📊 RESUMEN DE MIGRACIÓN'));
      console.log(chalk.white('='.repeat(50)));
      
      let totalInserted = 0;
      let totalErrors = 0;
      
      results.forEach(result => {
        console.log(chalk.white(`${result.collection} → ${result.table}`));
        console.log(chalk.green(`  ✓ Insertados: ${result.inserted}`));
        if (result.errors > 0) {
          console.log(chalk.red(`  ✗ Errores: ${result.errors}`));
        }
        totalInserted += result.inserted;
        totalErrors += result.errors;
      });
      
      console.log(chalk.white('='.repeat(50)));
      console.log(chalk.blue(`Total insertados: ${totalInserted}`));
      if (totalErrors > 0) {
        console.log(chalk.red(`Total errores: ${totalErrors}`));
      }
      
      if (totalErrors === 0) {
        console.log(chalk.green('\n🎉 ¡Migración completada exitosamente!'));
      } else {
        console.log(chalk.yellow('\n⚠ Migración completada con errores. Revisa los logs.'));
      }
      
    } catch (error) {
      spinner.fail('Error en la migración');
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// Comando para migrar una colección específica
program
  .command('collection <name>')
  .description('Migrar una colección específica')
  .action(async (name) => {
    if (!COLLECTION_MAPPING[name]) {
      console.error(chalk.red(`❌ Colección no válida: ${name}`));
      console.log(chalk.blue('Colecciones disponibles:'));
      Object.keys(COLLECTION_MAPPING).forEach(col => {
        console.log(chalk.white(`  - ${col}`));
      });
      process.exit(1);
    }
    
    try {
      await migrateCollection(name);
    } catch (error) {
      console.error(chalk.red(`❌ Error migrando ${name}:`, error.message));
      process.exit(1);
    }
  });

// Comando para listar colecciones disponibles
program
  .command('list')
  .description('Listar colecciones disponibles para migración')
  .action(() => {
    console.log(chalk.blue('📋 Colecciones disponibles para migración:'));
    console.log(chalk.white('='.repeat(50)));
    
    Object.entries(COLLECTION_MAPPING).forEach(([collection, table]) => {
      console.log(chalk.white(`${collection} → ${table}`));
    });
    
    console.log(chalk.white('='.repeat(50)));
    console.log(chalk.blue('Uso: npm run migrate collection <nombre-coleccion>'));
  });

program.parse();
