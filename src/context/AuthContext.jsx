import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authConfigured, supabase } from '../services/supabaseClient.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

/** Google sign-in through Supabase Auth. `user` is null while signed out (guest mode). */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(authConfigured);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    if (!supabase) return undefined;
    let alive = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!alive) return;
      if (error) setAuthError(error.message);
      setSession(data?.session ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setLoading(false);
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) { setAuthError('Sign-in is not configured yet.'); return; }
    setAuthError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) setAuthError(error.message);
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) setAuthError(error.message);
  }, []);

  const user = session?.user ?? null;
  const userId = user?.id ?? null;
  const value = useMemo(() => ({
    user, userId, loading, authError, authConfigured, signInWithGoogle, signOut,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [userId, user?.email, loading, authError, signInWithGoogle, signOut]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
