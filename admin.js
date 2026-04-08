const firebaseConfig = {
  apiKey: "AIzaSyBG_DjQQfroIKY3Fta2PgsfE9ArRYfqrh0",
  authDomain: "project-3081-limber.firebaseapp.com",
  projectId: "project-3081-limber",
  storageBucket: "project-3081-limber.firebasestorage.app",
  messagingSenderId: "174564084979",
  appId: "1:174564084979:web:d141d7ee968595f1d4bb86",
  measurementId: "G-K99Q5PX8W2",
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

let currentAdmin = null;

// ===== HELPERS =====
function showLoading() {
  const el = document.getElementById("loadingOverlay");
  if (el) el.style.display = "flex";
}

function hideLoading() {
  const el = document.getElementById("loadingOverlay");
  if (el) el.style.display = "none";
}

function showAdminLayout() {
  document.getElementById("adminLoginScreen").style.display = "none";
  document.getElementById("adminLayout").style.display = "flex";
}

function showLoginScreen(errorMsg) {
  document.getElementById("adminLoginScreen").style.display = "flex";
  document.getElementById("adminLayout").style.display = "none";
  if (errorMsg) {
    const errEl = document.getElementById("adminLoginError");
    if (errEl) {
      errEl.textContent = errorMsg;
      errEl.style.display = "block";
    }
  }
}

// ===== CHECK IF EMAIL IS AUTHORIZED (from Firebase DB) =====
function isAuthorizedAdmin(email) {
  return db
    .ref("adminEmails")
    .once("value")
    .then((snap) => {
      if (!snap.exists()) return false;
      const val = snap.val();
      if (Array.isArray(val)) return val.includes(email);
      return Object.values(val).includes(email);
    });
}

// ===== AUTH STATE =====
auth.onAuthStateChanged((user) => {
  if (!user) {
    hideLoading();
    showLoginScreen();
    return;
  }

  isAuthorizedAdmin(user.email)
    .then((authorized) => {
      hideLoading();
      if (authorized) {
        currentAdmin = user;
        showAdminLayout();
        initAdmin();
      } else {
        auth.signOut();
        showLoginScreen(
          "Tu cuenta no tiene acceso al panel de administración.",
        );
      }
    })
    .catch(() => {
      hideLoading();
      auth.signOut();
      showLoginScreen("Error al verificar permisos. Intenta de nuevo.");
    });
});

// ===== GOOGLE SIGN IN =====
function signInWithGoogle() {
  showLoading();
  const errEl = document.getElementById("adminLoginError");
  if (errEl) errEl.style.display = "none";

  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch((err) => {
    hideLoading();
    showLoginScreen(
      "Error al iniciar sesión: " + (err.message || "Inténtalo de nuevo."),
    );
  });
}

function adminLogout() {
  auth.signOut().then(() => {
    currentAdmin = null;
    showLoginScreen();
  });
}

// ===== INIT =====
function initAdmin() {
  setCurrentDate();
  showAdminSection("dashboard");
}

function setCurrentDate() {
  const el = document.getElementById("currentDate");
  if (el) {
    const opts = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    el.textContent = new Date().toLocaleDateString("es-ES", opts);
  }
}

// ===== NAVIGATION =====
function showAdminSection(section, btn) {
  document
    .querySelectorAll(".admin-nav .nav-item")
    .forEach((n) => n.classList.remove("active"));
  if (btn) btn.classList.add("active");

  const titleEl = document.getElementById("adminTitle");
  const titles = {
    dashboard: "Panel de Administración",
    usuarios: "Gestión de Usuarios",
    codigos: "Códigos de Activación",
    planes: "Planes y Precios",
    mensajes: "Mensajes del Sistema",
    config: "Configuración",
    errores: "Errores y Reportes",
  };
  if (titleEl) titleEl.textContent = titles[section] || section;

  const area = document.getElementById("adminArea");
  switch (section) {
    case "dashboard":
      renderAdminDashboard(area);
      break;
    case "usuarios":
      renderUsuarios(area);
      break;
    case "codigos":
      renderCodigos(area);
      break;
    case "planes":
      renderPlanes(area);
      break;
    case "mensajes":
      renderMensajes(area);
      break;
    case "config":
      renderConfig(area);
      break;
    case "errores":
      renderErrores(area);
      break;
  }
}

// ===== ADMIN DASHBOARD =====
function renderAdminDashboard(area) {
  area.innerHTML = `
    <div class="admin-stats">
      <div class="admin-stat-card"><div class="admin-stat-label">Total Usuarios</div><div class="admin-stat-value" id="totalUsuarios">0</div></div>
      <div class="admin-stat-card"><div class="admin-stat-label">Planes Activos</div><div class="admin-stat-value" id="planesActivos">0</div></div>
      <div class="admin-stat-card"><div class="admin-stat-label">Códigos Generados</div><div class="admin-stat-value" id="totalCodigos">0</div></div>
      <div class="admin-stat-card"><div class="admin-stat-label">Mensajes Pendientes</div><div class="admin-stat-value" id="totalMensajes">0</div></div>
    </div>
    <div class="content-grid">
      <div class="admin-card"><div class="admin-card-header"><h3>Últimos Usuarios Registrados</h3></div><div class="admin-card-body"><table><thead><tr><th>Nombre</th><th>Email</th><th>Plan</th><th>Fecha</th></tr></thead><tbody id="ultimosUsuarios"><tr><td colspan="4" class="empty-state">Cargando...</td></tr></tbody></table></div></div>
      <div class="admin-card"><div class="admin-card-header"><h3>Códigos Recientes</h3></div><div class="admin-card-body"><table><thead><tr><th>Código</th><th>Tipo</th><th>Estado</th></tr></thead><tbody id="codigosRecientes"><tr><td colspan="3" class="empty-state">Cargando...</td></tr></tbody></table></div></div>
    </div>`;
  loadAdminStats();
}

function loadAdminStats() {
  db.ref("usuarios")
    .once("value")
    .then((snap) => {
      let total = 0,
        activos = 0;
      const ultimos = [];
      snap.forEach((child) => {
        total++;
        const perfil = child.val().perfil || {};
        if (perfil.plan && perfil.plan !== "gratuito") activos++;
        ultimos.unshift({ ...perfil, uid: child.key });
      });
      const tEl = document.getElementById("totalUsuarios");
      const aEl = document.getElementById("planesActivos");
      if (tEl) tEl.textContent = total;
      if (aEl) aEl.textContent = activos;

      const tbody = document.getElementById("ultimosUsuarios");
      if (tbody) {
        if (ultimos.length === 0) {
          tbody.innerHTML =
            '<tr><td colspan="4" class="empty-state">Sin usuarios</td></tr>';
        } else {
          tbody.innerHTML = ultimos
            .slice(0, 5)
            .map((u) => {
              const planBadge =
                u.plan === "mensual"
                  ? "badge-paid"
                  : u.plan === "mantenimiento"
                    ? "badge-maint"
                    : "badge-free";
              return `<tr><td>${u.nombre || "Sin nombre"}</td><td>${u.email || "-"}</td><td><span class="badge ${planBadge}">${u.plan || "gratuito"}</span></td><td>${(u.fechaRegistro || "").split("T")[0]}</td></tr>`;
            })
            .join("");
        }
      }
    });

  db.ref("codigos")
    .once("value")
    .then((snap) => {
      let total = 0;
      const recientes = [];
      snap.forEach((child) => {
        total++;
        recientes.unshift({ codigo: child.key, ...child.val() });
      });
      const cEl = document.getElementById("totalCodigos");
      if (cEl) cEl.textContent = total;
      const tbody = document.getElementById("codigosRecientes");
      if (tbody) {
        if (recientes.length === 0) {
          tbody.innerHTML =
            '<tr><td colspan="3" class="empty-state">Sin códigos</td></tr>';
        } else {
          tbody.innerHTML = recientes
            .slice(0, 5)
            .map((c) => {
              const estado = c.usado
                ? '<span class="badge badge-danger">Usado</span>'
                : '<span class="badge badge-success">Disponible</span>';
              return `<tr><td style="font-family:monospace;font-weight:700;letter-spacing:2px;">${c.codigo}</td><td><span class="badge badge-info">${c.tipo || "mensual"}</span></td><td>${estado}</td></tr>`;
            })
            .join("");
        }
      }
    });

  db.ref("mensajes")
    .once("value")
    .then((snap) => {
      const mEl = document.getElementById("totalMensajes");
      if (mEl) mEl.textContent = snap.numChildren();
    });
}

// ===== USUARIOS =====
function renderUsuarios(area) {
  area.innerHTML = `
    <div class="admin-card">
      <div class="admin-card-header">
        <h3><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--accent)" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg> Todos los Usuarios</h3>
        <div class="admin-search"><input type="text" id="searchUser" placeholder="Buscar usuario..." oninput="filterUsers()"></div>
      </div>
      <div class="admin-card-body">
        <table><thead><tr><th>Nombre</th><th>Email</th><th>UID</th><th>Plan</th><th>Fecha</th><th>Acciones</th></tr></thead><tbody id="todosUsuarios"><tr><td colspan="6" class="empty-state">Cargando...</td></tr></tbody></table>
      </div>
    </div>`;
  loadAllUsers();
}

let allUsersData = [];
function loadAllUsers() {
  db.ref("usuarios").on("value", (snap) => {
    allUsersData = [];
    snap.forEach((child) => {
      allUsersData.push({
        uid: child.key,
        ...(child.val().perfil || {}),
        data: child.val(),
      });
    });
    renderUserList(allUsersData);
  });
}

function filterUsers() {
  const q = (document.getElementById("searchUser")?.value || "").toLowerCase();
  const filtered = allUsersData.filter(
    (u) =>
      (u.nombre || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q),
  );
  renderUserList(filtered);
}

function renderUserList(users) {
  const tbody = document.getElementById("todosUsuarios");
  if (!tbody) return;
  if (users.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="empty-state">Sin resultados</td></tr>';
    return;
  }
  tbody.innerHTML = users
    .map((u) => {
      const planBadge =
        u.plan === "mensual"
          ? "badge-paid"
          : u.plan === "mantenimiento"
            ? "badge-maint"
            : "badge-free";
      return `<tr>
      <td>${u.nombre || "Sin nombre"}</td>
      <td>${u.email || "-"}</td>
      <td style="font-family:monospace;font-size:12px;color:var(--text-muted);">${u.uid.substring(0, 12)}...</td>
      <td><span class="badge ${planBadge}">${u.plan || "gratuito"}</span></td>
      <td>${(u.fechaRegistro || "").split("T")[0]}</td>
      <td>
        <button class="btn-edit" onclick="editUserPlan('${u.uid}','${u.plan || "gratuito"}')">Cambiar Plan</button>
        <button class="btn-edit" onclick="viewUserData('${u.uid}')" style="background:#dcfce7;color:#166534;border-color:#bbf7d0;">Ver Datos</button>
      </td>
    </tr>`;
    })
    .join("");
}

function editUserPlan(uid, currentPlan) {
  const newPlan = prompt(
    "Cambiar plan del usuario.\nOpciones: gratuito, mensual, mantenimiento\nPlan actual: " +
      currentPlan,
    currentPlan,
  );
  if (!newPlan || !["gratuito", "mensual", "mantenimiento"].includes(newPlan))
    return;
  db.ref("usuarios/" + uid + "/perfil/plan")
    .set(newPlan)
    .then(() => showToast("Plan actualizado", "success"));
}

function viewUserData(uid) {
  const user = allUsersData.find((u) => u.uid === uid);
  if (!user) return;
  const data = user.data || {};
  let info = `Nombre: ${user.nombre}\nEmail: ${user.email}\nPlan: ${user.plan}\n\n`;
  info += `Ventas: ${Object.keys(data.ventas || {}).length}\n`;
  info += `Gastos: ${Object.keys(data.gastos || {}).length}\n`;
  info += `Productos: ${Object.keys(data.productos || {}).length}\n`;
  info += `Clientes: ${Object.keys(data.clientes || {}).length}`;
  alert(info);
}

// ===== CODIGOS =====
function renderCodigos(area) {
  area.innerHTML = `
    <div class="admin-card">
      <div class="admin-card-header"><h3><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--accent)" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> Generar Código de Activación</h3></div>
      <div class="admin-card-body padded">
        <div class="code-gen-area">
          <div class="form-group">
            <label>Tipo de Plan</label>
            <select id="codigoTipo">
              <option value="mensual">Mensual ($50/mes)</option>
              <option value="mantenimiento">Mantenimiento ($250)</option>
            </select>
          </div>
          <button class="btn-save" onclick="generarCodigo()" style="background:var(--accent);">Generar Código</button>
        </div>
        <div id="codigoGenerado"></div>
      </div>
    </div>
    <div class="admin-card">
      <div class="admin-card-header"><h3>Todos los Códigos</h3></div>
      <div class="admin-card-body">
        <table><thead><tr><th>Código</th><th>Tipo</th><th>Estado</th><th>Usado Por</th><th>Fecha Uso</th><th>Acciones</th></tr></thead><tbody id="listaCodigos"><tr><td colspan="6" class="empty-state">Cargando...</td></tr></tbody></table>
      </div>
    </div>`;
  loadCodigos();
}

function generarCodigo() {
  const tipo = document.getElementById("codigoTipo").value;
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++)
    code += chars[Math.floor(Math.random() * chars.length)];

  db.ref("codigos/" + code)
    .set({
      tipo: tipo,
      usado: false,
      creadoPor: currentAdmin.email,
      fechaCreacion: new Date().toISOString(),
    })
    .then(() => {
      document.getElementById("codigoGenerado").innerHTML = `
      <div class="generated-code">${code}<button class="copy-btn" onclick="navigator.clipboard.writeText('${code}');showToast('Copiado','success')">Copiar</button></div>
      <p style="margin-top:12px;color:var(--text-secondary);font-size:14px;">Código para plan <strong>${tipo}</strong> generado exitosamente.</p>`;
      showToast("Código generado: " + code, "success");
      loadCodigos();
    });
}

