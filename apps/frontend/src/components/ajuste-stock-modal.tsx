'use client';

import React, { useState } from 'react';
import { MovementType, SkuSummary } from '@japonparts/shared';
import { apiClient } from '../lib/api-client';
import { X, ArrowDownRight, ArrowUpRight, SlidersHorizontal, AlertCircle } from 'lucide-react';

interface AjusteStockModalProps {
  sku: SkuSummary | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AjusteStockModal({
  sku,
  isOpen,
  onClose,
  onSuccess,
}: AjusteStockModalProps) {
  const [tipo, setTipo] = useState<MovementType>(MovementType.ENTRADA);
  const [cantidad, setCantidad] = useState<number>(1);
  const [referenciaTipo] = useState<string>('ajuste_manual');
  const [notas, setNotas] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !sku) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await apiClient.post(`/sku/${sku.id}/ajuste-stock`, {
        tipo,
        cantidad: Number(cantidad),
        referencia_tipo: referenciaTipo,
        notas: notas.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al procesar el ajuste de stock');
    } finally {
      setLoading(false);
    }
  };

  const getPreviewFinalStock = () => {
    const qty = Number(cantidad) || 0;
    if (tipo === MovementType.ENTRADA) return sku.stock_actual + qty;
    if (tipo === MovementType.SALIDA) return Math.max(0, sku.stock_actual - qty);
    return qty;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[#0f172a] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-rose-500" />
              Ajuste de Stock
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {sku.sku_interno} — {sku.nombre}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Stock actual vs proyectado */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div>
              <span className="text-[11px] text-slate-400 block">Stock Actual</span>
              <span className="text-xl font-bold text-white">{sku.stock_actual}</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Stock Resultante</span>
              <span className="text-xl font-bold text-rose-400">
                {getPreviewFinalStock()}
              </span>
            </div>
          </div>

          {/* Tipo de Movimiento Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Tipo de Operación
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTipo(MovementType.ENTRADA)}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition ${
                  tipo === MovementType.ENTRADA
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-sm'
                    : 'bg-slate-800/40 text-slate-400 border-slate-700/60 hover:bg-slate-800'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                Entrada (+)
              </button>

              <button
                type="button"
                onClick={() => setTipo(MovementType.SALIDA)}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition ${
                  tipo === MovementType.SALIDA
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-sm'
                    : 'bg-slate-800/40 text-slate-400 border-slate-700/60 hover:bg-slate-800'
                }`}
              >
                <ArrowDownRight className="w-3.5 h-3.5" />
                Salida (-)
              </button>

              <button
                type="button"
                onClick={() => setTipo(MovementType.AJUSTE)}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition ${
                  tipo === MovementType.AJUSTE
                    ? 'bg-sky-500/20 text-sky-400 border-sky-500/50 shadow-sm'
                    : 'bg-slate-800/40 text-slate-400 border-slate-700/60 hover:bg-slate-800'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Fijar (=)
              </button>
            </div>
          </div>

          {/* Cantidad Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {tipo === MovementType.AJUSTE ? 'Nuevo Total en Stock' : 'Cantidad a Mover'}
            </label>
            <input
              type="number"
              min="0"
              required
              value={cantidad}
              onChange={(e) => setCantidad(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-rose-500 transition"
            />
          </div>

          {/* Motivo / Notas */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Motivo del Ajuste (Auditoría) *
            </label>
            <textarea
              required
              rows={2}
              placeholder="Ej: Recepción de pedido, merma, conteo físico periódico..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-rose-500 transition"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Confirmar Ajuste'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
