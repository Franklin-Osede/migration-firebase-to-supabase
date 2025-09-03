#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const fs = require('fs');
const path = require('path');

program
  .name('setup')
  .description('Configuración inicial para migración Firebase → Supabase')
  .version('1.0.0');

program
  .command('init')
  .description('Inicializar configuración del proyecto')
  .action(async () => {
    const spinner = ora('Inicializando configuración...').start();
    
    try {
      // Crear directorios necesarios
      const dirs = [
        'scripts',
        'schemas',
        'migrations',
        'logs',
        'backups'
      ];
      
      dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
          console.log(chalk.green(`✓ Directorio creado: ${dir}`));
        }
      });
      
      // Crear archivo .env si no existe
      if (!fs.existsSync('.env')) {
        fs.copyFileSync('env.example', '.env');
        console.log(chalk.yellow('⚠ Archivo .env creado desde env.example'));
        console.log(chalk.blue('📝 Edita .env con tus credenciales reales'));
      }
      
      // Crear archivo de configuración de base de datos
      const dbConfigPath = 'src/config/database.js';
      if (fs.existsSync(dbConfigPath) && fs.readFileSync(dbConfigPath, 'utf8').trim() === '') {
        const dbConfig = `const { createClient } = require('@supabase/supabase-js');
const admin = require('firebase-admin');

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Faltan variables de entorno de Supabase');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Configuración de Firebase Admin
const serviceAccount = {
  type: 'service_account',
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const firebase = admin.firestore();

module.exports = {
  supabase,
  firebase,
  admin
};
`;
        fs.writeFileSync(dbConfigPath, dbConfig);
        console.log(chalk.green('✓ Configuración de base de datos creada'));
      }
      
      spinner.succeed('Configuración completada exitosamente');
      
      console.log(chalk.blue('\n📋 Próximos pasos:'));
      console.log(chalk.white('1. Edita el archivo .env con tus credenciales'));
      console.log(chalk.white('2. Ejecuta: npm run setup:schemas'));
      console.log(chalk.white('3. Ejecuta: npm run migrate'));
      
    } catch (error) {
      spinner.fail('Error en la configuración');
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

program
  .command('schemas')
  .description('Crear esquemas SQL en Supabase')
  .action(async () => {
    const spinner = ora('Creando esquemas en Supabase...').start();
    
    try {
      // Aquí se ejecutaría la creación de esquemas
      // Por ahora solo mostramos el mensaje
      spinner.succeed('Esquemas creados (implementar lógica)');
      console.log(chalk.blue('📝 Implementa la lógica de creación de esquemas'));
      
    } catch (error) {
      spinner.fail('Error creando esquemas');
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

program.parse();
