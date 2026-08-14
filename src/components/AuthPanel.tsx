import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { Eye, EyeOff, Sparkles } from 'lucide-react';

interface AuthPanelProps {
  error: string | null;
  isSubmitting: boolean;
  onSignIn: (email: string, password: string) => void;
  onSignUp: (email: string, password: string) => void;
  onGuest: () => void;
  onForgotPassword: (email: string) => Promise<boolean>;
}

export default function AuthPanel({
  error,
  isSubmitting,
  onSignIn,
  onSignUp,
  onGuest,
  onForgotPassword,
}: AuthPanelProps) {
  const [mode, setMode] = useState<'sign-in' | 'sign-up' | 'forgot-password'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmMismatch, setConfirmMismatch] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const emailId = useId();
  const passwordId = useId();
  const confirmPasswordId = useId();

  const switchMode = (nextMode: 'sign-in' | 'sign-up' | 'forgot-password') => {
    setMode(nextMode);
    setConfirmMismatch(false);
    setResetEmailSent(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mode === 'forgot-password') {
      const sent = await onForgotPassword(email);
      if (sent) setResetEmailSent(true);
      return;
    }
    if (mode === 'sign-up' && password !== confirmPassword) {
      setConfirmMismatch(true);
      return;
    }
    setConfirmMismatch(false);
    if (mode === 'sign-in') onSignIn(email, password);
    else onSignUp(email, password);
  };

  return (
    <div className="flex min-h-full items-center justify-center bg-slate-50 px-4 py-12 dark:bg-slate-900">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          AI Learning Companion
        </p>
        <h1 className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
          {mode === 'sign-in' && 'Sign in to your learning dashboard'}
          {mode === 'sign-up' && 'Create your account'}
          {mode === 'forgot-password' && 'Reset your password'}
        </h1>

        {mode === 'forgot-password' && resetEmailSent ? (
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
            If an account exists for <span className="font-medium">{email}</span>, a password reset link has been
            sent. Check your inbox.
          </p>
        ) : (
          <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
            <div>
              <label htmlFor={emailId} className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Email
              </label>
              <input
                id={emailId}
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>

            {mode !== 'forgot-password' && (
              <div>
                <label htmlFor={passwordId} className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Password
                </label>
                <div className="relative mt-1">
                  <input
                    id={passwordId}
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 pr-10 text-sm focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'sign-up' && (
              <div>
                <label htmlFor={confirmPasswordId} className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Confirm password
                </label>
                <input
                  id={confirmPasswordId}
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                />
                {confirmMismatch && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">Passwords do not match.</p>
                )}
              </div>
            )}

            {mode === 'sign-in' && (
              <button
                type="button"
                onClick={() => switchMode('forgot-password')}
                className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Forgot password?
              </button>
            )}

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 disabled:opacity-60"
            >
              {isSubmitting
                ? 'Please wait…'
                : mode === 'sign-in'
                  ? 'Sign in'
                  : mode === 'sign-up'
                    ? 'Sign up'
                    : 'Send reset link'}
            </button>
          </form>
        )}

        {mode === 'forgot-password' ? (
          <button
            type="button"
            onClick={() => switchMode('sign-in')}
            className="mt-3 text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
          >
            Back to sign in
          </button>
        ) : (
          <button
            type="button"
            onClick={() => switchMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
            className="mt-3 text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
          >
            {mode === 'sign-in' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        )}

        <div className="mt-4 flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          or
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        </div>

        <button
          type="button"
          onClick={onGuest}
          disabled={isSubmitting}
          className="mt-3 w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200 disabled:opacity-60 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Try the demo account
        </button>
        <p className="mt-2 text-center text-xs text-slate-400 dark:text-slate-500">
          The demo account is pre-loaded with sample courses and progress so you can explore every feature. Sign up
          for your own account to start fresh with no data.
        </p>
      </div>
    </div>
  );
}
