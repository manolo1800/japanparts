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
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1A5276] hover:bg-[#154360] text-white text-xs font-bold transition shadow-md shadow-[#1A5276]/20"
          >
            <Plus className="w-4 h-4" />
            <span>+ Cargar Factura (OCR / Manual)</span>
          </Link>
        }
      />

      <div className="p-8 max-w-7xl mx-auto space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm border-l-4 border-l-[#1A5276]">
            <span className="text-xs font-semibold text-[#7F8C8D] block uppercase tracking-wider">
              Total Facturas Registradas
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-bold text-[#2C3E50]">{totalFacturas}</span>
              <span className="text-xs text-[#7F8C8D] font-mono">Compras registradas</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm border-l-4 border-l-amber-500">
            <span className="text-xs font-semibold text-[#7F8C8D] block uppercase tracking-wider">
              Por Aprobar (Stock no sumado)
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-bold text-amber-600">{pendientesAprobacion}</span>
              <span className="text-xs text-amber-700/80 font-mono">En borrador / revisión</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm border-l-4 border-l-rose-500">
            <span className="text-xs font-semibold text-[#7F8C8D] block uppercase tracking-wider">
              Cuentas por Pagar (Saldo Total)
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-bold text-rose-600 font-mono">
                {formatCurrency(saldoPorPagar)}
              </span>
              <span className="text-xs text-rose-700/80 font-mono">Deuda con proveedores</span>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#1A5276]" />
            <span className="text-xs font-semibold text-[#2C3E50]">Filtrar por Estado:</span>
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
                      ? 'bg-[#1A5276] text-white font-bold shadow-sm'
                      : 'text-[#7F8C8D] hover:text-[#2C3E50] hover:bg-[#F8FBFF]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <Link
            href="/proveedores"
            className="text-xs font-medium text-[#7F8C8D] hover:text-[#1A5276] flex items-center gap-1 transition"
          >
            <span>Ver Directorio de Proveedores & Estados de Cuenta</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl overflow-hidden border border-[#E2E8F0] shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F9FA] text-[10px] font-bold text-[#7F8C8D] uppercase tracking-wider border-b border-[#E2E8F0]">
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
              <tbody className="divide-y divide-[#E2E8F0] font-medium">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-[#7F8C8D]">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-6 h-6 border-2 border-[#1A5276] border-t-transparent rounded-full animate-spin" />
                        <span>Cargando facturas y compras...</span>
                      </div>
                    </td>
                  </tr>
                ) : compras.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-[#7F8C8D]">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center">
                          <ShoppingCart className="w-6 h-6 text-[#1A5276]" />
                        </div>
                        <p className="text-sm font-semibold text-[#2C3E50]">
                          No se encontraron compras o facturas
                        </p>
                        <p className="text-xs text-[#7F8C8D] max-w-sm">
                          Carga tu primera factura usando el motor OCR asistido o el formulario manual.
                        </p>
                        <Link
                          href="/compras/nueva"
                          className="mt-2 px-4 py-2 rounded-xl bg-[#1A5276] hover:bg-[#154360] text-white text-xs font-bold transition shadow-md shadow-[#1A5276]/20"
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
                      <tr key={compra.id} className="hover:bg-[#F8FBFF] transition group">
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-[#1A5276] shrink-0" />
                            <div>
                              <span className="font-mono font-bold text-[#1A5276] bg-[#EFF6FF] px-2 py-0.5 rounded border border-[#BFDBFE] inline-block">
                                {compra.numero_factura}
                              </span>
                              {compra.archivo_url && (
                                <a
                                  href={getStorageUrl(compra.archivo_url)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-[#1A5276] hover:underline flex items-center gap-0.5 mt-0.5 font-semibold"
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
                            <span className="font-semibold text-[#2C3E50] block">
                              {compra.proveedor?.nombre || 'Proveedor Desconocido'}
                            </span>
                            <span className="text-[11px] text-[#7F8C8D] font-mono">
                              RIF: {compra.proveedor?.rif || 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-[#2C3E50] font-mono">
                          {compra.fecha ? new Date(compra.fecha).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${
                              compra.condicion_pago === 'credito'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-[#2C3E50] border border-slate-200'
                            }`}
                          >
                            {compra.condicion_pago === 'credito'
                              ? `Crédito (${compra.dias_credito || 0}d)`
                              : 'Contado'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-[#2C3E50]">
                          {formatCurrency(compra.total)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold">
                          {pending > 0 ? (
                            <span className="text-rose-600 font-bold">{formatCurrency(pending)}</span>
                          ) : (
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-xs">Saldado</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {compra.estado === 'pendiente' && (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3" />
                              Por Aprobar
                            </span>
                          )}
                          {compra.estado === 'recibida' && (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-bold bg-sky-50 text-sky-700 border border-sky-200">
                              <CheckCircle2 className="w-3 h-3" />
                              Recibida (Aprobada)
                            </span>
                          )}
                          {compra.estado === 'pagada' && (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
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
                                className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold transition"
                              >
                                Pagar
                              </button>
                            )}
                            <Link
                              href={`/compras/${compra.id}`}
                              className="px-3 py-1 rounded-lg bg-[#F8F9FA] hover:bg-[#EFF6FF] text-[#2C3E50] hover:text-[#1A5276] border border-[#E2E8F0] hover:border-[#BFDBFE] text-xs font-semibold transition flex items-center gap-1"
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
