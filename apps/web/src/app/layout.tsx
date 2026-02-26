import type { Metadata } from 'next';
import '@/styles/globals.css';
import { LeftRail } from '@/components/layout/LeftRail';
import { CommandPalette } from '@/components/layout/CommandPalette';

export const metadata: Metadata = {
  title: 'ProofPack',
  description: 'Turn agent runs into verifiable receipts',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="flex h-screen overflow-hidden">
        <LeftRail />
        <main className="flex-1 overflow-y-auto">{children}</main>
        <CommandPalette />
      </body>
    </html>
  );
}
