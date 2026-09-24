'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { CompraSummary } from '@japonparts/shared';
import { apiClient } from '../../../../lib/api-client';
import { getStorageUrl } from '../../../../lib/utils';
import { Header } from '../../../../components/header';
import { PagoCompraModal } from '../../../../components/pago-compra-modal';
import {
  FileText,
  Building2,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ArrowLeft,
  PackageCheck,
  CreditCard,
  Layers,
} from 'lucide-react';

export default function CompraDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [pagoModalOpen, setPagoModalOpen] = useState<boolean>(false);
  const [approving, setApproving] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const {
    data: compra,
    isLoading,
    refetch,
  } = useQuery<CompraSummary>({
    queryKey: ['compra', id],
    queryFn: async () => {
      const res = await apiClient.get<CompraSummary>(`/compra/${id}`);
      return res.data!;
    },
    enabled: !!id,
  });

  const handleAprobarCompra = async () => {
    if (!compra) return;
    setActionError(null);
    setSuccessMsg(null);
    setApproving(true);

    try {
      await apiClient.post(`/compra/${compra.id}/aprobar`);
      setSuccessMsg('¡Compra aprobada con éxito! El inventario fue incrementado y los costos promedio recalculados.');
      refetch();
    } catch (err: any) {
      setActionError(err.message || 'Error al aprobar la compra');
    } finally {
      setApproving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-400">
        <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <span>Cargando detalle de la compra...</span>
      </div>
    );
  }

  if (!compra) {
    return (
      <div className="p-12 text-center text-slate-400">
        <p className="text-base font-bold text-white mb-2">Factura no encontrada</p>
        <Link href="/compras" className="text-rose-400 underline text-xs">
          Regresar a compras
        </Link>
      </div>
    );
  }

  const pending =
    compra.saldo_pendiente !== undefined
      ? Number(compra.saldo_pendiente)
      : Number(compra.total) - Number(compra.monto_pagado || 0);

  return (
    <div className="pb-16">
      <Header
        title={`Factura de Compra #${compra.numero_factura}`}
        subtitle={`Proveedor: ${compra.proveedor?.nombre || 'Proveedor'} — RIF: ${compra.proveedor?.rif || 'N/A'}`}
        onRefresh={() => refetch()}
        actionSlot={
          <div className="flex items-center gap-2">
            <Link
              href="/compras"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver a Compras</span>
            </Link>

            {compra.estado === 'pendiente' && (
              <button
                onClick={handleAprobarCompra}
                disabled={approving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/20 disabled:opacity-50"
              >
                <PackageCheck className="w-4 h-4" />
                <span>{approving ? 'Aprobando...' : 'Aprobar Compra & Cargar Stock'}</span>
              </button>
            )}

            {compra.estado === 'recibida' && pending > 0 && (
              <button
                onClick={() => setPagoModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white text-xs font-bold transition shadow-lg shadow-rose-600/20"
              >
                <CreditCard className="w-4 h-4" />
                <span>Registrar Pago</span>
              </button>
            )}
          </div>
        }
      />

      <div className="p-8 max-w-6xl mx-auto space-y-6">
        {/* Alerts */}
        {actionError && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Invoice Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card p-4 rounded-2xl">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Estado de la Compra
            </span>
            <div className="mt-2">
              {compra.estado === 'pendiente' && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  <Clock className="w-3.5 h-3.5" />
                  Pendiente de Aprobación
                </span>
              )}
              {compra.estado === 'recibida' && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Aprobada (Stock Cargado)
                </span>
              )}
              {compra.estado === 'pagada' && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Pagada (Liquidada)
                </span>
              )}
            </div>
          </div>

          <div className="glass-card p-4 rounded-2xl">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Condición de Pago
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-base font-bold text-white capitalize">
                {compra.condicion_pago}
              </span>
              {compra.condicion_pago === 'credito' && (
                <span className="text-xs text-amber-400 font-mono">
                  ({compra.dias_credito} días)
                </span>
              )}
            </div>
          </div>

          <div className="glass-card p-4 rounded-2xl">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Total Factura
            </span>
            <div className="mt-2">
              <span className="text-xl font-black text-white font-mono">
                ${Number(compra.total).toFixed(2)} USD
              </span>
            </div>
          </div>

          <div className="glass-card p-4 rounded-2xl border-l-4 border-l-rose-500">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Saldo Pendiente (CxP)
            </span>
            <div className="mt-2">
              <span className="text-xl font-black text-rose-400 font-mono">
                ${Number(pending).toFixed(2)} USD
              </span>
            </div>
          </div>
        </div>

        {/* Supplier & Attachment Section */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
              <Building2 className="w-4 h-4 text-rose-400" />
              Información del Proveedor
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Razón Social:</span>
                <span className="font-semibold text-slate-200">
                  {compra.proveedor?.nombre || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">RIF Fiscal:</span>
                <span className="font-mono text-slate-200">{compra.proveedor?.rif || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Fecha de Factura:</span>
                <span className="text-slate-200">
                  {compra.fecha ? new Date(compra.fecha).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              {compra.proveedor?.id && (
                <div className="pt-2">
                  <Link
                    href={`/proveedores/${compra.proveedor.id}/estado-cuenta`}
                    className="text-xs text-rose-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <span>Ver Estado de Cuenta Completo del Proveedor</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-rose-400" />
              Comprobante Digitalizado en MinIO
            </h4>
            {compra.archivo_url ? (
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-rose-400" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Factura Digitalizada</span>
                    <span className="text-[11px] text-slate-400 font-mono truncate max-w-xs block">
                      {compra.archivo_url}
                    </span>
                  </div>
                </div>
                <a
                  href={getStorageUrl(compra.archivo_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-rose-400 flex items-center gap-1 transition"
                >
                  <span>Abrir Documento</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-900/30 border border-slate-800 text-xs text-slate-500">
                Esta compra fue registrada manualmente sin archivo adjunto digitalizado.
              </div>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              Detalle de Repuestos Facturados
            </h4>
            <span className="text-xs text-slate-400 font-mono">
              {compra.detalles?.length || 0} ítems
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">SKU Interno</th>
                  <th className="py-3 px-4">Descripción del Repuesto</th>
                  <th className="py-3 px-4 text-right">Cantidad Facturada</th>
                  <th className="py-3 px-4 text-right">Costo Unitario ($)</th>
                  <th className="py-3 px-4 text-right">Subtotal ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {compra.detalles?.map((det) => (
                  <tr key={det.id} className="hover:bg-slate-800/20">
                    <td className="py-3 px-4 font-mono font-bold text-rose-400">
                      {det.sku?.sku_interno || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-slate-200">
                      <span className="font-semibold block">{det.sku?.nombre || 'Ítem'}</span>
                      <span className="text-[11px] text-slate-400">Marca: {det.sku?.marca || 'N/A'}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-white">
                      {det.cantidad} unids.
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-200">
                      ${Number(det.costo_unitario).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-white">
                      ${Number(det.subtotal).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-900/90 font-bold border-t border-slate-800">
                <tr>
                  <td colSpan={4} className="py-3.5 px-4 text-right text-slate-400 uppercase text-xs">
                    Total Facturado:
                  </td>
                  <td className="py-3.5 px-4 text-right text-base text-white font-mono">
                    ${Number(compra.total).toFixed(2)} USD
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Payments History Table */}
        <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              Historial de Pagos & Abonos a esta Factura
            </h4>
            {compra.estado === 'recibida' && pending > 0 && (
              <button
                onClick={() => setPagoModalOpen(true)}
                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition"
              >
                + Registrar Pago
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Fecha Pago</th>
                  <th className="py-3 px-4">Método</th>
                  <th className="py-3 px-4">Referencia / Comprobante</th>
                  <th className="py-3 px-4 text-right">Monto Abonado ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {!compra.pagos || compra.pagos.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-500">
                      No se han registrado pagos para esta factura.
                    </td>
                  </tr>
                ) : (
                  compra.pagos.map((pago) => (
                    <tr key={pago.id} className="hover:bg-slate-800/20">
                      <td className="py-3 px-4 text-slate-300">
                        {new Date(pago.fecha).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 capitalize text-slate-200 font-medium">
                        {pago.metodo}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {pago.referencia || 'Sin referencia'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                        ${Number(pago.monto).toFixed(2)} USD
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal para Registrar Pago */}
      <PagoCompraModal
        compra={compra}
        isOpen={pagoModalOpen}
        onClose={() => setPagoModalOpen(false)}
        onSuccess={() => {
          setSuccessMsg('Pago registrado exitosamente');
          refetch();
        }}
      />
    </div>
  );
}
