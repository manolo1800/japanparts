# Plan de Desarrollo por Fases — ERP Repuestos Multichannel

**Stack:** NestJS + PostgreSQL + Redis/BullMQ + Next.js + MinIO
**Deploy:** Dokploy (configuración de servidor fuera de alcance)
**Contenedores:** `docker-compose.dev.yml` (hot reload) y `docker-compose.prod.yml` (optimizado)

---

## FASE 0 — Creación del proyecto y Docker base

**Objetivo:** monorepo inicializado con dos entornos Docker funcionales.

### 0.1 Estructura del monorepo
- [x] Crear repositorio con estructura: `/apps/backend`, `/apps/frontend`, `/apps/worker`, `/packages/shared`.
- [x] Inicializar workspace (pnpm workspaces o Turborepo).
- [x] Configurar `tsconfig.base.json` en la raíz con paths compartidos.
- [x] Configurar ESLint + Prettier compartidos.
- [x] Configurar `.gitignore`, `.editorconfig`, `.env.example`.

### 0.2 Docker de desarrollo (`docker-compose.dev.yml`)
- [x] Servicio `postgres` con volumen persistente local.
- [x] Servicio `redis` con volumen persistente local.
- [x] Servicio `minio` con volumen persistente local + consola web.
- [x] Servicio `backend` en modo dev con volumen montado y hot reload (NestJS watch).
- [x] Servicio `frontend` en modo dev con volumen montado y hot reload (Next.js dev server).
- [x] Servicio `worker` en modo dev con volumen montado y watch.
- [x] Red interna `app-net`.
- [x] Healthchecks en `postgres` y `redis`.
- [x] Archivo `.env.dev` con credenciales locales.

### 0.3 Docker de producción (`docker-compose.prod.yml`)
- [x] Servicio `postgres` con volumen persistente sin exponer puerto al host.
- [x] Servicio `redis` sin exponer puerto al host.
- [x] Servicio `minio` sin exponer consola al host.
- [x] Servicio `backend` con Dockerfile multi-stage (build → runtime optimizado, usuario no-root).
- [x] Servicio `frontend` con Dockerfile multi-stage (build → runtime standalone de Next.js).
- [x] Servicio `worker` con Dockerfile propio (reutiliza build del backend).
- [x] Red interna `app-net` + red externa `dokploy-network` en backend y frontend.
- [x] Sin Nginx ni Traefik en el compose (Dokploy los provee).
- [x] Archivo `.env.prod` con variables de producción.

### 0.4 Scripts de arranque
- [x] Script `dev:up` → `docker compose -f docker-compose.dev.yml up`.
- [x] Script `prod:up` → `docker compose -f docker-compose.prod.yml up -d`.
- [x] Script `db:migrate` para correr migraciones.
- [x] Script `db:seed` para datos de prueba.

**Criterio de aceptación:** `dev:up` levanta todo con hot reload en backend/frontend/worker. `prod:up` levanta contenedores optimizados listos para Dokploy.

---

## FASE 1 — Núcleo: Auth + Inventario + SKU

**Objetivo:** modelo de datos maestro y CRUD de inventario con compatibilidad vehicular.

### 1.1 Modelo de datos (migraciones)
- [x] Tabla `usuario` (id, nombre, email UNIQUE, password_hash, rol ENUM['admin','vendedor','bodega'], activo, timestamps).
- [x] Tabla `sku` (id, sku_interno UNIQUE, nombre, marca, codigo_fabricante, descripcion, costo_promedio, precio_base, stock_actual, stock_minimo, ubicacion, activo, timestamps).
- [x] Tabla `compatibilidad` (id, sku_id FK, marca_vehiculo, modelo, anio_desde, anio_hasta, motor, notas).
- [x] Tabla `cuenta_canal` (id, tipo ENUM['ml','whatsapp'], usuario_id FK, alias, credenciales JSONB, activa).
- [x] Tabla `publicacion` (id, sku_id FK, canal ENUM['ml','whatsapp','mostrador'], cuenta_id FK, ml_item_id, titulo, precio, stock_publicado, estado, url).
- [x] Tabla `movimiento_stock` (id, sku_id FK, tipo ENUM['entrada','salida','ajuste'], cantidad, referencia_tipo, referencia_id, usuario_id, created_at).
- [x] Índices en `sku.sku_interno`, `publicacion.ml_item_id`, `movimiento_stock.sku_id`.

### 1.2 Auth + RBAC
- [x] Endpoint `POST /auth/login` (JWT access + refresh).
- [x] Endpoint `POST /auth/refresh`.
- [x] Guard de roles (`admin`, `vendedor`, `bodega`).
- [x] Middleware de auditoría (usuario_id en cada request autenticado).

