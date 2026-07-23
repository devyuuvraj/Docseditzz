import { useState } from 'react';
import toast from 'react-hot-toast';
import { ScanText, Copy, Download, X, Search } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/axios.js';
import ToolShell from '../../components/tools/ToolShell.jsx';
import Dropzone from '../../components/upload/Dropzone.jsx';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import Select from '../../components/ui/Select.jsx';
import Input from '../../components/ui/Input.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { formatBytes } from '../../lib/utils.js';

const LANGUAGES = [
  { value: 'eng', label: 'English' }, { value: 'hin', label: 'Hindi' },
  { value: 'spa', label: 'Spanish' }, { value: 'fra', label: 'French' },
  { value: 'deu', label: 'German' }, { value: 'ita', label: 'Italian' },
  { value: 'por', label: 'Portuguese' }, { value: 'rus', label: 'Russian' },
  { value: 'jpn', label: 'Japanese' }, { value: 'kor', label: 'Korean' },
  { value: 'chi_sim', label: 'Chinese (Simplified)' }, { value: 'chi_tra', label: 'Chinese (Traditional)' },
  { value: 'ara', label: 'Arabic' }, { value: 'ben', label: 'Bengali' },
  { value: 'tam', label: 'Tamil' }, { value: 'tel', label: 'Telugu' },
];

export default function OcrTool() {
  const [file, setFile] = useState(null);
  const [language, setLanguage] = useState('eng');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  // In-PDF search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);

  const runOcr = async () => {
    setLoading(true);
    setText('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('language', language);
      const { data } = await api.post('/tools/ocr', form);
      setText(data.data.text);
      toast.success('Text extracted');
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const runSearch = async () => {
    if (searchQuery.trim().length < 2) return toast.error('Enter at least 2 characters');
    setSearching(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('query', searchQuery);
      const { data } = await api.post('/tools/search', form);
      setSearchResults(data.data);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setSearching(false);
    }
  };

  const highlight = (context) => {
    const idx = context.toLowerCase().indexOf(searchQuery.toLowerCase());
    if (idx === -1) return context;
    return (
      <>
        {context.slice(0, idx)}
        <mark className="rounded bg-amber-300/70 px-0.5 dark:bg-amber-500/50 dark:text-white">
          {context.slice(idx, idx + searchQuery.length)}
        </mark>
        {context.slice(idx + searchQuery.length)}
      </>
    );
  };

  return (
    <ToolShell
      icon={ScanText}
      title="OCR & PDF Search"
      description="Extract text from scanned PDFs and images in 16 languages, or search inside any PDF."
    >
      {!file ? (
        <Dropzone
          onFiles={(files) => setFile(files[0])}
          multiple={false}
          accept={{ 'application/pdf': ['.pdf'], 'image/*': [] }}
          label="Drop a scanned PDF or image"
        />
      ) : (
        <>
          <Card className="flex items-center gap-3 !p-4">
            <ScanText className="h-5 w-5 shrink-0 text-brand-500" />
            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800 dark:text-white">
              {file.name} <span className="font-normal text-slate-400">({formatBytes(file.size)})</span>
            </p>
            <button onClick={() => { setFile(null); setText(''); setSearchResults(null); }} className="text-slate-400 hover:text-rose-500">
              <X className="h-4 w-4" />
            </button>
          </Card>

          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <Select value={language} onChange={(e) => setLanguage(e.target.value)} options={LANGUAGES} />
            <Button onClick={runOcr} loading={loading} size="lg">
              <ScanText className="h-4 w-4" /> Extract text
            </Button>
          </div>

          {loading && (
            <Card className="space-y-3">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-2/3" />
              <p className="text-center text-xs text-slate-400">Running OCR — this can take a minute for multi-page scans…</p>
            </Card>
          )}

          {text && (
            <Card>
              <div className="mb-3 flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => { navigator.clipboard.writeText(text); toast.success('Copied'); }}>
                  <Copy className="h-3.5 w-3.5" /> Copy
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const blob = new Blob([text], { type: 'text/plain' });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = 'ocr-text.txt';
                    a.click();
                  }}
                >
                  <Download className="h-3.5 w-3.5" /> Download .txt
                </Button>
              </div>
              <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm text-slate-700 dark:bg-white/5 dark:text-slate-200">
                {text}
              </pre>
            </Card>
          )}

          {/* Search inside PDF */}
          {file.type === 'application/pdf' && (
            <Card className="space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white">
                <Search className="h-4 w-4 text-brand-500" /> Search inside this PDF
              </h3>
              <div className="flex gap-2">
                <Input
                  placeholder="Search text…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && runSearch()}
                />
                <Button onClick={runSearch} loading={searching}>
                  Search
                </Button>
              </div>

              {searchResults && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    <b>{searchResults.totalMatches}</b> match(es) for “{searchResults.query}”
                  </p>
                  {searchResults.results.map((r) => (
                    <div key={r.page} className="rounded-xl bg-slate-50 p-4 dark:bg-white/5">
                      <p className="mb-2 text-xs font-bold text-brand-600 dark:text-brand-300">
                        Page {r.page} · {r.count} match(es)
                      </p>
                      <ul className="space-y-1.5">
                        {r.matches.slice(0, 5).map((m, i) => (
                          <li key={i} className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                            {highlight(m.context)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </>
      )}
    </ToolShell>
  );
}
