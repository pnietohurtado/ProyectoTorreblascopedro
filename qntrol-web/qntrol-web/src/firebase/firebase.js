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
  serverTimestamp
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

// --- HELPERS DE ASIENTOS ---
const getRowLabel = (index) => {
  let label = '';
  let temp = index;
  while (temp >= 0) {
    label = String.fromCharCode(65 + (temp % 26)) + label;
    temp = Math.floor(temp / 26) - 1;
  }
  return label;
};

const encontrarAsientosLibres = (eventoData, cantidadNecesaria, occupiedSet) => {
  const { seatRows = 10, seatCols = 10, hiddenSeats = {} } = eventoData;
  const asignados = [];
  for (let r = 0; r < seatRows; r++) {
    const rowLabel = getRowLabel(r);
    for (let c = 1; c <= seatCols; c++) {
      const seatId = `${rowLabel}-${c}`;
      if (!hiddenSeats[seatId] && !occupiedSet.has(seatId)) {
        asignados.push(seatId);
        occupiedSet.add(seatId);
        if (asignados.length >= cantidadNecesaria) return asignados;
      }
    }
  }
  return asignados;
};

// --- GESTIÓN DE EVENTOS ---

export const getEventosUsuario = async (emailParam = null) => {
  const email = emailParam || getUserEmail();
  if (!email) return [];
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
  } catch (error) { return []; }
};

export const crearEvento = async (eventoData) => {
  const user = getCurrentUser();
  if (!user || !user.email) throw new Error("No autenticado");
  const eventoId = `${eventoData.nombreEvento.replace(/\s+/g, "_").toLowerCase()}_${Date.now()}`;
  const eventoRef = doc(db, "usuarios", user.email, "eventos", eventoId);
  const data = { ...eventoData, id: eventoId, fechaCreacion: serverTimestamp(), totalInvitados: 0, totalPersonas: 0 };
  await setDoc(eventoRef, data);
  return data;
};

// --- GESTIÓN DE INVITADOS ---

export const agregarInvitado = async (eventoId, invitadoData, occupiedSet = null, skipEventUpdate = false) => {
  const userEmail = getUserEmail();
  if (!userEmail) throw new Error("No autenticado");

  const eventoRef = doc(db, "usuarios", userEmail, "eventos", eventoId);
  const eventoSnap = await getDoc(eventoRef);
  if (!eventoSnap.exists()) throw new Error("Evento no existe");
  const eventoData = eventoSnap.data();

  let internalOccupiedSet = occupiedSet;
  if (!internalOccupiedSet) {
    internalOccupiedSet = new Set();
    const invitados = await getInvitadosByEvento(eventoId);
    invitados.forEach(inv => {
      if (inv.asiento) internalOccupiedSet.add(inv.asiento);
      inv.personas?.forEach(p => { if (p.asiento) internalOccupiedSet.add(p.asiento); });
    });
  }

  const numPersonas = parseInt(invitadoData.numInvitados) || 1;
  const asientosLibres = encontrarAsientosLibres(eventoData, numPersonas, internalOccupiedSet);

  const nombreLimpio = (invitadoData.nombre || "Invitado").replace(/\s+/g, "_").toLowerCase();
  const invitadoId = `${nombreLimpio}_${Date.now()}`;
  
  const personasArray = [];
  for (let i = 0; i < numPersonas; i++) {
    const seat = asientosLibres[i] || "";
    personasArray.push({
      id: `p_${Date.now()}_${i}`,
      nombre: i === 0 ? invitadoData.nombre : `${invitadoData.nombre} - Acomp ${i}`,
      email: i === 0 ? (invitadoData.email || "") : "",
      asiento: seat,
      qrCode: `${eventoId}_${invitadoId}_p${i}`,
      escaneado: false
    });
  }

  const invitadoCompleto = {
    ...invitadoData, // Esto incluye campos extra del CSV (ej: Empresa, Mesa, etc)
    id: invitadoId,
    personas: personasArray,
    asiento: personasArray[0]?.asiento || "",
    fechaRegistro: serverTimestamp()
  };

  await setDoc(doc(db, "usuarios", userEmail, "eventos", eventoId, "invitados", invitadoId), invitadoCompleto);
  
  if (!skipEventUpdate) {
    await updateDoc(eventoRef, {
      totalInvitados: (eventoData.totalInvitados || 0) + 1,
      totalPersonas: (eventoData.totalPersonas || 0) + numPersonas
    });
  }

  return invitadoCompleto;
};