function loadCodigos() {
  db.ref("codigos").on("value", (snap) => {
    const tbody = document.getElementById("listaCodigos");
    if (!tbody) return;
    const items = [];
    snap.forEach((child) =>
      items.unshift({ codigo: child.key, ...child.val() }),
    );
    if (items.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="6" class="empty-state">Sin códigos</td></tr>';
    } else {
      tbody.innerHTML = items
        .map((c) => {
          const estado = c.usado
            ? '<span class="badge badge-danger">Usado</span>'
            : '<span class="badge badge-success">Disponible</span>';
          return `<tr>
          <td style="font-family:monospace;font-weight:700;letter-spacing:2px;">${c.codigo}</td>
          <td><span class="badge badge-info">${c.tipo}</span></td>
          <td>${estado}</td>
          <td style="font-size:13px;">${c.usadoPor || "-"}</td>
          <td>${c.fechaUso ? c.fechaUso.split("T")[0] : "-"}</td>
          <td><button class="btn-delete" onclick="eliminarCodigo('${c.codigo}')">Eliminar</button></td>
        </tr>`;
        })
        .join("");
    }
  });
}

function eliminarCodigo(code) {
  if (!confirm("¿Eliminar el código " + code + "?")) return;
  db.ref("codigos/" + code)
    .remove()
    .then(() => showToast("Código eliminado", "success"));
}

