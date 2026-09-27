'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ConversacionSummary,
  ConversacionDetalle,
  MensajeSummary,
  ConversationStatus,
  MessageRole,
  WhatsAppStatusSummary,
} from '@japonparts/shared';
import { apiClient } from '../../../lib/api-client';
import { Topbar } from '../../../components/topbar';
import { DetalleOrdenModal } from '../../../components/detalle-orden-modal';
import {
  MessageSquare,
  QrCode,
  Send,
  UserCheck,
  Bot,
  Search,
  RefreshCw,
  ShoppingBag,
  ExternalLink,
  Smartphone,
  LogOut,
  Sparkles,
  Zap,
  CheckCircle2,
} from 'lucide-react';

export default function WhatsAppPage() {
  const queryClient = useQueryClient();
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'connection'>('chat');
  const [filterEstado, setFilterEstado] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrdenId, setSelectedOrdenId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Query: Lista de conversaciones
  const { data: conversaciones = [], refetch: refetchConversaciones } = useQuery<
    ConversacionSummary[]
  >({
    queryKey: ['conversaciones', filterEstado, searchTerm],
    queryFn: async () => {
      const res = await apiClient.get<ConversacionSummary[]>('/conversacion', {
        estado: filterEstado !== 'todos' ? filterEstado : undefined,
        search: searchTerm || undefined,
      });
      return res.data || [];
    },
    refetchInterval: 5000,
  });

  // 2. Query: Detalle de la conversación seleccionada
  const { data: selectedConv, refetch: refetchDetalle } =
    useQuery<ConversacionDetalle | null>({
      queryKey: ['conversacion', selectedConvId],
      queryFn: async () => {
        if (!selectedConvId) return null;
        const res = await apiClient.get<ConversacionDetalle>(
          `/conversacion/${selectedConvId}`,
        );
        return res.data || null;
      },
      enabled: !!selectedConvId,
      refetchInterval: 3000,
    });

  // 3. Query: Estado y QR de Baileys WhatsApp
  const { data: status = { estado: 'desconectado' }, refetch: refetchStatus } =
    useQuery<WhatsAppStatusSummary>({
      queryKey: ['whatsapp-status'],
      queryFn: async () => {
        const res = await apiClient.get<WhatsAppStatusSummary>('/whatsapp/status');
        return res.data || { estado: 'desconectado' };
      },
      refetchInterval: 4000,
    });

  // Scroll automático al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConv?.mensajes]);

  // Si no hay seleccionada y cargan conversaciones, seleccionar la primera
  useEffect(() => {
    if (!selectedConvId && conversaciones.length > 0) {
      setSelectedConvId(conversaciones[0].id);
    }
  }, [conversaciones, selectedConvId]);

  // Mutación: Enviar mensaje manual
  const sendMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!selectedConvId) return;
      return await apiClient.post(`/conversacion/${selectedConvId}/mensaje`, {
        contenido: text,
      });
    },
    onSuccess: () => {
      setReplyText('');
      queryClient.invalidateQueries({ queryKey: ['conversacion', selectedConvId] });
      queryClient.invalidateQueries({ queryKey: ['conversaciones'] });
    },
  });

  // Mutación: Cambiar estado (tomar control humano / reactivar bot)
  const changeStateMutation = useMutation({
    mutationFn: async (nuevoEstado: ConversationStatus) => {
      if (!selectedConvId) return;
      return await apiClient.post(`/conversacion/${selectedConvId}/estado`, {
        estado: nuevoEstado,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversacion', selectedConvId] });
      queryClient.invalidateQueries({ queryKey: ['conversaciones'] });
    },
  });

  // Mutaciones de Baileys
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      return await apiClient.post('/whatsapp/disconnect', {});
    },
    onSuccess: () => {
      refetchStatus();
    },
  });

  const reconnectMutation = useMutation({
    mutationFn: async () => {
      return await apiClient.post('/whatsapp/reconnect', {});
    },
    onSuccess: () => {
      refetchStatus();
    },
  });

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!replyText.trim() || sendMutation.isPending) return;
    sendMutation.mutate(replyText.trim());
  };

  const getStatusBadge = () => {
    if (status.estado === 'conectado') {
      return (
        <span className="badge badge-green shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Conectado ({status.telefonoVinculado || 'WhatsApp'})</span>
        </span>
      );
    }
    if (status.estado === 'esperando_qr') {
      return (
        <span className="badge badge-amber shadow-sm">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span>Esperando Escaneo QR</span>
        </span>
      );
    }
    return (
      <span className="badge badge-red shadow-sm">
        <span className="w-2 h-2 rounded-full bg-rose-500" />
        <span>Desconectado</span>
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Topbar unificada */}
      <Topbar
        title="WhatsApp & Bot IA"
        subtitle="Bandeja omnicanal de mensajería, cotizaciones asistidas y enlace Baileys multi-device"
        actionSlot={
          <div className="flex items-center gap-2">
            {getStatusBadge()}
          </div>
        }
      />

      {/* Module Horizontal Tabs (Estilo Invenfarma) */}
      <div className="px-6 pt-3 pb-0 bg-white border-b border-[#E2E8F0] shrink-0">
        <div className="module-tabs-nav !mb-0">
          <div className="tabs-list">
            <button
              onClick={() => setActiveTab('chat')}
              className={`tab-item ${activeTab === 'chat' ? 'active' : ''}`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Bandeja de Chat</span>
            </button>
            <button
              onClick={() => setActiveTab('connection')}
              className={`tab-item ${activeTab === 'connection' ? 'active' : ''}`}
            >
              <QrCode className="w-4 h-4" />
              <span>Conexión QR & Dispositivo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'chat' ? (
        <div className="flex-1 p-4 md:p-6 overflow-hidden flex min-h-0 bg-[#F8F9FA]">
          {/* Card Container Flotante para el Chat */}
          <div className="w-full h-full bg-white border border-[#E2E8F0] rounded-2xl shadow-sm flex overflow-hidden">
            {/* Columna Izquierda: Lista de Conversaciones */}
            <div className="w-80 lg:w-96 border-r border-[#E2E8F0] bg-white flex flex-col shrink-0">
              {/* Barra de Búsqueda y Filtros */}
              <div className="p-3.5 border-b border-[#E2E8F0] space-y-2.5 bg-[#F8F9FA]/70">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar por teléfono o cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white border border-[#E2E8F0] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#2C3E50] placeholder-slate-400 focus:outline-none focus:border-[#4A90E2] transition shadow-2xs"
                  />
                </div>

                {/* Filtros de estado */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[11px]">
                  {[
                    { id: 'todos', label: 'Todos' },
                    { id: 'bot', label: 'Bot IA' },
                    { id: 'humano', label: 'Humano' },
                    { id: 'cerrada', label: 'Cerradas' },
                  ].map((pill) => (
                    <button
                      key={pill.id}
                      onClick={() => setFilterEstado(pill.id)}
                      className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition ${
                        filterEstado === pill.id
                          ? 'bg-[#1A5276] text-white shadow-xs font-semibold'
                          : 'bg-white border border-[#E2E8F0] text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lista de Conversaciones */}
              <div className="flex-1 overflow-y-auto divide-y divide-[#E2E8F0]/60">
                {conversaciones.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-500" />
                    <p className="text-xs font-medium">No hay conversaciones registradas</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Los mensajes entrantes de WhatsApp aparecerán aquí automáticamente.
                    </p>
                  </div>
                ) : (
                  conversaciones.map((conv) => {
                    const isSelected = selectedConvId === conv.id;
                    const isBot = conv.estado === ConversationStatus.BOT;
                    const isHumano = conv.estado === ConversationStatus.HUMANO;

                    return (
                      <button
                        key={conv.id}
                        onClick={() => setSelectedConvId(conv.id)}
                        className={`w-full text-left p-3.5 transition flex items-start gap-3 relative ${
                          isSelected
                            ? 'bg-[#EFF6FF] border-l-4 border-[#1A5276]'
                            : 'hover:bg-[#F8FAFC]'
                        }`}
                      >
                        {/* Avatar */}
                        <div className="relative shrink-0">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${
                            isSelected
                              ? 'bg-[#1A5276] text-white'
                              : 'bg-slate-100 text-[#1A5276] border border-slate-200'
                          }`}>
                            {conv.cliente?.nombre?.charAt(0).toUpperCase() || 'C'}
                          </div>
                          <span
                            className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                              isBot
                                ? 'bg-emerald-500'
                                : isHumano
                                  ? 'bg-sky-500'
                                  : 'bg-slate-400'
                            }`}
                          />
                        </div>

                        {/* Contenido */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-xs font-bold text-[#2C3E50] truncate">
                              {conv.cliente?.nombre || `+${conv.telefono}`}
                            </span>
                            {conv.ultimo_mensaje && (
                              <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                                {new Date(conv.ultimo_mensaje.timestamp).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 mb-1.5">
                            {isBot && (
                              <span className="badge badge-teal !text-[9px] !py-0.5 !px-1.5">
                                <Bot className="w-2.5 h-2.5" /> Bot IA
                              </span>
                            )}
                            {isHumano && (
                              <span className="badge badge-blue !text-[9px] !py-0.5 !px-1.5">
                                <UserCheck className="w-2.5 h-2.5" /> Asesor
                              </span>
                            )}
                            {conv.estado === ConversationStatus.CERRADA && (
                              <span className="badge badge-gray !text-[9px] !py-0.5 !px-1.5">
                                Cerrada
                              </span>
                            )}

                            {conv.orden_id && (
                              <span className="badge badge-amber !text-[9px] !py-0.5 !px-1.5">
                                <ShoppingBag className="w-2.5 h-2.5" /> Orden
                              </span>
                            )}
                          </div>

                          {/* Último mensaje */}
                          {conv.ultimo_mensaje ? (
                            <p className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                              {conv.ultimo_mensaje.rol === MessageRole.USER ? (
                                <span className="text-slate-400">Cliente:</span>
                              ) : conv.ultimo_mensaje.rol === MessageRole.BOT ? (
                                <span className="text-emerald-600 font-medium">Bot:</span>
                              ) : (
                                <span className="text-blue-600 font-medium">Asesor:</span>
                              )}
                              <span>{conv.ultimo_mensaje.contenido}</span>
                            </p>
                          ) : (
                            <p className="text-[11px] text-slate-400 italic">
                              Conversación iniciada
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Columna Derecha: Panel de Conversación Activa */}
            {selectedConv ? (
              <div className="flex-1 flex flex-col bg-[#F8F9FA] min-w-0">
                {/* Header del Chat */}
                <div className="px-5 py-3.5 border-b border-[#E2E8F0] bg-white flex items-center justify-between shrink-0 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#1A5276]/10 text-[#1A5276] font-bold text-xs flex items-center justify-center border border-[#1A5276]/20">
                      {selectedConv.cliente?.nombre?.charAt(0).toUpperCase() || 'C'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xs font-bold text-[#2C3E50]">
                          {selectedConv.cliente?.nombre || 'Cliente WhatsApp'}
                        </h2>
                        <span className="text-[11px] font-mono text-slate-500">
                          +{selectedConv.telefono}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-[10px] text-slate-500 font-medium">
                          Canal WhatsApp Business
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Acciones de Control del Chat */}
                  <div className="flex items-center gap-2">
                    {selectedConv.orden && (
                      <button
                        onClick={() => setSelectedOrdenId(selectedConv.orden_id!)}
                        className="btn btn-outline !py-1 !px-2.5 !text-xs !text-amber-700 !border-amber-300 !bg-amber-50 hover:!bg-amber-100"
                        title="Ver detalle de la orden generada"
                      >
                        <ShoppingBag className="w-3.5 h-3.5 text-amber-600" />
                        <span>
                          Orden #{selectedConv.orden.numero_orden} ($
                          {Number(selectedConv.orden.total).toFixed(2)})
                        </span>
                        <ExternalLink className="w-3 h-3 ml-0.5" />
                      </button>
                    )}

                    {selectedConv.estado === ConversationStatus.BOT ? (
                      <button
                        onClick={() =>
                          changeStateMutation.mutate(ConversationStatus.HUMANO)
                        }
                        disabled={changeStateMutation.isPending}
                        className="btn btn-outline !py-1.5 !px-3 !text-xs !text-sky-700 !border-sky-300 !bg-sky-50 hover:!bg-sky-100"
                        title="Pausa el bot para que intervengas tú manualmente"
                      >
                        <UserCheck className="w-3.5 h-3.5 text-sky-600" />
                        <span>Tomar Control Humano</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => changeStateMutation.mutate(ConversationStatus.BOT)}
                        disabled={changeStateMutation.isPending}
                        className="btn btn-teal !py-1.5 !px-3 !text-xs"
                        title="Vuelve a activar la atención automática del Bot IA"
                      >
                        <Bot className="w-3.5 h-3.5" />
                        <span>Reactivar Bot IA</span>
                      </button>
                    )}

                    <button
                      onClick={() =>
                        changeStateMutation.mutate(
                          selectedConv.estado === ConversationStatus.CERRADA
                            ? ConversationStatus.BOT
                            : ConversationStatus.CERRADA,
                        )
                      }
                      className="btn btn-outline !py-1.5 !px-2.5 !text-xs text-slate-500"
                    >
                      {selectedConv.estado === ConversationStatus.CERRADA
                        ? 'Reabrir'
                        : 'Cerrar Chat'}
                    </button>
                  </div>
                </div>

                {/* Flujo de Mensajes */}
                <div className="flex-1 overflow-y-auto p-5 space-y-3.5 bg-[#F8F9FA]">
                  {!selectedConv.mensajes || selectedConv.mensajes.length === 0 ? (
                    <div className="text-center text-slate-400 py-16">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
                      <p className="text-xs font-medium">No hay mensajes previos en esta conversación.</p>
                    </div>
                  ) : (
                    selectedConv.mensajes.map((msg: MensajeSummary) => {
                      const isUser = msg.rol === MessageRole.USER;
                      const isBot = msg.rol === MessageRole.BOT;
                      const isHumano = msg.rol === MessageRole.HUMANO;

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${
                            isUser ? 'items-start' : 'items-end'
                          }`}
                        >
                          <div
                            className={`max-w-xl rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-xs transition ${
                              isUser
                                ? 'bg-white text-[#2C3E50] border border-[#E2E8F0] rounded-tl-xs'
                                : isBot
                                  ? 'bg-[#F0FDF4] text-[#14532D] border border-[#BBF7D0] rounded-tr-xs'
                                  : 'bg-[#EFF6FF] text-[#1E3A8A] border border-[#BFDBFE] rounded-tr-xs'
                            }`}
                          >
                            {/* Header del rol */}
                            <div className="flex items-center justify-between gap-4 mb-1.5 pb-1 border-b border-black/5">
                              <span
                                className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                                  isUser
                                    ? 'text-slate-500'
                                    : isBot
                                      ? 'text-emerald-700'
                                      : 'text-sky-700'
                                }`}
                              >
                                {isUser && 'Cliente'}
                                {isBot && (
                                  <>
                                    <Bot className="w-2.5 h-2.5" /> Bot Tokugawa Spare Parts
                                  </>
                                )}
                                {isHumano && (
                                  <>
                                    <UserCheck className="w-2.5 h-2.5" /> Asesor Humano
                                  </>
                                )}
                              </span>

                              <span className="text-[10px] text-slate-400 flex items-center gap-1.5 font-medium">
                                <span>
                                  {new Date(msg.timestamp).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                                {!isUser && (
                                  <span className="inline-flex items-center">
                                    {msg.estado_envio === 'pendiente' && (
                                      <span
                                        title="En cola (esperando conexión WhatsApp)"
                                        className="text-amber-700 bg-amber-100 px-1 py-0.5 rounded text-[9px] font-mono"
                                      >
                                        ⏳ en cola
                                      </span>
                                    )}
                                    {msg.estado_envio === 'enviado' && (
                                      <span title="Enviado a WhatsApp" className="text-slate-500 font-mono text-[11px]">
                                        ✓
                                      </span>
                                    )}
                                    {msg.estado_envio === 'entregado' && (
                                      <span title="Entregado al cliente" className="text-slate-600 font-mono text-[11px]">
                                        ✓✓
                                      </span>
                                    )}
                                    {msg.estado_envio === 'leido' && (
                                      <span title="Leído por el cliente" className="text-sky-600 font-bold font-mono text-[11px]">
                                        ✓✓
                                      </span>
                                    )}
                                    {msg.estado_envio === 'fallido' && (
                                      <span title={`Error de envío: ${msg.error_envio || 'desconocido'}`} className="text-rose-600 text-[10px]">
                                        ⚠️
                                      </span>
                                    )}
                                  </span>
                                )}
                              </span>
                            </div>

                            {/* Contenido del Mensaje */}
                            <div className="whitespace-pre-wrap font-sans text-[12.5px] leading-relaxed">
                              {msg.contenido}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Barra Inferior: Respuestas Rápidas e Input */}
                <div className="p-4 border-t border-[#E2E8F0] bg-white shrink-0">
                  {/* Respuestas Rápidas */}
                  <div className="flex items-center gap-2 mb-2.5 overflow-x-auto pb-1 text-[11px]">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                      Respuestas Rápidas:
                    </span>
                    {[
                      'Estimado cliente, tenemos disponibilidad inmediata.',
                      'Datos de Pago Móvil: Banesco 0134, CI 12345678, Tel 04120000000',
                      'Realizamos envíos nacionales por MRW, Zoom y Tealca.',
                      'Horario de atención en tienda: Lunes a Viernes 8:00 AM a 5:00 PM.',
                    ].map((phrase, idx) => (
                      <button
                        key={idx}
                        onClick={() => setReplyText(phrase)}
                        className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:text-[#1A5276] hover:bg-blue-50 hover:border-blue-200 transition truncate whitespace-nowrap shadow-2xs text-[11.5px]"
                      >
                        {phrase}
                      </button>
                    ))}
                  </div>

                  {/* Formulario de Envío */}
                  <form onSubmit={handleSendMessage} className="flex items-center gap-2.5">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        placeholder={
                          selectedConv.estado === ConversationStatus.BOT
                            ? 'Escribe tu respuesta para el cliente por WhatsApp...'
                            : 'Escribe tu respuesta directa como asesor humano...'
                        }
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        disabled={sendMutation.isPending}
                        className="w-full bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-xs text-[#2C3E50] placeholder-slate-400 focus:outline-none focus:border-[#4A90E2] focus:bg-white transition shadow-2xs disabled:opacity-60"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={!replyText.trim() || sendMutation.isPending}
                      className="btn btn-primary !py-2.5 !px-5 !text-xs shrink-0 shadow-sm"
                    >
                      <Send className={`w-3.5 h-3.5 ${sendMutation.isPending ? 'animate-pulse' : ''}`} />
                      <span>{sendMutation.isPending ? 'Enviando...' : 'Enviar'}</span>
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
                <MessageSquare className="w-12 h-12 mb-3 opacity-30 text-[#1A5276]" />
                <h3 className="text-sm font-bold text-[#2C3E50] mb-1">
                  Bandeja de Entrada de WhatsApp
                </h3>
                <p className="text-xs max-w-sm text-slate-500">
                  Selecciona una conversación de la columna izquierda para ver el historial completo y responder al cliente.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Pestaña 2: Conexión QR & Dispositivo */
        <div className="flex-1 overflow-y-auto p-6 md:p-8 max-w-5xl mx-auto w-full space-y-6">
          {/* Header Card */}
          <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1">
              <span className="badge badge-teal">
                Protocolo Multi-Device Baileys
              </span>
              <h2 className="text-lg font-bold text-[#2C3E50]">
                Vincular WhatsApp de la Empresa
              </h2>
              <p className="text-xs text-slate-500 max-w-xl">
                Al conectar el WhatsApp oficial de la tienda, la Inteligencia Artificial atenderá clientes, buscará repuestos en catálogo y registrará órdenes de compra automáticamente.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => reconnectMutation.mutate()}
                disabled={reconnectMutation.isPending}
                className="btn btn-outline !text-xs"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    reconnectMutation.isPending ? 'animate-spin' : ''
                  }`}
                />
                <span>Forzar Reconexión</span>
              </button>

              {status.estado === 'conectado' && (
                <button
                  onClick={() => disconnectMutation.mutate()}
                  disabled={disconnectMutation.isPending}
                  className="btn !bg-rose-50 !border !border-rose-200 !text-rose-700 hover:!bg-rose-100 !text-xs"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Desvincular</span>
                </button>
              )}
            </div>
          </div>

          {/* Grid de QR e Instrucciones */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Izquierda: Código QR */}
            <div className="p-8 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm flex flex-col items-center text-center">
              <div className="flex items-center gap-2 mb-6">
                <QrCode className="w-5 h-5 text-[#1A5276]" />
                <h3 className="text-sm font-bold text-[#2C3E50] uppercase tracking-wider">
                  Código QR de Emparejamiento
                </h3>
              </div>

              {status.estado === 'conectado' ? (
                <div className="py-12 flex flex-col items-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-md">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-[#2C3E50]">¡WhatsApp Conectado!</h4>
                    <p className="text-xs text-slate-500 mt-1 font-mono">
                      +{status.telefonoVinculado}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {status.nombreVinculado || 'Tokugawa Spare Parts'}
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={() => setActiveTab('chat')}
                      className="btn btn-primary !text-xs"
                    >
                      Abrir Bandeja de Chat
                    </button>
                  </div>
                </div>
              ) : status.qrCode ? (
                <div className="space-y-4 flex flex-col items-center">
                  <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-200">
                    <img
                      src={status.qrCode}
                      alt="Código QR de WhatsApp"
                      className="w-60 h-60 object-contain"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-amber-600 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    <span>Código QR activo. Escanéalo desde tu WhatsApp.</span>
                  </div>
                </div>
              ) : (
                <div className="py-16 flex flex-col items-center space-y-4">
                  <RefreshCw className="w-8 h-8 text-slate-400 animate-spin" />
                  <p className="text-xs text-slate-500">
                    Generando código QR interactivo de Baileys...
                  </p>
                </div>
              )}
            </div>

            {/* Derecha: Pasos de Vinculación */}
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm space-y-4">
                <h4 className="text-xs font-bold text-[#2C3E50] uppercase tracking-wider flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-[#1A5276]" />
                  Pasos para vincular tu teléfono:
                </h4>

                <ol className="space-y-3 text-xs text-slate-600">
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#1A5276] text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                      1
                    </span>
                    <span>Abre la aplicación de WhatsApp en tu teléfono celular.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#1A5276] text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                      2
                    </span>
                    <span>
                      Toca el menú de <strong>tres puntos (⋮)</strong> en Android o ve a{' '}
                      <strong>Configuración</strong> en iPhone.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#1A5276] text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                      3
                    </span>
                    <span>
                      Selecciona <strong>Dispositivos vinculados</strong> y luego{' '}
                      <strong>Vincular un dispositivo</strong>.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#1A5276] text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                      4
                    </span>
                    <span>
                      Apunta la cámara de tu teléfono al código QR mostrado a la izquierda.
                    </span>
                  </li>
                </ol>
              </div>

              {/* Capacidades DeepSeek */}
              <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm space-y-3">
                <h4 className="text-xs font-bold text-[#2C3E50] uppercase tracking-wider flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  Capacidades del Asistente Virtual DeepSeek:
                </h4>

                <div className="grid grid-cols-2 gap-3 text-[11.5px]">
                  <div className="p-3 rounded-xl bg-[#F8F9FA] border border-slate-200">
                    <span className="font-bold text-[#2C3E50] block mb-0.5">
                      Búsqueda de Repuestos
                    </span>
                    <span className="text-slate-500">
                      Consulta catálogo por marca de auto, modelo y año.
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#F8F9FA] border border-slate-200">
                    <span className="font-bold text-[#2C3E50] block mb-0.5">
                      Disponibilidad & Precios
                    </span>
                    <span className="text-slate-500">
                      Stock en tiempo real y precios sin discrepancias.
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#F8F9FA] border border-slate-200">
                    <span className="font-bold text-[#2C3E50] block mb-0.5">
                      Órdenes Pendientes
                    </span>
                    <span className="text-slate-500">
                      Crea la orden y reserva stock temporalmente.
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#F8F9FA] border border-slate-200">
                    <span className="font-bold text-[#2C3E50] block mb-0.5">
                      Escalación Humana
                    </span>
                    <span className="text-slate-500">
                      Transfiere al vendedor cuando el cliente lo solicita.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalle de Orden */}
      {selectedOrdenId && (
        <DetalleOrdenModal
          ordenId={selectedOrdenId}
          onClose={() => setSelectedOrdenId(null)}
          onUpdated={() => {
            queryClient.invalidateQueries({ queryKey: ['conversacion', selectedConvId] });
            queryClient.invalidateQueries({ queryKey: ['conversaciones'] });
          }}
        />
      )}
    </div>
  );
}
