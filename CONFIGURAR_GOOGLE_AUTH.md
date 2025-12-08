# 🔐 Configuración de Autenticación con Google en Firebase

## 📋 **Prerrequisitos**

- ✅ Proyecto Firebase creado
- ✅ Firebase Authentication habilitado
- ✅ Email/Password ya configurado

## 🚀 **Paso 1: Habilitar Google Auth en Firebase Console**

### 1.1 Ir a Firebase Console
1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto `psicomatch2026`

### 1.2 Configurar Authentication
1. En el menú lateral, haz clic en **"Authentication"**
2. Ve a la pestaña **"Sign-in method"**
3. Busca **"Google"** en la lista de proveedores
4. Haz clic en **"Google"**

### 1.3 Habilitar Google Auth
1. **Activa** el toggle de Google
2. **Nombre del proyecto**: `Psicomatch` (o el que prefieras)
3. **Email de soporte**: `admin@psicomatch.com` (o tu email)
4. Haz clic en **"Guardar"**

## 🔧 **Paso 2: Configurar Dominios Autorizados**

### 2.1 Dominios para Desarrollo
En la pestaña **"Settings"** de Authentication:
1. **Dominios autorizados**:
   - `localhost`
   - `127.0.0.1`
   - Tu dominio de producción (cuando lo tengas)

### 2.2 Verificar Dominios
- ✅ `localhost` debe estar en la lista
- ✅ `127.0.0.1` debe estar en la lista

## 🌐 **Paso 3: Configurar OAuth Consent Screen (Opcional)**

### 3.1 Si quieres personalizar la pantalla de consentimiento:
1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto Firebase
3. Ve a **"APIs & Services"** → **"OAuth consent screen"**
4. Configura:
   - **App name**: `Psicomatch`
   - **User support email**: `admin@psicomatch.com`
   - **Developer contact information**: Tu email

## 🧪 **Paso 4: Probar la Autenticación**

### 4.1 Probar en la Aplicación
1. Ve a `http://localhost:3000/crear-cuenta`
2. Haz clic en **"Continuar con Google"**
3. Deberías ver el popup de Google
4. Selecciona tu cuenta de Google
5. Verifica que se cree el usuario en Firestore

### 4.2 Verificar en Firebase Console
1. Ve a **Authentication** → **Users**
2. Deberías ver el nuevo usuario con:
   - ✅ Email de Google
   - ✅ Nombre de Google
   - ✅ Foto de perfil de Google

## 🔍 **Paso 5: Verificar en Firestore**

### 5.1 Estructura del Usuario
El usuario creado con Google debe tener:
```json
{
  "name": "Nombre de Google",
  "email": "usuario@gmail.com",
  "createAt": "timestamp",
  "status": "active",
  "role": "user",
  "testProgress": "null",
  "matchedProfessional": "null",
  "photoURL": "https://lh3.googleusercontent.com/..."
}
```

## ⚠️ **Solución de Problemas Comunes**

### Problema 1: "Popup blocked"
**Solución**: Permite popups para `localhost:3000`

### Problema 2: "auth/popup-closed-by-user"
**Solución**: El usuario cerró el popup, es normal

### Problema 3: "auth/account-exists-with-different-credential"
**Solución**: Ya existe una cuenta con ese email usando otro método

### Problema 4: "auth/operation-not-allowed"
**Solución**: Google Auth no está habilitado en Firebase Console

## 🔒 **Seguridad y Consideraciones**

### 5.1 Reglas de Firestore
Asegúrate de que tus reglas permitan:
```javascript
// Usuarios pueden leer/escribir solo sus propios datos
match /users/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}

// Administradores pueden leer/escribir todo
match /{document=**} {
  allow read, write: if request.auth != null && 
    get(/databases/$(database.name)/documents/users/$(request.auth.uid)).data.role == 'admin';
}
```

### 5.2 Dominios de Producción
Cuando despliegues:
1. Agrega tu dominio a **"Dominios autorizados"**
2. Configura **"OAuth consent screen"** para producción
3. Verifica que las reglas de Firestore sean seguras

## 📱 **Funcionalidades Implementadas**

### ✅ **Crear Cuenta con Google**
- Botón "Continuar con Google" en `/crear-cuenta`
- Creación automática de usuario en Firestore
- Manejo de errores específicos de Google

### ✅ **Iniciar Sesión con Google**
- Botón "Continuar con Google" en `/login`
- Vinculación con cuenta existente si aplica
- Redirección automática según rol

### ✅ **UI Mejorada**
- Foto de perfil de Google en el Navbar
- Menú desplegable del usuario
- Estados de carga para Google Auth
- Manejo de errores específicos

## 🎯 **Próximos Pasos**

1. **Probar la funcionalidad** en desarrollo
2. **Configurar dominio de producción** cuando esté listo
3. **Implementar recuperación de contraseña**
4. **Agregar más proveedores** (Facebook, Twitter, etc.)

## 📞 **Soporte**

Si tienes problemas:
1. Verifica que Google Auth esté habilitado en Firebase Console
2. Revisa la consola del navegador para errores
3. Verifica que los dominios estén autorizados
4. Asegúrate de que las reglas de Firestore permitan la operación

---

**¡Con esto ya tienes autenticación completa con Google en Psicomatch! 🎉**