// ===== PLANES Y PRECIOS =====
function renderPlanes(area) {
  area.innerHTML = `
    <div class="admin-card">
      <div class="admin-card-header"><h3>Configuración de Precios</h3></div>
      <div class="admin-card-body padded">
        <p style="color:var(--text-secondary);margin-bottom:20px;">Modifica los precios predeterminados de cada plan.</p>
        <div class="form-row">
          <div class="form-group">
            <label>Plan Mensual ($/mes)</label>
            <input type="number" id="precioMensual" value="50" step="1">
          </div>
          <div class="form-group">
            <label>Plan Mantenimiento ($)</label>
            <input type="number" id="precioMant" value="250" step="1">
          </div>
        </div>
        <button class="btn-save" onclick="guardarPrecios()">Guardar Precios</button>
        <p style="color:var(--text-muted);font-size:13px;margin-top:12px;">Nota: Los precios se actualizarán en la página de inicio.</p>
      </div>
    </div>
    <div class="admin-card">
      <div class="admin-card-header"><h3>Límites del Sistema</h3></div>
      <div class="admin-card-body padded">
        <div class="form-row">
          <div class="form-group">
            <label>Máximo Usuarios (0 = ilimitado)</label>
            <input type="number" id="maxUsuarios" value="0">
          </div>
        </div>
        <button class="btn-save" onclick="guardarLimites()">Guardar Límites</button>
      </div>
    </div>`;
  loadPrecios();
}

