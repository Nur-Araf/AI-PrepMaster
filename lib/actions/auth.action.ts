"use server";

import { auth, db } from "@/firebase/admin";
import { cookies } from "next/headers";

export async function signUp(params: SignUpParams) {
  const { uid, name, email } = params;

  try {
    const userRecord = await db.collection("users").doc(uid).get();
    if (userRecord.exists) {
      return {
        success: false,
        message: "User already exists",
      };
    }

    await db.collection("users").doc(uid).set({
      name,
      email,
    });
    console.log("Firestore write successful for user:", uid);
    return {
      success: true,
      message: "Account created successfully. Please sign in.",
    };
  } catch (error: any) {
    console.log("Raw error caught in signUp:", error);

    // Safely extract code/message
    const errorCode = error?.code ?? "unknown_code";
    const errorMessage = error?.message ?? "unknown_message";

    // Log exactly what's available
    console.log("Parsed error details:", { errorCode, errorMessage });

    // Defensive return
    if (errorCode === "permission-denied") {
      return {
        success: false,
        message: "Permission denied when saving user data.",
      };
    }

    return {
      success: false,
      message: `Failed to create an account: ${errorMessage}`,
    };
  }
}

export async function signIn(params: SignInParams) {
  const { email, idToken } = params;

  try {
    const userRecord = await auth.getUserByEmail(email);

    if (!userRecord) {
      return {
        success: false,
        message: "User does not exist. Please create a account instead.",
      };
    }

    await setSessionCookie(idToken);
  } catch (error) {
    console.log("Error in sign in", error);

    return {
      success: false,
      message: "Failed to sign in",
    };
  }
}

export async function setSessionCookie(idToken: string) {
  const cookieStore = await cookies();

  const sessionCookie = await auth.createSessionCookie(idToken, {
    expiresIn: 60 * 60 * 24 * 7 * 1000, // 7 days
  });

  cookieStore.set("session", sessionCookie, {
    httpOnly: true,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}
