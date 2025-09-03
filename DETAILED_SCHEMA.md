# Esquema Detallado de Supabase - Explicaciones Completas

## 📋 ANÁLISIS COMPLETO DE TABLAS NECESARIAS

### **SISTEMA DE ROLES Y PERMISOS (4 tablas)**

#### **1. roles**
```sql
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL CHECK (name IN ('superadmin', 'admin', 'gestor', 'financiero', 'legal')),
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```
**¿Qué es?** Definición de roles del sistema (SuperAdmin, Admin, Gestor, Financiero, Legal)
**¿Por qué separada?** Permite asignar múltiples roles a usuarios y gestionar permisos granulares

#### **2. permissions**
```sql
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'projects', 'investments', 'withdrawals', 'kyc', 'dividends', 'funds'
  requires_2fa BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```
**¿Qué es?** Permisos específicos del sistema (crear proyectos, aprobar retiros, etc.)
**¿Por qué separada?** Permite control granular de qué puede hacer cada rol

#### **3. role_permissions**
```sql
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);
```
**¿Qué es?** Tabla de relación many-to-many entre roles y permisos
**¿Por qué separada?** Un rol puede tener múltiples permisos, un permiso puede estar en múltiples roles

#### **4. user_roles**
```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(user_id, role_id)
);
```
**¿Qué es?** Asignación de roles a usuarios específicos
**¿Por qué separada?** Un usuario puede tener múltiples roles, necesitamos auditoría de asignaciones

---

### **USUARIOS Y AUTENTICACIÓN (3 tablas)**

