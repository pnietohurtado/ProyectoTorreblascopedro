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



export const getCurrentUser = () => auth.currentUser;
export const getUserEmail = () => auth.currentUser ? auth.currentUser.email : null;
export const getUid = () => auth.currentUser ? auth.currentUser.uid : null;


// Obtener datos del usuario
export const getUserData = async () => {
  const user = getCurrentUser();
  if (!user) return null;

  const userRef = doc(db, "usuarios", user.uid);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    return userSnap.data();
  }
  return null;
};

// Obtener todos los eventos del usuario
export const getEventosUsuario = async () => {
  const uid = getUid();
  if (!uid) return null;

  try {
    const eventosRef = collection(db, "usuarios", uid, "eventos");
    const eventosSnap = await getDocs(eventosRef);

    const eventos = [];

    for (const eventoDoc of eventosSnap.docs) {
      const invitadosRef = collection(eventoDoc.ref, "invitados");
      const invitadosSnap = await getDocs(invitadosRef);

      eventos.push({
        id: eventoDoc.id,
        ...eventoDoc.data(),
        invitados: invitadosSnap.docs.map(invitado => ({
          id: invitado.id,
          ...invitado.data()
        }))
      });
    }

    return eventos;
  } catch (error) {
    console.error("Error obteniendo eventos:", error);
    return [];
  }
};

