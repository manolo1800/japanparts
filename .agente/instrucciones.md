# Plan de Desarrollo por Fases — ERP Repuestos Multichannel

**Stack:** NestJS + PostgreSQL + Redis/BullMQ + Next.js + MinIO  
**Deploy:** Dokploy (configuración de servidor fuera de alcance)  
**Contenedores:** `docker-compose.dev.yml` (hot reload) y `docker-compose.prod.yml` (optimizado)  
**LLM Core:** DeepSeek (`deepseek-chat` / `deepseek-reasoner`)  
**WhatsApp:** Baileys (`@whiskeysockets/baileys` multi-device)  
**Integraciones:** Centralizadas en `apps/backend/src/integrations/`  

---

## ARQUITECTURA DE INTEGRACIONES (`apps/backend/src/integrations`)

Para evitar el acoplamiento del dominio principal (`compra`, `orden`, `sku`, etc.) con SDKs de terceros y proveedores externos, todos los servicios de conexión hacia el exterior se estructuran dentro de `apps/backend/src/integrations/`:

```
apps/backend/src/integrations/
├── integrations.module.ts              # Módulo orquestador que agrupa y exporta las integraciones
├── deepseek/                           # Proveedor de LLM único para todo el sistema
│   ├── deepseek.module.ts
│   ├── deepseek.service.ts             # Cliente DeepSeek (OpenAI-compatible), Structured Outputs y Tool Calling
│   ├── deepseek.config.ts              # API keys, endpoint (https://api.deepseek.com), modelos y timeouts
│   ├── prompts/                        # Prompts versionados del sistema
│   │   ├── ocr-factura.prompt.ts       # Extracción y tipado de facturas de compra
│   │   ├── whatsapp-bot.prompt.ts      # System prompt del bot de repuestos automotrices
│   │   └── pricing-analysis.prompt.ts  # Análisis de márgenes y sugerencias de precio
│   └── interfaces/
│       └── deepseek.interfaces.ts
├── whatsapp/                           # Cliente WhatsApp Web Socket con Baileys
│   ├── whatsapp.module.ts
│   ├── baileys.service.ts              # Lifecycle del socket, reconexión, envío de mensajes y media
│   ├── session-storage.service.ts      # Persistencia de credenciales multi-device (volumen/DB)
│   ├── whatsapp.controller.ts          # Endpoints de estado de conexión, QR pairing y desconexión
│   ├── whatsapp.gateway.ts             # Emisión en tiempo real del QR y status al frontend (SSE / WebSockets)
│   └── interfaces/
│       └── whatsapp.interfaces.ts
├── mail/                               # Envíos de correo transaccional y notificaciones
│   ├── mail.module.ts
│   ├── mail.service.ts                 # Envíos vía Nodemailer / SMTP / Resend
│   ├── templates/                      # Plantillas HTML para recibos, alertas de stock y órdenes
│   └── interfaces/
│       └── mail.interfaces.ts
└── mercadolibre/                       # [Fase Final] Integración con APIs de MercadoLibre
    ├── mercadolibre.module.ts
    ├── mercadolibre-client.service.ts  # Manejo de OAuth2, refresh token y peticiones HTTP a ML
    └── interfaces/
        └── mercadolibre.interfaces.ts
```

### Ventajas del diseño:
1. **Desacoplamiento total:** Los módulos de negocio consumen `DeepSeekService` o `MailService` mediante interfaces limpias sin importar los detalles de bajo nivel.
2. **Reutilización entre API y Workers:** `apps/worker` puede consumir el mismo `DeepSeekService` para procesar tareas asíncronas de BullMQ (OCR, respuestas del bot, resúmenes).
3. **Mantenibilidad:** Si se agregan nuevos proveedores (ej. pasarelas de pago, envíos MRW/Zoom, SMS), se añade un nuevo submódulo en `integrations/` sin alterar el núcleo.

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

**Criterio de aceptación:** `dev:up` levanta todo con hot reload en backend/frontend/worker. `prod:up` levanta contenedores optimizados listos para Dokploy. [VERIFICADO]

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
- [x] `POST/GET/PUT/DELETE /publicacion` (manual).
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

