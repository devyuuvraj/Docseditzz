import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

const testimonials = [
  {
    name: 'Priya Sharma',
    role: 'Legal Associate',
    quote:
      'The AI summarizer turned a 200-page contract review into a 20-minute job. The chapter-wise summaries are scary good.',
  },
  {
    name: 'Marcus Chen',
    role: 'Product Designer',
    quote:
      "Finally a PDF editor that doesn't look like it was built in 2005. The glassmorphism UI is stunning and everything is fast.",
  },
  {
    name: 'Sara Alvarez',
    role: 'Graduate Student',
    quote:
      'Chat with PDF got me through finals. I upload lecture notes, generate flashcards and quizzes, and study straight from the app.',
  },
  {
    name: 'David Okafor',
    role: 'Operations Manager',
    quote:
      'We replaced three paid tools with DOCSEDITZ. Merge, compress, watermark, protected sharing — it does everything.',
  },
  {
    name: 'Emma Fischer',
    role: 'Freelance Translator',
    quote:
      'OCR in 16 languages plus AI translation in one place. My scanned-document workflow went from hours to minutes.',
  },
  {
    name: 'Rohan Gupta',
    role: 'Startup Founder',
    quote:
      'The admin panel and analytics sold me for my whole team. Beautiful, fast, and the API just works.',
  },
];

export default function Testimonials() {
  return (
    <section id="testimonials" className="px-4 py-24">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-5xl">
            Loved by <span className="gradient-text">thousands.</span>
          </h2>
          <p className="mt-4 text-slate-500 dark:text-slate-400">
            Students, lawyers, designers and founders get more done with DOCSEDITZ.
          </p>
        </motion.div>

        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.figure
              key={t.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: (i % 3) * 0.1 }}
              className="glass rounded-2xl p-6"
            >
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star key={s} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <blockquote className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                “{t.quote}”
              </blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-sm font-bold text-white">
                  {t.name[0]}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">{t.name}</p>
                  <p className="text-xs text-slate-400">{t.role}</p>
                </div>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
