'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { SkuSummary } from '@japonparts/shared';
import { apiClient } from '../../../../../lib/api-client';
import { Header } from '../../../../../components/header';
import {
  ArrowLeft,
  Save,
  AlertCircle,
  Tag,
  DollarSign,
  Package,
  MapPin,
  FileText,
  Check,
  X,
} from 'lucide-react';
import Link from 'next/link';

export default function EditarSkuPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [skuInterno, setSkuInterno] = useState('');
  const [nombre, setNombre] = useState('');
  const [marca, setMarca] = useState('');
  const [codigoFabricante, setCodigoFabricante] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [costoPromedio, setCostoPromedio] = useState<number | string>(0);
  const [precioBase, setPrecioBase] = useState<number | string>(0);
  const [stockActual, setStockActual] = useState<number | string>(0);
  const [stockMinimo, setStockMinimo] = useState<number | string>(5);
  const [ubicacion, setUbicacion] = useState('');
  const [activo, setActivo] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: sku, isLoading, refetch } = useQuery<SkuSummary>({
    queryKey: ['sku', id],
    queryFn: async () => {
      const res = await apiClient.get<SkuSummary>(`/sku/${id}`);
      return res.data!;
    },
  });

  useEffect(() => {
    if (sku) {
      setSkuInterno(sku.sku_interno || '');
      setNombre(sku.nombre || '');
      setMarca(sku.marca || '');
      setCodigoFabricante(sku.codigo_fabricante || '');
      setDescripcion(sku.descripcion || '');
      setCostoPromedio(sku.costo_promedio ?? 0);
      setPrecioBase(sku.precio_base ?? 0);
      setStockActual(sku.stock_actual ?? 0);
      setStockMinimo(sku.stock_minimo ?? 5);
      setUbicacion(sku.ubicacion || '');
      setActivo(sku.activo !== undefined ? sku.activo : true);
    }
  }, [sku]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      await apiClient.put(`/sku/${id}`, {
        sku_interno: skuInterno.trim().toUpperCase(),
        nombre: nombre.trim(),
        marca: marca.trim(),
        codigo_fabricante: codigoFabricante.trim() || undefined,
        descripcion: descripcion.trim() || undefined,
        costo_promedio: Number(costoPromedio) || 0,
        precio_base: Number(precioBase) || 0,
        stock_actual: Number(stockActual) || 0,
        stock_minimo: Number(stockMinimo) || 0,
        ubicacion: ubicacion.trim() || undefined,
        activo: Boolean(activo),
      });

      router.push(`/inventario/${id}`);
    } catch (err: any) {
      setError(err.message || 'Error al actualizar los datos del SKU');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-[#1A5276] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-16">
      <Header
        title={`Editar SKU: ${sku?.sku_interno || ''}`}
        subtitle="Edición completa de datos maestros del repuesto"
        showNewSkuBtn={false}
      />

      <div className="p-8 max-w-4xl mx-auto">
        <Link
          href={`/inventario/${id}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#7F8C8D] hover:text-[#1A5276] transition mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a la Ficha del Repuesto</span>
        </Link>

        <div className="bg-white p-8 rounded-2xl border border-[#E2E8F0] shadow-sm">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Section 1: Identificación Maestro */}
            <div>
              <div className="flex items-center gap-2 font-bold text-[#2C3E50] uppercase tracking-wider text-xs mb-4 pb-2 border-b border-slate-100">
                <Tag className="w-4 h-4 text-[#1A5276]" />
                <span>Identificación y Clasificación</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#2C3E50] uppercase tracking-wider mb-2">
                    SKU Interno *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: DEN-YKT22"
                    value={skuInterno}
                    onChange={(e) => setSkuInterno(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-[#1A5276] font-mono font-bold text-sm focus:outline-none focus:border-[#4A90E2] focus:bg-white transition uppercase"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-[#2C3E50] uppercase tracking-wider mb-2">
                    Nombre del Repuesto *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Bujía de Iridio Denso YKT22 Power"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-[#2C3E50] text-sm focus:outline-none focus:border-[#4A90E2] focus:bg-white transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-xs font-bold text-[#2C3E50] uppercase tracking-wider mb-2">
                    Marca de la Pieza *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Denso, Bosch, NGK..."
                    value={marca}
                    onChange={(e) => setMarca(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-[#2C3E50] text-sm focus:outline-none focus:border-[#4A90E2] focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2C3E50] uppercase tracking-wider mb-2">
                    Código de Fabricante / OEM
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: 90919-01247"
                    value={codigoFabricante}
                    onChange={(e) => setCodigoFabricante(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-[#2C3E50] font-mono text-sm focus:outline-none focus:border-[#4A90E2] focus:bg-white transition"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Precios y Existencias */}
            <div>
              <div className="flex items-center gap-2 font-bold text-[#2C3E50] uppercase tracking-wider text-xs mb-4 pb-2 border-b border-slate-100">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>Precios y Existencias de Inventario</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#2C3E50] uppercase tracking-wider mb-2">
                    Precio Base ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={precioBase}
                    onChange={(e) => setPrecioBase(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-[#2C3E50] font-mono text-sm focus:outline-none focus:border-[#4A90E2] focus:bg-white transition font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2C3E50] uppercase tracking-wider mb-2">
                    Costo Promedio ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={costoPromedio}
                    onChange={(e) => setCostoPromedio(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-[#2C3E50] font-mono text-sm focus:outline-none focus:border-[#4A90E2] focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2C3E50] uppercase tracking-wider mb-2">
                    Stock Actual
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={stockActual}
                    onChange={(e) => setStockActual(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-[#2C3E50] font-mono text-sm focus:outline-none focus:border-[#4A90E2] focus:bg-white transition font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2C3E50] uppercase tracking-wider mb-2">
                    Stock Mínimo
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={stockMinimo}
                    onChange={(e) => setStockMinimo(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-[#2C3E50] font-mono text-sm focus:outline-none focus:border-[#4A90E2] focus:bg-white transition"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Ubicación y Estado */}
            <div>
              <div className="flex items-center gap-2 font-bold text-[#2C3E50] uppercase tracking-wider text-xs mb-4 pb-2 border-b border-slate-100">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span>Almacenamiento y Disponibilidad</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-[#2C3E50] uppercase tracking-wider mb-2">
                    Ubicación en Bodega / Almacén
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Pasillo A - Estante 3 - Casillero 12"
                    value={ubicacion}
                    onChange={(e) => setUbicacion(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-[#2C3E50] text-sm focus:outline-none focus:border-[#4A90E2] focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2C3E50] uppercase tracking-wider mb-2">
                    Estado Operativo
                  </label>
                  <button
                    type="button"
                    onClick={() => setActivo(!activo)}
                    className={`w-full py-2.5 px-4 rounded-xl border flex items-center justify-between font-semibold text-xs transition ${
                      activo
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                        : 'bg-slate-100 border-slate-300 text-slate-500'
                    }`}
                  >
                    <span>{activo ? 'Activo para Venta' : 'Inactivo / Oculto'}</span>
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-white ${
                        activo ? 'bg-emerald-600' : 'bg-slate-400'
                      }`}
                    >
                      {activo ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Section 4: Descripción */}
            <div>
              <div className="flex items-center gap-2 font-bold text-[#2C3E50] uppercase tracking-wider text-xs mb-2 pb-2 border-b border-slate-100">
                <FileText className="w-4 h-4 text-slate-500" />
                <span>Descripción Detallada</span>
              </div>
              <textarea
                rows={4}
                placeholder="Detalles sobre especificaciones, material, compatibilidad general..."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-[#2C3E50] text-xs focus:outline-none focus:border-[#4A90E2] focus:bg-white transition"
              />
            </div>

            <div className="pt-4 border-t border-[#E2E8F0] flex justify-end gap-3">
              <Link
                href={`/inventario/${id}`}
                className="px-4 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-[#2C3E50] hover:bg-slate-50 font-medium text-xs transition"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-[#1A5276] hover:bg-[#154360] text-white font-bold text-xs shadow-md shadow-[#1A5276]/20 transition flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Guardando Cambios...' : 'Guardar Cambios'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