**Criterio de aceptación:** crear SKU `DEN-YKT22`, agregar 5 compatibilidades, 8 publicaciones manuales, ajustar stock y ver historial. [VERIFICADO]

---

## FASE 2 — Compras + Facturas de proveedor

**Objetivo:** registrar compras con OCR asistido por IA (DeepSeek) y cuentas por pagar.

- [x] Tabla `proveedor` (id, nombre, rif, contacto, telefono, email).
- [x] Tabla `compra` (id, proveedor_id FK, numero_factura, fecha, subtotal, total, condicion_pago ENUM['contado','credito'], dias_credito, estado ENUM['pendiente','recibida','pagada'], archivo_url).
- [x] Tabla `compra_detalle` (id, compra_id FK, sku_id FK, cantidad, costo_unitario, subtotal).
- [x] Tabla `pago_compra` (id, compra_id FK, fecha, monto, metodo, referencia).
- [x] Endpoint `POST /compra` (carga manual estructurada).
- [x] Endpoint `POST /compra/ocr` → sube imagen/PDF a MinIO → procesa extracción estructurada → devuelve JSON editable.
- [x] Procesamiento de Facturas:
  - [x] Extracción de texto de documentos PDF / imágenes.
  - [x] Detección de RIF, número de factura, ítems, cantidades y montos.
  - [x] Vinculación asistida con SKUs y proveedores del catálogo existente.
- [x] Endpoint `POST /compra/:id/aprobar`:
  - [x] Crear `compra_detalle`.
  - [x] Generar `movimiento_stock` de entrada por cada item.
  - [x] Recalcular `costo_promedio` ponderado del SKU.
- [x] Endpoint `POST /compra/:id/pago` (pagos parciales o totales).
- [x] Endpoint `GET /proveedor/:id/estado-cuenta`.
- [x] Frontend: formulario de compra manual.
- [x] Frontend: flujo OCR (subir → revisar/editar → aprobar).
- [x] Frontend: lista de compras + estado de cuenta por proveedor.

**Criterio de aceptación:** subir factura PDF/imagen, extraer items, editarlos, aprobar, stock sube. Si es a crédito, queda registrada la cuenta por pagar. [VERIFICADO]

---

## FASE 3 — Ventas + Documentos internos

**Objetivo:** registrar ventas por mostrador y generar facturas/recibos PDF.

- [x] Tabla `cliente` (id, nombre, telefono, email, direccion, notas).
- [x] Tabla `orden` (id, numero_orden, canal ENUM['mostrador','ml','whatsapp'], cuenta_id FK, vendedor_id FK, cliente_id FK, fecha, estado ENUM['pendiente','confirmada','por_despachar','despachada','cerrada','cancelada'], tipo_entrega ENUM['retiro','delivery','encomienda'], direccion_entrega, total, metodo_pago, estado_pago ENUM['pendiente','confirmado'], origen).
- [x] Tabla `orden_detalle` (id, orden_id FK, sku_id FK, publicacion_id FK, cantidad, precio_unitario, subtotal).
- [x] Tabla `documento_venta` (id, orden_id FK, tipo ENUM['factura','recibo'], numero UNIQUE, fecha, datos_cliente JSONB, pdf_url).
- [x] Servicio de creación de orden:
  - [x] Validar stock disponible.
  - [x] Descontar `sku.stock_actual`.
  - [x] Registrar `movimiento_stock` de salida.
- [x] Generador de PDF (factura + recibo) con numeración correlativa por tipo.
- [x] Endpoint `POST /orden` (mostrador).
- [x] Endpoint `GET /orden/:id/pdf?tipo=factura|recibo`.
- [x] Endpoint `POST /orden/:id/confirmar-pago` (solo humano).
- [x] Endpoint `POST /orden/:id/despachar`.
- [x] Endpoint `POST /orden/:id/cancelar` (revierte stock + movimiento).
- [x] Frontend: POS mostrador (búsqueda por SKU o compatibilidad → carrito → crear orden).
- [x] Frontend: lista de órdenes con filtros y estados.
- [x] Frontend: detalle de orden + acciones (confirmar pago, despachar, cancelar, generar PDF).