function loadPrecios() {
  db.ref("config/precios")
    .once("value")
    .then((snap) => {
      if (snap.exists()) {
        const p = snap.val();
        if (p.mensual)
          document.getElementById("precioMensual").value = p.mensual;
        if (p.mantenimiento)
          document.getElementById("precioMant").value = p.mantenimiento;
      }
    });
  db.ref("config/limites")
    .once("value")
    .then((snap) => {
      if (snap.exists()) {
        const l = snap.val();
        if (l.maxUsuarios !== undefined)
          document.getElementById("maxUsuarios").value = l.maxUsuarios;
      }
    });
}

function guardarPrecios() {
  const mensual = parseFloat(document.getElementById("precioMensual").value);
  const mantenimiento = parseFloat(document.getElementById("precioMant").value);
  db.ref("config/precios")
    .set({ mensual, mantenimiento })
    .then(() => showToast("Precios guardados", "success"));
}

function guardarLimites() {
  const maxUsuarios = parseInt(document.getElementById("maxUsuarios").value);
  db.ref("config/limites")
    .set({ maxUsuarios })
    .then(() => showToast("Límites guardados", "success"));
}

// ===== MENSAJES =====
function renderMensajes(area) {
  area.innerHTML = `
    <div class="admin-card">
      <div class="admin-card-header"><h3>Mensajes del Sistema</h3></div>
      <div class="admin-card-body padded">
        <div class="form-group">
          <label>Mensaje Global (visible para todos los usuarios)</label>
          <textarea id="mensajeGlobal" rows="3" placeholder="Escribe un mensaje para mostrar a todos los usuarios..."></textarea>
        </div>
        <button class="btn-save" onclick="guardarMensaje()">Publicar Mensaje</button>
        <button class="btn-delete" style="margin-left:10px;" onclick="eliminarMensaje()">Eliminar Mensaje</button>
      </div>
    </div>`;
  db.ref("mensajes/global")
    .once("value")
    .then((snap) => {
      if (snap.exists()) {
        document.getElementById("mensajeGlobal").value = snap.val().texto || "";
      }
    });
}

