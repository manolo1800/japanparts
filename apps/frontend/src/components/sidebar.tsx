'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/auth-context';
import { useSidebar } from '../context/sidebar-context';
import {
  Package,
  Share2,
  LogOut,
  Car,
  ShoppingCart,
  Building2,
  Store,
  ReceiptText,
  MessageSquareText,
  Menu,
  TrendingUp,
  X,
} from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { collapsed, toggleSidebar, mobileOpen, closeMobile } = useSidebar();


  const navSections = [
    {
      title: 'Principal',
      items: [
        {
          label: 'Dashboard & Reportes',
          href: '/reportes',
          icon: TrendingUp,
          badge: 'KPIs',
        },
        {
          label: 'WhatsApp & Bot AI',
          href: '/whatsapp',
          icon: MessageSquareText,
          badge: 'Bot AI',
        },
        {
          label: 'Punto de Venta (POS)',
          href: '/pos',
          icon: Store,
          badge: 'POS',
        },
        {
          label: 'Órdenes de Venta',
          href: '/ventas',
          icon: ReceiptText,
          badge: null,
        },
      ],
    },
    {
      title: 'Inventario & Catálogo',
      items: [
        {
          label: 'Inventario & SKUs',
          href: '/inventario',
          icon: Package,
          badge: null,
        },
        {
          label: 'Buscador por Vehículo',
          href: '/buscador-inverso',
          icon: Car,
          badge: 'Inverso',
        },
        {
          label: 'Publicaciones Canales',
          href: '/publicaciones',
          icon: Share2,
          badge: null,
        },
      ],
    },
    {
      title: 'Compras & Proveedores',
      items: [
        {
          label: 'Compras & Facturas',
          href: '/compras',
          icon: ShoppingCart,
          badge: 'OCR',
        },
        {
          label: 'Proveedores & CxP',
          href: '/proveedores',
          icon: Building2,
          badge: null,
        },
      ],
    },
  ];

  const userInitial = user?.nombre?.charAt(0).toUpperCase() || 'U';

  return (
    <>
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="sidebar-backdrop md:hidden"
          onClick={closeMobile}
          aria-label="Cerrar navegación"
        />
      )}

      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        {/* Brand Header */}
        <div className="sidebar-brand">
          <Link href="/reportes" className="brand-logo" onClick={closeMobile}>
            <div className="brand-icon">
              <span>TSP</span>
            </div>
            <div className="brand-text">
              <span className="brand-name">Tokugawa Spare Parts</span>
              <span className="brand-sub">ERP Cloud Dashboard</span>
            </div>
          </Link>

          {/* Close button on mobile */}
          <button
            onClick={closeMobile}
            className="sidebar-close-btn md:hidden"
            title="Cerrar menú"
            aria-label="Cerrar menú"
          >
            <X className="w-5 h-5 text-white/80 hover:text-white" />
          </button>
        </div>

        {/* User info card */}
        <div className="sidebar-user" title={collapsed ? `${user?.nombre || 'Usuario'} (${user?.rol || 'Conectado'})` : undefined}>
          <div className="user-avatar">{userInitial}</div>
          <div className="user-info">
            <div className="user-name">{user?.nombre || 'Administrador'}</div>
            <div className="user-role">{user?.rol || 'Conectado'}</div>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="sidebar-nav">
          {navSections.map((section, sIdx) => (
            <div key={sIdx} className="nav-section">
              <div className="nav-section-label">{section.title}</div>
              <ul>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/' && pathname.startsWith(item.href));

                  return (
                    <li key={item.href} className="nav-item">
                      <Link
                        href={item.href}
                        onClick={closeMobile}
                        className={`nav-link ${isActive ? 'active' : ''}`}
                        title={collapsed ? item.label : undefined}
                      >
                        <span className="nav-icon">
                          <Icon className="w-4 h-4" />
                        </span>
                        <span>{item.label}</span>
                        {item.badge && <span className="nav-badge">{item.badge}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer with toggle and logout */}
        <div className="sidebar-footer">
          <button
            onClick={toggleSidebar}
            className="sidebar-toggle hidden md:flex"
            title={collapsed ? 'Expandir menú' : 'Contraer menú'}
          >
            <span className="nav-icon">
              <Menu className="w-4 h-4" />
            </span>
            <span>Menú</span>
          </button>

          <button
            onClick={logout}
            className="logout-btn"
            title={collapsed ? 'Cerrar Sesión' : undefined}
          >
            <span className="nav-icon">
              <LogOut className="w-4 h-4" />
            </span>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}
