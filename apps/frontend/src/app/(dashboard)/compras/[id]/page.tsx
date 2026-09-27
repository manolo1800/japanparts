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
      <div className="p-12 text-center text-[#7F8C8D]">
        <div className="w-8 h-8 border-2 border-[#1A5276] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <span>Cargando detalle de la compra...</span>
      </div>
    );
  }

  if (!compra) {
    return (
      <div className="p-12 text-center text-[#7F8C8D]">
        <p className="text-base font-bold text-[#2C3E50] mb-2">Factura no encontrada</p>
        <Link href="/compras" className="text-[#1A5276] underline text-xs font-semibold">
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#F8F9FA] text-[#2C3E50] border border-[#E2E8F0] text-xs font-semibold transition shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver a Compras</span>
            </Link>

            {compra.estado === 'pendiente' && (
              <button
                onClick={handleAprobarCompra}
                disabled={approving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
              >
                <PackageCheck className="w-4 h-4" />
                <span>{approving ? 'Aprobando...' : 'Aprobar Compra & Cargar Stock'}</span>
              </button>
            )}

            {compra.estado === 'recibida' && pending > 0 && (
              <button
                onClick={() => setPagoModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1A5276] hover:bg-[#154360] text-white text-xs font-bold transition shadow-sm"
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
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Invoice Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-sm">
            <span className="text-[11px] font-semibold text-[#7F8C8D] uppercase tracking-wider block">
              Estado de la Compra
            </span>
            <div className="mt-2">
              {compra.estado === 'pendiente' && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  <Clock className="w-3.5 h-3.5" />
                  Pendiente de Aprobación
                </span>
              )}
              {compra.estado === 'recibida' && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Aprobada (Stock Cargado)
                </span>
              )}
              {compra.estado === 'pagada' && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Pagada (Liquidada)
                </span>
              )}
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-sm">
            <span className="text-[11px] font-semibold text-[#7F8C8D] uppercase tracking-wider block">
              Condición de Pago
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-base font-bold text-[#2C3E50] capitalize">
                {compra.condicion_pago}
              </span>
              {compra.condicion_pago === 'credito' && (
                <span className="text-xs text-amber-700 font-mono font-semibold">
                  ({compra.dias_credito} días)
                </span>
              )}
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-sm">
            <span className="text-[11px] font-semibold text-[#7F8C8D] uppercase tracking-wider block">
              Total Factura
            </span>
            <div className="mt-2">
              <span className="text-xl font-black text-[#2C3E50] font-mono">
                ${Number(compra.total).toFixed(2)} USD
              </span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] border-l-4 border-l-rose-500 shadow-sm">
            <span className="text-[11px] font-semibold text-[#7F8C8D] uppercase tracking-wider block">
              Saldo Pendiente (CxP)
            </span>
            <div className="mt-2">
              <span className="text-xl font-black text-rose-600 font-mono">
                ${Number(pending).toFixed(2)} USD
              </span>
            </div>
          </div>
        </div>

        {/* Supplier & Attachment Section */}
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-bold text-[#2C3E50] flex items-center gap-2 mb-3">
              <Building2 className="w-4 h-4 text-[#1A5276]" />
              Información del Proveedor
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
                <span className="text-[#7F8C8D]">Razón Social:</span>
                <span className="font-semibold text-[#2C3E50]">
                  {compra.proveedor?.nombre || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
                <span className="text-[#7F8C8D]">RIF Fiscal:</span>
                <span className="font-mono font-medium text-[#2C3E50]">{compra.proveedor?.rif || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
                <span className="text-[#7F8C8D]">Fecha de Factura:</span>
                <span className="text-[#2C3E50]">
                  {compra.fecha ? new Date(compra.fecha).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              {compra.proveedor?.id && (
                <div className="pt-2">
                  <Link
                    href={`/proveedores/${compra.proveedor.id}/estado-cuenta`}
                    className="text-xs text-[#1A5276] hover:underline flex items-center gap-1 font-semibold"
                  >
                    <span>Ver Estado de Cuenta Completo del Proveedor</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-[#2C3E50] flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-[#1A5276]" />
              Comprobante Digitalizado en MinIO
            </h4>
            {compra.archivo_url ? (
              <div className="p-4 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center">
                    <FileText className="w-5 h-5 text-[#1A5276]" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#2C3E50] block">Factura Digitalizada</span>
                    <span className="text-[11px] text-[#7F8C8D] font-mono truncate max-w-xs block">
                      {compra.archivo_url}
                    </span>
                  </div>
                </div>
                <a
                  href={getStorageUrl(compra.archivo_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-white border border-[#E2E8F0] hover:bg-[#EDF2F7] text-xs font-semibold text-[#1A5276] flex items-center gap-1 transition shadow-sm"
                >
                  <span>Abrir Documento</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-xs text-[#7F8C8D]">
                Esta compra fue registrada manualmente sin archivo adjunto digitalizado.
              </div>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8F9FA]">
            <h4 className="text-sm font-bold text-[#2C3E50] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#1A5276]" />
              Detalle de Repuestos Facturados
            </h4>
            <span className="text-xs text-[#7F8C8D] font-mono font-medium">
              {compra.detalles?.length || 0} ítems
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F9FA] text-[10px] font-bold text-[#7F8C8D] uppercase tracking-wider border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-3.5 px-4">SKU Interno</th>
                  <th className="py-3.5 px-4">Descripción del Repuesto</th>
                  <th className="py-3.5 px-4 text-right">Cantidad Facturada</th>
                  <th className="py-3.5 px-4 text-right">Costo Unitario ($)</th>
                  <th className="py-3.5 px-4 text-right">Subtotal ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] font-medium">
                {compra.detalles?.map((det) => (
                  <tr key={det.id} className="hover:bg-[#F8FBFF] transition group">
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-[#1A5276] bg-[#EFF6FF] px-2 py-0.5 rounded border border-[#BFDBFE]">
                        {det.sku?.sku_interno || 'N/A'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#2C3E50]">
                      <span className="font-semibold block text-[#2C3E50]">{det.sku?.nombre || 'Ítem'}</span>
                      <span className="text-[11px] text-[#7F8C8D]">Marca: {det.sku?.marca || 'N/A'}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-[#2C3E50]">
                      {det.cantidad} unids.
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[#2C3E50]">
                      ${Number(det.costo_unitario).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-[#2C3E50]">
                      ${Number(det.subtotal).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-[#F8F9FA] font-bold border-t border-[#E2E8F0]">
                <tr>
                  <td colSpan={4} className="py-3.5 px-4 text-right text-[#7F8C8D] uppercase text-xs">
                    Total Facturado:
                  </td>
                  <td className="py-3.5 px-4 text-right text-base text-[#2C3E50] font-mono">
                    ${Number(compra.total).toFixed(2)} USD
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Payments History Table */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8F9FA]">
            <h4 className="text-sm font-bold text-[#2C3E50] flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              Historial de Pagos & Abonos a esta Factura
            </h4>
            {compra.estado === 'recibida' && pending > 0 && (
              <button
                onClick={() => setPagoModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-[#1A5276] hover:bg-[#154360] text-white text-xs font-semibold transition shadow-sm"
              >
                + Registrar Pago
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F9FA] text-[10px] font-bold text-[#7F8C8D] uppercase tracking-wider border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-3.5 px-4">Fecha Pago</th>
                  <th className="py-3.5 px-4">Método</th>
                  <th className="py-3.5 px-4">Referencia / Comprobante</th>
                  <th className="py-3.5 px-4 text-right">Monto Abonado ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] font-medium">
                {!compra.pagos || compra.pagos.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-[#7F8C8D]">
                      No se han registrado pagos para esta factura.
                    </td>
                  </tr>
                ) : (
                  compra.pagos.map((pago) => (
                    <tr key={pago.id} className="hover:bg-[#F8FBFF] transition group">
                      <td className="py-3 px-4 text-[#7F8C8D]">
                        {new Date(pago.fecha).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 capitalize text-[#2C3E50] font-medium">
                        {pago.metodo}
                      </td>
                      <td className="py-3 px-4 font-mono text-[#7F8C8D]">
                        {pago.referencia || 'Sin referencia'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
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
