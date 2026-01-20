import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth"; 
import {getFirestore, doc, collection, setDoc, getDoc,getDocs,writeBatch, updateDoc, runTransaction} from "firebase/firestore"; 

let currentUser = null; 
let uid = null; 

export const getCurrentUser = () => {
  if (auth.currentUser) {
    currentUser = auth.currentUser.email; 
    return currentUser;
  }
  return null;
}; 

export const getUid = () => {
  if (auth.currentUser) {
    uid = auth.currentUser.uid; 
    return uid;
  }
  return null;
}; 

const firebaseConfig = {
  apiKey: "AIzaSyCmS7u3iX8cJuTZzQu8XHQXu4yqHkchH-s",
  authDomain: "qntrol-9865c.firebaseapp.com",
  projectId: "qntrol-9865c",
  storageBucket: "qntrol-9865c.firebasestorage.app",
  messagingSenderId: "354215271588",
  appId: "1:354215271588:web:e0b5db12a90a5508655a31",
  measurementId: "G-W3T01MJWC9"
};

let _app = null;
let _database = null;

const getApp = () => {
  if (!_app) {
    _app = initializeApp(firebaseConfig);
  }
  return _app;
};

export const getDatabase = () => {
  if (!_database) {
    _database = getFirestore(getApp());
  }
  return _database;
};

const app = getApp();
const analytics = getAnalytics(app);
const auth = getAuth(app); 
const database = getDatabase();

const getAlumnoData = async () => {
  const usuario = getCurrentUser();
  const userId = getUid();
  
  if (!usuario || !userId) {
    console.log("Usuario no autenticado");
    return null;
  }
  
  const docRef = doc(database, "123123123", usuario); // Usar 'database' en lugar de getDatabase()
  const docSnap = await getDoc(docRef); 
  
  if (docSnap.exists()){
    return docSnap.data(); 
  }else {
    console.log("Documento no encontrado! : ", uid); 
    return null; 
  }
}

const sendAlumnoData = async (addEscaneo, addNombre, addQR, addid_evento, addnombreEvento, addDireccion, addDate, addTime) => {
  const usuario = getCurrentUser();
  const userId = getUid();
  
  if (!usuario || !userId) {
    throw new Error("Usuario no autenticado");
  }
  
  const docRef = doc(database, "123123123", usuario);

  // Usar transacción para evitar conflictos
  try {
    await runTransaction(database, async (transaction) => {
      const docSnap = await transaction.get(docRef);
      let eventosData = [];
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        eventosData = data.Eventos || [];
      }
      
      const eventoIndex = eventosData.findIndex(evento => 
        evento.NombreEvento === addnombreEvento
      );
      
      if (eventoIndex !== -1) {
        const alumnosExistentes = eventosData[eventoIndex].DatosAlumno || [];
        eventosData[eventoIndex].DatosAlumno = [
          ...alumnosExistentes,
          {
            QR: addQR,
            Nombre: addNombre,
            Escaneo: addEscaneo,
            idEvento: addid_evento,
          }
        ];
      } else {
        eventosData.push({
          NombreEvento: addnombreEvento,
          Direccion: addDireccion,
          Hora: addTime,
          Fecha: addDate,
          DatosAlumno: [{
            QR: addQR,
            Nombre: addNombre,
            Escaneo: addEscaneo,
            idEvento: addid_evento,
          }]
        });
      }
      
      transaction.set(docRef, {
        usuario: usuario,
        uuid: "123123123",
        Eventos: eventosData
      }, { merge: true });
    });
  } catch (error) {
    console.error("Error en transacción:", error);
    throw error;
  }

  return {
    Escaneo: addEscaneo,
    Nombre: addNombre,
    QR: addQR,
    id_evento: addid_evento,
    nombreEvento: addnombreEvento,
    Direccion: addDireccion,
    Date: addDate,
    Time: addTime
  };
};



export { app, auth, analytics, database, runTransaction, doc, getDocs, writeBatch, collection, setDoc, getDoc, updateDoc, getAlumnoData, sendAlumnoData};