const { createClient } = require('@supabase/supabase-js');
const admin = require('firebase-admin');
require('dotenv').config({ path: '../config.env' });

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('⚠️  Faltan variables de entorno de Supabase');
  console.error('📝 Configura SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en config.env');
  console.error('🔗 Ve a tu proyecto Supabase → Settings → API');
}

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// Configuración de Firebase Admin - domoblock-devnew
const serviceAccount = {
  type: 'service_account',
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : '',
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
};

// Verificar configuración de Firebase
if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_PRIVATE_KEY) {
  console.error('❌ Faltan variables de entorno de Firebase');
  console.error('📝 Verifica config.env');
  process.exit(1);
}

// Inicializar Firebase Admin
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase Admin inicializado correctamente');
  } catch (error) {
    console.error('❌ Error inicializando Firebase Admin:', error.message);
    process.exit(1);
  }
}

const firebase = admin.firestore();

// Configuración de blockchain
const blockchainConfig = {
  rpcProvider: process.env.RPC_PROVIDER,
  secretKeyPassword: process.env.SECRET_KEY_PASSWORD,
  addressManager: process.env.ADDRESS_MANAGER,
  adminUid: process.env.ADMIN_UID
};

// Verificar configuración
console.log('🔧 Configuración del proyecto:');
console.log(`   Proyecto: ${process.env.PROJECT_NAME}`);
console.log(`   Organización: ${process.env.ORGANIZATION}`);
console.log(`   Firebase: ${process.env.FIREBASE_PROJECT_ID}`);
console.log(`   Supabase: ${supabase ? '✅ Configurado' : '❌ Pendiente'}`);
console.log(`   Blockchain: ${blockchainConfig.rpcProvider ? '✅ Configurado' : '❌ Pendiente'}`);

module.exports = {
  supabase,
  firebase,
  admin,
  blockchainConfig,
  projectConfig: {
    name: process.env.PROJECT_NAME,
    organization: process.env.ORGANIZATION,
    firebaseProjectId: process.env.FIREBASE_PROJECT_ID
  }
};
