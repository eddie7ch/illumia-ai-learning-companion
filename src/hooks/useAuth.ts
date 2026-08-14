import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

export interface AuthState {
  isLoading: boolean;
  user: User | null;
  error: string | null;
  isPasswordRecovery: boolean;
}

/** Wraps Supabase email/password auth. No-ops (never loads) when Supabase isn't configured. */
export function useAuth() {
  const [state, setState] = useState<AuthState>({
    isLoading: isSupabaseConfigured,
    user: null,
    error: null,
    isPasswordRecovery: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setState((prev) => ({ ...prev, user: data.session?.user ?? null, isLoading: false }));
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      setState((prev) => ({
        ...prev,
        user: session?.user ?? null,
        isLoading: false,
        isPasswordRecovery: event === 'PASSWORD_RECOVERY' ? true : prev.isPasswordRecovery,
      }));
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) return;
    setIsSubmitting(true);
    setState((prev) => ({ ...prev, error: null }));
    const { error } = await supabase.auth.signUp({ email, password });
    setIsSubmitting(false);
    if (error) setState((prev) => ({ ...prev, error: error.message }));
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return;
    setIsSubmitting(true);
    setState((prev) => ({ ...prev, error: null }));
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setIsSubmitting(false);
    if (error) setState((prev) => ({ ...prev, error: error.message }));
  }, []);

  const signInAsGuest = useCallback(async () => {
    if (!supabase) return;
    setIsSubmitting(true);
    setState((prev) => ({ ...prev, error: null }));
    const { error } = await supabase.auth.signInAnonymously();
    setIsSubmitting(false);
    if (error) setState((prev) => ({ ...prev, error: error.message }));
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    if (!supabase) return false;
    setIsSubmitting(true);
    setState((prev) => ({ ...prev, error: null }));
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    setIsSubmitting(false);
    if (error) {
      setState((prev) => ({ ...prev, error: error.message }));
      return false;
    }
    return true;
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    if (!supabase) return false;
    setIsSubmitting(true);
    setState((prev) => ({ ...prev, error: null }));
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsSubmitting(false);
    if (error) {
      setState((prev) => ({ ...prev, error: error.message }));
      return false;
    }
    setState((prev) => ({ ...prev, isPasswordRecovery: false }));
    return true;
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  return {
    ...state,
    isSubmitting,
    signUp,
    signIn,
    signInAsGuest,
    sendPasswordReset,
    updatePassword,
    signOut,
  };
}
