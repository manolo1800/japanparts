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
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white text-xs font-bold transition shadow-lg shadow-rose-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nuevo Proveedor</span>
          </button>
        }
      />

      <div className="p-8 max-w-7xl mx-auto space-y-6">
        {/* Search bar */}
        <div className="glass-panel p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por razón social o RIF..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-rose-500 transition"
            />
          </div>

          <div className="text-xs text-slate-400 font-mono">
            {proveedores.length} proveedores registrados
          </div>
        </div>

        {/* Suppliers Grid / Table */}
        <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">RIF Fiscal</th>
                  <th className="py-3.5 px-4">Razón Social</th>
                  <th className="py-3.5 px-4">Contacto & Teléfono</th>
                  <th className="py-3.5 px-4">Dirección Comercial</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                        <span>Cargando proveedores...</span>
                      </div>
                    </td>
                  </tr>
                ) : proveedores.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-slate-800/60 flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-slate-400" />
                        </div>
                        <p className="text-sm font-medium text-slate-300">
                          No hay proveedores registrados
                        </p>
                        <button
                          onClick={() => setIsModalOpen(true)}
                          className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition"
                        >
                          Crear Primer Proveedor
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  proveedores.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-white text-xs">
                        {p.rif}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-200 block">{p.nombre}</span>
                        {p.email && (
                          <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3 text-slate-500" />
                            {p.email}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-300">
                        {p.contacto && <span className="block font-medium">{p.contacto}</span>}
                        {p.telefono ? (
                          <span className="text-slate-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-500" />
                            {p.telefono}
                          </span>
                        ) : (
                          <span className="text-slate-500">Sin teléfono</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-400 max-w-xs truncate">
                        {p.direccion || 'Sin dirección registrada'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/proveedores/${p.id}/estado-cuenta`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-[#0f172a] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-rose-500" />
                  Registrar Nuevo Proveedor
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Alta comercial de suplidor de repuestos automotrices
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateProveedor} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Razón Social / Nombre Comercial *
                  </label>
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej. Importadora Nippon C.A."
                    className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    RIF Fiscal *
                  </label>
                  <input
                    type="text"
                    required
                    value={rif}
                    onChange={(e) => setRif(e.target.value)}
                    placeholder="J-12345678-9"
                    className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Persona de Contacto
                  </label>
                  <input
                    type="text"
                    value={contacto}
                    onChange={(e) => setContacto(e.target.value)}
                    placeholder="Ej. Carlos Mendoza"
                    className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="+58 412 1234567"
                    className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ventas@importadoranippon.com"
                    className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Dirección Comercial
                </label>
                <textarea
                  rows={2}
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Zona Industrial Los Ruices, Galpón 4..."
                  className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-lg shadow-rose-600/20 disabled:opacity-50"
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
