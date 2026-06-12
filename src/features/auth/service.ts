import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  updatePassword,
  type User,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";

import { COLLECTIONS } from "@/lib/constants";
import { auth, db } from "@/lib/firebase/client";
import { usernameToEmail } from "@/lib/utils";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "Credenziali errate: le porte del regno restano chiuse.",
  "auth/user-not-found": "Credenziali errate: le porte del regno restano chiuse.",
  "auth/wrong-password": "Credenziali errate: le porte del regno restano chiuse.",
  "auth/invalid-email": "Nome utente non valido.",
  "auth/user-disabled": "Questo accesso è stato revocato dai Custodi del Regno.",
  "auth/too-many-requests": "Troppi tentativi: attendi qualche istante e riprova.",
  "auth/network-request-failed": "Impossibile raggiungere il regno: controlla la connessione.",
  "auth/requires-recent-login": "Per sicurezza devi accedere di nuovo prima di questa operazione.",
  "auth/invalid-api-key": "Configurazione del regno incompleta: manca la chiave API di Firebase (.env.local).",
  "auth/configuration-not-found": "Autenticazione non configurata nel progetto Firebase. Abilita il provider Email/Password.",
};

/** Traduce i codici di errore Firebase Auth in messaggi italiani a tema. */
export function translateAuthError(error: unknown): string {
  const code = (error as { code?: string })?.code ?? "";
  return (
    AUTH_ERROR_MESSAGES[code] ??
    "Si è verificato un errore imprevisto. Riprova tra poco."
  );
}

/**
 * Login con username + password: lo username viene mappato
 * sull'email fittizia gestita da Firebase Auth.
 * Aggiorna `lastLogin` e restituisce il flag di cambio password obbligatorio.
 */
export async function loginWithUsername(
  username: string,
  password: string
): Promise<{ mustChangePassword: boolean }> {
  const credential = await signInWithEmailAndPassword(
    auth,
    usernameToEmail(username),
    password
  );

  const userRef = doc(db, COLLECTIONS.users, credential.user.uid);
  const snapshot = await getDoc(userRef).catch(() => null);
  const mustChangePassword = snapshot?.exists()
    ? Boolean(snapshot.data().mustChangePassword)
    : false;

  // Best effort: non blocca il login se le rules lo impediscono
  void updateDoc(userRef, { lastLogin: serverTimestamp() }).catch(
    () => undefined
  );

  return { mustChangePassword };
}

/**
 * Cambio password dell'utente corrente: riautentica con la password
 * attuale, aggiorna la password e azzera `mustChangePassword`.
 */
export async function changeOwnPassword(
  user: User,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  if (!user.email) throw new Error("Account non valido");
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
  await updateDoc(doc(db, COLLECTIONS.users, user.uid), {
    mustChangePassword: false,
  }).catch(() => undefined);
}
