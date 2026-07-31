// ─────────────────────────────────────────────────────────────────────────────
// Firebase Phone Auth — using Firebase JS SDK (works in Expo Go without
// native modules; uses reCAPTCHA web view for app verification)
// ─────────────────────────────────────────────────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp, getApps } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  signInWithPhoneNumber,
  getReactNativePersistence,
  type ConfirmationResult,
  type Auth,
} from 'firebase/auth';

// Firebase config from google-services.json
const FIREBASE_CONFIG = {
  apiKey:            'AIzaSyB3E4906IcuIMYW5zwkoq--XsA-rBkgcDo',
  authDomain:        'kpark-edu.firebaseapp.com',
  projectId:         'kpark-edu',
  storageBucket:     'kpark-edu.firebasestorage.app',
  messagingSenderId: '1027948040827',
  appId:             '1:1027948040827:android:a1300754e4ccb17e8c48de',
  databaseURL:       'https://kpark-edu-default-rtdb.firebaseio.com',
};

// Initialise Firebase app once
const app = getApps().length === 0
  ? initializeApp(FIREBASE_CONFIG)
  : getApps()[0];

// Initialise Auth with AsyncStorage persistence (React Native compatible)
let _auth: Auth;
try {
  _auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  // Already initialised (hot reload)
  _auth = getAuth(app);
}

export { _auth as firebaseAuth };

// ─────────────────────────────────────────────────────────────────────────────
// Phone OTP helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Send SMS OTP via Firebase Phone Auth. Returns a ConfirmationResult. */
export async function sendFirebasePhoneOtp(
  phoneNumber: string,            // E.164 format e.g. +919876543210
): Promise<ConfirmationResult> {
  // On React Native, Firebase JS SDK uses reCAPTCHA via expo-web-browser
  // Pass a fake ApplicationVerifier — Firebase handles it internally on RN
  const confirmationResult = await signInWithPhoneNumber(
    _auth,
    phoneNumber,
    // applicationVerifier is NOT required on React Native (only on web)
    undefined as any,
  );
  return confirmationResult;
}

/** Verify the OTP entered by the user. Returns Firebase User or throws. */
export async function verifyFirebasePhoneOtp(
  confirmationResult: ConfirmationResult,
  otp: string,
) {
  const userCredential = await confirmationResult.confirm(otp);
  return userCredential.user;
}
