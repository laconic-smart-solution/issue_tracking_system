'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Ticket, Building2, Users, Settings, AlertTriangle, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/tickets', label: 'All Tickets', icon: Ticket },
  { href: '/knowledge', label: 'Mantis Archive (KB)', icon: BookOpen },
  { href: '/companies', label: 'Companies', icon: Building2 },
  { href: '/agents', label: 'Agents', icon: Users },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <AlertTriangle className="text-yellow-400 w-6 h-6" />
          <div>
            <p className="font-bold text-sm leading-tight">IT Support</p>
            <p className="text-xs text-gray-400">Issue Tracking</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">A</div>
          <div>
            <p className="text-xs font-medium">Admin</p>
            <p className="text-xs text-gray-400">IT Support Team</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
