//src/app/layout.js

import { Inter } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/context/AppContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'PlugScore',
  description: 'Análise de Lançamentos de Marketing',
};

// Este é o Layout Raiz. Ele "embrulha" TODA a aplicação.
export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <AppProvider>
          {/* A única responsabilidade deste layout é fornecer o contexto e renderizar os seus filhos, 
              que neste caso será o layout (main). Ele não deve ter Sidebar ou Header aqui. */}
          {children}
        </AppProvider>
      </body>
    </html>
  );
}

