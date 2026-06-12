"use client";

import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { COLLECTIONS } from "@/lib/constants";
import { auth, db } from "@/lib/firebase/client";
import type { Role, UserProfile } from "@/types/models";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  /** Utente Firebase Auth (null se non autenticato). */
  user: User | null;
  /** Profilo applicativo da Firestore `users/{uid}` (null se mancante). */
  profile: UserProfile | null;
  role: Role | null;
  isAdmin: boolean;
  /** ADMIN è considerato anche MASTER ai fini dei permessi. */
  isMaster: boolean;
  /** Ruolo di sola lettura: vede come un giocatore ma non può scrivere. */
  isVisitor: boolean;
  /** Può creare/modificare contenuti (ADMIN/MASTER/PLAYER, non VISITOR). */
  canContribute: boolean;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  // Stato di autenticazione Firebase
  useEffect(
    () =>
      onAuthStateChanged(auth, (firebaseUser) => {
        setUser(firebaseUser);
        if (!firebaseUser) {
          setProfile(null);
          setStatus("unauthenticated");
        }
      }),
    []
  );

  // Profilo Firestore in tempo reale (ruolo, mustChangePassword, blocco…)
  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(
      doc(db, COLLECTIONS.users, user.uid),
      (snapshot) => {
        setProfile(
          snapshot.exists()
            ? ({ id: snapshot.id, ...snapshot.data() } as UserProfile)
            : null
        );
        setStatus("authenticated");
      },
      () => {
        setProfile(null);
        setStatus("authenticated");
      }
    );
    return unsubscribe;
  }, [user]);

  // Le Security Rules leggono il ruolo dai custom claims del token:
  // se l'admin cambia il ruolo a sessione attiva, forziamo un refresh del token.
  const lastSyncedRole = useRef<Role | null>(null);
  useEffect(() => {
    if (!user || !profile) return;
    let cancelled = false;
    user
      .getIdTokenResult()
      .then((result) => {
        if (cancelled) return;
        const tokenRole = (result.claims.role as Role | undefined) ?? null;
        if (tokenRole !== profile.role && lastSyncedRole.current !== profile.role) {
          lastSyncedRole.current = profile.role;
          void user.getIdToken(true);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [user, profile]);

  const signOutUser = useCallback(async () => {
    await signOut(auth);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      profile,
      role: profile?.role ?? null,
      isAdmin: profile?.role === "ADMIN",
      isMaster: profile?.role === "ADMIN" || profile?.role === "MASTER",
      isVisitor: profile?.role === "VISITOR",
      canContribute: profile?.role != null && profile.role !== "VISITOR",
      signOutUser,
    }),
    [status, user, profile, signOutUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve essere usato all'interno di AuthProvider");
  }
  return context;
}
