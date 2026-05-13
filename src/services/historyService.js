import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

export async function saveRecapToHistory(userId, payload) {
  if (!userId) {
    throw new Error("Utente non autenticato.");
  }

  const ref = collection(db, "users", userId, "recaps");

  const docRef = await addDoc(ref, {
    title: payload.title || "Recap senza titolo",
    short: payload.short || "",
    important: payload.important || [],
    decisions: payload.decisions || [],
    openQuestions: payload.openQuestions || [],
    actions: payload.actions || [],
    originalTextPreview: payload.originalTextPreview || "",
    messageCount: payload.messageCount || 0,
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function getUserRecaps(userId) {
  if (!userId) {
    throw new Error("Utente non autenticato.");
  }

  const ref = collection(db, "users", userId, "recaps");
  const q = query(ref, orderBy("createdAt", "desc"));

  const snapshot = await getDocs(q);

  return snapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  }));
}

export async function deleteUserRecap(userId, recapId) {
  if (!userId || !recapId) {
    throw new Error("Dati mancanti per eliminare il recap.");
  }

  const ref = doc(db, "users", userId, "recaps", recapId);

  await deleteDoc(ref);
}
