import { AlertTriangle } from 'lucide-react';
import useAppFeatures from '../../hooks/useAppFeatures.js';

export default function AuthEmailNotice() {
  const { data: features, isLoading } = useAppFeatures();

  if (isLoading || features?.email) return null;

  return (
    <div className="mb-5 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
      <div className="flex gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <div>
          <p className="font-semibold">Email delivery is not configured</p>
          <p className="mt-1 text-amber-800/90 dark:text-amber-200/90">
            DOCSEDITZ uses email only (not SMS/mobile). Verification codes and reset links are shown on screen in
            development until you add SMTP settings in <code className="rounded bg-black/5 px-1 dark:bg-white/10">server/.env</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
