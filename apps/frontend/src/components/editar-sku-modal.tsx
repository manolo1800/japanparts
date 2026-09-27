'use client';

import React, { useState, useEffect } from 'react';
import { SkuSummary } from '@japonparts/shared';
import { apiClient } from '../lib/api-client';
import {
  X,
  Pencil,
  AlertCircle,
  Save,
  Check,
  Tag,
  DollarSign,
  Package,
  MapPin,
  FileText,
} from 'lucide-react';

interface EditarSkuModalProps {
  sku: SkuSummary | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedSku?: SkuSummary) => void;
}

export function EditarSkuModal({
  sku,
  isOpen,
  onClose,
  onSuccess,
}: EditarSkuModalProps) {
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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError(null);
    }
  }, [sku, isOpen]);

  if (!isOpen || !sku) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await apiClient.put<SkuSummary>(`/sku/${sku.id}`, {
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

      onSuccess(res.data);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar los datos del SKU');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white border border-[#E2E8F0] rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#F8F9FA] flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-bold text-[#2C3E50] flex items-center gap-2">
              <Pencil className="w-4 h-4 text-[#1A5276]" />
              Editar Datos Iniciales del SKU
            </h3>
            <p className="text-xs text-[#7F8C8D] mt-0.5">
              Modificando ficha maestra de repuesto{' '}
              <span className="font-mono font-bold text-[#1A5276]">{sku.sku_interno}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
            {error && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Section 1: Identificación Maestro */}
            <div>
              <div className="flex items-center gap-1.5 font-bold text-[#2C3E50] uppercase tracking-wider text-[11px] mb-3 pb-1 border-b border-slate-100">
                <Tag className="w-3.5 h-3.5 text-[#1A5276]" />
                <span>Identificación y Clasificación</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div>
                  <label className="block font-semibold text-[#2C3E50] mb-1.5">
                    SKU Interno *
                  </label>
                  <input
                    type="text"
                    required
                    value={skuInterno}
                    onChange={(e) => setSkuInterno(e.target.value)}
                    placeholder="Ej: DEN-YKT22"
                    className="w-full px-3 py-2 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-[#1A5276] font-mono font-bold text-xs uppercase focus:outline-none focus:border-[#4A90E2] focus:bg-white transition"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block font-semibold text-[#2C3E50] mb-1.5">
                    Nombre del Repuesto *
                  </label>
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej: Bujía de Iridio Denso YKT22 Power"
                    className="w-full px-3 py-2 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-[#2C3E50] font-medium text-xs focus:outline-none focus:border-[#4A90E2] focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#2C3E50] mb-1.5">
                    Marca de la Pieza *
                  </label>
                  <input
                    type="text"
                    required
                    value={marca}
                    onChange={(e) => setMarca(e.target.value)}
                    placeholder="Ej: Denso, Bosch, NGK..."
                    className="w-full px-3 py-2 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-[#2C3E50] text-xs focus:outline-none focus:border-[#4A90E2] focus:bg-white transition"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block font-semibold text-[#2C3E50] mb-1.5">
                    Código de Fabricante / OEM
                  </label>
                  <input
                    type="text"
                    value={codigoFabricante}
                    onChange={(e) => setCodigoFabricante(e.target.value)}
                    placeholder="Ej: 90919-01247"
                    className="w-full px-3 py-2 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-[#2C3E50] font-mono text-xs focus:outline-none focus:border-[#4A90E2] focus:bg-white transition"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Precios y Existencias */}
            <div>
              <div className="flex items-center gap-1.5 font-bold text-[#2C3E50] uppercase tracking-wider text-[11px] mb-3 pb-1 border-b border-slate-100">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                <span>Precios y Existencias de Inventario</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                <div>
                  <label className="block font-semibold text-[#2C3E50] mb-1.5">
                    Precio Base ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={precioBase}
                    onChange={(e) => setPrecioBase(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-[#2C3E50] font-mono font-bold text-xs focus:outline-none focus:border-[#4A90E2] focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#2C3E50] mb-1.5">
                    Costo Promedio ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={costoPromedio}
                    onChange={(e) => setCostoPromedio(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-[#2C3E50] font-mono text-xs focus:outline-none focus:border-[#4A90E2] focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#2C3E50] mb-1.5">
                    Stock Actual
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={stockActual}
                    onChange={(e) => setStockActual(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-[#2C3E50] font-mono font-bold text-xs focus:outline-none focus:border-[#4A90E2] focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#2C3E50] mb-1.5">
                    Stock Mínimo
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={stockMinimo}
                    onChange={(e) => setStockMinimo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-[#2C3E50] font-mono text-xs focus:outline-none focus:border-[#4A90E2] focus:bg-white transition"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Ubicación y Estado */}
            <div>
              <div className="flex items-center gap-1.5 font-bold text-[#2C3E50] uppercase tracking-wider text-[11px] mb-3 pb-1 border-b border-slate-100">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span>Almacenamiento y Disponibilidad</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 items-end">
                <div className="md:col-span-2">
                  <label className="block font-semibold text-[#2C3E50] mb-1.5">
                    Ubicación en Bodega / Almacén
                  </label>
                  <input
                    type="text"
                    value={ubicacion}
                    onChange={(e) => setUbicacion(e.target.value)}
                    placeholder="Ej: Pasillo A - Estante 3 - Casillero 12"
                    className="w-full px-3 py-2 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-[#2C3E50] text-xs focus:outline-none focus:border-[#4A90E2] focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#2C3E50] mb-1.5">
                    Estado Operativo
                  </label>
                  <button
                    type="button"
                    onClick={() => setActivo(!activo)}
                    className={`w-full py-2 px-3 rounded-xl border flex items-center justify-between font-semibold text-xs transition ${
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
                      {activo ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Section 4: Descripción */}
            <div>
              <div className="flex items-center gap-1.5 font-bold text-[#2C3E50] uppercase tracking-wider text-[11px] mb-2 pb-1 border-b border-slate-100">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>Descripción Detallada</span>
              </div>
              <textarea
                rows={3}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Especificaciones técnicas, notas del repuesto, aplicaciones..."
                className="w-full px-3 py-2 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-[#2C3E50] text-xs focus:outline-none focus:border-[#4A90E2] focus:bg-white transition"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-[#E2E8F0] bg-[#F8F9FA] flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#E2E8F0] bg-white text-[#2C3E50] hover:bg-slate-50 font-semibold text-xs transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-[#1A5276] hover:bg-[#154360] text-white font-bold text-xs shadow-md shadow-[#1A5276]/20 transition flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Guardando Cambios...' : 'Guardar Cambios'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
