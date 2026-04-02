import { createContext, useContext, useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext(null);

// Liste des admins (emails autorisés à accéder au back-office)
// MODIFIEZ CETTE LISTE avec vos emails admin
export const ADMIN_EMAILS = [
  'kahina.rahmanideren@estp.fr',
  'seiba.kamate@estp.fr',
  'carl.mungala@estp.fr',
  'adam.bouaziz1611@gmail.com',
  // Ajoutez d'autres emails admin ici
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const profileDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (profileDoc.exists()) {
          setUserProfile(profileDoc.data());
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  async function register(email, password, displayName) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });
    await setDoc(doc(db, 'users', cred.user.uid), {
      email,
      displayName,
      createdAt: serverTimestamp(),
      isAdmin: ADMIN_EMAILS.includes(email),
      currentPeriodStart: new Date().toISOString(),
    });
    setUserProfile({ email, displayName, isAdmin: ADMIN_EMAILS.includes(email) });
    return cred;
  }

  async function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  async function logout() {
    return signOut(auth);
  }

  const isAdmin = user && (ADMIN_EMAILS.includes(user.email) || userProfile?.isAdmin);

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, register, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
