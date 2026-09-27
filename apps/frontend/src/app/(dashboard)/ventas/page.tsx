'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  OrdenSummary,
  OrderStatus,
  PaymentStatus,
  Channel,
  calculateOrderFinancials,
  MERCADOLIBRE_COMMISSION_RATE,
} from '@japonparts/shared';
import { apiClient } from '../../../lib/api-client';
import { Header } from '../../../components/header';
import { DetalleOrdenModal } from '../../../components/detalle-orden-modal';
import { OrdenDetailPanel } from '../../../components/orden-detail-panel';
import {
  ReceiptText,
  Plus,
  Search,
  Eye,
  Printer,
  Share2,
  Store,
  MessageSquare,
  Calendar,
  LayoutGrid,
  List,
} from 'lucide-react';

export default function VentasPage() {
  const [estadoFilter, setEstadoFilter] = useState<string>('todos');
  const [canalFilter, setCanalFilter] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedOrdenId, setSelectedOrdenId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'master-detail' | 'table'>('master-detail');
  const [modalOrdenId, setModalOrdenId] = useState<string | null>(null);

  const {
    data: ordenes = [],
    isLoading,
    refetch,
  } = useQuery<OrdenSummary[]>({
    queryKey: ['ordenes', estadoFilter, canalFilter, searchTerm],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (estadoFilter !== 'todos') params.estado = estadoFilter;
      if (canalFilter !== 'todos') params.canal = canalFilter;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const res = await apiClient.get<OrdenSummary[]>('/orden', params);
      return res.data || [];
    },
  });

  // Automatically select first order when list loads or changes
  useEffect(() => {
    if (ordenes.length > 0 && !selectedOrdenId) {
      setSelectedOrdenId(ordenes[0].id);
    } else if (ordenes.length > 0 && selectedOrdenId) {
      const exists = ordenes.some((o) => o.id === selectedOrdenId);
      if (!exists) setSelectedOrdenId(ordenes[0].id);
    }
  }, [ordenes, selectedOrdenId]);

  // Calculate KPIs considering MercadoLibre 12% platform commission
  const totalOrdenes = ordenes.length;
  const pendientesDespacho = ordenes.filter(
    (o) =>
      o.estado === OrderStatus.PENDIENTE ||
      o.estado === OrderStatus.CONFIRMADA ||
      o.estado === OrderStatus.POR_DESPACHAR,
  ).length;
  const despachadas = ordenes.filter(
    (o) => o.estado === OrderStatus.DESPACHADA || o.estado === OrderStatus.CERRADA,
  ).length;

  const ordenesActivas = ordenes.filter((o) => o.estado !== OrderStatus.CANCELADA);
  const totalVendido = ordenesActivas.reduce((acc, o) => acc + (Number(o.total) || 0), 0);

  // Comisiones MercadoLibre (12% por cada venta de ML)
  const totalComisionesML = ordenesActivas
    .filter((o) => o.canal === Channel.ML)
    .reduce((acc, o) => acc + (Number(o.total) * MERCADOLIBRE_COMMISSION_RATE || 0), 0);

  const totalIngresoNeto = totalVendido - totalComisionesML;

  const totalCostoRepuestos = ordenesActivas.reduce((acc, o) => {
    const fin = calculateOrderFinancials(o);
    return acc + fin.costoMercancia;
  }, 0);

  const totalGananciaNeta = totalIngresoNeto - totalCostoRepuestos;
  const margenPromedio = totalVendido > 0 ? (totalGananciaNeta / totalVendido) * 100 : 0;

  const getPdfUrl = (ordenId: string, tipo: string = 'factura') => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    return `${baseUrl}/orden/${ordenId}/pdf?tipo=${tipo}`;
  };

  return (
    <div className="pb-16 min-h-full">
      {/* Top Header */}
      <Header
        title="Órdenes de Venta & Facturación"
        subtitle="Gestión financiera, emisión multicanal y correlativos fiscales (ERP Cloud)"
        onRefresh={() => refetch()}
        actionSlot={
          <div className="flex items-center gap-2.5">
            {/* View Mode Toggle */}
            <div className="hidden sm:flex items-center p-1 rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
              <button
                onClick={() => setViewMode('master-detail')}
                className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                  viewMode === 'master-detail'
                    ? 'bg-[#1A5276] text-white font-bold shadow-sm'
                    : 'text-[#7F8C8D] hover:text-[#2C3E50]'
                }`}
                title="Vista Master-Detail (Split View)"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="text-[11px]">Split View</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                  viewMode === 'table'
                    ? 'bg-[#1A5276] text-white font-bold shadow-sm'
                    : 'text-[#7F8C8D] hover:text-[#2C3E50]'
                }`}
                title="Vista Tabla Completa"
              >
                <List className="w-3.5 h-3.5" />
                <span className="text-[11px]">Tabla</span>
              </button>
            </div>

            <Link
              href="/pos"
              className="erp-btn-primary text-xs"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nueva Venta POS</span>
            </Link>
          </div>
        }
      />

      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        {/* KPI Grid (4 columns of equal width with mini bar charts and stacked avatars) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Facturado with Mini Bar Chart */}
          <div className="erp-card erp-card-hover relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider block">
                  Total Facturado
                </span>
                <span className="w-2 h-2 rounded-full bg-[#1A5276]" />
              </div>
              <div className="mt-2">
                <span className="text-2xl lg:text-[28px] font-bold text-[#2C3E50] font-mono tracking-tight block">
                  ${totalVendido.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-xs text-[#7F8C8D] font-medium block mt-0.5">
                  Ventas activas USD
                </span>
                {totalComisionesML > 0 && (
                  <span className="text-[10px] text-amber-700 font-mono font-semibold block mt-1">
                    Comisiones ML (12%): -${totalComisionesML.toFixed(2)}
                  </span>
                )}
              </div>
            </div>

            {/* Mini Bar Chart (DESING.md) */}
            <div className="mt-5 pt-3 border-t border-[#E2E8F0] flex items-end justify-between">
              <div className="flex items-end gap-1.5 h-8">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-2.5 h-4 bg-slate-200 rounded-t-sm" />
                  <span className="text-[9px] text-[#7F8C8D] font-mono">Jul</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-2.5 h-5 bg-slate-200 rounded-t-sm" />
                  <span className="text-[9px] text-[#7F8C8D] font-mono">Ago</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-2.5 h-7 bg-[#1A5276] rounded-t-sm" />
                  <span className="text-[9px] text-[#1A5276] font-bold font-mono">Sep</span>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-[#1A5276] font-mono">
                +14.2% mes
              </span>
            </div>
          </div>

          {/* Card 2: Pendientes / Por Despachar with Stacked Avatars */}
          <div className="erp-card erp-card-hover flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider block">
                  Por Despachar
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                  Urgente
                </span>
              </div>
              <div className="mt-2">
                <span className="text-2xl lg:text-[28px] font-bold text-amber-600 font-mono tracking-tight block">
                  {pendientesDespacho}
                </span>
                <span className="text-xs text-[#7F8C8D] font-medium block mt-0.5">
                  Requieren atención de bodega
                </span>
              </div>
            </div>

            {/* Stacked Avatars (DESING.md) */}
            <div className="mt-5 pt-3 border-t border-[#E2E8F0] flex items-center justify-between">
              <div className="flex -space-x-2">
                <div className="w-6 h-6 rounded-full bg-[#1A5276] border-2 border-white flex items-center justify-center text-[10px] font-bold text-white">
                  JP
                </div>
                <div className="w-6 h-6 rounded-full bg-slate-600 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white">
                  ML
                </div>
                <div className="w-6 h-6 rounded-full bg-emerald-600 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white">
                  WA
                </div>
              </div>
              <span className="text-[11px] text-[#7F8C8D] font-medium">
                Multicanal activo
              </span>
            </div>
          </div>

          {/* Card 3: Despachadas / Completadas with Mini Bar Chart */}
          <div className="erp-card erp-card-hover flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider block">
                  Despachadas
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Exitosas
                </span>
              </div>
              <div className="mt-2">
                <span className="text-2xl lg:text-[28px] font-bold text-[#2C3E50] font-mono tracking-tight block">
                  {despachadas}
                </span>
                <span className="text-xs text-[#7F8C8D] font-medium block mt-0.5">
                  Entregas completadas
                </span>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-[#E2E8F0] flex items-end justify-between">
              <div className="flex items-end gap-1.5 h-8">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-2.5 h-3 bg-slate-200 rounded-t-sm" />
                  <span className="text-[9px] text-[#7F8C8D] font-mono">Jul</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-2.5 h-5 bg-slate-200 rounded-t-sm" />
                  <span className="text-[9px] text-[#7F8C8D] font-mono">Ago</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-2.5 h-6 bg-[#1A5276] rounded-t-sm" />
                  <span className="text-[9px] text-[#1A5276] font-bold font-mono">Sep</span>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-[#2C3E50] font-mono">
                {totalOrdenes > 0 ? `${Math.round((despachadas / totalOrdenes) * 100)}%` : '100%'} ratio
              </span>
            </div>
          </div>

          {/* Card 4: Ganancia Neta Real (Post-Comisiones ML & Costo Repuestos) */}
          <div className="erp-card erp-card-hover flex flex-col justify-between border-l-4 border-l-emerald-600">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider block">
                  Ganancia Neta Real
                </span>
                <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                  {margenPromedio.toFixed(1)}% margen
                </span>
              </div>
              <div className="mt-2">
                <span className="text-2xl lg:text-[28px] font-bold text-emerald-700 font-mono tracking-tight block">
                  ${totalGananciaNeta.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-xs text-[#7F8C8D] font-medium block mt-0.5">
                  Post-comisión ML (12%) y costos
                </span>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-[11px] font-mono">
              <span className="text-amber-700">ML 12%: -${totalComisionesML.toFixed(2)}</span>
              <span className="text-[#7F8C8D]">Costos: -${totalCostoRepuestos.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Filter Bar (Horizontal row with tabs, date selectors, and local search) */}
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
          {/* Status Tabs (Pill shape adhering to DESING.md) */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-full bg-[#F8F9FA] border border-[#E2E8F0] w-full xl:w-auto overflow-x-auto">
            {[
              { id: 'todos', label: 'Todas' },
              { id: OrderStatus.PENDIENTE, label: 'Pendientes' },
              { id: OrderStatus.CONFIRMADA, label: 'Confirmadas' },
              { id: OrderStatus.POR_DESPACHAR, label: 'Por Despachar' },
              { id: OrderStatus.DESPACHADA, label: 'Despachadas' },
              { id: OrderStatus.CANCELADA, label: 'Canceladas' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setEstadoFilter(tab.id)}
                className={`erp-tab whitespace-nowrap ${
                  estadoFilter === tab.id ? 'erp-tab-active' : 'erp-tab-inactive'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Date Selector, Channel Filter, and Search Bar */}
          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            {/* Date Pill Selector */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-xs text-[#7F8C8D]">
              <Calendar className="w-3.5 h-3.5 text-[#1A5276]" />
              <span className="text-[#2C3E50] font-medium">Mes Actual (2026)</span>
            </div>

            {/* Channel Selector */}
            <select
              value={canalFilter}
              onChange={(e) => setCanalFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-xs font-medium text-[#2C3E50] focus:outline-none focus:border-[#1A5276] transition"
            >
              <option value="todos">Todos los Canales</option>
              <option value="mostrador">Mostrador (Tienda)</option>
              <option value="ml">MercadoLibre</option>
              <option value="whatsapp">WhatsApp</option>
            </select>

            {/* Local Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#7F8C8D]" />
              <input
                type="text"
                placeholder="Buscar por N° orden o cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-xs text-[#2C3E50] placeholder-[#7F8C8D] focus:outline-none focus:border-[#1A5276] transition"
              />
            </div>
          </div>
        </div>

        {/* Master-Detail Split View (DESING.md Section 4 & 5) */}
        {viewMode === 'master-detail' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Panel (List: ~40% width / 5 cols) */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between px-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#7F8C8D]">
                  Lista de Órdenes ({ordenes.length})
                </span>
                <span className="text-[11px] text-[#7F8C8D]">
                  Selecciona para ver detalle
                </span>
              </div>

              <div className="space-y-2.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                {isLoading ? (
                  <div className="py-20 text-center bg-white rounded-2xl border border-[#E2E8F0] shadow-sm">
                    <div className="w-8 h-8 border-3 border-[#1A5276] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span className="text-xs text-[#7F8C8D] font-medium">Cargando órdenes...</span>
                  </div>
                ) : ordenes.length === 0 ? (
                  <div className="py-16 text-center bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
                    <ReceiptText className="w-8 h-8 mx-auto text-[#7F8C8D] mb-2" />
                    <p className="text-sm font-semibold text-[#2C3E50]">
                      Sin órdenes con los filtros actuales
                    </p>
                    <p className="text-xs text-[#7F8C8D] mt-1">
                      Emite una venta desde el POS para verla reflejada aquí.
                    </p>
                  </div>
                ) : (
                  ordenes.map((orden) => {
                    const isSelected = selectedOrdenId === orden.id;
                    const isPaid = orden.estado_pago === PaymentStatus.CONFIRMADO;

                    return (
                      <div
                        key={orden.id}
                        onClick={() => setSelectedOrdenId(orden.id)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 select-none ${
                          isSelected
                            ? 'bg-[#1A5276]/5 border-[#1A5276] border-l-4 shadow-md'
                            : 'bg-white border-[#E2E8F0] hover:bg-[#F8F9FA] hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          {/* Client Avatar & Order Info */}
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#1A5276]/10 border border-[#1A5276]/20 flex items-center justify-center font-bold text-xs text-[#1A5276] shrink-0">
                              {orden.cliente?.nombre ? orden.cliente.nombre.charAt(0).toUpperCase() : 'C'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-[#2C3E50] text-xs">
                                  {orden.numero_orden}
                                </span>
                                <span
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase ${
                                    orden.canal === 'mostrador'
                                      ? 'bg-amber-500/10 text-amber-700 border border-amber-500/20'
                                      : orden.canal === 'ml'
                                        ? 'bg-yellow-500/10 text-yellow-800 border border-yellow-500/20'
                                        : 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20'
                                  }`}
                                >
                                  {orden.canal === 'mostrador' && <Store className="w-2.5 h-2.5" />}
                                  {orden.canal === 'ml' && <Share2 className="w-2.5 h-2.5" />}
                                  {orden.canal === 'whatsapp' && <MessageSquare className="w-2.5 h-2.5" />}
                                  <span>{orden.canal}</span>
                                </span>
                              </div>
                              <p className="text-xs font-semibold text-[#2C3E50] mt-0.5 truncate max-w-[170px]">
                                {orden.cliente?.nombre || 'Cliente Mostrador'}
                              </p>
                            </div>
                          </div>

                          {/* Right Aligned Amount & Status */}
                          <div className="text-right">
                            <span className="font-mono font-bold text-sm text-[#2C3E50] block">
                              ${Number(orden.total).toFixed(2)}
                            </span>
                            {orden.canal === 'ml' && (
                              <span className="text-[10px] text-amber-700 font-mono font-semibold block">
                                ML 12%: -${(Number(orden.total) * MERCADOLIBRE_COMMISSION_RATE).toFixed(2)}
                              </span>
                            )}
                            <span
                              className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full uppercase mt-1 ${
                                isPaid
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-[#7F8C8D] border border-slate-200'
                              }`}
                            >
                              {orden.estado_pago === PaymentStatus.CONFIRMADO ? 'Pagado' : 'Pendiente'}
                            </span>
                          </div>
                        </div>

                        {/* Card Sub-row (Date & Delivery) */}
                        <div className="mt-3 pt-2 border-t border-[#E2E8F0] flex items-center justify-between text-[11px] text-[#7F8C8D]">
                          <span className="font-mono">
                            {new Date(orden.fecha || orden.created_at).toLocaleDateString('es-VE', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                          <span className="capitalize text-[#2C3E50] text-[10px]">
                            {orden.tipo_entrega}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Panel (Detail: ~60% width / 7 cols) */}
            <div className="lg:col-span-7 sticky top-20">
              <OrdenDetailPanel
                ordenId={selectedOrdenId}
                onUpdated={() => refetch()}
              />
            </div>
          </div>
        ) : (
          /* Table View Alternative */
          <div className="bg-white rounded-2xl overflow-hidden border border-[#E2E8F0] shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8F9FA] text-[#7F8C8D] uppercase font-mono text-[10px] tracking-wider border-b border-[#E2E8F0]">
                  <tr>
                    <th className="px-5 py-4">N° Orden</th>
                    <th className="px-5 py-4">Fecha</th>
                    <th className="px-5 py-4">Canal</th>
                    <th className="px-5 py-4">Cliente</th>
                    <th className="px-5 py-4">Entrega</th>
                    <th className="px-5 py-4">Pago</th>
                    <th className="px-5 py-4">Estado</th>
                    <th className="px-5 py-4 text-right">Total ($ USD)</th>
                    <th className="px-5 py-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {isLoading ? (
                    <tr>
                      <td colSpan={9} className="py-20 text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="w-8 h-8 border-3 border-[#1A5276] border-t-transparent rounded-full animate-spin" />
                          <span className="text-xs text-[#7F8C8D] font-medium">Cargando órdenes de venta...</span>
                        </div>
                      </td>
                    </tr>
                  ) : ordenes.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center text-[#7F8C8D]">
                        <ReceiptText className="w-8 h-8 mx-auto text-[#7F8C8D] mb-2" />
                        <p className="text-sm font-semibold text-[#2C3E50]">
                          No hay órdenes registradas con los filtros seleccionados
                        </p>
                      </td>
                    </tr>
                  ) : (
                    ordenes.map((orden) => (
                      <tr
                        key={orden.id}
                        onClick={() => {
                          setSelectedOrdenId(orden.id);
                          setViewMode('master-detail');
                        }}
                        className="hover:bg-[#F8F9FA] cursor-pointer transition group"
                      >
                        {/* N° Orden */}
                        <td className="px-5 py-4 font-mono font-bold text-[#1A5276]">
                          {orden.numero_orden}
                        </td>

                        {/* Fecha */}
                        <td className="px-5 py-4 text-[#7F8C8D] font-mono text-[11px]">
                          {new Date(orden.fecha || orden.created_at).toLocaleDateString('es-VE', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>

                        {/* Canal */}
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                              orden.canal === 'mostrador'
                                ? 'bg-amber-500/10 text-amber-700 border border-amber-500/20'
                                : orden.canal === 'ml'
                                  ? 'bg-yellow-500/10 text-yellow-800 border border-yellow-500/20'
                                  : 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20'
                            }`}
                          >
                            {orden.canal === 'mostrador' && <Store className="w-3 h-3" />}
                            {orden.canal === 'ml' && <Share2 className="w-3 h-3" />}
                            {orden.canal === 'whatsapp' && <MessageSquare className="w-3 h-3" />}
                            <span>{orden.canal}</span>
                          </span>
                        </td>

                        {/* Cliente */}
                        <td className="px-5 py-4">
                          <span className="font-semibold text-[#2C3E50] block">
                            {orden.cliente?.nombre || 'Cliente Mostrador'}
                          </span>
                          {orden.cliente?.telefono && (
                            <span className="text-[10px] text-[#7F8C8D] font-mono block">
                              {orden.cliente.telefono}
                            </span>
                          )}
                        </td>

                        {/* Entrega */}
                        <td className="px-5 py-4 capitalize text-[#2C3E50] text-[11px]">
                          {orden.tipo_entrega}
                        </td>

                        {/* Pago */}
                        <td className="px-5 py-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              orden.estado_pago === PaymentStatus.CONFIRMADO
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-[#7F8C8D] border border-slate-200'
                            }`}
                          >
                            {orden.estado_pago}
                          </span>
                        </td>

                        {/* Estado */}
                        <td className="px-5 py-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              orden.estado === OrderStatus.DESPACHADA || orden.estado === OrderStatus.CERRADA
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : orden.estado === OrderStatus.CANCELADA
                                  ? 'bg-red-500/20 text-red-600 border border-red-500/30'
                                  : 'bg-slate-100 text-[#2C3E50] border border-slate-200'
                            }`}
                          >
                            {orden.estado.replace('_', ' ')}
                          </span>
                        </td>

                        {/* Total & Comisión */}
                        <td className="px-5 py-4 text-right">
                          <span className="font-mono font-bold text-[#2C3E50] text-sm block">
                            ${Number(orden.total).toFixed(2)}
                          </span>
                          {orden.canal === 'ml' ? (
                            <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 inline-block mt-0.5">
                              ML (12%): -${(Number(orden.total) * MERCADOLIBRE_COMMISSION_RATE).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-emerald-700 block mt-0.5">
                              Neto (0% com.)
                            </span>
                          )}
                        </td>

                        {/* Acciones */}
                        <td className="px-5 py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => setModalOrdenId(orden.id)}
                              title="Ver Detalle en Modal"
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#7F8C8D] hover:text-[#2C3E50] border border-slate-200 transition"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            <a
                              href={getPdfUrl(orden.id, 'factura')}
                              target="_blank"
                              rel="noreferrer"
                              title="Imprimir / Ver Factura PDF"
                              className="p-1.5 rounded-lg bg-[#1A5276]/10 hover:bg-[#1A5276]/20 text-[#1A5276] border border-[#1A5276]/30 transition"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Detalle Orden Modal (Alternative floating modal view) */}
      {modalOrdenId && (
        <DetalleOrdenModal
          ordenId={modalOrdenId}
          onClose={() => setModalOrdenId(null)}
          onUpdated={() => refetch()}
        />
      )}
    </div>
  );
}

