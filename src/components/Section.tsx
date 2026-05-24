// Themed section wrapper with gradient border + ambient bg + eyebrow header.
// Supports optional collapse — pass collapsible to add a chevron toggle in the
// header; the children area smoothly hides/shows on click.
import { ReactNode, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

export type SectionTheme = 'hero' | 'journal' | 'battle' | 'insight' | 'armory' | 'chat';

const EYEBROW_COLOR: Record<SectionTheme, string> = {
  hero:    'text-purple-300',
  journal: 'text-[var(--accent)]',
  battle:  'text-amber-300',
  insight: 'text-sky-300',
  armory:  'text-purple-300',
  chat:    'text-sky-300',
};

const EYEBROW_DOT: Record<SectionTheme, string> = {
  hero:    'bg-purple-400',
  journal: 'bg-[var(--accent)]',
  battle:  'bg-amber-300',
  insight: 'bg-sky-300',
  armory:  'bg-purple-400',
  chat:    'bg-sky-300',
};

export default function Section({
  theme, eyebrow, title, subtitle, children, id, anchor,
  collapsible = false, defaultOpen = true,
}: {
  theme: SectionTheme;
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  id?: string;
  anchor?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <motion.section
      id={id || anchor}
      className={`section section-${theme} relative`}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Animated rotating gradient border (per theme accent) */}
      <div className="section-glow" aria-hidden />
      <div className="section-bg" />
      <div className="relative">
        <motion.div
          className="flex items-baseline justify-between gap-4 mb-4 flex-wrap"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, delay: 0.1 }}
        >
          <div className="flex items-start gap-3">
            {/* Pulsing dot per theme */}
            <span className={`mt-1.5 w-1.5 h-1.5 rounded-full ${EYEBROW_DOT[theme]} relative shrink-0`}>
              <span className={`absolute inset-0 rounded-full ${EYEBROW_DOT[theme]} animate-ping opacity-60`} />
            </span>
            <div>
              <div className={`section-eyebrow ${EYEBROW_COLOR[theme]}`}>{eyebrow}</div>
              <h2 className="section-title mt-1">{title}</h2>
            </div>
          </div>
          <div className="flex items-center gap-3 ml-auto">
            {subtitle && (
              <div className="text-[12px] text-[var(--muted)] max-w-md text-right hidden sm:block">{subtitle}</div>
            )}
            {collapsible && (
              <button
                onClick={() => setOpen(o => !o)}
                title={open ? 'Collapse' : 'Expand'}
                aria-expanded={open}
                className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--fg)] hover:bg-white/[0.05] border hairline-2 transition shrink-0"
              >
                <motion.span
                  animate={{ rotate: open ? 0 : -90 }}
                  transition={{ type: 'spring', stiffness: 220, damping: 22 }}
                  className="block"
                >
                  <ChevronDown className="w-4 h-4" />
                </motion.span>
              </button>
            )}
          </div>
        </motion.div>

        <AnimatePresence initial={false}>
          {(!collapsible || open) && (
            <motion.div
              key="content"
              initial={collapsible ? { height: 0, opacity: 0 } : false}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}
