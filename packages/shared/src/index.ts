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

