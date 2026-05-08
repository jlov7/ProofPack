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
      <body className="workbench-surface min-h-[100dvh] overflow-hidden">
        <LeftRail />
        <main className="h-[100dvh] overflow-y-auto pb-20 md:ml-60 md:pb-0">{children}</main>
        <CommandPalette />
      </body>
    </html>
  );
}