export const cargarInvitadosCSV = async (eventoId, datosCSV) => {
  const userEmail = getUserEmail();
  const invitadosActuales = await getInvitadosByEvento(eventoId);
  
  const occupiedSet = new Set();
  invitadosActuales.forEach(inv => {
    if (inv.asiento) occupiedSet.add(inv.asiento);
    inv.personas?.forEach(p => { if (p.asiento) occupiedSet.add(p.asiento); });
  });

  const emailsExistentes = new Set(invitadosActuales.map(i => i.email?.toLowerCase().trim()).filter(e => e));
  let exitosos = 0; let totalPersonasNuevas = 0;

  for (const dato of datosCSV) {
    // Normalizar nombres de campos (quitar espacios y mayúsculas para comparar)
    const normalizedData = {};
    Object.keys(dato).forEach(key => {
      normalizedData[key.trim().toUpperCase()] = dato[key];
    });

    const emailCorp = (normalizedData['EMAIL CORPORATIVO'] || "").toLowerCase().trim();
    const emailPers = (normalizedData['EMAIL'] || "").toLowerCase().trim();
    
    // Priorizar el corporativo si termina en @alu.medac.es
    const email = (emailCorp.endsWith('@alu.medac.es')) ? emailCorp : (emailPers || emailCorp);
    
    if (email && emailsExistentes.has(email)) continue;

    const acompanantesRaw = parseInt(normalizedData['ACOMPAÑANTES']);
    const acompanantes = isNaN(acompanantesRaw) ? 0 : acompanantesRaw;
    const numTotal = 1 + acompanantes;
    
    await agregarInvitado(eventoId, {
      ...normalizedData,
      nombre: normalizedData['NOMBRE Y APELLIDOS'] || "Invitado",
      email: email,
      numInvitados: numTotal,
      asistencia: normalizedData['ASISTENCIA'] || ""
    }, occupiedSet, true);

    exitosos++;
    totalPersonasNuevas += numTotal;
    if (email) emailsExistentes.add(email);
  }

  const eventoRef = doc(db, "usuarios", userEmail, "eventos", eventoId);
  const eventoSnap = await getDoc(eventoRef);
  const eventoData = eventoSnap.data();

  await updateDoc(eventoRef, {
    totalInvitados: (eventoData.totalInvitados || 0) + exitosos,
    totalPersonas: (eventoData.totalPersonas || 0) + totalPersonasNuevas,
    ultimaActualizacion: serverTimestamp()
  });

  return { exitosos };
};

export const marcarEmailEnviado = async (eventoId, invitadoId) => {
  const email = getUserEmail();
  const invitadoRef = doc(db, "usuarios", email, "eventos", eventoId, "invitados", invitadoId);
  await updateDoc(invitadoRef, { emailEnviado: true, fechaEnvioEmail: serverTimestamp() });
  return true;
};

export const actualizarAsientoInvitado = async (eventoId, invitadoId, personaIdOrIndex, seatInfo) => {
  const email = getUserEmail();
  const invitadoRef = doc(db, "usuarios", email, "eventos", eventoId, "invitados", invitadoId);
  const snap = await getDoc(invitadoRef);
  const data = snap.data();
  const nuevasPersonas = (data.personas || []).map((p, index) => {
    const isMatch = p.id === personaIdOrIndex || index === personaIdOrIndex || (index === 0 && personaIdOrIndex === 'principal');
    return isMatch ? { ...p, asiento: seatInfo } : p;
  });
  const updateData = { personas: nuevasPersonas };
  if (personaIdOrIndex === 'principal' || personaIdOrIndex === 0) updateData.asiento = seatInfo;
  await updateDoc(invitadoRef, updateData);
  return true;
};

export const getInvitadosByEvento = async (eventoId) => {
  const email = getUserEmail();
  if (!email) return [];
  const snap = await getDocs(collection(db, "usuarios", email, "eventos", eventoId, "invitados"));
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const actualizarEvento = async (eventoId, data) => {
  const email = getUserEmail();
  await updateDoc(doc(db, "usuarios", email, "eventos", eventoId), { ...data, ultimaActualizacion: serverTimestamp() });
};

export const eliminarEvento = async (eventoId) => {
  const email = getUserEmail();
  const invitados = await getDocs(collection(db, "usuarios", email, "eventos", eventoId, "invitados"));
  await Promise.all(invitados.docs.map(d => deleteDoc(d.ref)));
  await deleteDoc(doc(db, "usuarios", email, "eventos", eventoId));
};

export { app, auth, analytics, db };