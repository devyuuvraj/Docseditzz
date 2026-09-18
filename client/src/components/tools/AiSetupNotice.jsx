import { AlertTriangle } from 'lucide-react';
import useAppFeatures from '../../hooks/useAppFeatures.js';

export default function AiSetupNotice() {
  const { data: features, isLoading } = useAppFeatures();

  if (isLoading) return null;

  if (!features?.ai) {
    return (
      <div className="mb-6 rounded-2xl border border-amber-400/40 bg-amber-400/10 px-5 py-4">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="space-y-2 text-sm text-amber-900 dark:text-amber-100">
            <p className="font-semibold">OpenAI API key is missing</p>
            <p className="text-amber-800/90 dark:text-amber-200/90">
              Add your key to <code className="rounded bg-black/5 px-1.5 py-0.5 text-xs dark:bg-white/10">server/.env</code> and restart the backend:
            </p>
            <pre className="overflow-x-auto rounded-xl bg-black/5 p-3 text-xs leading-relaxed dark:bg-black/30">
{`OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4o-mini`}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  if (features?.aiStatus?.reason === 'no_credits') {
    return (
      <div className="mb-6 rounded-2xl border border-amber-400/40 bg-amber-400/10 px-5 py-4">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="space-y-2 text-sm text-amber-900 dark:text-amber-100">
            <p className="font-semibold">OpenAI credits are exhausted</p>
            <p className="text-amber-800/90 dark:text-amber-200/90">
              Your key works, but the OpenAI account has no credits left. Add billing at{' '}
              <a
                href="https://platform.openai.com/settings/organization/billing"
                target="_blank"
                rel="noreferrer"
                className="font-semibold underline underline-offset-2"
              >
                platform.openai.com/settings/organization/billing
              </a>
              .
            </p>
            <p className="text-xs text-amber-700/90 dark:text-amber-300/90">
              In development, DOCSEDITZ will still generate a basic local summary so you can keep testing.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export function AiFallbackNotice({ notice }) {
  if (!notice) return null;
  return (
    <div className="mb-4 rounded-xl border border-sky-400/30 bg-sky-400/10 px-4 py-3 text-sm text-sky-900 dark:text-sky-100">
      {notice}
    </div>
  );
}
