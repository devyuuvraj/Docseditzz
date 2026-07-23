import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { listDocuments } from '../../services/admin.service.js';
import useDebounce from '../../hooks/useDebounce.js';
import AdminNav from '../../components/admin/AdminNav.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Select from '../../components/ui/Select.jsx';
import { TableSkeleton } from '../../components/ui/Skeleton.jsx';
import { formatBytes } from '../../lib/utils.js';

export default function AdminDocuments() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const debounced = useDebounce(search);

  const params = { page, limit: 15, ...(debounced ? { search: debounced } : {}), ...(type ? { type } : {}) };
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'documents', params],
    queryFn: () => listDocuments(params),
    keepPreviousData: true,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-slate-900 dark:text-white">Admin Panel</h1>
      <AdminNav />

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search documents…"
            className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-10 text-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
          />
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
          ]}
        />
      </div>

      <Card className="!p-0">
        {isLoading ? (
          <div className="p-4"><TableSkeleton /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-400 dark:border-white/10">
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Owner</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Size</th>
                  <th className="px-5 py-3">Uploaded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {data.documents.map((d) => (
                  <tr key={d._id} className="hover:bg-slate-50 dark:hover:bg-white/[0.03]">
                    <td className="max-w-xs truncate px-5 py-3 font-semibold text-slate-800 dark:text-white">{d.name}</td>
                    <td className="px-5 py-3">
                      <p className="text-slate-600 dark:text-slate-300">{d.owner?.name}</p>
                      <p className="text-xs text-slate-400">{d.owner?.email}</p>
                    </td>
                    <td className="px-5 py-3"><Badge className="uppercase">{d.type}</Badge></td>
                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{formatBytes(d.size)}</td>
                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400">
                      {formatDistanceToNow(new Date(d.createdAt), { addSuffix: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {data?.pagination?.pages > 1 && (
        <div className="flex justify-center gap-3">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
          <span className="self-center text-sm text-slate-500">{page} / {data.pagination.pages}</span>
          <Button variant="secondary" size="sm" disabled={page >= data.pagination.pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
