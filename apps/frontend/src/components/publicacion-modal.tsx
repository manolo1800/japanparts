'use client';

import React, { useState } from 'react';
import { Channel, SkuSummary } from '@japonparts/shared';
import { apiClient } from '../lib/api-client';
import { X, Share2, AlertCircle } from 'lucide-react';

interface PublicacionModalProps {
  sku: SkuSummary | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PublicacionModal({
  sku,
  isOpen,
  onClose,
  onSuccess,
}: PublicacionModalProps) {
  const [canal, setCanal] = useState<Channel>(Channel.ML);
  const [titulo, setTitulo] = useState(sku?.nombre ? `${sku.nombre} - ${sku.marca}` : '');
  const [precio, setPrecio] = useState<number>(sku?.precio_base || 10);
  const [stockPublicado, setStockPublicado] = useState<number>(sku?.stock_actual || 5);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !sku) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await apiClient.post('/publicacion', {
        sku_id: sku.id,
        canal,
        titulo: titulo.trim(),
        precio: Number(precio),
        stock_publicado: Number(stockPublicado),
        url: url.trim() || undefined,
        estado: 'activa',
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al crear la publicación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[#0f172a] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Share2 className="w-4 h-4 text-rose-500" />
              Nueva Publicación Multicanal
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Publicando SKU: <span className="text-white font-mono">{sku.sku_interno}</span>
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

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Canal de Venta *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: Channel.ML, label: 'MercadoLibre' },
                { id: Channel.WHATSAPP, label: 'WhatsApp' },
                { id: Channel.MOSTRADOR, label: 'Mostrador' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCanal(c.id)}
                  className={`py-2 px-2 rounded-xl text-xs font-semibold border transition text-center ${
                    canal === c.id
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-sm'
                      : 'bg-slate-800/40 text-slate-400 border-slate-700/60 hover:bg-slate-800'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Título de la Publicación *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Bujía Denso YKT22 Toyota Corolla 1995-2002"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-rose-500 transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Precio en Canal ($) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={precio}
                onChange={(e) => setPrecio(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-rose-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Stock Publicado *
              </label>
              <input
                type="number"
                min="0"
                required
                value={stockPublicado}
                onChange={(e) => setStockPublicado(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-rose-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              URL Externa (opcional)
            </label>
            <input
              type="url"
              placeholder="https://articulo.mercadolibre.com.ve/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-rose-500 transition"
            />
          </div>

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
              {loading ? 'Guardando...' : 'Crear Publicación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
