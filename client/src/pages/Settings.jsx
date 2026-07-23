import { useSelector, useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { Palette, Globe, Bell, Keyboard } from 'lucide-react';
import api, { apiErrorMessage } from '../lib/axios.js';
import { setUser } from '../features/auth/authSlice.js';
import { setTheme } from '../features/theme/themeSlice.js';
import Card from '../components/ui/Card.jsx';
import Select from '../components/ui/Select.jsx';
import { cn } from '../lib/utils.js';

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी (Hindi)' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'pt', label: 'Português' },
  { value: 'zh', label: '中文' },
  { value: 'ar', label: 'العربية' },
];

const SHORTCUTS = [
  ['Ctrl + Z', 'Undo (editor)'],
  ['Ctrl + Shift + Z', 'Redo (editor)'],
  ['Delete', 'Delete selected object (editor)'],
  ['Ctrl + D', 'Duplicate selected object (editor)'],
  ['Ctrl + S', 'Save document (editor)'],
  ['/', 'Focus search'],
];

export default function Settings() {
  const { user } = useSelector((s) => s.auth);
  const mode = useSelector((s) => s.theme.mode);
  const dispatch = useDispatch();

  const savePrefs = async (prefs) => {
    try {
      const { data } = await api.patch('/users/me/preferences', prefs);
      dispatch(setUser({ ...user, preferences: data.data.preferences }));
      toast.success('Preferences saved');
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  const notifications = user?.preferences?.notifications || {};

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-black text-slate-900 dark:text-white">Settings</h1>

      {/* Theme */}
      <Card>
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-800 dark:text-white">
          <Palette className="h-4 w-4 text-brand-500" /> Appearance
        </h2>
        <div className="flex gap-3">
          {['light', 'dark'].map((t) => (
            <button
              key={t}
              onClick={() => {
                dispatch(setTheme(t));
                savePrefs({ theme: t });
              }}
              className={cn(
                'flex-1 rounded-2xl border-2 p-4 transition-all',
                mode === t
                  ? 'border-brand-500 bg-brand-500/5'
                  : 'border-slate-200 hover:border-slate-300 dark:border-white/10'
              )}
            >
              <div
                className={cn(
                  'mx-auto mb-3 h-16 w-full max-w-[140px] rounded-xl border',
                  t === 'light' ? 'border-slate-200 bg-white' : 'border-white/10 bg-surface-900'
                )}
              >
                <div className={cn('m-2 h-2 w-1/2 rounded-full', t === 'light' ? 'bg-slate-200' : 'bg-white/15')} />
                <div className={cn('m-2 h-2 w-3/4 rounded-full', t === 'light' ? 'bg-slate-100' : 'bg-white/10')} />
              </div>
              <p className="text-sm font-semibold capitalize text-slate-700 dark:text-slate-200">{t} mode</p>
            </button>
          ))}
        </div>
      </Card>

      {/* Language */}
      <Card>
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-800 dark:text-white">
          <Globe className="h-4 w-4 text-brand-500" /> Language
        </h2>
        <Select
          value={user?.preferences?.language || 'en'}
          onChange={(e) => savePrefs({ language: e.target.value })}
          options={LANGUAGES}
        />
        <p className="mt-2 text-xs text-slate-400">
          Sets your interface preference and the default target language for AI translation.
        </p>
      </Card>

      {/* Notifications */}
      <Card>
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-800 dark:text-white">
          <Bell className="h-4 w-4 text-brand-500" /> Notifications
        </h2>
        <div className="space-y-3">
          {[
            { key: 'email', label: 'Email notifications', desc: 'Security alerts and account activity' },
            { key: 'product', label: 'Product updates', desc: 'New features and improvements' },
          ].map(({ key, label, desc }) => (
            <label key={key} className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 p-4 dark:border-white/10">
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</p>
                <p className="text-xs text-slate-400">{desc}</p>
              </div>
              <input
                type="checkbox"
                checked={notifications[key] !== false}
                onChange={(e) => savePrefs({ notifications: { [key]: e.target.checked } })}
                className="h-5 w-5 accent-brand-600"
              />
            </label>
          ))}
        </div>
      </Card>

      {/* Shortcuts */}
      <Card>
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-800 dark:text-white">
          <Keyboard className="h-4 w-4 text-brand-500" /> Keyboard shortcuts
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {SHORTCUTS.map(([keys, desc]) => (
            <div key={keys} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5 dark:bg-white/5">
              <span className="text-sm text-slate-500 dark:text-slate-400">{desc}</span>
              <kbd className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 dark:border-white/10 dark:bg-surface-800 dark:text-slate-300">
                {keys}
              </kbd>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
