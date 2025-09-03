#!/usr/bin/env node

require('dotenv').config({ path: '../config.env' });
const chalk = require('chalk');
const ora = require('ora');
const { firebase, projectConfig } = require('../src/config/database');

async function testFirebaseConnection() {
  const spinner = ora('Probando conexión con Firebase...').start();
  
  try {
    // Verificar que Firebase esté inicializado
    if (!firebase) {
      throw new Error('Firebase no está inicializado');
    }
    
    spinner.succeed('✅ Conexión con Firebase establecida');
    
    console.log(chalk.blue('\n📊 INFORMACIÓN DEL PROYECTO:'));
    console.log(chalk.white(`   Nombre: ${projectConfig.name}`));
    console.log(chalk.white(`   Organización: ${projectConfig.organization}`));
    console.log(chalk.white(`   Proyecto ID: ${projectConfig.firebaseProjectId}`));
    
    // Listar colecciones disponibles
    spinner.text = 'Listando colecciones disponibles...';
    
    const collections = await firebase.listCollections();
    
    if (collections.length === 0) {
      spinner.warn('⚠️  No se encontraron colecciones');
      return;
    }
    
    spinner.succeed(`✅ Encontradas ${collections.length} colecciones`);
    
    console.log(chalk.blue('\n📋 COLECCIONES DISPONIBLES:'));
    console.log(chalk.white('='.repeat(60)));
    
    // Agrupar colecciones por categoría
    const categories = {
      'Usuarios': [],
      'Inversiones': [],
      'Transacciones': [],
      'Reservas': [],
      'Dividendos': [],
      'Carteras': [],
      'Documentos': [],
      'Configuración': [],
      'Otros': []
    };
    
    collections.forEach(collection => {
      const name = collection.id;
      
      if (name.includes('user') || name.includes('kyc')) {
        categories['Usuarios'].push(name);
      } else if (name.includes('investment') || name.includes('project')) {
        categories['Inversiones'].push(name);
      } else if (name.includes('transaction') || name.includes('bank') || name.includes('withdraw')) {
        categories['Transacciones'].push(name);
      } else if (name.includes('reserve')) {
        categories['Reservas'].push(name);
      } else if (name.includes('dividend')) {
        categories['Dividendos'].push(name);
      } else if (name.includes('wallet') || name.includes('w-')) {
        categories['Carteras'].push(name);
      } else if (name.includes('document') || name.includes('fiscal')) {
        categories['Documentos'].push(name);
      } else if (name.includes('config') || name.includes('dapp') || name.includes('cache')) {
        categories['Configuración'].push(name);
      } else {
        categories['Otros'].push(name);
      }
    });
    
    // Mostrar colecciones por categoría
    Object.entries(categories).forEach(([category, collections]) => {
      if (collections.length > 0) {
        console.log(chalk.blue(`\n${category}:`));
        collections.forEach(collection => {
          console.log(chalk.white(`   • ${collection}`));
        });
      }
    });
    
    console.log(chalk.white('\n' + '='.repeat(60)));
    
    // Contar documentos en colecciones principales
    spinner.text = 'Contando documentos en colecciones principales...';
    
    const mainCollections = ['users', 'investments', 'user-investments', 'transactions-mangopay'];
    const counts = {};
    
    for (const collectionName of mainCollections) {
      try {
        const snapshot = await firebase.collection(collectionName).get();
        counts[collectionName] = snapshot.size;
      } catch (error) {
        counts[collectionName] = 'Error';
      }
    }
    
    spinner.succeed('✅ Conteo de documentos completado');
    
    console.log(chalk.blue('\n📊 ESTIMACIÓN DE DATOS:'));
    console.log(chalk.white('='.repeat(60)));
    
    Object.entries(counts).forEach(([collection, count]) => {
      if (count === 'Error') {
        console.log(chalk.red(`   ${collection}: Error al contar`));
      } else {
        console.log(chalk.white(`   ${collection}: ${count} documentos`));
      }
    });
    
    // Calcular tamaño estimado
    const totalDocuments = Object.values(counts).filter(c => typeof c === 'number').reduce((a, b) => a + b, 0);
    const estimatedSizeMB = Math.round((totalDocuments * 2) / 1024); // Estimación: 2KB por documento
    
    console.log(chalk.white('\n' + '='.repeat(60)));
    console.log(chalk.blue(`📈 Total estimado: ${totalDocuments} documentos (~${estimatedSizeMB} MB)`));
    
    if (estimatedSizeMB > 400) {
      console.log(chalk.yellow('⚠️  El plan gratuito de Supabase (500MB) podría ser insuficiente'));
      console.log(chalk.yellow('💡 Considera actualizar a plan Pro ($25/mes) antes de la migración completa'));
    } else {
      console.log(chalk.green('✅ El plan gratuito de Supabase debería ser suficiente'));
    }
    
    console.log(chalk.blue('\n🚀 PRÓXIMOS PASOS:'));
    console.log(chalk.white('1. Configurar credenciales de Supabase'));
    console.log(chalk.white('2. Crear esquemas SQL en Supabase'));
    console.log(chalk.white('3. Ejecutar migración por prioridades'));
    
  } catch (error) {
    spinner.fail('❌ Error conectando con Firebase');
    console.error(chalk.red('Error:', error.message));
    
    if (error.code === 'app/no-app') {
      console.log(chalk.yellow('💡 Verifica la configuración en config.env'));
    } else if (error.code === 'permission-denied') {
      console.log(chalk.yellow('💡 Verifica los permisos de la cuenta de servicio'));
    }
    
    process.exit(1);
  }
}

// Ejecutar prueba
testFirebaseConnection();