function guardarMensaje() {
  const texto = document.getElementById("mensajeGlobal").value.trim();
  if (!texto) return showToast("Escribe un mensaje", "error");
  db.ref("mensajes/global")
    .set({ texto, fecha: new Date().toISOString(), autor: currentAdmin.email })
    .then(() => showToast("Mensaje publicado", "success"));
}

function eliminarMensaje() {
  if (!confirm("¿Eliminar el mensaje global?")) return;
  db.ref("mensajes/global")
    .remove()
    .then(() => {
      document.getElementById("mensajeGlobal").value = "";
      showToast("Mensaje eliminado", "success");
    });
}

// ===== CONFIG =====
function renderConfig(area) {
  area.innerHTML = `
    <div class="admin-card">
      <div class="admin-card-header"><h3>Administradores Autorizados</h3></div>
      <div class="admin-card-body padded">
        <p style="color:var(--text-secondary);margin-bottom:16px;">Emails con acceso al panel de administración (guardados en Firebase).</p>
        <div id="adminEmailsList" style="margin-bottom:16px;">Cargando...</div>
        <div class="form-group" style="display:flex;gap:10px;align-items:flex-end;">
          <div style="flex:1;">
            <label>Agregar Email Administrador</label>
            <input type="email" id="nuevoAdminEmail" placeholder="correo@ejemplo.com">
          </div>
          <button class="btn-save" onclick="agregarAdminEmail()">Agregar</button>
        </div>
      </div>
    </div>`;
  loadAdminEmails();
}

