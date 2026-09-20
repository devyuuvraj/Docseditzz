import { useState } from 'react';
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, FolderOpen, Star, Trash2, Images, FileText, FileOutput,
  Crop, Sparkles, PenTool, Wrench, ScanText, MessageSquareText, Shield,
  Settings, LogOut, Menu, X, ChevronDown, Search,
} from 'lucide-react';
import { logoutUser } from '../../features/auth/authSlice.js';
import ThemeToggle from './ThemeToggle.jsx';
import Logo from './Logo.jsx';
import { cn } from '../../lib/utils.js';

const nav = [
  {
    title: 'Workspace',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/files', label: 'My Files', icon: FolderOpen },
      { to: '/favorites', label: 'Favorites', icon: Star },
      { to: '/trash', label: 'Trash', icon: Trash2 },
    ],
  },
  {
    title: 'Tools',
    items: [
      { to: '/tools/images-to-pdf', label: 'Images → PDF', icon: Images },
      { to: '/tools/convert-to-pdf', label: 'Word → PDF', icon: FileText },
      { to: '/tools/pdf-to-word', label: 'PDF → Word', icon: FileOutput },
      { to: '/tools/cropper', label: 'Image Cropper', icon: Crop },
      { to: '/tools/summarizer', label: 'AI Summarizer', icon: Sparkles },
      { to: '/editor', label: 'PDF Editor', icon: PenTool },
      { to: '/tools/pdf-tools', label: 'PDF Tools', icon: Wrench },
      { to: '/tools/ocr', label: 'OCR', icon: ScanText },
      { to: '/tools/chat', label: 'Chat with PDF', icon: MessageSquareText },
    ],
  },
];

function SidebarContent({ onNavigate }) {
  const { user } = useSelector((s) => s.auth);
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 py-5">
        <Logo to="/dashboard" />
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4">
        {nav.map((group) => (
          <div key={group.title}>
            <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/files'}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-gradient-to-r from-brand-500/15 to-accent-500/10 text-brand-600 dark:text-brand-300'
                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5'
                    )
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}

        {user?.role === 'admin' && (
          <div>
            <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Admin
            </p>
            <NavLink
              to="/admin"
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-gradient-to-r from-brand-500/15 to-accent-500/10 text-brand-600 dark:text-brand-300'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5'
                )
              }
            >
              <Shield className="h-4 w-4" /> Admin Panel
            </NavLink>
          </div>
        )}
      </nav>
    </div>
  );
}

export default function DashboardLayout() {
  const { user } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="gradient-bg min-h-screen bg-surface-50 dark:bg-surface-950">
      {/* Desktop sidebar */}
      <aside className="glass-strong fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200/60 dark:border-white/5 lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="glass-strong fixed inset-y-0 left-0 z-50 w-64 lg:hidden"
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute right-3 top-4 rounded-lg p-1.5 text-slate-400"
              >
                <X className="h-5 w-5" />
              </button>
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-20 border-b border-slate-200/60 bg-white/70 backdrop-blur-xl dark:border-white/5 dark:bg-surface-950/70">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <button
              onClick={() => navigate('/files')}
              className="hidden h-9 flex-1 max-w-md items-center gap-2 rounded-xl border border-slate-200 bg-white/60 px-3 text-sm text-slate-400 transition-colors hover:border-brand-400 dark:border-white/10 dark:bg-white/5 sm:flex"
            >
              <Search className="h-4 w-4" />
              Search your files…
              <kbd className="ml-auto rounded border border-slate-200 px-1.5 text-[10px] dark:border-white/10">/</kbd>
            </button>

            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle />
              <div className="relative">
                <button
                  onClick={() => setProfileOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-slate-100 dark:hover:bg-white/10"
                >
                  {user?.avatar ? (
                    <img src={user.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-sm font-bold text-white">
                      {user?.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                  <span className="hidden text-sm font-medium text-slate-700 dark:text-slate-200 sm:block">
                    {user?.name?.split(' ')[0]}
                  </span>
                  <ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 sm:block" />
                </button>

                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="glass-strong absolute right-0 mt-2 w-52 rounded-xl p-1.5 shadow-xl"
                      onMouseLeave={() => setProfileOpen(false)}
                    >
                      <div className="border-b border-slate-200 px-3 py-2 dark:border-white/10">
                        <p className="truncate text-sm font-semibold text-slate-800 dark:text-white">{user?.name}</p>
                        <p className="truncate text-xs text-slate-400">
                          {user?.provider === 'guest' ? 'Private to this browser' : user?.email}
                        </p>
                      </div>
                      <Link
                        to="/profile"
                        onClick={() => setProfileOpen(false)}
                        className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
                      >
                        <Settings className="h-4 w-4" /> Profile & Settings
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-500 hover:bg-rose-500/10"
                      >
                        <LogOut className="h-4 w-4" /> New workspace
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
