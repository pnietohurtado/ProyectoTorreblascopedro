import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  doc,
  collection,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  arrayUnion
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCmS7u3iX8cJuTZzQu8XHQXu4yqHkchH-s",
  authDomain: "qntrol-9865c.firebaseapp.com",
  projectId: "qntrol-9865c",
  storageBucket: "qntrol-9865c.firebasestorage.app",
  messagingSenderId: "354215271588",
  appId: "1:354215271588:web:e0b5db12a90a5508655a31",
  measurementId: "G-W3T01MJWC9"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

// --- HELPERS DE USUARIO ---
export const getCurrentUser = () => auth.currentUser;
export const getUserEmail = () => auth.currentUser ? auth.currentUser.email : null;
export const getUid = () => auth.currentUser ? auth.currentUser.uid : null;

export const getUserData = async () => {
  const user = getCurrentUser();
  if (!user) return null;
  const userRef = doc(db, "usuarios", user.email);
  const userSnap = await getDoc(userRef);
  return userSnap.exists() ? userSnap.data() : null;
};

// --- GESTIÓN DE EVENTOS ---

export const getEventosUsuario = async (emailParam = null) => {
  const email = emailParam || getUserEmail();
  if (!email) return null;

  try {
    const eventosRef = collection(db, "usuarios", email, "eventos");
    const eventosSnap = await getDocs(eventosRef);
    const eventos = [];

    for (const eventoDoc of eventosSnap.docs) {
      const invitadosRef = collection(eventoDoc.ref, "invitados");
      const invitadosSnap = await getDocs(invitadosRef);

      eventos.push({
        id: eventoDoc.id,
        ...eventoDoc.data(),
        invitados: invitadosSnap.docs.map(inv => ({ id: inv.id, ...inv.data() }))
      });
    }
    return eventos;
  } catch (error) {
    console.error("Error obteniendo eventos:", error);
    return [];
  }
};

export const crearEvento = async (eventoData) => {
  const user = getCurrentUser();
  if (!user || !user.email) throw new Error("Usuario no autenticado");

  const { 
    nombreEvento, direccion, fecha, hora, descripcion = "", capacidadMaxima = 100,
    seatRows = 10, seatCols = 10, selectedSeats = {}, hiddenSeats = {},
    mensajeAsunto = "", mensajeCuerpo = "" 
  } = eventoData;

  const eventoId = `${nombreEvento.replace(/\s+/g, "_").toLowerCase()}_${Date.now()}`;
  const eventoRef = doc(db, "usuarios", user.email, "eventos", eventoId);

  const eventoCompleto = {
    id: eventoId,
    uid: user.uid,
    nombreEvento: nombreEvento.trim(),
    direccion: direccion.trim(),
    fecha,
    hora,
    descripcion: descripcion.trim(),
    capacidadMaxima: parseInt(capacidadMaxima) || 100,
    fechaCreacion: serverTimestamp(),
    estado: "activo",
    personasEscaneadas: 0,
    totalInvitados: 0,
    totalPersonas: 0,
    // Configuración de salón
    seatRows,
    seatCols,
    selectedSeats,
    hiddenSeats,
    // Configuración de Email
    mensajeAsunto,
    mensajeCuerpo
  };

  await setDoc(eventoRef, eventoCompleto);
  return { ...eventoCompleto, eventoId };
};

// --- GESTIÓN DE INVITADOS ---

export const agregarInvitado = async (eventoId, invitadoData) => {
  const userEmail = getUserEmail();
  if (!userEmail) throw new Error("Usuario no autenticado");

  const { nombre, email = "", numInvitados = 1, personas = [] } = invitadoData;
  const numPersonas = parseInt(numInvitados) || 1;
  const invitadoId = `${nombre.replace(/\s+/g, "_").toLowerCase()}_${Date.now()}`;

  let personasArray = personas.length > 0 ? personas : [];
  if (personasArray.length === 0) {
    for (let i = 0; i < numPersonas; i++) {
      personasArray.push({
        id: `persona_${Date.now()}_${i}`,
        nombre: i === 0 ? nombre.trim() : `${nombre.trim()} - Acompañante ${i}`,
        email: i === 0 ? email.trim() : "",
        qrCode: `${eventoId}_${invitadoId}_p${i}`,
        escaneado: false,
        fechaEscaneo: null
      });
    }
  }

  const invitadoRef = doc(db, "usuarios", userEmail, "eventos", eventoId, "invitados", invitadoId);
  const invitadoCompleto = {
    id: invitadoId,
    nombre: nombre.trim(),
    email: email.trim(),
    numInvitados: numPersonas,
    personas: personasArray,
    fechaRegistro: serverTimestamp(),
    escaneado: false,
    emailEnviado: invitadoData.emailEnviado || false
  };

  await setDoc(invitadoRef, invitadoCompleto);
  
  const eventoRef = doc(db, "usuarios", userEmail, "eventos", eventoId);
  const eventoSnap = await getDoc(eventoRef);
  if (eventoSnap.exists()) {
    const currentData = eventoSnap.data();
    await updateDoc(eventoRef, {
      totalInvitados: (currentData.totalInvitados || 0) + 1,
      totalPersonas: (currentData.totalPersonas || 0) + numPersonas
    });
  }

  return invitadoCompleto;
};

