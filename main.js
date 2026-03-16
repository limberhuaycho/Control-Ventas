import { app } from "./firebase.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const db = getFirestore(app);

async function verificarConexion() {

  try {

    const referencia = doc(db, "User", "3081");
    const documento = await getDoc(referencia);

    if (documento.exists()) {

      const nombre = documento.data().Name;

      console.log("Conectado correctamente");
      console.log("Nombre:", nombre);

      document.getElementById("nombre").textContent = nombre;

    } else {

      console.log("No existe el documento 3081");

    }

  } catch (error) {

    console.error("Error conectando:", error);

  }

}

verificarConexion();