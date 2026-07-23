import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { UploadCloud } from 'lucide-react';
import { cn } from '../../lib/utils.js';

export default function Dropzone({
  onFiles,
  accept,
  multiple = true,
  maxFiles = 20,
  label = 'Drag & drop files here',
  sublabel = 'or click to browse from your device',
  className,
  compact = false,
}) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (accepted) => accepted.length && onFiles(accepted),
    accept,
    multiple,
    maxFiles,
  });

  return (
    <motion.div
      {...getRootProps()}
      whileHover={{ scale: 1.005 }}
      whileTap={{ scale: 0.995 }}
      className={cn(
        'cursor-pointer rounded-2xl border-2 border-dashed transition-colors',
        compact ? 'p-6' : 'p-12',
        isDragActive
          ? 'border-brand-500 bg-brand-500/5'
          : 'border-slate-300 bg-white/40 hover:border-brand-400 dark:border-white/15 dark:bg-white/[0.03] dark:hover:border-brand-500/60',
        className
      )}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-3 text-center">
        <div
          className={cn(
            'flex items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-lg shadow-brand-500/30',
            compact ? 'h-11 w-11' : 'h-16 w-16'
          )}
        >
          <UploadCloud className={compact ? 'h-5 w-5' : 'h-8 w-8'} />
        </div>
        <div>
          <p className={cn('font-semibold text-slate-700 dark:text-slate-200', compact ? 'text-sm' : 'text-base')}>
            {isDragActive ? 'Drop the files here' : label}
          </p>
          <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{sublabel}</p>
        </div>
      </div>
    </motion.div>
  );
}
