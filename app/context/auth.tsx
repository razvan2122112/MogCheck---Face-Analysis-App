"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { User, SupabaseClient } from "@supabase/supabase-js";
import { getBrowserClient, type Profile } from "@/lib/supabase";

interface AuthCtx {
  user: User | null;
  profile: Profile | null;
  authLoading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({
  user: null,
  profile: null,
  authLoading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  // Keep client in a ref so callbacks always see the current instance without re-renders
  const supabaseRef = useRef<SupabaseClient | null>(null);

  const fetchProfile = useCallback(async (uid: string) => {
    const client = supabaseRef.current;
    if (!client) return;
    const { data } = await client.from("profiles").select("*").eq("id", uid).single();
    if (data) setProfile(data as Profile);
  }, []);

  useEffect(() => {
    // getBrowserClient returns null when env vars are missing (build-time / unconfigured)
    const client = getBrowserClient();
    if (!client) {
      setAuthLoading(false);
      return;
    }
    supabaseRef.current = client;

    client.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      setAuthLoading(false);
    });

    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signOut = async () => {
    const client = supabaseRef.current;
    if (!client) return;
    await client.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  return (
    <AuthContext.Provider value={{ user, profile, authLoading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
