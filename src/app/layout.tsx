import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import Navigation from '@/components/Navigation';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'BazarHisab - Household Grocery & Expense Tracker',
  description: 'Track grocery expenses, product price history, and monthly budgets locally first.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'BazarHisab',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="bg-gray-100 min-h-screen flex justify-center items-stretch font-sans text-gray-900">
        {/* Mobile Mock Container */}
        <div className="w-full max-w-md bg-gray-50 min-h-screen shadow-lg flex flex-col border-x border-gray-200/50 pb-20 relative">
          <Header />
          <main className="flex-1 overflow-y-auto px-4 py-4">
            {children}
          </main>
          <Navigation />
        </div>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                  navigator.serviceWorker.getRegistrations().then(function(registrations) {
                    for (var r of registrations) { r.unregister(); }
                  });
                  if ('caches' in window) {
                    caches.keys().then(function(names) {
                      for (var name of names) { caches.delete(name); }
                    });
                  }
                } else {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js').then(function(reg) {
                      console.log('SW registered successfully');
                    }).catch(function(err) {
                      console.log('SW registration failed', err);
                    });
                  });
                }
              }
            `
          }}
        />
      </body>
    </html>
  );
}
