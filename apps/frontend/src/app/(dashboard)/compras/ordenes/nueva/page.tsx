'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  ProveedorSummary,
  SkuSummary,
  CreateOrdenCompraDto,
} from '@japonparts/shared';
import { apiClient } from '../../../../../lib/api-client';
import { Header } from '../../../../../components/header';
import {
  ArrowLeft,
  Plus,
  Trash2,
  FileText,
  Building2,
  Calendar,
  AlertCircle,
  Package,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface LineItemForm {
  id: string;
  sku_id: string;
  codigo_articulo: string;
  descripcion: string;
  marca?: string;
  marca_compatibilidad: string;
  cantidad: number;
}

export default function NuevaOrdenCompraPage() {
  const router = useRouter();

  // Provider & Header
  const [proveedorId, setProveedorId] = useState<string>('');
  const [fechaEmision, setFechaEmision] = useState<string>(
    new Date().toISOString().split('T')[0],
  );
  const [fechaEntregaEsperada, setFechaEntregaEsperada] = useState<string>('');
  const [observaciones, setObservaciones] = useState<string>(
    'Despachar según las cantidades requeridas a nuestro almacén principal en Los Ruices. Agradecemos confirmar disponibilidad y enviar cotización formal.',
  );

  // Line Items
  const [items, setItems] = useState<LineItemForm[]>([
    {
      id: 'item-1',
      sku_id: '',
      codigo_articulo: '',
      descripcion: '',
      marca_compatibilidad: '',
      cantidad: 1,
    },
  ]);

  // Submission state
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch Providers
  const { data: proveedores = [] } = useQuery<ProveedorSummary[]>({
    queryKey: ['proveedores'],
    queryFn: async () => {
      const res = await apiClient.get<ProveedorSummary[]>('/proveedor');
      return res.data || [];
    },
  });

  // Fetch SKUs for catalogue autocomplete
  const { data: skuData } = useQuery<{ items: SkuSummary[] }>({
    queryKey: ['skus-picker'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/sku', { limit: 150 });
      return res.data;
    },
  });
  const skus = skuData?.items || [];

  const selectedProveedor = proveedores.find((p) => p.id === proveedorId);

  // Add Item row
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        sku_id: '',
        codigo_articulo: '',
        descripcion: '',
        marca_compatibilidad: '',
        cantidad: 1,
      },
    ]);
  };

  // Remove Item row
  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      alert('La orden de compra debe contener al menos un artículo.');
      return;
    }
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Update item field
  const handleItemChange = (index: number, field: keyof LineItemForm, value: any) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // When SKU is picked from selector
  const handleSelectSku = (index: number, skuId: string) => {
    const picked = skus.find((s) => s.id === skuId);
    if (!picked) return;

    // Usar el campo marca de la tabla sku
    const marca = (picked.marca || '').trim();
    // 3 primeros registros de la tabla compatibilidad
    const primerosTres = (picked.compatibilidades || [])
      .slice(0, 3)
      .map((c) => c.modelo?.trim())
      .filter(Boolean);
    const marcaCompatibilidad = [marca, ...primerosTres]
      .filter(Boolean)
      .join('/');

    setItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        sku_id: picked.id,
        codigo_articulo: picked.sku_interno,
        descripcion: picked.nombre,
        marca: marca,
        marca_compatibilidad: marcaCompatibilidad,
      };
      return next;
    });
  };

  // Quick populate items with low stock
  const handleAddLowStockItems = () => {
    const lowStock = skus.filter(
      (s) => (s.stock_actual ?? 0) <= (s.stock_minimo ?? 0),
    );
    if (lowStock.length === 0) {
      alert('No se encontraron repuestos con stock por debajo del mínimo.');
      return;
    }

    const newRows: LineItemForm[] = lowStock.map((s, idx) => {
      const marca = (s.marca || '').trim();
      const primerosTres = (s.compatibilidades || [])
        .slice(0, 3)
        .map((c) => c.modelo?.trim())
        .filter(Boolean);
      const marcaCompatibilidad = [marca, ...primerosTres]
        .filter(Boolean)
        .join('/');

      return {
        id: `low-${s.id}-${idx}`,
        sku_id: s.id,
        codigo_articulo: s.sku_interno,
        descripcion: s.nombre,
        marca: marca,
        marca_compatibilidad: marcaCompatibilidad,
        cantidad: Math.max(1, (s.stock_minimo ?? 5) - (s.stock_actual ?? 0) + 2),
      };
    });

    setItems((prev) => {
      const filteredPrev = prev.filter((p) => p.descripcion.trim() !== '');
      return [...filteredPrev, ...newRows];
    });
  };

  // Calculations
  const totalUnidades = items.reduce((acc, it) => acc + (Number(it.cantidad) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!proveedorId) {
      setError('Debes seleccionar un proveedor para la orden de compra');
      return;
    }

    const validItems = items.filter((it) => it.descripcion.trim().length > 0);
    if (validItems.length === 0) {
      setError('Debes agregar al menos un artículo válido con descripción');
      return;
    }

    setSaving(true);

    try {
      const payload: CreateOrdenCompraDto = {
        proveedor_id: proveedorId,
        fecha_emision: fechaEmision,
        fecha_entrega_esperada: fechaEntregaEsperada || undefined,
        observaciones: observaciones.trim() || undefined,
        items: validItems.map((it) => ({
          sku_id: it.sku_id || undefined,
          codigo_articulo: it.codigo_articulo.trim() || undefined,
          descripcion: it.descripcion.trim(),
          marca: it.marca?.trim() || undefined,
          marca_compatibilidad: it.marca_compatibilidad.trim() || undefined,
          cantidad: Number(it.cantidad) || 1,
          costo_unitario: 0,
          subtotal: 0,
        })),
      };

      const res = await apiClient.post<any>('/orden-compra', payload);
      const created = res.data;

      // Redirect to the newly created purchase order detail page
      router.push(`/compras/ordenes/${created.id}`);
    } catch (err: any) {
      setError(err.message || 'Error al guardar la orden de compra');
      setSaving(false);
    }
  };

  return (
    <div className="pb-20">
      <Header
        title="Nueva Orden de Compra"
        subtitle="Genera requisición formal en PDF con membrete y opción de envío por WhatsApp o Correo"
        actionSlot={
          <Link
            href="/compras"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a Compras</span>
          </Link>
        }
      />

      <div className="p-8 max-w-6xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Proveedor y Datos Generales */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-sm font-bold text-[#1A5276]">
                <Building2 className="w-4 h-4" />
                <span>1. Información del Proveedor y Fecha</span>
              </div>
              <span className="text-xs text-slate-500 font-mono">
                N° de Orden: (Autogenerado correlativo)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Proveedor Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Proveedor Destinatario *
                </label>
                <select
                  required
                  value={proveedorId}
                  onChange={(e) => setProveedorId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#1A5276] focus:outline-none bg-white font-medium"
                >
                  <option value="">-- Seleccionar Proveedor --</option>
                  {proveedores.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} (RIF: {p.rif})
                    </option>
                  ))}
                </select>
              </div>

              {/* Fecha Realización */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Fecha de Realización *
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="date"
                    required
                    value={fechaEmision}
                    onChange={(e) => setFechaEmision(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#1A5276] focus:outline-none font-medium"
                  />
                </div>
              </div>

              {/* Fecha Requerida / Estimada */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Fecha Requerida de Despacho (Opcional)
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="date"
                    value={fechaEntregaEsperada}
                    onChange={(e) => setFechaEntregaEsperada(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#1A5276] focus:outline-none font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Selected Supplier Card Preview */}
            {selectedProveedor && (
              <div className="p-4 bg-[#F8FBFF] border border-[#BFDBFE] rounded-xl text-xs grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                    Razón Social:
                  </span>
                  <span className="font-bold text-slate-800">{selectedProveedor.nombre}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                    RIF:
                  </span>
                  <span className="font-mono text-slate-800">{selectedProveedor.rif}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                    Teléfono / WhatsApp:
                  </span>
                  <span className="font-semibold text-emerald-700">
                    {selectedProveedor.telefono || 'Sin teléfono'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                    Correo Electrónico:
                  </span>
                  <span className="font-semibold text-blue-700">
                    {selectedProveedor.email || 'Sin correo'}
                  </span>
                </div>
              </div>
            )}

            {/* Observaciones */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Instrucciones u Observaciones para el Proveedor:
              </label>
              <textarea
                rows={2}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Indica condiciones de entrega, horario de almacén, etc."
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#1A5276] focus:outline-none font-normal"
              />
            </div>
          </div>

          {/* Section 2: Lista de Artículos Requeridos */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-sm font-bold text-[#1A5276]">
                <Package className="w-4 h-4" />
                <span>2. Lista de Artículos Requeridos</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold ml-2">
                  {items.length} {items.length === 1 ? 'ítem' : 'ítems'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddLowStockItems}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Autocargar Stock Bajo</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddItem}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A5276] hover:bg-[#154360] text-white text-xs font-bold transition shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Agregar Fila</span>
                </button>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 w-10">#</th>
                    <th className="py-2.5 px-3 w-56">Seleccionar del Catálogo</th>
                    <th className="py-2.5 px-3 w-36">Código / SKU</th>
                    <th className="py-2.5 px-3">Descripción del Repuesto Requerido *</th>
                    <th className="py-2.5 px-3 w-28 text-center">Cantidad Solicitada *</th>
                    <th className="py-2.5 px-3 w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {items.map((item, idx) => {
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-3 text-slate-400 font-mono">{idx + 1}</td>

                        {/* SKU Selector Dropdown */}
                        <td className="py-3 px-3">
                          <select
                            value={item.sku_id}
                            onChange={(e) => handleSelectSku(idx, e.target.value)}
                            className="w-full p-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-[#1A5276] focus:outline-none bg-white truncate"
                          >
                            <option value="">-- Manual o Catálogo --</option>
                            {skus.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.sku_interno} — {s.nombre}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* SKU Code */}
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            value={item.codigo_articulo}
                            onChange={(e) => handleItemChange(idx, 'codigo_articulo', e.target.value)}
                            placeholder="SKU-XXXX"
                            className="w-full p-2 rounded-lg border border-slate-200 text-xs font-mono font-bold text-slate-700 focus:ring-1 focus:ring-[#1A5276] focus:outline-none"
                          />
                        </td>

                        {/* Description & Marca/Compatibilidad */}
                        <td className="py-3 px-3">
                          <div className="space-y-1.5">
                            <input
                              type="text"
                              required
                              value={item.descripcion}
                              onChange={(e) =>
                                handleItemChange(idx, 'descripcion', e.target.value)
                              }
                              placeholder="Descripción detallada del repuesto..."
                              className="w-full p-2 rounded-lg border border-slate-200 text-xs text-slate-800 focus:ring-1 focus:ring-[#1A5276] focus:outline-none"
                            />
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {item.marca && (
                                <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold border border-slate-200 shrink-0">
                                  Marca: <strong className="text-slate-900">{item.marca}</strong>
                                </span>
                              )}
                              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider shrink-0">
                                Marca / 3 Primeros Carros:
                              </span>
                              <input
                                type="text"
                                value={item.marca_compatibilidad}
                                onChange={(e) =>
                                  handleItemChange(
                                    idx,
                                    'marca_compatibilidad',
                                    e.target.value,
                                  )
                                }
                                placeholder="ej: GM/AVEO/OPTRA/CORSA"
                                className="flex-1 min-w-[180px] px-2 py-1 rounded-md border border-slate-200 text-[11px] font-mono font-bold text-[#1A5276] bg-blue-50/60 focus:ring-1 focus:ring-[#1A5276] focus:outline-none"
                              />
                            </div>
                          </div>
                        </td>

                        {/* Quantity */}
                        <td className="py-3 px-3">
                          <input
                            type="number"
                            min={1}
                            required
                            value={item.cantidad}
                            onChange={(e) =>
                              handleItemChange(idx, 'cantidad', Math.max(1, parseInt(e.target.value) || 1))
                            }
                            className="w-full p-2 rounded-lg border border-slate-200 text-xs text-center font-bold text-[#1A5276] focus:ring-1 focus:ring-[#1A5276] focus:outline-none"
                          />
                        </td>

                        {/* Action delete */}
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Eliminar fila"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="pt-2 flex justify-start">
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[#1A5276] hover:bg-blue-50 border border-dashed border-[#1A5276]/30 text-xs font-semibold transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar otra línea de producto</span>
              </button>
            </div>
          </div>

          {/* Section 3: Totals & Submit */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>El sistema generará automáticamente el PDF oficial con el membrete Tokugawa.</span>
              </div>
              <p className="text-[11px] text-slate-500 pl-6">
                En las órdenes de compra no se fijan montos; el proveedor cotiza o factura los precios correspondientes.
              </p>
            </div>

            <div className="flex items-center gap-6 w-full md:w-auto justify-end">
              <div className="text-right">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                  Total Solicitado ({items.length} {items.length === 1 ? 'ítem' : 'ítems'})
                </span>
                <span className="text-2xl font-bold font-mono text-[#1A5276]">
                  {totalUnidades} unds.
                </span>
                <span className="text-[10px] text-slate-400 block font-medium">Precios a cotizar por el Proveedor</span>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#1A5276] hover:bg-[#154360] disabled:opacity-50 text-white text-xs font-bold transition shadow-lg shadow-[#1A5276]/20"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Generando Requisición y PDF...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 text-amber-300" />
                    <span>Crear Orden de Compra</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
