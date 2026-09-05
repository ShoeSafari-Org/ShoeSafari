import {
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "./firebaseConfig";

const requireAuth = () => {
  if (!auth) {
    throw new Error(
      "Authentication is not configured. Add the Firebase environment variables to .env.local."
    );
  }
  return auth;
};

const provider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(requireAuth(), provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential.accessToken;
    const user = result.user;
    const name = user.displayName;
    const email = user.email;
    const photoURL = user.photoURL;
    return { user, name, email, photoURL };
  } catch (error) {
    throw new Error(`Error logging in with Google: ${error.message}`);
  }
};

export const signup = async (email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      requireAuth(),
      email,
      password
    );
    return userCredential.user;
  } catch (error) {
    throw new Error(`Error signing up: ${error.message}`);
  }
};

export const login = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      requireAuth(),
      email,
      password
    );
    return userCredential.user;
  } catch (error) {
    throw new Error(`Error logging in: ${error.message}`);
  }
};

export const logout = async () => {
  try {
    await signOut(requireAuth());
  } catch (error) {
    throw new Error(`Error logging out: ${error.message}`);
  }
};
