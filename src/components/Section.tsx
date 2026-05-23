// Themed section wrapper with gradient border + ambient bg + eyebrow header.
import { ReactNode } from 'react';
import { motion } from 'framer-motion';

export type SectionTheme = 'hero' | 'journal' | 'battle' | 'insight' | 'armory' | 'chat';

const EYEBROW_COLOR: Record<SectionTheme, string> = {
  hero:    'text-purple-300',
  journal: 'text-[var(--accent)]',
  battle:  'text-amber-300',
  insight: 'text-sky-300',
  armory:  'text-purple-300',
  chat:    'text-sky-300',
};

export default function Section({
  theme, eyebrow, title, subtitle, children, id, anchor,
}: {
  theme: SectionTheme;
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  id?: string;
  anchor?: string;
}) {
  return (
    <motion.section
      id={id || anchor}
      className={`section section-${theme}`}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="section-bg" />
      <div className="relative">
        <motion.div
          className="flex items-baseline justify-between gap-4 mb-4 flex-wrap"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, delay: 0.1 }}
        >
          <div>
            <div className={`section-eyebrow ${EYEBROW_COLOR[theme]}`}>{eyebrow}</div>
            <h2 className="section-title mt-1">{title}</h2>
          </div>
          {subtitle && <div className="text-[12px] text-[var(--muted)] max-w-md text-right">{subtitle}</div>}
        </motion.div>
        {children}
      </div>
    </motion.section>
  );
}
