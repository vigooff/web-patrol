import { createAuthClient } from 'better-auth/react';

// Client-side auth instance — dipakai di komponen 'use client'
// untuk signIn, signUp, signOut, dan useSession.
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
});

export const { signIn, signOut, signUp, useSession } = authClient;
