'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  OrdenSummary,
  OrderStatus,
  PaymentStatus,
  DocumentType,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#0b101b] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  {orden?.numero_orden || 'Cargando orden...'}
                </h2>
                {orden && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full uppercase bg-slate-800 text-slate-300 border border-slate-700">
                    Canal: {orden.canal}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Factura PDF</span>
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-3 border-rose-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-slate-400 font-mono">Cargando detalles de orden...</span>
            </div>
          ) : orden ? (
            <>
              {/* Badges Bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    Estado de Orden
                  </span>
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-md font-semibold uppercase ${
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
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    Estado de Pago
                  </span>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-md font-semibold uppercase ${
                        orden.estado_pago === PaymentStatus.CONFIRMADO
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {orden.estado_pago}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    Tipo de Entrega
                  </span>
                  <span className="mt-1 block text-xs font-semibold text-slate-200 capitalize">
                    {orden.tipo_entrega}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    Total Facturado
                  </span>
                  <span className="mt-1 block text-base font-black text-rose-400 font-mono">
                    ${Number(orden.total).toFixed(2)} USD
                  </span>
                </div>
              </div>

              {/* Client & Shipping Box */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-300 mb-3 uppercase tracking-wider">
                    <User className="w-3.5 h-3.5 text-rose-400" />
                    <span>Datos del Cliente</span>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-300">
                    <div>
                      <span className="text-slate-500 font-mono">Nombre: </span>
                      <span className="font-semibold text-white">
                        {orden.cliente?.nombre || 'Cliente Mostrador / Ocasional'}
                      </span>
                    </div>
                    {orden.cliente?.telefono && (
                      <div>
                        <span className="text-slate-500 font-mono">Teléfono: </span>
                        <span>{orden.cliente.telefono}</span>
                      </div>
                    )}
                    {orden.cliente?.email && (
                      <div>
                        <span className="text-slate-500 font-mono">Email: </span>
                        <span>{orden.cliente.email}</span>
                      </div>
                    )}
                    {orden.vendedor && (
                      <div>
                        <span className="text-slate-500 font-mono">Vendedor Asignado: </span>
                        <span>{orden.vendedor.nombre}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-300 mb-3 uppercase tracking-wider">
                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                    <span>Entrega y Método de Pago</span>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-300">
                    <div>
                      <span className="text-slate-500 font-mono">Método de Pago: </span>
                      <span className="font-semibold uppercase text-emerald-400">
                        {orden.metodo_pago.replace('_', ' ')}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-mono">Modalidad Entrega: </span>
                      <span className="capitalize">{orden.tipo_entrega}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-mono">Dirección / Destino: </span>
                      <span>
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
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Ítems Vendidos & Descuento de Stock
                </h3>
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/80 text-slate-400 uppercase font-mono text-[10px]">
                      <tr>
                        <th className="px-4 py-2.5">SKU</th>
                        <th className="px-4 py-2.5">Descripción</th>
                        <th className="px-4 py-2.5 text-center">Cant.</th>
                        <th className="px-4 py-2.5 text-right">Precio Unit.</th>
                        <th className="px-4 py-2.5 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {orden.detalles?.map((det) => (
                        <tr key={det.id} className="hover:bg-slate-900/30 transition">
                          <td className="px-4 py-2.5 font-mono font-bold text-rose-400">
                            {det.sku?.sku_interno || 'N/A'}
                          </td>
                          <td className="px-4 py-2.5 text-slate-200">
                            <span className="font-medium block">{det.sku?.nombre}</span>
                            {det.sku?.marca && (
                              <span className="text-[10px] text-slate-500">
                                Marca: {det.sku.marca}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-center font-bold text-white">
                            {det.cantidad}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-slate-300">
                            ${Number(det.precio_unitario).toFixed(2)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-white">
                            ${Number(det.subtotal).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-900/90 font-bold border-t border-slate-800">
                      <tr>
                        <td colSpan={4} className="px-4 py-3 text-right text-slate-400 uppercase">
                          Total Venta:
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-rose-400 text-sm">
                          ${Number(orden.total).toFixed(2)} USD
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Documents Section */}
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                    <FileText className="w-3.5 h-3.5 text-rose-400" />
                    <span>Documentos Internos Generados</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleGenerarDoc(DocumentType.FACTURA)}
                      disabled={loadingAction === 'doc-factura'}
                      className="px-2.5 py-1 rounded text-[11px] font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition disabled:opacity-50"
                    >
                      + Factura
                    </button>
                    <button
                      onClick={() => handleGenerarDoc(DocumentType.RECIBO)}
                      disabled={loadingAction === 'doc-recibo'}
                      className="px-2.5 py-1 rounded text-[11px] font-semibold bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 transition disabled:opacity-50"
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
                        className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              doc.tipo === DocumentType.FACTURA
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                            }`}
                          >
                            {doc.tipo}
                          </span>
                          <span className="font-mono font-bold text-white">{doc.numero}</span>
                          <span className="text-slate-500 text-[10px]">
                            {new Date(doc.fecha).toLocaleDateString('es-VE')}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <a
                            href={getPdfDirectUrl(doc.tipo)}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Ver PDF</span>
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">
                    No se ha generado ningún documento aún. Puede emitir factura o recibo con los botones superiores.
                  </p>
                )}
              </div>

              {/* Cancellation prompt if opened */}
              {showCancelPrompt && (
                <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/80 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-red-300">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span>¿Confirmar cancelación de la orden?</span>
                  </div>
                  <p className="text-xs text-red-200/80">
                    Esta acción restaurará automáticamente el stock de los productos vendidos y generará movimientos de entrada por reposición en el kardex.
                  </p>
                  <div>
                    <input
                      type="text"
                      placeholder="Motivo de cancelación (opcional)..."
                      value={cancelMotivo}
                      onChange={(e) => setCancelMotivo(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-red-800/60 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowCancelPrompt(false)}
                      className="px-3 py-1 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
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
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/60">
            <div>
              {orden.estado !== OrderStatus.CANCELADA && !showCancelPrompt && (
                <button
                  onClick={() => setShowCancelPrompt(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-950/40 border border-red-900/50 transition"
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
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
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
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white transition shadow-lg shadow-rose-600/20 disabled:opacity-50"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>
                      {loadingAction === 'despacho'
                        ? 'Despachando...'
                        : 'Marcar Despachada'}
                    </span>
                  </button>
                )}

              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition"
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
