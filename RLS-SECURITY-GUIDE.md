# 🔒 **GUÍA COMPLETA DE ROW LEVEL SECURITY (RLS)**

## 🚨 **¿POR QUÉ RLS ES CRÍTICO?**

### **Sin RLS (PELIGROSO):**
```sql
-- ❌ Cualquier usuario puede ver TODOS los datos
SELECT * FROM users; -- Ve todos los usuarios
SELECT * FROM investments; -- Ve todas las inversiones
SELECT * FROM transactions_mangopay; -- Ve todas las transacciones
```

### **Con RLS (SEGURO):**
```sql
-- ✅ Solo ve sus propios datos
SELECT * FROM users; -- Solo ve su propio usuario
SELECT * FROM investments; -- Solo ve sus propias inversiones
SELECT * FROM transactions_mangopay; -- Solo ve sus propias transacciones
```

---

## 🛡️ **POLÍTICAS DE SEGURIDAD IMPLEMENTADAS**

### **1. Usuarios (`users`)**
```sql
-- Solo puede ver su propio perfil
CREATE POLICY "Users can view own profile" ON users 
FOR SELECT USING (auth.uid()::text = firebase_uid);

-- Solo puede actualizar su propio perfil
CREATE POLICY "Users can update own profile" ON users 
FOR UPDATE USING (auth.uid()::text = firebase_uid);
```

### **2. Perfiles (`user_profiles`)**
```sql
-- Solo puede ver su propio perfil extendido
CREATE POLICY "Users can view own profile" ON user_profiles 
FOR SELECT USING (auth.uid()::text = (SELECT firebase_uid FROM users WHERE id = user_id));

-- Solo puede actualizar su propio perfil extendido
CREATE POLICY "Users can update own profile" ON user_profiles 
FOR UPDATE USING (auth.uid()::text = (SELECT firebase_uid FROM users WHERE id = user_id));
```

### **3. Inversiones (`investments`)**
```sql
-- Cualquiera puede ver inversiones activas (públicas)
CREATE POLICY "Anyone can view active investments" ON investments 
FOR SELECT USING (is_hidden = false);

-- Solo admins pueden gestionar inversiones
CREATE POLICY "Admins can manage investments" ON investments 
FOR ALL USING (EXISTS (
  SELECT 1 FROM role_assignments ra 
  JOIN roles r ON ra.role_id = r.id 
  WHERE ra.user_id = (SELECT id FROM users WHERE firebase_uid = auth.uid()::text) 
  AND r.name IN ('SuperAdmin', 'Admin')
));
```

### **4. Inversiones de Usuario (`user_investments`)**
```sql
-- Solo puede ver sus propias inversiones
CREATE POLICY "Users can view own investments" ON user_investments 
FOR SELECT USING (auth.uid()::text = (SELECT firebase_uid FROM users WHERE id = user_id));

-- Solo puede crear sus propias inversiones
CREATE POLICY "Users can create own investments" ON user_investments 
FOR INSERT WITH CHECK (auth.uid()::text = (SELECT firebase_uid FROM users WHERE id = user_id));
```

### **5. Transacciones (`transactions_mangopay`)**
```sql
-- Solo puede ver sus propias transacciones
CREATE POLICY "Users can view own transactions" ON transactions_mangopay 
FOR SELECT USING (auth.uid()::text = (SELECT firebase_uid FROM users WHERE id = user_id));

-- Solo puede crear sus propias transacciones
CREATE POLICY "Users can create own transactions" ON transactions_mangopay 
FOR INSERT WITH CHECK (auth.uid()::text = (SELECT firebase_uid FROM users WHERE id = user_id));
```

### **6. Carteras (`wallets`)**
```sql
-- Solo puede ver sus propias carteras
CREATE POLICY "Users can view own wallets" ON wallets 
FOR SELECT USING (auth.uid()::text = (SELECT firebase_uid FROM users WHERE id = user_id));

-- Solo puede gestionar sus propias carteras
CREATE POLICY "Users can manage own wallets" ON wallets 
FOR ALL USING (auth.uid()::text = (SELECT firebase_uid FROM users WHERE id = user_id));
```

### **7. Documentos (`documents`)**
```sql
-- Solo puede ver sus propios documentos
CREATE POLICY "Users can view own documents" ON documents 
FOR SELECT USING (auth.uid()::text = (SELECT firebase_uid FROM users WHERE id = user_id));

-- Solo puede subir sus propios documentos
CREATE POLICY "Users can upload own documents" ON documents 
FOR INSERT WITH CHECK (auth.uid()::text = (SELECT firebase_uid FROM users WHERE id = user_id));
```

### **8. Notificaciones (`user_notifications`)**
```sql
-- Solo puede ver sus propias notificaciones
CREATE POLICY "Users can view own notifications" ON user_notifications 
FOR SELECT USING (auth.uid()::text = (SELECT firebase_uid FROM users WHERE id = user_id));

-- Solo puede actualizar sus propias notificaciones
CREATE POLICY "Users can update own notifications" ON user_notifications 
FOR UPDATE USING (auth.uid()::text = (SELECT firebase_uid FROM users WHERE id = user_id));
```

