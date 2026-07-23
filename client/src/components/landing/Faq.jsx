import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { cn } from '../../lib/utils.js';

const faqs = [
  {
    q: 'Is DOCSEDITZ really free?',
    a: 'Yes. The free plan includes 500MB of storage, all PDF tools and 10 AI actions per day — forever. Upgrade to Pro only when you need more.',
  },
  {
    q: 'Are my documents secure?',
    a: 'Absolutely. Files are stored on encrypted cloud storage, passwords are hashed with bcrypt, sessions use short-lived JWTs, and every endpoint is rate limited and validated.',
  },
  {
    q: 'How accurate is the PDF to Word conversion?',
    a: 'Text-based PDFs convert with structure preserved (headings, paragraphs, page breaks). Scanned PDFs go through our OCR engine which supports 16 languages.',
  },
  {
    q: 'What AI features are included?',
    a: 'Summaries (short, detailed, bullets, chapter-wise), keyword/date/people extraction, flashcards, quizzes, rewriting, translation, grammar correction, tone changes, and Chat with PDF.',
  },
  {
    q: 'Can I share files with people who don\'t have an account?',
    a: 'Yes — generate a share link (optionally password-protected with an expiry date) or a QR code. Recipients can preview and download without signing up.',
  },
  {
    q: 'Does it work on mobile?',
    a: 'The entire app is fully responsive — dashboard, tools and even the PDF editor work beautifully on phones and tablets.',
  },
];

export default function Faq() {
  const [open, setOpen] = useState(0);

  return (
    <section id="faq" className="px-4 py-24">
      <div className="mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-5xl">
            Questions? <span className="gradient-text">Answered.</span>
          </h2>
        </motion.div>

        <div className="mt-12 space-y-3">
          {faqs.map((item, i) => (
            <motion.div
              key={item.q}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="glass overflow-hidden rounded-2xl"
            >
              <button
                onClick={() => setOpen(open === i ? -1 : i)}
                className="flex w-full items-center justify-between px-6 py-4 text-left"
              >
                <span className="pr-4 text-sm font-semibold text-slate-800 dark:text-white sm:text-base">
                  {item.q}
                </span>
                <Plus
                  className={cn(
                    'h-5 w-5 shrink-0 text-brand-500 transition-transform duration-300',
                    open === i && 'rotate-45'
                  )}
                />
              </button>
              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <p className="px-6 pb-5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                      {item.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
