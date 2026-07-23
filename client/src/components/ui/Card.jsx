import { motion } from 'framer-motion';
import { cn } from '../../lib/utils.js';

export default function Card({ className, children, hover = false, animate = false, ...props }) {
  const Comp = animate ? motion.div : 'div';
  const motionProps = animate
    ? {
        initial: { opacity: 0, y: 16 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: '-40px' },
        transition: { duration: 0.45, ease: 'easeOut' },
      }
    : {};

  return (
    <Comp
      className={cn(
        'glass rounded-2xl p-5 shadow-sm',
        hover &&
          'transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-500/10 dark:hover:shadow-brand-500/5',
        className
      )}
      {...motionProps}
      {...props}
    >
      {children}
    </Comp>
  );
}
