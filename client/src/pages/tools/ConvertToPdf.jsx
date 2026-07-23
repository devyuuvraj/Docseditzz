import { useState } from 'react';
import { FileText, Download, X } from 'lucide-react';
import ToolShell from '../../components/tools/ToolShell.jsx';
import Dropzone from '../../components/upload/Dropzone.jsx';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import useToolJob from '../../hooks/useToolJob.js';
import { formatBytes } from '../../lib/utils.js';

export default function ConvertToPdf() {
  const [file, setFile] = useState(null);
  const { run, isLoading, progress } = useToolJob();

  const convert = async () => {
    const form = new FormData();
    form.append('file', file);
    const ok = await run('/tools/convert-to-pdf', form, {
      fallbackName: file.name.replace(/\.[^.]+$/, '') + '.pdf',
    });
    if (ok) setFile(null);
  };

  return (
    <ToolShell
      icon={FileText}
      title="Word to PDF"
      description="Convert DOC, DOCX, Excel, PowerPoint, HTML and TXT files to PDF."
      isLoading={isLoading}
      progress={progress}
    >
      {!file ? (
        <Dropzone
          onFiles={(files) => setFile(files[0])}
          multiple={false}
          accept={{
            'application/msword': ['.doc'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'application/vnd.ms-excel': ['.xls'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-powerpoint': ['.ppt'],
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
            'text/plain': ['.txt'],
            'text/html': ['.html'],
          }}
          label="Drop your document here"
          sublabel="DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, HTML"
        />
      ) : (
        <Card className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
              <FileText className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-slate-800 dark:text-white">{file.name}</p>
              <p className="text-xs text-slate-400">{formatBytes(file.size)}</p>
            </div>
            <button onClick={() => setFile(null)} className="rounded-lg p-2 text-slate-400 hover:text-rose-500">
              <X className="h-4 w-4" />
            </button>
          </div>
          <Button onClick={convert} loading={isLoading} size="lg" className="w-full">
            <Download className="h-4 w-4" /> Convert to PDF
          </Button>
        </Card>
      )}
    </ToolShell>
  );
}
