import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../context/auth-context';
import { ReactQueryProvider } from '../context/query-provider';

export const metadata: Metadata = {
  title: 'Japón Parts — ERP Multicanal de Repuestos Automotrices',
  description: 'Sistema integral de gestión de inventario, compatibilidad vehicular y ventas multicanal',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen bg-[#080c14] text-slate-100 antialiased selection:bg-rose-500 selection:text-white">
        <ReactQueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
