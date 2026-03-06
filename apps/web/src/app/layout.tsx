import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { TRPCProvider } from '@/lib/trpc';
import { Sidebar } from '@/components/layout/Sidebar';
import { PageTransition } from '@/components/layout/PageTransition';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'BDO Market Analyzer — Servidor SA',
  description:
    'Analisador de mercado e calculadora de lucratividade para Black Desert Online (Servidor SA). Rankeamento de receitas por ROI, liquidez e lucro.',
  keywords: ['BDO', 'Black Desert Online', 'Market', 'Cooking', 'Alchemy', 'SA'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        <TRPCProvider>
          <Sidebar />
          <main className="main-content">
            <PageTransition>
              {children}
            </PageTransition>
          </main>
        </TRPCProvider>
      </body>
    </html>
  );
}
