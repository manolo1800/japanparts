'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DashboardKpis,
  AlertaItem,
  SistemaHealthSummary,
  Channel,
} from '@japonparts/shared';
import { apiClient } from '../../../lib/api-client';
import { Header } from '../../../components/header';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  MessageSquareText,
  AlertTriangle,
  Download,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  RefreshCw,
  Mail,
  Server,
  Activity,
  UserCheck,
  ChevronRight,
  ExternalLink,
  Store,
  Layers,
  Sparkles,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export default function ReportesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<
    'resumen' | 'skus' | 'vendedores' | 'alertas' | 'sistema'
  >('resumen');
  const [alertaFiltro, setAlertaFiltro] = useState<'todas' | 'critico' | 'advertencia'>('todas');
  const [exporting, setExporting] = useState<string | null>(null);

  // Queries
  const {
    data: kpisRes,
    isLoading: loadingKpis,
    refetch: refetchKpis,
  } = useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: async () => {
      const res = await apiClient.get<DashboardKpis>('/reporte/dashboard');
      return res.data;
    },
    refetchInterval: 30000,
  });

  const {
    data: alertasRes,
    isLoading: loadingAlertas,
    refetch: refetchAlertas,
  } = useQuery({
    queryKey: ['alertas'],
    queryFn: async () => {
      const res = await apiClient.get<AlertaItem[]>('/alerta');
      return res.data;
    },
    refetchInterval: 15000,
  });

  const {
    data: sistemaRes,
    isLoading: loadingSistema,
    refetch: refetchSistema,
  } = useQuery({
    queryKey: ['sistema-health'],
    queryFn: async () => {
      const res = await apiClient.get<SistemaHealthSummary>('/reporte/sistema');
      return res.data;
    },
    refetchInterval: 30000,
  });

  // Mutación para enviar correo de alerta de stock
  const emailAlertMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<any>('/alerta/enviar-stock-email');
      return res.data;
    },
  });

  const handleExportar = async (tipo: 'ventas' | 'skus' | 'vendedores' | 'inventario', formato: 'excel' | 'csv') => {
    try {
      setExporting(`${tipo}-${formato}`);
      const endpoint = `/reporte/exportar/${formato}`;
      const defaultName = `reporte_${tipo}_${new Date().toISOString().split('T')[0]}.${formato === 'excel' ? 'xlsx' : 'csv'}`;
      await apiClient.downloadFile(endpoint, defaultName, { tipo });
    } catch (err: any) {
      alert(`Error al exportar: ${err?.message || 'Error desconocido'}`);
    } finally {
      setExporting(null);
    }
  };

  const kpis = kpisRes;
  const alertas = alertasRes || [];
  const sistema = sistemaRes;

  const alertasFiltradas = alertas.filter((a) => {
    if (alertaFiltro === 'todas') return true;
    return a.nivel === alertaFiltro;
  });

  const stockCriticoAlertas = alertas.filter((a) => a.tipo === 'stock_bajo');
  const chatAlertas = alertas.filter((a) => a.tipo === 'whatsapp_sin_atender');

  // Cálculos para gráfico de ventas diarias
  const maxVentaDiaria = Math.max(
    ...(kpis?.ventas_diarias.map((d) => d.total) || [100]),
    100,
  );

  return (
    <div className="pb-20 min-h-full">
      <Header
        title="Dashboard Ejecutivo & Reportes"
        subtitle="Analítica comercial de ventas, margen de contribución, alertas operativas y monitoreo de plataforma"
        onRefresh={() => {
          refetchKpis();
          refetchAlertas();
          refetchSistema();
        }}
      />

      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
        {/* Banner de Alertas Críticas si existen */}
        {stockCriticoAlertas.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-900">
                  {stockCriticoAlertas.length} repuesto(s) en umbral crítico o agotados
                </h4>
                <p className="text-xs text-amber-700/80">
                  Se recomienda revisar las compras pendientes o notificar al proveedor antes de perder ventas.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setActiveTab('alertas')}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition"
              >
                Ver Alertas
              </button>
              <button
                onClick={() => emailAlertMutation.mutate()}
                disabled={emailAlertMutation.isPending}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-amber-300 text-amber-900 hover:bg-amber-50 transition flex items-center gap-1.5"
              >
                <Mail className="w-3.5 h-3.5 text-amber-700" />
                <span>
                  {emailAlertMutation.isPending
                    ? 'Enviando...'
                    : emailAlertMutation.isSuccess
                    ? '¡Enviado!'
                    : 'Enviar Email'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Facturación del Mes */}
          <div className="erp-card erp-card-hover relative overflow-hidden">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider">
                Ventas del Mes
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1A5276] flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-[#2C3E50] font-mono">
                ${kpis?.ventas_mes_actual.total.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
              </span>
              <div className="flex items-center gap-1.5 mt-2 text-xs">
                {kpis && kpis.ventas_mes_actual.comparacion_mes_anterior_pct >= 0 ? (
                  <span className="text-emerald-600 font-bold flex items-center">
                    <TrendingUp className="w-3.5 h-3.5 mr-0.5 inline" />
                    +{kpis.ventas_mes_actual.comparacion_mes_anterior_pct}%
                  </span>
                ) : (
                  <span className="text-rose-600 font-bold">
                    {kpis?.ventas_mes_actual.comparacion_mes_anterior_pct}%
                  </span>
                )}
                <span className="text-[#7F8C8D]">vs mes previo</span>
              </div>
            </div>
          </div>

          {/* Ticket Promedio */}
          <div className="erp-card erp-card-hover">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider">
                Ticket Promedio
              </span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                <ShoppingCart className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-[#2C3E50] font-mono">
                ${kpis?.ticket_promedio.toFixed(2) || '0.00'}
              </span>
              <p className="text-xs text-[#7F8C8D] mt-2">
                {kpis?.ventas_mes_actual.ordenes || 0} órdenes este mes
              </p>
            </div>
          </div>

          {/* Conversión Bot WhatsApp */}
          <div className="erp-card erp-card-hover">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider">
                Conversión Bot AI
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <MessageSquareText className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-emerald-700 font-mono">
                {kpis?.tasa_conversion_bot.conversion_pct.toFixed(1) || '0.0'}%
              </span>
              <p className="text-xs text-[#7F8C8D] mt-2">
                {kpis?.tasa_conversion_bot.ordenes_whatsapp || 0} ventas / {kpis?.tasa_conversion_bot.total_conversaciones || 0} chats
              </p>
            </div>
          </div>

          {/* Stock Crítico */}
          <div
            onClick={() => setActiveTab('alertas')}
            className="erp-card erp-card-hover cursor-pointer border-amber-200/80 bg-gradient-to-br from-white to-amber-50/30"
          >
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
                Stock Crítico
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-amber-600 font-mono">
                {kpis?.stock_critico_count || 0}
              </span>
              <p className="text-xs text-amber-700 mt-2 flex items-center gap-1 font-medium">
                <span>Ver lista de repuestos</span>
                <ChevronRight className="w-3.5 h-3.5 inline" />
              </p>
            </div>
          </div>

          {/* Atención Humana Pendiente */}
          <div
            onClick={() => setActiveTab('alertas')}
            className="erp-card erp-card-hover cursor-pointer border-blue-200/80 bg-gradient-to-br from-white to-blue-50/30"
          >
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-[#1A5276] uppercase tracking-wider">
                Chats en Espera
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#1A5276] flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-[#1A5276] font-mono">
                {kpis?.conversaciones_pendientes_humano || 0}
              </span>
              <p className="text-xs text-[#1A5276] mt-2 flex items-center gap-1 font-medium">
                <span>Escalados a asesor</span>
                <ChevronRight className="w-3.5 h-3.5 inline" />
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs & Quick Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveTab('resumen')}
              className={`erp-tab ${
                activeTab === 'resumen' ? 'erp-tab-active' : 'erp-tab-inactive'
              }`}
            >
              Resumen & Tendencias
            </button>
            <button
              onClick={() => setActiveTab('skus')}
              className={`erp-tab ${
                activeTab === 'skus' ? 'erp-tab-active' : 'erp-tab-inactive'
              }`}
            >
              Ranking de Repuestos
            </button>
            <button
              onClick={() => setActiveTab('vendedores')}
              className={`erp-tab ${
                activeTab === 'vendedores' ? 'erp-tab-active' : 'erp-tab-inactive'
              }`}
            >
              Ventas por Vendedor
            </button>
            <button
              onClick={() => setActiveTab('alertas')}
              className={`erp-tab relative ${
                activeTab === 'alertas' ? 'erp-tab-active' : 'erp-tab-inactive'
              }`}
            >
              Alertas Activas
              {alertas.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-bold">
                  {alertas.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('sistema')}
              className={`erp-tab ${
                activeTab === 'sistema' ? 'erp-tab-active' : 'erp-tab-inactive'
              }`}
            >
              Salud del Sistema
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleExportar('ventas', 'excel')}
              disabled={!!exporting}
              className="erp-btn-secondary text-xs font-semibold py-1.5 px-3"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>{exporting === 'ventas-excel' ? 'Exportando...' : 'Exportar Ventas (.xlsx)'}</span>
            </button>
            <button
              onClick={() => handleExportar('inventario', 'excel')}
              disabled={!!exporting}
              className="erp-btn-secondary text-xs font-semibold py-1.5 px-3"
            >
              <Download className="w-4 h-4 text-[#1A5276]" />
              <span>Inventario (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* TAB 1: RESUMEN & TENDENCIAS */}
        {activeTab === 'resumen' && (
          <div className="space-y-6">
            {/* Gráfico de Evolución Diaria */}
            <div className="erp-card">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-base font-bold text-[#2C3E50]">
                    Evolución de Ventas Diarias (Últimos 30 días)
                  </h3>
                  <p className="text-xs text-[#7F8C8D]">
                    Ingresos facturados por día de todas las órdenes confirmadas
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-medium">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-[#1A5276]" />
                    <span className="text-[#2C3E50]">Ingresos ($)</span>
                  </div>
                </div>
              </div>

              {/* Contenedor del Gráfico SVG Responsivo */}
              <div className="w-full overflow-x-auto pt-6 pb-2">
                <div className="min-w-[650px] h-64 flex items-end gap-2 px-2 border-b border-[#E2E8F0] relative">
                  {/* Líneas guía de fondo */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-40">
                    <div className="border-b border-dashed border-[#CBD5E1] w-full" />
                    <div className="border-b border-dashed border-[#CBD5E1] w-full" />
                    <div className="border-b border-dashed border-[#CBD5E1] w-full" />
                  </div>

                  {kpis?.ventas_diarias.map((d, idx) => {
                    const heightPct = Math.max(
                      (d.total / maxVentaDiaria) * 100,
                      d.total > 0 ? 4 : 1,
                    );
                    const isToday = idx === (kpis.ventas_diarias.length - 1);

                    return (
                      <div
                        key={d.fecha}
                        className="flex-1 flex flex-col items-center group relative h-full justify-end"
                      >
                        {/* Tooltip on hover */}
                        <div className="absolute -top-12 z-20 hidden group-hover:flex flex-col items-center bg-[#0D2232] text-white text-[10px] px-2.5 py-1 rounded-lg shadow-lg pointer-events-none whitespace-nowrap">
                          <span className="font-bold font-mono">${d.total.toFixed(2)}</span>
                          <span className="text-white/70">{d.ordenes} orden(es)</span>
                          <span className="text-white/50">{d.fecha}</span>
                        </div>

                        {/* Barra */}
                        <div
                          style={{ height: `${heightPct}%` }}
                          className={`w-full max-w-[20px] rounded-t-md transition-all duration-300 group-hover:brightness-110 ${
                            isToday
                              ? 'bg-emerald-500'
                              : d.total > 0
                              ? 'bg-[#1A5276]'
                              : 'bg-slate-200'
                          }`}
                        />

                        {/* Etiqueta de fecha */}
                        <span className="text-[9px] text-[#7F8C8D] mt-2 block font-mono">
                          {d.fecha.split('-')[2]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Distribución por Canal */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {kpis?.canales.map((canal) => {
                const isWhatsapp = canal.canal === Channel.WHATSAPP;
                const isMostrador = canal.canal === Channel.MOSTRADOR;

                return (
                  <div key={canal.canal} className="erp-card erp-card-hover space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                            isWhatsapp
                              ? 'bg-emerald-50 text-emerald-600'
                              : isMostrador
                              ? 'bg-blue-50 text-[#1A5276]'
                              : 'bg-yellow-50 text-amber-600'
                          }`}
                        >
                          {isWhatsapp ? (
                            <MessageSquareText className="w-5 h-5" />
                          ) : isMostrador ? (
                            <Store className="w-5 h-5" />
                          ) : (
                            <Layers className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-[#2C3E50] capitalize">
                            Canal {canal.canal}
                          </h4>
                          <span className="text-xs text-[#7F8C8D]">
                            {canal.cantidad_ordenes} órdenes concretadas
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-[#2C3E50] bg-[#F8F9FA] px-2 py-1 rounded-lg font-mono">
                        {canal.porcentaje_total}%
                      </span>
                    </div>

                    <div>
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="text-xs text-[#7F8C8D]">Facturado</span>
                        <span className="text-lg font-bold text-[#2C3E50] font-mono">
                          ${canal.total_ventas.toFixed(2)}
                        </span>
                      </div>
                      {/* Barra de progreso */}
                      <div className="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${canal.porcentaje_total}%` }}
                          className={`h-full rounded-full ${
                            isWhatsapp
                              ? 'bg-emerald-500'
                              : isMostrador
                              ? 'bg-[#1A5276]'
                              : 'bg-amber-500'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#E2E8F0] flex justify-between text-xs text-[#7F8C8D]">
                      <span>Ticket Promedio:</span>
                      <span className="font-semibold text-[#2C3E50] font-mono">
                        ${canal.ticket_promedio.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: TOP SKUs */}
        {activeTab === 'skus' && (
          <div className="erp-card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-[#2C3E50]">
                  Ranking de Repuestos Más Vendidos & Margen Bruto
                </h3>
                <p className="text-xs text-[#7F8C8D]">
                  Margen de contribución real calculado sobre costo promedio ponderado de compra
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExportar('skus', 'excel')}
                  disabled={!!exporting}
                  className="erp-btn-secondary text-xs font-semibold py-1.5 px-3"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Excel (.xlsx)</span>
                </button>
                <button
                  onClick={() => handleExportar('skus', 'csv')}
                  disabled={!!exporting}
                  className="erp-btn-secondary text-xs font-semibold py-1.5 px-3"
                >
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>CSV</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto border border-[#E2E8F0] rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F8F9FA] text-[#7F8C8D] font-bold border-b border-[#E2E8F0]">
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Código SKU</th>
                    <th className="py-3 px-4">Descripción Repuesto</th>
                    <th className="py-3 px-4">Marca</th>
                    <th className="py-3 px-4 text-center">Unidades</th>
                    <th className="py-3 px-4 text-right">Ingresos</th>
                    <th className="py-3 px-4 text-right">Costo Total</th>
                    <th className="py-3 px-4 text-right">Margen Bruto</th>
                    <th className="py-3 px-4 text-center">Rentabilidad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {kpis?.top_skus && kpis.top_skus.length > 0 ? (
                    kpis.top_skus.map((sku, idx) => {
                      const isHighMargin = sku.porcentaje_margen >= 40;
                      const isMediumMargin = sku.porcentaje_margen >= 25 && sku.porcentaje_margen < 40;

                      return (
                        <tr key={sku.sku_id} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-4 text-[#7F8C8D] font-mono">{idx + 1}</td>
                          <td className="py-3 px-4 font-bold text-[#1A5276] font-mono">
                            <Link
                              href={`/inventario?q=${encodeURIComponent(sku.sku_interno)}`}
                              className="hover:underline flex items-center gap-1"
                            >
                              <span>{sku.sku_interno}</span>
                              <ExternalLink className="w-3 h-3 text-[#7F8C8D]" />
                            </Link>
                          </td>
                          <td className="py-3 px-4 font-medium text-[#2C3E50]">{sku.nombre}</td>
                          <td className="py-3 px-4 text-[#7F8C8D]">{sku.marca}</td>
                          <td className="py-3 px-4 text-center font-bold text-[#2C3E50] font-mono">
                            {sku.cantidad_vendida}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-[#2C3E50] font-mono">
                            ${sku.ingresos_totales.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right text-[#7F8C8D] font-mono">
                            ${sku.costo_total.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-700 font-mono">
                            +${sku.margen_ganancia.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-bold font-mono ${
                                isHighMargin
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isMediumMargin
                                  ? 'bg-blue-100 text-[#1A5276]'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {sku.porcentaje_margen}%
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-[#7F8C8D]">
                        No se registran ventas para calcular el ranking de SKUs aún.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: VENDEDORES */}
        {activeTab === 'vendedores' && (
          <div className="erp-card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-[#2C3E50]">
                  Rendimiento de Ventas & Comisiones por Asesor
                </h3>
                <p className="text-xs text-[#7F8C8D]">
                  Cálculo de comisiones del 3% sobre el total neto de órdenes concretadas
                </p>
              </div>

              <button
                onClick={() => handleExportar('vendedores', 'excel')}
                disabled={!!exporting}
                className="erp-btn-secondary text-xs font-semibold py-1.5 px-3"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Exportar Comisiones (.xlsx)</span>
              </button>
            </div>

            <div className="overflow-x-auto border border-[#E2E8F0] rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F8F9FA] text-[#7F8C8D] font-bold border-b border-[#E2E8F0]">
                    <th className="py-3 px-4">Asesor Comercial</th>
                    <th className="py-3 px-4 text-center">Órdenes Concretadas</th>
                    <th className="py-3 px-4 text-right">Ventas Totales</th>
                    <th className="py-3 px-4 text-right">Ticket Promedio</th>
                    <th className="py-3 px-4 text-right">Comisión Estimada (3%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {kpis?.vendedores && kpis.vendedores.length > 0 ? (
                    kpis.vendedores.map((v) => (
                      <tr key={v.vendedor_id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-bold text-[#2C3E50] flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-[#1A5276] flex items-center justify-center font-bold text-xs">
                            {v.vendedor_nombre.charAt(0).toUpperCase()}
                          </div>
                          <span>{v.vendedor_nombre}</span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-[#2C3E50] font-mono">
                          {v.cantidad_ordenes}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-[#1A5276] font-mono text-sm">
                          ${v.total_ventas.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right text-[#7F8C8D] font-mono">
                          ${v.ticket_promedio.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-700 font-mono">
                          +${v.comision_estimada.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-[#7F8C8D]">
                        No hay registros de ventas asignadas a vendedores.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: ALERTAS ACTIVAS */}
        {activeTab === 'alertas' && (
          <div className="erp-card space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-[#2C3E50]">
                  Centro de Alertas & Notificaciones Operativas
                </h3>
                <p className="text-xs text-[#7F8C8D]">
                  Monitoreo de stock de seguridad, clientes en espera y pagos pendientes
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => emailAlertMutation.mutate()}
                  disabled={emailAlertMutation.isPending}
                  className="erp-btn-primary text-xs font-semibold py-1.5 px-3"
                >
                  <Mail className="w-4 h-4" />
                  <span>
                    {emailAlertMutation.isPending
                      ? 'Enviando Alerta...'
                      : 'Enviar Resumen por Correo'}
                  </span>
                </button>
              </div>
            </div>

            {/* Filtros de nivel */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAlertaFiltro('todas')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                  alertaFiltro === 'todas'
                    ? 'bg-[#1A5276] text-white'
                    : 'bg-[#F8F9FA] text-[#7F8C8D] border border-[#E2E8F0]'
                }`}
              >
                Todas ({alertas.length})
              </button>
              <button
                onClick={() => setAlertaFiltro('critico')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                  alertaFiltro === 'critico'
                    ? 'bg-red-600 text-white'
                    : 'bg-[#F8F9FA] text-[#7F8C8D] border border-[#E2E8F0]'
                }`}
              >
                Críticas ({alertas.filter((a) => a.nivel === 'critico').length})
              </button>
              <button
                onClick={() => setAlertaFiltro('advertencia')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                  alertaFiltro === 'advertencia'
                    ? 'bg-amber-600 text-white'
                    : 'bg-[#F8F9FA] text-[#7F8C8D] border border-[#E2E8F0]'
                }`}
              >
                Advertencias ({alertas.filter((a) => a.nivel === 'advertencia').length})
              </button>
            </div>

            {/* Lista de alertas */}
            <div className="space-y-3">
              {alertasFiltradas.length > 0 ? (
                alertasFiltradas.map((alerta) => {
                  const isCritico = alerta.nivel === 'critico';
                  const isAdvertencia = alerta.nivel === 'advertencia';

                  return (
                    <div
                      key={alerta.id}
                      className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${
                        isCritico
                          ? 'bg-red-50/50 border-red-200'
                          : isAdvertencia
                          ? 'bg-amber-50/40 border-amber-200'
                          : 'bg-[#F8F9FA] border-[#E2E8F0]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                            isCritico
                              ? 'bg-red-100 text-red-600'
                              : isAdvertencia
                              ? 'bg-amber-100 text-amber-600'
                              : 'bg-blue-100 text-[#1A5276]'
                          }`}
                        >
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-[#2C3E50]">
                              {alerta.titulo}
                            </h4>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.2 rounded-full uppercase ${
                                isCritico
                                  ? 'bg-red-100 text-red-700'
                                  : isAdvertencia
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-[#7F8C8D]'
                              }`}
                            >
                              {alerta.nivel}
                            </span>
                          </div>
                          <p className="text-xs text-[#7F8C8D] mt-0.5">{alerta.mensaje}</p>
                        </div>
                      </div>

                      {alerta.accion_url && (
                        <Link
                          href={alerta.accion_url}
                          className="erp-btn-secondary text-xs font-semibold py-1.5 px-3 shrink-0 self-end sm:self-center"
                        >
                          <span>{alerta.accion_label || 'Resolver'}</span>
                          <ChevronRight className="w-3.5 h-3.5 inline" />
                        </Link>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-12 text-center text-[#7F8C8D]">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                  <p className="font-semibold text-[#2C3E50]">¡Todo en orden!</p>
                  <p className="text-xs">No hay alertas activas para el filtro seleccionado.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: SALUD DEL SISTEMA */}
        {activeTab === 'sistema' && (
          <div className="space-y-6">
            <div className="erp-card">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-base font-bold text-[#2C3E50]">
                    Estado de Infraestructura & Monitoreo en Tiempo Real
                  </h3>
                  <p className="text-xs text-[#7F8C8D]">
                    Diagnóstico de microservicios, bases de datos y conectores de IA/mensajería
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Plataforma Operativa
                  </span>
                </div>
              </div>

              {/* Grid de Servicios */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* PostgreSQL */}
                <div className="bg-[#F8F9FA] p-4 rounded-xl border border-[#E2E8F0] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#2C3E50] flex items-center gap-1.5">
                      <Server className="w-4 h-4 text-[#1A5276]" />
                      PostgreSQL 16
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        sistema?.servicios.database.status === 'up'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {sistema?.servicios.database.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-[#7F8C8D]">
                    Latencia: {sistema?.servicios.database.latency_ms ?? 0} ms
                  </p>
                </div>

                {/* Redis */}
                <div className="bg-[#F8F9FA] p-4 rounded-xl border border-[#E2E8F0] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#2C3E50] flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-500" />
                      Redis Cache & BullMQ
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      UP
                    </span>
                  </div>
                  <p className="text-xs text-[#7F8C8D]">Colas y rate limiting activos</p>
                </div>

                {/* WhatsApp Baileys */}
                <div className="bg-[#F8F9FA] p-4 rounded-xl border border-[#E2E8F0] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#2C3E50] flex items-center gap-1.5">
                      <MessageSquareText className="w-4 h-4 text-emerald-600" />
                      WhatsApp Socket (Baileys)
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        sistema?.servicios.baileys.status === 'conectado'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {sistema?.servicios.baileys.status.toUpperCase() || 'STANDBY'}
                    </span>
                  </div>
                  <p className="text-xs text-[#7F8C8D]">
                    {sistema?.servicios.baileys.telefono
                      ? `Teléfono: ${sistema.servicios.baileys.telefono}`
                      : 'Listo para vinculación de dispositivo'}
                  </p>
                </div>

                {/* DeepSeek */}
                <div className="bg-[#F8F9FA] p-4 rounded-xl border border-[#E2E8F0] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#2C3E50] flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#1A5276]" />
                      DeepSeek LLM Engine
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      CONFIGURADO
                    </span>
                  </div>
                  <p className="text-xs text-[#7F8C8D]">
                    OCR, Bot Conversacional y Análisis de Precios activo
                  </p>
                </div>

                {/* Memoria */}
                <div className="bg-[#F8F9FA] p-4 rounded-xl border border-[#E2E8F0] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#2C3E50] flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-[#7F8C8D]" />
                      Uso de Memoria (RAM)
                    </span>
                    <span className="text-xs font-bold text-[#2C3E50] font-mono">
                      {sistema?.memoria.heap_used_mb ?? 0} MB
                    </span>
                  </div>
                  <p className="text-xs text-[#7F8C8D]">
                    Heap Total: {sistema?.memoria.heap_total_mb ?? 0} MB
                  </p>
                </div>

                {/* Uptime */}
                <div className="bg-[#F8F9FA] p-4 rounded-xl border border-[#E2E8F0] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#2C3E50] flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Tiempo Activo (Uptime)
                    </span>
                    <span className="text-xs font-bold text-[#2C3E50] font-mono">
                      {Math.floor((sistema?.uptime_segundos ?? 0) / 3600)}h{' '}
                      {Math.floor(((sistema?.uptime_segundos ?? 0) % 3600) / 60)}m
                    </span>
                  </div>
                  <p className="text-xs text-[#7F8C8D]">Servidor NestJS en ejecución continua</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
