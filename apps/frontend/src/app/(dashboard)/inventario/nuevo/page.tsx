'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../../../../components/header';
import { apiClient } from '../../../../lib/api-client';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function NuevoSkuPage() {
  const router = useRouter();
  const [skuInterno, setSkuInterno] = useState('');
  const [nombre, setNombre] = useState('');
  const [marca, setMarca] = useState('');
  const [codigoFabricante, setCodigoFabricante] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [costoPromedio, setCostoPromedio] = useState<number>(0);
  const [precioBase, setPrecioBase] = useState<number>(0);
  const [stockActual, setStockActual] = useState<number>(0);
  const [stockMinimo, setStockMinimo] = useState<number>(5);
  const [ubicacion, setUbicacion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await apiClient.post<any>('/sku', {
        sku_interno: skuInterno.trim().toUpperCase(),
        nombre: nombre.trim(),
        marca: marca.trim(),
        codigo_fabricante: codigoFabricante.trim() || undefined,
        descripcion: descripcion.trim() || undefined,
        costo_promedio: Number(costoPromedio),
        precio_base: Number(precioBase),
        stock_actual: Number(stockActual),
        stock_minimo: Number(stockMinimo),
        ubicacion: ubicacion.trim() || undefined,
      });

      if (res.data?.id) {
        router.push(`/inventario/${res.data.id}`);
      } else {
        router.push('/inventario');
      }
    } catch (err: any) {
      setError(err.message || 'Error al crear el SKU');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-16">
      <Header
        title="Crear Nuevo SKU Maestro"
        subtitle="Registro de nueva pieza en el catálogo de repuestos"
        showNewSkuBtn={false}
      />

      <div className="p-8 max-w-4xl mx-auto">
        <Link
          href="/inventario"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#7F8C8D] hover:text-[#1A5276] transition mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Catálogo</span>
        </Link>

        <div className="bg-white p-8 rounded-2xl border border-[#E2E8F0] shadow-sm">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
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
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-[#2C3E50] font-mono text-sm focus:outline-none focus:border-[#4A90E2] focus:bg-white transition uppercase placeholder:text-[#95A5A6]"
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
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-[#2C3E50] text-sm focus:outline-none focus:border-[#4A90E2] focus:bg-white transition placeholder:text-[#95A5A6]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#2C3E50] uppercase tracking-wider mb-2">
                  Marca de la Pieza *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Denso, Bosch, NGK, Aisin..."
                  value={marca}
                  onChange={(e) => setMarca(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-[#2C3E50] text-sm focus:outline-none focus:border-[#4A90E2] focus:bg-white transition placeholder:text-[#95A5A6]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C3E50] uppercase tracking-wider mb-2">
                  Código de Fabricante / OEM
                </label>
                <input
                  type="text"
                  placeholder="Ej: YKT22-11"
                  value={codigoFabricante}
                  onChange={(e) => setCodigoFabricante(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-[#2C3E50] text-sm focus:outline-none focus:border-[#4A90E2] focus:bg-white transition placeholder:text-[#95A5A6]"
                />
              </div>
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
                  onChange={(e) => setPrecioBase(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-[#2C3E50] font-mono text-sm focus:outline-none focus:border-[#4A90E2] focus:bg-white transition"
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
                  onChange={(e) => setCostoPromedio(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-[#2C3E50] font-mono text-sm focus:outline-none focus:border-[#4A90E2] focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C3E50] uppercase tracking-wider mb-2">
                  Stock Inicial
                </label>
                <input
                  type="number"
                  min="0"
                  value={stockActual}
                  onChange={(e) => setStockActual(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-[#2C3E50] font-mono text-sm focus:outline-none focus:border-[#4A90E2] focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C3E50] uppercase tracking-wider mb-2">
                  Stock Mínimo
                </label>
                <input
                  type="number"
                  min="0"
                  value={stockMinimo}
                  onChange={(e) => setStockMinimo(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-[#2C3E50] font-mono text-sm focus:outline-none focus:border-[#4A90E2] focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2C3E50] uppercase tracking-wider mb-2">
                Ubicación en Bodega / Almacén
              </label>
              <input
                type="text"
                placeholder="Ej: Pasillo A - Estante 3 - Casillero 12"
                value={ubicacion}
                onChange={(e) => setUbicacion(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-[#2C3E50] text-sm focus:outline-none focus:border-[#4A90E2] focus:bg-white transition placeholder:text-[#95A5A6]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2C3E50] uppercase tracking-wider mb-2">
                Descripción Detallada
              </label>
              <textarea
                rows={3}
                placeholder="Detalles sobre especificaciones, material, compatibilidad general..."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-[#2C3E50] text-xs placeholder:text-[#95A5A6] focus:outline-none focus:border-[#4A90E2] focus:bg-white transition"
              />
            </div>

            <div className="pt-4 border-t border-[#E2E8F0] flex justify-end gap-3">
              <Link
                href="/inventario"
                className="px-4 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-[#2C3E50] hover:bg-slate-50 font-medium text-xs transition"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-[#1A5276] hover:bg-[#154360] text-white font-bold text-xs shadow-md shadow-[#1A5276]/20 transition flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{loading ? 'Guardando SKU...' : 'Guardar y Configurar Compatibilidad'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
