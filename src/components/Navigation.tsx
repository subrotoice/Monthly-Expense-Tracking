'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, History, Plus, Wallet, Settings } from 'lucide-react';

export default function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'History', href: '/history', icon: History },
    { label: 'Add', href: '/market/new', icon: Plus, isAction: true },
    { label: 'Personal', href: '/personal', icon: Wallet },
    { label: 'More', href: '/settings', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 shadow-lg px-2 py-1 max-w-md mx-auto">
      <div className="flex justify-around items-center h-14 relative">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

          if (item.isAction) {
            return (
              <div key={item.label} className="relative -top-4">
                <Link
                  href={item.href}
                  className="flex items-center justify-center w-14 h-14 rounded-full bg-green-600 hover:bg-green-700 text-white shadow-md border-4 border-white transition-all transform active:scale-95"
                  title="Add Market Expense"
                >
                  <Plus className="w-7 h-7" />
                </Link>
                <span className="absolute left-1/2 transform -translate-x-1/2 top-14 text-3xs font-medium text-gray-500 mt-0.5">
                  {item.label}
                </span>
              </div>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors ${
                isActive ? 'text-green-600 font-semibold' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon className="w-5.5 h-5.5 mb-0.5" />
              <span className="text-3xs font-medium tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
