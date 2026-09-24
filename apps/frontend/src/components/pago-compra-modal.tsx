'use client';

import React, { useState } from 'react';
import { CompraSummary } from '@japonparts/shared';
import { apiClient } from '../lib/api-client';
import { X, DollarSign, CreditCard, AlertCircle, Check } from 'lucide-react';

interface PagoCompraModalProps {
  compra: CompraSummary | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PagoCompraModal({
  compra,
  isOpen,
  onClose,
  onSuccess,
}: PagoCompraModalProps) {
  const pendingAmount =
    compra?.saldo_pendiente !== undefined
      ? compra.saldo_pendiente
      : (compra?.total || 0) - (compra?.monto_pagado || 0);

  const [monto, setMonto] = useState<number>(pendingAmount);
  const [metodo, setMetodo] = useState<string>('transferencia');
  const [referencia, setReferencia] = useState<string>('');
  const [notas, setNotas] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Sync default amount when modal opens or compra changes
  React.useEffect(() => {
    if (compra) {
      const pending =
        compra.saldo_pendiente !== undefined
          ? compra.saldo_pendiente
          : Number(compra.total) - Number(compra.monto_pagado || 0);
      setMonto(Math.max(0, Number(pending.toFixed(2))));
    }
  }, [compra]);

  if (!isOpen || !compra) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (monto <= 0) {
      setError('El monto del pago debe ser mayor a 0');
      setLoading(false);
      return;
    }

    try {
      await apiClient.post(`/compra/${compra.id}/pago`, {
        monto: Number(monto),
        metodo,
        referencia: referencia.trim() || undefined,
        notas: notas.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al procesar el pago a proveedor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[#0f172a] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              Registrar Pago a Proveedor
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Factura #{compra.numero_factura} — {compra.proveedor?.nombre || 'Proveedor'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Balance card */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 font-medium uppercase block">
                Saldo Pendiente
              </span>
              <span className="text-lg font-bold text-rose-400 font-mono">
                ${Number(pendingAmount).toFixed(2)} USD
              </span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-400 font-medium uppercase block">
                Total Factura
              </span>
              <span className="text-sm font-semibold text-slate-300 font-mono">
                ${Number(compra.total).toFixed(2)} USD
              </span>
            </div>
          </div>

          {/* Monto */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Monto a Abonar (USD) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 text-sm font-bold">$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={pendingAmount}
                required
                value={monto}
                onChange={(e) => setMonto(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900/60 border border-slate-700 rounded-lg pl-7 pr-4 py-2 text-sm text-white focus:outline-none focus:border-rose-500 font-mono"
              />
            </div>
            {monto < pendingAmount && monto > 0 && (
              <p className="text-[11px] text-amber-400/90 mt-1">
                Abono parcial. Restará un saldo de ${(pendingAmount - monto).toFixed(2)} USD.
              </p>
            )}
          </div>

          {/* Método de Pago */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Método de Pago *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'transferencia', label: 'Transferencia Bancaria' },
                { id: 'zelle', label: 'Zelle' },
                { id: 'pago_movil', label: 'Pago Móvil' },
                { id: 'efectivo', label: 'Efectivo USD' },
              ].map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => setMetodo(m.id)}
                  className={`p-2.5 rounded-lg border text-xs font-medium flex items-center justify-between transition ${
                    metodo === m.id
                      ? 'bg-rose-500/10 border-rose-500 text-rose-300 shadow-sm shadow-rose-500/10'
                      : 'bg-slate-900/40 border-slate-700/80 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <span>{m.label}</span>
                  {metodo === m.id && <Check className="w-3.5 h-3.5 text-rose-400" />}
                </button>
              ))}
            </div>
          </div>

          {/* Referencia */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Nº Referencia / Comprobante
            </label>
            <input
              type="text"
              placeholder="Ej. REF-984723 o Zelle Confirmation"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500 placeholder-slate-500"
            />
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Observaciones o Notas
            </label>
            <textarea
              rows={2}
              placeholder="Detalle adicional del pago realizado..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 placeholder-slate-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || monto <= 0}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/20 disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading ? (
                'Procesando...'
              ) : (
                <>
                  <CreditCard className="w-3.5 h-3.5" />
                  Confirmar Pago
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
