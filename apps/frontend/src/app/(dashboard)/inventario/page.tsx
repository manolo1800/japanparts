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
    <div className="pb-16 min-h-full">
      <Header
        title="Catálogo de SKUs & Inventario"
        subtitle="Gestión de repuestos maestros, compatibilidad vehicular y trazabilidad de stock"
        onRefresh={() => refetch()}
        showNewSkuBtn={true}
      />

      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="erp-card erp-card-hover">
            <span className="text-xs font-semibold text-[#7F8C8D] block uppercase tracking-wider">
              Total SKUs Registrados
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl lg:text-[28px] font-bold text-[#2C3E50] font-mono">{total}</span>
              <span className="text-xs text-[#7F8C8D]">Maestro de piezas</span>
            </div>
          </div>

          <div className="erp-card erp-card-hover">
            <span className="text-xs font-semibold text-[#7F8C8D] block uppercase tracking-wider">
              Alertas de Stock Mínimo
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl lg:text-[28px] font-bold text-amber-600 font-mono">{totalCriticos}</span>
              <span className="text-xs text-amber-600 font-medium">En página actual</span>
            </div>
          </div>

          <div className="erp-card erp-card-hover">
            <span className="text-xs font-semibold text-[#7F8C8D] block uppercase tracking-wider">
              Disponibilidad Inmediata
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl lg:text-[28px] font-bold text-[#1A5276] font-mono">
                {skus.filter((s) => s.stock_actual > 0).length}
              </span>
              <span className="text-xs text-[#7F8C8D]">Con stock activo</span>
            </div>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-[#7F8C8D] absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Buscar por SKU interno, nombre, marca o código..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-[#2C3E50] text-xs placeholder:text-[#95A5A6] focus:outline-none focus:border-[#4A90E2] focus:bg-white transition"
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
              className="px-3.5 py-2.5 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-[#2C3E50] text-xs w-36 focus:outline-none focus:border-[#4A90E2] focus:bg-white transition"
            />

            <button
              onClick={() => {
                setBajoStockFilter(!bajoStockFilter);
                setPage(1);
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition ${
                bajoStockFilter
                  ? 'bg-amber-500 text-white border-amber-500 font-bold shadow-sm'
                  : 'bg-[#F8F9FA] text-[#7F8C8D] border-[#E2E8F0] hover:text-[#2C3E50] hover:bg-slate-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Bajo Stock</span>
            </button>
          </div>
        </div>

        {/* SKUs Table */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F9FA] text-[#7F8C8D] uppercase tracking-wider text-[10px] font-bold border-b border-[#E2E8F0]">
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
              <tbody className="divide-y divide-[#E2E8F0] font-medium">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-[#7F8C8D]">
                      <div className="w-8 h-8 border-3 border-[#1A5276] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      Cargando inventario de repuestos...
                    </td>
                  </tr>
                ) : skus.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-[#7F8C8D]">
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
                        className="hover:bg-[#F8FBFF] transition group"
                      >
                        {/* SKU & Brand */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[#1A5276] bg-[#EFF6FF] px-2 py-1 rounded border border-[#BFDBFE]">
                              {sku.sku_interno}
                            </span>
                            <span className="text-[11px] font-semibold text-[#2C3E50]">
                              {sku.marca}
                            </span>
                          </div>
                          {sku.codigo_fabricante && (
                            <span className="text-[10px] text-[#7F8C8D] block mt-0.5 font-mono">
                              OEM: {sku.codigo_fabricante}
                            </span>
                          )}
                        </td>

                        {/* Name */}
                        <td className="py-4 px-4 max-w-xs">
                          <Link
                            href={`/inventario/${sku.id}`}
                            className="font-semibold text-[#2C3E50] hover:text-[#1A5276] transition block truncate"
                          >
                            {sku.nombre}
                          </Link>
                          {sku.descripcion && (
                            <span className="text-[11px] text-[#7F8C8D] line-clamp-1">
                              {sku.descripcion}
                            </span>
                          )}
                        </td>

                        {/* Stock */}
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold font-mono">
                            {isAgotado ? (
                              <span className="text-red-700 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200 flex items-center gap-1">
                                <XCircle className="w-3 h-3" /> Agotado (0)
                              </span>
                            ) : isCritico ? (
                              <span className="text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Crítico ({sku.stock_actual}/{sku.stock_minimo})
                              </span>
                            ) : (
                              <span className="text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> {sku.stock_actual} uds
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Price & Cost */}
                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          <span className="font-bold text-[#2C3E50] font-mono text-sm block">
                            ${Number(sku.precio_base).toFixed(2)}
                          </span>
                          <span className="text-[10px] text-[#7F8C8D] font-mono">
                            Costo: ${Number(sku.costo_promedio).toFixed(2)}
                          </span>
                        </td>

                        {/* Location */}
                        <td className="py-4 px-4 whitespace-nowrap text-[#7F8C8D] font-mono text-[11px]">
                          {sku.ubicacion || '—'}
                        </td>

                        {/* Vehicular Compatibilities */}
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          <button
                            onClick={() => setCompatModalSku(sku)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F8F9FA] text-[#2C3E50] hover:text-[#1A5276] hover:bg-[#EFF6FF] hover:border-[#BFDBFE] border border-[#E2E8F0] transition font-mono text-xs"
                          >
                            <Car className="w-3 h-3 text-[#1A5276]" />
                            <span>{sku.compatibilidades?.length || 0}</span>
                            <span className="text-[10px] text-[#7F8C8D]">+</span>
                          </button>
                        </td>

                        {/* Publications */}
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          <button
                            onClick={() => setPubModalSku(sku)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F8F9FA] text-[#2C3E50] hover:text-[#1A5276] hover:bg-[#EFF6FF] hover:border-[#BFDBFE] border border-[#E2E8F0] transition font-mono text-xs"
                          >
                            <Share2 className="w-3 h-3 text-sky-600" />
                            <span>{sku.publicaciones?.length || 0}</span>
                            <span className="text-[10px] text-[#7F8C8D]">+</span>
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setStockModalSku(sku)}
                              className="px-2.5 py-1.5 rounded-lg bg-[#F8F9FA] hover:bg-slate-100 text-[#2C3E50] border border-[#E2E8F0] text-xs font-semibold transition"
                              title="Ajustar Stock"
                            >
                              Ajustar
                            </button>

                            <Link
                              href={`/inventario/${sku.id}`}
                              className="p-1.5 rounded-lg text-[#7F8C8D] hover:text-[#1A5276] hover:bg-[#EFF6FF] transition"
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
            <div className="px-6 py-4 border-t border-[#E2E8F0] bg-[#F8F9FA] flex items-center justify-between text-xs text-[#7F8C8D]">
              <span>
                Página <strong className="text-[#2C3E50]">{page}</strong> de{' '}
                <strong className="text-[#2C3E50]">{totalPages}</strong> ({total} repuestos)
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg bg-white border border-[#E2E8F0] text-[#2C3E50] hover:bg-slate-50 disabled:opacity-40 transition font-medium"
                >
                  Anterior
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded-lg bg-white border border-[#E2E8F0] text-[#2C3E50] hover:bg-slate-50 disabled:opacity-40 transition font-medium"
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
