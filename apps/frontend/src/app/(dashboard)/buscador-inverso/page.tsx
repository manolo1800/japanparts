'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CompatibilidadSummary } from '@japonparts/shared';
import { apiClient } from '../../../lib/api-client';
import { Header } from '../../../components/header';
import {
  Car,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  Package,
} from 'lucide-react';
import Link from 'next/link';

export default function BuscadorInversoPage() {
  const [marca, setMarca] = useState('Toyota');
  const [modelo, setModelo] = useState('Corolla');
  const [anio, setAnio] = useState<string>('1995');
  const [motor, setMotor] = useState('1.8');

  // Trigger search on state or form submit
  const [activeSearch, setActiveSearch] = useState({
    marca: 'Toyota',
    modelo: 'Corolla',
    anio: '1995',
    motor: '1.8',
  });

  const { data: resultados, isLoading, refetch } = useQuery<CompatibilidadSummary[]>({
    queryKey: ['compat-search', activeSearch],
    queryFn: async () => {
      const res = await apiClient.get<CompatibilidadSummary[]>('/compatibilidad/buscar', {
        marca_vehiculo: activeSearch.marca || undefined,
        modelo: activeSearch.modelo || undefined,
        anio: activeSearch.anio ? parseInt(activeSearch.anio) : undefined,
        motor: activeSearch.motor || undefined,
      });
      return res.data!;
    },
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch({
      marca: marca.trim(),
      modelo: modelo.trim(),
      anio: anio.trim(),
      motor: motor.trim(),
    });
  };

  const handleQuickPreset = (pMarca: string, pModelo: string, pAnio: string, pMotor: string) => {
    setMarca(pMarca);
    setModelo(pModelo);
    setAnio(pAnio);
    setMotor(pMotor);
    setActiveSearch({
      marca: pMarca,
      modelo: pModelo,
      anio: pAnio,
      motor: pMotor,
    });
  };

  return (
    <div className="pb-16">
      <Header
        title="Buscador Inverso por Vehículo"
        subtitle="Identifica instantáneamente repuestos compatibles según la marca, modelo, año y motorización del auto"
        onRefresh={() => refetch()}
        showNewSkuBtn={false}
      />

      <div className="p-8 max-w-7xl mx-auto space-y-8">
        {/* Search Engine Form */}
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[#1A5276]">
                <Car className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-[#2C3E50]">
                ¿Qué repuestos le sirven a este vehículo?
              </h2>
            </div>

            {/* Quick Demo Presets */}
            <div className="hidden lg:flex items-center gap-2">
              <span className="text-[11px] text-[#7F8C8D] uppercase font-semibold tracking-wider">
                Prueba rápida:
              </span>
              <button
                type="button"
                onClick={() => handleQuickPreset('Toyota', 'Corolla', '1995', '1.8')}
                className="px-2.5 py-1 rounded-lg bg-[#EFF6FF] text-[#1A5276] border border-[#BFDBFE] text-xs font-mono hover:bg-[#DBEAFE] transition font-bold"
              >
                Corolla 1995 1.8L
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset('Toyota', 'Yaris', '2008', '1.5')}
                className="px-2.5 py-1 rounded-lg bg-[#F8F9FA] text-[#7F8C8D] border border-[#E2E8F0] text-xs font-mono hover:bg-[#EFF6FF] hover:text-[#1A5276] hover:border-[#BFDBFE] transition"
              >
                Yaris 2008 1.5L
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset('Honda', 'Civic', '1998', '1.6')}
                className="px-2.5 py-1 rounded-lg bg-[#F8F9FA] text-[#7F8C8D] border border-[#E2E8F0] text-xs font-mono hover:bg-[#EFF6FF] hover:text-[#1A5276] hover:border-[#BFDBFE] transition"
              >
                Civic 1998 1.6L
              </button>
            </div>
          </div>

          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#7F8C8D] uppercase tracking-wider mb-1.5">
                Marca Vehículo
              </label>
              <input
                type="text"
                placeholder="Ej: Toyota"
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-[#2C3E50] text-xs font-semibold focus:outline-none focus:border-[#1A5276] transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#7F8C8D] uppercase tracking-wider mb-1.5">
                Modelo
              </label>
              <input
                type="text"
                placeholder="Ej: Corolla"
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-[#2C3E50] text-xs font-semibold focus:outline-none focus:border-[#1A5276] transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#7F8C8D] uppercase tracking-wider mb-1.5">
                Año del Auto
              </label>
              <input
                type="number"
                placeholder="Ej: 1995"
                value={anio}
                onChange={(e) => setAnio(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-[#2C3E50] text-xs font-mono font-semibold focus:outline-none focus:border-[#1A5276] transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#7F8C8D] uppercase tracking-wider mb-1.5">
                Motor / Cilindrada
              </label>
              <input
                type="text"
                placeholder="Ej: 1.8"
                value={motor}
                onChange={(e) => setMotor(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-[#2C3E50] text-xs font-semibold focus:outline-none focus:border-[#1A5276] transition"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#1A5276] hover:bg-[#154360] text-white text-xs font-bold shadow-md shadow-[#1A5276]/20 transition flex items-center justify-center gap-2 active:scale-98"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Buscar Piezas</span>
              </button>
            </div>
          </form>
        </div>

        {/* Results Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[#2C3E50] uppercase tracking-wider flex items-center gap-2">
              <span>Resultados Compatibles</span>
              <span className="px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#1A5276] border border-[#BFDBFE] text-xs font-mono font-bold">
                {resultados?.length || 0}
              </span>
            </h3>
            {activeSearch.modelo && (
              <span className="text-xs text-[#7F8C8D] font-mono">
                Criterio: {activeSearch.marca} {activeSearch.modelo} {activeSearch.anio} {activeSearch.motor && `(${activeSearch.motor})`}
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="bg-white p-12 rounded-2xl border border-[#E2E8F0] text-center text-[#7F8C8D] font-mono text-xs shadow-sm">
              <div className="w-8 h-8 border-3 border-[#1A5276] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Buscando coincidencias en la matriz de compatibilidad...
            </div>
          ) : !resultados || resultados.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-[#E2E8F0] text-center space-y-3 shadow-sm">
              <Package className="w-10 h-10 text-[#7F8C8D] mx-auto" />
              <p className="text-[#2C3E50] font-semibold text-sm">
                No se encontraron repuestos compatibles para estos parámetros.
              </p>
              <p className="text-[#7F8C8D] text-xs">
                Verifica el rango de años o prueba buscar con términos más amplios (por ejemplo omitiendo el motor).
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {resultados.map((item) => {
                const sku = item.sku;
                if (!sku) return null;

                const isAgotado = sku.stock_actual <= 0;
                const isCritico = sku.stock_actual <= sku.stock_minimo;

                return (
                  <div
                    key={item.id}
                    className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm hover:border-[#BFDBFE] hover:shadow-md transition flex flex-col justify-between group space-y-4"
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-[#1A5276] bg-[#EFF6FF] px-2 py-0.5 rounded border border-[#BFDBFE]">
                            {sku.sku_interno}
                          </span>
                          <span className="text-xs font-bold text-[#2C3E50]">
                            {sku.marca}
                          </span>
                        </div>

                        {/* Stock Badge */}
                        <div className="font-mono text-xs font-bold">
                          {isAgotado ? (
                            <span className="text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full flex items-center gap-1 text-[11px]">
                              <XCircle className="w-3 h-3" /> Sin Stock
                            </span>
                          ) : isCritico ? (
                            <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1 text-[11px]">
                              <AlertTriangle className="w-3 h-3" /> {sku.stock_actual} uds
                            </span>
                          ) : (
                            <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1 text-[11px]">
                              <CheckCircle2 className="w-3 h-3" /> {sku.stock_actual} uds
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Part Name */}
                      <h4 className="font-bold text-[#2C3E50] text-sm mt-3 group-hover:text-[#1A5276] transition">
                        {sku.nombre}
                      </h4>

                      {/* Vehicle Range Applied */}
                      <div className="mt-3 p-2.5 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-[11px] space-y-1">
                        <div className="flex items-center justify-between text-[#7F8C8D]">
                          <span>Aplica para:</span>
                          <span className="font-semibold text-[#2C3E50]">
                            {item.marca_vehiculo} {item.modelo}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[#7F8C8D]">
                          <span>Años:</span>
                          <span className="font-mono font-bold text-[#1A5276]">
                            {item.anio_desde} — {item.anio_hasta || 'Presente'}
                          </span>
                        </div>
                        {item.motor && (
                          <div className="flex items-center justify-between text-[#7F8C8D]">
                            <span>Motor:</span>
                            <span className="font-mono text-[#2C3E50]">{item.motor}</span>
                          </div>
                        )}
                        {item.notas && (
                          <p className="text-[10px] text-[#7F8C8D] pt-1 border-t border-[#E2E8F0] italic">
                            Nota: {item.notas}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Bottom Info: Price and Link */}
                    <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-[#7F8C8D] block uppercase font-semibold">
                          Precio Venta
                        </span>
                        <span className="text-lg font-black text-[#2C3E50] font-mono">
                          ${Number(sku.precio_base).toFixed(2)}
                        </span>
                      </div>

                      <div className="text-right">
                        {sku.ubicacion && (
                          <span className="text-[10px] text-[#7F8C8D] font-mono block mb-1">
                            Bodega: {sku.ubicacion}
                          </span>
                        )}
                        <Link
                          href={`/inventario/${sku.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#1A5276] hover:text-[#154360] transition"
                        >
                          <span>Ver Ficha</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
