import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  type ConfirmationResult,
  type Auth,
} from 'firebase/auth';

// Firebase config from google-services.json / mobile app
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

// Initialise Auth (Web automatically handles persistence)
const _auth: Auth = getAuth(app);

export { _auth as firebaseAuth };

/** Send SMS OTP via Firebase Phone Auth. Returns a ConfirmationResult. */
export async function sendFirebasePhoneOtp(
  phoneNumber: string, // E.164 format e.g. +919876543210
): Promise<ConfirmationResult> {
  // On web, Firebase strictly requires an ApplicationVerifier (reCAPTCHA)

  // 1. Clear any old, stale ReCAPTCHA instance
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
    document.body.appendChild(el);
  }

  // 3. Initialize a fresh verifier attached directly to the DOM element
  (window as any).recaptchaVerifier = new RecaptchaVerifier(_auth, el, {
    size: 'invisible',
  });

  const verifier = (window as any).recaptchaVerifier;

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
  const result = await confirmationResult.confirm(otp);
  return result.user;
}
