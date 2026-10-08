'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { CompraSummary, OrdenCompraSummary, PurchaseOrderStatus } from '@japonparts/shared';
import { apiClient } from '../../../lib/api-client';
import { getStorageUrl } from '../../../lib/utils';
import { Header } from '../../../components/header';
import { PagoCompraModal } from '../../../components/pago-compra-modal';
import { EnviarOrdenModal } from '../../../components/enviar-orden-modal';
import {
  ShoppingCart,
  Plus,
  FileText,
  Clock,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Filter,
  Package,
  Send,
  Download,
  Mail,
  MessageSquare,
  Search,
} from 'lucide-react';

export default function ComprasPage() {
  // Main view tab: 'facturas' | 'ordenes'
  const [activeMainTab, setActiveMainTab] = useState<'facturas' | 'ordenes'>('facturas');

  // Facturas state
  const [estadoFilter, setEstadoFilter] = useState<string>('todos');
  const [selectedCompraPago, setSelectedCompraPago] = useState<CompraSummary | null>(null);

  // Ordenes state
  const [ordenEstadoFilter, setOrdenEstadoFilter] = useState<string>('todos');
  const [ordenSearch, setOrdenSearch] = useState<string>('');
  const [selectedOrdenSend, setSelectedOrdenSend] = useState<OrdenCompraSummary | null>(null);

  // 1. Fetch Invoices (Facturas de Compra)
  const {
    data: compras = [],
    isLoading: loadingCompras,
    refetch: refetchCompras,
  } = useQuery<CompraSummary[]>({
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

  // 2. Fetch Purchase Orders (Órdenes de Compra a Proveedores)
  const {
    data: ordenes = [],
    isLoading: loadingOrdenes,
    refetch: refetchOrdenes,
  } = useQuery<OrdenCompraSummary[]>({
    queryKey: ['ordenes-compra', ordenEstadoFilter, ordenSearch],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (ordenEstadoFilter !== 'todos') {
        params.estado = ordenEstadoFilter;
      }
      if (ordenSearch.trim()) {
        params.search = ordenSearch.trim();
      }
      const res = await apiClient.get<OrdenCompraSummary[]>('/orden-compra', params);
      return res.data || [];
    },
  });

  // Invoices KPIs
  const totalFacturas = compras.length;
  const pendientesAprobacion = compras.filter((c) => c.estado === 'pendiente').length;
  const saldoPorPagar = compras.reduce((acc, c) => {
    const pending =
      c.saldo_pendiente !== undefined
        ? Number(c.saldo_pendiente)
        : Number(c.total) - Number(c.monto_pagado || 0);
    return acc + (pending > 0 ? pending : 0);
  }, 0);

  // Purchase Orders KPIs
  const totalOrdenes = ordenes.length;
  const ordenesEnviadas = ordenes.filter(
    (o) => o.estado === PurchaseOrderStatus.ENVIADA || o.estado === PurchaseOrderStatus.CONFIRMADA,
  ).length;
  const totalUnidadesOrdenes = ordenes.reduce(
    (acc, o) => acc + (o.detalles || []).reduce((dAcc, d) => dAcc + (d.cantidad || 0), 0),
    0,
  );

  const formatCurrency = (val: number | string) => {
    return `$${Number(val || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const handleDownloadOrdenPdf = async (orden: OrdenCompraSummary) => {
    try {
      await apiClient.downloadFile(
        `/orden-compra/${orden.id}/pdf`,
        `Orden_Compra_${orden.numero_orden}.pdf`,
      );
    } catch (err: any) {
      alert(`Error descargando PDF: ${err?.message || err}`);
    }
  };

  return (
    <div className="pb-16">
      <Header
        title={
          activeMainTab === 'facturas'
            ? 'Compras & Facturas de Proveedores'
            : 'Órdenes de Compra a Proveedores'
        }
        subtitle={
          activeMainTab === 'facturas'
            ? 'Digitalización con OCR asistido, costeo ponderado y cuentas por pagar'
            : 'Requisiciones y órdenes formales en PDF con membrete oficial, envío por WhatsApp o Correo'
        }
        onRefresh={() => {
          if (activeMainTab === 'facturas') refetchCompras();
          else refetchOrdenes();
        }}
        actionSlot={
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              href="/compras/ordenes/nueva"
              className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm shadow-emerald-600/20 whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden sm:inline">Nueva Orden de Compra</span>
              <span className="sm:hidden">Nueva Orden</span>
            </Link>

            <Link
              href="/compras/nueva"
              className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-xl bg-[#1A5276] hover:bg-[#154360] text-white text-xs font-bold transition shadow-sm shadow-[#1A5276]/20 whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden sm:inline">Cargar Factura (OCR)</span>
              <span className="sm:hidden">Factura OCR</span>
            </Link>
          </div>
        }
      />

      <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        {/* Main Tab Switcher */}
        <div className="flex items-center p-1.5 bg-slate-200/80 rounded-2xl w-full sm:w-fit gap-1 shadow-inner overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveMainTab('facturas')}
            className={`flex items-center justify-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap shrink-0 ${
              activeMainTab === 'facturas'
                ? 'bg-white text-[#1A5276] shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4 text-[#1A5276] shrink-0" />
            <span className="hidden sm:inline">Facturas Registradas & CxP</span>
            <span className="sm:hidden">Facturas & CxP</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {totalFacturas}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab('ordenes')}
            className={`flex items-center justify-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap shrink-0 ${
              activeMainTab === 'ordenes'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Package className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="hidden sm:inline">Órdenes de Compra a Proveedores</span>
            <span className="sm:hidden">Órdenes de Compra</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
              {totalOrdenes}
            </span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: FACTURAS DE COMPRA */}
        {/* ========================================================================= */}
        {activeMainTab === 'facturas' && (
          <div className="space-y-6">
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
                    {loadingCompras ? (
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
        )}

        {/* ========================================================================= */}
        {/* TAB 2: ÓRDENES DE COMPRA A PROVEEDORES */}
        {/* ========================================================================= */}
        {activeMainTab === 'ordenes' && (
          <div className="space-y-6">
            {/* KPI Cards for Purchase Orders */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-emerald-600">
                <span className="text-xs font-semibold text-slate-500 block uppercase tracking-wider">
                  Total Órdenes Emitidas
                </span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-2xl font-bold text-slate-800">{totalOrdenes}</span>
                  <span className="text-xs text-slate-500 font-mono">Solicitudes a proveedores</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-blue-500">
                <span className="text-xs font-semibold text-slate-500 block uppercase tracking-wider">
                  Enviadas / En Gestión
                </span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-2xl font-bold text-blue-600">{ordenesEnviadas}</span>
                  <span className="text-xs text-blue-700/80 font-mono">En espera de despacho</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-indigo-500">
                <span className="text-xs font-semibold text-slate-500 block uppercase tracking-wider">
                  Total Unidades Solicitadas
                </span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-2xl font-bold text-indigo-700 font-mono">
                    {totalUnidadesOrdenes} unds.
                  </span>
                  <span className="text-xs text-indigo-700/80 font-mono">Precios a cotizar por proveedor</span>
                </div>
              </div>
            </div>

            {/* Filter Controls & Search */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <Filter className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-semibold text-slate-700">Estado:</span>
                <div className="flex flex-wrap items-center gap-1.5 ml-2">
                  {[
                    { id: 'todos', label: 'Todas' },
                    { id: 'borrador', label: 'Borrador' },
                    { id: 'enviada', label: 'Enviada' },
                    { id: 'confirmada', label: 'Confirmada' },
                    { id: 'recibida', label: 'Recibida' },
                    { id: 'cancelada', label: 'Cancelada' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setOrdenEstadoFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        ordenEstadoFilter === tab.id
                          ? 'bg-emerald-600 text-white font-bold shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={ordenSearch}
                  onChange={(e) => setOrdenSearch(e.target.value)}
                  placeholder="Buscar orden o proveedor..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Table of Purchase Orders */}
            <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8F9FA] text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-4">Nº Orden</th>
                      <th className="py-3.5 px-4">Proveedor</th>
                      <th className="py-3.5 px-4">Fecha Emisión</th>
                      <th className="py-3.5 px-4 text-center">Artículos Solicitados</th>
                      <th className="py-3.5 px-4 text-center">Canal de Envío</th>
                      <th className="py-3.5 px-4 text-center">Estado</th>
                      <th className="py-3.5 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {loadingOrdenes ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                            <span>Cargando órdenes de compra...</span>
                          </div>
                        </td>
                      </tr>
                    ) : ordenes.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                              <Package className="w-6 h-6 text-emerald-600" />
                            </div>
                            <p className="text-sm font-semibold text-slate-800">
                              No hay órdenes de compra registradas
                            </p>
                            <p className="text-xs text-slate-500 max-w-sm">
                              Crea una orden para enviarle al proveedor el PDF con los repuestos que requieres vía WhatsApp o Correo.
                            </p>
                            <Link
                              href="/compras/ordenes/nueva"
                              className="mt-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-md shadow-emerald-600/20"
                            >
                              + Crear Primera Orden de Compra
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      ordenes.map((orden) => {
                        const totalUnits = (orden.detalles || []).reduce(
                          (acc, d) => acc + (d.cantidad || 0),
                          0,
                        );

                        return (
                          <tr key={orden.id} className="hover:bg-slate-50/70 transition group">
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                                <div>
                                  <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                                    {orden.numero_orden}
                                  </span>
                                  {orden.archivo_pdf_url && (
                                    <button
                                      onClick={() => handleDownloadOrdenPdf(orden)}
                                      className="text-[10px] text-emerald-700 hover:underline flex items-center gap-0.5 mt-0.5 font-semibold"
                                    >
                                      <span>Descargar PDF</span>
                                      <Download className="w-2.5 h-2.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <div>
                                <span className="font-semibold text-slate-800 block">
                                  {orden.proveedor?.nombre || 'Proveedor'}
                                </span>
                                <span className="text-[11px] text-slate-500 font-mono">
                                  RIF: {orden.proveedor?.rif || 'N/A'}
                                </span>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 text-xs text-slate-700 font-mono">
                              {orden.fecha_emision
                                ? new Date(orden.fecha_emision).toLocaleDateString()
                                : 'N/A'}
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                                {orden.detalles?.length || 0} ítems ({totalUnits} unds.)
                              </span>
                            </td>

                            {/* Dispatch status badges */}
                            <td className="py-3.5 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {orden.enviado_whatsapp && (
                                  <span
                                    title={`Enviado a WhatsApp +${orden.enviado_whatsapp_a}`}
                                    className="p-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                  </span>
                                )}
                                {orden.enviado_email && (
                                  <span
                                    title={`Enviado por Email a ${orden.enviado_email_a}`}
                                    className="p-1 rounded-full bg-blue-50 text-blue-600 border border-blue-200"
                                  >
                                    <Mail className="w-3.5 h-3.5" />
                                  </span>
                                )}
                                {!orden.enviado_whatsapp && !orden.enviado_email && (
                                  <span className="text-[10px] text-slate-400 italic">No enviado</span>
                                )}
                              </div>
                            </td>

                            {/* Status badge */}
                            <td className="py-3.5 px-4 text-center">
                              <span
                                className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase border ${
                                  orden.estado === 'borrador'
                                    ? 'bg-slate-100 text-slate-700 border-slate-200'
                                    : orden.estado === 'enviada'
                                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                                      : orden.estado === 'confirmada'
                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                        : orden.estado === 'recibida'
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                          : 'bg-rose-50 text-rose-700 border-rose-200'
                                }`}
                              >
                                {orden.estado}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedOrdenSend(orden)}
                                  className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition"
                                  title="Enviar por WhatsApp o Email"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDownloadOrdenPdf(orden)}
                                  className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition"
                                  title="Descargar archivo PDF"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>

                                <Link
                                  href={`/compras/ordenes/${orden.id}`}
                                  className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold transition flex items-center gap-1"
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
        )}
      </div>

      {/* Modal para Registrar Pago de Factura */}
      <PagoCompraModal
        compra={selectedCompraPago}
        isOpen={!!selectedCompraPago}
        onClose={() => setSelectedCompraPago(null)}
        onSuccess={() => refetchCompras()}
      />

      {/* Modal para Enviar Orden por WhatsApp o Email */}
      <EnviarOrdenModal
        orden={selectedOrdenSend}
        isOpen={!!selectedOrdenSend}
        onClose={() => setSelectedOrdenSend(null)}
        onSuccess={() => refetchOrdenes()}
      />
    </div>
  );
}
