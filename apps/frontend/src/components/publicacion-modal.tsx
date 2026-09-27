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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-md bg-white border border-[#E2E8F0] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#F8F9FA] flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#2C3E50] flex items-center gap-2">
              <Share2 className="w-4 h-4 text-[#1A5276]" />
              Nueva Publicación Multicanal
            </h3>
            <p className="text-xs text-[#7F8C8D] mt-0.5">
              Publicando SKU: <span className="text-[#1A5276] font-mono font-bold">{sku.sku_interno}</span>
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
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#2C3E50] mb-1.5">
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
                      ? 'bg-[#1A5276] text-white border-[#1A5276] font-bold shadow-sm'
                      : 'bg-[#F8F9FA] text-[#7F8C8D] border-[#E2E8F0] hover:text-[#2C3E50] hover:bg-slate-100'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#2C3E50] mb-1.5">
              Título de la Publicación *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Bujía Denso YKT22 Toyota Corolla 1995-2002"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-[#2C3E50] text-sm focus:outline-none focus:border-[#4A90E2] focus:bg-white transition placeholder:text-[#95A5A6]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#2C3E50] mb-1.5">
                Precio en Canal ($) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={precio}
                onChange={(e) => setPrecio(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-[#2C3E50] text-sm focus:outline-none focus:border-[#4A90E2] focus:bg-white transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#2C3E50] mb-1.5">
                Stock Publicado *
              </label>
              <input
                type="number"
                min="0"
                required
                value={stockPublicado}
                onChange={(e) => setStockPublicado(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-[#2C3E50] text-sm focus:outline-none focus:border-[#4A90E2] focus:bg-white transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#2C3E50] mb-1.5">
              URL Externa (opcional)
            </label>
            <input
              type="url"
              placeholder="https://articulo.mercadolibre.com.ve/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
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
              {loading ? 'Guardando...' : 'Crear Publicación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
