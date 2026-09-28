// ============================================================================
// Shared Types & Enums — ERP Repuestos Multichannel
// ============================================================================

export enum UserRole {
  ADMIN = 'admin',
  VENDEDOR = 'vendedor',
  BODEGA = 'bodega',
}

export enum MovementType {
  ENTRADA = 'entrada',
  SALIDA = 'salida',
  AJUSTE = 'ajuste',
}

export enum ChannelType {
  ML = 'ml',
  WHATSAPP = 'whatsapp',
}

export enum Channel {
  ML = 'ml',
  WHATSAPP = 'whatsapp',
  MOSTRADOR = 'mostrador',
}

/** Tasa de comisión fija cobrada por la plataforma MercadoLibre por cada venta (12%) */
export const MERCADOLIBRE_COMMISSION_RATE = 0.12;

/**
 * Obtiene la tasa de comisión según el canal de venta.
 * Para MercadoLibre es 12% (0.12), para canales propios (mostrador, whatsapp) es 0%.
 */
export function getChannelCommissionRate(canal: Channel | string): number {
  return canal === Channel.ML || canal === 'ml' ? MERCADOLIBRE_COMMISSION_RATE : 0;
}

export interface FinancialCalculation {
  totalVenta: number;
  commissionRate: number;
  comisionPlataforma: number;
  ingresoNeto: number;
  costoMercancia: number;
  gananciaNeta: number;
  margenPorcentaje: number;
  esMercadoLibre: boolean;
}

/**
 * Calcula el desglose financiero completo de una orden:
 * total de venta, comisiones retenidas por plataforma (12% si es MercadoLibre),
 * costo total de mercancía vendida (COGS) y ganancia neta real con su margen %.
 */
export function calculateOrderFinancials(orden: {
  canal: Channel | string;
  total: number;
  detalles?: Array<{
    cantidad: number;
    subtotal?: number;
    precio_unitario?: number;
    sku?: { costo_promedio?: number };
  }>;
}): FinancialCalculation {
  const totalVenta = Number(orden.total) || 0;
  const commissionRate = getChannelCommissionRate(orden.canal);
  const comisionPlataforma = Number((totalVenta * commissionRate).toFixed(2));
  const ingresoNeto = Number((totalVenta - comisionPlataforma).toFixed(2));

  let costoMercancia = 0;
  if (orden.detalles && orden.detalles.length > 0) {
    costoMercancia = orden.detalles.reduce((acc, det) => {
      const costoUnit = Number(det.sku?.costo_promedio) || 0;
      return acc + (costoUnit * (det.cantidad || 1));
    }, 0);
    costoMercancia = Number(costoMercancia.toFixed(2));
  }

  const gananciaNeta = Number((ingresoNeto - costoMercancia).toFixed(2));
  const margenPorcentaje =
    totalVenta > 0 ? Number(((gananciaNeta / totalVenta) * 100).toFixed(1)) : 0;

  return {
    totalVenta,
    commissionRate,
    comisionPlataforma,
    ingresoNeto,
    costoMercancia,
    gananciaNeta,
    margenPorcentaje,
    esMercadoLibre: commissionRate > 0,
  };
}

/**
 * Calcula el desglose unitario financiero para un producto o publicación según el canal
 */
export function calculateItemChannelFinancials(
  precio: number,
  costoPromedio: number,
  canal: Channel | string,
) {
  const precioNum = Number(precio) || 0;
  const costoNum = Number(costoPromedio) || 0;
  const commissionRate = getChannelCommissionRate(canal);
  const comision = Number((precioNum * commissionRate).toFixed(2));
  const ingresoNeto = Number((precioNum - comision).toFixed(2));
  const gananciaNeta = Number((ingresoNeto - costoNum).toFixed(2));
  const margenPorcentaje =
    precioNum > 0 ? Number(((gananciaNeta / precioNum) * 100).toFixed(1)) : 0;

  return {
    precio: precioNum,
    costo: costoNum,
    commissionRate,
    comision,
    ingresoNeto,
    gananciaNeta,
    margenPorcentaje,
    esMercadoLibre: commissionRate > 0,
  };
}

