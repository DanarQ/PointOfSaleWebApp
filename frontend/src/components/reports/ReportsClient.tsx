"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, CreditCard, Package, RotateCcw, Wallet } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell/PageHeader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Transaction, listTransactions } from "@/lib/pos-api";

const PAGE_LIMIT = 100;
const TOP_PRODUCT_LIMIT = 6;

type KpiSummary = {
  totalRevenue: number;
  totalTransactions: number;
  completedTransactions: number;
  voidedTransactions: number;
  averageTransactionValue: number;
};

type PaymentSummary = {
  method: string;
  count: number;
  total: number;
};

type StatusSummary = {
  status: string;
  count: number;
  total: number;
};

type TopProductSummary = {
  productId: number;
  productName: string;
  quantity: number;
  revenue: number;
};

type ReportSummary = {
  kpis: KpiSummary;
  paymentBreakdown: PaymentSummary[];
  statusBreakdown: StatusSummary[];
  topProducts: TopProductSummary[];
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

function normalizeLabel(value: string) {
  return value.trim() || "unknown";
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

function buildReportSummary(transactions: Transaction[]): ReportSummary {
  const completedTransactions = transactions.filter((transaction) => transaction.status === "completed");
  const totalRevenue = completedTransactions.reduce((sum, transaction) => sum + transaction.total, 0);

  const paymentMap = new Map<string, PaymentSummary>();
  const statusMap = new Map<string, StatusSummary>();
  const productMap = new Map<number, TopProductSummary>();

  transactions.forEach((transaction) => {
    const statusKey = normalizeLabel(transaction.status);
    const existingStatus = statusMap.get(statusKey);
    const statusTotal = transaction.status === "completed" ? transaction.total : 0;

    statusMap.set(statusKey, {
      status: statusKey,
      count: (existingStatus?.count ?? 0) + 1,
      total: (existingStatus?.total ?? 0) + statusTotal,
    });

    if (transaction.status !== "completed") {
      return;
    }

    const paymentKey = normalizeLabel(transaction.paymentMethod);
    const existingPayment = paymentMap.get(paymentKey);

    paymentMap.set(paymentKey, {
      method: paymentKey,
      count: (existingPayment?.count ?? 0) + 1,
      total: (existingPayment?.total ?? 0) + transaction.total,
    });

    transaction.items?.forEach((item) => {
      const existingProduct = productMap.get(item.productId);

      productMap.set(item.productId, {
        productId: item.productId,
        productName: item.productName,
        quantity: (existingProduct?.quantity ?? 0) + item.quantity,
        revenue: (existingProduct?.revenue ?? 0) + item.subtotal,
      });
    });
  });

  return {
    kpis: {
      totalRevenue,
      totalTransactions: transactions.length,
      completedTransactions: completedTransactions.length,
      voidedTransactions: transactions.filter((transaction) => transaction.status === "voided").length,
      averageTransactionValue: completedTransactions.length > 0 ? totalRevenue / completedTransactions.length : 0,
    },
    paymentBreakdown: Array.from(paymentMap.values()).sort((left, right) => right.total - left.total),
    statusBreakdown: Array.from(statusMap.values()).sort((left, right) => right.count - left.count),
    topProducts: Array.from(productMap.values())
      .sort((left, right) => {
        if (right.quantity !== left.quantity) {
          return right.quantity - left.quantity;
        }

        return right.revenue - left.revenue;
      })
      .slice(0, TOP_PRODUCT_LIMIT),
  };
}

function ReportsSkeleton() {
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

      <section className="mt-5 grid gap-4 xl:grid-cols-[0.95fr_0.95fr_1.1fr]">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card className="rounded-lg" key={index}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 4 }).map((__, rowIndex) => (
                <Skeleton className="h-14 w-full" key={rowIndex} />
              ))}
            </CardContent>
          </Card>
        ))}
      </section>
    </>
  );
}

