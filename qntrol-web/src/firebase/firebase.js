import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth"; 
import {getFirestore, doc, collection, setDoc, getDoc, updateDoc} from "firebase/firestore"; 

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

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app); 
const database = getFirestore(app); 

const getAlumnoData = async () => {
  const docRef = doc(database, "Alumno" , "PruebaReact"); 
  const docSnap = await getDoc(docRef); 
  if (docSnap.exists()){
    const data = docSnap.data(); 
    console.log("Datos desde el firebase.js : ", data); 
    return data.Nombre; 
  }else {
    console.log("Documento no encontrado!"); 
    return null; 
  }
}

const sendAlumnoData = async (addEscaneo, addNombre, addQR, addid_evento) => { // Le debemos pasar los datos por parámetro 
  const docRef = doc(database, "Alumno" , addid_evento); 
  let result = await setDoc(docRef,  {
    Escaneo: addEscaneo,
    Nombre: addNombre, 
    QR: addQR, 
    id_evento: addid_evento
  }, {merge: true}); 
  return addEscaneo, addNombre, addQR, addid_evento; 
}

export { app, auth, analytics, database , doc, collection, setDoc, getDoc, updateDoc, getAlumnoData, sendAlumnoData};
