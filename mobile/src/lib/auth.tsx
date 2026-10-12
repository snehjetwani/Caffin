import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import type { Session } from '@supabase/supabase-js';

import { supabase } from './supabase';
import { api, isStatus } from './api';
import type { Profile } from './types';

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  /** Initial session restore in flight. */
  authLoading: boolean;
  /** Profile fetch for the current session in flight. */
  profileLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  /**
   * Supabase signup. If email confirmation is disabled a session is returned
   * and the app-row is created immediately; the caller gets `needsConfirm`.
   */
  signUp: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    username: string,
  ) => Promise<{ needsConfirm: boolean }>;
  /** Create the /users app-row for the current session (two-step registration). */
  createProfile: (firstName: string, lastName: string, username: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Restore session on launch + subscribe to auth changes.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Load the app profile row whenever the authenticated user changes.
  const userId = session?.user?.id ?? null;
  useEffect(() => {
    let active = true;
    if (!userId) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    (async () => {
      try {
        const { data } = await api.get<Profile>('/users/me');
        if (active) setProfile(data);
      } catch (err) {
        // 404 => authenticated but no app-row yet (step 2 of registration
        // never completed). Surface as "no profile" so the UI can recover.
        if (active && isStatus(err, 404)) setProfile(null);
      } finally {
        if (active) setProfileLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  const refreshProfile = useCallback(async () => {
    try {
      const { data } = await api.get<Profile>('/users/me');
      setProfile(data);
    } catch (err) {
      if (isStatus(err, 404)) setProfile(null);
      else throw err;
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw error;
  }, []);

  const createProfile = useCallback(
    async (firstName: string, lastName: string, username: string) => {
      await api.post('/users', {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        username: username.trim().toLowerCase(),
      });
      await refreshProfile();
    },
    [refreshProfile],
  );

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      firstName: string,
      lastName: string,
      username: string,
    ) => {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      if (data.session) {
        // Auto-confirmed: we have a JWT, so create the app-row now.
        await createProfile(firstName, lastName, username);
        return { needsConfirm: false };
      }
      // Email confirmation required — profile is created after first login.
      return { needsConfirm: true };
    },
    [createProfile],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      authLoading,
      profileLoading,
      signIn,
      signUp,
      createProfile,
      refreshProfile,
      signOut,
    }),
    [
      session,
      profile,
      authLoading,
      profileLoading,
      signIn,
      signUp,
      createProfile,
      refreshProfile,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
