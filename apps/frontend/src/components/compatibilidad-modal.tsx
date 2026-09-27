'use client';

import React, { useState } from 'react';
import { SkuSummary } from '@japonparts/shared';
import { apiClient } from '../lib/api-client';
import { X, Car, AlertCircle } from 'lucide-react';

interface CompatibilidadModalProps {
  sku: SkuSummary | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CompatibilidadModal({
  sku,
  isOpen,
  onClose,
  onSuccess,
}: CompatibilidadModalProps) {
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [anioDesde, setAnioDesde] = useState<number>(1995);
  const [anioHasta, setAnioHasta] = useState<string>('');
  const [motor, setMotor] = useState('');
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !sku) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await apiClient.post(`/sku/${sku.id}/compatibilidad`, {
        marca_vehiculo: marca.trim(),
        modelo: modelo.trim(),
        anio_desde: Number(anioDesde),
        anio_hasta: anioHasta.trim() ? Number(anioHasta) : undefined,
        motor: motor.trim() || undefined,
        notas: notas.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar la compatibilidad');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-lg bg-white border border-[#E2E8F0] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#F8F9FA] flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#2C3E50] flex items-center gap-2">
              <Car className="w-4 h-4 text-[#1A5276]" />
              Nueva Compatibilidad Vehicular
            </h3>
            <p className="text-xs text-[#7F8C8D] mt-0.5">
              Asociando vehículo al SKU: <span className="text-[#1A5276] font-mono font-bold">{sku.sku_interno}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white border border-[#E2E8F0] text-slate-400 hover:text-slate-600 flex items-center justify-center transition shadow-sm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#2C3E50] mb-1.5">
                Marca Vehículo *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Toyota, Nissan, Honda..."
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-[#2C3E50] text-sm focus:outline-none focus:border-[#4A90E2] focus:bg-white transition placeholder:text-[#95A5A6]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#2C3E50] mb-1.5">
                Modelo *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Corolla, Sentra, Civic..."
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-[#2C3E50] text-sm focus:outline-none focus:border-[#4A90E2] focus:bg-white transition placeholder:text-[#95A5A6]"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#2C3E50] mb-1.5">
                Año Desde *
              </label>
              <input
                type="number"
                min="1950"
                max="2035"
                required
                value={anioDesde}
                onChange={(e) => setAnioDesde(parseInt(e.target.value) || 1995)}
                className="w-full px-3 py-2 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-[#2C3E50] text-sm focus:outline-none focus:border-[#4A90E2] focus:bg-white transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#2C3E50] mb-1.5">
                Año Hasta (opcional)
              </label>
              <input
                type="number"
                min="1950"
                max="2035"
                placeholder="Hasta hoy"
                value={anioHasta}
                onChange={(e) => setAnioHasta(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-[#2C3E50] text-sm focus:outline-none focus:border-[#4A90E2] focus:bg-white transition placeholder:text-[#95A5A6]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#2C3E50] mb-1.5">
                Motor / Cilindrada
              </label>
              <input
                type="text"
                placeholder="Ej: 1.8L 7A-FE"
                value={motor}
                onChange={(e) => setMotor(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-[#2C3E50] text-sm focus:outline-none focus:border-[#4A90E2] focus:bg-white transition placeholder:text-[#95A5A6]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#2C3E50] mb-1.5">
              Notas Técnicas de Compatibilidad
            </label>
            <textarea
              rows={2}
              placeholder="Ej: Aplica para versión americana y japonesa. Calibrar a 1.1mm..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-[#2C3E50] text-xs placeholder:text-[#95A5A6] focus:outline-none focus:border-[#4A90E2] focus:bg-white transition"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#E2E8F0] bg-white text-[#2C3E50] hover:bg-slate-50 font-medium text-xs transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-[#1A5276] hover:bg-[#154360] text-white font-bold text-xs shadow-md shadow-[#1A5276]/20 transition disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Asociar Vehículo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
