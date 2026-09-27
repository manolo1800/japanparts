'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { EstadoCuentaProveedor, CompraSummary } from '@japonparts/shared';
import { apiClient } from '../../../../../lib/api-client';
import { Header } from '../../../../../components/header';
import { PagoCompraModal } from '../../../../../components/pago-compra-modal';
import {
  DollarSign,
  Clock,
  CheckCircle2,
  ArrowLeft,
  CreditCard,
} from 'lucide-react';

export default function EstadoCuentaPage() {
  const params = useParams();
  const id = params.id as string;

  const [pagoCompra, setPagoCompra] = useState<CompraSummary | null>(null);

  const {
    data: estadoCuenta,
    isLoading,
    refetch,
  } = useQuery<EstadoCuentaProveedor>({
    queryKey: ['proveedor-estado-cuenta', id],
    queryFn: async () => {
      const res = await apiClient.get<EstadoCuentaProveedor>(`/proveedor/${id}/estado-cuenta`);
      return res.data!;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="p-12 text-center text-[#7F8C8D]">
        <div className="w-8 h-8 border-2 border-[#1A5276] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <span>Cargando estado de cuenta del proveedor...</span>
      </div>
    );
  }

  if (!estadoCuenta) {
    return (
      <div className="p-12 text-center text-[#7F8C8D]">
        <p className="text-base font-bold text-[#2C3E50] mb-2">Proveedor no encontrado</p>
        <Link href="/proveedores" className="text-[#1A5276] underline text-xs font-semibold">
          Regresar a Proveedores
        </Link>
      </div>
    );
  }

  const { proveedor, total_compras, total_facturado, total_pagado, saldo_pendiente, compras_pendientes, historial_pagos } =
    estadoCuenta;

  const formatCurrency = (val: number | string) => {
    return `$${Number(val || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="pb-16">
      <Header
        title={`Estado de Cuenta: ${proveedor.nombre}`}
        subtitle={`RIF: ${proveedor.rif} | Tel: ${proveedor.telefono || 'N/A'} | Contacto: ${proveedor.contacto || 'N/A'}`}
        onRefresh={() => refetch()}
        actionSlot={
          <Link
            href="/proveedores"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#F8F9FA] text-[#2C3E50] border border-[#E2E8F0] text-xs font-semibold transition shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a Proveedores</span>
          </Link>
        }
      />

      <div className="p-8 max-w-7xl mx-auto space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-sm">
            <span className="text-[11px] font-semibold text-[#7F8C8D] uppercase tracking-wider block">
              Total Facturas
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-black text-[#2C3E50]">{total_compras}</span>
              <span className="text-xs text-[#7F8C8D] font-mono">compras emitidas</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-sm">
            <span className="text-[11px] font-semibold text-[#7F8C8D] uppercase tracking-wider block">
              Total Facturado
            </span>
            <div className="mt-2">
              <span className="text-xl font-black text-[#2C3E50] font-mono">
                {formatCurrency(total_facturado)} USD
              </span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] border-l-4 border-l-emerald-500 shadow-sm">
            <span className="text-[11px] font-semibold text-[#7F8C8D] uppercase tracking-wider block">
              Total Pagado
            </span>
            <div className="mt-2">
              <span className="text-xl font-black text-emerald-700 font-mono">
                {formatCurrency(total_pagado)} USD
              </span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] border-l-4 border-l-rose-500 shadow-sm">
            <span className="text-[11px] font-semibold text-[#7F8C8D] uppercase tracking-wider block">
              Saldo Pendiente (CxP)
            </span>
            <div className="mt-2">
              <span className="text-xl font-black text-rose-600 font-mono">
                {formatCurrency(saldo_pendiente)} USD
              </span>
            </div>
          </div>
        </div>

        {/* Facturas con saldo deudor */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8F9FA]">
            <div>
              <h4 className="text-sm font-bold text-[#2C3E50] flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                Facturas con Saldo Pendiente de Pago
              </h4>
              <p className="text-xs text-[#7F8C8D] mt-0.5">
                Obligaciones vigentes de cuentas por pagar con este proveedor
              </p>
            </div>
            <span className="text-xs text-[#7F8C8D] font-mono">
              {compras_pendientes.length} facturas activas
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F9FA] text-[10px] font-bold text-[#7F8C8D] uppercase tracking-wider border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-3 px-4">Nº Factura</th>
                  <th className="py-3 px-4">Fecha Emisión</th>
                  <th className="py-3 px-4">Condición</th>
                  <th className="py-3 px-4 text-right">Total Factura</th>
                  <th className="py-3 px-4 text-right">Abonado</th>
                  <th className="py-3 px-4 text-right">Saldo Pendiente</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] font-medium">
                {compras_pendientes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#7F8C8D]">
                      <div className="flex flex-col items-center gap-1.5">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        <span className="text-[#2C3E50] font-semibold">¡Al día! No hay cuentas pendientes por pagar con este proveedor.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  compras_pendientes.map((compra) => {
                    const pendingAmount =
                      compra.saldo_pendiente !== undefined
                        ? Number(compra.saldo_pendiente)
                        : Number(compra.total) - Number(compra.monto_pagado || 0);

                    return (
                      <tr key={compra.id} className="hover:bg-[#F8FBFF] transition group">
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-[#1A5276] bg-[#EFF6FF] px-2 py-0.5 rounded border border-[#BFDBFE]">
                            {compra.numero_factura}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#7F8C8D]">
                          {compra.fecha ? new Date(compra.fecha).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-50 text-amber-700 border border-amber-200 uppercase">
                            Crédito ({compra.dias_credito || 0}d)
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-[#2C3E50]">
                          {formatCurrency(compra.total)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-700 font-bold">
                          {formatCurrency(compra.monto_pagado || 0)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">
                          {formatCurrency(pendingAmount)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setPagoCompra(compra)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition text-xs flex items-center gap-1 shadow-sm"
                            >
                              <CreditCard className="w-3 h-3" />
                              <span>Abonar</span>
                            </button>
                            <Link
                              href={`/compras/${compra.id}`}
                              className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#F8F9FA] text-[#2C3E50] border border-[#CBD5E1] transition text-xs font-semibold shadow-sm"
                            >
                              Ver
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Historial de Pagos */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8F9FA]">
            <h4 className="text-sm font-bold text-[#2C3E50] flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              Historial Consolidado de Pagos Realizados
            </h4>
            <span className="text-xs text-[#7F8C8D] font-mono">
              {historial_pagos.length} pagos registrados
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F9FA] text-[10px] font-bold text-[#7F8C8D] uppercase tracking-wider border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-3 px-4">Fecha Pago</th>
                  <th className="py-3 px-4">Método</th>
                  <th className="py-3 px-4">Referencia / Comprobante</th>
                  <th className="py-3 px-4">Notas</th>
                  <th className="py-3 px-4 text-right">Monto Pagado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] font-medium">
                {historial_pagos.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#7F8C8D]">
                      No se han emitido pagos a este proveedor aún.
                    </td>
                  </tr>
                ) : (
                  historial_pagos.map((pago) => (
                    <tr key={pago.id} className="hover:bg-[#F8FBFF] transition group">
                      <td className="py-3 px-4 text-[#7F8C8D]">
                        {new Date(pago.fecha).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 capitalize font-semibold text-[#2C3E50]">
                        {pago.metodo}
                      </td>
                      <td className="py-3 px-4 font-mono text-[#7F8C8D]">
                        {pago.referencia || 'Sin referencia'}
                      </td>
                      <td className="py-3 px-4 text-[#7F8C8D] italic">
                        {pago.notas || '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                        {formatCurrency(pago.monto)} USD
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal para Registrar Pago */}
      <PagoCompraModal
        compra={pagoCompra}
        isOpen={!!pagoCompra}
        onClose={() => setPagoCompra(null)}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
