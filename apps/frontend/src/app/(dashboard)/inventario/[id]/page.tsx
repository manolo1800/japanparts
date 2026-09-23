'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { SkuSummary, CompatibilidadSummary, PublicacionSummary, MovimientoStockSummary } from '@japonparts/shared';
import { apiClient } from '../../../../lib/api-client';
import { Header } from '../../../../components/header';
import { AjusteStockModal } from '../../../../components/ajuste-stock-modal';
import { CompatibilidadModal } from '../../../../components/compatibilidad-modal';
import { PublicacionModal } from '../../../../components/publicacion-modal';
import {
  ArrowLeft,
  SlidersHorizontal,
  Car,
  Share2,
  History,
  Info,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  User,
} from 'lucide-react';
import Link from 'next/link';

export default function SkuDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [activeTab, setActiveTab] = useState<'info' | 'compat' | 'pubs' | 'history'>('info');

  // Modales
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isCompatModalOpen, setIsCompatModalOpen] = useState(false);
  const [isPubModalOpen, setIsPubModalOpen] = useState(false);

  // Queries
  const { data: sku, isLoading: isSkuLoading, refetch: refetchSku } = useQuery<SkuSummary>({
    queryKey: ['sku', id],
    queryFn: async () => {
      const res = await apiClient.get<SkuSummary>(`/sku/${id}`);
      return res.data!;
    },
  });

  const { data: compatibilidades, refetch: refetchCompat } = useQuery<CompatibilidadSummary[]>({
    queryKey: ['sku-compat', id],
    queryFn: async () => {
      const res = await apiClient.get<CompatibilidadSummary[]>(`/sku/${id}/compatibilidad`);
      return res.data!;
    },
  });

  const { data: publicaciones, refetch: refetchPubs } = useQuery<PublicacionSummary[]>({
    queryKey: ['sku-pubs', id],
    queryFn: async () => {
      const res = await apiClient.get<PublicacionSummary[]>(`/sku/${id}/publicaciones`);
      return res.data!;
    },
  });

  const { data: movimientos, refetch: refetchMovs } = useQuery<MovimientoStockSummary[]>({
    queryKey: ['sku-movs', id],
    queryFn: async () => {
      const res = await apiClient.get<MovimientoStockSummary[]>(`/sku/${id}/movimientos`);
      return res.data!;
    },
  });

  const handleDeleteCompat = async (compId: string) => {
    if (!confirm('¿Eliminar esta compatibilidad vehicular?')) return;
    try {
      await apiClient.delete(`/sku/${id}/compatibilidad/${compId}`);
      refetchCompat();
      refetchSku();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar');
    }
  };

  const handleDeletePub = async (pubId: string) => {
    if (!confirm('¿Eliminar esta publicación?')) return;
    try {
      await apiClient.delete(`/publicacion/${pubId}`);
      refetchPubs();
      refetchSku();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar');
    }
  };

  if (isSkuLoading || !sku) {
    return (
      <div className="min-h-screen bg-[#080c14] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isCritico = sku.stock_actual <= sku.stock_minimo;
  const isAgotado = sku.stock_actual <= 0;

  return (
    <div className="pb-16">
      <Header
        title={`Ficha de Repuesto: ${sku.sku_interno}`}
        subtitle={`${sku.nombre} — ${sku.marca}`}
        onRefresh={() => {
          refetchSku();
          refetchCompat();
          refetchPubs();
          refetchMovs();
        }}
        showNewSkuBtn={false}
      />

      <div className="p-8 max-w-7xl mx-auto space-y-6">
        {/* Back button and quick actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link
            href="/inventario"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al Inventario</span>
          </Link>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsStockModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold shadow-sm transition"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-rose-400" />
              <span>Ajustar Stock</span>
            </button>

            <button
              onClick={() => setIsCompatModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold shadow-sm transition"
            >
              <Car className="w-3.5 h-3.5 text-rose-400" />
              <span>+ Vehículo</span>
            </button>

            <button
              onClick={() => setIsPubModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/25 transition"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>+ Publicación</span>
            </button>
          </div>
        </div>

        {/* Hero Card with Status */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <span className="font-mono font-black text-xl text-white bg-slate-900 px-3 py-1 rounded-xl border border-slate-700">
                {sku.sku_interno}
              </span>
              <span className="text-sm font-bold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20">
                {sku.marca}
              </span>
              {sku.codigo_fabricante && (
                <span className="text-xs text-slate-400 font-mono">
                  OEM: {sku.codigo_fabricante}
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-white">{sku.nombre}</h2>
            {sku.ubicacion && (
              <p className="text-xs text-slate-400">
                Ubicación almacén: <span className="text-slate-200 font-mono font-semibold">{sku.ubicacion}</span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-6 divide-x divide-slate-800">
            <div className="text-right">
              <span className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider block">
                Stock Actual
              </span>
              <div className="flex items-center gap-2 mt-1 justify-end">
                {isAgotado ? (
                  <span className="text-red-400 font-black text-xl flex items-center gap-1 font-mono">
                    <XCircle className="w-4 h-4" /> 0
                  </span>
                ) : isCritico ? (
                  <span className="text-amber-400 font-black text-xl flex items-center gap-1 font-mono">
                    <AlertTriangle className="w-4 h-4" /> {sku.stock_actual}
                  </span>
                ) : (
                  <span className="text-emerald-400 font-black text-xl flex items-center gap-1 font-mono">
                    <CheckCircle2 className="w-4 h-4" /> {sku.stock_actual}
                  </span>
                )}
                <span className="text-[11px] text-slate-500 font-mono">/ mín {sku.stock_minimo}</span>
              </div>
            </div>

            <div className="pl-6 text-right">
              <span className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider block">
                Precio Base
              </span>
              <span className="text-2xl font-black text-white font-mono block mt-0.5">
                ${Number(sku.precio_base).toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                Costo: ${Number(sku.costo_promedio).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-px">
          {[
            { id: 'info', label: 'Información General', icon: Info, count: null },
            { id: 'compat', label: 'Compatibilidad Vehicular', icon: Car, count: compatibilidades?.length || 0 },
            { id: 'pubs', label: 'Publicaciones Canales', icon: Share2, count: publicaciones?.length || 0 },
            { id: 'history', label: 'Historial de Stock', icon: History, count: movimientos?.length || 0 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition -mb-px ${
                  isActive
                    ? 'border-rose-500 text-rose-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                    isActive ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab 1: Info General */}
        {activeTab === 'info' && (
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Detalles Técnicos
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-800/80">
                  <span className="text-slate-400">SKU Interno:</span>
                  <span className="font-mono font-bold text-white">{sku.sku_interno}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800/80">
                  <span className="text-slate-400">Marca:</span>
                  <span className="text-white font-semibold">{sku.marca}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800/80">
                  <span className="text-slate-400">Código Fabricante:</span>
                  <span className="font-mono text-slate-200">{sku.codigo_fabricante || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800/80">
                  <span className="text-slate-400">Ubicación Almacén:</span>
                  <span className="text-slate-200">{sku.ubicacion || 'Sin asignar'}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Métricas & Descripción
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-800/80">
                  <span className="text-slate-400">Precio Base Venta:</span>
                  <span className="font-mono font-bold text-emerald-400">${Number(sku.precio_base).toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800/80">
                  <span className="text-slate-400">Costo Promedio:</span>
                  <span className="font-mono text-slate-200">${Number(sku.costo_promedio).toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800/80">
                  <span className="text-slate-400">Margen Bruto Unitario:</span>
                  <span className="font-mono text-rose-400 font-bold">
                    ${(Number(sku.precio_base) - Number(sku.costo_promedio)).toFixed(2)}
                  </span>
                </div>
                <div className="pt-2">
                  <span className="text-slate-400 block mb-1">Descripción:</span>
                  <p className="text-slate-300 text-xs bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                    {sku.descripcion || 'Sin descripción registrada para esta pieza.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Compatibilidad Vehicular */}
        {activeTab === 'compat' && (
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div className="text-xs text-slate-300 font-semibold">
                Vehículos compatibles con este repuesto ({compatibilidades?.length || 0})
              </div>
              <button
                onClick={() => setIsCompatModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Vehículo</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Marca Vehículo</th>
                    <th className="py-3 px-4">Modelo</th>
                    <th className="py-3 px-4 text-center">Rango Años</th>
                    <th className="py-3 px-4">Motorización</th>
                    <th className="py-3 px-4">Notas Técnicas</th>
                    <th className="py-3 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {compatibilidades?.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No hay vehículos compatibles registrados aún.
                      </td>
                    </tr>
                  ) : (
                    compatibilidades?.map((comp) => (
                      <tr key={comp.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-bold text-white">{comp.marca_vehiculo}</td>
                        <td className="py-3 px-4 font-semibold text-rose-300">{comp.modelo}</td>
                        <td className="py-3 px-4 text-center font-mono text-slate-300">
                          {comp.anio_desde} — {comp.anio_hasta || 'Presente'}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400">{comp.motor || 'Todos'}</td>
                        <td className="py-3 px-4 text-slate-400 text-[11px] max-w-xs">{comp.notas || '—'}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDeleteCompat(comp.id)}
                            className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Publicaciones Multicanal */}
        {activeTab === 'pubs' && (
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div className="text-xs text-slate-300 font-semibold">
                Publicaciones en Canales de Venta ({publicaciones?.length || 0})
              </div>
              <button
                onClick={() => setIsPubModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nueva Publicación</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Canal</th>
                    <th className="py-3 px-4">Título Publicación</th>
                    <th className="py-3 px-4 text-right">Precio Publicado</th>
                    <th className="py-3 px-4 text-center">Stock Publicado</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {publicaciones?.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No hay publicaciones registradas para este SKU.
                      </td>
                    </tr>
                  ) : (
                    publicaciones?.map((pub) => (
                      <tr key={pub.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded font-mono text-[10px] uppercase font-bold ${
                              pub.canal === 'ml'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : pub.canal === 'whatsapp'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                            }`}
                          >
                            {pub.canal}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-white">{pub.titulo}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-white">
                          ${Number(pub.precio).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-slate-300">
                          {pub.stock_publicado}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300">
                            {pub.estado}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDeletePub(pub.id)}
                            className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Historial de Stock */}
        {activeTab === 'history' && (
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div className="text-xs text-slate-300 font-semibold">
                Trazabilidad y Auditoría de Movimientos ({movimientos?.length || 0})
              </div>
              <button
                onClick={() => setIsStockModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-rose-400" />
                <span>Registrar Ajuste</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Fecha / Hora</th>
                    <th className="py-3 px-4">Tipo Movimiento</th>
                    <th className="py-3 px-4 text-center">Cantidad</th>
                    <th className="py-3 px-4">Referencia</th>
                    <th className="py-3 px-4">Usuario Auditor</th>
                    <th className="py-3 px-4">Notas del Movimiento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {movimientos?.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No hay movimientos registrados para este repuesto.
                      </td>
                    </tr>
                  ) : (
                    movimientos?.map((mov) => {
                      const isEntrada = mov.tipo === 'entrada';
                      const isSalida = mov.tipo === 'salida';

                      return (
                        <tr key={mov.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-500" />
                              <span>{new Date(mov.created_at).toLocaleString()}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded font-mono text-[10px] uppercase font-bold ${
                                isEntrada
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : isSalida
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                    : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                              }`}
                            >
                              {mov.tipo}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold whitespace-nowrap">
                            <span
                              className={
                                isEntrada
                                  ? 'text-emerald-400'
                                  : isSalida
                                    ? 'text-rose-400'
                                    : 'text-sky-400'
                              }
                            >
                              {isEntrada ? `+${mov.cantidad}` : isSalida ? `-${mov.cantidad}` : mov.cantidad}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                            {mov.referencia_tipo || 'Manual'}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-slate-300 text-[11px]">
                            <div className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-slate-500" />
                              <span>{mov.usuario?.nombre || 'Sistema'}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-400 text-[11px]">
                            {mov.notas || '—'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modales */}
      <AjusteStockModal
        sku={sku}
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        onSuccess={() => {
          refetchSku();
          refetchMovs();
        }}
      />

      <CompatibilidadModal
        sku={sku}
        isOpen={isCompatModalOpen}
        onClose={() => setIsCompatModalOpen(false)}
        onSuccess={() => {
          refetchCompat();
          refetchSku();
        }}
      />

      <PublicacionModal
        sku={sku}
        isOpen={isPubModalOpen}
        onClose={() => setIsPubModalOpen(false)}
        onSuccess={() => {
          refetchPubs();
          refetchSku();
        }}
      />
    </div>
  );
}
