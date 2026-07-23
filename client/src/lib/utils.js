import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs) => twMerge(clsx(inputs));

export const formatBytes = (bytes = 0) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

export const fileTypeIconColor = (type) =>
  ({
    pdf: 'text-rose-500 bg-rose-500/10',
    docx: 'text-blue-500 bg-blue-500/10',
    doc: 'text-blue-500 bg-blue-500/10',
    image: 'text-emerald-500 bg-emerald-500/10',
    xlsx: 'text-green-600 bg-green-600/10',
    pptx: 'text-orange-500 bg-orange-500/10',
    txt: 'text-slate-500 bg-slate-500/10',
    html: 'text-amber-500 bg-amber-500/10',
  }[type] || 'text-slate-400 bg-slate-400/10');

export const truncateMiddle = (str = '', max = 34) => {
  if (str.length <= max) return str;
  const half = Math.floor((max - 1) / 2);
  return `${str.slice(0, half)}…${str.slice(-half)}`;
};
