'use client';

import React from 'react';
import Link from 'next/link';
import { Plus, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/auth-context';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  showNewSkuBtn?: boolean;
}

export function Header({
  title,
  subtitle,
  onRefresh,
  showNewSkuBtn = true,
}: HeaderProps) {
  const { isBodega } = useAuth();

  return (
    <header className="h-16 px-8 border-b border-slate-800/80 bg-[#090d16]/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-30">
      <div>
        <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-800 transition"
            title="Recargar datos"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}

        {showNewSkuBtn && isBodega && (
          <Link
            href="/inventario/nuevo"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/25 transition active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuevo SKU</span>
          </Link>
        )}
      </div>
    </header>
  );
}
