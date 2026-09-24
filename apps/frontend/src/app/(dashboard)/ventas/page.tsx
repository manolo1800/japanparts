'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  OrdenSummary,
  OrderStatus,
  PaymentStatus,
} from '@japonparts/shared';
import { apiClient } from '../../../lib/api-client';
import { Header } from '../../../components/header';
import { DetalleOrdenModal } from '../../../components/detalle-orden-modal';
import {
  ReceiptText,
  Plus,
  Search,
  Eye,
  Printer,
  Share2,
  Store,
  MessageSquare,
} from 'lucide-react';


export default function VentasPage() {
  const [estadoFilter, setEstadoFilter] = useState<string>('todos');
  const [canalFilter, setCanalFilter] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedOrdenId, setSelectedOrdenId] = useState<string | null>(null);

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

  // Calculate KPIs
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
  const totalVendido = ordenes
    .filter((o) => o.estado !== OrderStatus.CANCELADA)
    .reduce((acc, o) => acc + (Number(o.total) || 0), 0);

  const getPdfUrl = (ordenId: string, tipo: string = 'factura') => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    return `${baseUrl}/orden/${ordenId}/pdf?tipo=${tipo}`;
  };

  return (
    <div className="pb-16 min-h-screen">
      <Header
        title="Órdenes de Venta & Documentos"
        subtitle="Control centralizado multicanal de ventas por mostrador, MercadoLibre y WhatsApp con facturación correlativa"
        onRefresh={() => refetch()}
        actionSlot={
          <Link
            href="/pos"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white text-xs font-bold transition shadow-lg shadow-rose-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nueva Venta POS</span>
          </Link>
        }
      />

      <div className="p-8 max-w-7xl mx-auto space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card p-5 rounded-2xl">
            <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">
              Total Órdenes
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-white">{totalOrdenes}</span>
              <span className="text-xs text-slate-400 font-mono">En sistema</span>
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl border-l-4 border-l-amber-500">
            <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">
              Pendientes / Por Despachar
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-amber-400">{pendientesDespacho}</span>
              <span className="text-xs text-amber-500/80 font-mono">Requieren atención</span>
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl border-l-4 border-l-emerald-500">
            <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">
              Despachadas / Entregadas
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-emerald-400">{despachadas}</span>
              <span className="text-xs text-emerald-500/80 font-mono">Completadas</span>
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl border-l-4 border-l-rose-500">
            <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">
              Total Facturado (Activas)
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-rose-400 font-mono">
                ${totalVendido.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-rose-400/80 font-mono">USD</span>
            </div>
          </div>
        </div>

        {/* Filters Toolbar */}
        <div className="glass-card p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex flex-wrap gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 w-full md:w-auto">
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
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  estadoFilter === tab.id
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Channel Filter & Search Input */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={canalFilter}
              onChange={(e) => setCanalFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 focus:outline-none focus:border-rose-500"
            >
              <option value="todos">Todos los Canales</option>
              <option value="mostrador">Mostrador (Tienda)</option>
              <option value="ml">MercadoLibre</option>
              <option value="whatsapp">WhatsApp</option>
            </select>

            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar por N° orden o cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="glass-card rounded-2xl overflow-hidden border border-slate-800/80">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">N° Orden</th>
                  <th className="px-5 py-3.5">Fecha</th>
                  <th className="px-5 py-3.5">Canal</th>
                  <th className="px-5 py-3.5">Cliente</th>
                  <th className="px-5 py-3.5">Entrega</th>
                  <th className="px-5 py-3.5">Pago</th>
                  <th className="px-5 py-3.5">Estado</th>
                  <th className="px-5 py-3.5 text-right">Total ($ USD)</th>
                  <th className="px-5 py-3.5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-8 h-8 border-3 border-rose-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs text-slate-400 font-mono">Cargando órdenes de venta...</span>
                      </div>
                    </td>
                  </tr>
                ) : ordenes.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center text-slate-400">
                      <ReceiptText className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                      <p className="text-sm font-semibold text-slate-300">
                        No hay órdenes registradas con los filtros seleccionados
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Use el Punto de Venta (POS) para emitir una nueva orden
                      </p>
                    </td>
                  </tr>
                ) : (
                  ordenes.map((orden) => (
                    <tr
                      key={orden.id}
                      className="hover:bg-slate-900/40 transition group"
                    >
                      {/* N° Orden */}
                      <td className="px-5 py-4 font-mono font-bold text-rose-400">
                        {orden.numero_orden}
                      </td>

                      {/* Fecha */}
                      <td className="px-5 py-4 text-slate-400 font-mono text-[11px]">
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
                              ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                              : orden.canal === 'ml'
                                ? 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/20'
                                : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
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
                        <span className="font-semibold text-white block">
                          {orden.cliente?.nombre || 'Cliente Mostrador'}
                        </span>
                        {orden.cliente?.telefono && (
                          <span className="text-[10px] text-slate-500 font-mono block">
                            {orden.cliente.telefono}
                          </span>
                        )}
                      </td>

                      {/* Entrega */}
                      <td className="px-5 py-4 capitalize text-slate-300 text-[11px]">
                        {orden.tipo_entrega}
                      </td>

                      {/* Pago */}
                      <td className="px-5 py-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            orden.estado_pago === PaymentStatus.CONFIRMADO
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
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
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : orden.estado === OrderStatus.CANCELADA
                                ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                : orden.estado === OrderStatus.CONFIRMADA || orden.estado === OrderStatus.POR_DESPACHAR
                                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {orden.estado.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Total */}
                      <td className="px-5 py-4 text-right font-mono font-bold text-white text-sm">
                        ${Number(orden.total).toFixed(2)}
                      </td>

                      {/* Acciones */}
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedOrdenId(orden.id)}
                            title="Ver Detalle de Orden"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <a
                            href={getPdfUrl(orden.id, 'factura')}
                            target="_blank"
                            rel="noreferrer"
                            title="Imprimir / Ver Factura PDF"
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition"
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
      </div>

      {/* Detalle Orden Modal */}
      {selectedOrdenId && (
        <DetalleOrdenModal
          ordenId={selectedOrdenId}
          onClose={() => setSelectedOrdenId(null)}
          onUpdated={() => refetch()}
        />
      )}
    </div>
  );
}
