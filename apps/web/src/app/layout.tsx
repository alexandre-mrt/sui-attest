import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ClientProviders } from './ClientProviders';
import { NavBar } from '@/components/NavBar';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'SuiAttest — On-chain Attestation Service',
  description:
    'Issue, verify, and revoke verifiable credentials on Sui. Infrastructure for trust.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg-root text-text-primary">
        <ClientProviders>
          <NavBar />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-border py-8 text-center text-[13px] text-text-tertiary">
            SuiAttest &mdash; Testnet &bull; Built on{' '}
            <a
              href="https://sui.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-secondary hover:text-accent transition-colors duration-150"
            >
              Sui
            </a>
          </footer>
        </ClientProviders>
      </body>
    </html>
  );
}
