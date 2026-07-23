import { useState } from 'react';
import {
  Wrench, Combine, Scissors, Minimize2, RotateCw, FileUp, FileMinus, ArrowUpDown,
  Lock, Unlock, Droplets, ListOrdered, Heading, Images as ImagesIcon, FileImage, Type, X,
} from 'lucide-react';
import ToolShell from '../../components/tools/ToolShell.jsx';
import Dropzone from '../../components/upload/Dropzone.jsx';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import useToolJob from '../../hooks/useToolJob.js';
import { cn, formatBytes } from '../../lib/utils.js';

/**
 * Declarative registry of professional PDF tools.
 * Each tool defines its fields; a generic runner posts multipart form data.
 */
const TOOLS = [
  {
    id: 'merge', label: 'Merge PDFs', icon: Combine, multiple: true,
    desc: 'Combine multiple PDFs into one', fields: [],
  },
  {
    id: 'split', label: 'Split PDF', icon: Scissors,
    desc: 'Split into page ranges',
    fields: [{ name: 'ranges', label: 'Ranges (e.g. 1-3;4-6)', type: 'text', required: true, placeholder: '1-3;4-6' }],
  },
  {
    id: 'compress', label: 'Compress PDF', icon: Minimize2,
    desc: 'Reduce file size',
    fields: [{
      name: 'level', label: 'Compression level', type: 'select',
      options: [
        { value: 'recommended', label: 'Recommended (lossless)' },
        { value: 'strong', label: 'Strong (re-render pages)' },
        { value: 'extreme', label: 'Extreme (smallest size)' },
      ],
    }],
  },
  {
    id: 'rotate', label: 'Rotate PDF', icon: RotateCw,
    desc: 'Rotate all or selected pages',
    fields: [
      { name: 'angle', label: 'Angle', type: 'select', options: [{ value: '90', label: '90° right' }, { value: '180', label: '180°' }, { value: '270', label: '90° left' }] },
      { name: 'pages', label: 'Pages (e.g. 1,3-5 or all)', type: 'text', placeholder: 'all' },
    ],
  },
  {
    id: 'extract-pages', label: 'Extract Pages', icon: FileUp,
    desc: 'Pull out selected pages',
    fields: [{ name: 'pages', label: 'Pages (e.g. 1,3-5)', type: 'text', required: true, placeholder: '1,3-5' }],
  },
  {
    id: 'delete-pages', label: 'Delete Pages', icon: FileMinus,
    desc: 'Remove selected pages',
    fields: [{ name: 'pages', label: 'Pages to delete', type: 'text', required: true, placeholder: '2,4' }],
  },
  {
    id: 'reorder-pages', label: 'Reorder Pages', icon: ArrowUpDown,
    desc: 'Rearrange page order',
    fields: [{ name: 'order', label: 'New order (e.g. 3,1,2)', type: 'text', required: true, placeholder: '3,1,2' }],
  },
  {
    id: 'protect', label: 'Protect PDF', icon: Lock,
    desc: 'Add password encryption',
    fields: [{ name: 'password', label: 'Password', type: 'password', required: true }],
  },
  {
    id: 'unlock', label: 'Unlock PDF', icon: Unlock,
    desc: 'Remove password (you must know it)',
    fields: [{ name: 'password', label: 'Current password', type: 'password', required: true }],
  },
  {
    id: 'watermark', label: 'Watermark', icon: Droplets,
    desc: 'Stamp text across pages',
    fields: [
      { name: 'text', label: 'Watermark text', type: 'text', required: true, placeholder: 'CONFIDENTIAL' },
      { name: 'opacity', label: 'Opacity (0.05 - 1)', type: 'text', placeholder: '0.25' },
    ],
  },
  {
    id: 'page-numbers', label: 'Page Numbers', icon: ListOrdered,
    desc: 'Add page numbering',
    fields: [{
      name: 'position', label: 'Position', type: 'select',
      options: [
        { value: 'bottom-center', label: 'Bottom center' },
        { value: 'bottom-right', label: 'Bottom right' },
        { value: 'bottom-left', label: 'Bottom left' },
        { value: 'top-center', label: 'Top center' },
      ],
    }],
  },
  {
    id: 'header-footer', label: 'Header & Footer', icon: Heading,
    desc: 'Add header/footer text',
    fields: [
      { name: 'header', label: 'Header text', type: 'text' },
      { name: 'footer', label: 'Footer text', type: 'text' },
    ],
  },
  {
    id: 'pdf-to-images', label: 'PDF → Images', icon: FileImage,
    desc: 'Export pages as PNG/JPG',
    fields: [{
      name: 'format', label: 'Format', type: 'select',
      options: [{ value: 'png', label: 'PNG' }, { value: 'jpg', label: 'JPG' }],
    }],
  },
  {
    id: 'extract-images', label: 'Extract Images', icon: ImagesIcon,
    desc: 'Pull embedded images', fields: [],
  },
  {
    id: 'extract-text', label: 'Extract Text', icon: Type,
    desc: 'Download the text layer',
    fields: [], extra: { download: 'true' },
  },
];