### 1.3 CRUD Inventario (backend)
- [x] `POST/GET/PUT/DELETE /sku` con paginación, filtros y búsqueda.
- [x] `POST/GET/PUT/DELETE /sku/:id/compatibilidad`.
- [x] Endpoint `GET /sku/:id/compatibilidad` para buscar por marca/modelo/año/motor.
- [x] `POST/GET/PUT/DELETE /publicacion` (manual, sin ML aún).
- [x] Endpoint `GET /sku/:id/publicaciones`.
- [x] Endpoint `POST /sku/:id/ajuste-stock` (entrada/salida con registro en `movimiento_stock`).
- [x] Servicio `BuscarCompatibilidad(marca, modelo, año, motor)`.

### 1.4 Frontend — Módulo Inventario
- [x] Pantalla de login + layout protegido con sidebar.
- [x] Lista de SKUs con filtros y búsqueda.
- [x] Formulario SKU con pestaña de compatibilidad.
- [x] Vista de publicaciones agrupadas por canal/cuenta.
- [x] Modal de ajuste de stock con motivo.
- [x] Buscador inverso: "¿qué SKUs tengo para Corolla 1995 motor 1.8?".

**Criterio de aceptación:** crear SKU `DEN-YKT22`, agregar 5 compatibilidades, 8 publicaciones manuales, ajustar stock y ver historial.

---

## FASE 2 — Compras + Facturas de proveedor

**Objetivo:** registrar compras con OCR asistido por IA y cuentas por pagar.

- [x] Tabla `proveedor` (id, nombre, rif, contacto, telefono, email).
- [x] Tabla `compra` (id, proveedor_id FK, numero_factura, fecha, subtotal, total, condicion_pago ENUM['contado','credito'], dias_credito, estado ENUM['pendiente','recibida','pagada'], archivo_url).
- [x] Tabla `compra_detalle` (id, compra_id FK, sku_id FK, cantidad, costo_unitario, subtotal).
- [x] Tabla `pago_compra` (id, compra_id FK, fecha, monto, metodo, referencia).
- [x] Endpoint `POST /compra` (carga manual estructurada).
- [x] Endpoint `POST /compra/ocr` → sube imagen/PDF a MinIO → encola job OCR → devuelve JSON editable.
- [x] Worker OCR:
  - [x] Extraer texto (Tesseract para imágenes, parser para PDF).
  - [x] Enviar texto a LLM con prompt de estructuración.
  - [x] Devolver JSON estructurado (proveedor, rif, numero_factura, fecha, items[], total, condicion_pago).
- [x] Endpoint `POST /compra/:id/aprobar`:
  - [x] Crear `compra_detalle`.
  - [x] Generar `movimiento_stock` de entrada por cada item.
  - [x] Recalcular `costo_promedio` del SKU.
- [x] Endpoint `POST /compra/:id/pago` (pagos parciales o totales).
- [x] Endpoint `GET /proveedor/:id/estado-cuenta`.
- [x] Frontend: formulario de compra manual.
- [x] Frontend: flujo OCR (subir → revisar/editar → aprobar).
- [x] Frontend: lista de compras + estado de cuenta por proveedor.

**Criterio de aceptación:** subir factura PDF, extraer items, editarlos, aprobar, stock sube. Si es a crédito, queda registrada la cuenta por pagar. [VERIFICADO]

---

## FASE 3 — Ventas + Documentos internos

**Objetivo:** registrar ventas por mostrador y generar facturas/recibos PDF.

- [ ] Tabla `cliente` (id, nombre, telefono, email, direccion, notas).
- [ ] Tabla `orden` (id, numero_orden, canal ENUM['mostrador','ml','whatsapp'], cuenta_id FK, vendedor_id FK, cliente_id FK, fecha, estado ENUM['pendiente','confirmada','por_despachar','despachada','cerrada','cancelada'], tipo_entrega ENUM['retiro','delivery','encomienda'], direccion_entrega, total, metodo_pago, estado_pago ENUM['pendiente','confirmado'], origen).
- [ ] Tabla `orden_detalle` (id, orden_id FK, sku_id FK, publicacion_id FK, cantidad, precio_unitario, subtotal).
- [ ] Tabla `documento_venta` (id, orden_id FK, tipo ENUM['factura','recibo'], numero UNIQUE, fecha, datos_cliente JSONB, pdf_url).
- [ ] Servicio de creación de orden:
  - [ ] Validar stock disponible.
  - [ ] Descontar `sku.stock_actual`.
  - [ ] Registrar `movimiento_stock` de salida.
  - [ ] Encolar sync ML (si aplica, se conecta en Fase 4).
