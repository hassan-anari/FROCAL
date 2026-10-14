// Isolated test preview. Never imported by Vite or used for hosting.
import http from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
const root = resolve("dist-paired");
const types = { ".js": "text/javascript", ".css": "text/css", ".html": "text/html", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".json": "application/json", ".woff2": "font/woff2" };
http.createServer(async (request, response) => {
  if (request.url.startsWith("/api/v1/")) {
    const upstream = http.request({ hostname: "127.0.0.1", port: 8792, path: request.url, method: request.method, headers: { ...request.headers, host: "127.0.0.1" } }, (result) => {
      response.writeHead(result.statusCode, result.headers); result.pipe(response);
    });
    upstream.on("error", () => { response.writeHead(503); response.end(); });
    request.pipe(upstream); return;
  }
  const pathname = new URL(request.url, "http://127.0.0.1").pathname;
  const file = resolve(root, `.${decodeURIComponent(pathname)}`);
  if (!file.startsWith(root + "/")) { response.writeHead(403); response.end(); return; }
  try {
    const target = extname(file) ? file : resolve(root, "index.html");
    response.setHeader("Content-Type", types[extname(target)] ?? "application/octet-stream");
    response.end(await readFile(target));
  } catch { response.writeHead(404); response.end(); }
}).listen(4175, "127.0.0.1");