**Criterio de aceptación:** crear orden mostrador, descontar stock, generar factura PDF con numeración, confirmar pago, marcar despachada. [VERIFICADO]

---

## FASE 4 — Integraciones Backend (DeepSeek + Mail) y Bot WhatsApp con Baileys

**Objetivo:** implementar la infraestructura de servicios externos, conectar el LLM DeepSeek para estructuración/agente, configurar servicio de correo transaccional y levantar el bot de WhatsApp multi-device vía Baileys sin depender de Meta Cloud API.

### 4.1 Módulo Base de Integraciones (`apps/backend/src/integrations`)
- [x] Crear estructura de directorios:
  - [x] `apps/backend/src/integrations/integrations.module.ts`
  - [x] `apps/backend/src/integrations/deepseek/`
  - [x] `apps/backend/src/integrations/whatsapp/`
  - [x] `apps/backend/src/integrations/mail/`
- [x] Configurar variables de entorno requeridas en `.env.dev` y `.env.prod`:
  - [x] `DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL` (`https://api.deepseek.com`), `DEEPSEEK_MODEL` (`deepseek-chat`).
  - [x] `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`.
  - [x] `WHATSAPP_SESSION_PATH` (directorio para persistencia de credenciales Baileys).
- [x] Añadir volumen persistente en Docker para almacenamiento de sesiones Baileys (`/data/whatsapp-sessions`).

### 4.2 Servicio de Integración DeepSeek (`integrations/deepseek`)
- [x] Crear `DeepSeekService` utilizando cliente HTTP / OpenAI SDK con `baseURL='https://api.deepseek.com'`.
- [x] Implementar soporte para **JSON Mode / Structured Outputs** (esquemas de datos tipados para extracción).
- [x] Implementar soporte para **Tool Calling (Function Calling)** de DeepSeek para agentes conversacionales.
- [x] Integrar DeepSeek con `OcrService` (Fase 2):
  - [x] Inyectar `DeepSeekService` para parsear facturas complejas con texto extraído crudo.
  - [x] Prompt especializado con esquema JSON estricto (`proveedor`, `rif`, `nro_factura`, `items[]`, `totales`).
- [x] Manejo de rate limits, timeouts y reintentos automáticos.

### 4.3 Servicio de Correo Transaccional (`integrations/mail`)
- [x] Crear `MailService` basado en Nodemailer con soporte para templates HTML.
- [x] Template y método para enviar comprobante de orden / factura PDF al cliente.
- [x] Template y método para alertas automáticas a vendedores (stock crítico, orden pendiente de WhatsApp).
- [x] Endpoint de prueba `POST /mail/test` (solo admin).

### 4.4 Integración WhatsApp con Baileys (`integrations/whatsapp`)
- [x] Instalar `@whiskeysockets/baileys` y `qrcode`.
- [x] Implementar `SessionStorageService`:
  - [x] Gestión de credenciales multi-device (`useMultiFileAuthState`) sobre volumen persistente o base de datos.
  - [x] Soporte para restaurar sesión activa al reiniciar el backend sin requerir nuevo escaneo de QR.
- [x] Implementar `BaileysService`:
  - [x] Inicialización del socket Baileys (`makeWASocket`) con manejo de eventos del ciclo de vida:
    - [x] `connection.update`: capturar código QR generado, detectar estados `open`, `connecting`, `close`.
    - [x] Lógica de reconexión automática ante cortes temporales con backoff exponencial.
    - [x] Manejo de logout / revocación de sesión desde el teléfono.
    - [x] `creds.update`: persistencia atómica del estado de autenticación.
  - [x] Evento `messages.upsert`: captura de mensajes entrantes (texto, imágenes, audios), filtrado de mensajes propios y despacho a `ConversacionService`.
  - [x] Método `enviarMensajeTexto(jid, texto)` y `enviarDocumento(jid, buffer, nombre, mimetype)`.
