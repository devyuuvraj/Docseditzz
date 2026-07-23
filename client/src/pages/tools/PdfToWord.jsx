import { useState } from 'react';
import { FileOutput, Download, X, ScanText } from 'lucide-react';
import ToolShell from '../../components/tools/ToolShell.jsx';
import Dropzone from '../../components/upload/Dropzone.jsx';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import Select from '../../components/ui/Select.jsx';
import useToolJob from '../../hooks/useToolJob.js';
import { formatBytes } from '../../lib/utils.js';

const OCR_LANGUAGES = [
  { value: 'eng', label: 'English' },
  { value: 'hin', label: 'Hindi' },
  { value: 'spa', label: 'Spanish' },
  { value: 'fra', label: 'French' },
  { value: 'deu', label: 'German' },
  { value: 'ita', label: 'Italian' },
  { value: 'por', label: 'Portuguese' },
  { value: 'rus', label: 'Russian' },
  { value: 'jpn', label: 'Japanese' },
  { value: 'kor', label: 'Korean' },
  { value: 'chi_sim', label: 'Chinese (Simplified)' },
  { value: 'ara', label: 'Arabic' },
];

export default function PdfToWord() {
  const [file, setFile] = useState(null);
  const [useOcr, setUseOcr] = useState(false);
  const [language, setLanguage] = useState('eng');
  const { run, isLoading, progress } = useToolJob();

  const convert = async () => {
    const form = new FormData();
    form.append('file', file);
    form.append('ocr', String(useOcr));
    form.append('language', language);
    const ok = await run('/tools/pdf-to-word', form, {
      fallbackName: file.name.replace(/\.pdf$/i, '') + '.docx',
    });
    if (ok) setFile(null);
  };

  return (
    <ToolShell
      icon={FileOutput}
      title="PDF to Word"
      description="Convert PDFs to editable DOCX — with OCR for scanned documents."
      isLoading={isLoading}
      progress={progress}
    >
      {!file ? (
        <Dropzone
          onFiles={(files) => setFile(files[0])}
          multiple={false}
          accept={{ 'application/pdf': ['.pdf'] }}
          label="Drop your PDF here"
        />
      ) : (
        <Card className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
              <FileOutput className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-slate-800 dark:text-white">{file.name}</p>
              <p className="text-xs text-slate-400">{formatBytes(file.size)}</p>
            </div>
            <button onClick={() => setFile(null)} className="rounded-lg p-2 text-slate-400 hover:text-rose-500">
              <X className="h-4 w-4" />
            </button>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 dark:border-white/10">
            <input
              type="checkbox"
              checked={useOcr}
              onChange={(e) => setUseOcr(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-brand-600"
            />
            <div>
              <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                <ScanText className="h-4 w-4 text-brand-500" /> Use OCR
              </p>
              <p className="text-xs text-slate-400">
                Enable for scanned PDFs or photos of documents. Slower but recovers text from images.
                (Auto-detected too — we fall back to OCR if no text layer is found.)
              </p>
            </div>
          </label>

          {useOcr && (
            <Select label="Document language" value={language} onChange={(e) => setLanguage(e.target.value)} options={OCR_LANGUAGES} />
          )}

          <Button onClick={convert} loading={isLoading} size="lg" className="w-full">
            <Download className="h-4 w-4" /> Convert to DOCX
          </Button>
        </Card>
      )}
    </ToolShell>
  );
}
