import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth"; 
import {getFirestore, doc, collection, setDoc, getDoc,getDocs,writeBatch, updateDoc} from "firebase/firestore"; 

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCmS7u3iX8cJuTZzQu8XHQXu4yqHkchH-s",
  authDomain: "qntrol-9865c.firebaseapp.com",
  projectId: "qntrol-9865c",
  storageBucket: "qntrol-9865c.firebasestorage.app",
  messagingSenderId: "354215271588",
  appId: "1:354215271588:web:e0b5db12a90a5508655a31",
  measurementId: "G-W3T01MJWC9"
};


// 🔥 CAMBIO 1: Usar patron singleton
let _app = null;
let _database = null;

const getApp = () => {
  if (!_app) {
    _app = initializeApp(firebaseConfig);
  }
  return _app;
};

const getDatabase = () => {
  if (!_database) {
    _database = getFirestore(getApp());
  }
  return _database;
};

// Inicializar
const app = getApp();
const analytics = getAnalytics(app);
const auth = getAuth(app); 
const database = getDatabase();


const getAlumnoData = async () => {
  const docRef = doc(getDatabase(), "Alumno" , "PruebaReact"); 
  const docSnap = await getDoc(docRef); 
  if (docSnap.exists()){
    const data = docSnap.data(); 
    console.log("Datos desde el firebase.js : ", data); 
    return data; 
  }else {
    console.log("Documento no encontrado!"); 
    return null; 
  }
}


const deletePreviousData = async (collectionName) => {
    const collectionRef = collection(getDatabase(), collectionName); 
    const querySnapshot = await getDocs(collectionRef); 

    const batch = writeBatch(getDatabase());
    
    querySnapshot.forEach((docSnapshot) => {
      const docRef = doc(getDatabase(), collectionName, docSnapshot.id);
      batch.delete(docRef);
    });

    await batch.commit(); 
}

const sendAlumnoData = async ( addEscaneo, addNombre, addQR, addid_evento, addnombreEvento) => { // Le debemos pasar los datos por parámetro 
  //await deletePreviousData(addnombreEvento); 
  
  const docRef = doc(getDatabase(), addnombreEvento , addid_evento); 
  let result = await setDoc(docRef,  {
    Escaneo: addEscaneo,
    Nombre: addNombre, 
    QR: addQR, 
    id_evento: addid_evento,
    nombreEvento: addnombreEvento
  }, {merge: true}); 

  return {
    Escaneo: addEscaneo,
    Nombre: addNombre,
    QR: addQR,
    id_evento: addid_evento,
    nombreEvento: addnombreEvento
  };
}

export { app, auth, analytics, database , doc,getDocs,writeBatch, collection, setDoc, getDoc, updateDoc, getAlumnoData, sendAlumnoData};
