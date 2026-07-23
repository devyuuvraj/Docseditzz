import { useState } from 'react';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Link2 } from 'lucide-react';
import { createShare } from '../../services/files.service.js';
import { apiErrorMessage } from '../../lib/axios.js';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';

export default function ShareModal({ open, onClose, doc }) {
  const [isPublic, setIsPublic] = useState(true);
  const [password, setPassword] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [share, setShare] = useState(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const result = await createShare({
        documentId: doc._id,
        isPublic,
        ...(password ? { password } : {}),
        ...(expiresAt ? { expiresAt: new Date(expiresAt).toISOString() } : {}),
      });
      setShare(result);
      toast.success('Share link created');
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(share.url);
    toast.success('Link copied');
  };

  const reset = () => {
    setShare(null);
    setPassword('');
    setExpiresAt('');
    onClose();
  };

  return (
    <Modal open={open} onClose={reset} title={`Share "${doc.name}"`}>
      {share ? (
        <div className="space-y-5 text-center">
          <div className="mx-auto w-fit rounded-2xl bg-white p-4 shadow-inner">
            <QRCodeSVG value={share.url} size={160} />
          </div>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={share.url}
              className="h-11 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
            />
            <Button variant="secondary" size="icon" onClick={copy} aria-label="Copy link">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-slate-400">
            {share.hasPassword ? '🔒 Password protected' : '🌐 Anyone with the link'}
            {share.expiresAt && ` · Expires ${new Date(share.expiresAt).toLocaleDateString()}`}
          </p>
          <Button variant="secondary" onClick={reset} className="w-full">
            Done
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2">
            {[
              { value: true, label: 'Public' },
              { value: false, label: 'Private (link only)' },
            ].map((opt) => (
              <button
                key={String(opt.value)}
                onClick={() => setIsPublic(opt.value)}
                className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
                  isPublic === opt.value
                    ? 'border-brand-500 bg-brand-500/10 text-brand-600 dark:text-brand-300'
                    : 'border-slate-200 text-slate-500 dark:border-white/10 dark:text-slate-400'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <Input
            label="Password (optional)"
            type="password"
            placeholder="Leave empty for no password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Input
            label="Expiry date (optional)"
            type="date"
            min={new Date().toISOString().split('T')[0]}
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />

          <Button onClick={generate} loading={loading} className="w-full" size="lg">
            <Link2 className="h-4 w-4" />
            Generate share link
          </Button>
        </div>
      )}
    </Modal>
  );
}