export const marcarEmailEnviado = async (eventoId, invitadoId) => {
  const email = getUserEmail();
  if (!email) return false;
  try {
    const invitadoRef = doc(db, "usuarios", email, "eventos", eventoId, "invitados", invitadoId);
    await updateDoc(invitadoRef, {
      emailEnviado: true,
      fechaEnvioEmail: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error("Error al marcar email:", error);
    return false;
  }
};

export const actualizarAsientoInvitado = async (eventoId, invitadoId, personaIdOrIndex, seatInfo) => {
  const email = getUserEmail();
  if (!email) return false;
  try {
    const invitadoRef = doc(db, "usuarios", email, "eventos", eventoId, "invitados", invitadoId);
    const invitadoSnap = await getDoc(invitadoRef);
    if (!invitadoSnap.exists()) return false;
    
    const data = invitadoSnap.data();
    const personas = data.personas || [];
    const nuevasPersonas = personas.map((p, index) => {
      const isMatch = p.id === personaIdOrIndex || index === personaIdOrIndex || (index === 0 && personaIdOrIndex === 'principal');
      return isMatch ? { ...p, asiento: seatInfo } : p;
    });
    
    const updateData = { personas: nuevasPersonas, ultimaActualizacionAsiento: serverTimestamp() };
    if (personaIdOrIndex === 'principal' || personaIdOrIndex === 0) updateData.asiento = seatInfo;
    
    await updateDoc(invitadoRef, updateData);
    return true;
  } catch (error) {
    return false;
  }
};

export const cargarInvitadosCSV = async (eventoId, datosCSV) => {
  const email = getUserEmail();
  if (!email) throw new Error("No autenticado");
  const invitadosActuales = await getInvitadosByEvento(eventoId);
  const emailsExistentes = new Set(invitadosActuales.map(i => i.email?.toLowerCase().trim()).filter(e => e));

  let exitosos = 0; let duplicados = 0;
  for (const dato of datosCSV) {
    const emailInvitado = (dato.Email || dato.email || "").toLowerCase().trim();
    if (emailInvitado && emailsExistentes.has(emailInvitado)) {
      duplicados++;
      continue;
    }
    await agregarInvitado(eventoId, dato);
    exitosos++;
    if (emailInvitado) emailsExistentes.add(emailInvitado);
  }
  return { exitosos, duplicados };
};

export const getInvitadosByEvento = async (eventoId) => {
  const email = getUserEmail();
  if (!email) return [];
  const invitadosRef = collection(db, "usuarios", email, "eventos", eventoId, "invitados");
  const snap = await getDocs(invitadosRef);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const actualizarEvento = async (eventoId, datosActualizados) => {
  const email = getUserEmail();
  if (!email) throw new Error("No autenticado");
  const eventoRef = doc(db, "usuarios", email, "eventos", eventoId);
  
  // Limpieza para no enviar campos undefined
  const cleanData = {};
  Object.keys(datosActualizados).forEach(key => {
    if (datosActualizados[key] !== undefined) cleanData[key] = datosActualizados[key];
  });
  cleanData.ultimaActualizacion = serverTimestamp();

  await updateDoc(eventoRef, cleanData);
  return true;
};

export const eliminarEvento = async (eventoId) => {
  const email = getUserEmail();
  if (!email) throw new Error("No autenticado");
  try {
    const eventoRef = doc(db, "usuarios", email, "eventos", eventoId);
    const invitadosRef = collection(db, "usuarios", email, "eventos", eventoId, "invitados");
    const invitadosSnap = await getDocs(invitadosRef);
    const deletes = invitadosSnap.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deletes);
    await deleteDoc(eventoRef);
    return true;
  } catch (error) {
    throw error;
  }
};

export { app, auth, analytics, db };