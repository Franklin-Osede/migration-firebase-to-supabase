# 🗺️ MAPEO COMPLETO: Firebase → Supabase

## 📊 **PROYECTO**: domoblock-devnew
## 🏢 **ORGANIZACIÓN**: DomoBlock
## 🔄 **ESTRATEGIA**: Solo lectura de Firebase + Escritura en Supabase

---

## 🔥 **COLECCIONES FIREBASE IDENTIFICADAS**

### **1. Sistema de Usuarios**
- `users` → `users` + `user_profiles`
- `user-profiles` → `user_profiles`
- `kyc-results` → `kyc_verifications`
- `verification-errors-kyc` → `kyc_verifications`

### **2. Inversiones y Proyectos**
- `investments` → `investments`
- `user-investments` → `user_investments`
- `user-investments-cache` → `user_investments`
- `user-projects` → `user_investments`
- `projects-timeline` → `project_timeline`

### **3. Transacciones Financieras**
- `transactions-mangopay` → `transactions_mangopay`
- `transactions-blockchain` → `transactions_blockchain`
- `bank-transfers` → `bank_transfers`
- `withdraws-mangopay` → `withdrawals`

### **4. Reservas y Tokens**
- `reserves` → `reserves`
- `reserves-blockchain` → `reserves_blockchain`
- `w-invest` → `blockchain_balances`
- `w-invest-tx` → `transactions_blockchain`

### **5. Dividendos**
- `dividends` → `dividends`
- `dividend-claims` → `dividend_claims`
- `dividends-mangopay` → `dividends`
- `dividends-user` → `dividend_claims`

### **6. Carteras y Wallets**
- `wallets` → `wallets`
- `wallets-by-company` → `wallets`
- `wallet-transactions` → `wallet_transactions`
- `wallet-balances` → `wallet_balances`

### **7. Documentos y KYC**
- `documents` → `documents`
- `user-tx-documents` → `documents`
- `general-documentation` → `documents`
- `fiscal-documents` → `fiscal_documents`
- `residence-change-request` → `fiscal_documents`

### **8. Configuración y Sistema**
- `config` → `system_config`
- `dapp` → `system_config`
- `cache-balance` → `cache_data`
- `system-settings` → `system_config`

### **9. Notificaciones y Preferencias**
- `user-notifications` → `user_notifications`
- `user-panel` → `user_preferences`
- `notification-settings` → `user_preferences`

### **10. Bonificaciones y Promociones**
- `user-bonuses` → `user_bonuses`
- `bonus-requests` → `user_bonuses`
- `promotions` → `user_bonuses`

### **11. Auditoría y Logs**
- `admin-actions` → `admin_audit_log`
- `audit-logs` → `audit_logs`
- `system-logs` → `audit_logs`

### **12. Catálogos y Referencias**
- `countries` → `countries`
- `currencies` → `system_config`
- `transaction-types` → `transaction_types`
- `project-statuses` → `project_statuses`

---

## 🔄 **ESTRATEGIA DE MIGRACIÓN**

### **FASE 1: Preparación**
1. ✅ Crear esquemas en Supabase (36 tablas)
2. ✅ Configurar scripts de migración
3. ✅ Validar conectividad

### **FASE 2: Migración por Prioridad**
1. **ALTA PRIORIDAD**: `users`, `investments`, `transactions`
2. **MEDIA PRIORIDAD**: `reserves`, `dividends`, `wallets`
3. **BAJA PRIORIDAD**: `documents`, `kyc`, `config`

### **FASE 3: Validación**
1. ✅ Verificar integridad de datos
2. ✅ Comparar conteos entre Firebase y Supabase
3. ✅ Validar relaciones y referencias

---

## 📋 **COLECCIONES A MIGRAR (ORDEN DE PRIORIDAD)**

### **PRIORIDAD 1 - Core Business**
- [ ] `users` (usuarios del sistema)
- [ ] `investments` (proyectos de inversión)
- [ ] `user-investments` (inversiones de usuarios)
- [ ] `transactions-mangopay` (transacciones principales)

### **PRIORIDAD 2 - Financiero**
- [ ] `reserves` (reservas de tokens)
- [ ] `dividends` (dividendos)
- [ ] `wallets` (carteras)
- [ ] `bank-transfers` (transferencias bancarias)

### **PRIORIDAD 3 - Operacional**
- [ ] `documents` (documentos)
- [ ] `kyc-results` (verificaciones KYC)
- [ ] `user-notifications` (notificaciones)
- [ ] `config` (configuración del sistema)

### **PRIORIDAD 4 - Auditoría**
- [ ] `admin-actions` (acciones administrativas)
- [ ] `audit-logs` (logs del sistema)
- [ ] `system-logs` (logs técnicos)

---

## 🎯 **OBJETIVOS DE LA MIGRACIÓN**

### **✅ MANTENER EN FIREBASE:**
- Todos los datos originales
- Estructura de colecciones
- IDs de documentos
- Timestamps originales

### **✅ CREAR EN SUPABASE:**
- 36 tablas normalizadas
- Relaciones optimizadas
- Índices para rendimiento
- Auditoría completa

### **✅ RESULTADO FINAL:**
- Firebase: Base original intacta
- Supabase: Base optimizada con datos migrados
- Aplicación: Puede usar cualquiera de las dos
- Migración: 100% segura y reversible

---

## 🚀 **PRÓXIMOS PASOS**

1. **Configurar credenciales de Supabase**
2. **Crear esquemas SQL en Supabase**
3. **Ejecutar migración por prioridades**
4. **Validar integridad de datos**
5. **Configurar aplicación para usar Supabase**

---

*Mapeo creado para proyecto: domoblock-devnew*
*Fecha: $(date)*
*Estado: Preparado para migración*
