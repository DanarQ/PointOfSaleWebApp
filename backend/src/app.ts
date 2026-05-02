// Builds and returns the Express app.
// createApp() accepts a prisma client so the same factory can be used in tests
// with a mock/partial prisma object (only the needed models are required).
import express from "express";
import type { ErrorRequestHandler } from "express";
import cors from "cors";
import { createAuthRouter, type AuthPrisma } from "./routes/auth.js";
import { createCategoriesRouter } from "./routes/categories.js";
import { createProductsRouter, type ProductPrisma } from "./routes/products.js";
import { createUsersRouter, type UserPrisma } from "./routes/users.js";
import {
  createProductStockMovementsRouter,
  createStockMovementsRouter,
} from "./routes/stockMovements.js";
import { createTransactionsRouter } from "./routes/transactions.js";
import { createPaymentsRouter } from "./routes/payments.js";
import { createSettingsRouter } from "./routes/settings.js";
import { createAuthMiddleware, requireRole } from "./middleware/auth.js";
import type { CategoryPrisma } from "./services/categories.service.js";
import type { StockMovementPrisma } from "./services/stockMovements.service.js";
import type { TransactionPrisma } from "./services/transactions.service.js";
import type { PaymentPrisma } from "./services/payments.service.js";
import type { SettingsPrisma } from "./services/settings.service.js";

// Union of all prisma model requirements across every router.
// Using unknown for optional models because the real prisma client satisfies all of them.
type AppPrisma = ProductPrisma & {
  auth?: unknown;
  category?: unknown;
  stockMovement?: unknown;
  transaction?: unknown;
  transactionItem?: unknown;
  payment?: unknown;
  storeSetting?: unknown;
  $transaction?: unknown;
};

// Catch-all error handler — Express identifies error handlers by their 4-parameter signature.
// Returns JSON instead of the default HTML error page so the API stays consistent.
const jsonErrorHandler: ErrorRequestHandler = (_error, _req, res, _next) => {
  console.error(_error);
  res.status(500).json({ error: "internal server error" });
};

export function createApp(prisma: AppPrisma) {
  const app = express();

  const frontendUrls = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(",").map((url) => url.trim())
    : ["http://localhost:3000"];

  app.use(
    cors({
      origin: frontendUrls,
    })
  );
  app.use(express.json());

  // Simple liveness probe used by health-checks / load balancers.
  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Create the auth middleware once if prisma.auth is available.
  // When undefined (e.g. in tests that skip auth), routers leave write endpoints unprotected.
  const requireAuth = prisma.auth
    ? createAuthMiddleware(prisma as ProductPrisma & AuthPrisma)
    : undefined;

  // requireAdmin combines authentication + role check in one guard array.
  // Only used on destructive/sensitive endpoints (delete, void).
  const requireAdmin = requireAuth ? requireRole('admin') : undefined;

  // Each router is mounted only when the required prisma models are present.
  // This allows tests to opt-in to only the routes they need.

  if (prisma.auth) {
    app.use("/auth", createAuthRouter(prisma as ProductPrisma & AuthPrisma));
  }

  if (prisma.auth && requireAuth && requireAdmin) {
    app.use("/users", createUsersRouter(prisma as ProductPrisma & UserPrisma, requireAuth, requireAdmin));
  }

  if (prisma.category) {
    app.use(
      "/categories",
      createCategoriesRouter(prisma as ProductPrisma & CategoryPrisma, requireAuth, requireAdmin),
    );
  }

  // Stock movements need $transaction because creating one also updates product.stock atomically.
  if (prisma.stockMovement && prisma.$transaction) {
    app.use(
      "/products/:id/stock-movements",
      createProductStockMovementsRouter(prisma as ProductPrisma & StockMovementPrisma),
    );
    app.use(
      "/stock-movements",
      createStockMovementsRouter(prisma as ProductPrisma & StockMovementPrisma, requireAuth),
    );
  }

  // Transactions need all four models plus $transaction because the whole checkout is one DB transaction.
  if (
    prisma.transaction &&
    prisma.transactionItem &&
    prisma.payment &&
    prisma.stockMovement &&
    prisma.$transaction
  ) {
    app.use(
      "/transactions",
      createTransactionsRouter(
        prisma as ProductPrisma & StockMovementPrisma & TransactionPrisma,
        requireAuth,
        requireAdmin,
      ),
    );
  }

  if (prisma.payment) {
    app.use("/payments", createPaymentsRouter(prisma as ProductPrisma & PaymentPrisma));
  }

  if (prisma.storeSetting) {
    app.use("/settings", createSettingsRouter(prisma as ProductPrisma & SettingsPrisma, requireAuth, requireAdmin));
  }

  // Products router is always present — other routers depend on the product model.
  app.use("/products", createProductsRouter(prisma, requireAuth, requireAdmin));

  // Must be registered last so it catches errors thrown by all routes above.
  app.use(jsonErrorHandler);

  return app;
}
