/**
 * src/services/aiDoctorService.js
 *
 * Single module that the chat screen uses to talk to Dr. Yello.
 * All Anthropic API calls go through the Firebase Cloud Function —
 * no API key ever touches the mobile app.
 *
 * Also contains stub DB helpers — swap them out when your
 * Firestore collections are ready.
 */

import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
// Import your existing firebase app instance:
// import { app } from "./firebaseConfig";  ← adjust path as needed

// ─── Firebase instances ────────────────────────────────────────────────────
// Replace `app` with however your project exports the Firebase app.
// Example: export const app = initializeApp(firebaseConfig) in firebaseConfig.js
let _functions = null;
let _db = null;

function getFunctionsInstance() {
  if (!_functions) {
    // lazy-init so this file can be imported safely before Firebase is ready
    const { app } = require("./firebaseConfig"); // adjust path
    _functions = getFunctions(app, "us-central1"); // change region if needed
  }
  return _functions;
}

function getDBInstance() {
  if (!_db) {
    const { app } = require("./firebaseConfig");
    _db = getFirestore(app);
  }
  return _db;
}

// ─── AI Doctor ────────────────────────────────────────────────────────────

/**
 * sendMessage
 * Calls the Firebase Cloud Function with the full conversation history.
 *
 * @param {Array<{role: string, content: string}>} messages - full chat history
 * @returns {Promise<string>} - Dr. Yello's reply text
 */
export async function sendMessage(messages) {
  const functions = getFunctionsInstance();
  const askDoctor = httpsCallable(functions, "askDoctor");

  const result = await askDoctor({ messages });
  return result.data.reply;
}

// ─── Conversation persistence (DB stubs) ──────────────────────────────────
// These are no-ops now. When your Firestore is ready, uncomment the real code.

/**
 * saveConversation
 * Saves the full chat history for a user to Firestore.
 */
export async function saveConversation(userId, messages) {
  if (!userId || userId === "guest") return;

  // TODO: uncomment when Firestore is set up
  // const db = getDBInstance();
  // await setDoc(
  //   doc(db, "chats", userId),
  //   { messages, updatedAt: new Date() },
  //   { merge: true }
  // );

  console.log("[DB stub] saveConversation — will persist to Firestore later");
}

/**
 * loadConversation
 * Loads prior chat history for a user from Firestore.
 * Returns [] if no history exists.
 */
export async function loadConversation(userId) {
  if (!userId || userId === "guest") return [];

  // TODO: uncomment when Firestore is set up
  // const db = getDBInstance();
  // const snap = await getDoc(doc(db, "chats", userId));
  // return snap.exists() ? snap.data().messages || [] : [];

  console.log("[DB stub] loadConversation — will load from Firestore later");
  return [];
}

/**
 * getPatientProfile
 * Fetches the patient's stored profile (age, conditions, allergies, etc.)
 * so the AI can personalise its responses.
 */
export async function getPatientProfile(userId) {
  if (!userId || userId === "guest") return null;

  // TODO: uncomment when Firestore is set up
  // const db = getDBInstance();
  // const snap = await getDoc(doc(db, "patients", userId));
  // return snap.exists() ? snap.data() : null;

  return null;
}

/**
 * bookAppointment
 * Creates an appointment document in Firestore.
 *
 * @param {object} details - { userId, specialty, preferredTime, preferredDoctor }
 */
export async function bookAppointment(details) {
  // TODO: uncomment when Firestore is set up
  // const db = getDBInstance();
  // const ref = doc(collection(db, "appointments"));
  // await setDoc(ref, { ...details, status: "pending", createdAt: new Date() });
  // return { success: true, appointmentId: ref.id };

  console.log("[DB stub] bookAppointment — will write to Firestore later", details);
  return { success: true, appointmentId: "PENDING" };
}
