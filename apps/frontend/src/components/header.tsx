'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, RefreshCw, Building2, Clock, Bell, Menu } from 'lucide-react';
import { useAuth } from '../context/auth-context';
import { useSidebar } from '../context/sidebar-context';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  showNewSkuBtn?: boolean;
  actionSlot?: React.ReactNode;
}

export function Header({
  title,
  subtitle,
  onRefresh,
  showNewSkuBtn = false,
  actionSlot,
}: HeaderProps) {
  const { isBodega } = useAuth();
  const { toggleSidebar } = useSidebar();
  const [timeString, setTimeString] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(
        now.toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }),
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          onClick={toggleSidebar}
          className="topbar-btn md:hidden shrink-0"
          title="Alternar menú"
          aria-label="Alternar menú"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="page-title truncate" title={title}>
            {title}
          </h1>
          {subtitle && (
            <p className="page-subtitle hidden sm:block truncate" title={subtitle}>
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="topbar-right">
        {actionSlot && (
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {actionSlot}
          </div>
        )}

        {onRefresh && (
          <button
            onClick={onRefresh}
            className="topbar-btn shrink-0"
            title="Recargar datos"
            aria-label="Recargar datos"
          >
            <RefreshCw className="w-4 h-4 text-slate-600" />
          </button>
        )}

        {showNewSkuBtn && isBodega && (
          <Link
            href="/inventario/nuevo"
            className="btn btn-primary !text-xs !py-2 !px-3 shrink-0 whitespace-nowrap"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Nuevo SKU</span>
            <span className="sm:hidden">SKU</span>
          </Link>
        )}

        {/* Branch / Sede: full text on 2xl+, compact on lg-xl, hidden on mobile/tablet */}
        <div className="branch-badge hidden 2xl:flex items-center gap-1.5 shrink-0" title="Tokugawa Spare Parts — Sucursal Principal">
          <Building2 className="w-3.5 h-3.5 text-[#1A5276] shrink-0" />
          <span className="truncate max-w-[220px]">Tokugawa Spare Parts — Sucursal Principal</span>
        </div>
        <div className="branch-badge hidden lg:flex 2xl:hidden items-center gap-1.5 shrink-0" title="Sucursal Principal">
          <Building2 className="w-3.5 h-3.5 text-[#1A5276] shrink-0" />
          <span>Sucursal Principal</span>
        </div>

        {/* Live Clock: only on xl+ */}
        {timeString && (
          <div className="current-time hidden xl:flex items-center gap-1.5 shrink-0">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{timeString}</span>
          </div>
        )}

        {/* Notification Bell */}
        <button className="topbar-btn shrink-0" title="Notificaciones del sistema" aria-label="Notificaciones">
          <Bell className="w-4 h-4 text-slate-600" />
          <span className="notif-dot" />
        </button>
      </div>
    </header>
  );
}
