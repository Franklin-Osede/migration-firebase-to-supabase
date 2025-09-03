# Migración Firebase a Supabase - ETL de Solo Lectura

## 📋 Resumen del Proyecto

Este proyecto implementa una migración ETL (Extract, Transform, Load) de **solo lectura** desde Firebase Firestore a Supabase PostgreSQL, manteniendo todos los datos originales intactos en Firebase.

### 🎯 Objetivos
- **Migración sin pérdida de datos**: Solo lectura desde Firebase
- **Esquema optimizado**: 34 tablas normalizadas en Supabase
- **Preservación de funcionalidad**: Todas las características del sistema original
- **Migración incremental**: Proceso seguro y controlado

## 🏗️ Arquitectura del Sistema

### **Flujos Principales Identificados:**

#### **1. Flujo de Inversión Completa:**
```javascript
// 1. Usuario reserva tokens (reserveProject)
// 2. Se crea registro en 'reserves' 
// 3. Se transfiere dinero de wallet a proyecto (transferFunds)
// 4. Se mintean tokens NFT (mintToken)
// 5. Se registra en 'transactions-mangopay'
// 6. Se genera PDF y se envía email
```

#### **2. Flujo de Recarga de Wallet:**
```javascript
// 1. Usuario hace transferencia bancaria
// 2. Sistema recibe confirmación (BankService)
// 3. Se registra en 'bank' collection
// 4. Se recarga wallet de Mangopay
// 5. Se envía email de confirmación
```

#### **3. Flujo de Dividendos:**
```javascript
// 1. Se crean dividendos (createDividends)
// 2. Se registra en 'dividends-mangopay'
// 3. Usuario reclama dividendos (claimDividend)
// 4. Se transfiere dinero del proyecto al usuario
// 5. Se registra en 'dividends-user'
```

## 📊 Esquema Final - 34 Tablas

### **1. Sistema de Roles (4 tablas)**
- `roles` - Roles del sistema
- `permissions` - Permisos por rol
- `role_assignments` - Asignación de roles a usuarios
- `admin_actions` - Auditoría de acciones administrativas

### **2. Usuarios y Autenticación (3 tablas)**
- `users` - Información principal de usuarios
- `user_profiles` - Perfiles extendidos (particular/empresa)
- `two_factor_auth` - Configuración 2FA

### **3. Inversiones y Proyectos (3 tablas)**
- `investments` - Proyectos de inversión
- `user_investments` - Inversiones de usuarios (unificadas)
- `project_timeline` - Timeline de proyectos

### **4. Transacciones (4 tablas)**
- `transactions_mangopay` - Inversiones desde wallet Mangopay
- `transactions_blockchain` - Inversiones directas en blockchain
- `bank_transfers` - Transferencias bancarias para recarga de wallet
- `withdrawals` - Retiros de fondos

### **5. Reservas (2 tablas)**
- `reserves` - Reservas de tokens con Mangopay
- `reserves_blockchain` - Reservas con blockchain

### **6. Dividendos (2 tablas)**
- `dividends` - Dividendos por proyecto
- `dividend_claims` - Reclamos de dividendos por usuario

### **7. Carteras (3 tablas)**
- `wallets` - Carteras de usuarios
- `wallet_transactions` - Transacciones de carteras
- `wallet_balances` - Balances actuales

### **8. Blockchain (2 tablas)**
- `blockchain_balances` - Balance actual de tokens por proyecto
- `blockchain_transactions` - Historial de transacciones blockchain

### **9. KYC (1 tabla)**
- `kyc_verifications` - Verificaciones KYC unificadas

### **10. Documentos (2 tablas)**
- `documents` - Documentos generales
- `fiscal_documents` - Documentos fiscales

### **11. Configuración (2 tablas)**
- `system_config` - Configuración del sistema
- `cache_data` - Datos en caché

### **12. Catálogos (4 tablas)**
- `countries` - Países
- `currencies` - Monedas
- `project_statuses` - Estados de proyectos
- `transaction_types` - Tipos de transacción

### **13. Bonificaciones (1 tabla)**
- `user_bonuses` - Bonificaciones de usuarios

### **14. Auditoría (1 tabla)**
- `audit_logs` - Logs de auditoría

## 🔄 Unificaciones Realizadas

