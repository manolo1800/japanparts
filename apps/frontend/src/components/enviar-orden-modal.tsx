'use client';

import React, { useState, useEffect } from 'react';
import { OrdenCompraSummary } from '@japonparts/shared';
import { apiClient } from '../lib/api-client';
import {
  X,
  Mail,
  MessageSquare,
  Send,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  FileText,
  Phone,
} from 'lucide-react';

interface EnviarOrdenModalProps {
  orden: OrdenCompraSummary | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function EnviarOrdenModal({
  orden,
  isOpen,
  onClose,
  onSuccess,
}: EnviarOrdenModalProps) {
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'email'>('whatsapp');

  // WhatsApp form state
  const [telefono, setTelefono] = useState<string>('');
  const [mensajeWa, setMensajeWa] = useState<string>('');
  const [sendingWa, setSendingWa] = useState<boolean>(false);
  const [waLink, setWaLink] = useState<string | null>(null);
  const [waSuccess, setWaSuccess] = useState<string | null>(null);
  const [waError, setWaError] = useState<string | null>(null);

  // Email form state
  const [email, setEmail] = useState<string>('');
  const [mensajeEmail, setMensajeEmail] = useState<string>('');
  const [sendingEmail, setSendingEmail] = useState<boolean>(false);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    if (orden) {
      setTelefono(orden.proveedor?.telefono || '');
      setEmail(orden.proveedor?.email || '');
      setMensajeWa('Agradecemos confirmar disponibilidad de stock y fecha estimada de despacho.');
      setMensajeEmail('Por favor confirmar recepción de esta orden y el tiempo de despacho estimado.');
      setWaSuccess(null);
      setWaError(null);
      setEmailSuccess(null);
      setEmailError(null);
      setWaLink(null);
    }
  }, [orden]);

  if (!isOpen || !orden) return null;

  const handleEnviarEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    setEmailSuccess(null);
    setSendingEmail(true);

    try {
      const res = await apiClient.post<{ message: string }>(
        `/orden-compra/${orden.id}/enviar-email`,
        {
          email: email.trim(),
          mensaje: mensajeEmail.trim() || undefined,
        },
      );
      setEmailSuccess(res.data?.message || 'Correo enviado exitosamente con el PDF adjunto');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setEmailError(err.message || 'Error al enviar correo electrónico');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleEnviarWhatsapp = async (e: React.FormEvent) => {
    e.preventDefault();
    setWaError(null);
    setWaSuccess(null);
    setSendingWa(true);

    try {
      const res = await apiClient.post<{
        directSent: boolean;
        message: string;
        waLink: string;
      }>(`/orden-compra/${orden.id}/enviar-whatsapp`, {
        telefono: telefono.trim(),
        mensaje: mensajeWa.trim() || undefined,
      });

      setWaSuccess(res.data?.message || 'Mensaje procesado para WhatsApp');
      if (res.data?.waLink) {
        setWaLink(res.data.waLink);
      }
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setWaError(err.message || 'Error al procesar envío de WhatsApp');
    } finally {
      setSendingWa(false);
    }
  };

  const handleOpenWaLink = () => {
    if (waLink) {
      window.open(waLink, '_blank');
    } else {
      const cleanPhone = telefono.replace(/\D/g, '');
      const totalUnits = (orden.detalles || []).reduce((acc, d) => acc + (d.cantidad || 0), 0);
      const text = `Hola ${orden.proveedor?.nombre || ''}, te enviamos la Orden de Compra #${orden.numero_orden} solicitando ${totalUnits} unidades de repuestos para cotización y despacho. ${mensajeWa}`;
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#1A5276] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <FileText className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base font-bold">Enviar Orden de Compra</h2>
              <p className="text-xs text-slate-200">
                {orden.numero_orden} — {orden.proveedor?.nombre || 'Proveedor'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('whatsapp')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition border-b-2 ${
              activeTab === 'whatsapp'
                ? 'bg-white text-emerald-700 border-emerald-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            <span>Enviar por WhatsApp</span>
            {orden.enviado_whatsapp && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" title="Ya enviado por WhatsApp" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('email')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition border-b-2 ${
              activeTab === 'email'
                ? 'bg-white text-[#1A5276] border-[#1A5276] shadow-sm'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <Mail className="w-4 h-4 text-[#1A5276]" />
            <span>Enviar por Correo Electrónico</span>
            {orden.enviado_email && (
              <span className="w-2 h-2 rounded-full bg-blue-500" title="Ya enviado por Correo" />
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Previous sending history pill */}
          {(orden.enviado_email || orden.enviado_whatsapp) && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <span className="font-semibold text-slate-700 block">Historial de Envíos:</span>
              {orden.enviado_email && (
                <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Enviado por email a: <strong>{orden.enviado_email_a}</strong></span>
                </div>
              )}
              {orden.enviado_whatsapp && (
                <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Enviado por WhatsApp a: <strong>+{orden.enviado_whatsapp_a}</strong></span>
                </div>
              )}
            </div>
          )}

          {activeTab === 'whatsapp' ? (
            <form onSubmit={handleEnviarWhatsapp} className="space-y-4">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Se enviará la solicitud de la Orden de Compra junto con el archivo <strong>PDF con membrete oficial</strong> al número de WhatsApp del proveedor.
                </span>
              </div>

              {waError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{waError}</span>
                </div>
              )}

              {waSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{waSuccess}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Número de WhatsApp del Proveedor:
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="+58 412 1234567"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Incluye código de país (ej: +58 para Venezuela).
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mensaje / Nota adicional:
                </label>
                <textarea
                  rows={3}
                  value={mensajeWa}
                  onChange={(e) => setMensajeWa(e.target.value)}
                  placeholder="Instrucciones específicas o requerimiento de confirmación..."
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={sendingWa || !telefono.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition shadow-md shadow-emerald-600/20"
                >
                  {sendingWa ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Enviando por WhatsApp...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Enviar PDF y Mensaje por WhatsApp</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleOpenWaLink}
                  disabled={!telefono.trim()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition border border-slate-200"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  <span>Abrir en WhatsApp Web / wa.me</span>
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleEnviarEmail} className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-start gap-2">
                <Mail className="w-4 h-4 text-[#1A5276] shrink-0 mt-0.5" />
                <span>
                  Se enviará un correo corporativo formal a la dirección del proveedor con el <strong>PDF adjunto</strong> y la tabla resumen de repuestos.
                </span>
              </div>

              {emailError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{emailError}</span>
                </div>
              )}

              {emailSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{emailSuccess}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Correo Electrónico del Proveedor:
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="compras@proveedor.com"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#1A5276] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mensaje / Nota en el cuerpo del correo:
                </label>
                <textarea
                  rows={3}
                  value={mensajeEmail}
                  onChange={(e) => setMensajeEmail(e.target.value)}
                  placeholder="Por favor confirmar tiempo estimado de despacho..."
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#1A5276] focus:outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={sendingEmail || !email.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#1A5276] hover:bg-[#154360] disabled:opacity-50 text-white text-xs font-bold transition shadow-md shadow-[#1A5276]/20"
                >
                  {sendingEmail ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Enviando Correo con PDF...</span>
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      <span>Enviar Orden y PDF por Email</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