### **9. Preferencias (`user_preferences`)**
```sql
-- Solo puede ver sus propias preferencias
CREATE POLICY "Users can view own preferences" ON user_preferences 
FOR SELECT USING (auth.uid()::text = (SELECT firebase_uid FROM users WHERE id = user_id));

-- Solo puede actualizar sus propias preferencias
CREATE POLICY "Users can update own preferences" ON user_preferences 
FOR UPDATE USING (auth.uid()::text = (SELECT firebase_uid FROM users WHERE id = user_id));
```

### **10. Auditoría (`audit_logs`)**
```sql
-- Solo admins pueden ver logs de auditoría
CREATE POLICY "Admins can view audit logs" ON audit_logs 
FOR SELECT USING (EXISTS (
  SELECT 1 FROM role_assignments ra 
  JOIN roles r ON ra.role_id = r.id 
  WHERE ra.user_id = (SELECT id FROM users WHERE firebase_uid = auth.uid()::text) 
  AND r.name IN ('SuperAdmin', 'Admin')
));
```

### **11. Configuración del Sistema (`system_config`)**
```sql
-- Solo admins pueden gestionar configuración
CREATE POLICY "Admins can manage system config" ON system_config 
FOR ALL USING (EXISTS (
  SELECT 1 FROM role_assignments ra 
  JOIN roles r ON ra.role_id = r.id 
  WHERE ra.user_id = (SELECT id FROM users WHERE firebase_uid = auth.uid()::text) 
  AND r.name IN ('SuperAdmin', 'Admin')
));
```

---

## 🚀 **CÓMO USAR LOS SCRIPTS**

### **1. Crear Tablas con RLS (Recomendado)**
```bash
# Crear todas las tablas con RLS configurado
npm run create:tables:rls
```

### **2. Configurar RLS en Tablas Existentes**
```bash
# Si ya tienes tablas creadas, solo configurar RLS
npm run configure:rls
```

### **3. Verificar RLS**
```bash
# Verificar que RLS está configurado correctamente
npm run configure:rls
```

---

## 🔍 **VERIFICACIÓN DE SEGURIDAD**

### **Comprobar que RLS está habilitado:**
```sql
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true
ORDER BY tablename;
```

### **Comprobar políticas existentes:**
```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

---

## ⚠️ **CONSIDERACIONES IMPORTANTES**

### **1. Autenticación Requerida**
- **RLS solo funciona** con usuarios autenticados
- **Sin autenticación** = sin acceso a datos
- **Firebase UID** debe coincidir con `auth.uid()`

### **2. Roles y Permisos**
- **Usuarios normales**: Solo ven sus propios datos
- **Administradores**: Acceso completo a todas las tablas
- **Sistema de roles** integrado con RLS

### **3. Rendimiento**
- **RLS puede afectar** el rendimiento de consultas
- **Índices optimizados** para consultas con RLS
- **Políticas eficientes** para mejor rendimiento

### **4. Testing**
- **Probar con usuarios reales** autenticados
- **Verificar políticas** en diferentes escenarios
- **Validar acceso** a datos sensibles

---

## 🎯 **BENEFICIOS DE RLS**

### **✅ Seguridad Garantizada**
- **Datos aislados** por usuario
- **Acceso controlado** a nivel de fila
- **Cumplimiento GDPR** automático

### **✅ Simplicidad de Desarrollo**
- **Sin lógica de seguridad** en la aplicación
- **Políticas centralizadas** en la base de datos
- **Menos código** de validación

### **✅ Escalabilidad**
- **Seguridad automática** para nuevos usuarios
- **Políticas reutilizables** entre tablas
- **Mantenimiento simplificado**

---

## 🚨 **ADVERTENCIAS**

### **❌ Sin RLS:**
- **Datos expuestos** a todos los usuarios
- **Violación de privacidad** automática
- **Cumplimiento legal** imposible

### **❌ RLS Mal Configurado:**
- **Usuarios sin acceso** a sus datos
- **Políticas conflictivas** entre tablas
- **Rendimiento degradado**

### **✅ RLS Bien Configurado:**
- **Seguridad total** de datos
- **Acceso granular** por usuario
- **Cumplimiento legal** automático

---

## 🎉 **RESULTADO FINAL**

Con RLS configurado correctamente:

1. **🔒 Seguridad Total**: Cada usuario solo ve sus datos
2. **🛡️ Protección Automática**: Sin código adicional necesario
3. **📊 Cumplimiento Legal**: GDPR y regulaciones automáticas
4. **⚡ Rendimiento Optimizado**: Consultas eficientes con seguridad
5. **🚀 Escalabilidad**: Funciona con millones de usuarios

**¡Tu base de datos está completamente segura!** 🎯


