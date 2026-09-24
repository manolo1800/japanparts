'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  ProveedorSummary,
  SkuSummary,
  OcrParsedFacturaResult,
  PurchasePaymentCondition,
} from '@japonparts/shared';
import { apiClient } from '../../../../lib/api-client';
import { getStorageUrl } from '../../../../lib/utils';
import { Header } from '../../../../components/header';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  ArrowLeft,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Calculator,
} from 'lucide-react';

interface InvoiceItemForm {
  id: string;
  sku_id: string;
  descripcion: string;
  cantidad: number;
  costo_unitario: number;
}

export default function NuevaCompraPage() {
  const router = useRouter();

  // Mode: 'ocr' | 'manual'
  const [mode, setMode] = useState<'ocr' | 'manual'>('ocr');

  // OCR state
  const [ocrLoading, setOcrLoading] = useState<boolean>(false);
  const [ocrSuccess, setOcrSuccess] = useState<boolean>(false);
  const [archivoUrl, setArchivoUrl] = useState<string | null>(null);

  // Form Header State
  const [proveedorId, setProveedorId] = useState<string>('');
  const [proveedorNombre, setProveedorNombre] = useState<string>('');
  const [proveedorRif, setProveedorRif] = useState<string>('');
  const [numeroFactura, setNumeroFactura] = useState<string>('');
  const [fecha, setFecha] = useState<string>(new Date().toISOString().split('T')[0]);
  const [condicionPago, setCondicionPago] = useState<PurchasePaymentCondition>(
    PurchasePaymentCondition.CONTADO,
  );
  const [diasCredito, setDiasCredito] = useState<number>(0);

  // Form Items State
  const [items, setItems] = useState<InvoiceItemForm[]>([]);

  // Submission state
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch Suppliers for dropdown
  const { data: proveedores = [] } = useQuery<ProveedorSummary[]>({
    queryKey: ['proveedores'],
    queryFn: async () => {
      const res = await apiClient.get<ProveedorSummary[]>('/proveedor');
      return res.data || [];
    },
  });

  // Fetch SKUs for line item selector
  const { data: skuData } = useQuery<{ items: SkuSummary[] }>({
    queryKey: ['skus-all'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/sku', { limit: 100 });
      return res.data;
    },
  });
  const skus = skuData?.items || [];

  // Handle OCR file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setOcrLoading(true);
    setOcrSuccess(false);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await apiClient.upload<OcrParsedFacturaResult>('/compra/ocr', formData);
      const parsed = res.data;

      if (parsed) {
        setOcrSuccess(true);
        if (parsed.archivo_url) setArchivoUrl(parsed.archivo_url);
        if (parsed.numero_factura) setNumeroFactura(parsed.numero_factura);
        if (parsed.fecha) setFecha(parsed.fecha);
        if (parsed.condicion_pago) setCondicionPago(parsed.condicion_pago);
        if (parsed.dias_credito) setDiasCredito(parsed.dias_credito);

        // Proveedor matching
        if (parsed.proveedor_nombre) setProveedorNombre(parsed.proveedor_nombre);
        if (parsed.rif) setProveedorRif(parsed.rif);

        // Try to match existing supplier by RIF or name
        if (parsed.rif || parsed.proveedor_nombre) {
          const match = proveedores.find(
            (p) =>
              (parsed.rif && p.rif.toLowerCase() === parsed.rif.toLowerCase()) ||
              (parsed.proveedor_nombre &&
                p.nombre.toLowerCase().includes(parsed.proveedor_nombre.toLowerCase())),
          );
          if (match) {
            setProveedorId(match.id);
            setProveedorNombre(match.nombre);
            setProveedorRif(match.rif);
          }
        }

        // Map items
        if (parsed.items && parsed.items.length > 0) {
          const newItems: InvoiceItemForm[] = parsed.items.map((item, idx) => {
            // Find SKU matching sku_id_coincidente or sku_interno
            const matchedSku =
              skus.find((s) => s.id === item.sku_id_coincidente) ||
              skus.find(
                (s) =>
                  item.sku_interno &&
                  s.sku_interno.toLowerCase() === item.sku_interno.toLowerCase(),
              );

            return {
              id: `item-${Date.now()}-${idx}`,
              sku_id: matchedSku ? matchedSku.id : '',
              descripcion: item.descripcion || '',
              cantidad: Number(item.cantidad) || 1,
              costo_unitario: Number(item.costo_unitario) || 0,
            };
          });
          setItems(newItems);
        } else {
          // If no items extracted, add one blank row
          setItems([
            {
              id: `item-${Date.now()}-0`,
              sku_id: '',
              descripcion: 'Artículo de factura',
              cantidad: 1,
              costo_unitario: 0,
            },
          ]);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error al procesar el archivo con OCR');
    } finally {
      setOcrLoading(false);
    }
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${prev.length}`,
        sku_id: '',
        descripcion: '',
        cantidad: 1,
        costo_unitario: 0,
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleItemChange = (id: string, field: keyof InvoiceItemForm, value: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          // If selecting SKU, auto-fill description if blank
          if (field === 'sku_id') {
            const selected = skus.find((s) => s.id === value);
            if (selected && !item.descripcion) {
              updated.descripcion = `${selected.nombre} (${selected.sku_interno})`;
            }
          }
          return updated;
        }
        return item;
      }),
    );
  };

  // Calculations
  const subtotal = items.reduce(
    (acc, it) => acc + (Number(it.cantidad) || 0) * (Number(it.costo_unitario) || 0),
    0,
  );
  const total = subtotal;

  const handleSavePurchase = async (autoApprove: boolean) => {
    setError(null);
    setSaving(true);

    try {
      // Validate
      if (!numeroFactura.trim()) throw new Error('El número de factura es obligatorio');
      if (items.length === 0) throw new Error('Debe agregar al menos un ítem a la factura');

      for (const it of items) {
        if (!it.sku_id) {
          throw new Error('Todos los ítems de la factura deben tener un SKU asignado del catálogo');
        }
        if (it.cantidad <= 0 || it.costo_unitario <= 0) {
          throw new Error('Las cantidades y costos unitarios de los ítems deben ser mayores a 0');
        }
      }

      // Determine or create supplier
      let resolvedProveedorId = proveedorId;
      if (!resolvedProveedorId) {
        if (!proveedorNombre.trim() || !proveedorRif.trim()) {
          throw new Error('Debes seleccionar un proveedor existente o ingresar Nombre y RIF');
        }
        // Create supplier on the fly
        const newProvRes = await apiClient.post<ProveedorSummary>('/proveedor', {
          nombre: proveedorNombre.trim(),
          rif: proveedorRif.trim(),
        });
        resolvedProveedorId = newProvRes.data!.id;
      }

      // 1. Create Purchase
      const createRes = await apiClient.post<any>('/compra', {
        proveedor_id: resolvedProveedorId,
        numero_factura: numeroFactura.trim(),
        fecha,
        condicion_pago: condicionPago,
        dias_credito: condicionPago === PurchasePaymentCondition.CREDITO ? diasCredito : 0,
        archivo_url: archivoUrl || undefined,
        items: items.map((it) => ({
          sku_id: it.sku_id,
          cantidad: Number(it.cantidad),
          costo_unitario: Number(it.costo_unitario),
        })),
      });

      const compraCreada = createRes.data!;

      // 2. Auto-approve if selected
      if (autoApprove) {
        await apiClient.post(`/compra/${compraCreada.id}/aprobar`);
      }

      // Redirect to purchase detail
      router.push(`/compras/${compraCreada.id}`);
    } catch (err: any) {
      setError(err.message || 'Error al guardar la compra');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pb-16">
      <Header
        title="Registrar Compra / Factura de Proveedor"
        subtitle="Digitalización automatizada con OCR asistido o captura manual estructurada"
        actionSlot={
          <Link
            href="/compras"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a Compras</span>
          </Link>
        }
      />

      <div className="p-8 max-w-6xl mx-auto space-y-6">
        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <button
            type="button"
            onClick={() => setMode('ocr')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              mode === 'ocr'
                ? 'bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-lg shadow-rose-600/20'
                : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Carga Asistida con OCR (Recomendado)</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('manual')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              mode === 'manual'
                ? 'bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-lg shadow-rose-600/20'
                : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Carga Manual Estructurada</span>
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* OCR File Upload Zone (visible in OCR mode) */}
        {mode === 'ocr' && (
          <div className="glass-card p-6 rounded-2xl border-2 border-dashed border-rose-500/30 hover:border-rose-500/60 transition bg-rose-950/5">
            <div className="flex flex-col items-center justify-center text-center py-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-3">
                <UploadCloud className="w-7 h-7 text-rose-400" />
              </div>

              <h4 className="text-base font-bold text-white mb-1">
                Sube la Factura o Comprobante en PDF / Imagen
              </h4>
              <p className="text-xs text-slate-400 max-w-md mb-4">
                El motor OCR procesará automáticamente el RIF, Nº Factura, ítems de repuestos,
                cantidades y costos unitarios, almacenando el archivo en MinIO.
              </p>

              <label className="cursor-pointer px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-lg shadow-rose-600/25 flex items-center gap-2">
                <span>Seleccionar Archivo (PDF, JPG, PNG)</span>
                <input
                  type="file"
                  accept="application/pdf,image/png,image/jpeg,image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={ocrLoading}
                />
              </label>

              {ocrLoading && (
                <div className="mt-4 flex items-center gap-2.5 text-xs text-rose-300 font-medium">
                  <div className="w-4 h-4 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
                  <span>Digitalizando documento y analizando con OCR...</span>
                </div>
              )}

              {ocrSuccess && (
                <div className="mt-4 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Factura digitalizada exitosamente. Revisa y edita los campos extraídos abajo.</span>
                  {archivoUrl && (
                    <a
                      href={getStorageUrl(archivoUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 underline flex items-center gap-1 text-emerald-300"
                    >
                      <span>Ver archivo</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Invoice Form */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-rose-400" />
              Datos de Cabecera de la Factura
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Identificación del proveedor emisor, número fiscal y condiciones comerciales
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Proveedor Existente */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Proveedor Comercial
              </label>
              <select
                value={proveedorId}
                onChange={(e) => {
                  const id = e.target.value;
                  setProveedorId(id);
                  const p = proveedores.find((item) => item.id === id);
                  if (p) {
                    setProveedorNombre(p.nombre);
                    setProveedorRif(p.rif);
                  }
                }}
                className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              >
                <option value="">-- Registrar Nuevo o Seleccionar --</option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} ({p.rif})
                  </option>
                ))}
              </select>
            </div>

            {/* Proveedor Nombre (si es nuevo o extraído por OCR) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Nombre / Razón Social *
              </label>
              <input
                type="text"
                required
                value={proveedorNombre}
                onChange={(e) => setProveedorNombre(e.target.value)}
                placeholder="Distribuidora ToyoPartes C.A."
                className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            {/* RIF */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                RIF / Identificación Fiscal *
              </label>
              <input
                type="text"
                required
                value={proveedorRif}
                onChange={(e) => setProveedorRif(e.target.value)}
                placeholder="J-30495822-1"
                className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
              />
            </div>

            {/* Número de Factura */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Nº de Factura / Control *
              </label>
              <input
                type="text"
                required
                value={numeroFactura}
                onChange={(e) => setNumeroFactura(e.target.value)}
                placeholder="FAC-2024-001"
                className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 font-mono font-bold"
              />
            </div>

            {/* Fecha */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Fecha de Emisión *
              </label>
              <input
                type="date"
                required
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
              />
            </div>

            {/* Condición de Pago */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Condición de Pago *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCondicionPago(PurchasePaymentCondition.CONTADO)}
                  className={`py-2 px-3 rounded-lg border text-xs font-semibold transition ${
                    condicionPago === PurchasePaymentCondition.CONTADO
                      ? 'bg-rose-500/10 border-rose-500 text-rose-400'
                      : 'bg-slate-900/40 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  Contado
                </button>
                <button
                  type="button"
                  onClick={() => setCondicionPago(PurchasePaymentCondition.CREDITO)}
                  className={`py-2 px-3 rounded-lg border text-xs font-semibold transition ${
                    condicionPago === PurchasePaymentCondition.CREDITO
                      ? 'bg-rose-500/10 border-rose-500 text-rose-400'
                      : 'bg-slate-900/40 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  Crédito
                </button>
              </div>
            </div>

            {/* Días de Crédito (si aplica) */}
            {condicionPago === PurchasePaymentCondition.CREDITO && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Días de Crédito (Plazo de Pago)
                </label>
                <input
                  type="number"
                  min="1"
                  value={diasCredito}
                  onChange={(e) => setDiasCredito(parseInt(e.target.value) || 0)}
                  placeholder="30"
                  className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>
            )}
          </div>

          {/* Line items section */}
          <div className="border-t border-slate-800 pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-emerald-400" />
                  Líneas de la Factura (Repuestos & SKUs)
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Asigna a cada ítem de la factura un SKU del catálogo maestro para actualizar su
                  stock y costo promedio.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Línea</span>
              </button>
            </div>

            {/* Table */}
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3 w-1/3">SKU Catálogo Maestro *</th>
                    <th className="py-2.5 px-3">Descripción en Factura</th>
                    <th className="py-2.5 px-3 w-24 text-right">Cantidad *</th>
                    <th className="py-2.5 px-3 w-32 text-right">Costo Unit ($) *</th>
                    <th className="py-2.5 px-3 w-28 text-right">Subtotal</th>
                    <th className="py-2.5 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No hay ítems registrados. Sube una factura con OCR o haz clic en "Agregar
                        Línea".
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => {
                      const lineSubtotal =
                        (Number(item.cantidad) || 0) * (Number(item.costo_unitario) || 0);

                      return (
                        <tr key={item.id} className="hover:bg-slate-800/20">
                          <td className="py-2.5 px-3">
                            <select
                              value={item.sku_id}
                              onChange={(e) =>
                                handleItemChange(item.id, 'sku_id', e.target.value)
                              }
                              className="w-full bg-slate-900/90 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
                            >
                              <option value="">-- Seleccionar SKU --</option>
                              {skus.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.sku_interno} — {s.nombre} (Stock: {s.stock_actual} | Costo act:
                                  ${s.costo_promedio})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              value={item.descripcion}
                              onChange={(e) =>
                                handleItemChange(item.id, 'descripcion', e.target.value)
                              }
                              placeholder="Descripción del repuesto"
                              className="w-full bg-slate-900/60 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <input
                              type="number"
                              min="1"
                              value={item.cantidad}
                              onChange={(e) =>
                                handleItemChange(
                                  item.id,
                                  'cantidad',
                                  parseInt(e.target.value) || 0,
                                )
                              }
                              className="w-full bg-slate-900/60 border border-slate-700/80 rounded-lg px-2 py-1.5 text-xs text-white text-right focus:outline-none focus:border-rose-500 font-mono"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              value={item.costo_unitario}
                              onChange={(e) =>
                                handleItemChange(
                                  item.id,
                                  'costo_unitario',
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                              className="w-full bg-slate-900/60 border border-slate-700/80 rounded-lg px-2 py-1.5 text-xs text-white text-right focus:outline-none focus:border-rose-500 font-mono"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                            ${lineSubtotal.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Total Footer */}
            <div className="mt-4 flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <ShieldCheck className="w-4 h-4 text-rose-400 shrink-0" />
                <span>
                  Al aprobar la compra, se aumentará el stock físico y se recalculará el costo
                  promedio ponderado según la fórmula oficial:
                  <span className="font-mono text-slate-300 ml-1">
                    ((costo_ant * stock_ant) + (costo_nuevo * cant)) / stock_total
                  </span>
                </span>
              </div>

              <div className="flex items-baseline gap-4 shrink-0">
                <span className="text-xs text-slate-400 uppercase font-semibold">
                  Total Factura:
                </span>
                <span className="text-2xl font-black text-white font-mono">
                  ${total.toFixed(2)} USD
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <Link
              href="/compras"
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
            >
              Cancelar
            </Link>

            <button
              type="button"
              disabled={saving || items.length === 0}
              onClick={() => handleSavePurchase(false)}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition border border-slate-700 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar como Borrador (Pendiente)'}
            </button>

            <button
              type="button"
              disabled={saving || items.length === 0}
              onClick={() => handleSavePurchase(true)}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/25 flex items-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{saving ? 'Procesando...' : 'Guardar y Aprobar Inmediatamente'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
