import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { Sparkles } from 'lucide-react';

interface AuthPanelProps {
  error: string | null;
  isSubmitting: boolean;
  onSignIn: (email: string, password: string) => void;
  onSignUp: (email: string, password: string) => void;
  onGuest: () => void;
}

export default function AuthPanel({ error, isSubmitting, onSignIn, onSignUp, onGuest }: AuthPanelProps) {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const emailId = useId();
  const passwordId = useId();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
          {mode === 'sign-in' ? 'Sign in to your learning dashboard' : 'Create your account'}
        </h1>

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
          <div>
            <label htmlFor={passwordId} className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Password
            </label>
            <input
              id={passwordId}
              type="password"
              required
              minLength={6}
              autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 disabled:opacity-60"
          >
            {isSubmitting ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Sign up'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode((prev) => (prev === 'sign-in' ? 'sign-up' : 'sign-in'))}
          className="mt-3 text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
        >
          {mode === 'sign-in' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}
