import { motion } from 'framer-motion';
import {
  Images, FileText, FileOutput, Crop, Sparkles, PenTool,
  Wrench, ScanText, MessageSquareText, Share2, FolderOpen, ShieldCheck,
} from 'lucide-react';

const features = [
  { icon: PenTool, title: 'Advanced PDF Editor', desc: 'Erase, draw, highlight, add text, images, signatures and shapes — with full undo/redo history.' },
  { icon: Sparkles, title: 'AI Summarizer', desc: 'Short, detailed, bullet or chapter-wise summaries. Extract keywords, dates, people and numbers.' },
  { icon: MessageSquareText, title: 'Chat with PDF', desc: 'Ask questions and get precise answers grounded in your document, with conversation memory.' },
  { icon: Images, title: 'Images → PDF', desc: 'Reorder with drag & drop, rotate, crop, compress and watermark. A4, Letter or Legal output.' },
  { icon: FileText, title: 'Word → PDF', desc: 'Pixel-faithful conversion for DOC, DOCX, Excel, PowerPoint, HTML and TXT files.' },
  { icon: FileOutput, title: 'PDF → Word', desc: 'Structured DOCX output with OCR support for scanned documents in 16 languages.' },
  { icon: Wrench, title: 'Pro PDF Toolkit', desc: 'Merge, split, compress, rotate, reorder, protect, unlock, watermark and number pages.' },
  { icon: ScanText, title: 'OCR Engine', desc: 'Extract text from scans and photos in English, Hindi, Spanish, Chinese, Arabic and more.' },
  { icon: Crop, title: 'Image Studio', desc: 'Crop, rotate, flip, resize and fine-tune brightness and contrast, then export anywhere.' },
  { icon: FolderOpen, title: 'File Manager', desc: 'Folders, favorites, trash with restore, version history, duplicates and instant search.' },
  { icon: Share2, title: 'Secure Sharing', desc: 'Share links with passwords, expiry dates and QR codes. Public or private, you decide.' },
  { icon: ShieldCheck, title: 'Bank-grade Security', desc: 'Encrypted passwords, JWT sessions, rate limiting and sanitized inputs by default.' },
];

export default function Features() {
  return (
    <section id="features" className="px-4 py-24">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-5xl">
            One workspace. <span className="gradient-text">Twelve superpowers.</span>
          </h2>
          <p className="mt-4 text-slate-500 dark:text-slate-400">
            Everything Adobe Acrobat, SmallPDF and ILovePDF do — reimagined with AI and an interface
            you'll actually enjoy.
          </p>
        </motion.div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {features.map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.45, delay: (i % 4) * 0.08 }}
              className="glass group rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-brand-500/10"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-lg shadow-brand-500/25 transition-transform group-hover:scale-110">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
