import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import Button from '../ui/Button.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import Logo from './Logo.jsx';

const links = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Testimonials', href: '#testimonials' },
  { label: 'FAQ', href: '#faq' },
];

export default function Navbar() {
  const { isAuthenticated } = useSelector((s) => s.auth);
  const [open, setOpen] = useState(false);

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-x-0 top-0 z-40"
    >
      <div className="mx-auto max-w-7xl px-4 pt-4">
        <nav className="glass-strong flex items-center justify-between rounded-2xl px-5 py-3 shadow-lg">
          <Logo />

          <div className="hidden items-center gap-8 md:flex">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm font-medium text-slate-600 transition-colors hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-300"
              >
                {l.label}
              </a>
            ))}
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <ThemeToggle />
            <Link to="/dashboard">
              <Button size="sm">{isAuthenticated ? 'Dashboard' : 'Open app'}</Button>
            </Link>
          </div>

          <div className="flex items-center gap-1 md:hidden">
            <ThemeToggle />
            <button
              onClick={() => setOpen((v) => !v)}
              className="rounded-lg p-2 text-slate-600 dark:text-slate-300"
              aria-label="Menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>

        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-strong mt-2 space-y-1 rounded-2xl p-4 shadow-lg md:hidden"
          >
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
              >
                {l.label}
              </a>
            ))}
            <div className="flex gap-2 pt-2">
              <Link to="/dashboard" className="flex-1">
                <Button className="w-full">{isAuthenticated ? 'Dashboard' : 'Open app'}</Button>
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </motion.header>
  );
}
