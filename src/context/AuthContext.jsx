import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { auth } from "../firebase";
import { ensureUserProfile, getUserProfile } from "../services/userService";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const refreshProfile = async (userId) => {
    if (!userId) return null;

    const freshProfile = await getUserProfile(userId);

    setProfile(freshProfile);

    return freshProfile;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        setUser(currentUser);

        if (currentUser) {
          const userProfile = await ensureUserProfile(currentUser);
          setProfile(userProfile);
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error("Errore caricamento profilo utente:", error);
        setProfile(null);
      } finally {
        setAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const registerWithEmail = async (email, password) => {
    return createUserWithEmailAndPassword(auth, email, password);
  };

  const loginWithEmail = async (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();

    return signInWithPopup(auth, provider);
  };

  const logout = async () => {
    setProfile(null);

    return signOut(auth);
  };

  const value = useMemo(
    () => ({
      user,
      profile,
      authLoading,
      isLoggedIn: Boolean(user),
      registerWithEmail,
      loginWithEmail,
      loginWithGoogle,
      logout,
      refreshProfile,
    }),
    [user, profile, authLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth deve essere usato dentro AuthProvider");
  }

  return context;
};
