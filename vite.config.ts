import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";

function localApiPlugin(): Plugin {
  return {
    name: "meld-local-vercel-api",
    configureServer(server) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next) => {
        if (!req.url || !req.url.startsWith("/api/")) {
          return next();
        }
        try {
          const parsedUrl = new URL(req.url, "http://localhost");
          const routeName = parsedUrl.pathname.replace(/^\/api\//, "").replace(/\/$/, "");
          if (!routeName || routeName.includes("..") || routeName.startsWith("_")) {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: "Not found" }));
            return;
          }
          const modPath = path.resolve(__dirname, "api", `${routeName}.ts`);
          const mod = await server.ssrLoadModule(modPath);
          const handler = mod.default;
          if (typeof handler !== "function") {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: "API route missing default export" }));
            return;
          }

          const query: Record<string, string> = {};
          parsedUrl.searchParams.forEach((v, k) => {
            query[k] = v;
          });

          const vReq = Object.assign(req, { query });
          const vRes = Object.assign(res, {
            status(code: number) {
              res.statusCode = code;
              return vRes;
            },
            json(payload: unknown) {
              if (!res.headersSent) {
                res.setHeader("Content-Type", "application/json; charset=utf-8");
              }
              res.end(JSON.stringify(payload));
              return vRes;
            },
            send(body: Buffer | string) {
              res.end(body);
              return vRes;
            },
          });

          await handler(vReq, vRes);
        } catch (err) {
          console.error("[local-api]", err);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: err instanceof Error ? err.message : "Internal API error" }));
          }
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), localApiPlugin()],
  build: {
    target: "es2022",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom"],
          icons: ["@phosphor-icons/react"],
        },
      },
    },
  },
});
