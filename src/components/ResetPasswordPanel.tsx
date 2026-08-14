import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { Eye, EyeOff, Sparkles } from 'lucide-react';

interface ResetPasswordPanelProps {
  error: string | null;
  isSubmitting: boolean;
  onSubmit: (newPassword: string) => Promise<boolean>;
}

/** Shown after a user follows the "reset password" email link (Supabase PASSWORD_RECOVERY session). */
export default function ResetPasswordPanel({ error, isSubmitting, onSubmit }: ResetPasswordPanelProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmMismatch, setConfirmMismatch] = useState(false);
  const [done, setDone] = useState(false);
  const passwordId = useId();
  const confirmPasswordId = useId();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      setConfirmMismatch(true);
      return;
    }
    setConfirmMismatch(false);
    const success = await onSubmit(password);
    if (success) setDone(true);
  };

  return (
    <div className="flex min-h-full items-center justify-center bg-slate-50 px-4 py-12 dark:bg-slate-900">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          AI Learning Companion
        </p>
        <h1 className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">Choose a new password</h1>

        {done ? (
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
            Your password has been updated. Continuing to your dashboard…
          </p>
        ) : (
          <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
            <div>
              <label htmlFor={passwordId} className="text-sm font-medium text-slate-700 dark:text-slate-200">
                New password
              </label>
              <div className="relative mt-1">
                <input
                  id={passwordId}
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  autoComplete="new-password"
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

            <div>
              <label htmlFor={confirmPasswordId} className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Confirm new password
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

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 disabled:opacity-60"
            >
              {isSubmitting ? 'Please wait…' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
