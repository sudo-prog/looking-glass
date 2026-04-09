const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
};

http
  .createServer((req, res) => {
    const parsed = new URL(req.url, `http://localhost:${PORT}`);

    // Proxy Twitter video requests
    if (parsed.pathname === "/proxy-video") {
      const videoUrl = parsed.searchParams.get("url");
      if (!videoUrl || !videoUrl.startsWith("https://video.twimg.com/")) {
        res.writeHead(400);
        res.end("Invalid video URL");
        return;
      }
      https.get(videoUrl, (upstream) => {
        if (upstream.statusCode >= 300 && upstream.statusCode < 400 && upstream.headers.location) {
          // Follow one redirect
          https.get(upstream.headers.location, (redirected) => {
            res.writeHead(redirected.statusCode, {
              "Content-Type": redirected.headers["content-type"] || "video/mp4",
              "Content-Length": redirected.headers["content-length"],
              "Accept-Ranges": "bytes",
            });
            redirected.pipe(res);
          }).on("error", () => { res.writeHead(502); res.end("Upstream error"); });
          return;
        }
        res.writeHead(upstream.statusCode, {
          "Content-Type": upstream.headers["content-type"] || "video/mp4",
          "Content-Length": upstream.headers["content-length"],
          "Accept-Ranges": "bytes",
        });
        upstream.pipe(res);
      }).on("error", () => { res.writeHead(502); res.end("Upstream error"); });
      return;
    }

    // Static file serving
    let filePath = path.join(__dirname, parsed.pathname === "/" ? "index.html" : parsed.pathname);
    const ext = path.extname(filePath);
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
      res.end(data);
    });
  })
  .listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
