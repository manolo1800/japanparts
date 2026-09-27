'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  PublicacionSummary,
  calculateItemChannelFinancials,
  MERCADOLIBRE_COMMISSION_RATE,
} from '@japonparts/shared';
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
          <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm border-l-4 border-l-amber-500">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider">
                MercadoLibre (MLV)
              </span>
              <ShoppingBag className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-bold text-[#2C3E50]">{mlPubs.length}</span>
              <span className="text-xs text-amber-700 font-mono font-semibold">Comisión: 12% por venta</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm border-l-4 border-l-emerald-600">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider">
                Catálogo WhatsApp
              </span>
              <MessageCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-bold text-[#2C3E50]">{wsPubs.length}</span>
              <span className="text-xs text-[#7F8C8D] font-mono">Listados automáticos</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm border-l-4 border-l-sky-600">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider">
                Tarifas Mostrador (POS)
              </span>
              <Store className="w-5 h-5 text-sky-600" />
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-bold text-[#2C3E50]">{mostradorPubs.length}</span>
              <span className="text-xs text-[#7F8C8D] font-mono">Punto de venta físico</span>
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
              className={`px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 border transition ${
                selectedCanal === tab.id
                  ? 'bg-[#1A5276] text-white border-[#1A5276] shadow-sm font-bold'
                  : 'bg-white text-[#7F8C8D] border-[#E2E8F0] hover:bg-[#F8FBFF] hover:text-[#2C3E50] font-semibold'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                selectedCanal === tab.id ? 'bg-white/20 text-white' : 'bg-[#F8F9FA] text-[#7F8C8D]'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Publications Table */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F9FA] text-[#7F8C8D] uppercase tracking-wider text-[10px] font-bold border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-3.5 px-4">Canal</th>
                  <th className="py-3.5 px-4">SKU Asociado</th>
                  <th className="py-3.5 px-4">Título Publicación</th>
                  <th className="py-3.5 px-4 text-right">Precio Canal</th>
                  <th className="py-3.5 px-4 text-right">Comisión / Neto</th>
                  <th className="py-3.5 px-4 text-center">Stock Publicado</th>
                  <th className="py-3.5 px-4 text-center">Estado</th>
                  <th className="py-3.5 px-4 text-right">Enlace / Ficha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] font-medium">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#7F8C8D] font-mono">
                      <div className="w-8 h-8 border-3 border-[#1A5276] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      Cargando publicaciones multicanal...
                    </td>
                  </tr>
                ) : pubs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#7F8C8D]">
                      No hay publicaciones registradas en este canal.
                    </td>
                  </tr>
                ) : (
                  pubs.map((pub) => {
                    const isMl = pub.canal === 'ml';
                    const isWs = pub.canal === 'whatsapp';

                    return (
                      <tr key={pub.id} className="hover:bg-[#F8FBFF] transition group">
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 rounded-lg font-mono text-[10px] uppercase font-bold inline-flex items-center gap-1.5 ${
                              isMl
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : isWs
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-sky-50 text-sky-700 border border-sky-200'
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
                              className="font-mono font-bold text-[#1A5276] bg-[#EFF6FF] px-2 py-0.5 rounded border border-[#BFDBFE] hover:bg-[#DBEAFE] transition inline-block"
                            >
                              {pub.sku.sku_interno}
                            </Link>
                          ) : (
                            <span className="text-[#7F8C8D] font-mono">—</span>
                          )}
                        </td>

                        <td className="py-4 px-4 max-w-sm">
                          <span className="font-semibold text-[#2C3E50] block truncate">
                            {pub.titulo}
                          </span>
                          {pub.cuenta && (
                            <span className="text-[10px] text-[#7F8C8D] block mt-0.5">
                              Cuenta: {pub.cuenta.alias}
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-4 text-right whitespace-nowrap font-mono font-bold text-[#2C3E50] text-sm">
                          ${Number(pub.precio).toFixed(2)}
                        </td>

                        <td className="py-4 px-4 text-right whitespace-nowrap font-mono text-xs">
                          {isMl ? (
                            <div>
                              <span className="text-amber-700 font-bold block text-[11px]">
                                ML (12%): -${(Number(pub.precio) * MERCADOLIBRE_COMMISSION_RATE).toFixed(2)}
                              </span>
                              <span className="text-[10px] text-[#7F8C8D]">
                                Neto: ${(Number(pub.precio) * (1 - MERCADOLIBRE_COMMISSION_RATE)).toFixed(2)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-emerald-700 font-medium text-[11px]">
                              0% com. (100% neto)
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-4 text-center whitespace-nowrap font-mono font-bold text-[#2C3E50]">
                          {pub.stock_publicado}
                        </td>

                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {pub.estado}
                          </span>
                        </td>

                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {pub.sku && (
                              <Link
                                href={`/inventario/${pub.sku.id}`}
                                className="text-xs text-[#1A5276] hover:text-[#154360] font-semibold"
                              >
                                Ver SKU
                              </Link>
                            )}
                            {pub.url && (
                              <a
                                href={pub.url}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 rounded text-[#7F8C8D] hover:text-[#1A5276] hover:bg-[#EFF6FF] transition"
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
