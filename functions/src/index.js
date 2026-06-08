/**
 * functions/src/index.js
 * Firebase Cloud Function — Secure Anthropic API Proxy
 *
 * SETUP:
 *   1. cd functions && npm install
 *   2. firebase functions:secrets:set ANTHROPIC_API_KEY
 *      (paste your key from console.anthropic.com when prompted)
 *   3. firebase deploy --only functions
 *
 * The API key NEVER leaves this server. The app calls this function,
 * this function calls Anthropic, and returns the result.
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp();

// Secret stored in Google Cloud Secret Manager — never in code
const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";

const SYSTEM_PROMPT = `You are Dr. Yello, the intelligent AI medical assistant for Yello | Clinics and Diagnostics. You are warm, empathetic, knowledgeable, and speak like a real doctor — not like a bot.

YOUR ROLE:
- Listen carefully to patients describing their symptoms, concerns, or medical history
- Ask relevant follow-up questions (one at a time) to understand their situation better
- Provide medically sound, clear, and compassionate guidance
- Assess urgency: tell them if something needs immediate emergency attention vs. a routine visit vs. can be managed at home
- Suggest appropriate doctor specialties or tests at Yello based on their symptoms
- Help them understand what might be causing their symptoms in plain English
- Guide them on appointment booking when appropriate

PERSONALITY:
- Speak like a caring family doctor, not a textbook
- Use simple language; explain any medical term you use
- Show empathy: acknowledge the patient's worry before diving into advice
- Be conversational and warm, not robotic

MEDICAL GUIDELINES:
- Always recommend professional in-person evaluation for serious or persistent symptoms
- For emergencies (chest pain, difficulty breathing, stroke signs, severe bleeding) — immediately direct them to call emergency services or go to the nearest ER
- Never claim to definitively diagnose — you provide likely possibilities and guidance
- For mental health concerns, respond with extra sensitivity

APPOINTMENT BOOKING:
- When a patient needs to see a doctor, ask what time works (morning/afternoon/evening) and if they prefer male/female doctor

CONTEXT:
- You are part of the Yello Clinics & Diagnostics mobile app
- Yello offers general medicine, diagnostics/lab tests, specialist consultations, and preventive care

Keep responses conversational — 2-4 sentences unless more detail is genuinely needed.`;

/**
 * askDoctor — callable function invoked by the mobile app
 *
 * Request payload:
 *   { messages: [ { role: "user"|"assistant", content: string }, ... ] }
 *
 * Response:
 *   { reply: string }
 */
exports.askDoctor = onCall(
  {
    secrets: [ANTHROPIC_API_KEY],
    // Optional: restrict to authenticated users only
    // enforceAppCheck: true,
  },
  async (request) => {
    // ── Auth guard (optional but recommended for production) ──────────────
    // Uncomment this block once Firebase Auth is wired up in the app:
    // if (!request.auth) {
    //   throw new HttpsError("unauthenticated", "You must be logged in.");
    // }
    // const userId = request.auth.uid;

    const { messages } = request.data;

    // Basic validation
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new HttpsError("invalid-argument", "messages array is required.");
    }

    // Sanitise: only allow role/content keys, max 50 turns to control cost
    const sanitised = messages.slice(-50).map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content).slice(0, 2000), // cap per-message length
    }));

    try {
      const response = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
          "x-api-key": ANTHROPIC_API_KEY.value(),
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 800,
          system: SYSTEM_PROMPT,
          messages: sanitised,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        console.error("Anthropic API error:", err);
        throw new HttpsError("internal", "AI service temporarily unavailable.");
      }

      const data = await response.json();
      const reply = data.content?.[0]?.text ?? "I'm sorry, I couldn't process that. Please try again.";

      // ── Optional: persist conversation to Firestore ───────────────────
      // Uncomment once DB is set up:
      // const db = getFirestore();
      // const userId = request.auth?.uid || "anonymous";
      // await db.collection("chats").doc(userId).set(
      //   { messages: [...sanitised, { role: "assistant", content: reply }],
      //     updatedAt: new Date() },
      //   { merge: true }
      // );

      return { reply };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      console.error("Unexpected error:", error);
      throw new HttpsError("internal", "Something went wrong. Please try again.");
    }
  }
);
