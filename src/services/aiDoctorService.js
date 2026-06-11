import { db } from '../config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// Placeholder for Cloud Function URL (replace with actual endpoint once deployed)
const CLOUD_FUNCTION_URL = 'https://us-central1-your-project-id.cloudfunctions.net/aiDoctorChat';

export const loadConversation = async (userId) => {
  if (!userId || userId === 'guest') return [];
  try {
    const docRef = doc(db, 'ai_conversations', userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().history || [];
    }
  } catch (error) {
    console.error('Error loading conversation:', error);
  }
  return [];
};

export const saveConversation = async (userId, history) => {
  if (!userId || userId === 'guest') return;
  try {
    const docRef = doc(db, 'ai_conversations', userId);
    await setDoc(docRef, { history, lastUpdated: new Date().toISOString() }, { merge: true });
  } catch (error) {
    console.error('Error saving conversation:', error);
  }
};

export const sendMessage = async (history) => {
  try {
    // Basic mock response for testing until the Cloud Function is connected
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve("Hello! I am Dr. Yello, your AI assistant. I've received your message. How can I help you today?");
      }, 1500);
    });

    /* 
    // Uncomment and replace with actual Cloud Function fetch when ready
    const response = await fetch(CLOUD_FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ history })
    });
    
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();
    return data.reply;
    */
  } catch (error) {
    console.error('Error sending message to AI:', error);
    throw error;
  }
};