export enum OrderStatus {
  PENDIENTE = 'pendiente',
  CONFIRMADA = 'confirmada',
  POR_DESPACHAR = 'por_despachar',
  DESPACHADA = 'despachada',
  CERRADA = 'cerrada',
  CANCELADA = 'cancelada',
}

export enum DeliveryType {
  RETIRO = 'retiro',
  DELIVERY = 'delivery',
  ENCOMIENDA = 'encomienda',
}

export enum PaymentStatus {
  PENDIENTE = 'pendiente',
  CONFIRMADO = 'confirmado',
}

export enum DocumentType {
  FACTURA = 'factura',
  RECIBO = 'recibo',
}

export enum PurchasePaymentCondition {
  CONTADO = 'contado',
  CREDITO = 'credito',
}

export enum PurchaseStatus {
  PENDIENTE = 'pendiente',
  RECIBIDA = 'recibida',
  PAGADA = 'pagada',
}

export enum ConversationStatus {
  BOT = 'bot',
  HUMANO = 'humano',
  CERRADA = 'cerrada',
}

export enum MessageRole {
  USER = 'user',
  BOT = 'bot',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
  HUMANO = 'humano',
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UserSummary {
  id: string;
  nombre: string;
  email: string;
  rol: UserRole;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  user: UserSummary;
}

export interface SkuSummary {
  id: string;
  sku_interno: string;
  nombre: string;
  marca: string;
  codigo_fabricante?: string | null;
  descripcion?: string | null;
  costo_promedio: number;
  precio_base: number;
  stock_actual: number;
  stock_minimo: number;
  ubicacion?: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
  compatibilidades?: CompatibilidadSummary[];
  publicaciones?: PublicacionSummary[];
}

export interface CompatibilidadSummary {
  id: string;
  sku_id: string;
  marca_vehiculo: string;
  modelo: string;
  anio_desde: number;
  anio_hasta?: number | null;
  motor?: string | null;
  notas?: string | null;
  created_at?: string;
  updated_at?: string;
  sku?: SkuSummary;
}

export interface CuentaCanalSummary {
  id: string;
  tipo: ChannelType;
  usuario_id?: string | null;
  alias: string;
  credenciales?: Record<string, unknown>;
  activa: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PublicacionSummary {
  id: string;
  sku_id: string;
  canal: Channel;
  cuenta_id?: string | null;
  ml_item_id?: string | null;
  titulo: string;
  precio: number;
  stock_publicado: number;
  estado: string;
  url?: string | null;
  created_at?: string;
  updated_at?: string;
  sku?: SkuSummary;
  cuenta?: CuentaCanalSummary | null;
}

export interface MovimientoStockSummary {
  id: string;
  sku_id: string;
  tipo: MovementType;
  cantidad: number;
  referencia_tipo?: string | null;
  referencia_id?: string | null;
  usuario_id?: string | null;
  notas?: string | null;
  created_at: string;
  sku?: SkuSummary;
  usuario?: UserSummary;
}

export interface AjusteStockPayload {
  tipo: MovementType;
  cantidad: number;
  referencia_tipo?: string;
  referencia_id?: string;
  notas?: string;
}

export interface CompatibilidadSearchParams {
  marca_vehiculo?: string;
  modelo?: string;
  anio?: number;
  motor?: string;
}

// ============================================================================
// FASE 2: Compras, Proveedores, Pagos y OCR
// ============================================================================

export interface ProveedorSummary {
  id: string;
  nombre: string;
  rif: string;
  contacto?: string | null;
  telefono?: string | null;
  email?: string | null;
  direccion?: string | null;
  created_at: string;
  updated_at: string;
  compras?: CompraSummary[];
}

export interface CompraDetalleSummary {
  id: string;
  compra_id: string;
  sku_id: string;
  cantidad: number;
  costo_unitario: number;
  subtotal: number;
  created_at?: string;
  updated_at?: string;
  sku?: SkuSummary;
}

export interface PagoCompraSummary {
  id: string;
  compra_id: string;
  fecha: string;
  monto: number;
  metodo: string;
  referencia?: string | null;
  usuario_id?: string | null;
  notas?: string | null;
  created_at: string;
  usuario?: UserSummary;
}

export interface CompraSummary {
  id: string;
  proveedor_id: string;
  numero_factura: string;
  fecha: string;
  subtotal: number;
  total: number;
  condicion_pago: PurchasePaymentCondition;
  dias_credito: number;
  estado: PurchaseStatus;
  archivo_url?: string | null;
  usuario_id?: string | null;
  created_at: string;
  updated_at: string;
  proveedor?: ProveedorSummary;
  detalles?: CompraDetalleSummary[];
  pagos?: PagoCompraSummary[];
  usuario?: UserSummary;
  monto_pagado?: number;
  saldo_pendiente?: number;
}

export interface EstadoCuentaProveedor {
  proveedor: ProveedorSummary;
  total_compras: number;
  total_facturado: number;
  total_pagado: number;
  saldo_pendiente: number;
  compras_pendientes: CompraSummary[];
  historial_pagos: PagoCompraSummary[];
}

export interface OcrFacturaItem {
  sku_interno?: string;
  descripcion: string;
  cantidad: number;
  costo_unitario: number;
  subtotal: number;
  sku_id_coincidente?: string | null;
}

export interface OcrParsedFacturaResult {
  proveedor_nombre?: string;
  rif?: string;
  numero_factura?: string;
  fecha?: string;
  condicion_pago?: PurchasePaymentCondition;
  dias_credito?: number;
  subtotal?: number;
  total?: number;
  archivo_url?: string;
  items: OcrFacturaItem[];
  raw_text?: string;
}

// ============================================================================
// FASE 3: Ventas, Clientes, Órdenes y Documentos Internos (Facturas / Recibos)
// ============================================================================

export interface ClienteSummary {
  id: string;
  nombre: string;
  telefono?: string | null;
  email?: string | null;
  direccion?: string | null;
  notas?: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrdenDetalleSummary {
  id: string;
  orden_id: string;
  sku_id: string;
  publicacion_id?: string | null;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  created_at?: string;
  updated_at?: string;
  sku?: SkuSummary;
  publicacion?: PublicacionSummary | null;
}

export interface DocumentoVentaSummary {
  id: string;
  orden_id: string;
  tipo: DocumentType;
  numero: string;
  fecha: string;
  datos_cliente?: Record<string, any>;
  pdf_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrdenSummary {
  id: string;
  numero_orden: string;
  canal: Channel;
  cuenta_id?: string | null;
  vendedor_id?: string | null;
  cliente_id?: string | null;
  fecha: string;
  estado: OrderStatus;
  tipo_entrega: DeliveryType;
  direccion_entrega?: string | null;
  total: number;
  metodo_pago: string;
  estado_pago: PaymentStatus;
  origen?: string | null;
  created_at: string;
  updated_at: string;
  cliente?: ClienteSummary | null;
  vendedor?: UserSummary | null;
  cuenta?: CuentaCanalSummary | null;
  detalles?: OrdenDetalleSummary[];
  documentos?: DocumentoVentaSummary[];
}

export interface CreateOrdenItemDto {
  sku_id: string;
  cantidad: number;
  precio_unitario: number;
  publicacion_id?: string;
}

export interface CreateClienteDto {
  nombre: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  notas?: string;
}

export interface CreateOrdenDto {
  canal?: Channel;
  cuenta_id?: string;
  cliente_id?: string;
  cliente_nuevo?: CreateClienteDto;
  tipo_entrega?: DeliveryType;
  direccion_entrega?: string;
  metodo_pago?: string;
  estado_pago?: PaymentStatus;
  generar_documento?: DocumentType;
  items: CreateOrdenItemDto[];
}

// ============================================================================
// FASE 4: WhatsApp, Baileys, Conversaciones y DeepSeek Bot
// ============================================================================

export type WhatsAppConnectionState =
  | 'desconectado'
  | 'esperando_qr'
  | 'conectando'
  | 'conectado';

export interface WhatsAppStatusSummary {
  estado: WhatsAppConnectionState;
  qrCode?: string | null;
  telefonoVinculado?: string | null;
  nombreVinculado?: string | null;
  ultimaConexion?: string | null;
}

export type EstadoEnvioMensaje =
  | 'pendiente'
  | 'enviado'
  | 'entregado'
  | 'leido'
  | 'fallido';

export interface MensajeSummary {
  id: string;
  conversacion_id: string;
  rol: MessageRole;
  contenido: string;
  timestamp: string;
  id_whatsapp?: string | null;
  estado_envio?: EstadoEnvioMensaje;
  intentos_envio?: number;
  error_envio?: string | null;
}

export interface ConversacionSummary {
  id: string;
  canal: Channel;
  cuenta_id?: string | null;
  cliente_id?: string | null;
  telefono: string;
  jid?: string | null;
  estado: ConversationStatus;
  orden_id?: string | null;

