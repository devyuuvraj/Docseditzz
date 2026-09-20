import { Link } from 'react-router-dom';
import Logo from './Logo.jsx';

const columns = [
  {
    title: 'Product',
    links: [
      { label: 'PDF Editor', to: '/editor' },
      { label: 'AI Summarizer', to: '/tools/summarizer' },
      { label: 'Images to PDF', to: '/tools/images-to-pdf' },
      { label: 'PDF Tools', to: '/tools/pdf-tools' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Pricing', to: '/welcome#pricing' },
      { label: 'Testimonials', to: '/welcome#testimonials' },
      { label: 'FAQ', to: '/welcome#faq' },
    ],
  },
  {
    title: 'Workspace',
    links: [
      { label: 'Dashboard', to: '/dashboard' },
      { label: 'My files', to: '/files' },
      { label: 'PDF tools', to: '/tools/pdf-tools' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-slate-200/60 bg-white/40 dark:border-white/5 dark:bg-surface-900/40">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-slate-500 dark:text-slate-400">
              The all-in-one AI document workspace. Edit, convert, summarize and share — beautifully.
            </p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="mb-3 text-sm font-bold text-slate-800 dark:text-white">{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      to={l.to}
                      className="text-sm text-slate-500 transition-colors hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-300"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 border-t border-slate-200/60 pt-6 text-center text-xs text-slate-400 dark:border-white/5">
          © {new Date().getFullYear()} DOCSEDITZ. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