- [ ] Generador de PDF (factura + recibo) con numeración correlativa por tipo.
- [ ] Endpoint `POST /orden` (mostrador).
- [ ] Endpoint `GET /orden/:id/pdf?tipo=factura|recibo`.
- [ ] Endpoint `POST /orden/:id/confirmar-pago` (solo humano).
- [ ] Endpoint `POST /orden/:id/despachar`.
- [ ] Endpoint `POST /orden/:id/cancelar` (revierte stock + movimiento).
- [ ] Frontend: POS mostrador (búsqueda por SKU o compatibilidad → carrito → crear orden).
- [ ] Frontend: lista de órdenes con filtros.
- [ ] Frontend: detalle de orden + acciones (confirmar pago, despachar, cancelar, generar PDF).

**Criterio de aceptación:** crear orden mostrador, descontar stock, generar factura PDF con numeración, confirmar pago, marcar despachada.

---

## FASE 4 — Integración MercadoLibre (1 cuenta piloto)

**Objetivo:** publicar, sincronizar stock/precio y recibir órdenes de ML.

### 4.1 Setup ML
- [ ] Registrar app en ML DevCenter (site `MLV`).
- [ ] Tabla `ml_token` (id, cuenta_id FK, access_token, refresh_token, expires_at).
- [ ] Módulo `ml-client` en backend con wrapper HTTP y manejo de errores.

### 4.2 OAuth + Token Management
- [ ] Endpoint `GET /ml/auth` → redirige a ML con `client_id` y `redirect_uri`.
- [ ] Endpoint `GET /ml/callback` → intercambia código por tokens y guarda en `ml_token`.
- [ ] Worker de refresh automático (cron cada 5h).
- [ ] Interceptor que inyecta token válido en cada llamada ML.
- [ ] Manejo de error 401 → refresh y reintento automático.

### 4.3 Publicación desde la plataforma
- [ ] Servicio `ml.publishItem(sku, publicacion)` → `POST /items`.
- [ ] Validador previo: categoría, atributos obligatorios (BRAND, PART_NUMBER, VEHICLE_COMPATIBILITY).
- [ ] Mapeo SKU + compatibilidad → payload ML.
- [ ] Guardar `ml_item_id` en `publicacion` al publicar.
- [ ] Endpoint `POST /publicacion/:id/publicar-ml`.
- [ ] Endpoint `PUT /publicacion/:id/actualizar-ml`.

### 4.4 Sincronización stock/precio
- [ ] Worker `sync-ml-stock`: recibe `sku_id` → busca publicaciones ML vinculadas → encola `PUT /items/{id}` con `available_quantity`.
- [ ] Rate limiter (BullMQ con `limiter: { max, duration }`).
- [ ] Priorización: publicaciones con más ventas/visitas primero.
- [ ] Buffer de seguridad: si `stock_actual < umbral`, pausar publicaciones secundarias.
- [ ] Worker `sync-ml-price`: actualiza precio cuando cambia `precio_base` del SKU.
- [ ] Trigger: cada `movimiento_stock` de salida/entrada encola sync.
- [ ] Reintentos con backoff exponencial ante errores 429/500.

### 4.5 Webhooks de ML
- [ ] Endpoint `POST /webhooks/ml` (público, validado por firma).
- [ ] Manejar tópico `orders` → crear orden interna → descontar stock → encolar sync.
- [ ] Manejar tópico `questions` → guardar pregunta + notificar al vendedor.
- [ ] Idempotencia: guardar `notification_id` procesados en Redis.
- [ ] Log de webhooks recibidos con estado de procesamiento.

### 4.6 Envío gratis ML
- [ ] Al recibir orden ML, consultar `GET /orders/{id}` → leer `shipping.free_shipping`.
- [ ] Guardar en `orden.tipo_envio_ml` ENUM['free','paid','unknown'].
- [ ] Si es `unknown`, el humano lo completa al confirmar.

### 4.7 Frontend ML
- [ ] Pantalla de conexión de cuenta ML (OAuth flow).
- [ ] Vista de publicaciones con estado de sync.
- [ ] Botón "Publicar en ML" en detalle de SKU.
- [ ] Log de errores de sync.
- [ ] Indicador visual de publicaciones pausadas por stock bajo.

**Criterio de aceptación:** conectar cuenta ML, publicar SKU, vender en ML → webhook crea orden interna, descuenta stock y sincroniza las otras publicaciones del mismo SKU.

---

## FASE 5 — Multi-cuenta ML + atribución por vendedor

**Objetivo:** escalar a N cuentas ML con stock unificado y trazabilidad por vendedor.

- [ ] Cada vendedor conecta su cuenta ML vía OAuth (`cuenta_canal` con `usuario_id`).
- [ ] Aislamiento en frontend: cada vendedor ve solo sus publicaciones; el stock es global.
- [ ] Atribución: toda orden ML se asigna al `vendedor_id` dueño de la cuenta.
- [ ] Worker de sync: agrupa actualizaciones por SKU en batches.
- [ ] Dashboard por vendedor: ventas, publicaciones activas, stock crítico.
- [ ] Alertas: si una publicación queda sin stock, notificar al vendedor.
- [ ] Reporte de comisiones/ventas por vendedor.
- [ ] Manejo de conflicto: cola centralizada garantiza descuento único ante ventas paralelas.

