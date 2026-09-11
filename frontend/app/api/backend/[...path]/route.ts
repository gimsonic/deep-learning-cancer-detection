import { NextRequest, NextResponse } from "next/server";

const VPS_URL = "http://3.110.144.29";

async function handler(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const targetPath = "/" + path.join("/");

  // Forward the original URL's query string if present
  const url = new URL(req.url);
  const targetUrl = `${VPS_URL}${targetPath}${url.search}`;

  // Forward the request to the VPS with the same method, headers, and body
  const headers = new Headers();
  req.headers.forEach((value, key) => {
    // Skip headers that should not be forwarded
    if (!["host", "connection"].includes(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  const fetchOptions: RequestInit = {
    method: req.method,
    headers,
  };

  // Attach body for non-GET/HEAD requests
  if (req.method !== "GET" && req.method !== "HEAD") {
    fetchOptions.body = await req.arrayBuffer();
  }

  try {
    const vpsResponse = await fetch(targetUrl, fetchOptions);

    // Stream the VPS response back to the client
    const responseHeaders = new Headers();
    vpsResponse.headers.forEach((value, key) => {
      responseHeaders.set(key, value);
    });
    // Ensure CORS headers are set
    responseHeaders.set("Access-Control-Allow-Origin", "*");

    return new NextResponse(vpsResponse.body, {
      status: vpsResponse.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("[proxy] Failed to reach VPS:", error);
    return NextResponse.json({ detail: "Backend unreachable" }, { status: 502 });
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
export const OPTIONS = handler;
