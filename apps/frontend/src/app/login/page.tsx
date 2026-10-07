'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { Lock, Mail, ArrowRight, AlertCircle, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { user, login, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Si el usuario ya cuenta con sesión activa, redirigir directo al dashboard
  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/inventario');
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setError('Por favor ingresa tu correo y contraseña.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      await login(cleanEmail, password);
      router.push('/inventario');
    } catch (err: any) {
      setError(
        err.message || 'Credenciales inválidas. Verifica tu correo y contraseña.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0D14] flex items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#C4F82A]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-[#1F2633]/60 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo and Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#C4F82A] shadow-xl shadow-[#C4F82A]/20 mb-4 transition-transform hover:scale-105">
            <span className="font-black text-[#0A0D14] text-2xl tracking-tight">TSP</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            TOKUGAWA <span className="text-[#C4F82A]">SPARE PARTS</span>
          </h1>
          <p className="text-xs text-[#8B949E] mt-1 uppercase tracking-widest font-medium">
            ERP Repuestos Cloud — Sistema de Gestión Integral
          </p>
        </div>

        {/* Card */}
        <div className="erp-card bg-[#151A23] p-8 rounded-3xl shadow-2xl border border-[#2D3748]">
          <h2 className="text-base font-bold text-white mb-1">Iniciar Sesión</h2>
          <p className="text-xs text-[#8B949E] mb-6">
            Ingresa con tus credenciales autorizadas del sistema
          </p>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
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
                  autoComplete="email"
                  placeholder="admin@tokugawuasp.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#1F2633] border border-[#2D3748] text-white text-sm placeholder-[#8B949E]/70 focus:outline-none focus:border-[#C4F82A] transition"
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
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#1F2633] border border-[#2D3748] text-white text-sm placeholder-[#8B949E]/70 focus:outline-none focus:border-[#C4F82A] transition"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-[#8B949E] hover:text-white transition focus:outline-none"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="erp-btn-primary w-full py-3 text-sm mt-3 flex items-center justify-center gap-2 font-semibold disabled:opacity-50 transition cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#0A0D14]" />
                  <span>Validando credenciales...</span>
                </>
              ) : (
                <>
                  <span>Entrar al ERP</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Security footer */}
          <div className="mt-6 pt-5 border-t border-[#2D3748]/60 flex items-center justify-center gap-2 text-[11px] text-[#8B949E]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#C4F82A]" />
            <span>Acceso seguro cifrado con JWT &amp; SSL</span>
          </div>
        </div>
      </div>
    </div>
  );
}