#### **5. users**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid TEXT UNIQUE NOT NULL, -- Referencia al usuario en Firebase Auth
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  photo_url TEXT,
  phone_number TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  
  -- Datos personales (JSONB para flexibilidad)
  personal_info JSONB, -- { nombre, apellidos, fecha_nacimiento, nacionalidad, dirección }
  
  -- Datos KYC (verificación de identidad)
  kyc_status TEXT CHECK (kyc_status IN ('pending', 'approved', 'rejected')),
  kyc_data JSONB, -- { documentos, verificación, datos de empleo }
  
  -- Datos empresariales (si es inversor profesional)
  empresa_data JSONB, -- { Datos_Empresa, Titulares, Representante, Inversor_Pro }
  
  -- Configuración del usuario
  disclaimer_data JSONB, -- Aceptación de términos
  notification_preferences JSONB, -- { email: true, sms: false, push: true }
  
  -- Seguridad 2FA (unificado de two-factor-auth)
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_secret TEXT, -- Clave secreta encriptada
  recovery_codes TEXT[], -- Códigos de recuperación encriptados
  two_factor_method TEXT CHECK (two_factor_method IN ('TOTP', 'SMS', 'EMAIL')),
  
  -- Metadatos
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```
**¿Qué es?** Tabla principal de usuarios con toda la información personal, KYC y configuración
**¿Por qué unificada?** Un usuario = Una fila, evita JOINs complejos
**Unificaciones:** users + user-notifications + two-factor-auth

#### **6. otp_codes**
```sql
CREATE TABLE otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  code TEXT NOT NULL, -- Código de 6 dígitos
  expires_at TIMESTAMPTZ NOT NULL, -- Cuándo expira el código
  is_used BOOLEAN DEFAULT FALSE, -- Si ya se usó
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```
**¿Qué es?** Códigos de recuperación de contraseña (One-Time Password)
**¿Por qué separada?** Datos temporales, no parte del perfil del usuario
**¿Cuándo se usa?** Recuperación de contraseña, verificación de email

#### **7. pre_register_data**
```sql
CREATE TABLE pre_register_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid TEXT UNIQUE NOT NULL, -- Referencia al usuario en Firebase
  email TEXT NOT NULL,
  comes_from TEXT, -- Origen del usuario (referral, publicidad, etc.)
  registration_data JSONB, -- Datos temporales durante el proceso de registro
  status TEXT CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```
**¿Qué es?** Datos temporales durante el proceso de registro KYC
**¿Por qué separada?** Datos de transición, no parte del perfil final
**¿Cuándo se usa?** Entre registro inicial y completar KYC

---

### **INVERSIONES Y PROYECTOS (3 tablas)**

#### **8. investments**
```sql
CREATE TABLE investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_id TEXT UNIQUE NOT NULL, -- Referencia al proyecto en Firebase
  
  -- Datos básicos del proyecto
  title TEXT NOT NULL, -- Título del proyecto inmobiliario
  company TEXT NOT NULL, -- Empresa que desarrolla el proyecto
  description TEXT, -- Descripción detallada
  
  -- Ubicación del proyecto
  location_data JSONB, -- { country, state, city, address, coordinates, iframe_google_maps }
  
  -- Datos financieros
  price_token DECIMAL(10,2), -- Precio por token NFT
  amount_to_sell DECIMAL(15,2), -- Cantidad total a vender
  amount_sold DECIMAL(15,2), -- Cantidad ya vendida
  reserves DECIMAL(15,2), -- Cantidad reservada
  minimum_investment DECIMAL(10,2), -- Inversión mínima
  annual_return DECIMAL(5,2), -- Retorno anual esperado
  
  -- Datos de blockchain
  blockchain_data JSONB, -- { addresses, contracts, tokens, name_tokens, symbol_tokens }
  
  -- Estado del proyecto
  status TEXT CHECK (status IN ('En estudio', 'Activo', 'Financiado', 'En curso', 'Vendido')),
  attributes JSONB, -- Atributos adicionales
  hide BOOLEAN DEFAULT FALSE, -- Si está oculto
  only_inversors BOOLEAN DEFAULT FALSE, -- Solo para inversores profesionales
  
  -- Archivos del proyecto
  documents JSONB, -- URLs de PDFs e imágenes
  
  -- Fechas importantes
  activation_date TIMESTAMPTZ, -- Cuándo se activa
  end_of_sale BIGINT, -- Cuándo termina la venta
  hours_to_sell INTEGER, -- Horas para vender
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```
**¿Qué es?** Proyectos de inversión inmobiliaria con tokens NFT
**¿Por qué separada?** Entidad principal del negocio, referenciada por múltiples tablas

#### **9. user_investments**
```sql
CREATE TABLE user_investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  investment_id UUID REFERENCES investments(id) ON DELETE CASCADE,
  
  -- Datos de la inversión
  amount_invested DECIMAL(15,2) NOT NULL, -- Cantidad invertida
  tokens_quantity DECIMAL(15,2), -- Cantidad de tokens NFT
  investment_date TIMESTAMPTZ NOT NULL, -- Fecha de inversión
  
  -- Estado de la inversión
  status TEXT CHECK (status IN ('pending', 'active', 'matured', 'withdrawn')),
  
  -- Retornos
  expected_return_rate DECIMAL(5,2), -- Retorno esperado
  actual_return DECIMAL(15,2), -- Retorno real
  last_dividend_date TIMESTAMPTZ, -- Último dividendo recibido
  
  -- Tipo de inversión (unificado de múltiples colecciones)
  investment_type TEXT CHECK (investment_type IN ('current', 'legacy')), -- current = Mangopay, legacy = sistema anterior
  payment_method TEXT, -- 'mangopay', 'inespay', 'blockchain'
  transaction_reference TEXT, -- Referencia de la transacción
  
  -- Datos legacy (del sistema anterior)
  legacy_data JSONB, -- Datos específicos del sistema anterior
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Índice único para evitar duplicados
  UNIQUE(user_id, investment_id)
);
```
**¿Qué es?** Inversiones de usuarios en proyectos (unificada de múltiples colecciones)
**¿Por qué unificada?** Una inversión = Una fila, historial completo
**Unificaciones:** user-investments + user-projects + user-investments-cache

#### **10. project_timeline**
```sql
CREATE TABLE project_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investment_id UUID REFERENCES investments(id) ON DELETE CASCADE,
  
  -- Transiciones de estado
  transitions JSONB, -- Array de transiciones: [{ from: 'En estudio', to: 'Activo', timestamp: 123, reason: 'Aprobado', userId: 'abc' }]
  
  -- Metadatos
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```
**¿Qué es?** Historial de cambios de estado de proyectos
**¿Por qué separada?** Auditoría completa de cambios de estado

---

### **TRANSACCIONES (3 tablas)**

#### **11. transactions_mangopay**
```sql
CREATE TABLE transactions_mangopay (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_id TEXT UNIQUE NOT NULL, -- Referencia en Firebase
  
  -- Relaciones
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  investment_id UUID REFERENCES investments(id) ON DELETE CASCADE,
  
  -- Datos específicos de Mangopay
  transfer_id TEXT UNIQUE NOT NULL, -- ID de transferencia de Mangopay
  amount DECIMAL(15,2) NOT NULL, -- Cantidad transferida
  quantity DECIMAL(15,2), -- Cantidad de tokens
  retention_percentage DECIMAL(5,2), -- Porcentaje de retención fiscal
  wallet TEXT NOT NULL, -- Dirección destino
  
  -- Estado de la transacción
  status TEXT NOT NULL, -- 'SUCCEEDED', 'FAILED', 'PENDING'
  
  -- Metadatos
  timestamp BIGINT NOT NULL, -- Timestamp de la transacción
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```
**¿Qué es?** Transacciones fiat-to-crypto procesadas por Mangopay
**¿Por qué unificada?** Ambas manejan transacciones fiat
**Unificaciones:** transactions-mangopay + bank

#### **12. transactions_blockchain**
```sql
CREATE TABLE transactions_blockchain (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_id TEXT UNIQUE NOT NULL, -- Referencia en Firebase
  
  -- Relaciones
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  investment_id UUID REFERENCES investments(id) ON DELETE CASCADE,
  
  -- Datos específicos de Blockchain
  address TEXT NOT NULL, -- Dirección de la wallet
  transaction_hash TEXT UNIQUE NOT NULL, -- Hash de la transacción
  amount_wei TEXT NOT NULL, -- Cantidad en Wei (string para precisión)
  
  -- Estado de la transacción
  status TEXT NOT NULL, -- 'CONFIRMED', 'PENDING', 'FAILED'
  
  -- Metadatos
  timestamp BIGINT NOT NULL, -- Timestamp de la transacción
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```
**¿Qué es?** Transacciones crypto-to-crypto en blockchain
**¿Por qué separada?** Diferente tipo de transacción (crypto vs fiat)

#### **13. withdrawals**
```sql
CREATE TABLE withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Datos del retiro
  amount DECIMAL(15,2) NOT NULL, -- Cantidad a retirar
  currency TEXT DEFAULT 'EUR', -- Moneda
  
  -- Información bancaria
  bank_id TEXT, -- ID del banco
  account_number TEXT, -- Número de cuenta
  
  -- Estado de la solicitud
  status TEXT CHECK (status IN ('pending', 'approved', 'denied', 'processed')),
  
  -- Metadatos
  user_email TEXT, -- Email del usuario
  processed_by UUID REFERENCES users(id), -- Quién procesó la solicitud
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```
**¿Qué es?** Solicitudes de retiro de fondos
**¿Por qué separada?** Proceso diferente a las transacciones de inversión

---

### **RESERVAS (2 tablas)**

#### **14. reserves_mangopay**
```sql
CREATE TABLE reserves_mangopay (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  investment_id UUID REFERENCES investments(id) ON DELETE CASCADE,
  
  -- Datos específicos de Mangopay
  shares DECIMAL(15,2) NOT NULL, -- Cantidad de shares reservadas
  amount DECIMAL(15,2) NOT NULL, -- Cantidad monetaria
  transfer_id TEXT, -- ID de transferencia
  project_wallet TEXT, -- Wallet del proyecto
  user_wallet TEXT, -- Wallet del usuario
  is_external BOOLEAN DEFAULT FALSE, -- Si es reserva externa
  
  -- Estado de la reserva
  status TEXT CHECK (status IN ('PENDING', 'FAILED', 'MINTED')),
  
  -- Metadatos
  timestamp BIGINT NOT NULL, -- Timestamp de la reserva
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```
**¿Qué es?** Reservas antes del pago fiat con Mangopay
**¿Por qué separada?** Diferente flujo de reserva (fiat vs blockchain)

#### **15. reserves_blockchain**
```sql
CREATE TABLE reserves_blockchain (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  investment_id UUID REFERENCES investments(id) ON DELETE CASCADE,
  
  -- Datos específicos de Blockchain
  amount DECIMAL(15,2) NOT NULL, -- Cantidad a reservar
  address TEXT, -- Dirección de la wallet
  transaction_hash TEXT, -- Hash de la transacción
  
  -- Estado de la reserva
  status TEXT CHECK (status IN ('PENDING', 'CONFIRMED', 'FAILED', 'EXPIRED')),
  
  -- Tiempo
  timestamp BIGINT NOT NULL, -- Timestamp de creación
  expire BIGINT NOT NULL, -- Timestamp de expiración
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```
**¿Qué es?** Reservas antes de transacciones blockchain
**¿Por qué separada?** Diferente flujo de reserva (blockchain vs fiat)

---

### **DIVIDENDOS (2 tablas)**

#### **16. dividends**
```sql
CREATE TABLE dividends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investment_id UUID REFERENCES investments(id) ON DELETE CASCADE,
  
  -- Datos del dividendo
  interest_rate DECIMAL(5,2), -- Tasa de interés
  total_amount DECIMAL(15,2), -- Cantidad total del dividendo
  retention_applied BOOLEAN DEFAULT FALSE, -- Si se aplicó retención
  
  -- Estado del dividendo
  is_rent BOOLEAN DEFAULT FALSE, -- Si es renta
  is_last_dividend BOOLEAN DEFAULT FALSE, -- Si es el último dividendo
  
  -- Fechas
  creation_date BIGINT, -- Fecha de creación
  distribution_date TIMESTAMPTZ, -- Fecha de distribución
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```
**¿Qué es?** Dividendos generados por proyectos
**¿Por qué separada?** Definición de dividendos vs reclamaciones

#### **17. dividend_claims**
```sql
CREATE TABLE dividend_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  dividend_id UUID REFERENCES dividends(id) ON DELETE CASCADE,
  
  -- Datos de reclamación
  amount_claimed DECIMAL(15,2) NOT NULL, -- Cantidad reclamada
  claim_date TIMESTAMPTZ DEFAULT NOW(), -- Fecha de reclamación
  
  -- Estado de la reclamación
  status TEXT CHECK (status IN ('pending', 'processed', 'failed')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Índice único para evitar reclamaciones duplicadas
  UNIQUE(user_id, dividend_id)
);
```
**¿Qué es?** Reclamaciones de dividendos por usuarios
**¿Por qué separada?** Un dividendo puede ser reclamado por múltiples usuarios

---

### **CARTERAS (3 tablas)**

#### **18. wallets**
```sql
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Datos de la wallet
  wallet_name TEXT NOT NULL, -- Nombre de la wallet
  wallet_type TEXT CHECK (wallet_type IN ('fiat', 'crypto', 'escrow', 'investment', 'bonus')),
  wallet_provider TEXT CHECK (wallet_provider IN ('mangopay', 'blockchain', 'corporate')),
  
  -- Datos específicos por proveedor
  mangopay_data JSONB, -- { wallet_id, virtual_id }
  blockchain_data JSONB, -- { address, network }
  corporate_data JSONB, -- { company_id, permissions }
  
  -- Balance
  balance DECIMAL(15,2) DEFAULT 0, -- Balance actual
  currency TEXT DEFAULT 'EUR', -- Moneda
  
  -- Estado
  is_default BOOLEAN DEFAULT FALSE, -- Si es la wallet por defecto
  is_active BOOLEAN DEFAULT TRUE, -- Si está activa
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```
**¿Qué es?** Carteras de usuarios (unificada de múltiples colecciones)
**¿Por qué unificada?** Una wallet = Una fila, gestión unificada
**Unificaciones:** walletsByCompany + users-walletsByCompany + mangopay

#### **19. corporate_wallets**
```sql
CREATE TABLE corporate_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Datos corporativos
  company_id TEXT NOT NULL, -- ID de la empresa
  company_name TEXT, -- Nombre de la empresa
  wallet_address TEXT NOT NULL, -- Dirección de la wallet corporativa
  
  -- Permisos
  permissions JSONB, -- Permisos específicos de la empresa
  
  -- Estado
  is_active BOOLEAN DEFAULT TRUE, -- Si está activa
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```
**¿Qué es?** Carteras específicas para inversiones corporativas
**¿Por qué separada?** Funcionalidad específica para empresas

#### **20. wallet_traceability**
```sql
CREATE TABLE wallet_traceability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Datos de la wallet
  wallet_address TEXT NOT NULL, -- Dirección de la wallet
  wallet_type TEXT CHECK (wallet_type IN ('user', 'project', 'corporate', 'system')),
  
  -- Relaciones
  user_id UUID REFERENCES users(id), -- Usuario propietario
  investment_id UUID REFERENCES investments(id), -- Proyecto relacionado
  
  -- Trazabilidad
  action_type TEXT NOT NULL, -- 'created', 'funded', 'transferred', 'withdrawn'
  amount DECIMAL(15,2), -- Cantidad involucrada
  currency TEXT DEFAULT 'EUR', -- Moneda
  
  -- Metadatos
  transaction_hash TEXT, -- Hash de la transacción
  timestamp BIGINT NOT NULL, -- Timestamp del evento
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```
**¿Qué es?** Trazabilidad general de todas las wallets
**¿Por qué separada?** Auditoría completa de movimientos

---

### **BLOCKCHAIN (2 tablas)**

#### **21. blockchain_balances**
```sql
CREATE TABLE blockchain_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  investment_id UUID REFERENCES investments(id) ON DELETE CASCADE,
  
  -- Datos del balance
  token_address TEXT NOT NULL, -- Dirección del token
  balance_wei TEXT NOT NULL, -- Balance en Wei (string para precisión)
  snapshot_id INTEGER DEFAULT 1, -- ID del snapshot
  
  -- Metadatos
  last_updated TIMESTAMPTZ DEFAULT NOW(), -- Última actualización
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Índice único
  UNIQUE(user_id, investment_id, token_address, snapshot_id)
);
```
**¿Qué es?** Balances actuales de tokens blockchain
**¿Por qué separada?** Estado actual vs historial de transacciones

#### **22. blockchain_transactions**
```sql
CREATE TABLE blockchain_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_hash TEXT UNIQUE NOT NULL, -- Hash único de la transacción
  
  -- Relaciones
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  investment_id UUID REFERENCES investments(id) ON DELETE CASCADE,
  
  -- Datos de la transacción
  address TEXT NOT NULL, -- Dirección de la wallet
  amount_wei TEXT NOT NULL, -- Cantidad en Wei
  
  -- Metadatos
  timestamp BIGINT NOT NULL, -- Timestamp de la transacción
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```
**¿Qué es?** Transacciones individuales blockchain
**¿Por qué separada?** Historial completo vs estado actual

---

### **KYC Y VERIFICACIÓN (1 tabla)**

#### **23. kyc_verifications**
```sql
CREATE TABLE kyc_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_identifier TEXT UNIQUE, -- ID externo del proveedor KYC
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Datos de verificación
  document_type TEXT CHECK (document_type IN ('PASSPORT', 'NATIONAL_ID', 'DRIVERS_LICENSE', 'UTILITY_BILL', 'BANK_STATEMENT', 'EMPLOYMENT_LETTER', 'TAX_DOCUMENT', 'BUSINESS_LICENSE', 'ARTICLES_OF_INCORPORATION', 'CUSTOM')),
  document_number TEXT, -- Número del documento
  
  -- Documentos subidos
  documents JSONB, -- { document_front, document_back, selfie, proof_of_address }
  
  -- Información personal
  personal_info JSONB, -- { firstName, lastName, dateOfBirth, nationality, address }
  employment_info JSONB, -- { employer, position, startDate, salary, currency }
  
  -- Estado de la verificación
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')),
  
  -- Metadatos
  source TEXT, -- Origen de la verificación
  ip_address INET, -- IP del usuario
  user_agent TEXT, -- User agent del navegador
  additional_notes TEXT, -- Notas adicionales
  marketing_consent BOOLEAN, -- Consentimiento de marketing
  terms_accepted BOOLEAN, -- Aceptación de términos
  referral_code TEXT, -- Código de referido
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```
**¿Qué es?** Verificaciones KYC de usuarios (unificada de múltiples colecciones)
**¿Por qué unificada?** Una verificación = Una fila, errores como estados
**Unificaciones:** kyc-results + verification-errors-kyc

---

### **DOCUMENTOS (2 tablas)**

#### **24. documents**
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Datos del documento
  title TEXT NOT NULL, -- Título del documento
  description TEXT, -- Descripción
  document_type TEXT CHECK (document_type IN ('legal', 'transaction', 'project', 'user')),
  file_name TEXT NOT NULL, -- Nombre del archivo
  file_url TEXT NOT NULL, -- URL del archivo
  
  -- Relaciones
  user_id UUID REFERENCES users(id), -- Usuario propietario
  investment_id UUID REFERENCES investments(id), -- Proyecto relacionado
  
  -- Metadatos
  uploaded_by UUID REFERENCES users(id), -- Quién subió el documento
  is_active BOOLEAN DEFAULT TRUE, -- Si está activo
  version TEXT, -- Versión del documento
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```
**¿Qué es?** Documentos generales y de transacciones
**¿Por qué unificada?** Gestión unificada de documentos
**Unificaciones:** user-tx-documents + general-documentation

#### **25. fiscal_documents**
```sql
CREATE TABLE fiscal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Datos del documento
  document_type TEXT NOT NULL, -- 'tax_document', 'residence_change', 'retention_form'
  file_name TEXT NOT NULL, -- Nombre del archivo
  file_url TEXT NOT NULL, -- URL del archivo
  
  -- Información fiscal
  country_of_residence TEXT, -- País de residencia
  retention_percentage DECIMAL(5,2), -- Porcentaje de retención
  is_change_request BOOLEAN DEFAULT FALSE, -- Si es solicitud de cambio
  
  -- Estado del documento
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')),
  
  -- Fechas
  upload_date TIMESTAMPTZ DEFAULT NOW(), -- Fecha de subida
  approval_date TIMESTAMPTZ, -- Fecha de aprobación
  expiry_date TIMESTAMPTZ, -- Fecha de expiración
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```
**¿Qué es?** Documentos fiscales y solicitudes de cambio de residencia
**¿Por qué unificada?** Ambos relacionados con documentación fiscal
**Unificaciones:** fiscal-documents + residence-change-request

---

### **CONFIGURACIÓN DEL SISTEMA (2 tablas)**

#### **26. system_config**
```sql
CREATE TABLE system_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL, -- 'dapp', 'fiscal', 'legal', 'general', 'cache'
  key TEXT NOT NULL, -- Clave de configuración
  value JSONB NOT NULL, -- Valor de configuración
  description TEXT, -- Descripción
  is_active BOOLEAN DEFAULT TRUE, -- Si está activa
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Índice único por categoría y clave
  UNIQUE(category, key)
);
```
**¿Qué es?** Configuraciones del sistema
**¿Por qué unificada?** Gestión centralizada de configuraciones
**Unificaciones:** config + dapp + cache-balance

#### **27. admin_keys**
```sql
CREATE TABLE admin_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_uid TEXT NOT NULL, -- UID del administrador
  encrypted_key TEXT NOT NULL, -- Clave encriptada
  key_type TEXT CHECK (key_type IN ('blockchain', 'system')), -- Tipo de clave
  is_active BOOLEAN DEFAULT TRUE, -- Si está activa
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```
**¿Qué es?** Claves encriptadas de administradores
**¿Por qué separada?** Seguridad, claves sensibles separadas

---

### **CATÁLOGOS (4 tablas)**

#### **28. countries**
```sql
CREATE TABLE countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL, -- ISO 3166-1 alpha-2
  name TEXT NOT NULL, -- Nombre del país
  is_active BOOLEAN DEFAULT TRUE, -- Si está activo
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```
**¿Qué es?** Catálogo de países
**¿Por qué separada?** Datos de referencia, no cambian frecuentemente

#### **29. company_cifs**
```sql
CREATE TABLE company_cifs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cif TEXT UNIQUE NOT NULL, -- CIF de la empresa
  company_name TEXT, -- Nombre de la empresa
  is_active BOOLEAN DEFAULT TRUE, -- Si está activo
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```
**¿Qué es?** Catálogo de CIFs de empresas
**¿Por qué separada?** Datos de referencia para validación

#### **30. legal_documents**
```sql
CREATE TABLE legal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT UNIQUE NOT NULL, -- 'passport', 'national_id', 'drivers_license'
  description TEXT, -- Descripción del tipo de documento
  is_active BOOLEAN DEFAULT TRUE, -- Si está activo
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```
**¿Qué es?** Catálogo de tipos de documentos legales
**¿Por qué separada?** Datos de referencia para KYC

#### **31. retention_rates**
```sql
CREATE TABLE retention_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL, -- Código del país
  rate_percentage DECIMAL(5,2) NOT NULL, -- Porcentaje de retención
  is_active BOOLEAN DEFAULT TRUE, -- Si está activo
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(country_code)
);
```
**¿Qué es?** Tasas de retención por país
**¿Por qué separada?** Datos de referencia para cálculos fiscales

---

### **BONIFICACIONES (1 tabla)**

#### **32. user_bonuses**
```sql
CREATE TABLE user_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  investment_id UUID REFERENCES investments(id) ON DELETE CASCADE,
  
  -- Datos del bono
  amount DECIMAL(15,2) NOT NULL, -- Cantidad del bono
  percentage DECIMAL(5,2), -- Porcentaje del bono
  currency TEXT DEFAULT 'EUR', -- Moneda
  
  -- Estado del bono
  status TEXT CHECK (status IN ('CONFIGURED', 'APPLIED', 'EXPIRED')),
  reserve_status TEXT CHECK (reserve_status IN ('PENDING', 'MINTED', 'FAILED')),
  
  -- Metadatos
  applied_at TEXT, -- Cuándo se aplicó
  configured_at BIGINT, -- Cuándo se configuró
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```
**¿Qué es?** Bonificaciones y recompensas de usuarios
**¿Por qué separada?** Funcionalidad específica de bonificaciones

---

### **AUDITORÍA (1 tabla)**

#### **33. audit_logs**
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Datos del evento
  event_type TEXT NOT NULL, -- 'create', 'update', 'delete'
  entity_type TEXT NOT NULL, -- 'user', 'investment', 'transaction', 'role'
  entity_id TEXT NOT NULL, -- ID de la entidad
  
  -- Usuario que realizó la acción
  user_id UUID REFERENCES users(id), -- Quién hizo el cambio
  
  -- Datos del cambio
  old_values JSONB, -- Valores anteriores
  new_values JSONB, -- Valores nuevos
  changes JSONB, -- Cambios específicos
  
  -- Metadatos
  ip_address INET, -- IP del usuario
  user_agent TEXT, -- User agent
  timestamp TIMESTAMPTZ DEFAULT NOW() -- Cuándo ocurrió
);
```
**¿Qué es?** Logs de auditoría de todos los cambios en el sistema
**¿Por qué separada?** Auditoría completa, compliance regulatorio

---

## 📊 RESUMEN FINAL

### **33 TABLAS OPTIMIZADAS:**

1. **Sistema de Roles** (4 tablas) - Control de acceso granular
2. **Usuarios y Autenticación** (3 tablas) - Gestión de usuarios y seguridad
3. **Inversiones y Proyectos** (3 tablas) - Core del negocio
4. **Transacciones** (3 tablas) - Movimientos financieros
5. **Reservas** (2 tablas) - Reservas antes de transacciones
6. **Dividendos** (2 tablas) - Distribución de ganancias
7. **Carteras** (3 tablas) - Gestión de fondos
8. **Blockchain** (2 tablas) - Integración con blockchain
9. **KYC** (1 tabla) - Verificación de identidad
10. **Documentos** (2 tablas) - Gestión documental
11. **Configuración** (2 tablas) - Configuraciones del sistema
12. **Catálogos** (4 tablas) - Datos de referencia
13. **Bonificaciones** (1 tabla) - Sistema de recompensas
14. **Auditoría** (1 tabla) - Logs de cambios

### **CARACTERÍSTICAS:**
- ✅ **Normalización óptima**: Sin duplicación excesiva
- ✅ **Integridad referencial**: Foreign keys completas
- ✅ **Performance**: Índices estratégicos
- ✅ **Escalabilidad**: Preparado para crecimiento
- ✅ **Auditoría**: Logs completos
- ✅ **Seguridad**: Sistema robusto de permisos