// Crear nuevo evento
export const crearEvento = async (eventoData) => {
  const user = getCurrentUser();
  if (!user) throw new Error("Usuario no autenticado");

  const {
    nombreEvento,
    direccion,
    fecha,
    hora,
    descripcion = "",
    capacidadMaxima = 100
  } = eventoData;

  if (!nombreEvento || !direccion || !fecha || !hora) {
    throw new Error("Faltan datos obligatorios del evento");
  }

  const uid = user.uid;
  const email = user.email;

  // Crear/Actualizar documento del usuario
  const userRef = doc(db, "usuarios", uid);
  await setDoc(
    userRef,
    {
      uid,
      email,
      nombre: user.displayName || email,
      fechaRegistro: serverTimestamp(),
      ultimoAcceso: serverTimestamp()
    },
    { merge: true }
  );

  // Generar ID único para el evento
  const eventoId = `${nombreEvento.replace(/\s+/g, "_").toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Crear documento del evento
  const eventoRef = doc(db, "usuarios", uid, "eventos", eventoId);
  
  const eventoCompleto = {
    id: eventoId,
    uid,
    nombreEvento: nombreEvento.trim(),
    direccion: direccion.trim(),
    fecha,
    hora,
    descripcion: descripcion.trim(),
    capacidadMaxima: parseInt(capacidadMaxima) || 100,
    fechaCreacion: serverTimestamp(),
    estado: "activo",
    totalInvitados: 0,
    totalPersonas: 0,
    personasEscaneadas: 0
  };

  await setDoc(eventoRef, eventoCompleto);

  console.log(`✅ Evento creado: ${nombreEvento} (ID: ${eventoId})`);
  
  return {
    ...eventoCompleto,
    eventoId
  };
};

// Agregar invitado a evento (con array de personas en el mismo documento)
export const agregarInvitado = async (eventoId, invitadoData) => {
  const uid = getUid();
  if (!uid) throw new Error("Usuario no autenticado");

  const {
    nombre,
    email = "",
    telefono = "",
    numInvitados = 1,
    notas = "",
    personas = []
  } = invitadoData;

  if (!nombre || !nombre.trim()) {
    throw new Error("El nombre del invitado es obligatorio");
  }

  // Verificar que el evento existe
  const eventoRef = doc(db, "usuarios", uid, "eventos", eventoId);
  const eventoSnap = await getDoc(eventoRef);
  
  if (!eventoSnap.exists()) {
    throw new Error("El evento no existe");
  }

  const eventoData = eventoSnap.data();

  // Generar ID único para el invitado
  const invitadoId = `${nombre.replace(/\s+/g, "_").toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  
  // Preparar el array de personas
  let personasArray = [];
  const numPersonas = parseInt(numInvitados) || 1;
  
  // Si ya vienen personas definidas, usarlas
  if (personas && personas.length > 0) {
    personasArray = personas.map((persona, index) => ({
      id: `persona_${Date.now()}_${index}`,
      nombre: persona.nombre || (index === 0 ? nombre : `${nombre} - Acompañante ${index}`),
      email: persona.email || (index === 0 ? email : ""),
      telefono: persona.telefono || (index === 0 ? telefono : ""),
      qrCode: persona.qrCode || `${eventoId}_${invitadoId}_persona_${index}_${Date.now()}`,
      escaneado: persona.escaneado || false,
      fechaEscaneo: persona.fechaEscaneo || null,
      notas: persona.notas || (index === 0 ? "Persona principal" : `Acompañante ${index}`)
    }));
  } else {
    // Crear personas basadas en numInvitados
    for (let i = 0; i < numPersonas; i++) {
      const esPrincipal = i === 0;
      personasArray.push({
        id: `persona_${Date.now()}_${i}`,
        nombre: esPrincipal ? nombre.trim() : `${nombre.trim()} - Acompañante ${i}`,
        email: esPrincipal ? email.trim() : "",
        telefono: esPrincipal ? telefono.trim() : "",
        qrCode: `${eventoId}_${invitadoId}_persona_${i}_${Date.now()}`,
        escaneado: false,
        fechaEscaneo: null,
        notas: esPrincipal ? "Persona principal" : `Acompañante ${i}`
      });
    }
  }

  // Crear documento del invitado con array de personas
  const invitadoRef = doc(db, "usuarios", uid, "eventos", eventoId, "invitados", invitadoId);
  
  const invitadoCompleto = {
    id: invitadoId,
    eventoId,
    uid,
    nombre: nombre.trim(),
    email: email.trim(),
    telefono: telefono.trim(),
    numInvitados: numPersonas,
    notas: notas.trim(),
    personas: personasArray, // Array de personas en el mismo documento
    fechaRegistro: serverTimestamp(),
    escaneado: false, // Indica si TODAS las personas han sido escaneadas
    personasEscaneadas: 0 // Contador de personas escaneadas
  };

  await setDoc(invitadoRef, invitadoCompleto);

  // Actualizar contadores del evento
  await updateDoc(eventoRef, {
    totalInvitados: (eventoData.totalInvitados || 0) + 1,
    totalPersonas: (eventoData.totalPersonas || 0) + numPersonas,
    ultimaActualizacion: serverTimestamp()
  });

  console.log(`✅ Invitado creado: ${nombre} con ${numPersonas} personas`);
  
  return {
    ...invitadoCompleto,
    invitadoId
  };
};

// Escanear una persona específica dentro de un invitado
export const escanearPersona = async (eventoId, invitadoId, personaId) => {
  const uid = getUid();
  if (!uid) throw new Error("Usuario no autenticado");

  const invitadoRef = doc(db, "usuarios", uid, "eventos", eventoId, "invitados", invitadoId);
  const eventoRef = doc(db, "usuarios", uid, "eventos", eventoId);

  const invitadoSnap = await getDoc(invitadoRef);
  if (!invitadoSnap.exists()) {
    throw new Error("Invitado no encontrado");
  }

  const invitadoData = invitadoSnap.data();
  const eventoSnap = await getDoc(eventoRef);
  const eventoData = eventoSnap.data();

  // Buscar la persona en el array
  const personas = invitadoData.personas || [];
  const personaIndex = personas.findIndex(p => p.id === personaId);
  
  if (personaIndex === -1) {
    throw new Error("Persona no encontrada");
  }

  if (personas[personaIndex].escaneado) {
    throw new Error("Esta persona ya fue escaneada anteriormente");
  }

  // Actualizar la persona específica en el array
  const personaActualizada = {
    ...personas[personaIndex],
    escaneado: true,
    fechaEscaneo: serverTimestamp()
  };

  // Crear nuevo array con la persona actualizada
  const nuevasPersonas = [...personas];
  nuevasPersonas[personaIndex] = personaActualizada;

  // Contar cuántas personas están escaneadas ahora
  const personasEscaneadas = nuevasPersonas.filter(p => p.escaneado).length;
  const todasEscaneadas = personasEscaneadas === nuevasPersonas.length;

  // Actualizar el documento del invitado
  await updateDoc(invitadoRef, {
    personas: nuevasPersonas,
    personasEscaneadas,
    escaneado: todasEscaneadas,
    ultimaActualizacion: serverTimestamp()
  });

  // Actualizar contadores del evento
  await updateDoc(eventoRef, {
    personasEscaneadas: (eventoData.personasEscaneadas || 0) + 1,
    ultimaActualizacion: serverTimestamp()
  });

  console.log(`✅ Persona escaneada: ${personaActualizada.nombre}`);
  
  return {
    persona: personaActualizada,
    invitado: {
      ...invitadoData,
      personas: nuevasPersonas,
      personasEscaneadas,
      escaneado: todasEscaneadas
    }
  };
};

// Escanear todas las personas de un invitado
export const escanearTodasPersonas = async (eventoId, invitadoId) => {
  const uid = getUid();
  if (!uid) throw new Error("Usuario no autenticado");

  const invitadoRef = doc(db, "usuarios", uid, "eventos", eventoId, "invitados", invitadoId);
  const eventoRef = doc(db, "usuarios", uid, "eventos", eventoId);

  const invitadoSnap = await getDoc(invitadoRef);
  if (!invitadoSnap.exists()) {
    throw new Error("Invitado no encontrado");
  }

  const invitadoData = invitadoSnap.data();
  
  if (invitadoData.escaneado) {
    throw new Error("Este invitado ya fue escaneado completamente");
  }

  const eventoSnap = await getDoc(eventoRef);
  const eventoData = eventoSnap.data();

  // Actualizar todas las personas en el array
  const personasActualizadas = (invitadoData.personas || []).map(persona => ({
    ...persona,
    escaneado: true,
    fechaEscaneo: persona.escaneado ? persona.fechaEscaneo : serverTimestamp()
  }));

  // Contar cuántas se escanearon ahora
  const nuevasEscaneadas = personasActualizadas.filter(p => !p.escaneado).length;
  const totalPersonas = personasActualizadas.length;

  // Actualizar el documento del invitado
  await updateDoc(invitadoRef, {
    personas: personasActualizadas,
    personasEscaneadas: totalPersonas,
    escaneado: true,
    ultimaActualizacion: serverTimestamp()
  });

  // Actualizar contadores del evento
  await updateDoc(eventoRef, {
    personasEscaneadas: (eventoData.personasEscaneadas || 0) + nuevasEscaneadas,
    ultimaActualizacion: serverTimestamp()
  });

  console.log(`✅ Todas las personas escaneadas: ${invitadoData.nombre}`);
  
  return {
    ...invitadoData,
    personas: personasActualizadas,
    personasEscaneadas: totalPersonas,
    escaneado: true
  };
};

// Carga masiva de invitados desde CSV
export const cargarInvitadosCSV = async (eventoId, datosCSV) => {
  const uid = getUid();
  if (!uid) throw new Error("Usuario no autenticado");

  const eventoRef = doc(db, "usuarios", uid, "eventos", eventoId);
  const eventoSnap = await getDoc(eventoRef);
  
  if (!eventoSnap.exists()) {
    throw new Error("El evento no existe");
  }

  let exitosos = 0;
  let fallidos = 0;
  const errores = [];

  for (let i = 0; i < datosCSV.length; i++) {
    try {
      const dato = datosCSV[i];
      const numInvitados = parseInt(dato.numInvitados || dato.invitados || 1);
      
      // Preparar el array de personas
      const personas = [];
      
      // Crear personas basadas en numInvitados
      for (let j = 0; j < numInvitados; j++) {
        const esPrincipal = j === 0;
        personas.push({
          nombre: esPrincipal ? (dato.Nombre || dato.nombre) : `${dato.Nombre || dato.nombre} - Acompañante ${j}`,
          email: esPrincipal ? (dato.Email || dato.email || "") : "",
          telefono: esPrincipal ? (dato.Telefono || dato.telefono || "") : "",
          escaneado: dato.Escaneo === "true" || false,
          notas: esPrincipal ? "Persona principal" : `Acompañante ${j}`
        });
      }

      // Crear invitado con array de personas
      await agregarInvitado(eventoId, {
        nombre: dato.Nombre || dato.nombre || `Invitado ${i + 1}`,
        email: dato.Email || dato.email || "",
        telefono: dato.Telefono || dato.telefono || "",
        numInvitados: numInvitados,
        notas: "Importado desde CSV",
        personas: personas
      });
      
      exitosos++;
      
    } catch (error) {
      errores.push({ fila: i + 1, error: error.message, datos: datosCSV[i] });
      fallidos++;
    }

    // Pequeña pausa para no sobrecargar Firebase
    if (i % 5 === 0) {
      await new Promise(r => setTimeout(r, 300));
    }
  }
  
  return { exitosos, fallidos, errores };
};

// Obtener invitados por evento
export const getInvitadosByEvento = async (eventoId) => {
  const uid = getUid();
  if (!uid) return null;

  try {
    const invitadosRef = collection(db, "usuarios", uid, "eventos", eventoId, "invitados");
    const invitadosSnap = await getDocs(invitadosRef);
    
    return invitadosSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error obteniendo invitados:", error);
    return [];
  }
};

// Obtener estadísticas de evento
export const getEstadisticasEvento = async (eventoId) => {
  const uid = getUid();
  if (!uid) return null;

  const eventoRef = doc(db, "usuarios", uid, "eventos", eventoId);
  const eventoSnap = await getDoc(eventoRef);
  
  if (!eventoSnap.exists()) {
    return null;
  }

  const eventoData = eventoSnap.data();
  const invitados = await getInvitadosByEvento(eventoId);

  const totalInvitados = invitados.length;
  const invitadosCompletos = invitados.filter(i => i.escaneado).length;
  
  let totalPersonas = 0;
  let personasEscaneadas = 0;
  
  invitados.forEach(invitado => {
    totalPersonas += invitado.numInvitados || 1;
    personasEscaneadas += invitado.personasEscaneadas || 0;
  });

  return {
    ...eventoData,
    totalInvitados,
    invitadosCompletos,
    totalPersonas,
    personasEscaneadas,
    porcentajeAsistenciaInvitados: totalInvitados > 0 ? (invitadosCompletos / totalInvitados * 100).toFixed(2) : 0,
    porcentajeAsistenciaPersonas: totalPersonas > 0 ? (personasEscaneadas / totalPersonas * 100).toFixed(2) : 0
  };
};

// Función para compatibilidad
export const getAlumnoData = async () => {
  const eventos = await getEventosUsuario();
  return eventos || [];
};

export const sendAlumnoData = async (eventoId, alumnoData) => {
  return await agregarInvitado(eventoId, {
    nombre: alumnoData.Nombre || alumnoData.nombre,
    email: alumnoData.Email || alumnoData.email || "",
    telefono: alumnoData.Telefono || alumnoData.telefono || "",
    numInvitados: parseInt(alumnoData.numInvitados || 1),
    notas: "Importado desde CSV"
  });
};

// Función para obtener QR de una persona específica
export const getQRPersona = (eventoId, invitadoId, personaIndex = 0) => {
  return `${eventoId}_${invitadoId}_persona_${personaIndex}`;
};

export {
  app,
  auth,
  analytics,
  db
};