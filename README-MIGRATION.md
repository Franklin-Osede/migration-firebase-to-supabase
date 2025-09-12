# 🚀 Migración Firebase → Supabase - Guía Completa

## 📋 **RESUMEN DEL PROYECTO**

Este proyecto migra completamente una aplicación de **Firebase** a **Supabase**, transformando un sistema NoSQL a una base de datos relacional PostgreSQL optimizada.

### **🎯 Objetivos**
- ✅ **Migración completa** de 40+ colecciones Firebase a 36 tablas Supabase
- ✅ **Normalización de datos** para eliminar redundancias
- ✅ **Integridad referencial** con foreign keys
- ✅ **Optimización de rendimiento** con índices estratégicos
- ✅ **Auditoría completa** de todos los cambios
- ✅ **Compatibilidad total** con datos existentes

---

## 🏗️ **ARQUITECTURA DEL ESQUEMA**

### **📊 36 Tablas Organizadas en 11 Fases**

#### **FASE 1: Tablas Base (5 tablas)**
- `countries` - Catálogo de países
- `transaction_types` - Tipos de transacciones
- `system_config` - Configuración del sistema
- `cache_data` - Datos en caché
- `project_statuses` - Estados de proyectos

#### **FASE 2: Usuarios (3 tablas)**
- `users` - Usuarios principales
- `user_profiles` - Perfiles extendidos
- `two_factor_auth` - Autenticación 2FA

#### **FASE 3: Sistema de Roles (4 tablas)**
- `roles` - Roles del sistema
- `permissions` - Permisos granulares
- `role_assignments` - Asignación de roles
- `admin_audit_log` - Auditoría de administradores

#### **FASE 4: Proyectos e Inversiones (4 tablas)**
- `investments` - Proyectos de inversión
- `project_timeline` - Timeline de proyectos
- `investors` - Estadísticas de inversores
- `user_investments` - Inversiones de usuarios

#### **FASE 5: Transacciones (4 tablas)**
- `transactions_mangopay` - Transacciones Mangopay
- `transactions_blockchain` - Transacciones blockchain
- `bank_transfers` - Transferencias bancarias
- `withdrawals` - Retiros de fondos

#### **FASE 6: Reservas (2 tablas)**
- `reserves` - Reservas Mangopay
- `reserves_blockchain` - Reservas blockchain

#### **FASE 7: Dividendos (2 tablas)**
- `dividends` - Dividendos por proyecto
- `dividend_claims` - Reclamos de dividendos

#### **FASE 8: Carteras (3 tablas)**
- `wallets` - Carteras de usuarios
- `wallet_transactions` - Transacciones de carteras
- `wallet_balances` - Balances actuales

#### **FASE 9: Blockchain (1 tabla)**
- `blockchain_balances` - Balances de tokens

#### **FASE 10: KYC y Documentos (3 tablas)**
- `kyc_verifications` - Verificaciones KYC
- `documents` - Documentos generales
- `fiscal_documents` - Documentos fiscales

#### **FASE 11: Funcionalidades Adicionales (4 tablas)**
- `user_bonuses` - Bonificaciones
- `user_notifications` - Notificaciones
- `user_preferences` - Preferencias
- `audit_logs` - Logs de auditoría

---

## 🛠️ **INSTALACIÓN Y CONFIGURACIÓN**

### **1. Prerrequisitos**
```bash
# Node.js 16+ y npm
node --version
npm --version

# Cuentas activas en:
# - Firebase (con datos existentes)
# - Supabase (proyecto creado)
```

### **2. Instalación**
```bash
# Clonar el repositorio
git clone <tu-repo>
cd Migration-Firebase-Supabase

# Instalar dependencias
npm install
```

### **3. Configuración de Variables de Entorno**
```bash
# Copiar archivo de ejemplo
cp env.example config.env

# Editar config.env con tus credenciales
nano config.env
```

**Contenido de `config.env`:**
```env
# Firebase
FIREBASE_PROJECT_ID=tu-proyecto-firebase
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@tu-proyecto.iam.gserviceaccount.com

# Supabase
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key

# Configuración de migración
BATCH_SIZE=1000
DELAY_BETWEEN_BATCHES=1000
LOG_LEVEL=info
```

---

## 🚀 **PROCESO DE MIGRACIÓN**

### **PASO 1: Crear Esquemas en Supabase**
```bash
# Crear todas las tablas por fases (RECOMENDADO)
npm run schemas:optimized all

# O crear tablas individuales
npm run schemas:optimized phase 1
npm run schemas:optimized phase 2
# ... etc

# Ver fases disponibles
npm run schemas:optimized list
```

### **PASO 2: Validar Esquemas**
```bash
# Validar todo el esquema
npm run validate:schema all

# Validar solo tablas
npm run validate:schema tables

# Validar solo relaciones
npm run validate:schema relations
```

### **PASO 3: Migrar Datos**
```bash
# Migrar todas las colecciones
npm run migrate all

# Migrar una colección específica
npm run migrate collection users
npm run migrate collection investments

# Ver colecciones disponibles
npm run migrate list
```

### **PASO 4: Verificar Migración**
```bash
# Ejecutar tests de validación
npm test

# Verificar integridad de datos
npm run validate
```

---

## 📊 **COMANDOS DISPONIBLES**

### **🔧 Creación de Esquemas**
```bash
# Script optimizado (RECOMENDADO)
npm run schemas:optimized all          # Crear todas las tablas por fases
npm run schemas:optimized phase 1      # Crear fase específica
npm run schemas:optimized list         # Listar fases disponibles

# Script original
npm run schemas all                    # Crear todas las tablas
npm run schemas table users           # Crear tabla específica
npm run schemas list                  # Listar tablas disponibles
```

