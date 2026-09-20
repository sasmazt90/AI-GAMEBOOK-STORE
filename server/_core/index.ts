import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { registerStripeWebhook } from "../stripe/webhookHandler";
import { registerBannerUploadRoute } from "../routes/bannerUpload";

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Register Stripe webhook BEFORE express.json() — raw body required for signature verification
  registerStripeWebhook(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Banner image upload (multipart, admin only)
  registerBannerUploadRoute(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = Number(process.env.PORT) || 3000;

  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on 0.0.0.0:${port}`);
  });
}

startServer().catch(console.error);
