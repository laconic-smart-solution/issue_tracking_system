import type { Metadata } from 'next';
import './globals.css';
import { SocketProvider } from '@/components/providers/SocketProvider';
import Sidebar from '@/components/layout/Sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';

export const metadata: Metadata = {
  title: 'IT Support — Issue Tracking System',
  description: 'Multi-company ERP Issue Tracking with LINE Bot integration',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 antialiased">
        <TooltipProvider>
          <SocketProvider>
            <div className="flex min-h-screen">
              <Sidebar />
              <main className="flex-1 flex flex-col overflow-hidden">
                {children}
              </main>
            </div>
          </SocketProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
