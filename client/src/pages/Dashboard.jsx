import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Images, FileText, FileOutput, Sparkles, PenTool, Wrench,
  HardDrive, FileStack, Star, Activity as ActivityIcon, Upload,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import {
  recentDocuments, listDocuments, listActivities, storageStats, smartUpload,
} from '../services/files.service.js';
import { useQueryClient } from '@tanstack/react-query';
import Card from '../components/ui/Card.jsx';
import Progress from '../components/ui/Progress.jsx';
import Dropzone from '../components/upload/Dropzone.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { FileCardSkeleton, StatCardSkeleton } from '../components/ui/Skeleton.jsx';
import FileCard from '../components/files/FileCard.jsx';
import { formatBytes } from '../lib/utils.js';
import { apiErrorMessage as errMsg } from '../lib/axios.js';

const quickActions = [
  { to: '/tools/images-to-pdf', label: 'Images → PDF', icon: Images, color: 'from-emerald-500 to-teal-500' },
  { to: '/tools/convert-to-pdf', label: 'Word → PDF', icon: FileText, color: 'from-blue-500 to-cyan-500' },
  { to: '/tools/pdf-to-word', label: 'PDF → Word', icon: FileOutput, color: 'from-indigo-500 to-blue-500' },
  { to: '/tools/summarizer', label: 'AI Summarize', icon: Sparkles, color: 'from-fuchsia-500 to-purple-500' },
  { to: '/editor', label: 'Edit PDF', icon: PenTool, color: 'from-rose-500 to-pink-500' },
  { to: '/tools/pdf-tools', label: 'All Tools', icon: Wrench, color: 'from-amber-500 to-orange-500' },
];

const actionLabels = {
  upload: 'Uploaded', download: 'Downloaded', delete: 'Trashed', restore: 'Restored',
  rename: 'Renamed', duplicate: 'Duplicated', convert: 'Converted', merge: 'Merged PDFs',
  split: 'Split PDF', compress: 'Compressed', edit: 'Edited', share: 'Shared',
  summarize: 'Summarized', ocr: 'Ran OCR on', ai: 'Used AI on', login: 'Logged in',
  register: 'Created account', password_change: 'Changed password', folder_create: 'Created folder',
  favorite: 'Favorited', unfavorite: 'Unfavorited', permanent_delete: 'Deleted forever',
};

export default function Dashboard() {
  const { user } = useSelector((s) => s.auth);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const recent = useQuery({ queryKey: ['documents', 'recent'], queryFn: recentDocuments });
  const favorites = useQuery({
    queryKey: ['documents', 'favorites-mini'],
    queryFn: () => listDocuments({ favorite: 'true', limit: 4 }),
  });
  const activities = useQuery({
    queryKey: ['activities', 'mini'],
    queryFn: () => listActivities({ limit: 8 }),
  });
  const storage = useQuery({ queryKey: ['storage'], queryFn: storageStats });

  const handleUpload = async (files) => {
    const t = toast.loading(`Uploading ${files.length} file(s)…`);
    try {
      for (const file of files) await smartUpload(file);
      toast.success('Upload complete', { id: t });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['storage'] });
    } catch (error) {
      toast.error(errMsg(error), { id: t });
    }
  };

  const usedPct = storage.data ? (storage.data.used / storage.data.limit) * 100 : 0;

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'},{' '}
          <span className="gradient-text">{user?.name?.split(' ')[0]}</span> 👋
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Here's what's happening in your workspace.
        </p>
      </motion.div>

      {/* Quick actions */}
      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">Quick actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {quickActions.map(({ to, label, icon: Icon, color }, i) => (
            <motion.div
              key={to}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                to={to}
                className="glass group flex flex-col items-center gap-2.5 rounded-2xl p-4 text-center transition-all hover:-translate-y-1 hover:shadow-xl"
              >
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${color} text-white shadow-lg transition-transform group-hover:scale-110`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{label}</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Stats row */}
      <section className="grid gap-4 sm:grid-cols-3">
        {storage.isLoading ? (
          <>
            <StatCardSkeleton /> <StatCardSkeleton /> <StatCardSkeleton />
          </>
        ) : (
          <>
            <Card>
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10">
                  <HardDrive className="h-5 w-5 text-brand-500" />
                </div>
                <span className="text-xs font-medium text-slate-400">{Math.round(usedPct)}% used</span>
              </div>
              <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
                {formatBytes(storage.data?.used)}
              </p>
              <p className="text-xs text-slate-400">of {formatBytes(storage.data?.limit)} storage</p>
              <Progress value={usedPct} className="mt-3" />
            </Card>
            <Card>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                <FileStack className="h-5 w-5 text-emerald-500" />
              </div>
              <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
                {storage.data?.byType?.reduce((n, t) => n + t.count, 0) || 0}
              </p>
              <p className="text-xs text-slate-400">documents in your library</p>
            </Card>
            <Card>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                <Star className="h-5 w-5 text-amber-500" />
              </div>
              <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
                {favorites.data?.pagination?.total ?? 0}
              </p>
              <p className="text-xs text-slate-400">favorite files</p>
            </Card>
          </>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent files */}
        <section className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Recent files</h2>
            <Link to="/files" className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">
              View all →
            </Link>
          </div>

          <Dropzone onFiles={handleUpload} compact label="Drop files to upload" sublabel="PDF, Word, Excel, PowerPoint, images and more" className="mb-4" />

          {recent.isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <FileCardSkeleton key={i} />
              ))}
            </div>
          ) : recent.data?.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {recent.data.map((doc) => (
                <FileCard key={doc._id} doc={doc} compact />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Upload}
              title="No files yet"
              description="Upload your first document to get started."
            />
          )}
        </section>

        {/* Recent activity */}
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">Recent activity</h2>
          <Card className="p-0">
            {activities.isLoading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="skeleton h-8" />
                ))}
              </div>
            ) : activities.data?.activities?.length ? (
              <ul className="divide-y divide-slate-100 dark:divide-white/5">
                {activities.data.activities.map((a) => (
                  <li key={a._id} className="flex items-start gap-3 px-4 py-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-500/10">
                      <ActivityIcon className="h-3.5 w-3.5 text-brand-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm text-slate-700 dark:text-slate-200">
                        <span className="font-semibold">{actionLabels[a.action] || a.action}</span>{' '}
                        {a.document?.name || a.meta?.name || a.meta?.output || ''}
                      </p>
                      <p className="text-xs text-slate-400">
                        {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-6 text-center text-sm text-slate-400">No activity yet</p>
            )}
          </Card>
        </section>
      </div>
    </div>
  );
}
