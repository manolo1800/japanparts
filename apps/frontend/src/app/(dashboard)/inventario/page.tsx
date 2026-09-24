'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { SkuSummary, PaginatedResult } from '@japonparts/shared';
import { apiClient } from '../../../lib/api-client';
import { Header } from '../../../components/header';
import { AjusteStockModal } from '../../../components/ajuste-stock-modal';
import { CompatibilidadModal } from '../../../components/compatibilidad-modal';
import { PublicacionModal } from '../../../components/publicacion-modal';
import {
  Search,
  Car,
  Share2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronRight,
} from 'lucide-react';

export default function InventarioPage() {
  const [search, setSearch] = useState('');
  const [marcaFilter, setMarcaFilter] = useState('');
  const [bajoStockFilter, setBajoStockFilter] = useState(false);
  const [page, setPage] = useState(1);

  // Modales
  const [stockModalSku, setStockModalSku] = useState<SkuSummary | null>(null);
  const [compatModalSku, setCompatModalSku] = useState<SkuSummary | null>(null);
  const [pubModalSku, setPubModalSku] = useState<SkuSummary | null>(null);

  const { data, isLoading, refetch } = useQuery<PaginatedResult<SkuSummary>>({
    queryKey: ['skus', search, marcaFilter, bajoStockFilter, page],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedResult<SkuSummary>>('/sku', {
        q: search || undefined,
        marca: marcaFilter || undefined,
        bajo_stock: bajoStockFilter ? true : undefined,
        page,
        limit: 15,
      });
      return res.data!;
    },
  });

  const skus = data?.items || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  // Estadísticas rápidas
  const totalCriticos = skus.filter((s) => s.stock_actual <= s.stock_minimo).length;

  return (
    <div className="pb-16">
      <Header
        title="Catálogo de SKUs & Inventario"
        subtitle="Gestión de repuestos maestros, compatibilidad vehicular y trazabilidad de stock"
        onRefresh={() => refetch()}
        showNewSkuBtn={true}
      />

      <div className="p-8 max-w-7xl mx-auto space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card p-5 rounded-2xl">
            <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">
              Total SKUs Registrados
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-white">{total}</span>
              <span className="text-xs text-slate-400 font-mono">Maestro de piezas</span>
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl border-l-4 border-l-amber-500">
            <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">
              Alertas de Stock Mínimo
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-amber-400">{totalCriticos}</span>
              <span className="text-xs text-amber-500/80 font-mono">En página actual</span>
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl border-l-4 border-l-emerald-500">
            <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">
              Disponibilidad Inmediata
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-emerald-400">
                {skus.filter((s) => s.stock_actual > 0).length}
              </span>
              <span className="text-xs text-emerald-500/80 font-mono">Con stock activo</span>
            </div>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="glass-panel p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Buscar por SKU interno, nombre, marca o código..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-rose-500 transition"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <input
              type="text"
              placeholder="Filtrar marca..."
              value={marcaFilter}
              onChange={(e) => {
                setMarcaFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-xs w-36 focus:outline-none focus:border-rose-500 transition"
            />

            <button
              onClick={() => {
                setBajoStockFilter(!bajoStockFilter);
                setPage(1);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition ${
                bajoStockFilter
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                  : 'bg-slate-900 text-slate-400 border-slate-700/80 hover:bg-slate-800'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Bajo Stock</span>
            </button>
          </div>
        </div>

        {/* SKUs Table */}
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">SKU / Marca</th>
                  <th className="py-3.5 px-4">Descripción Pieza</th>
                  <th className="py-3.5 px-4 text-center">Stock Actual</th>
                  <th className="py-3.5 px-4 text-right">Precio Base</th>
                  <th className="py-3.5 px-4">Ubicación</th>
                  <th className="py-3.5 px-4 text-center">Compatibilidades</th>
                  <th className="py-3.5 px-4 text-center">Publicaciones</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500 font-mono">
                      Cargando inventario de repuestos...
                    </td>
                  </tr>
                ) : skus.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      No se encontraron repuestos con los filtros indicados.
                    </td>
                  </tr>
                ) : (
                  skus.map((sku) => {
                    const isCritico = sku.stock_actual <= sku.stock_minimo;
                    const isAgotado = sku.stock_actual <= 0;

                    return (
                      <tr
                        key={sku.id}
                        className="hover:bg-slate-800/40 transition group"
                      >
                        {/* SKU & Brand */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-white bg-slate-800 px-2 py-1 rounded border border-slate-700">
                              {sku.sku_interno}
                            </span>
                            <span className="text-[11px] font-semibold text-rose-400">
                              {sku.marca}
                            </span>
                          </div>
                          {sku.codigo_fabricante && (
                            <span className="text-[10px] text-slate-500 block mt-0.5">
                              OEM: {sku.codigo_fabricante}
                            </span>
                          )}
                        </td>

                        {/* Name */}
                        <td className="py-4 px-4 max-w-xs">
                          <Link
                            href={`/inventario/${sku.id}`}
                            className="font-semibold text-slate-200 hover:text-rose-400 transition block truncate"
                          >
                            {sku.nombre}
                          </Link>
                          {sku.descripcion && (
                            <span className="text-[11px] text-slate-500 line-clamp-1">
                              {sku.descripcion}
                            </span>
                          )}
                        </td>

                        {/* Stock */}
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold font-mono">
                            {isAgotado ? (
                              <span className="text-red-400 bg-red-500/10 px-2.5 py-0.5 rounded-full border border-red-500/20 flex items-center gap-1">
                                <XCircle className="w-3 h-3" /> Agotado (0)
                              </span>
                            ) : isCritico ? (
                              <span className="text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Crítico ({sku.stock_actual}/{sku.stock_minimo})
                              </span>
                            ) : (
                              <span className="text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> {sku.stock_actual} uds
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Price & Cost */}
                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          <span className="font-bold text-white font-mono text-sm block">
                            ${Number(sku.precio_base).toFixed(2)}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            Costo: ${Number(sku.costo_promedio).toFixed(2)}
                          </span>
                        </td>

                        {/* Location */}
                        <td className="py-4 px-4 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                          {sku.ubicacion || '—'}
                        </td>

                        {/* Vehicular Compatibilities */}
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          <button
                            onClick={() => setCompatModalSku(sku)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition font-mono text-xs"
                          >
                            <Car className="w-3 h-3 text-rose-400" />
                            <span>{sku.compatibilidades?.length || 0}</span>
                            <span className="text-[10px] text-slate-500">+</span>
                          </button>
                        </td>

                        {/* Publications */}
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          <button
                            onClick={() => setPubModalSku(sku)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition font-mono text-xs"
                          >
                            <Share2 className="w-3 h-3 text-sky-400" />
                            <span>{sku.publicaciones?.length || 0}</span>
                            <span className="text-[10px] text-slate-500">+</span>
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setStockModalSku(sku)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition"
                              title="Ajustar Stock"
                            >
                              Ajustar
                            </button>

                            <Link
                              href={`/inventario/${sku.id}`}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                              title="Ver Ficha Completa"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between text-xs text-slate-400">
              <span>
                Página <strong className="text-white">{page}</strong> de{' '}
                <strong className="text-white">{totalPages}</strong> ({total} repuestos)
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 transition"
                >
                  Anterior
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 transition"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modales */}
      <AjusteStockModal
        sku={stockModalSku}
        isOpen={!!stockModalSku}
        onClose={() => setStockModalSku(null)}
        onSuccess={() => refetch()}
      />

      <CompatibilidadModal
        sku={compatModalSku}
        isOpen={!!compatModalSku}
        onClose={() => setCompatModalSku(null)}
        onSuccess={() => refetch()}
      />

      <PublicacionModal
        sku={pubModalSku}
        isOpen={!!pubModalSku}
        onClose={() => setPubModalSku(null)}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
