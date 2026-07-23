import { Link } from 'react-router-dom';

export default function Logo({ to = '/', compact = false }) {
  return (
    <Link to={to} className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-lg font-black text-white shadow-lg shadow-brand-500/30">
        D
      </div>
      {!compact && (
        <span className="text-lg font-extrabold tracking-tight text-slate-800 dark:text-white">
          DOCS<span className="gradient-text">EDITZ</span>
        </span>
      )}
    </Link>
  );
}
