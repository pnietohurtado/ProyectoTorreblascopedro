import { 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider,
  signInWithEmailAndPassword, 
  signInWithPopup,
  signOut 
} from "firebase/auth";
import { auth } from "./firebase"; 

export const doCreateUserWithEmailAndPassword = async (email, password) => {
    return createUserWithEmailAndPassword(auth, email, password); 
}; 

export const doSignInWithEmailAndPassword = async (email, password) => {
    return await signInWithEmailAndPassword(auth, email, password); 
}; 

export const doSignInWithGoogle = async () => {
    const provider = new GoogleAuthProvider(); 
    return await signInWithPopup(auth, provider); 
}; 

export const doSignOut = async () => {
    return await signOut(auth); 
};