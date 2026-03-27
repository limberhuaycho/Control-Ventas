# 📦 InvenPro - Sistema de Inventario y Ventas

Sistema web con HTML, CSS y JavaScript puro + Firebase.

## 📁 Estructura
```
invenpro/
├── index.html          (Login)
├── dashboard.html      (Panel principal)
├── subir.html          (Subir productos - solo vendedores)
├── ventas.html         (Catálogo y ventas)
├── historial.html      (Control de ventas - solo vendedores)
├── cuenta.html         (Mi cuenta)
├── css/
│   └── styles.css
├── js/
│   ├── firebase-config.js
│   ├── auth.js
│   ├── app.js
│   ├── productos.js
│   └── ventas.js
└── README.md
```

## 🚀 Despliegue en GitHub Pages

1. Crea un repositorio en GitHub
2. Sube todos los archivos
3. Ve a Settings → Pages → Source: main → Save
4. **IMPORTANTE**: En Firebase Console → Authentication → Settings → Authorized domains, agrega tu dominio `usuario.github.io`

## 🔧 Configuración Firebase

Tu config ya está en `js/firebase-config.js`. Asegúrate de tener habilitados:
- Authentication → Email/Password
- Authentication → Google
- Authentication → Anonymous
- Firestore Database (crear las colecciones `usuarios`, `productos`, `ventas`)

## ⏰ Horario de ventas
Las ventas solo están activas de 06:00 AM a 09:00 PM (hora Bolivia, UTC-4).
