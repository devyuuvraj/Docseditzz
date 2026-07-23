import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import {
  FileText, Image as ImageIcon, File, MoreVertical, Star, Download,
  Pencil, Copy, Share2, Trash2, RotateCcw, XCircle, PenTool,
} from 'lucide-react';
import {
  updateDocument, duplicateDocument, trashDocument, restoreDocument,
  permanentDelete, downloadDocument,
} from '../../services/files.service.js';
import { apiErrorMessage } from '../../lib/axios.js';
import { cn, formatBytes, fileTypeIconColor } from '../../lib/utils.js';
import ShareModal from './ShareModal.jsx';
import RenameModal from './RenameModal.jsx';

const typeIcon = (type) => {
  if (type === 'image') return ImageIcon;
  if (['pdf', 'docx', 'doc', 'txt'].includes(type)) return FileText;
  return File;
};

export default function FileCard({ doc, compact = false, inTrash = false }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const Icon = typeIcon(doc.type);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['documents'] });
    queryClient.invalidateQueries({ queryKey: ['storage'] });
  };

  const action = async (fn, successMsg) => {
    setMenuOpen(false);
    try {
      await fn();
      if (successMsg) toast.success(successMsg);
      invalidate();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  const menuItems = inTrash
    ? [
        { icon: RotateCcw, label: 'Restore', onClick: () => action(() => restoreDocument(doc._id), 'Restored') },
        {
          icon: XCircle,
          label: 'Delete forever',
          danger: true,
          onClick: () => action(() => permanentDelete(doc._id), 'Permanently deleted'),
        },
      ]
    : [
        ...(doc.type === 'pdf'
          ? [{ icon: PenTool, label: 'Open in editor', onClick: () => navigate(`/editor/${doc._id}`) }]
          : []),
        { icon: Download, label: 'Download', onClick: () => action(() => downloadDocument(doc._id, doc.name)) },
        { icon: Pencil, label: 'Rename', onClick: () => { setMenuOpen(false); setRenameOpen(true); } },
        { icon: Copy, label: 'Duplicate', onClick: () => action(() => duplicateDocument(doc._id), 'Duplicated') },
        { icon: Share2, label: 'Share', onClick: () => { setMenuOpen(false); setShareOpen(true); } },
        {
          icon: Trash2,
          label: 'Move to trash',
          danger: true,
          onClick: () => action(() => trashDocument(doc._id), 'Moved to trash'),
        },
      ];

  return (
    <>
      <div className="glass group relative rounded-2xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg">
        <div className="flex items-center gap-3">
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', fileTypeIconColor(doc.type))}>
            <Icon className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100" title={doc.name}>
              {doc.name}
            </p>
            <p className="text-xs text-slate-400">
              {formatBytes(doc.size)} · {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}
            </p>
          </div>

          {!inTrash && (
            <button
              onClick={() =>
                action(
                  () => updateDocument(doc._id, { isFavorite: !doc.isFavorite }),
                  doc.isFavorite ? 'Removed from favorites' : 'Added to favorites'
                )
              }
              className={cn(
                'rounded-lg p-1.5 transition-colors',
                doc.isFavorite
                  ? 'text-amber-400'
                  : 'text-slate-300 opacity-0 hover:text-amber-400 group-hover:opacity-100 dark:text-slate-600'
              )}
              aria-label="Toggle favorite"
            >
              <Star className={cn('h-4 w-4', doc.isFavorite && 'fill-amber-400')} />
            </button>
          )}

          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
              aria-label="File menu"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="glass-strong absolute right-0 z-20 mt-1 w-44 rounded-xl p-1.5 shadow-xl">
                  {menuItems.map(({ icon: ItemIcon, label, onClick, danger }) => (
                    <button
                      key={label}
                      onClick={onClick}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm',
                        danger
                          ? 'text-rose-500 hover:bg-rose-500/10'
                          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10'
                      )}
                    >
                      <ItemIcon className="h-4 w-4" /> {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} doc={doc} />
      <RenameModal open={renameOpen} onClose={() => setRenameOpen(false)} doc={doc} onDone={invalidate} />
    </>
  );
}
