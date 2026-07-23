import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import Button from '../ui/Button.jsx';
import { cn } from '../../lib/utils.js';

const plans = [
  {
    name: 'Free',
    price: 0,
    tagline: 'For personal use',
    features: ['500MB storage', 'All PDF tools', '10 AI actions / day', 'Basic sharing', 'Community support'],
  },
  {
    name: 'Pro',
    price: 9,
    tagline: 'For power users',
    popular: true,
    features: [
      '10GB storage', 'Unlimited PDF tools', '200 AI actions / day', 'Password-protected shares',
      'Version history', 'OCR in 16 languages', 'Priority support',
    ],
  },
  {
    name: 'Business',
    price: 29,
    tagline: 'For teams & companies',
    features: [
      '50GB storage', 'Everything in Pro', '1000 AI actions / day', 'Admin analytics',
      'Audit logs', 'SLA & dedicated support',
    ],
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-5xl">
            Simple, <span className="gradient-text">honest pricing.</span>
          </h2>
          <p className="mt-4 text-slate-500 dark:text-slate-400">
            Start free forever. Upgrade when your documents demand more.
          </p>
        </motion.div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={cn(
                'glass relative rounded-3xl p-8',
                plan.popular &&
                  'border-brand-500/40 shadow-2xl shadow-brand-500/20 ring-1 ring-brand-500/30 lg:-translate-y-3 lg:scale-[1.03]'
              )}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-brand-600 to-accent-600 px-4 py-1 text-xs font-bold text-white shadow-lg">
                  Most popular
                </span>
              )}
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">{plan.name}</h3>
              <p className="text-sm text-slate-400">{plan.tagline}</p>
              <p className="mt-5">
                <span className="text-5xl font-black text-slate-900 dark:text-white">${plan.price}</span>
                <span className="text-sm text-slate-400"> /month</span>
              </p>
              <ul className="mt-6 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/signup" className="mt-8 block">
                <Button variant={plan.popular ? 'primary' : 'secondary'} className="w-full">
                  {plan.price === 0 ? 'Start free' : `Get ${plan.name}`}
                </Button>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