### **✅ Unificaciones Confirmadas:**

#### **1. Usuarios y Notificaciones:**
```sql
-- users + user-notifications + two-factor-auth → users
-- user_investments + user-projects + user-investments-cache → user_investments
```

#### **2. Transacciones:**
```sql
-- transactions-mangopay + bank → transactions_mangopay (CORREGIDO)
-- bank → bank_transfers (NUEVA TABLA SEPARADA)
```

#### **3. Carteras:**
```sql
-- walletsByCompany + users-walletsByCompany + mangopay → wallets
```

#### **4. KYC:**
```sql
-- kyc-results + verification-errors-kyc → kyc_verifications
```

#### **5. Documentos:**
```sql
-- user-tx-documents + general-documentation → documents
-- fiscal-documents + residence-change-request → fiscal_documents
```

#### **6. Configuración:**
```sql
-- config + dapp + cache-balance → system_config
```

### **✅ Separaciones Confirmadas:**

#### **1. Transacciones por Tipo:**
- **`bank_transfers`**: Recargas de wallet por transferencia bancaria
- **`transactions_mangopay`**: Inversiones en proyectos usando wallet
- **`transactions_blockchain`**: Inversiones directas en blockchain

#### **2. Reservas por Tipo:**
- **`reserves`**: Reservas con Mangopay
- **`reserves_blockchain`**: Reservas con blockchain

#### **3. Blockchain:**
- **`blockchain_balances`**: Balance actual de tokens
- **`blockchain_transactions`**: Historial de transacciones blockchain

#### **4. Dividendos:**
- **`dividends`**: Dividendos por proyecto
- **`dividend_claims`**: Reclamos por usuario

## 🚀 Estrategia de Migración

### **Fase 1: Preparación**
1. **Configuración de entornos**
2. **Validación de esquemas**
3. **Creación de scripts de migración**

### **Fase 2: Migración Incremental**
1. **Migración de catálogos** (países, monedas, etc.)
2. **Migración de usuarios** (sin datos sensibles)
3. **Migración de proyectos**
4. **Migración de transacciones**
5. **Migración de blockchain**

### **Fase 3: Validación**
1. **Verificación de integridad**
2. **Pruebas de funcionalidad**
3. **Optimización de rendimiento**

## 📈 Optimizaciones Implementadas

### **1. Normalización de Datos**
- Eliminación de redundancias
- Separación de responsabilidades
- Mejora de integridad referencial

### **2. Índices Optimizados**
- Índices en claves foráneas
- Índices en campos de búsqueda frecuente
- Índices compuestos para consultas complejas

### **3. Funciones y Triggers**
- Cálculo automático de balances
- Auditoría automática de cambios
- Validación de datos en tiempo real

### **4. Particionamiento**
- Particionamiento por fecha en transacciones
- Particionamiento por usuario en logs
- Optimización de consultas históricas

## 🔧 Tecnologías Utilizadas

- **Firebase CLI**: Extracción de datos
- **Node.js**: Scripts de migración
- **PostgreSQL**: Base de datos destino
- **Supabase**: Plataforma de base de datos
- **Winston**: Logging
- **Commander**: CLI interface

## 📝 Notas Importantes

### **Preservación de Datos:**
- ✅ **Solo lectura** desde Firebase
- ✅ **Sin eliminación** de datos originales
- ✅ **Migración incremental** y segura

### **Compatibilidad:**
- ✅ **Firebase UIDs** preservados como `firebase_uid`
- ✅ **Document IDs** preservados como `firebase_id`
- ✅ **Timestamps** convertidos a `TIMESTAMPTZ`

### **Funcionalidad:**
- ✅ **Todos los flujos** preservados
- ✅ **Relaciones** mantenidas
- ✅ **Integridad** garantizada

## 🎯 Resultado Final

**34 tablas optimizadas** que mantienen toda la funcionalidad del sistema original mientras proporcionan:

- **Mejor rendimiento** en consultas complejas
- **Mayor integridad** de datos
- **Escalabilidad** mejorada
- **Mantenimiento** simplificado
- **Auditoría** completa de cambios

---

*Este esquema representa la versión final y optimizada del sistema, resultado de un análisis exhaustivo de todos los flujos de negocio y requerimientos técnicos.*
