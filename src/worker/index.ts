import { Hono } from "hono";
const app = new Hono<{ Bindings: Env }>();

app.get("/api/", (c) => c.json({ name: "Cache" }));
app.get("/health", (c) => c.json({ status: "ok" }));

export default app;
