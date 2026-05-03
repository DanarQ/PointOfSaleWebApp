"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  Boxes,
  CalendarDays,
  CreditCard,
  PackageCheck,
  ReceiptText,
  RefreshCcw,
  ShoppingCart,
  Store,
  TrendingUp,
} from "lucide-react";
import { PageHeader } from "@/components/app-shell/PageHeader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Product,
  StockMovement,
  StoreSettings,
  Transaction,
  getSettings,
  listProducts,
  listStockMovements,
  listTransactions,
} from "@/lib/pos-api";

const PAGE_LIMIT = 100;
const RECENT_LIMIT = 5;
const DEFAULT_LOW_STOCK_THRESHOLD = 5;

type DashboardState = {
  transactions: Transaction[];
  products: Product[];
  movements: StockMovement[];
  settings: StoreSettings | null;
  errors: string[];
};

type KpiCardProps = {
  label: string;
  value: string;
  note: string;
  icon: React.ElementType;
  tone?: "emerald" | "amber" | "stone";
};

type PaymentSummary = {
  method: string;
  count: number;
  total: number;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCount(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

function formatDateTime(value?: string) {
  if (!value) {
    return "No date";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "No date";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getValidDate(value?: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isSameLocalDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function normalizeLabel(value?: string) {
  const label = value?.trim();
  return label ? label : "unknown";
}

function getProductStock(product: Product) {
  return product.stock ?? 0;
}

function getProductUnit(product: Product) {
  return product.unit ?? "pcs";
}

function sortTransactionsByRecency(transactions: Transaction[]) {
  return [...transactions].sort((left, right) => {
    const leftDate = getValidDate(left.createdAt)?.getTime();
    const rightDate = getValidDate(right.createdAt)?.getTime();

    if (leftDate && rightDate && leftDate !== rightDate) {
      return rightDate - leftDate;
    }

    return right.id - left.id;
  });
}

function getMovementProductName(movement: StockMovement) {
  return movement.product?.name ?? `Product #${movement.productId}`;
}

async function fetchAllTransactions() {
  const firstPage = await listTransactions({ page: 1, limit: PAGE_LIMIT });
  const totalPages = firstPage.pagination.totalPages || 1;

  if (totalPages === 1) {
    return firstPage.data;
  }

  const remainingPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      listTransactions({ page: index + 2, limit: PAGE_LIMIT }),
    ),
  );

  return firstPage.data.concat(remainingPages.flatMap((page) => page.data));
}

async function fetchAllProducts() {
  const firstPage = await listProducts({ page: 1, limit: PAGE_LIMIT });
  const totalPages = firstPage.pagination.totalPages || 1;

  if (totalPages === 1) {
    return firstPage.data;
  }

  const remainingPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      listProducts({ page: index + 2, limit: PAGE_LIMIT }),
    ),
  );

  return firstPage.data.concat(remainingPages.flatMap((page) => page.data));
}

async function loadDashboardData(): Promise<DashboardState> {
  const [transactionsResult, productsResult, movementsResult, settingsResult] = await Promise.allSettled([
    fetchAllTransactions(),
    fetchAllProducts(),
    listStockMovements({ page: 1, limit: RECENT_LIMIT }),
    getSettings(),
  ]);

  const errors: string[] = [];

  function getErrorMessage(label: string, result: PromiseRejectedResult) {
    const message = result.reason instanceof Error ? result.reason.message : "Request failed.";
    return `${label}: ${message}`;
  }

  if (transactionsResult.status === "rejected") {
    errors.push(getErrorMessage("Transactions", transactionsResult));
  }

  if (productsResult.status === "rejected") {
    errors.push(getErrorMessage("Products", productsResult));
  }

  if (movementsResult.status === "rejected") {
    errors.push(getErrorMessage("Stock movements", movementsResult));
  }

  if (settingsResult.status === "rejected") {
    errors.push(getErrorMessage("Settings", settingsResult));
  }

  return {
    transactions: transactionsResult.status === "fulfilled" ? transactionsResult.value : [],
    products: productsResult.status === "fulfilled" ? productsResult.value : [],
    movements: movementsResult.status === "fulfilled" ? movementsResult.value.data : [],
    settings: settingsResult.status === "fulfilled" ? settingsResult.value : null,
    errors,
  };
}

function KpiCard({ label, value, note, icon: Icon, tone = "emerald" }: KpiCardProps) {
  const iconClass =
    tone === "amber" ? "bg-amber-100 text-amber-800" : tone === "stone" ? "bg-stone-100 text-stone-700" : "bg-emerald-100 text-emerald-800";

  return (
    <Card className="rounded-lg">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-black uppercase text-stone-500">{label}</p>
          <span className={`inline-flex size-8 items-center justify-center rounded-md ${iconClass}`}>
            <Icon className="size-4" />
          </span>
        </div>
        <p className="mt-4 text-3xl font-black tracking-tight text-emerald-950">{value}</p>
        <p className="mt-2 text-sm font-semibold leading-5 text-stone-600">{note}</p>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <section className="mt-5 grid gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card className="rounded-lg" key={index}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-4 h-10 w-32" />
              <Skeleton className="mt-3 h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </section>
      <section className="mt-5 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        {Array.from({ length: 2 }).map((_, index) => (
          <Card className="rounded-lg" key={index}>
            <CardHeader>
              <Skeleton className="h-5 w-36" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 5 }).map((__, rowIndex) => (
                <Skeleton className="h-14 w-full" key={rowIndex} />
              ))}
            </CardContent>
          </Card>
        ))}
      </section>
    </>
  );
}

