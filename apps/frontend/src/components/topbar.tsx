'use client';

import React, { useState, useEffect } from 'react';
import { Building2, Bell, Clock, Menu } from 'lucide-react';
import { useSidebar } from '../context/sidebar-context';

interface TopbarProps {
  title?: string;
  subtitle?: string;
  actionSlot?: React.ReactNode;
}

export function Topbar({ title = 'Dashboard', subtitle = 'Resumen general del sistema', actionSlot }: TopbarProps) {
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
          className="topbar-btn md:hidden"
          title="Alternar menú"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div>
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
      </div>

      <div className="topbar-right">
        {actionSlot}

        {/* Branch / Sede */}
        <div className="branch-badge hidden sm:flex">
          <Building2 className="w-3.5 h-3.5 text-[#1A5276]" />
          <span>Japón Parts — Sucursal Principal</span>
        </div>

        {/* Current Time Clock */}
        {timeString && (
          <div className="current-time hidden md:flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{timeString}</span>
          </div>
        )}

        {/* Notification Bell */}
        <button className="topbar-btn" title="Notificaciones del sistema">
          <Bell className="w-4 h-4 text-slate-600" />
          <span className="notif-dot" />
        </button>
      </div>
    </header>
  );
}