  created_at: string;
  updated_at: string;
  cliente?: ClienteSummary | null;
  orden?: OrdenSummary | null;
  mensajes?: MensajeSummary[];
  ultimo_mensaje?: MensajeSummary | null;
  no_leidos?: number;
}

export type ConversacionDetalle = ConversacionSummary;

export interface EnviarMensajeWhatsappDto {
  conversacion_id: string;
  contenido: string;
}

export interface CambiarEstadoConversacionDto {
  estado: ConversationStatus;
}

// ============================================================================
// FASE 5: Optimización, Alertas y Reportes Ejecutivos
// ============================================================================

export interface ReporteVentasPorCanal {
  canal: Channel;
  total_ventas: number;
  cantidad_ordenes: number;
  ticket_promedio: number;
  porcentaje_total: number;
}

export interface ReporteVentasPorVendedor {
  vendedor_id: string;
  vendedor_nombre: string;
  total_ventas: number;
  cantidad_ordenes: number;
  ticket_promedio: number;
  comision_estimada: number;
}

export interface RankingSkuVendido {
  sku_id: string;
  sku_interno: string;
  nombre: string;
  marca: string;
  cantidad_vendida: number;
  ingresos_totales: number;
  costo_total: number;
  margen_ganancia: number;
  porcentaje_margen: number;
}

export interface VentasDiariasItem {
  fecha: string; // YYYY-MM-DD
  total: number;
  ordenes: number;
}

export interface DashboardKpis {
  ventas_mes_actual: {
    total: number;
    ordenes: number;
    comparacion_mes_anterior_pct: number;
  };
  ventas_mes_anterior: {
    total: number;
    ordenes: number;
  };
  ticket_promedio: number;
  tasa_conversion_bot: {
    total_conversaciones: number;
    ordenes_whatsapp: number;
    conversion_pct: number;
  };
  stock_critico_count: number;
  conversaciones_pendientes_humano: number;
  ventas_diarias: VentasDiariasItem[];
  canales: ReporteVentasPorCanal[];
  top_skus: RankingSkuVendido[];
  vendedores: ReporteVentasPorVendedor[];
}

export type TipoAlerta =
  | 'stock_bajo'
  | 'whatsapp_sin_atender'
  | 'compra_vencida'
  | 'sistema';

export type NivelAlerta = 'critico' | 'advertencia' | 'info';

export interface AlertaItem {
  id: string;
  tipo: TipoAlerta;
  nivel: NivelAlerta;
  titulo: string;
  mensaje: string;
  metadata?: Record<string, any>;
  timestamp: string;
  accion_url?: string;
  accion_label?: string;
}

export interface SugerirPrecioPayload {
  margen_objetivo_pct?: number;
  notas_adicionales?: string;
}

export interface SugerirPrecioResponse {
  sku_id: string;
  sku_interno: string;
  nombre: string;
  costo_promedio: number;
  precio_actual: number;
  precio_sugerido: number;
  margen_estimado_pct: number;
  margen_ganancia_unidad: number;
  razonamiento: string;
  factores: string[];
  confianza: 'alta' | 'media' | 'estimada';
}

export interface SistemaHealthSummary {
  status: 'healthy' | 'degraded' | 'error';
  timestamp: string;
  uptime_segundos: number;
  memoria: {
    rss_mb: number;
    heap_used_mb: number;
    heap_total_mb: number;
  };
  servicios: {
    database: { status: 'up' | 'down'; latency_ms?: number; error?: string };
    redis: { status: 'up' | 'down'; latency_ms?: number; error?: string };
    baileys: { status: WhatsAppConnectionState; telefono?: string | null };
    deepseek: { status: 'configured' | 'heuristic_fallback' };
    mail: { status: 'configured' | 'simulated' };
  };
}



