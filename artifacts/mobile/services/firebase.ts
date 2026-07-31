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
  apiKey: 'AIzaSyB3E4906IcuIMYW5zwkoq--XsA-rBkgcDo',
  authDomain: 'kpark-edu.firebaseapp.com',
  projectId: 'kpark-edu',
  storageBucket: 'kpark-edu.firebasestorage.app',
  messagingSenderId: '1027948040827',
  appId: '1:1027948040827:android:a1300754e4ccb17e8c48de',
  databaseURL: 'https://kpark-edu-default-rtdb.firebaseio.com',
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

// We want real SMS to work, so we removed the test mode override.

export { _auth as firebaseAuth };

// ─────────────────────────────────────────────────────────────────────────────
// Phone OTP helpers
// ─────────────────────────────────────────────────────────────────────────────

import { Platform } from 'react-native';
import { RecaptchaVerifier } from 'firebase/auth';

/** Send SMS OTP via Firebase Phone Auth. Returns a ConfirmationResult. */
export async function sendFirebasePhoneOtp(
  phoneNumber: string,            // E.164 format e.g. +919876543210
): Promise<ConfirmationResult> {
  let verifier: any = undefined;

  if (Platform.OS === 'web') {
    // On web, Firebase strictly requires an ApplicationVerifier (reCAPTCHA)

    // 1. Clear any old, stale ReCAPTCHA instance that might be crashing the Google script
    if ((window as any).recaptchaVerifier) {
      try {
        (window as any).recaptchaVerifier.clear();
      } catch (e) { }
      (window as any).recaptchaVerifier = undefined;
    }

    // 2. Safely create or find the container
    let el = document.getElementById('recaptcha-container');
    if (!el) {
      el = document.createElement('div');
      el.id = 'recaptcha-container';
      // Ensure it is appended to the body safely
      document.body.appendChild(el);
    }

    // 3. Initialize a fresh verifier attached directly to the DOM element
    (window as any).recaptchaVerifier = new RecaptchaVerifier(_auth, el, {
      size: 'invisible',
    });

    verifier = (window as any).recaptchaVerifier;
  }

  // On React Native (iOS/Android), applicationVerifier is not required
  const confirmationResult = await signInWithPhoneNumber(
    _auth,
    phoneNumber,
    verifier
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