export function ReportsClient() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const allTransactions = await fetchAllTransactions();
      setTransactions(allTransactions);
      setSummary(buildReportSummary(allTransactions));
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Failed to load reports.";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadReports();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadReports]);

  const kpis = summary?.kpis;

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Reports"
        description="Ringkasan performa penjualan, metode pembayaran, dan produk terlaris dari seluruh transaksi backend."
      />

      <Card className="mt-5 rounded-lg">
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg font-black">
                <BarChart3 className="size-5 text-emerald-700" />
                Reports overview
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {transactions.length > 0
                  ? `${formatCount(transactions.length)} transactions aggregated across all available backend pages.`
                  : "Load all transaction pages to calculate the current store summary."}
              </p>
            </div>
            <Button type="button" variant="outline" onClick={() => void loadReports()} disabled={isLoading}>
              <RotateCcw />
              Refresh
            </Button>
          </div>
          <Separator />
        </CardHeader>
        <CardContent>
          {error ? (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Reports unavailable</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {isLoading ? <ReportsSkeleton /> : null}

          {!isLoading && !error && transactions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-emerald-950/15 bg-stone-50 px-4 py-16 text-center">
              <p className="font-black text-emerald-950">No transactions available yet.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Complete a checkout from the POS page to populate sales reports.
              </p>
            </div>
          ) : null}

          {!isLoading && !error && summary && transactions.length > 0 ? (
            <>
              <section className="grid gap-3 xl:grid-cols-4">
                <div className="rounded-lg border border-emerald-950/10 bg-white p-4 shadow-sm shadow-emerald-950/5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs font-black uppercase text-stone-500">Revenue</p>
                    <Wallet className="size-4 text-emerald-700" />
                  </div>
                  <p className="mt-3 text-3xl font-black tracking-tight text-emerald-950">
                    {formatCurrency(kpis?.totalRevenue ?? 0)}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-stone-600">
                    Completed transactions only.
                  </p>
                </div>

                <div className="rounded-lg border border-emerald-950/10 bg-white p-4 shadow-sm shadow-emerald-950/5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs font-black uppercase text-stone-500">Transactions</p>
                    <BarChart3 className="size-4 text-amber-500" />
                  </div>
                  <p className="mt-3 text-3xl font-black tracking-tight text-emerald-950">
                    {formatCount(kpis?.totalTransactions ?? 0)}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-stone-600">
                    Combined completed and voided records.
                  </p>
                </div>

                <div className="rounded-lg border border-emerald-950/10 bg-white p-4 shadow-sm shadow-emerald-950/5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs font-black uppercase text-stone-500">Status mix</p>
                    <CreditCard className="size-4 text-emerald-700" />
                  </div>
                  <p className="mt-3 text-3xl font-black tracking-tight text-emerald-950">
                    {formatCount(kpis?.completedTransactions ?? 0)} / {formatCount(kpis?.voidedTransactions ?? 0)}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-stone-600">
                    Completed vs voided transactions.
                  </p>
                </div>

                <div className="rounded-lg border border-emerald-950/10 bg-white p-4 shadow-sm shadow-emerald-950/5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs font-black uppercase text-stone-500">Average ticket</p>
                    <Package className="size-4 text-emerald-700" />
                  </div>
                  <p className="mt-3 text-3xl font-black tracking-tight text-emerald-950">
                    {formatCurrency(kpis?.averageTransactionValue ?? 0)}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-stone-600">
                    Average total from completed sales.
                  </p>
                </div>
              </section>

              <section className="mt-5 grid gap-4 xl:grid-cols-[0.95fr_0.95fr_1.1fr]">
                <Card className="rounded-lg">
                  <CardHeader>
                    <CardTitle className="text-lg font-black">Payment breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {summary.paymentBreakdown.length > 0 ? (
                      summary.paymentBreakdown.map((payment) => (
                        <div
                          className="flex items-center justify-between gap-3 rounded-lg border border-emerald-950/10 bg-stone-50 px-4 py-3"
                          key={payment.method}
                        >
                          <div>
                            <p className="text-sm font-black text-emerald-950">{payment.method}</p>
                            <p className="mt-1 text-xs font-bold uppercase text-stone-500">
                              {formatCount(payment.count)} transactions
                            </p>
                          </div>
                          <p className="text-sm font-black text-emerald-700">{formatCurrency(payment.total)}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm font-semibold text-muted-foreground">
                        No completed payment data to summarize yet.
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-lg">
                  <CardHeader>
                    <CardTitle className="text-lg font-black">Status breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {summary.statusBreakdown.map((status) => (
                      <div
                        className="flex items-center justify-between gap-3 rounded-lg border border-emerald-950/10 bg-stone-50 px-4 py-3"
                        key={status.status}
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant={status.status === "voided" ? "secondary" : "default"}>
                            {status.status}
                          </Badge>
                          <p className="text-sm font-bold text-stone-600">
                            {formatCount(status.count)} records
                          </p>
                        </div>
                        <p className="text-sm font-black text-emerald-700">{formatCurrency(status.total)}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="rounded-lg">
                  <CardHeader>
                    <CardTitle className="text-lg font-black">Top products</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {summary.topProducts.length > 0 ? (
                      summary.topProducts.map((product, index) => (
                        <div
                          className="flex items-start justify-between gap-3 rounded-lg border border-emerald-950/10 bg-stone-50 px-4 py-3"
                          key={product.productId}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex size-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-black text-emerald-800">
                                {index + 1}
                              </span>
                              <p className="truncate text-sm font-black text-emerald-950">{product.productName}</p>
                            </div>
                            <p className="mt-2 text-xs font-bold uppercase text-stone-500">
                              {formatCount(product.quantity)} units sold
                            </p>
                          </div>
                          <p className="text-right text-sm font-black text-emerald-700">
                            {formatCurrency(product.revenue)}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm font-semibold text-muted-foreground">
                        No completed product movement available yet.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </section>
            </>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}
