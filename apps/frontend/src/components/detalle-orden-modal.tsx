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
  X,
  FileText,
  Printer,
  CheckCircle,
  Truck,
  Ban,
  User,
  MapPin,
  AlertTriangle,
  Receipt,
  ExternalLink,
  DollarSign,
  TrendingUp,
} from 'lucide-react';


interface DetalleOrdenModalProps {
  ordenId: string | null;
  onClose: () => void;
  onUpdated: () => void;
}

export function DetalleOrdenModal({
  ordenId,
  onClose,
  onUpdated,
}: DetalleOrdenModalProps) {
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

  if (!ordenId) return null;

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn select-none">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white border border-[#E2E8F0] rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] bg-[#F8F9FA]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1A5276]/10 border border-[#1A5276]/20 flex items-center justify-center text-[#1A5276]">
              <Receipt className="w-5 h-5 text-[#1A5276]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#2C3E50] tracking-wide">
                  {orden?.numero_orden || 'Cargando orden...'}
                </h2>
                {orden && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full uppercase bg-slate-100 text-[#7F8C8D] border border-slate-200">
                    Canal: {orden.canal}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#7F8C8D]">
                {orden?.fecha
                  ? `Emitida el ${new Date(orden.fecha).toLocaleString('es-VE')}`
                  : 'Detalle de orden de venta'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {orden && (
              <a
                href={getPdfDirectUrl('factura')}
                target="_blank"
                rel="noreferrer"
                className="erp-btn-secondary text-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Factura PDF</span>
              </a>
            )}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white border border-[#E2E8F0] text-[#7F8C8D] hover:text-[#2C3E50] flex items-center justify-center transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-3 border-[#1A5276] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-[#7F8C8D] font-mono">Cargando detalles de orden...</span>
            </div>
          ) : orden ? (
            <>
              {/* Badges Bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0]">
                  <span className="text-[10px] text-[#7F8C8D] uppercase font-semibold block">
                    Estado de Orden
                  </span>
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
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
                </div>

                <div className="p-3.5 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0]">
                  <span className="text-[10px] text-[#7F8C8D] uppercase font-semibold block">
                    Estado de Pago
                  </span>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                        orden.estado_pago === PaymentStatus.CONFIRMADO
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-[#7F8C8D] border border-slate-200'
                      }`}
                    >
                      {orden.estado_pago}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0]">
                  <span className="text-[10px] text-[#7F8C8D] uppercase font-semibold block">
                    Tipo de Entrega
                  </span>
                  <span className="mt-1 block text-xs font-semibold text-[#2C3E50] capitalize">
                    {orden.tipo_entrega}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0]">
                  <span className="text-[10px] text-[#7F8C8D] uppercase font-semibold block">
                    Total Facturado
                  </span>
                  <span className="mt-1 block text-base font-bold text-[#2C3E50] font-mono">
                    ${Number(orden.total).toFixed(2)} USD
                  </span>
                </div>
              </div>

              {/* Client & Shipping Box */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0]">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#2C3E50] mb-3 uppercase tracking-wider">
                    <User className="w-3.5 h-3.5 text-[#1A5276]" />
                    <span>Datos del Cliente</span>
                  </div>
                  <div className="space-y-1.5 text-xs text-[#7F8C8D]">
                    <div>
                      <span className="text-[#7F8C8D] font-mono">Nombre: </span>
                      <span className="font-semibold text-[#2C3E50]">
                        {orden.cliente?.nombre || 'Cliente Mostrador / Ocasional'}
                      </span>
                    </div>
                    {orden.cliente?.telefono && (
                      <div>
                        <span className="text-[#7F8C8D] font-mono">Teléfono: </span>
                        <span className="text-[#2C3E50]">{orden.cliente.telefono}</span>
                      </div>
                    )}
                    {orden.cliente?.email && (
                      <div>
                        <span className="text-[#7F8C8D] font-mono">Email: </span>
                        <span className="text-[#2C3E50]">{orden.cliente.email}</span>
                      </div>
                    )}
                    {orden.vendedor && (
                      <div>
                        <span className="text-[#7F8C8D] font-mono">Vendedor: </span>
                        <span className="text-[#2C3E50]">{orden.vendedor.nombre}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0]">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#2C3E50] mb-3 uppercase tracking-wider">
                    <MapPin className="w-3.5 h-3.5 text-[#1A5276]" />
                    <span>Entrega y Método de Pago</span>
                  </div>
                  <div className="space-y-1.5 text-xs text-[#7F8C8D]">
                    <div>
                      <span className="text-[#7F8C8D] font-mono">Método de Pago: </span>
                      <span className="font-semibold uppercase text-emerald-700">
                        {orden.metodo_pago ? orden.metodo_pago.replace('_', ' ') : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#7F8C8D] font-mono">Modalidad: </span>
                      <span className="capitalize text-[#2C3E50]">{orden.tipo_entrega}</span>
                    </div>
                    <div>
                      <span className="text-[#7F8C8D] font-mono">Dirección: </span>
                      <span className="text-[#2C3E50]">
                        {orden.direccion_entrega ||
                          orden.cliente?.direccion ||
                          'Retiro en mostrador'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h3 className="text-xs font-bold text-[#2C3E50] uppercase tracking-wider mb-2">
                  Ítems Vendidos & Descuento de Stock
                </h3>
                <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8F9FA] text-[#7F8C8D] uppercase font-mono text-[10px]">
                      <tr>
                        <th className="px-4 py-2.5">SKU</th>
                        <th className="px-4 py-2.5">Descripción</th>
                        <th className="px-4 py-2.5 text-center">Cant.</th>
                        <th className="px-4 py-2.5 text-right">Precio Unit.</th>
                        <th className="px-4 py-2.5 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0] bg-white">
                      {orden.detalles?.map((det) => (
                        <tr key={det.id} className="hover:bg-[#F8F9FA] transition">
                          <td className="px-4 py-2.5 font-mono font-bold text-[#1A5276]">
                            {det.sku?.sku_interno || 'N/A'}
                          </td>
                          <td className="px-4 py-2.5 text-[#2C3E50]">
                            <span className="font-medium block">{det.sku?.nombre}</span>
                            {det.sku?.marca && (
                              <span className="text-[10px] text-[#7F8C8D]">
                                Marca: {det.sku.marca}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-center font-bold text-[#2C3E50]">
                            {det.cantidad}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-[#7F8C8D]">
                            ${Number(det.precio_unitario).toFixed(2)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-[#2C3E50]">
                            ${Number(det.subtotal).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-[#F8F9FA] font-bold border-t border-[#E2E8F0]">
                      <tr>
                        <td colSpan={4} className="px-4 py-3 text-right text-[#7F8C8D] uppercase">
                          Total Venta:
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-[#2C3E50] text-base">
                          ${Number(orden.total).toFixed(2)} USD
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Financial Profit & Cost Breakdown */}
                {(() => {
                  const fin = calculateOrderFinancials(orden);
                  return (
                    <div className="p-4 rounded-xl border border-[#E2E8F0] bg-white space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="text-xs font-bold text-[#2C3E50] uppercase tracking-wider flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                          Rendimiento Financiero & Ganancia Real
                        </span>
                        {fin.esMercadoLibre ? (
                          <span className="text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-full">
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
                          <span className="text-[#7F8C8D] block text-[10px] uppercase font-semibold">Total Facturado</span>
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
                          <span className="text-[#7F8C8D] block text-[10px] uppercase font-semibold">Ganancia Neta Real</span>
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
              </div>

              {/* Documents Section */}
              <div className="p-4 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#2C3E50] uppercase tracking-wider">
                    <FileText className="w-3.5 h-3.5 text-[#1A5276]" />
                    <span>Documentos Internos Generados</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleGenerarDoc(DocumentType.FACTURA)}
                      disabled={loadingAction === 'doc-factura'}
                      className="erp-btn-secondary text-[11px] py-1 px-3"
                    >
                      + Factura
                    </button>
                    <button
                      onClick={() => handleGenerarDoc(DocumentType.RECIBO)}
                      disabled={loadingAction === 'doc-recibo'}
                      className="erp-btn-secondary text-[11px] py-1 px-3"
                    >
                      + Recibo
                    </button>
                  </div>
                </div>

                {orden.documentos && orden.documentos.length > 0 ? (
                  <div className="space-y-2">
                    {orden.documentos.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-[#E2E8F0] text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              doc.tipo === DocumentType.FACTURA
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-sky-50 text-sky-700 border border-sky-200'
                            }`}
                          >
                            {doc.tipo}
                          </span>
                          <span className="font-mono font-bold text-[#2C3E50]">{doc.numero}</span>
                          <span className="text-[#7F8C8D] text-[10px]">
                            {new Date(doc.fecha).toLocaleDateString('es-VE')}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <a
                            href={getPdfDirectUrl(doc.tipo)}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[#2C3E50] text-xs border border-slate-200 transition"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Ver PDF</span>
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#7F8C8D] italic">
                    No se ha generado ningún documento aún. Puede emitir factura o recibo con los botones superiores.
                  </p>
                )}
              </div>

              {/* Cancellation prompt if opened */}
              {showCancelPrompt && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-red-700">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <span>¿Confirmar cancelación de la orden?</span>
                  </div>
                  <p className="text-xs text-red-600">
                    Esta acción restaurará automáticamente el stock de los productos vendidos y generará movimientos de entrada por reposición en el kardex.
                  </p>
                  <div>
                    <input
                      type="text"
                      placeholder="Motivo de cancelación (opcional)..."
                      value={cancelMotivo}
                      onChange={(e) => setCancelMotivo(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-white border border-red-200 text-xs text-[#2C3E50] placeholder-[#7F8C8D] focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowCancelPrompt(false)}
                      className="erp-btn-secondary text-xs py-1"
                    >
                      Atrás
                    </button>
                    <button
                      onClick={handleCancelar}
                      disabled={loadingAction === 'cancelar'}
                      className="px-3 py-1 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition disabled:opacity-50"
                    >
                      {loadingAction === 'cancelar' ? 'Cancelando...' : 'Sí, Cancelar y Restaurar Stock'}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Modal Footer Workflow Actions */}
        {orden && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-[#E2E8F0] bg-[#F8F9FA]">
            <div>
              {orden.estado !== OrderStatus.CANCELADA && !showCancelPrompt && (
                <button
                  onClick={() => setShowCancelPrompt(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 transition"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Cancelar Orden</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {orden.estado_pago === PaymentStatus.PENDIENTE &&
                orden.estado !== OrderStatus.CANCELADA && (
                  <button
                    onClick={handleConfirmarPago}
                    disabled={loadingAction === 'pago'}
                    className="erp-btn-primary text-xs"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>
                      {loadingAction === 'pago' ? 'Confirmando...' : 'Confirmar Pago'}
                    </span>
                  </button>
                )}

              {orden.estado !== OrderStatus.DESPACHADA &&
                orden.estado !== OrderStatus.CERRADA &&
                orden.estado !== OrderStatus.CANCELADA && (
                  <button
                    onClick={handleDespachar}
                    disabled={loadingAction === 'despacho'}
                    className="erp-btn-primary text-xs"
                  >
                    <Truck className="w-4 h-4" />
                    <span>
                      {loadingAction === 'despacho'
                        ? 'Despachando...'
                        : 'Marcar Despachada'}
                    </span>
                  </button>
                )}

              <button
                onClick={onClose}
                className="erp-btn-secondary text-xs"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
