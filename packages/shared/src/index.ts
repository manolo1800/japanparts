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
