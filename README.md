# Japonparts ERP — Repuestos Multichannel

Sistema ERP integral para la gestión de repuestos automotrices con sincronización multicanal (MercadoLibre, WhatsApp con IA y Ventas por Mostrador).

## Stack Tecnológico

- **Backend:** NestJS 11 + TypeScript + TypeORM + PostgreSQL
- **Frontend:** Next.js 15 (App Router, Standalone) + Tailwind CSS + TanStack Query + shadcn/ui
- **Workers y Colas:** BullMQ + Redis + NestJS
- **Storage:** MinIO (S3 Compatible)
- **Monorepo:** pnpm workspaces + Turborepo
- **Contenedores:** Docker & Docker Compose
- **Despliegue:** Dokploy (Traefik / red externa `dokploy-network`)

## Estructura del Monorepo

```
japonparts/
├── apps/
│   ├── backend/        # API REST con NestJS (Puerto 4000)
│   ├── frontend/       # Panel web con Next.js (Puerto 3000)
│   └── worker/         # Procesamiento asíncrono BullMQ (OCR, Sync ML, WhatsApp)
├── packages/
│   └── shared/         # Tipos, enums, interfaces y utilidades compartidas
├── docker-compose.dev.yml   # Entorno de desarrollo con hot-reload
├── docker-compose.prod.yml  # Entorno de producción optimizado multi-stage
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.base.json
```

## Guía de Inicio Rápido

### Prerrequisitos

- Node.js >= 20
- pnpm >= 10
- Docker & Docker Compose

### Instalación local de dependencias

```bash
pnpm install
```

### Ejecutar con Docker (Desarrollo)

Levanta todos los servicios (`postgres`, `redis`, `minio`, `backend`, `frontend`, `worker`) con hot reload:

```bash
pnpm run dev:up
```

O para reconstruir imágenes si hubo cambios estructurales:

```bash
pnpm run dev:up:build
```

Para detener los contenedores:

```bash
pnpm run dev:down
```

### Ejecutar con Docker (Producción)

```bash
pnpm run prod:up
pnpm run prod:down
```

### URLs Locales (Modo Dev)

- **Frontend:** [http://localhost:3000](http://localhost:3000)
- **Backend API:** [http://localhost:4000](http://localhost:4000)
- **Backend Health Check:** [http://localhost:4000/health](http://localhost:4000/health)
- **MinIO S3 API:** [http://localhost:9000](http://localhost:9000)
- **MinIO Web Console:** [http://localhost:9001](http://localhost:9001) (User: `minioadmin` / Pass: `minioadmin`)
- **PostgreSQL:** `localhost:5432` (DB: `japonparts_dev`)
- **Redis:** `localhost:6379`
