'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      router.push('/inventario');
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión. Verifica tus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('admin');
  };

  return (
    <div className="min-h-screen bg-[#0A0D14] flex items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#C4F82A]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-[#1F2633]/60 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo and Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#C4F82A] shadow-xl shadow-[#C4F82A]/20 mb-4">
            <span className="font-black text-[#0A0D14] text-2xl tracking-tight">TSP</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            TOKUGAWA <span className="text-[#C4F82A]">SPARE PARTS</span>
          </h1>
          <p className="text-xs text-[#8B949E] mt-1 uppercase tracking-widest font-medium">
            ERP Repuestos Cloud — Dashboard Financiero
          </p>
        </div>

        {/* Card */}
        <div className="erp-card bg-[#151A23] p-8 rounded-3xl shadow-2xl border border-[#2D3748]">
          <h2 className="text-base font-bold text-white mb-2">Iniciar Sesión</h2>
          <p className="text-xs text-[#8B949E] mb-6">
            Acceso unificado para administración, ventas y bodega
          </p>

          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-white mb-1.5">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#8B949E] absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  placeholder="usuario@tokugawaspareparts.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#1F2633] border border-[#2D3748] text-white text-sm placeholder-[#8B949E] focus:outline-none focus:border-[#C4F82A] transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#8B949E] absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#1F2633] border border-[#2D3748] text-white text-sm placeholder-[#8B949E] focus:outline-none focus:border-[#C4F82A] transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="erp-btn-primary w-full py-3 text-sm mt-2 disabled:opacity-50"
            >
              <span>{loading ? 'Accediendo...' : 'Entrar al ERP'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Login for Testing */}
          <div className="mt-8 pt-6 border-t border-[#2D3748]">
            <span className="text-[11px] font-semibold text-[#8B949E] uppercase tracking-wider block mb-3 text-center">
              Acceso Rápido de Prueba (Demo)
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@japonparts.com')}
                className="px-2 py-2 rounded-xl bg-[#1F2633] border border-[#2D3748] text-[#C4F82A] hover:bg-[#273142] hover:border-[#C4F82A] text-xs font-semibold transition"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('vendedor@japonparts.com')}
                className="px-2 py-2 rounded-xl bg-[#1F2633] border border-[#2D3748] text-white hover:bg-[#273142] text-xs font-semibold transition"
              >
                Vendedor
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('bodega@japonparts.com')}
                className="px-2 py-2 rounded-xl bg-[#1F2633] border border-[#2D3748] text-[#8B949E] hover:bg-[#273142] hover:text-white text-xs font-semibold transition"
              >
                Bodega
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
