'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/auth-context';
import {
  Package,
  Share2,
  LogOut,
  Car,
  ShoppingCart,
  Building2,
} from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navItems = [
    {
      label: 'Inventario & SKUs',
      href: '/inventario',
      icon: Package,
      badge: null,
    },
    {
      label: 'Buscador por Vehículo',
      href: '/buscador-inverso',
      icon: Car,
      badge: 'Inverso',
    },
    {
      label: 'Publicaciones Canales',
      href: '/publicaciones',
      icon: Share2,
      badge: null,
    },
    {
      label: 'Compras & Facturas',
      href: '/compras',
      icon: ShoppingCart,
      badge: 'OCR',
    },
    {
      label: 'Proveedores & CxP',
      href: '/proveedores',
      icon: Building2,
      badge: null,
    },
  ];

  return (
    <aside className="w-64 border-r border-slate-800/80 bg-[#0b101b] flex flex-col justify-between shrink-0 select-none">
      <div>
        {/* Brand Header */}
        <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800/80">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-rose-400 flex items-center justify-center shadow-lg shadow-rose-600/30">
            <span className="font-black text-white text-lg tracking-wider">JP</span>
          </div>
          <div>
            <span className="font-bold text-base tracking-wide text-white block leading-tight">
              JAPÓN<span className="text-rose-500 font-black">PARTS</span>
            </span>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-medium">
              ERP Multicanal
            </span>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="px-3 py-6">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">
            Módulos Fase 1
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== '/' && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-sm shadow-rose-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-rose-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* User Status & Logout Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-900/30">
        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/60">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-rose-400 shrink-0">
              {user?.nombre?.charAt(0) || 'U'}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-slate-200 truncate leading-tight">
                {user?.nombre || 'Usuario'}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-medium uppercase tracking-wide ${
                    user?.rol === 'admin'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : user?.rol === 'bodega'
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {user?.rol || 'Rol'}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            title="Cerrar sesión"
            className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
