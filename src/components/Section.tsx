// Themed section wrapper with gradient border + ambient bg + eyebrow header.
import { ReactNode } from 'react';

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
    <section id={id || anchor} className={`section section-${theme}`}>
      <div className="section-bg" />
      <div className="relative">
        <div className="flex items-baseline justify-between gap-4 mb-4 flex-wrap">
          <div>
            <div className={`section-eyebrow ${EYEBROW_COLOR[theme]}`}>{eyebrow}</div>
            <h2 className="section-title mt-1">{title}</h2>
          </div>
          {subtitle && <div className="text-[12px] text-[var(--muted)] max-w-md text-right">{subtitle}</div>}
        </div>
        {children}
      </div>
    </section>
  );
}