- [x] Endpoints y Gateway de Control:
  - [x] `GET /whatsapp/status` → estado actual (desconectado, esperando_qr, conectado).
  - [x] `GET /whatsapp/qr` → retorna el código QR actual en base64/SVG para vincular el dispositivo.
  - [x] `POST /whatsapp/disconnect` → cierra la sesión y limpia credenciales almacenadas.
  - [x] `POST /whatsapp/reconnect` → fuerza inicio y nuevo código QR.
  - [x] Gateway SSE (`GET /whatsapp/events`) para emitir cambios de estado y nuevo QR en tiempo real al frontend.

### 4.5 Motor del Bot con DeepSeek (Tools & Conversación)
- [x] Tabla `conversacion` (id, canal, cuenta_id FK, cliente_id FK, telefono, estado ENUM['bot','humano','cerrada'], orden_id FK, updated_at).
- [x] Tabla `mensaje` (id, conversacion_id FK, rol ENUM['user','assistant','system','humano'], contenido, timestamp).
- [x] Procesamiento de mensajes entrantes:
  - [x] Recibe el mensaje entrante de Baileys.
  - [x] Carga el historial reciente de la conversación.
  - [x] Llama a `DeepSeekService` con el system prompt y la lista de tools habilitadas (con motor heurístico asistido como fallback).
- [x] Tools del LLM DeepSeek (Function Calling):
  - [x] `buscar_repuesto(query, marca_vehiculo, modelo, anio)` → consulta `sku` y `compatibilidad`.
  - [x] `consultar_disponibilidad(sku_id)` → consulta `stock_actual` y `precio_base`.
  - [x] `crear_orden_pendiente(datos_cliente, items[])` → inserta orden con `canal='whatsapp'`, `estado='pendiente'`, `estado_pago='pendiente'`.
  - [x] `escalar_a_humano(motivo)` → cambia estado a `humano` y emite alerta en tiempo real.
- [x] System Prompt especializado:
  - [x] Asistente de atención al cliente de "Japón Parts", tono servicial y técnico sobre repuestos automotrices.
  - [x] Nunca confirma pagos automáticamente; recauda datos (nombre, teléfono, dirección, método de entrega) y genera la orden en estado pendiente.
- [x] Flujo de orden WhatsApp:
  - [x] Al completar datos, crea orden pendiente y reserva stock temporal.
  - [x] Envía confirmación por WhatsApp al cliente indicando datos de pago y número de orden.
  - [x] Notifica al vendedor por panel y/o email.
  - [x] El vendedor verifica el pago recibido y pasa la orden a `confirmada` → `por_despachar`.

### 4.6 Frontend — Módulo WhatsApp
- [x] Pantalla de Conexión de Dispositivo:
  - [x] Visor interactivo de Código QR para vincular el WhatsApp del negocio.
  - [x] Indicador de conexión en tiempo real (Conectado / Desconectado / Escanear QR).
  - [x] Botón para desvincular o forzar reconexión.
- [x] Bandeja de Entrada Omnicanal:
  - [x] Lista de conversaciones activas con badges de mensajes no leídos y estado (`bot` vs `humano`).
  - [x] Chat en vivo estilo WhatsApp Web.
  - [x] Botón "Tomar control humano" / "Reactivar bot".
  - [x] Enlace directo a la orden generada si el bot cerró una venta (abre `DetalleOrdenModal`).

**Criterio de aceptación:** Vincular WhatsApp escaneando el QR desde el teléfono; un cliente escribe consultando por una pastilla de freno, el bot DeepSeek identifica la pieza en inventario, responde disponibilidad y precio, solicita datos de despacho, genera la orden en estado `pendiente` y el vendedor la visualiza lista para cobrar en el panel. [VERIFICADO]


---

## FASE 5 — Optimización, Alertas y Reportes Ejecutivos

**Objetivo:** analítica comercial, alertas de inventario y optimización continua de procesos asistida por IA.

