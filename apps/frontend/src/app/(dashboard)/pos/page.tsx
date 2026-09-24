'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  SkuSummary,
  Channel,
  DeliveryType,
  PaymentStatus,
  DocumentType,
  OrdenSummary,
} from '@japonparts/shared';
import { apiClient } from '../../../lib/api-client';
import { Header } from '../../../components/header';
import {
  Search,
  Store,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Car,
  Tag,
  CreditCard,
  User,
  Printer,
  Receipt,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';


interface CartItem {
  sku: SkuSummary;
  cantidad: number;
  precio_unitario: number;
}

export default function PosPage() {
  // Search state
  const [searchMode, setSearchMode] = useState<'texto' | 'vehiculo'>('texto');
  const [searchTerm, setSearchTerm] = useState('');
  const [vehicleBrand, setVehicleBrand] = useState('Toyota');
  const [vehicleModel, setVehicleModel] = useState('Corolla');
  const [vehicleYear, setVehicleYear] = useState('1995');
  const [vehicleMotor, setVehicleMotor] = useState('1.8');

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);

  // Checkout Form State
  const [clienteModo, setClienteModo] = useState<'ocasional' | 'datos'>('ocasional');
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');
  const [clienteDireccion, setClienteDireccion] = useState('');
  const [tipoEntrega, setTipoEntrega] = useState<DeliveryType>(DeliveryType.RETIRO);
  const [direccionEntrega, setDireccionEntrega] = useState('');
  const [metodoPago, setMetodoPago] = useState<string>('efectivo');
  const [estadoPago, setEstadoPago] = useState<PaymentStatus>(PaymentStatus.CONFIRMADO);
  const [generarDocumento, setGenerarDocumento] = useState<DocumentType | 'ninguno'>(
    DocumentType.FACTURA,
  );

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<OrdenSummary | null>(null);

  // Fetch products by text search
  const {
    data: skusData,
    isLoading: loadingSkus,
    refetch: refetchSkus,
  } = useQuery({
    queryKey: ['pos-skus', searchTerm],
    queryFn: async () => {
      const res = await apiClient.get<any>('/sku', {
        search: searchTerm.trim() || undefined,
        limit: 30,
      });
      return res.data?.items || [];
    },
    enabled: searchMode === 'texto',
  });

  // Fetch products by vehicle search
  const {
    data: vehicleData,
    isLoading: loadingVehicle,
    refetch: refetchVehicle,
  } = useQuery({
    queryKey: [
      'pos-vehicle',
      vehicleBrand,
      vehicleModel,
      vehicleYear,
      vehicleMotor,
    ],
    queryFn: async () => {
      const res = await apiClient.get<any[]>('/compatibilidad/buscar', {
        marca_vehiculo: vehicleBrand || undefined,
        modelo: vehicleModel || undefined,
        anio: vehicleYear ? parseInt(vehicleYear) : undefined,
        motor: vehicleMotor || undefined,
      });
      // Extract unique SKUs
      const map = new Map<string, SkuSummary>();
      (res.data || []).forEach((c) => {
        if (c.sku && !map.has(c.sku.id)) {
          map.set(c.sku.id, c.sku);
        }
      });
      return Array.from(map.values());
    },
    enabled: searchMode === 'vehiculo',
  });

  const availableProducts: SkuSummary[] =
    searchMode === 'texto' ? skusData || [] : vehicleData || [];
  const isLoadingProducts =
    searchMode === 'texto' ? loadingSkus : loadingVehicle;

  // Cart operations
  const addToCart = (sku: SkuSummary) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.sku.id === sku.id);
      if (existing) {
        if (existing.cantidad >= sku.stock_actual) {
          return prev; // Don't exceed available stock
        }
        return prev.map((item) =>
          item.sku.id === sku.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item,
        );
      }
      return [
        ...prev,
        {
          sku,
          cantidad: 1,
          precio_unitario: Number(sku.precio_base) || 0,
        },
      ];
    });
  };

  const updateQuantity = (skuId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.sku.id === skuId) {
            const nextCant = item.cantidad + delta;
            if (nextCant <= 0) return null;
            if (nextCant > item.sku.stock_actual) return item;
            return { ...item, cantidad: nextCant };
          }
          return item;
        })
        .filter(Boolean) as CartItem[],
    );
  };

  const removeFromCart = (skuId: string) => {
    setCart((prev) => prev.filter((item) => item.sku.id !== skuId));
  };

  const clearCart = () => {
    setCart([]);
    setClienteModo('ocasional');
    setClienteNombre('');
    setClienteTelefono('');
    setClienteEmail('');
    setClienteDireccion('');
    setDireccionEntrega('');
  };

  const cartTotal = cart.reduce(
    (acc, item) => acc + item.cantidad * item.precio_unitario,
    0,
  );

  // Process Sale
  const handleProcesarVenta = async () => {
    if (cart.length === 0) return;

    try {
      setSubmitting(true);
      setSubmitError(null);

      const payload: any = {
        canal: Channel.MOSTRADOR,
        tipo_entrega: tipoEntrega,
        direccion_entrega: direccionEntrega || undefined,
        metodo_pago: metodoPago,
        estado_pago: estadoPago,
        generar_documento:
          generarDocumento !== 'ninguno' ? generarDocumento : undefined,
        items: cart.map((item) => ({
          sku_id: item.sku.id,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
        })),
      };

      if (clienteModo === 'datos' && clienteNombre.trim()) {
        payload.cliente_nuevo = {
          nombre: clienteNombre.trim(),
          telefono: clienteTelefono.trim() || undefined,
          email: clienteEmail.trim() || undefined,
          direccion: clienteDireccion.trim() || undefined,
        };
      }

      const res = await apiClient.post<OrdenSummary>('/orden', payload);
      setCreatedOrder(res.data || null);
      clearCart();
      if (searchMode === 'texto') refetchSkus();
      else refetchVehicle();
    } catch (err: any) {
      setSubmitError(err.message || 'Error al procesar la venta');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pb-12 min-h-screen">
      <Header
        title="Punto de Venta Mostrador (POS)"
        subtitle="Venta rápida con descuento inmediato de stock, cobro en caja y emisión de factura o recibo"
        onRefresh={() => {
          if (searchMode === 'texto') refetchSkus();
          else refetchVehicle();
        }}
      />

      <div className="p-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: Search & Catalog Column (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Search Controls Card */}
            <div className="glass-card p-4 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Store className="w-4 h-4 text-rose-400" />
                  <span>Catálogo de Repuestos</span>
                </span>

                {/* Mode Selector Tabs */}
                <div className="flex bg-slate-900/90 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setSearchMode('texto')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                      searchMode === 'texto'
                        ? 'bg-rose-500 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Por SKU / Nombre</span>
                  </button>
                  <button
                    onClick={() => setSearchMode('vehiculo')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                      searchMode === 'vehiculo'
                        ? 'bg-rose-500 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Car className="w-3.5 h-3.5" />
                    <span>Por Vehículo</span>
                  </button>
                </div>
              </div>

              {/* Mode A: Text Search Input */}
              {searchMode === 'texto' ? (
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Escriba SKU, marca o descripción (ej: DEN-YKT22, bujía, filtro)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition"
                  />
                </div>
              ) : (
                /* Mode B: Vehicle Search Form */
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Marca
                    </label>
                    <input
                      type="text"
                      value={vehicleBrand}
                      onChange={(e) => setVehicleBrand(e.target.value)}
                      placeholder="Toyota"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Modelo
                    </label>
                    <input
                      type="text"
                      value={vehicleModel}
                      onChange={(e) => setVehicleModel(e.target.value)}
                      placeholder="Corolla"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Año
                    </label>
                    <input
                      type="number"
                      value={vehicleYear}
                      onChange={(e) => setVehicleYear(e.target.value)}
                      placeholder="1995"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Motor
                    </label>
                    <input
                      type="text"
                      value={vehicleMotor}
                      onChange={(e) => setVehicleMotor(e.target.value)}
                      placeholder="1.8"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Products Grid */}
            <div className="space-y-3">
              {isLoadingProducts ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3 glass-card rounded-2xl">
                  <div className="w-8 h-8 border-3 border-rose-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-slate-400 font-mono">Buscando productos...</span>
                </div>
              ) : availableProducts.length === 0 ? (
                <div className="py-16 text-center glass-card rounded-2xl p-6">
                  <Tag className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                  <p className="text-sm font-semibold text-slate-300">
                    No se encontraron repuestos con los criterios de búsqueda
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Pruebe con otro término o verifique la compatibilidad
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {availableProducts.map((sku) => {
                    const inCart = cart.find((item) => item.sku.id === sku.id);
                    const stockRestante = sku.stock_actual - (inCart?.cantidad || 0);
                    const sinStock = stockRestante <= 0;

                    return (
                      <div
                        key={sku.id}
                        className="glass-card p-4 rounded-xl flex flex-col justify-between border border-slate-800/80 hover:border-slate-700 transition"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-mono text-xs font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                              {sku.sku_interno}
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold uppercase ${
                                sinStock
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                  : stockRestante <= 3
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              }`}
                            >
                              Stock: {stockRestante}
                            </span>
                          </div>

                          <h3 className="text-sm font-semibold text-white mt-2 line-clamp-2 leading-snug">
                            {sku.nombre}
                          </h3>

                          {sku.marca && (
                            <span className="text-[11px] text-slate-400 block mt-1">
                              Marca: <span className="text-slate-300">{sku.marca}</span>
                            </span>
                          )}

                          {sku.ubicacion && (
                            <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                              Ubicación: {sku.ubicacion}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800/80">
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase block font-semibold">
                              Precio Base
                            </span>
                            <span className="text-base font-black text-white font-mono">
                              ${Number(sku.precio_base).toFixed(2)} USD
                            </span>
                          </div>

                          <button
                            onClick={() => addToCart(sku)}
                            disabled={sinStock}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm ${
                              sinStock
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white shadow-rose-600/20'
                            }`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>{inCart ? `Agregar (${inCart.cantidad})` : 'Agregar'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: POS Register & Cart Column (5 Cols) */}
          <div className="lg:col-span-5 sticky top-20 space-y-4">
            <div className="glass-card p-5 rounded-2xl border-2 border-slate-800 space-y-4 shadow-xl">
              {/* Cart Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-wide">
                      Carrito de Venta
                    </h2>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {cart.length} {cart.length === 1 ? 'producto' : 'productos'} seleccionados
                    </span>
                  </div>
                </div>

                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-[11px] text-slate-400 hover:text-rose-400 transition"
                  >
                    Vaciar carrito
                  </button>
                )}
              </div>

              {/* Cart Items List */}
              <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                {cart.length === 0 ? (
                  <div className="py-8 text-center border border-dashed border-slate-800 rounded-xl">
                    <p className="text-xs text-slate-500">
                      El carrito está vacío. Agregue productos del catálogo.
                    </p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.sku.id}
                      className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-rose-400 text-[11px]">
                            {item.sku.sku_interno}
                          </span>
                        </div>
                        <p className="text-white truncate font-medium mt-0.5">
                          {item.sku.nombre}
                        </p>
                        <span className="text-[11px] font-mono text-slate-400">
                          ${item.precio_unitario.toFixed(2)} c/u
                        </span>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => updateQuantity(item.sku.id, -1)}
                          className="w-6 h-6 rounded-md bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center font-bold text-white font-mono">
                          {item.cantidad}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.sku.id, 1)}
                          disabled={item.cantidad >= item.sku.stock_actual}
                          className="w-6 h-6 rounded-md bg-slate-800 hover:bg-slate-700 disabled:opacity-30 flex items-center justify-center text-slate-300 transition"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => removeFromCart(item.sku.id)}
                          className="p-1 text-slate-500 hover:text-red-400 transition ml-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Customer Selector Section */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-rose-400" />
                    <span>Cliente</span>
                  </span>

                  <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[10px]">
                    <button
                      onClick={() => setClienteModo('ocasional')}
                      className={`px-2 py-0.5 rounded-md font-medium transition ${
                        clienteModo === 'ocasional'
                          ? 'bg-rose-500 text-white'
                          : 'text-slate-400'
                      }`}
                    >
                      Ocasional
                    </button>
                    <button
                      onClick={() => setClienteModo('datos')}
                      className={`px-2 py-0.5 rounded-md font-medium transition ${
                        clienteModo === 'datos'
                          ? 'bg-rose-500 text-white'
                          : 'text-slate-400'
                      }`}
                    >
                      Registrar Datos
                    </button>
                  </div>
                </div>

                {clienteModo === 'datos' && (
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs">
                    <input
                      type="text"
                      placeholder="Nombre o Razón Social *"
                      value={clienteNombre}
                      onChange={(e) => setClienteNombre(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-rose-500"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Teléfono (ej: 0414...)"
                        value={clienteTelefono}
                        onChange={(e) => setClienteTelefono(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-rose-500"
                      />
                      <input
                        type="email"
                        placeholder="Email (opcional)"
                        value={clienteEmail}
                        onChange={(e) => setClienteEmail(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-rose-500"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Dirección fiscal o de entrega"
                      value={clienteDireccion}
                      onChange={(e) => setClienteDireccion(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                )}
              </div>

              {/* Delivery and Payment Controls */}
              <div className="space-y-3 pt-2 border-t border-slate-800 text-xs">
                {/* Delivery Type */}
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Modalidad de Entrega
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: DeliveryType.RETIRO, label: 'Retiro Mostrador' },
                      { id: DeliveryType.DELIVERY, label: 'Delivery' },
                      { id: DeliveryType.ENCOMIENDA, label: 'Encomienda' },
                    ].map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setTipoEntrega(d.id)}
                        className={`py-1.5 px-2 rounded-lg font-semibold text-[10px] border transition ${
                          tipoEntrega === d.id
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>

                  {tipoEntrega !== DeliveryType.RETIRO && (
                    <input
                      type="text"
                      placeholder="Dirección de entrega o empresa (MRW, Zoom)..."
                      value={direccionEntrega}
                      onChange={(e) => setDireccionEntrega(e.target.value)}
                      className="w-full mt-2 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-rose-500 text-xs"
                    />
                  )}
                </div>

                {/* Payment Method */}
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Método de Pago
                  </span>
                  <select
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-rose-500 text-xs font-medium"
                  >
                    <option value="efectivo">Efectivo ($ USD / Bs)</option>
                    <option value="pago_movil">Pago Móvil</option>
                    <option value="punto_venta">Punto de Venta / Tarjeta Débito</option>
                    <option value="zelle">Zelle</option>
                    <option value="transferencia">Transferencia Bancaria</option>
                  </select>
                </div>

                {/* Payment Status */}
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Estado del Cobro
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEstadoPago(PaymentStatus.CONFIRMADO)}
                      className={`py-1.5 px-2 rounded-lg font-semibold text-[10px] border transition ${
                        estadoPago === PaymentStatus.CONFIRMADO
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-slate-900/60 text-slate-400 border-slate-800'
                      }`}
                    >
                      Cobro Confirmado
                    </button>
                    <button
                      type="button"
                      onClick={() => setEstadoPago(PaymentStatus.PENDIENTE)}
                      className={`py-1.5 px-2 rounded-lg font-semibold text-[10px] border transition ${
                        estadoPago === PaymentStatus.PENDIENTE
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-slate-900/60 text-slate-400 border-slate-800'
                      }`}
                    >
                      Cobro Pendiente
                    </button>
                  </div>
                </div>

                {/* Document Type to Emit */}

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Emitir Documento Interno
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: DocumentType.FACTURA, label: 'Factura' },
                      { id: DocumentType.RECIBO, label: 'Recibo' },
                      { id: 'ninguno', label: 'Sin Documento' },
                    ].map((doc) => (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => setGenerarDocumento(doc.id as any)}
                        className={`py-1.5 px-2 rounded-lg font-semibold text-[10px] border transition ${
                          generarDocumento === doc.id
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
                        }`}
                      >
                        {doc.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Totals & Submit */}
              <div className="pt-3 border-t border-slate-800 space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs uppercase font-bold text-slate-400">
                    Total a Cobrar:
                  </span>
                  <span className="text-2xl font-black text-rose-400 font-mono">
                    ${cartTotal.toFixed(2)} USD
                  </span>
                </div>

                {submitError && (
                  <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                <button
                  onClick={handleProcesarVenta}
                  disabled={cart.length === 0 || submitting}
                  className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white shadow-lg shadow-rose-600/30 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>
                    {submitting ? 'Procesando Venta...' : `Cobrar $${cartTotal.toFixed(2)} USD`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal upon Order Completion */}
      {createdOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#0b101b] border border-slate-800 text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">¡Venta Registrada Exitosamente!</h3>
              <p className="text-xs text-slate-400 mt-1">
                El stock fue descontado y los movimientos quedaron asentados en kardex.
              </p>
              <div className="mt-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800 inline-block font-mono font-bold text-rose-400 text-sm">
                Orden: {createdOrder.numero_orden}
              </div>
            </div>

            {/* Document PDF buttons */}
            <div className="space-y-2 pt-2">
              <a
                href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/orden/${createdOrder.id}/pdf?tipo=factura`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold bg-rose-500 hover:bg-rose-400 text-white transition shadow-md shadow-rose-600/20"
              >
                <Printer className="w-4 h-4" />
                <span>Ver / Imprimir Factura PDF</span>
              </a>

              <a
                href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/orden/${createdOrder.id}/pdf?tipo=recibo`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
              >
                <Receipt className="w-4 h-4" />
                <span>Ver Recibo de Entrega PDF</span>
              </a>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setCreatedOrder(null)}
                className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Iniciar Nueva Venta Mostrador</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
