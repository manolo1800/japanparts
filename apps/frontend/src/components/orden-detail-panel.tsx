'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  OrdenSummary,
  OrderStatus,
  PaymentStatus,
  DocumentType,
  calculateOrderFinancials,
} from '@japonparts/shared';
import { apiClient } from '../lib/api-client';
import {
  Receipt,
  Printer,
  CheckCircle,
  Truck,
  Ban,
  MapPin,
  AlertTriangle,
  FileText,
  CreditCard,
  Building,
  MoreVertical,
  DollarSign,
  TrendingUp,
} from 'lucide-react';

interface OrdenDetailPanelProps {
  ordenId: string | null;
  onUpdated: () => void;
}

export function OrdenDetailPanel({ ordenId, onUpdated }: OrdenDetailPanelProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cancelMotivo, setCancelMotivo] = useState<string>('');
  const [showCancelPrompt, setShowCancelPrompt] = useState<boolean>(false);

  const {
    data: orden,
    isLoading,
    refetch,
  } = useQuery<OrdenSummary>({
    queryKey: ['orden-detalle', ordenId],
    queryFn: async () => {
      if (!ordenId) throw new Error('No orden id');
      const res = await apiClient.get<OrdenSummary>(`/orden/${ordenId}`);
      return res.data!;
    },
    enabled: !!ordenId,
  });

  if (!ordenId) {
    return (
      <div className="h-full min-h-[500px] flex flex-col items-center justify-center p-8 text-center bg-white rounded-2xl border border-[#E2E8F0] shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-[#F8F9FA] border border-[#E2E8F0] flex items-center justify-center text-[#7F8C8D] mb-4">
          <Receipt className="w-8 h-8 text-[#7F8C8D]" />
        </div>
        <h3 className="text-base font-semibold text-[#2C3E50] mb-1">
          Ninguna orden seleccionada
        </h3>
        <p className="text-xs text-[#7F8C8D] max-w-sm">
          Selecciona una orden de la lista izquierda para visualizar el desglose detallado, cliente y opciones de facturación.
        </p>
      </div>
    );
  }

  const handleConfirmarPago = async () => {
    try {
      setLoadingAction('pago');
      setErrorMsg(null);
      await apiClient.post(`/orden/${ordenId}/confirmar-pago`, {
        metodo_pago: orden?.metodo_pago,
        generar_documento: DocumentType.FACTURA,
      });
      await refetch();
      onUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al confirmar pago');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDespachar = async () => {
    try {
      setLoadingAction('despacho');
      setErrorMsg(null);
      await apiClient.post(`/orden/${ordenId}/despachar`);
      await refetch();
      onUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al despachar orden');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleCancelar = async () => {
    try {
      setLoadingAction('cancelar');
      setErrorMsg(null);
      await apiClient.post(`/orden/${ordenId}/cancelar`, {
        motivo: cancelMotivo || 'Cancelación solicitada por usuario',
      });
      setShowCancelPrompt(false);
      await refetch();
      onUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al cancelar orden');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleGenerarDoc = async (tipo: DocumentType) => {
    try {
      setLoadingAction(`doc-${tipo}`);
      setErrorMsg(null);
      await apiClient.post(`/orden/${ordenId}/documento`, { tipo });
      await refetch();
      onUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || `Error al generar ${tipo}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const getPdfDirectUrl = (tipo: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    return `${baseUrl}/orden/${ordenId}/pdf?tipo=${tipo}`;
  };

  if (isLoading) {
    return (
      <div className="h-full min-h-[500px] flex flex-col items-center justify-center p-8 bg-white rounded-2xl border border-[#E2E8F0] shadow-sm">
        <div className="w-10 h-10 border-3 border-[#1A5276] border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs text-[#7F8C8D] font-medium tracking-wide">
          Cargando desglose de la orden...
        </span>
      </div>
    );
  }

  if (!orden) return null;

  const isPaid = orden.estado_pago === PaymentStatus.CONFIRMADO;
  const isCancelled = orden.estado === OrderStatus.CANCELADA;

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden flex flex-col transition-all duration-300">
      {/* Top Detail Header */}
      <div className="p-6 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-[#2C3E50] tracking-tight">
              {orden.numero_orden}
            </h2>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                isPaid
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-slate-100 text-[#7F8C8D] border border-slate-200'
              }`}
            >
              {orden.estado_pago === PaymentStatus.CONFIRMADO ? 'Pagado' : 'Pendiente Pago'}
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                orden.estado === OrderStatus.DESPACHADA || orden.estado === OrderStatus.CERRADA
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : orden.estado === OrderStatus.CANCELADA
                    ? 'bg-red-500/20 text-red-600 border border-red-500/30'
                    : 'bg-slate-100 text-[#2C3E50] border border-slate-200'
              }`}
            >
              {orden.estado.replace('_', ' ')}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-1.5 text-xs text-[#7F8C8D]">
            <Building className="w-3.5 h-3.5 text-[#7F8C8D]" />
            <span className="font-medium text-[#2C3E50]">Tokugawa Spare Parts C.A.</span>
            <span>•</span>
            <span>
              {orden.fecha
                ? new Date(orden.fecha).toLocaleDateString('es-VE', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Fecha no especificada'}
            </span>
            <span>•</span>
            <span className="uppercase font-mono text-[11px] px-2 py-0.5 rounded bg-[#F8F9FA] border border-[#E2E8F0]">
              {orden.canal}
            </span>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2.5">
          <a
            href={getPdfDirectUrl('factura')}
            target="_blank"
            rel="noreferrer"
            className="erp-btn-secondary text-xs"
            title="Exportar / Imprimir Factura"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Factura</span>
          </a>

          <button
            onClick={() => handleGenerarDoc(DocumentType.FACTURA)}
            disabled={loadingAction === 'doc-factura'}
            className="w-9 h-9 rounded-full bg-[#F8F9FA] border border-[#E2E8F0] flex items-center justify-center text-[#7F8C8D] hover:text-[#1A5276] hover:border-[#1A5276] transition"
            title="Generar Factura Fiscal"
          >
            <FileText className="w-4 h-4" />
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="mx-6 mt-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Content Body */}
      <div className="p-6 space-y-6">
        {/* Client Profile Card */}
        <div className="p-5 rounded-2xl bg-[#F8F9FA] border border-[#E2E8F0] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#1A5276]/10 border border-[#1A5276]/20 flex items-center justify-center text-[#1A5276] font-bold text-base shadow-inner">
              {orden.cliente?.nombre ? orden.cliente.nombre.charAt(0).toUpperCase() : 'C'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#2C3E50]">
                  {orden.cliente?.nombre || 'Cliente Mostrador / Ocasional'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-[#7F8C8D]">
                {orden.cliente?.email && <span>{orden.cliente.email}</span>}
                {orden.cliente?.telefono && (
                  <span className="font-mono">{orden.cliente.telefono}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-left md:text-right">
              <span className="text-[11px] uppercase tracking-wider text-[#7F8C8D] font-medium block">
                Modalidad Entrega
              </span>
              <span className="text-xs font-semibold text-[#2C3E50] capitalize flex items-center gap-1.5 mt-0.5">
                <Truck className="w-3.5 h-3.5 text-[#1A5276]" />
                {orden.tipo_entrega}
              </span>
            </div>
          </div>
        </div>

        {/* Shipping & Payment Meta */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0]">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider mb-2">
              <CreditCard className="w-4 h-4 text-[#1A5276]" />
              <span>Información de Pago</span>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#7F8C8D]">Método:</span>
                <span className="font-semibold text-[#2C3E50] uppercase">
                  {orden.metodo_pago ? orden.metodo_pago.replace('_', ' ') : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7F8C8D]">Estado Pago:</span>
                <span className={`font-bold ${isPaid ? 'text-emerald-700' : 'text-amber-600'}`}>
                  {orden.estado_pago}
                </span>
              </div>
              {orden.vendedor && (
                <div className="flex justify-between">
                  <span className="text-[#7F8C8D]">Vendedor:</span>
                  <span className="text-[#2C3E50]">{orden.vendedor.nombre}</span>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0]">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#7F8C8D] uppercase tracking-wider mb-2">
              <MapPin className="w-4 h-4 text-[#1A5276]" />
              <span>Dirección & Despacho</span>
            </div>
            <div className="space-y-1.5 text-xs text-[#2C3E50]">
              <p className="line-clamp-2">
                {orden.direccion_entrega || orden.cliente?.direccion || 'Retiro en tienda (Mostrador)'}
              </p>
              <div className="flex justify-between pt-1 text-[#7F8C8D]">
                <span>Canal de venta:</span>
                <span className="uppercase font-semibold text-[#2C3E50]">{orden.canal}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Line Items Breakdown */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[#2C3E50]">
              Desglose de Productos & Repuestos
            </h3>
            <span className="text-xs text-[#7F8C8D]">
              {orden.detalles?.length || 0} ítems registrados
            </span>
          </div>

          <div className="rounded-xl border border-[#E2E8F0] overflow-hidden bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F9FA] text-[#7F8C8D] uppercase font-mono text-[10px] tracking-wider border-b border-[#E2E8F0]">
                <tr>
                  <th className="px-4 py-3">Pieza / SKU</th>
                  <th className="px-4 py-3 text-center">Cant.</th>
                  <th className="px-4 py-3 text-right">Precio Unit.</th>
                  <th className="px-4 py-3 text-right">Subtotal</th>
                  <th className="px-4 py-3 text-center w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {orden.detalles && orden.detalles.length > 0 ? (
                  orden.detalles.map((det) => (
                    <tr key={det.id} className="hover:bg-[#F8F9FA] transition">
                      <td className="px-4 py-3">
                        <div className="flex items-baseline gap-2">
                          <span className="font-mono font-bold text-[#1A5276]">
                            {det.sku?.sku_interno || 'SKU'}
                          </span>
                          <span className="font-medium text-[#2C3E50] truncate max-w-xs block">
                            {det.sku?.nombre}
                          </span>
                        </div>
                        {det.sku?.marca && (
                          <span className="text-[10px] text-[#7F8C8D] block">
                            Marca: {det.sku.marca}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-[#2C3E50]">
                        {det.cantidad}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[#7F8C8D]">
                        ${Number(det.precio_unitario).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-[#2C3E50]">
                        ${Number(det.subtotal).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center text-[#7F8C8D]">
                        <button
                          className="p-1 rounded hover:bg-slate-100 hover:text-[#2C3E50] transition"
                          title="Opciones de producto"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#8B949E]">
                      Sin ítems cargados en esta orden.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial Breakdown (Costos, Comisiones ML 12% y Ganancia Real) */}
        {(() => {
          const fin = calculateOrderFinancials(orden);
          return (
            <div className="p-4 rounded-xl border border-[#E2E8F0] bg-white space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <span className="text-xs font-bold text-[#2C3E50] uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  Rendimiento Financiero & Ganancia Real
                </span>
                {fin.esMercadoLibre ? (
                  <span className="text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    MercadoLibre (12% retención)
                  </span>
                ) : (
                  <span className="text-[10px] font-mono font-bold bg-sky-50 text-sky-700 border border-sky-200 px-2.5 py-0.5 rounded-full">
                    Venta Directa (0% comisión)
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[#7F8C8D] block text-[10px] uppercase font-semibold">Total Venta</span>
                  <span className="font-mono font-bold text-[#2C3E50] text-sm block mt-0.5">
                    ${fin.totalVenta.toFixed(2)}
                  </span>
                </div>

                <div>
                  <span className="text-[#7F8C8D] block text-[10px] uppercase font-semibold">
                    {fin.esMercadoLibre ? 'Comisión ML (12%)' : 'Comisión Plataforma'}
                  </span>
                  <span
                    className={`font-mono font-bold text-sm block mt-0.5 ${
                      fin.esMercadoLibre ? 'text-amber-700' : 'text-[#7F8C8D]'
                    }`}
                  >
                    {fin.esMercadoLibre ? `-$${fin.comisionPlataforma.toFixed(2)}` : '$0.00'}
                  </span>
                </div>

                <div>
                  <span className="text-[#7F8C8D] block text-[10px] uppercase font-semibold">Costo Repuestos</span>
                  <span className="font-mono font-semibold text-slate-600 text-sm block mt-0.5">
                    -${fin.costoMercancia.toFixed(2)}
                  </span>
                </div>

                <div>
                  <span className="text-[#7F8C8D] block text-[10px] uppercase font-semibold">Ganancia Neta</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span
                      className={`font-mono font-black text-sm ${
                        fin.gananciaNeta >= 0 ? 'text-emerald-700' : 'text-red-600'
                      }`}
                    >
                      ${fin.gananciaNeta.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-[#7F8C8D] font-mono">({fin.margenPorcentaje}%)</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Cancellation Box if prompted */}
        {showCancelPrompt && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 space-y-3 animate-fadeIn">
            <div className="flex items-center gap-2 text-xs font-bold text-red-700">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span>Confirmar cancelación y devolución de stock</span>
            </div>
            <p className="text-xs text-red-600">
              El stock de las piezas será restituido inmediatamente en el catálogo general.
            </p>
            <input
              type="text"
              placeholder="Indica el motivo de cancelación..."
              value={cancelMotivo}
              onChange={(e) => setCancelMotivo(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white border border-red-200 text-xs text-[#2C3E50] placeholder-[#7F8C8D] focus:outline-none focus:border-red-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCancelPrompt(false)}
                className="erp-btn-secondary text-xs py-1.5"
              >
                Volver
              </button>
              <button
                onClick={handleCancelar}
                disabled={loadingAction === 'cancelar'}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition disabled:opacity-50"
              >
                {loadingAction === 'cancelar' ? 'Cancelando...' : 'Confirmar Cancelación'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Totals Summary Bottom Row with Primary Accent Button (DESING.md) */}
      <div className="p-6 border-t border-[#E2E8F0] bg-[#F8F9FA] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mt-auto">
        {(() => {
          const fin = calculateOrderFinancials(orden);
          return (
            <div className="flex flex-wrap items-center gap-6 text-xs">
              <div>
                <span className="text-[#7F8C8D] block text-[11px] uppercase tracking-wider">
                  Sub Total
                </span>
                <span className="text-sm font-semibold text-[#2C3E50] font-mono">
                  ${Number(orden.total).toFixed(2)}
                </span>
              </div>
              {fin.esMercadoLibre && (
                <div>
                  <span className="text-amber-800 block text-[11px] uppercase tracking-wider font-semibold">
                    Comisión ML (12%)
                  </span>
                  <span className="text-sm font-bold text-amber-700 font-mono">
                    -${fin.comisionPlataforma.toFixed(2)}
                  </span>
                </div>
              )}
              <div>
                <span className="text-[#7F8C8D] block text-[11px] uppercase tracking-wider">
                  {fin.esMercadoLibre ? 'Ingreso Neto' : 'Impuesto / IVA'}
                </span>
                <span className="text-sm font-semibold text-[#7F8C8D] font-mono">
                  {fin.esMercadoLibre ? `$${fin.ingresoNeto.toFixed(2)}` : '$0.00'}
                </span>
              </div>
              <div className="pl-4 border-l border-[#E2E8F0]">
                <span className="text-[#7F8C8D] block text-[11px] uppercase tracking-wider font-semibold">
                  Total Orden
                </span>
                <span className="text-xl font-bold text-[#2C3E50] font-mono">
                  ${Number(orden.total).toFixed(2)} USD
                </span>
              </div>
            </div>
          );
        })()}

        {/* Action Button: Primary Accent Button */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          {!isPaid && !isCancelled && (
            <button
              onClick={handleConfirmarPago}
              disabled={loadingAction === 'pago'}
              className="erp-btn-primary text-xs w-full md:w-auto"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{loadingAction === 'pago' ? 'Procesando...' : 'Cobrar Factura / Pagar'}</span>
            </button>
          )}

          {isPaid &&
            orden.estado !== OrderStatus.DESPACHADA &&
            orden.estado !== OrderStatus.CERRADA &&
            !isCancelled && (
              <button
                onClick={handleDespachar}
                disabled={loadingAction === 'despacho'}
                className="erp-btn-primary text-xs w-full md:w-auto"
              >
                <Truck className="w-4 h-4" />
                <span>
                  {loadingAction === 'despacho' ? 'Despachando...' : 'Marcar Despachada'}
                </span>
              </button>
            )}

          {!isCancelled && !showCancelPrompt && (
            <button
              onClick={() => setShowCancelPrompt(true)}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 transition"
              title="Cancelar orden"
            >
              <Ban className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
