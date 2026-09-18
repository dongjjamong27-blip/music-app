'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/', icon: '✏️', label: '글쓰기' },
  { href: '/connect', icon: '🔗', label: '연결' },
  { href: '/setup', icon: '⚙️', label: '설정' },
  { href: '/history', icon: '📋', label: '기록' },
];

export default function TabBar() {
  const path = usePathname();
  return (
    <nav className="tabbar">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={path === t.href ? 'on' : ''}>
          <span className="ico">{t.icon}</span>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
