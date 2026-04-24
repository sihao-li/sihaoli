import { createServer } from "node:http";
import { createReadStream, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT || 4173);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf"
};

createServer((request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.endsWith("/")) pathname += "index.html";
  const file = path.normalize(path.join(root, pathname));

  if (!file.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  let target = file;
  let statusCode = 200;
  try {
    const stats = statSync(target);
    if (stats.isDirectory()) target = path.join(target, "index.html");
  } catch {
    target = path.join(root, "404.html");
    statusCode = 404;
  }

  try {
    const stats = statSync(target);
    response.writeHead(statusCode, {
      "content-type": mime[path.extname(target)] || "application/octet-stream",
      "content-length": stats.size
    });
    createReadStream(target).pipe(response);
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}).listen(port, () => {
  console.log(`sihaoli-modern running at http://localhost:${port}`);
});
