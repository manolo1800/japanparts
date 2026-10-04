'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  OrdenCompraSummary,
  PurchaseOrderStatus,
} from '@japonparts/shared';
import { apiClient } from '../../../../../lib/api-client';
import { getStorageUrl } from '../../../../../lib/utils';
import { Header } from '../../../../../components/header';
import { EnviarOrdenModal } from '../../../../../components/enviar-orden-modal';
import {
  ArrowLeft,
  FileText,
  Building2,
  Download,
  Send,
  CheckCircle2,
  ExternalLink,
  PackageCheck,
  AlertCircle,
} from 'lucide-react';

export default function OrdenCompraDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [sendModalOpen, setSendModalOpen] = useState<boolean>(false);
  const [converting, setConverting] = useState<boolean>(false);
  const [convertError, setConvertError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const {
    data: orden,
    isLoading,
    refetch,
  } = useQuery<OrdenCompraSummary>({
    queryKey: ['orden-compra', id],
    queryFn: async () => {
      const res = await apiClient.get<OrdenCompraSummary>(`/orden-compra/${id}`);
      return res.data!;
    },
    enabled: !!id,
  });

  const handleDownloadPdf = async () => {
    if (!orden) return;
    try {
      await apiClient.downloadFile(
        `/orden-compra/${orden.id}/pdf`,
        `Orden_Compra_${orden.numero_orden}.pdf`,
      );
    } catch (err: any) {
      alert(`Error descargando PDF: ${err.message || err}`);
    }
  };

  const handleConvertirAFactura = async () => {
    if (!orden) return;
    if (
      !confirm(
        `¿Deseas convertir esta orden (${orden.numero_orden}) en Factura de Compra? Esto registrará la factura en el módulo de compras para su posterior recepción de inventario y pago.`,
      )
    ) {
      return;
    }

    setConverting(true);
    setConvertError(null);
    setSuccessMsg(null);

    try {
      const res = await apiClient.post<any>(`/orden-compra/${orden.id}/convertir-a-factura`);
      const compra = res.data;
      setSuccessMsg(`¡Orden convertida con éxito a Factura de Compra #${compra.numero_factura}!`);
      refetch();
      setTimeout(() => {
        router.push(`/compras/${compra.id}`);
      }, 1200);
    } catch (err: any) {
      setConvertError(err.message || 'Error al convertir la orden a factura');
    } finally {
      setConverting(false);
    }
  };

  const handleUpdateEstado = async (nuevoEstado: PurchaseOrderStatus) => {
    if (!orden) return;
    try {
      await apiClient.patch(`/orden-compra/${orden.id}/estado`, {
        estado: nuevoEstado,
      });
      refetch();
    } catch (err: any) {
      alert(`Error al actualizar estado: ${err.message || err}`);
    }
  };

  if (isLoading) {
    return (
      <div className="p-16 text-center text-slate-500">
        <div className="w-8 h-8 border-2 border-[#1A5276] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <span className="text-xs">Cargando detalles de la orden de compra...</span>
      </div>
    );
  }

  if (!orden) {
    return (
      <div className="p-16 text-center text-slate-500">
        <p className="text-base font-bold text-slate-800 mb-2">Orden de compra no encontrada</p>
        <Link href="/compras" className="text-[#1A5276] underline text-xs font-semibold">
          Regresar a Compras
        </Link>
      </div>
    );
  }

  const pdfUrl = orden.archivo_pdf_url
    ? getStorageUrl(orden.archivo_pdf_url)
    : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/orden-compra/${orden.id}/pdf`;

  const totalUnidades = (orden.detalles || []).reduce((acc, d) => acc + (d.cantidad || 0), 0);

  return (
    <div className="pb-20">
      <Header
        title={`Orden de Compra #${orden.numero_orden}`}
        subtitle={`Proveedor: ${orden.proveedor?.nombre || 'Proveedor'} — Fecha de Realización: ${new Date(orden.fecha_emision).toLocaleDateString('es-VE')}`}
        onRefresh={() => refetch()}
        actionSlot={
          <div className="flex items-center gap-2">
            <Link
              href="/compras"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver</span>
            </Link>

            <button
              onClick={() => setSendModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm shadow-emerald-600/20"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Enviar al Proveedor (WhatsApp / Email)</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1A5276] hover:bg-[#154360] text-white text-xs font-bold transition shadow-sm shadow-[#1A5276]/20"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar PDF</span>
            </button>
          </div>
        }
      />

      <div className="p-8 max-w-7xl mx-auto space-y-6">
        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
        )}

        {convertError && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{convertError}</span>
          </div>
        )}

        {/* Top Status & Dispatch Bar */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                Estado Actual de la Orden:
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`text-xs px-3 py-1 rounded-full font-bold uppercase border ${
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

                {/* Status action buttons */}
                {orden.estado !== 'recibida' && orden.estado !== 'cancelada' && (
                  <div className="flex items-center gap-1.5 ml-2">
                    {orden.estado !== 'confirmada' && (
                      <button
                        onClick={() => handleUpdateEstado(PurchaseOrderStatus.CONFIRMADA)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition"
                      >
                        Marcar Confirmada
                      </button>
                    )}
                    <button
                      onClick={() => handleUpdateEstado(PurchaseOrderStatus.CANCELADA)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Email dispatch status */}
            <div className="border-l border-slate-200 pl-4 ml-2">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                Envío por Correo:
              </span>
              <div className="flex items-center gap-1.5 mt-1 text-xs">
                {orden.enviado_email ? (
                  <span className="text-blue-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Enviado a {orden.enviado_email_a}</span>
                  </span>
                ) : (
                  <span className="text-slate-400 italic">No enviado aún</span>
                )}
              </div>
            </div>

            {/* WhatsApp dispatch status */}
            <div className="border-l border-slate-200 pl-4 ml-2">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                Envío por WhatsApp:
              </span>
              <div className="flex items-center gap-1.5 mt-1 text-xs">
                {orden.enviado_whatsapp ? (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Enviado a +{orden.enviado_whatsapp_a}</span>
                  </span>
                ) : (
                  <span className="text-slate-400 italic">No enviado aún</span>
                )}
              </div>
            </div>
          </div>

          {/* Workflow conversion button */}
          <div>
            {orden.compra_id ? (
              <Link
                href={`/compras/${orden.compra_id}`}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-xs font-bold transition"
              >
                <PackageCheck className="w-4 h-4 text-purple-600" />
                <span>Ver Factura de Compra Vinculada</span>
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </Link>
            ) : (
              <button
                onClick={handleConvertirAFactura}
                disabled={converting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm shadow-indigo-600/20"
                title="Genera una Factura de Compra en el sistema a partir de esta orden"
              >
                {converting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Convirtiendo a Factura...</span>
                  </>
                ) : (
                  <>
                    <PackageCheck className="w-4 h-4" />
                    <span>Recibir Mercancía (Convertir a Factura)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* 2-Columns Grid: Left (Details & Items) - Right (PDF Viewer) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Data & Table (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Supplier & Order Info Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-[#1A5276] uppercase tracking-wider border-b border-slate-100 pb-2">
                <Building2 className="w-4 h-4" />
                <span>Datos del Proveedor & Despacho</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                    Proveedor:
                  </span>
                  <span className="text-sm font-bold text-slate-800">
                    {orden.proveedor?.nombre || 'Proveedor'}
                  </span>
                  <span className="text-slate-500 font-mono block mt-0.5">
                    RIF: {orden.proveedor?.rif || 'N/A'}
                  </span>
                  {orden.proveedor?.contacto && (
                    <span className="text-slate-600 block mt-0.5">
                      Contacto: {orden.proveedor.contacto}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                      Teléfono / WhatsApp:
                    </span>
                    <span className="font-semibold text-emerald-700">
                      {orden.proveedor?.telefono || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                      Email de Envío:
                    </span>
                    <span className="font-semibold text-blue-700">
                      {orden.proveedor?.email || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {orden.observaciones && (
                <div className="pt-2 border-t border-slate-100 text-xs">
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold mb-0.5">
                    Instrucciones / Observaciones:
                  </span>
                  <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200 italic">
                    "{orden.observaciones}"
                  </p>
                </div>
              )}
            </div>

            {/* Line Items Table Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Artículos Requeridos ({orden.detalles?.length || 0} líneas)
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  {totalUnidades} unidades en total
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8F9FA] text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 w-8">#</th>
                      <th className="py-2.5 px-3 w-36">Código / SKU</th>
                      <th className="py-2.5 px-3">Descripción del Producto</th>
                      <th className="py-2.5 px-3 w-28 text-center">Cant. Solicitada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {orden.detalles?.map((det, idx) => (
                      <tr key={det.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-3 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-3 px-3 font-mono font-bold text-[#1A5276]">
                          {det.codigo_articulo}
                        </td>
                        <td className="py-3 px-3 text-slate-800">
                          <span className="font-semibold block">{det.descripcion}</span>
                          <div className="flex items-center gap-1.5 flex-wrap mt-1">
                            {(det.marca || det.sku?.marca) && (
                              <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold border border-slate-200">
                                Marca: <strong className="text-slate-900">{det.marca || det.sku?.marca}</strong>
                              </span>
                            )}
                            {det.marca_compatibilidad && (
                              <span className="inline-block px-2 py-0.5 rounded bg-blue-50 text-[#1A5276] border border-blue-200 text-[11px] font-mono font-bold">
                                {det.marca_compatibilidad}
                              </span>
                            )}
                          </div>
                          {det.sku && (
                            <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                              SKU: {det.sku.sku_interno} (Stock actual: {det.sku.stock_actual})
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-base text-[#1A5276]">
                          {det.cantidad}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-200 text-xs font-bold text-slate-800">
                    <tr>
                      <td colSpan={3} className="py-3 px-4 text-right">
                        Total Unidades Solicitadas:
                      </td>
                      <td className="py-3 px-4 text-center text-base text-[#1A5276] font-mono">
                        {totalUnidades} unds.
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column: PDF Preview (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <FileText className="w-4 h-4 text-amber-500" />
                  <span>Vista Previa del PDF Oficial</span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-[#1A5276] hover:underline flex items-center gap-1 font-semibold"
                  >
                    <span>Abrir en ventana</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* PDF Embed / Iframe */}
              <div className="w-full h-[650px] bg-slate-100 rounded-xl overflow-hidden border border-slate-200 relative">
                <iframe
                  src={`${pdfUrl}#toolbar=0&navpanes=0`}
                  title={`PDF Orden ${orden.numero_orden}`}
                  className="w-full h-full"
                />
              </div>

              {/* Quick dispatch bar below preview */}
              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setSendModalOpen(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Compartir con Proveedor</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition border border-slate-200"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Descargar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enviar Modal */}
      <EnviarOrdenModal
        orden={orden}
        isOpen={sendModalOpen}
        onClose={() => setSendModalOpen(false)}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