export default function PdfTools() {
  const [tool, setTool] = useState(null);
  const [files, setFiles] = useState([]);
  const [values, setValues] = useState({});
  const { run, isLoading, progress } = useToolJob();

  const selectTool = (t) => {
    setTool(t);
    setFiles([]);
    setValues(Object.fromEntries((t.fields || []).filter((f) => f.type === 'select').map((f) => [f.name, f.options[0].value])));
  };

  const execute = async () => {
    const form = new FormData();
    if (tool.multiple) files.forEach((f) => form.append('files', f));
    else form.append('file', files[0]);
    Object.entries({ ...values, ...(tool.extra || {}) }).forEach(([k, v]) => v !== '' && form.append(k, v));
    const ok = await run(`/tools/${tool.id}`, form, { fallbackName: `${tool.id}.pdf` });
    if (ok) setFiles([]);
  };

  const missingRequired = (tool?.fields || []).some((f) => f.required && !values[f.name]);

  return (
    <ToolShell
      icon={Wrench}
      title="Professional PDF Tools"
      description="Merge, split, compress, protect, watermark and much more."
      isLoading={isLoading}
      progress={progress}
    >
      {/* Tool grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            onClick={() => selectTool(t)}
            className={cn(
              'glass rounded-2xl p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg',
              tool?.id === t.id && 'ring-2 ring-brand-500'
            )}
          >
            <t.icon className="mb-2.5 h-5 w-5 text-brand-500" />
            <p className="text-sm font-bold text-slate-800 dark:text-white">{t.label}</p>
            <p className="mt-0.5 text-xs text-slate-400">{t.desc}</p>
          </button>
        ))}
      </div>

      {/* Runner */}
      {tool && (
        <Card className="space-y-5">
          <div className="flex items-center gap-2">
            <tool.icon className="h-5 w-5 text-brand-500" />
            <h2 className="text-base font-bold text-slate-800 dark:text-white">{tool.label}</h2>
          </div>

          {files.length === 0 ? (
            <Dropzone
              onFiles={(accepted) => setFiles(tool.multiple ? accepted : [accepted[0]])}
              multiple={!!tool.multiple}
              accept={{ 'application/pdf': ['.pdf'] }}
              compact
              label={tool.multiple ? 'Drop PDFs here (2 or more)' : 'Drop a PDF here'}
            />
          ) : (
            <div className="space-y-2">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-2.5 dark:bg-white/5">
                  <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                    {f.name}
                  </p>
                  <span className="text-xs text-slate-400">{formatBytes(f.size)}</span>
                  <button
                    onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                    className="text-slate-400 hover:text-rose-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {tool.fields?.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {tool.fields.map((field) =>
                field.type === 'select' ? (
                  <Select
                    key={field.name}
                    label={field.label}
                    value={values[field.name] || ''}
                    onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
                    options={field.options}
                  />
                ) : (
                  <Input
                    key={field.name}
                    label={field.label + (field.required ? ' *' : '')}
                    type={field.type}
                    placeholder={field.placeholder}
                    value={values[field.name] || ''}
                    onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
                  />
                )
              )}
            </div>
          )}

          <Button
            onClick={execute}
            loading={isLoading}
            disabled={!files.length || (tool.multiple && files.length < 2) || missingRequired}
            size="lg"
            className="w-full"
          >
            Run {tool.label}
          </Button>
        </Card>
      )}
    </ToolShell>
  );
}
