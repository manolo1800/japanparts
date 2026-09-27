'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { SidebarProvider } from '../../context/sidebar-context';
import { Sidebar } from '../../components/sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#113750] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#4A90E2] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-white/70 font-medium tracking-wide">Cargando ERP Japón Parts...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="layout">
        {/* Sidebar colapsable con diseño Invenfarma */}
        <Sidebar />

        {/* Área Principal Flotante (Floating Main Canvas) */}
        <div className="main">
          {children}
        </div>
      </div>
    </SidebarProvider>
  );
}
