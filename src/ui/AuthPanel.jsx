/**
 * LOOKING GLASS — Auth Panel (Supabase email + password)
 *
 * Provides Login / Sign up / Log out for cloud sync. Drives the global store
 * user + authReady via supabaseClient.auth.onAuthStateChange (wired in
 * useStore). This panel is purely presentational + calls the auth client.
 *
 * If Supabase is not configured (env vars unset), it renders a disabled
 * "cloud sync not configured" notice and does nothing else — local-first
 * behaviour is completely unaffected.
 */
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  Envelope,
  Lock,
  SignIn,
  SignOut,
  UserPlus,
  Cloud,
  CloudSlash,
} from '@phosphor-icons/react';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabaseClient.js';
import { useStore } from '../store/useStore.js';

export default function AuthPanel() {
  const user = useStore((s) => s.user);
  const authReady = useStore((s) => s.authReady);

  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmNote, setConfirmNote] = useState(false);

  // Clear transient form state when auth resolves.
  useEffect(() => {
    if (user) {
      setEmail('');
      setPassword('');
      setConfirmNote(false);
      setBusy(false);
    }
  }, [user]);

  if (!isSupabaseConfigured) {
    return (
      <div className="lg-auth lg-auth--disabled" aria-disabled="true">
        <CloudSlash size={18} weight="regular" />
        <div className="lg-auth__body">
          <div className="lg-auth__title">Cloud sync not configured</div>
          <div className="lg-auth__hint">
            Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable cross-device sync.
            Your data stays local for now.
          </div>
        </div>
      </div>
    );
  }

  const handleAuth = async (e) => {
    e.preventDefault();
    const supabase = getSupabaseClient();
    if (!supabase) return;
    if (!email.trim() || !password) {
      toast.error('Enter both email and password.');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }

    setBusy(true);
    setConfirmNote(false);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('Signed in — syncing your canvases…');
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data?.user && !data.session) {
          // Email confirmation required.
          setConfirmNote(true);
          toast.success('Confirmation email sent — check your inbox.');
        } else {
          toast.success('Account created — syncing your canvases…');
        }
      }
    } catch (err) {
      console.warn('[LG auth]', err);
      toast.error(err?.message || 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast('Signed out. Working locally.');
    } catch (err) {
      toast.error(err?.message || 'Sign out failed.');
    } finally {
      setBusy(false);
    }
  };

  // ── Logged in ──
  if (user) {
    return (
      <div className="lg-auth lg-auth--logged-in">
        <Cloud size={18} weight="regular" className="lg-auth__icon--on" />
        <div className="lg-auth__body">
          <div className="lg-auth__title">Synced</div>
          <div className="lg-auth__email" title={user.email}>{user.email}</div>
        </div>
        <button
          className="lg-auth__btn lg-auth__btn--ghost"
          onClick={handleLogout}
          disabled={busy}
          aria-label="Log out"
          title="Log out"
        >
          <SignOut size={16} weight="regular" />
        </button>
      </div>
    );
  }

  // ── Logged out ──
  return (
    <div className="lg-auth">
      <div className="lg-auth__header">
        <Cloud size={18} weight="regular" />
        <span className="lg-auth__title">Cloud sync</span>
      </div>

      <form className="lg-auth__form" onSubmit={handleAuth}>
        <label className="lg-auth__field">
          <Envelope size={15} weight="regular" />
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
          />
        </label>

        <label className="lg-auth__field">
          <Lock size={15} weight="regular" />
          <input
            type="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
          />
        </label>

        {confirmNote && (
          <div className="lg-auth__confirm">
            Check your email to confirm your account, then sign in.
          </div>
        )}

        <div className="lg-auth__actions">
          {mode === 'signin' ? (
            <>
              <button type="submit" className="lg-auth__btn lg-auth__btn--primary" disabled={busy}>
                <SignIn size={15} weight="regular" /> Sign in
              </button>
              <button
                type="button"
                className="lg-auth__btn lg-auth__btn--link"
                onClick={() => setMode('signup')}
                disabled={busy}
              >
                <UserPlus size={15} weight="regular" /> Sign up
              </button>
            </>
          ) : (
            <>
              <button type="submit" className="lg-auth__btn lg-auth__btn--primary" disabled={busy}>
                <UserPlus size={15} weight="regular" /> Create account
              </button>
              <button
                type="button"
                className="lg-auth__btn lg-auth__btn--link"
                onClick={() => setMode('signin')}
                disabled={busy}
              >
                <SignIn size={15} weight="regular" /> Sign in
              </button>
            </>
          )}
        </div>
      </form>

      {!authReady && <div className="lg-auth__hint">Checking session…</div>}
    </div>
  );
}