export function DashboardClient() {
  const [data, setData] = useState<DashboardState>({
    transactions: [],
    products: [],
    movements: [],
    settings: null,
    errors: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);

    try {
      setData(await loadDashboardData());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDashboard();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadDashboard]);

  const summary = useMemo(() => {
    const now = new Date();
    const datedTransactions = data.transactions.filter((transaction) => getValidDate(transaction.createdAt));
    const hasDateData = datedTransactions.length > 0;
    const periodTransactions = hasDateData
      ? data.transactions.filter((transaction) => {
          const createdAt = getValidDate(transaction.createdAt);
          return createdAt ? isSameLocalDay(createdAt, now) : false;
        })
      : data.transactions;
    const completedTransactions = periodTransactions.filter((transaction) => transaction.status === "completed");
    const salesCompleted = completedTransactions.reduce((sum, transaction) => sum + transaction.total, 0);
    const activeProducts = data.products.filter((product) => product.isActive !== false);
    const lowStockThreshold = data.settings?.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD;
    const outOfStock = activeProducts.filter((product) => getProductStock(product) <= 0);
    const lowStock = activeProducts.filter((product) => {
      const stock = getProductStock(product);
      return stock > 0 && stock <= lowStockThreshold;
    });
    const paymentMap = new Map<string, PaymentSummary>();

    completedTransactions.forEach((transaction) => {
      const method = normalizeLabel(transaction.paymentMethod);
      const existing = paymentMap.get(method);

      paymentMap.set(method, {
        method,
        count: (existing?.count ?? 0) + 1,
        total: (existing?.total ?? 0) + transaction.total,
      });
    });

    return {
      periodLabel: hasDateData ? "Today" : "All available data",
      salesCompleted,
      transactionCount: periodTransactions.length,
      completedCount: completedTransactions.length,
      averageBasket: completedTransactions.length > 0 ? salesCompleted / completedTransactions.length : 0,
      activeProductCount: activeProducts.length,
      lowStockThreshold,
      lowStock,
      outOfStock,
      attentionProducts: outOfStock
        .concat(lowStock)
        .sort((left, right) => getProductStock(left) - getProductStock(right))
        .slice(0, RECENT_LIMIT),
      recentTransactions: sortTransactionsByRecency(data.transactions).slice(0, RECENT_LIMIT),
      paymentMix: Array.from(paymentMap.values()).sort((left, right) => right.total - left.total),
    };
  }, [data]);

  const storeName = data.settings?.storeName ?? "POS Swalayan";
  const storeAddress = data.settings?.storeAddress ?? "Store settings not configured yet.";
  const hasAnyData = data.transactions.length > 0 || data.products.length > 0 || data.movements.length > 0;

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Store Command"
        description="Ringkasan operasional toko dari transaksi, stok, produk, dan konfigurasi backend."
        action={isLoading ? "Refreshing..." : "Refresh"}
        onAction={() => void loadDashboard()}
      />

      {data.errors.length > 0 ? (
        <Alert variant="destructive" className="mt-5">
          <AlertTriangle className="size-4" />
          <AlertTitle>Some dashboard data is unavailable</AlertTitle>
          <AlertDescription>{data.errors.join(" ")}</AlertDescription>
        </Alert>
      ) : null}

      {isLoading ? <DashboardSkeleton /> : null}

      {!isLoading ? (
        <>
          <section className="mt-5 grid gap-3 xl:grid-cols-4">
            <KpiCard
              label={`Sales completed - ${summary.periodLabel}`}
              value={formatCurrency(summary.salesCompleted)}
              note={`${formatCount(summary.completedCount)} completed of ${formatCount(summary.transactionCount)} transactions.`}
              icon={TrendingUp}
            />
            <KpiCard
              label="Average basket"
              value={formatCurrency(summary.averageBasket)}
              note="Calculated from completed transactions in the active period."
              icon={ShoppingCart}
              tone="stone"
            />
            <KpiCard
              label="Active products"
              value={formatCount(summary.activeProductCount)}
              note={`${formatCount(summary.lowStock.length)} low stock, ${formatCount(summary.outOfStock.length)} out of stock.`}
              icon={PackageCheck}
            />
            <KpiCard
              label="Stock attention"
              value={formatCount(summary.lowStock.length + summary.outOfStock.length)}
              note={`Low-stock threshold: ${formatCount(summary.lowStockThreshold)} units.`}
              icon={Boxes}
              tone="amber"
            />
          </section>

          {!hasAnyData && data.errors.length === 0 ? (
            <Card className="mt-5 rounded-lg border-dashed">
              <CardContent className="px-4 py-12 text-center">
                <p className="font-black text-emerald-950">Dashboard is ready for live store data.</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Add products, complete checkout, or record stock movement to populate the operational summary.
                </p>
              </CardContent>
            </Card>
          ) : null}

          <section className="mt-5 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <Card className="rounded-lg">
              <CardHeader className="gap-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <ReceiptText className="size-5 text-emerald-700" />
                      Recent transactions
                    </CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Latest invoices from the checkout endpoint.
                    </p>
                  </div>
                  <Badge variant="secondary">{summary.periodLabel}</Badge>
                </div>
                <Separator />
              </CardHeader>
              <CardContent>
                {summary.recentTransactions.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-emerald-950/15 bg-stone-50 px-4 py-10 text-center">
                    <p className="font-black text-emerald-950">No transactions yet.</p>
                    <p className="mt-2 text-sm text-muted-foreground">Complete checkout from the POS page.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {summary.recentTransactions.map((transaction) => (
                      <div
                        className="flex flex-col gap-3 rounded-lg border border-emerald-950/10 bg-stone-50 p-3 sm:flex-row sm:items-center sm:justify-between"
                        key={transaction.id}
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-black text-emerald-950">{transaction.invoiceNumber}</p>
                            <Badge variant={transaction.status === "completed" ? "default" : "secondary"}>
                              {transaction.status}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs font-semibold text-stone-500">
                            {formatDateTime(transaction.createdAt)} - {normalizeLabel(transaction.paymentMethod)}
                          </p>
                        </div>
                        <p className="text-lg font-black text-emerald-950">{formatCurrency(transaction.total)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-lg">
              <CardHeader className="gap-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="size-5 text-emerald-700" />
                      Payment mix
                    </CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Completed payment method summary for the active period.
                    </p>
                  </div>
                  <Badge>{formatCount(summary.paymentMix.length)} methods</Badge>
                </div>
                <Separator />
              </CardHeader>
              <CardContent>
                {summary.paymentMix.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-emerald-950/15 bg-stone-50 px-4 py-10 text-center">
                    <p className="font-black text-emerald-950">No completed payment data.</p>
                    <p className="mt-2 text-sm text-muted-foreground">Completed sales will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {summary.paymentMix.map((payment) => (
                      <div className="rounded-lg border border-emerald-950/10 bg-stone-50 p-3" key={payment.method}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <Banknote className="size-4 text-emerald-700" />
                            <p className="font-black capitalize text-emerald-950">{payment.method}</p>
                          </div>
                          <p className="text-sm font-black text-emerald-950">{formatCurrency(payment.total)}</p>
                        </div>
                        <p className="mt-1 text-xs font-semibold text-stone-500">
                          {formatCount(payment.count)} completed transactions
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <section className="mt-5 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <Card className="rounded-lg">
              <CardHeader className="gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="size-5 text-amber-600" />
                    Stock watch
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Products that need restock attention.
                  </p>
                </div>
                <Separator />
              </CardHeader>
              <CardContent>
                {summary.attentionProducts.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-emerald-950/15 bg-stone-50 px-4 py-10 text-center">
                    <p className="font-black text-emerald-950">No stock attention needed.</p>
                    <p className="mt-2 text-sm text-muted-foreground">Active products are above the configured threshold.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {summary.attentionProducts.map((product) => {
                      const stock = getProductStock(product);
                      const isOut = stock <= 0;

                      return (
                        <div
                          className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3"
                          key={product.id}
                        >
                          <div className="min-w-0">
                            <p className="truncate font-black text-amber-950">{product.name}</p>
                            <p className="mt-1 text-xs font-semibold text-amber-800">
                              {product.sku || product.barcode || "No SKU"}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant={isOut ? "destructive" : "secondary"}>{isOut ? "Out" : "Low"}</Badge>
                            <p className="mt-1 text-sm font-black text-amber-950">
                              {formatCount(stock)} {getProductUnit(product)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-lg">
              <CardHeader className="gap-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Store className="size-5 text-emerald-700" />
                      Store status
                    </CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Store identity and recent inventory activity.
                    </p>
                  </div>
                  <Badge variant="outline">Online</Badge>
                </div>
                <Separator />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-emerald-950/10 bg-emerald-50 p-4">
                  <div className="flex items-start gap-3">
                    <CalendarDays className="mt-0.5 size-5 text-emerald-700" />
                    <div>
                      <p className="font-black text-emerald-950">{storeName}</p>
                      <p className="mt-1 text-sm font-semibold leading-5 text-emerald-800">{storeAddress}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {data.movements.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-emerald-950/15 bg-stone-50 px-4 py-8 text-center">
                      <p className="font-black text-emerald-950">No recent stock movement.</p>
                      <p className="mt-2 text-sm text-muted-foreground">Manual adjustments and sales movements will appear here.</p>
                    </div>
                  ) : (
                    data.movements.map((movement) => (
                      <div
                        className="flex items-center justify-between gap-3 rounded-lg border border-emerald-950/10 bg-stone-50 p-3"
                        key={movement.id}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-black text-emerald-950">{getMovementProductName(movement)}</p>
                          <p className="mt-1 text-xs font-semibold text-stone-500">
                            {formatDateTime(movement.createdAt)} - {movement.type}
                          </p>
                        </div>
                        <p className="text-sm font-black text-emerald-950">
                          {formatCount(movement.quantity)} {movement.product?.unit ?? "pcs"}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button type="button" onClick={() => void loadDashboard()} disabled={isLoading}>
                    <RefreshCcw />
                    Refresh data
                  </Button>
                  <Button type="button" variant="outline" disabled>
                    Register 01 open
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        </>
      ) : null}
    </>
  );
}
