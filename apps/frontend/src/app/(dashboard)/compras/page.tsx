'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { CompraSummary } from '@japonparts/shared';
import { apiClient } from '../../../lib/api-client';
import { getStorageUrl } from '../../../lib/utils';
import { Header } from '../../../components/header';
import { PagoCompraModal } from '../../../components/pago-compra-modal';
import {
  ShoppingCart,
  Plus,
  FileText,
  Clock,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Filter,
} from 'lucide-react';

export default function ComprasPage() {
  const [estadoFilter, setEstadoFilter] = useState<string>('todos');
  const [selectedCompraPago, setSelectedCompraPago] = useState<CompraSummary | null>(null);

  const { data: compras = [], isLoading, refetch } = useQuery<CompraSummary[]>({
    queryKey: ['compras', estadoFilter],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (estadoFilter !== 'todos') {
        params.estado = estadoFilter;
      }
      const res = await apiClient.get<CompraSummary[]>('/compra', params);
      return res.data || [];
    },
  });

  // Calculate KPIs
  const totalFacturas = compras.length;
  const pendientesAprobacion = compras.filter((c) => c.estado === 'pendiente').length;
  const saldoPorPagar = compras.reduce((acc, c) => {
    const pending =
      c.saldo_pendiente !== undefined
        ? Number(c.saldo_pendiente)
        : Number(c.total) - Number(c.monto_pagado || 0);
    return acc + (pending > 0 ? pending : 0);
  }, 0);

  const formatCurrency = (val: number | string) => {
    return `$${Number(val || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="pb-16">
      <Header
        title="Compras & Facturas de Proveedores"
        subtitle="Digitalización con OCR asistido, aprobación con costeo ponderado y cuentas por pagar"
        onRefresh={() => refetch()}
        actionSlot={
          <Link
            href="/compras/nueva"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white text-xs font-bold transition shadow-lg shadow-rose-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>+ Cargar Factura (OCR / Manual)</span>
          </Link>
        }
      />

      <div className="p-8 max-w-7xl mx-auto space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card p-5 rounded-2xl">
            <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">
              Total Facturas Registradas
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-white">{totalFacturas}</span>
              <span className="text-xs text-slate-400 font-mono">Compras registradas</span>
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl border-l-4 border-l-amber-500">
            <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">
              Por Aprobar (Stock no sumado)
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-amber-400">{pendientesAprobacion}</span>
              <span className="text-xs text-amber-500/80 font-mono">En borrador / revisión</span>
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl border-l-4 border-l-rose-500">
            <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">
              Cuentas por Pagar (Saldo Total)
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-rose-400 font-mono">
                {formatCurrency(saldoPorPagar)}
              </span>
              <span className="text-xs text-rose-500/80 font-mono">Deuda con proveedores</span>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="glass-panel p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-300">Filtrar por Estado:</span>
            <div className="flex items-center gap-1.5 ml-2">
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'pendiente', label: 'Pendiente Aprobación' },
                { id: 'recibida', label: 'Recibida (Por Pagar)' },
                { id: 'pagada', label: 'Pagada (Liquidada)' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setEstadoFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    estadoFilter === tab.id
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <Link
            href="/proveedores"
            className="text-xs font-medium text-slate-400 hover:text-rose-400 flex items-center gap-1 transition"
          >
            <span>Ver Directorio de Proveedores & Estados de Cuenta</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Table */}
        <div className="glass-card rounded-2xl overflow-hidden border border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Nº Factura / Doc</th>
                  <th className="py-3.5 px-4">Proveedor</th>
                  <th className="py-3.5 px-4">Fecha Emisión</th>
                  <th className="py-3.5 px-4">Condición</th>
                  <th className="py-3.5 px-4 text-right">Total Factura</th>
                  <th className="py-3.5 px-4 text-right">Saldo Deudor</th>
                  <th className="py-3.5 px-4 text-center">Estado</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                        <span>Cargando facturas y compras...</span>
                      </div>
                    </td>
                  </tr>
                ) : compras.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-slate-800/60 flex items-center justify-center">
                          <ShoppingCart className="w-6 h-6 text-slate-400" />
                        </div>
                        <p className="text-sm font-medium text-slate-300">
                          No se encontraron compras o facturas
                        </p>
                        <p className="text-xs text-slate-500 max-w-sm">
                          Carga tu primera factura usando el motor OCR asistido o el formulario manual.
                        </p>
                        <Link
                          href="/compras/nueva"
                          className="mt-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition"
                        >
                          Cargar Factura Ahora
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  compras.map((compra) => {
                    const pending =
                      compra.saldo_pendiente !== undefined
                        ? Number(compra.saldo_pendiente)
                        : Number(compra.total) - Number(compra.monto_pagado || 0);

                    return (
                      <tr key={compra.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                            <div>
                              <span className="font-bold text-white font-mono block">
                                {compra.numero_factura}
                              </span>
                              {compra.archivo_url && (
                                <a
                                  href={getStorageUrl(compra.archivo_url)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-rose-400 hover:underline flex items-center gap-0.5 mt-0.5"
                                >
                                  <span>Ver comprobante</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div>
                            <span className="font-medium text-slate-200 block">
                              {compra.proveedor?.nombre || 'Proveedor Desconocido'}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              RIF: {compra.proveedor?.rif || 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-300">
                          {compra.fecha ? new Date(compra.fecha).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-medium uppercase ${
                              compra.condicion_pago === 'credito'
                                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                                : 'bg-slate-700/40 text-slate-300 border border-slate-600/30'
                            }`}
                          >
                            {compra.condicion_pago === 'credito'
                              ? `Crédito (${compra.dias_credito || 0}d)`
                              : 'Contado'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                          {formatCurrency(compra.total)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold">
                          {pending > 0 ? (
                            <span className="text-rose-400">{formatCurrency(pending)}</span>
                          ) : (
                            <span className="text-emerald-400 text-xs">Saldado</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {compra.estado === 'pendiente' && (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30">
                              <Clock className="w-3 h-3" />
                              Por Aprobar
                            </span>
                          )}
                          {compra.estado === 'recibida' && (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-medium bg-sky-500/10 text-sky-300 border border-sky-500/30">
                              <CheckCircle2 className="w-3 h-3" />
                              Recibida (Aprobada)
                            </span>
                          )}
                          {compra.estado === 'pagada' && (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" />
                              Pagada
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {compra.estado === 'recibida' && pending > 0 && (
                              <button
                                onClick={() => setSelectedCompraPago(compra)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 text-xs font-semibold transition"
                              >
                                Pagar
                              </button>
                            )}
                            <Link
                              href={`/compras/${compra.id}`}
                              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition flex items-center gap-1"
                            >
                              <span>Ver</span>
                              <ChevronRight className="w-3.5 h-3.5" />
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
        </div>
      </div>

      {/* Modal para Registrar Pago */}
      <PagoCompraModal
        compra={selectedCompraPago}
        isOpen={!!selectedCompraPago}
        onClose={() => setSelectedCompraPago(null)}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
