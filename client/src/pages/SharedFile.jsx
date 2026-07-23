import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FileText, Download, Lock } from 'lucide-react';
import { downloadBlobResponse } from '../lib/axios.js';
import { formatBytes } from '../lib/utils.js';
import Logo from '../components/layout/Logo.jsx';
import ThemeToggle from '../components/layout/ThemeToggle.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import PageLoader from '../components/ui/PageLoader.jsx';

const baseURL = import.meta.env.VITE_API_URL || '/api/v1';

export default function SharedFile() {
  const { token } = useParams();
  const [doc, setDoc] = useState(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const access = useCallback(
    async (pwd) => {
      setLoading(true);
      setError('');
      try {
        const { data } = await axios.post(`${baseURL}/share/${token}/access`, pwd ? { password: pwd } : {});
        setDoc(data.data.document);
        setNeedsPassword(false);
      } catch (err) {
        const message = err.response?.data?.message;
        if (message === 'PASSWORD_REQUIRED') setNeedsPassword(true);
        else setError(message || 'This link is invalid or has expired');
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    access();
  }, [access]);

  const download = async () => {
    setDownloading(true);
    try {
      const res = await axios.post(
        `${baseURL}/share/${token}/download`,
        password ? { password } : {},
        { responseType: 'blob' }
      );
      downloadBlobResponse(res, doc?.name || 'file');
      toast.success('Downloaded');
    } catch {
      toast.error('Download failed');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="gradient-bg flex min-h-screen flex-col bg-surface-50 dark:bg-surface-950">
      <header className="flex items-center justify-between px-6 py-4">
        <Logo />
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-4">
        {loading ? (
          <PageLoader />
        ) : error ? (
          <div className="glass-strong max-w-sm rounded-3xl p-8 text-center">
            <p className="text-4xl">🔗</p>
            <h1 className="mt-4 text-lg font-bold text-slate-800 dark:text-white">Link unavailable</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{error}</p>
          </div>
        ) : needsPassword ? (
          <div className="glass-strong w-full max-w-sm rounded-3xl p-8">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/10">
              <Lock className="h-6 w-6 text-brand-500" />
            </div>
            <h1 className="text-center text-lg font-bold text-slate-800 dark:text-white">
              This file is password protected
            </h1>
            <div className="mt-5 space-y-3">
              <Input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && access(password)}
              />
              <Button onClick={() => access(password)} className="w-full">
                Unlock
              </Button>
            </div>
          </div>
        ) : doc ? (
          <div className="glass-strong w-full max-w-md rounded-3xl p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-xl shadow-brand-500/30">
              <FileText className="h-8 w-8" />
            </div>
            <h1 className="mt-5 break-all text-lg font-bold text-slate-800 dark:text-white">{doc.name}</h1>
            <p className="mt-1 text-sm text-slate-400">
              {doc.type?.toUpperCase()} · {formatBytes(doc.size)}
              {doc.pages ? ` · ${doc.pages} pages` : ''}
            </p>
            <Button onClick={download} loading={downloading} size="lg" className="mt-7 w-full">
              <Download className="h-4 w-4" /> Download file
            </Button>
            <p className="mt-4 text-xs text-slate-400">
              Shared securely via <span className="font-semibold">DOCSEDITZ</span>
            </p>
          </div>
        ) : null}
      </main>
    </div>
  );
}
