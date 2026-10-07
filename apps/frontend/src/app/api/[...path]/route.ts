import { NextRequest, NextResponse } from 'next/server';

const BACKEND_INTERNAL_URL =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.INTERNAL_API_URL ||
  (process.env.NODE_ENV === 'production' ? 'http://backend:4000' : 'http://localhost:4000');

async function handleProxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const subPath = path.join('/');
  const query = req.nextUrl.search;
  const targetUrl = `${BACKEND_INTERNAL_URL}/${subPath}${query}`;

  try {
    const headers = new Headers();
    req.headers.forEach((value, key) => {
      // Filtrar cabeceras que pueden causar conflictos al proxyar
      if (!['host', 'connection', 'content-length'].includes(key.toLowerCase())) {
        headers.set(key, value);
      }
    });

    const hasBody = !['GET', 'HEAD'].includes(req.method);
    const body = hasBody ? await req.arrayBuffer() : undefined;

    const backendResponse = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
    });

    const responseBody = await backendResponse.arrayBuffer();
    const responseHeaders = new Headers();
    backendResponse.headers.forEach((val, key) => {
      // Filtrar cabeceras de compresión/encoding para evitar inconsistencias
      if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(key.toLowerCase())) {
        responseHeaders.set(key, val);
      }
    });

    return new NextResponse(responseBody, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error(`[API Proxy Error] Fallo al conectar con backend en ${targetUrl}:`, error.message);
    return NextResponse.json(
      {
        success: false,
        message: `No se pudo conectar con el backend (${targetUrl}). Verifica que el servicio esté corriendo en Dokploy. Detalle: ${error.message}`,
        error: error.message,
      },
      { status: 502 },
    );
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const PATCH = handleProxy;
export const DELETE = handleProxy;
