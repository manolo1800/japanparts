'use client';

import React, { useState } from 'react';
import { SkuSummary, SugerirPrecioResponse } from '@japonparts/shared';
import { apiClient } from '../lib/api-client';
import {
  Sparkles,
  X,
  TrendingUp,
  DollarSign,
  Percent,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Brain,
} from 'lucide-react';

interface SugerirPrecioModalProps {
  sku: SkuSummary | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SugerirPrecioModal({
  sku,
  isOpen,
  onClose,
  onSuccess,
}: SugerirPrecioModalProps) {
  const [margenObjetivo, setMargenObjetivo] = useState(35);
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [analisis, setAnalisis] = useState<SugerirPrecioResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !sku) return null;

  const handleAnalizar = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.post<SugerirPrecioResponse>(
        `/sku/${sku.id}/sugerir-precio`,
        {
          margen_objetivo_pct: Number(margenObjetivo),
          notas_adicionales: notas.trim() || undefined,
        },
      );
      setAnalisis(res.data || null);
    } catch (err: any) {
      setError(err?.message || 'Error al obtener sugerencia de precio');
    } finally {
      setLoading(false);
    }
  };

  const handleAplicarPrecio = async () => {
    if (!analisis) return;
    setApplying(true);
    setError(null);
    try {
      await apiClient.put(`/sku/${sku.id}`, {
        precio_base: analisis.precio_sugerido,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al actualizar precio del repuesto');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-[#E2E8F0] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0D2232] to-[#1A5276] px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-[#C4F82A]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">Sugerencia Inteligente de Precio</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white">
                  DeepSeek IA
                </span>
              </div>
              <p className="text-xs text-white/70">
                Optimización de margen comercial para repuestos automotrices
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Ficha del SKU */}
          <div className="bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl p-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[11px] font-bold text-[#1A5276] uppercase tracking-wider font-mono">
                  {sku.sku_interno}
                </span>
                <h4 className="text-sm font-bold text-[#2C3E50] mt-0.5">{sku.nombre}</h4>
                <p className="text-xs text-[#7F8C8D]">Marca: {sku.marca}</p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                Stock: {sku.stock_actual}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-[#E2E8F0]">
              <div className="bg-white p-2.5 rounded-lg border border-[#E2E8F0]">
                <span className="text-[10px] text-[#7F8C8D] block uppercase font-medium">Costo Promedio</span>
                <span className="text-base font-bold text-[#2C3E50] font-mono">
                  ${Number(sku.costo_promedio).toFixed(2)}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-[#E2E8F0]">
                <span className="text-[10px] text-[#7F8C8D] block uppercase font-medium">Precio Base Actual</span>
                <span className="text-base font-bold text-[#1A5276] font-mono">
                  ${Number(sku.precio_base).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Formulario de parámetros */}
          <form onSubmit={handleAnalizar} className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-[#2C3E50] flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-[#1A5276]" />
                  Margen Bruto Objetivo
                </label>
                <span className="text-xs font-bold text-[#1A5276] font-mono bg-blue-50 px-2 py-0.5 rounded">
                  {margenObjetivo}%
                </span>
              </div>
              <input
                type="range"
                min="15"
                max="65"
                step="5"
                value={margenObjetivo}
                onChange={(e) => setMargenObjetivo(Number(e.target.value))}
                className="w-full accent-[#1A5276] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#7F8C8D] mt-1">
                <span>15% (Alta Rotación)</span>
                <span>35% (Estándar)</span>
                <span>65% (Especialidad)</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#2C3E50] block mb-1">
                Notas adicionales para el modelo (opcional):
              </label>
              <input
                type="text"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Ej: Pieza original difícil de conseguir, alta demanda en la zona..."
                className="w-full text-xs px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A5276]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full erp-btn-primary py-2.5 text-xs font-bold"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Analizando repuesto con IA...</span>
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4" />
                  <span>Calcular Precio Óptimo</span>
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Resultado del análisis */}
          {analisis && (
            <div className="bg-emerald-50/50 border-2 border-emerald-500/30 rounded-2xl p-5 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Recomendación Generada
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Confianza {analisis.confianza}
                </span>
              </div>

              {/* Comparación de precios */}
              <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-emerald-200 shadow-sm">
                <div>
                  <span className="text-[10px] text-[#7F8C8D] block uppercase">Precio Actual</span>
                  <span className="text-base font-semibold text-[#7F8C8D] line-through font-mono">
                    ${analisis.precio_actual.toFixed(2)}
                  </span>
                </div>

                <ArrowRight className="w-5 h-5 text-emerald-500" />

                <div className="text-right">
                  <span className="text-[10px] text-emerald-600 font-bold block uppercase tracking-wider">
                    Precio Sugerido
                  </span>
                  <span className="text-2xl font-black text-emerald-700 font-mono">
                    ${analisis.precio_sugerido.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Métricas de Rentabilidad */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-white p-3 rounded-xl border border-emerald-100">
                  <span className="text-[#7F8C8D] block text-[10px] uppercase">Margen Proyectado</span>
                  <span className="text-sm font-bold text-emerald-700 font-mono">
                    {analisis.margen_estimado_pct}%
                  </span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-emerald-100">
                  <span className="text-[#7F8C8D] block text-[10px] uppercase">Ganancia Neta / Unidad</span>
                  <span className="text-sm font-bold text-emerald-700 font-mono">
                    +${analisis.margen_ganancia_unidad.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Justificación y factores */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-[#2C3E50] block">Fundamentación de Mercado:</span>
                <p className="text-xs text-[#2C3E50] bg-white p-3 rounded-xl border border-[#E2E8F0] leading-relaxed">
                  {analisis.razonamiento}
                </p>
              </div>

              {analisis.factores && analisis.factores.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-[#7F8C8D] uppercase block">Factores Clave:</span>
                  <ul className="text-xs space-y-1">
                    {analisis.factores.map((factor, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-[#2C3E50]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span>{factor}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Botón Aplicar */}
              <button
                type="button"
                onClick={handleAplicarPrecio}
                disabled={applying}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 text-xs flex items-center justify-center gap-2 transition"
              >
                {applying ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Actualizando precio en el sistema...</span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4" />
                    <span>Aplicar ${analisis.precio_sugerido.toFixed(2)} al SKU</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
