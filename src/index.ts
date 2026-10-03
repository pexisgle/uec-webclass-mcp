import { createMcpHandler } from "@modelcontextprotocol/server";
import { createMcpHonoApp } from "@modelcontextprotocol/hono";
import { Context } from "hono";
import { serve } from "@hono/node-server";
import server from "./server.ts";
import { rootLogger } from "./log.ts";

const handler = createMcpHandler(() => server);

const app = createMcpHonoApp();
app.all("/mcp", (c: Context) => handler.fetch(c.req.raw, { parsedBody: c.get("parsedBody") }));

serve(
  {
    fetch: app.fetch,
    hostname: "0.0.0.0",
    port: 3000,
  },
  (info) => {
    rootLogger.info`Server started on ${info.port}`;
  },
);