- [ ] Reportes analíticos:
  - Ventas por canal (mostrador, WhatsApp).
  - Ventas y comisiones por vendedor.
  - Ranking de SKUs más vendidos y margen de contribución.
- [ ] Sistema de Alertas automáticas:
  - Stock bajo / mínimo alcanzado (notificación al administrador por email/panel).
  - Conversaciones de WhatsApp en espera o escaladas a humano sin respuesta.
- [ ] Sugerencia inteligente de precios con DeepSeek:
  - Endpoint `POST /sku/:id/sugerir-precio` que analiza costo promedio, margen histórico y categoría del repuesto.
- [ ] Exportación de reportes a formatos Excel y CSV.
- [ ] Dashboard ejecutivo para dirección: KPIs del mes, ticket promedio, tasa de conversión del bot.
- [ ] Monitoreo de colas BullMQ y salud de sesiones Baileys.

**Criterio de aceptación:** El administrador consulta el reporte mensual, descarga exportable en Excel, recibe alertas de SKUs con stock crítico y visualiza métricas de ventas por canal.

---

## FASE 6 — Integración MercadoLibre: Piloto 1 Cuenta (ÚLTIMO PUNTO — PARTE 1)

**Objetivo:** conectar una cuenta de MercadoLibre piloto para publicar catálogo, sincronizar stock/precio y recibir órdenes de compra vía webhooks.

### 6.1 Setup ML y Módulo de Integración (`integrations/mercadolibre`)
- [ ] Registrar aplicación en MercadoLibre DevCenter (site `MLV`).
- [ ] Crear submódulo `apps/backend/src/integrations/mercadolibre/`:
  - `MercadoLibreClientService`: cliente HTTP con manejo de rate limits, reintentos y logging.
- [ ] Tabla `ml_token` (id, cuenta_id FK, access_token, refresh_token, expires_at).
- [ ] Flujo OAuth 2.0:
  - Endpoint `GET /ml/auth` → redirige al login de ML.
  - Endpoint `GET /ml/callback` → procesa código de autorización y almacena tokens.
  - Worker de refresh automático de tokens antes de expiración (cada 5 horas).

### 6.2 Publicación de SKUs en MercadoLibre
- [ ] Servicio `ml.publishItem(sku, publicacion)`:
  - Validación previa: categoría automotriz, atributos obligatorios (`BRAND`, `PART_NUMBER`, compatibilidades vehiculares).
  - Mapeo de campos desde el catálogo interno (`sku` + `compatibilidad`) hacia los atributos de MercadoLibre.
  - Guardar `ml_item_id` en la tabla `publicacion`.
- [ ] Endpoints `POST /publicacion/:id/publicar-ml` y `PUT /publicacion/:id/actualizar-ml`.

### 6.3 Sincronización Automática de Stock y Precio
- [ ] Worker `sync-ml-stock` (BullMQ):
  - Trigger: cada `movimiento_stock` (ventas en mostrador, órdenes de WhatsApp, compras recibidas) encola actualización hacia publicaciones de ML vinculadas.
  - Rate limiting controlado con BullMQ (`limiter: { max, duration }`).
  - Buffer de seguridad: si `stock_actual <= umbral_minimo`, pausar automáticamente la publicación en ML para evitar sobreventa.
- [ ] Worker `sync-ml-price`: actualiza el precio en ML al modificarse el `precio_base` del SKU.

### 6.4 Webhooks y Procesamiento de Órdenes ML
- [ ] Endpoint `POST /webhooks/ml` (validado por firma de notificación).
- [ ] Tópico `orders`: descarga la orden de ML → crea orden interna con `canal='ml'` → descuenta stock del SKU → encola actualización a otros canales.
- [ ] Tópico `questions`: almacena la pregunta del cliente para responder desde el panel o notificar al vendedor.
- [ ] Idempotencia en Redis para evitar procesar dos veces el mismo `notification_id`.
- [ ] Manejo de envío ML (detección de MercadoEnvíos gratis o pagado).

