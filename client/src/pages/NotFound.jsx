import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Button from '../components/ui/Button.jsx';

export default function NotFound() {
  return (
    <div className="gradient-bg flex min-h-screen flex-col items-center justify-center bg-surface-50 px-4 text-center dark:bg-surface-950">
      <motion.h1
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="gradient-text text-8xl font-black sm:text-9xl"
      >
        404
      </motion.h1>
      <p className="mt-4 text-lg font-semibold text-slate-700 dark:text-slate-200">
        This page drifted off into the void.
      </p>
      <p className="mt-1 text-sm text-slate-400">The document you're looking for doesn't exist.</p>
      <Link to="/" className="mt-8">
        <Button size="lg">Take me home</Button>
      </Link>
    </div>
  );
}
