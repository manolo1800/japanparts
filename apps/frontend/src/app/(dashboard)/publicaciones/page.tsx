'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PublicacionSummary } from '@japonparts/shared';
import { apiClient } from '../../../lib/api-client';
import { Header } from '../../../components/header';
import {
  ExternalLink,
  ShoppingBag,
  MessageCircle,
  Store,
} from 'lucide-react';
import Link from 'next/link';

export default function PublicacionesPage() {
  const [selectedCanal, setSelectedCanal] = useState<string>('todos');

  const { data: publicaciones, isLoading, refetch } = useQuery<PublicacionSummary[]>({
    queryKey: ['todas-publicaciones', selectedCanal],
    queryFn: async () => {
      const canalParam = selectedCanal !== 'todos' ? selectedCanal : undefined;
      const res = await apiClient.get<PublicacionSummary[]>('/publicacion', {
        canal: canalParam,
      });
      return res.data!;
    },
  });

  const pubs = publicaciones || [];

  // Agrupación por canal
  const mlPubs = pubs.filter((p) => p.canal === 'ml');
  const wsPubs = pubs.filter((p) => p.canal === 'whatsapp');
  const mostradorPubs = pubs.filter((p) => p.canal === 'mostrador');

  return (
    <div className="pb-16">
      <Header
        title="Publicaciones Multicanal"
        subtitle="Monitoreo y gestión de publicaciones activas en MercadoLibre, WhatsApp y Mostrador"
        onRefresh={() => refetch()}
        showNewSkuBtn={false}
      />

      <div className="p-8 max-w-7xl mx-auto space-y-6">
        {/* KPI Channel Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card p-5 rounded-2xl border-l-4 border-l-amber-500">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                MercadoLibre (MLV)
              </span>
              <ShoppingBag className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-white">{mlPubs.length}</span>
              <span className="text-xs text-amber-400/80 font-mono">Publicaciones vinculadas</span>
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Catálogo WhatsApp
              </span>
              <MessageCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-white">{wsPubs.length}</span>
              <span className="text-xs text-emerald-400/80 font-mono">Listados automáticos</span>
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl border-l-4 border-l-sky-500">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Tarifas Mostrador (POS)
              </span>
              <Store className="w-5 h-5 text-sky-400" />
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-white">{mostradorPubs.length}</span>
              <span className="text-xs text-sky-400/80 font-mono">Punto de venta físico</span>
            </div>
          </div>
        </div>

        {/* Filter Tab bar */}
        <div className="flex items-center gap-2">
          {[
            { id: 'todos', label: 'Todos los Canales', count: pubs.length },
            { id: 'ml', label: 'MercadoLibre', count: mlPubs.length },
            { id: 'whatsapp', label: 'WhatsApp', count: wsPubs.length },
            { id: 'mostrador', label: 'Mostrador', count: mostradorPubs.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedCanal(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition ${
                selectedCanal === tab.id
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] font-mono">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Publications Table */}
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Canal</th>
                  <th className="py-3.5 px-4">SKU Asociado</th>
                  <th className="py-3.5 px-4">Título Publicación</th>
                  <th className="py-3.5 px-4 text-right">Precio Canal</th>
                  <th className="py-3.5 px-4 text-center">Stock Publicado</th>
                  <th className="py-3.5 px-4 text-center">Estado</th>
                  <th className="py-3.5 px-4 text-right">Enlace / Ficha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500 font-mono">
                      Cargando publicaciones multicanal...
                    </td>
                  </tr>
                ) : pubs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      No hay publicaciones registradas en este canal.
                    </td>
                  </tr>
                ) : (
                  pubs.map((pub) => {
                    const isMl = pub.canal === 'ml';
                    const isWs = pub.canal === 'whatsapp';

                    return (
                      <tr key={pub.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 rounded-lg font-mono text-[10px] uppercase font-bold inline-flex items-center gap-1.5 ${
                              isMl
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : isWs
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                            }`}
                          >
                            {isMl && <ShoppingBag className="w-3 h-3" />}
                            {isWs && <MessageCircle className="w-3 h-3" />}
                            {!isMl && !isWs && <Store className="w-3 h-3" />}
                            {pub.canal}
                          </span>
                        </td>

                        <td className="py-4 px-4 whitespace-nowrap">
                          {pub.sku ? (
                            <Link
                              href={`/inventario/${pub.sku.id}`}
                              className="font-mono font-bold text-white hover:text-rose-400 transition"
                            >
                              {pub.sku.sku_interno}
                            </Link>
                          ) : (
                            <span className="text-slate-500 font-mono">—</span>
                          )}
                        </td>

                        <td className="py-4 px-4 max-w-sm">
                          <span className="font-semibold text-slate-200 block truncate">
                            {pub.titulo}
                          </span>
                          {pub.cuenta && (
                            <span className="text-[10px] text-slate-500 block mt-0.5">
                              Cuenta: {pub.cuenta.alias}
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-4 text-right whitespace-nowrap font-mono font-black text-white text-sm">
                          ${Number(pub.precio).toFixed(2)}
                        </td>

                        <td className="py-4 px-4 text-center whitespace-nowrap font-mono font-bold text-slate-300">
                          {pub.stock_publicado}
                        </td>

                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300">
                            {pub.estado}
                          </span>
                        </td>

                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {pub.sku && (
                              <Link
                                href={`/inventario/${pub.sku.id}`}
                                className="text-xs text-rose-400 hover:text-rose-300 font-semibold"
                              >
                                Ver SKU
                              </Link>
                            )}
                            {pub.url && (
                              <a
                                href={pub.url}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                                title="Abrir enlace externo"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
