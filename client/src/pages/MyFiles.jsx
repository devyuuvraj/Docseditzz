import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  FolderPlus, Folder as FolderIcon, Search, Trash2, Star, FolderOpen, X, ChevronLeft, ChevronRight,
} from 'lucide-react';
import {
  listDocuments, listFolders, createFolder, deleteFolder, smartUpload, emptyTrash,
} from '../services/files.service.js';
import { apiErrorMessage } from '../lib/axios.js';
import useDebounce from '../hooks/useDebounce.js';
import Dropzone from '../components/upload/Dropzone.jsx';
import FileCard from '../components/files/FileCard.jsx';
import Button from '../components/ui/Button.jsx';
import Modal from '../components/ui/Modal.jsx';
import Input from '../components/ui/Input.jsx';
import Select from '../components/ui/Select.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { FileCardSkeleton } from '../components/ui/Skeleton.jsx';
import Progress from '../components/ui/Progress.jsx';

export default function MyFiles({ view = 'all' }) {
  const { folderId } = useParams();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [sort, setSort] = useState('-updatedAt');
  const [page, setPage] = useState(1);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const debouncedSearch = useDebounce(search);

  const isTrash = view === 'trash';
  const isFavorites = view === 'favorites';

  const params = {
    page,
    limit: 24,
    sort,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(type ? { type } : {}),
    ...(isTrash ? { trashed: 'true' } : {}),
    ...(isFavorites ? { favorite: 'true' } : {}),
    ...(folderId ? { folder: folderId } : {}),
  };

  const docs = useQuery({
    queryKey: ['documents', 'list', params],
    queryFn: () => listDocuments(params),
    keepPreviousData: true,
  });

  const folders = useQuery({
    queryKey: ['folders'],
    queryFn: listFolders,
    enabled: !isTrash && !isFavorites,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['documents'] });
    queryClient.invalidateQueries({ queryKey: ['folders'] });
    queryClient.invalidateQueries({ queryKey: ['storage'] });
  };

  const handleUpload = async (files) => {
    const t = toast.loading(`Uploading ${files.length} file(s)…`);
    try {
      for (const file of files) {
        await smartUpload(file, { folder: folderId, onProgress: setUploadProgress });
      }
      toast.success('Upload complete', { id: t });
      invalidate();
    } catch (error) {
      toast.error(apiErrorMessage(error), { id: t });
    } finally {
      setUploadProgress(0);
    }
  };

  const handleCreateFolder = async () => {
    if (!folderName.trim()) return;
    try {
      await createFolder({ name: folderName.trim() });
      toast.success('Folder created');
      setNewFolderOpen(false);
      setFolderName('');
      invalidate();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  const handleEmptyTrash = async () => {
    try {
      const res = await emptyTrash();
      toast.success(res.message);
      invalidate();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  const title = isTrash ? 'Trash' : isFavorites ? 'Favorites' : folderId ? 'Folder' : 'My Files';
  const TitleIcon = isTrash ? Trash2 : isFavorites ? Star : FolderOpen;
  const currentFolder = folders.data?.find((f) => f._id === folderId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2.5 text-2xl font-black text-slate-900 dark:text-white">
          <TitleIcon className="h-6 w-6 text-brand-500" />
          {currentFolder?.name || title}
        </h1>
        <div className="flex gap-2">
          {!isTrash && !isFavorites && (
            <Button variant="secondary" size="sm" onClick={() => setNewFolderOpen(true)}>
              <FolderPlus className="h-4 w-4" /> New folder
            </Button>
          )}
          {isTrash && docs.data?.documents?.length > 0 && (
            <Button variant="danger" size="sm" onClick={handleEmptyTrash}>
              <Trash2 className="h-4 w-4" /> Empty trash
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search files…"
            className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-9 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Select
          className="!h-10 w-36"
          value={type}
          onChange={(e) => { setType(e.target.value); setPage(1); }}
          options={[
            { value: '', label: 'All types' },
            { value: 'pdf', label: 'PDF' },
            { value: 'docx', label: 'Word' },
            { value: 'image', label: 'Images' },
            { value: 'xlsx', label: 'Excel' },
            { value: 'pptx', label: 'PowerPoint' },
            { value: 'txt', label: 'Text' },
          ]}
        />
        <Select
          className="!h-10 w-40"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          options={[
            { value: '-updatedAt', label: 'Last modified' },
            { value: 'name', label: 'Name A→Z' },
            { value: '-name', label: 'Name Z→A' },
            { value: '-size', label: 'Largest first' },
            { value: '-createdAt', label: 'Newest first' },
          ]}
        />
      </div>

      {/* Folders grid */}
      {!isTrash && !isFavorites && !folderId && folders.data?.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {folders.data.map((folder) => (
            <div key={folder._id} className="glass group relative rounded-2xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg">
              <a href={`/files/folder/${folder._id}`} className="flex items-center gap-3">
                <FolderIcon className="h-8 w-8 shrink-0" style={{ color: folder.color }} fill={folder.color} fillOpacity={0.2} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{folder.name}</p>
                  <p className="text-xs text-slate-400">{folder.fileCount} files</p>
                </div>
              </a>
              <button
                onClick={async () => {
                  try {
                    await deleteFolder(folder._id);
                    toast.success('Folder deleted');
                    invalidate();
                  } catch (error) {
                    toast.error(apiErrorMessage(error));
                  }
                }}
                className="absolute right-2 top-2 rounded-lg p-1 text-slate-300 opacity-0 hover:text-rose-500 group-hover:opacity-100"
                aria-label="Delete folder"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload zone */}
      {!isTrash && !isFavorites && (
        <>
          <Dropzone onFiles={handleUpload} compact label="Drop files to upload" sublabel="Large files upload in chunks with progress" />
          {uploadProgress > 0 && uploadProgress < 100 && <Progress value={uploadProgress} showLabel />}
        </>
      )}

      {/* Files grid */}
      {docs.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <FileCardSkeleton key={i} />
          ))}
        </div>
      ) : docs.data?.documents?.length ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {docs.data.documents.map((doc) => (
              <FileCard key={doc._id} doc={doc} inTrash={isTrash} />
            ))}
          </div>

          {/* Pagination */}
          {docs.data.pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="h-4 w-4" /> Prev
              </Button>
              <span className="text-sm text-slate-500">
                Page {page} of {docs.data.pagination.pages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= docs.data.pagination.pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      ) : (
        <EmptyState
          icon={isTrash ? Trash2 : isFavorites ? Star : FolderOpen}
          title={isTrash ? 'Trash is empty' : isFavorites ? 'No favorites yet' : 'No files found'}
          description={
            isTrash
              ? 'Deleted files will appear here for recovery.'
              : isFavorites
              ? 'Star files to pin them here.'
              : debouncedSearch
              ? `No results for "${debouncedSearch}"`
              : 'Upload your first file to get started.'
          }
        />
      )}

      {/* New folder modal */}
      <Modal open={newFolderOpen} onClose={() => setNewFolderOpen(false)} title="Create folder" size="sm">
        <div className="space-y-4">
          <Input
            placeholder="Folder name"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            autoFocus
          />
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setNewFolderOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} className="flex-1">
              Create
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
