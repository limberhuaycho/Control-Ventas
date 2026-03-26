/* ============================================
   Authentication Module
   ============================================ */

// Check authentication state on every protected page
function checkAuth(callback) {
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = "index.html";
      return;
    }
    // Load user data from Firestore
    try {
      const doc = await db.collection("usuarios").doc(user.uid).get();
      let userData;
      if (doc.exists) {
        userData = doc.data();
      } else {
        // Create user document if doesn't exist
        userData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || "Usuario",
          role: "comprador",
          isAnonymous: user.isAnonymous
        };
        await db.collection("usuarios").doc(user.uid).set(userData);
      }
      if (callback) callback(user, userData);
    } catch (e) {
      console.error("Error loading user data:", e);
      if (callback) callback(user, null);
    }
  });
}

// Login with email and password
async function loginWithEmail(email, password) {
  return auth.signInWithEmailAndPassword(email, password);
}

// Register with email and password
async function registerWithEmail(email, password, name, role) {
  const cred = await auth.createUserWithEmailAndPassword(email, password);
  const userData = {
    uid: cred.user.uid,
    email: email,
    displayName: name,
    role: role,
    isAnonymous: false
  };
  await db.collection("usuarios").doc(cred.user.uid).set(userData);
  return cred;
}

// Login with Google
async function loginWithGoogle() {
  return auth.signInWithRedirect(googleProvider);
}

// Login as guest
async function loginAsGuest() {
  return auth.signInAnonymously();
}

// Logout
async function logout() {
  await auth.signOut();
  window.location.href = "index.html";
}

// Get Firebase auth error message in Spanish
function getAuthError(code) {
  const errors = {
    "auth/user-not-found": "Usuario no encontrado",
    "auth/wrong-password": "Contraseña incorrecta",
    "auth/email-already-in-use": "El email ya está registrado",
    "auth/invalid-email": "Email inválido",
    "auth/weak-password": "La contraseña debe tener al menos 6 caracteres",
    "auth/too-many-requests": "Demasiados intentos. Intenta más tarde",
    "auth/invalid-credential": "Credenciales inválidas"
  };
  return errors[code] || "Error de autenticación";
}
