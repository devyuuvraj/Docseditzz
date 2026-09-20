import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, FileText, Wand2, Lock } from 'lucide-react';
import Button from '../ui/Button.jsx';

const floatingCards = [
  { icon: FileText, label: 'PDF → Word', className: 'left-[4%] top-[18%]', delay: 0 },
  { icon: Sparkles, label: 'AI Summary', className: 'right-[6%] top-[24%]', delay: 1.2 },
  { icon: Wand2, label: 'Smart Editor', className: 'left-[10%] bottom-[16%]', delay: 0.6 },
  { icon: Lock, label: 'Protected Share', className: 'right-[10%] bottom-[22%]', delay: 1.8 },
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-24 pt-40">
      {/* Floating glass chips (desktop only) */}
      {floatingCards.map(({ icon: Icon, label, className, delay }) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: delay + 0.5, duration: 0.6 }}
          className={`glass absolute hidden items-center gap-2 rounded-2xl px-4 py-3 shadow-xl lg:flex ${className}`}
          style={{ animation: `float 7s ease-in-out ${delay}s infinite` }}
        >
          <Icon className="h-4 w-4 text-brand-500" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
        </motion.div>
      ))}

      <div className="mx-auto max-w-4xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold text-brand-600 dark:text-brand-300">
            <Sparkles className="h-3.5 w-3.5" />
            Now with GPT-powered document intelligence
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-6 text-4xl font-black leading-tight tracking-tight text-slate-900 dark:text-white sm:text-6xl lg:text-7xl"
        >
          Every document tool
          <br />
          <span className="gradient-text">you'll ever need.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mx-auto mt-6 max-w-2xl text-lg text-slate-500 dark:text-slate-400"
        >
          Edit PDFs like a pro, convert anything to anything, summarize with AI, chat with your
          documents, and share securely — all in one gorgeous workspace.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Link to="/dashboard">
            <Button size="lg" className="group">
              Open workspace
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
          <a href="#features">
            <Button variant="secondary" size="lg">
              Explore features
            </Button>
          </a>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-6 text-xs text-slate-400"
        >
          No credit card required · 500MB free storage · Cancel anytime
        </motion.p>
      </div>
    </section>
  );
}
