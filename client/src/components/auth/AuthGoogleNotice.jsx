import { AlertTriangle } from 'lucide-react';
import { googleAuthEnabled } from '../../lib/googleAuth.js';

export default function AuthGoogleNotice() {
  if (googleAuthEnabled) return null;

  return (
    <div className="rounded-xl border border-sky-400/30 bg-sky-400/10 px-4 py-3 text-sm text-sky-950 dark:text-sky-100">
      <div className="flex gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
        <div className="space-y-2">
          <p className="font-semibold">Google sign-in is not configured</p>
          <p className="text-sky-900/90 dark:text-sky-200/90">
            Create a Google OAuth Client ID in Google Cloud Console, then set it in both env files and restart
            the app:
          </p>
          <pre className="overflow-x-auto rounded-lg bg-black/5 p-2 text-xs dark:bg-black/30">
{`# server/.env
GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com

# client/.env
VITE_GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com`}
          </pre>
          <p className="text-xs text-sky-800/90 dark:text-sky-300/90">
            Authorized JavaScript origin: <code className="rounded bg-black/5 px-1 dark:bg-white/10">http://localhost:5173</code>
          </p>
        </div>
      </div>
    </div>
  );
}
