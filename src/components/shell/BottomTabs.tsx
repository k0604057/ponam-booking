'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// 역할로 탭을 숨기지 않는다. RLS 가 이미 막고 있으므로 보안 문제가 아니라 UX 문제다.
const TABS = [
  { href: '/cleaning', label: '청소', icon: BroomIcon },
  { href: '/calendar', label: '달력', icon: CalendarIcon },
  { href: '/reservations', label: '예약', icon: ListIcon },
  { href: '/more', label: '더보기', icon: MoreIcon },
] as const;

export default function BottomTabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="주요 메뉴"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-neutral-200 bg-white/95 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto flex max-w-2xl">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
                  active ? 'text-neutral-900 dark:text-neutral-50' : 'text-neutral-400 dark:text-neutral-500'
                }`}
              >
                <Icon filled={active} />
                {/* 아이콘만 두지 않는다 — 라벨이 있어야 알아본다 */}
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

type IconProps = { filled?: boolean };
const base = 'size-6 shrink-0';

function BroomIcon({ filled }: IconProps) {
  return (
    <svg className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={filled ? 2.2 : 1.7} aria-hidden>
      <path d="M14 4 9.5 8.5" strokeLinecap="round" />
      <path d="M6 11.5 12.5 5l6 6-6.5 6.5z" strokeLinejoin="round" />
      <path d="M9 20c-1.5 0-3-.6-3-2.5 0-1.2.7-2 1.5-3" strokeLinecap="round" />
      <path d="M12.5 20H5" strokeLinecap="round" />
    </svg>
  );
}

function CalendarIcon({ filled }: IconProps) {
  return (
    <svg className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={filled ? 2.2 : 1.7} aria-hidden>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 10h17M8 3.5v3M16 3.5v3" strokeLinecap="round" />
    </svg>
  );
}

function ListIcon({ filled }: IconProps) {
  return (
    <svg className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={filled ? 2.2 : 1.7} aria-hidden>
      <path d="M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01" strokeLinecap="round" />
    </svg>
  );
}

function MoreIcon({ filled }: IconProps) {
  return (
    <svg className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={filled ? 2.2 : 1.7} aria-hidden>
      <circle cx="12" cy="5.5" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="12" cy="18.5" r="1.6" />
    </svg>
  );
}
