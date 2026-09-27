'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ProveedorSummary } from '@japonparts/shared';
import { apiClient } from '../../../lib/api-client';
import { Header } from '../../../components/header';
import {
  Building2,
  Plus,
  Search,
  Phone,
  Mail,
  ChevronRight,
  X,
  AlertCircle,
} from 'lucide-react';

export default function ProveedoresPage() {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Supplier Form State
  const [nombre, setNombre] = useState('');
  const [rif, setRif] = useState('');
  const [contacto, setContacto] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [direccion, setDireccion] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    data: proveedores = [],
    isLoading,
    refetch,
  } = useQuery<ProveedorSummary[]>({
    queryKey: ['proveedores', search],
    queryFn: async () => {
      const res = await apiClient.get<ProveedorSummary[]>('/proveedor', {
        q: search || undefined,
      });
      return res.data || [];
    },
  });

  const handleCreateProveedor = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setLoading(true);

    try {
      if (!nombre.trim() || !rif.trim()) {
        throw new Error('El nombre y el RIF del proveedor son obligatorios');
      }

      await apiClient.post('/proveedor', {
        nombre: nombre.trim(),
        rif: rif.trim().toUpperCase(),
        contacto: contacto.trim() || undefined,
        telefono: telefono.trim() || undefined,
        email: email.trim() || undefined,
        direccion: direccion.trim() || undefined,
      });

      // Reset
      setNombre('');
      setRif('');
      setContacto('');
      setTelefono('');
      setEmail('');
      setDireccion('');
      setIsModalOpen(false);
      refetch();
    } catch (err: any) {
      setFormError(err.message || 'Error al registrar el proveedor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-16">
      <Header
        title="Directorio de Proveedores & Cuentas por Pagar"
        subtitle="Gestión comercial de suplidores, plazos de crédito y estados de cuenta consolidados"
        onRefresh={() => refetch()}
        actionSlot={
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1A5276] hover:bg-[#154360] text-white text-xs font-bold transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nuevo Proveedor</span>
          </button>
        }
      />

      <div className="p-8 max-w-7xl mx-auto space-y-6">
        {/* Search bar */}
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#7F8C8D]" />
            <input
              type="text"
              placeholder="Buscar por razón social o RIF..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#F8F9FA] border border-[#CBD5E1] rounded-xl pl-10 pr-4 py-2 text-xs text-[#2C3E50] placeholder-[#7F8C8D] focus:outline-none focus:border-[#1A5276] focus:bg-white transition"
            />
          </div>

          <div className="text-xs text-[#7F8C8D] font-mono">
            {proveedores.length} proveedores registrados
          </div>
        </div>

        {/* Suppliers Grid / Table */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8F9FA] text-[10px] font-bold text-[#7F8C8D] uppercase tracking-wider border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-3.5 px-4">RIF Fiscal</th>
                  <th className="py-3.5 px-4">Razón Social</th>
                  <th className="py-3.5 px-4">Contacto & Teléfono</th>
                  <th className="py-3.5 px-4">Dirección Comercial</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] font-medium">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[#7F8C8D]">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-6 h-6 border-2 border-[#1A5276] border-t-transparent rounded-full animate-spin" />
                        <span>Cargando proveedores...</span>
                      </div>
                    </td>
                  </tr>
                ) : proveedores.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[#7F8C8D]">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-[#1A5276]" />
                        </div>
                        <p className="text-sm font-semibold text-[#2C3E50]">
                          No hay proveedores registrados
                        </p>
                        <button
                          onClick={() => setIsModalOpen(true)}
                          className="px-4 py-2 rounded-xl bg-[#1A5276] hover:bg-[#154360] text-white text-xs font-bold transition shadow-sm"
                        >
                          Crear Primer Proveedor
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  proveedores.map((p) => (
                    <tr key={p.id} className="hover:bg-[#F8FBFF] transition group">
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-[#1A5276] bg-[#EFF6FF] px-2 py-0.5 rounded border border-[#BFDBFE] text-xs">
                          {p.rif}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-[#2C3E50] block">{p.nombre}</span>
                        {p.email && (
                          <span className="text-xs text-[#7F8C8D] flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3 text-[#7F8C8D]" />
                            {p.email}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#2C3E50]">
                        {p.contacto && <span className="block font-semibold text-[#2C3E50]">{p.contacto}</span>}
                        {p.telefono ? (
                          <span className="text-[#7F8C8D] flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-[#7F8C8D]" />
                            {p.telefono}
                          </span>
                        ) : (
                          <span className="text-[#94A3B8]">Sin teléfono</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#7F8C8D] max-w-xs truncate">
                        {p.direccion || 'Sin dirección registrada'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/proveedores/${p.id}/estado-cuenta`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#F8F9FA] text-[#1A5276] border border-[#CBD5E1] text-xs font-semibold transition shadow-sm"
                        >
                          <span>Estado de Cuenta (CxP)</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal para Crear Proveedor */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white border border-[#E2E8F0] rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8F9FA]">
              <div>
                <h3 className="text-base font-bold text-[#2C3E50] flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#1A5276]" />
                  Registrar Nuevo Proveedor
                </h3>
                <p className="text-xs text-[#7F8C8D] mt-0.5">
                  Alta comercial de suplidor de repuestos automotrices
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-[#7F8C8D] hover:text-[#2C3E50] hover:bg-[#EDF2F7] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateProveedor} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#2C3E50] mb-1">
                    Razón Social / Nombre Comercial *
                  </label>
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej. Importadora Nippon C.A."
                    className="w-full bg-[#F8F9FA] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs text-[#2C3E50] focus:outline-none focus:border-[#1A5276] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2C3E50] mb-1">
                    RIF Fiscal *
                  </label>
                  <input
                    type="text"
                    required
                    value={rif}
                    onChange={(e) => setRif(e.target.value)}
                    placeholder="J-12345678-9"
                    className="w-full bg-[#F8F9FA] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs text-[#2C3E50] focus:outline-none focus:border-[#1A5276] focus:bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2C3E50] mb-1">
                    Persona de Contacto
                  </label>
                  <input
                    type="text"
                    value={contacto}
                    onChange={(e) => setContacto(e.target.value)}
                    placeholder="Ej. Carlos Mendoza"
                    className="w-full bg-[#F8F9FA] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs text-[#2C3E50] focus:outline-none focus:border-[#1A5276] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2C3E50] mb-1">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="+58 412 1234567"
                    className="w-full bg-[#F8F9FA] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs text-[#2C3E50] focus:outline-none focus:border-[#1A5276] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2C3E50] mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ventas@importadoranippon.com"
                    className="w-full bg-[#F8F9FA] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs text-[#2C3E50] focus:outline-none focus:border-[#1A5276] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2C3E50] mb-1">
                  Dirección Comercial
                </label>
                <textarea
                  rows={2}
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Zona Industrial Los Ruices, Galpón 4..."
                  className="w-full bg-[#F8F9FA] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs text-[#2C3E50] focus:outline-none focus:border-[#1A5276] focus:bg-white resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#7F8C8D] hover:text-[#2C3E50] hover:bg-[#F8F9FA] transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-[#1A5276] hover:bg-[#154360] text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : 'Registrar Proveedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
