import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyAzAnwhtM-YkAK2HAfWWgYvcbTnczdSN8U',
  authDomain: 'greek-brevets-tracker.firebaseapp.com',
  projectId: 'greek-brevets-tracker',
  storageBucket: 'greek-brevets-tracker.firebasestorage.app',
  messagingSenderId: '268041728617',
  appId: '1:268041728617:web:28e85bbdd27174181f28f8',
  databaseURL: 'https://greek-brevets-tracker-default-rtdb.europe-west1.firebasedatabase.app',
};

const app = getApps().length === 0 
  ? initializeApp(firebaseConfig) 
  : getApps()[0];

export const db = getFirestore(app);
export default app;