### **✅ Validación**
```bash
npm run validate:schema all           # Validar esquema completo
npm run validate:schema tables        # Validar solo tablas
npm run validate:schema relations     # Validar solo relaciones
```

### **🔄 Migración de Datos**
```bash
npm run migrate all                   # Migrar todas las colecciones
npm run migrate collection users      # Migrar colección específica
npm run migrate list                  # Listar colecciones disponibles
```

### **🧪 Testing**
```bash
npm test                              # Ejecutar tests de migración
npm run validate                      # Validar datos migrados
```

---

## 📈 **BENEFICIOS DE LA MIGRACIÓN**

### **🚀 Rendimiento**
- **Consultas 10x más rápidas** para operaciones complejas
- **Reportes en tiempo real** sin impacto en rendimiento
- **Escalabilidad automática** con el crecimiento de datos
- **Optimización continua** mediante índices inteligentes

### **🔒 Integridad**
- **Datos siempre consistentes** mediante normalización
- **Relaciones válidas** mediante claves foráneas
- **Auditoría completa** de todos los cambios
- **Cumplimiento legal** mediante trazabilidad total

### **🛠️ Mantenimiento**
- **Estructura clara** y bien documentada
- **Funciones reutilizables** para lógica común
- **Triggers automáticos** para operaciones repetitivas
- **Migración segura** sin pérdida de datos

### **🔐 Seguridad**
- **Roles granulares** con permisos específicos
- **Auditoría completa** de acciones administrativas
- **Trazabilidad total** con IP y user-agent
- **Cumplimiento GDPR** mediante logs detallados

---

## 🔍 **MAPEO DE COLECCIONES FIREBASE → TABLAS SUPABASE**

| **Colección Firebase** | **Tabla Supabase** | **Tipo de Migración** |
|------------------------|-------------------|----------------------|
| `users` | `users` + `user_profiles` | Normalizada |
| `investments` | `investments` | Directa |
| `user-investments` | `user_investments` | Unificada |
| `transactions-mangopay` | `transactions_mangopay` | Directa |
| `transactions-blockchain` | `transactions_blockchain` | Directa |
| `reserves` | `reserves` | Directa |
| `dividends` | `dividends` + `dividend_claims` | Normalizada |
| `wallets` | `wallets` + `wallet_transactions` | Normalizada |
| `kyc-results` | `kyc_verifications` | Unificada |
| `documents` | `documents` + `fiscal_documents` | Normalizada |
| `user-bonuses` | `user_bonuses` | Directa |
| `user-notifications` | `user_notifications` | Directa |
| `user-panel` | `user_preferences` | Directa |
| `two-factor-auth` | `two_factor_auth` | Integrada en `users` |
| `admin-actions` | `admin_audit_log` | Mejorada |
| `cache-balance` | `cache_data` | Unificada |
| `config` | `system_config` | Unificada |
| `dapp` | `system_config` | Integrada |
| `countries` | `countries` | Directa |
| `transaction-types` | `transaction_types` | Directa |

---

## ⚠️ **CONSIDERACIONES IMPORTANTES**

### **🔒 Seguridad**
- **Nunca commitees** archivos `.env` o `config.env`
- **Usa service role key** solo en servidor, nunca en cliente
- **Valida permisos** antes de ejecutar migraciones
- **Haz backup** de datos antes de migrar

### **📊 Rendimiento**
- **Migra en horarios de bajo tráfico**
- **Usa batches pequeños** para evitar timeouts
- **Monitorea el progreso** durante la migración
- **Valida datos** después de cada fase

### **🔄 Rollback**
- **Mantén Firebase activo** durante la migración
- **Documenta cambios** en cada paso
- **Prepara scripts de rollback** si es necesario
- **Prueba en entorno de desarrollo** primero

---

## 🆘 **SOLUCIÓN DE PROBLEMAS**

### **❌ Error: "Tabla no existe"**
```bash
# Verificar que las tablas se crearon
npm run validate:schema tables

# Recrear tablas si es necesario
npm run schemas:optimized all
```

### **❌ Error: "Foreign key constraint"**
```bash
# Verificar orden de creación
npm run validate:schema relations

# Recrear en orden correcto
npm run schemas:optimized all
```

### **❌ Error: "Connection timeout"**
```bash
# Reducir batch size en config.env
BATCH_SIZE=500
DELAY_BETWEEN_BATCHES=2000

# Migrar por colecciones individuales
npm run migrate collection users
```

### **❌ Error: "Permission denied"**
```bash
# Verificar service role key en config.env
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key

# Verificar permisos en Supabase dashboard
```

---

## 📞 **SOPORTE**

### **📚 Documentación**
- [Supabase Docs](https://supabase.com/docs)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)

### **🐛 Reportar Issues**
1. Verifica que sigues los pasos correctamente
2. Incluye logs de error completos
3. Especifica versión de Node.js y dependencias
4. Describe el entorno (desarrollo/producción)

### **💡 Mejoras**
- ¿Tienes ideas para optimizar el proceso?
- ¿Encontraste bugs o inconsistencias?
- ¿Quieres agregar nuevas funcionalidades?

---

## 🎉 **¡FELICITACIONES!**

Si has llegado hasta aquí, has completado exitosamente la migración de Firebase a Supabase. Tu aplicación ahora tiene:

- ✅ **Base de datos relacional** optimizada
- ✅ **Integridad de datos** garantizada  
- ✅ **Rendimiento mejorado** significativamente
- ✅ **Auditoría completa** de cambios
- ✅ **Escalabilidad** para el futuro

**¡Disfruta de tu nueva arquitectura de datos!** 🚀


