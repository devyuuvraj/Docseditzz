import { motion } from 'framer-motion';
import Progress from '../ui/Progress.jsx';

/** Shared page wrapper for all tool screens: header + progress + content. */
export default function ToolShell({ icon: Icon, title, description, isLoading, progress, children }) {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-lg shadow-brand-500/30">
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">{title}</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </motion.div>

      {isLoading && progress > 0 && <Progress value={progress} showLabel />}

      {children}
    </div>
  );
}