### 6.5 Frontend MercadoLibre
- [ ] Pantalla de conexión OAuth para autorizar la cuenta de MercadoLibre.
- [ ] Vista de publicaciones con estado de sincronización (sincronizada, pendiente, error, pausada).
- [ ] Botón "Publicar en MercadoLibre" en la ficha de cada SKU.
- [ ] Log de eventos y errores de sincronización con opción de reintento manual.

**Criterio de aceptación:** Conectar cuenta ML vía OAuth, publicar un SKU desde el ERP; realizar una venta en ML y verificar que el webhook cree la orden interna, reste stock y pause o actualice las publicaciones vinculadas.

---

## FASE 7 — Multi-cuenta MercadoLibre y Atribución por Vendedor (ÚLTIMO PUNTO — PARTE 2)

**Objetivo:** escalar la integración de MercadoLibre para permitir que múltiples vendedores vinculen sus cuentas individuales con inventario central unificado y atribución transparente.

- [ ] Vinculación multi-cuenta: cada vendedor conecta su cuenta de ML vía OAuth asociándola a su `usuario_id` en `cuenta_canal`.
- [ ] Aislamiento en interfaz: cada vendedor gestiona y visualiza únicamente sus publicaciones de ML, pero consumen el inventario centralizado de la empresa.
- [ ] Atribución automática: toda orden generada a través de una publicación de ML se asigna al `vendedor_id` propietario de la cuenta.
- [ ] Cola centralizada de sincronización en batch para actualizar stock concurrentemente en todas las cuentas vinculadas sin colisiones de inventario.
- [ ] Dashboard individual por vendedor: ventas en sus cuentas de ML, publicaciones activas y comisiones calculadas.
- [ ] Alertas automáticas al vendedor si sus publicaciones son pausadas por agotamiento de stock.

**Criterio de aceptación:** Dos vendedores con cuentas distintas de MercadoLibre tienen publicado el mismo repuesto; ocurre una venta en la cuenta del Vendedor A, el stock baja en el almacén central, se le atribuye la comisión al Vendedor A y se actualiza inmediatamente el stock disponible en la publicación del Vendedor B.

---

## Decisiones técnicas cerradas

| Punto | Decisión | Detalle / Justificación |
|---|---|---|
| **Backend** | NestJS + TypeScript | Arquitectura modular, inyección de dependencias y tipado estricto |
| **Frontend** | Next.js + TailwindCSS + shadcn/ui + TanStack Query | Interfaz moderna, componentes reutilizables y caché optimizada |
| **Base de Datos** | PostgreSQL + TypeORM | Relaciones complejas, transacciones ACID para inventario y JSONB para atributos |
| **Colas / Workers** | BullMQ + Redis | Procesamiento asíncrono desacoplado, rate limiting y reintentos exponenciales |
| **Almacenamiento** | MinIO | Almacenamiento local compatible con S3 para facturas PDF e imágenes |
| **Integraciones** | `apps/backend/src/integrations/` | Directorio unificado para LLM, Mail, WhatsApp y MercadoLibre |
| **LLM Core** | DeepSeek (`deepseek-chat` / `deepseek-reasoner`) | Modelo único para OCR estructurado, bot de WhatsApp y analítica con Tool Calling |
| **WhatsApp** | Baileys (`@whiskeysockets/baileys`) | Conexión WebSocket multi-device sin costo por mensaje ni intermediación de Meta Cloud API |
| **Email** | Nodemailer / SMTP | Servicio de correos transaccionales desacoplado en `integrations/mail` |
| **MercadoLibre** | HTTP directo (Axios) con OAuth 2.0 | Implementado como fase final (`integrations/mercadolibre`) |
| **Generación PDF** | Puppeteer / PDFKit | Facturas y recibos con numeración correlativa y formato fiscal |
| **Contenedores Dev** | `docker-compose.dev.yml` | Hot reload automático en backend, frontend y workers |
| **Contenedores Prod** | `docker-compose.prod.yml` | Builds multi-stage optimizados para despliegue en Dokploy |