**Criterio de aceptación:** 3 vendedores con 3 cuentas ML venden el mismo SKU, el stock baja una vez y las 3 cuentas reflejan el stock actualizado.

---

## FASE 6 — Bot WhatsApp IA

**Objetivo:** bot que consulta catálogo, recauda datos y crea órdenes pendientes.

### 6.1 Setup WhatsApp
- [ ] Configurar WhatsApp Business Account en Meta.
- [ ] Tabla `whatsapp_cuenta` (id, usuario_id FK, phone_number_id, waba_id, access_token).
- [ ] Endpoint `POST /webhooks/whatsapp` (validación de token Meta).
- [ ] Servicio de envío: `POST /messages` a WhatsApp Cloud API.

### 6.2 Motor del bot
- [ ] Tabla `conversacion` (id, canal, cuenta_id FK, cliente_id FK, telefono, estado ENUM['bot','humano','cerrada'], orden_id FK).
- [ ] Tabla `mensaje` (id, conversacion_id FK, rol ENUM['user','bot','humano'], contenido, timestamp).
- [ ] Worker `procesar-mensaje-whatsapp`: recibe mensaje → carga historial → llama LLM con tools.
- [ ] Tools del LLM:
  - [ ] `buscar_producto(query)` → búsqueda en SKU + compatibilidad.
  - [ ] `consultar_stock(sku_id)` → stock actual.
  - [ ] `crear_orden_pendiente(nombre, telefono, direccion, tipo_entrega, items[])` → inserta orden en estado `pendiente`.
  - [ ] `escalar_a_humano(motivo)` → cambia estado a `humano` + notifica al vendedor.
- [ ] System prompt: asistente de repuestos, no cobra, recauda datos, crea orden pendiente.
- [ ] Validación backend: `crear_orden_pendiente` solo se ejecuta si todos los campos requeridos están presentes.

### 6.3 Flujo de orden desde WhatsApp
- [ ] Bot recauda: nombre, teléfono, dirección, tipo_entrega (Yummy/MRW/Zoom).
- [ ] Crea orden `canal='whatsapp'`, `estado='pendiente'`, `estado_pago='pendiente'`.
- [ ] Descuenta stock al crear la orden (con opción de revertir si se cancela).
- [ ] Notifica al vendedor en el panel (badge + lista).
- [ ] Humano confirma cobro → `estado='confirmada'` → `por_despachar`.

### 6.4 Frontend WhatsApp
- [ ] Bandeja de conversaciones (lista + chat estilo WhatsApp).
- [ ] Indicador de estado (bot/humano).
- [ ] Botón "Tomar control" (pasa a humano).
- [ ] Vista de órdenes generadas desde WhatsApp con datos del cliente.
- [ ] Filtro por vendedor/cuenta.

**Criterio de aceptación:** cliente escribe al WhatsApp, el bot identifica la pieza, confirma stock, recauda datos, crea orden pendiente, vendedor confirma cobro y despacha.

---

## FASE 7 — Optimización + Reportes

**Objetivo:** analítica, alertas y mejoras incrementales.

- [ ] Reportes: ventas por vendedor, por canal, por SKU, margen bruto.
- [ ] Alertas: stock bajo, publicaciones pausadas, errores de sync ML, conversaciones sin atender.
- [ ] Dashboard ejecutivo: ventas del día/mes, top SKUs, top vendedores.
- [ ] IA para sugerir precios según costo + margen + competencia ML.
- [ ] OCR mejorado: aprendizaje de facturas recurrentes de proveedores.
- [ ] Exportación de reportes a CSV/Excel.
- [ ] Logs y monitoreo de workers (éxitos, errores, tiempos).

---

## Decisiones técnicas cerradas

| Punto | Decisión |
|-------|----------|
| Backend | NestJS + TypeScript |
| Frontend | Next.js + shadcn/ui + TanStack Query |
| DB | PostgreSQL |
| Colas | BullMQ + Redis |
| Storage | MinIO |
| PDF | Puppeteer o PDFKit |
| OCR | Tesseract + LLM para estructuración |
| LLM | OpenAI GPT-4o o Claude (tool calling) |
| ML SDK | HTTP directo (axios) |
| WhatsApp | Cloud API oficial de Meta |
| Contenedores dev | `docker-compose.dev.yml` (hot reload) |
| Contenedores prod | `docker-compose.prod.yml` (multi-stage) |
| Deploy | Dokploy (fuera de alcance en estas fases) |

---