function loadAdminEmails() {
  db.ref("adminEmails")
    .once("value")
    .then((snap) => {
      const container = document.getElementById("adminEmailsList");
      if (!container) return;
      if (!snap.exists()) {
        container.innerHTML =
          '<p style="color:var(--text-muted);font-size:14px;">Sin administradores configurados.</p>';
        return;
      }
      const val = snap.val();
      const emails = Array.isArray(val) ? val : Object.values(val);
      container.innerHTML = emails
        .map(
          (email, i) => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--bg-secondary);border-radius:8px;margin-bottom:6px;">
        <span style="font-size:14px;">${email}</span>
        <button class="btn-delete" style="padding:4px 10px;font-size:12px;" onclick="eliminarAdminEmail(${i})">Eliminar</button>
      </div>`,
        )
        .join("");
    });
}

function agregarAdminEmail() {
  const email = (document.getElementById("nuevoAdminEmail").value || "")
    .trim()
    .toLowerCase();
  if (!email || !email.includes("@"))
    return showToast("Email inválido", "error");
  db.ref("adminEmails")
    .once("value")
    .then((snap) => {
      const val = snap.exists() ? snap.val() : [];
      const emails = Array.isArray(val) ? val : Object.values(val);
      if (emails.includes(email))
        return showToast("Este email ya es administrador", "error");
      emails.push(email);
      return db.ref("adminEmails").set(emails);
    })
    .then(() => {
      document.getElementById("nuevoAdminEmail").value = "";
      loadAdminEmails();
      showToast("Administrador agregado", "success");
    });
}

function eliminarAdminEmail(index) {
  db.ref("adminEmails")
    .once("value")
    .then((snap) => {
      if (!snap.exists()) return;
      const val = snap.val();
      const emails = Array.isArray(val) ? val : Object.values(val);
      emails.splice(index, 1);
      return db.ref("adminEmails").set(emails);
    })
    .then(() => {
      loadAdminEmails();
      showToast("Administrador eliminado", "success");
    });
}

// ===== ERRORES =====
function renderErrores(area) {
  area.innerHTML = `
    <div class="admin-card">
      <div class="admin-card-header"><h3>Reportes de Errores</h3></div>
      <div class="admin-card-body">
        <table><thead><tr><th>Usuario</th><th>Error</th><th>Fecha</th><th>Acciones</th></tr></thead><tbody id="listaErrores"><tr><td colspan="4" class="empty-state">Cargando...</td></tr></tbody></table>
      </div>
    </div>`;
  db.ref("errores")
    .once("value")
    .then((snap) => {
      const tbody = document.getElementById("listaErrores");
      if (!tbody) return;
      if (!snap.exists() || snap.numChildren() === 0) {
        tbody.innerHTML =
          '<tr><td colspan="4" class="empty-state">Sin errores reportados</td></tr>';
        return;
      }
      const items = [];
      snap.forEach((child) => items.unshift({ id: child.key, ...child.val() }));
      tbody.innerHTML = items
        .slice(0, 20)
        .map(
          (e) => `<tr>
      <td style="font-size:13px;">${e.usuario || e.email || "-"}</td>
      <td style="font-size:13px;max-width:300px;word-break:break-word;">${e.mensaje || e.error || "-"}</td>
      <td style="font-size:13px;">${e.fecha ? e.fecha.split("T")[0] : "-"}</td>
      <td><button class="btn-delete" onclick="eliminarError('${e.id}')">Eliminar</button></td>
    </tr>`,
        )
        .join("");
    });
}

function eliminarError(id) {
  if (!confirm("¿Eliminar este reporte?")) return;
  db.ref("errores/" + id)
    .remove()
    .then(() => showToast("Reporte eliminado", "success"));
}

// ===== TOAST =====
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add("show"), 10);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ===== MOBILE TOGGLE =====
function toggleMobileSidebar() {
  const sidebar = document.getElementById("sidebar");
  if (sidebar) sidebar.classList.toggle("open");
}
