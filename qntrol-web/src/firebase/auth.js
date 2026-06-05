import { 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider,
  EmailAuthProvider,
  deleteUser,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  signInWithEmailAndPassword, 
  signInWithPopup,
  signOut,
  updatePassword
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

export const doUpdatePassword = async (currentPassword, newPassword) => {
    const user = auth.currentUser;
    if (!user || !user.email) throw new Error("Usuario no autenticado");
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    return await updatePassword(user, newPassword);
};

export const doDeleteAccount = async (currentPassword) => {
    const user = auth.currentUser;
    if (!user || !user.email) throw new Error("Usuario no autenticado");
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    return await deleteUser(user);
};

export const doDeleteGoogleAccount = async () => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuario no autenticado");
    const provider = new GoogleAuthProvider();
    await reauthenticateWithPopup(user, provider);
    return await deleteUser(user);
};
