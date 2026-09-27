import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '../context/auth-context';
import { ReactQueryProvider } from '../context/query-provider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Tokugawa Spare Parts — ERP Multicanal de Repuestos Automotrices',
  description: 'Sistema integral de gestión de inventario, compatibilidad vehicular y ventas multicanal',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={`${inter.variable} font-sans min-h-screen bg-[#113750] text-[#2C3E50] antialiased selection:bg-[#4A90E2] selection:text-white`}>
        <ReactQueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
