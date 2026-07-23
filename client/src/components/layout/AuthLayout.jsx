import { motion } from 'framer-motion';
import Logo from './Logo.jsx';
import ThemeToggle from './ThemeToggle.jsx';

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="gradient-bg flex min-h-screen items-center justify-center bg-surface-50 px-4 py-10 dark:bg-surface-950">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45 }}
        className="glass-strong w-full max-w-md rounded-3xl p-8 shadow-2xl"
      >
        <div className="mb-7 flex flex-col items-center text-center">
          <Logo />
          <h1 className="mt-5 text-2xl font-black text-slate-900 dark:text-white">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
        {children}
      </motion.div>
    </div>
  );
}
