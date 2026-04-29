"use client";

import { useCallback, useEffect, useState } from "react";
import { CreditCard, ReceiptText, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell/PageHeader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Transaction, listTransactions } from "@/lib/pos-api";

const PAGE_LIMIT = 20;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function getItemCount(transaction: Transaction) {
  return transaction.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
}

export function TransactionsClient() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTransactions = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await listTransactions({ page, limit: PAGE_LIMIT });
      setTransactions(response.data);
      setTotalPages(response.pagination.totalPages || 1);
      setTotalTransactions(response.pagination.total);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Failed to load transactions.";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadTransactions();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadTransactions]);

  return (
    <>
      <PageHeader
        eyebrow="Operasional"
        title="Transactions"
        description="Riwayat transaksi backend untuk pengecekan invoice, status pembayaran, dan total shift kasir."
      />

      <Card className="mt-5 rounded-lg">
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg font-black">
                <ReceiptText className="size-5 text-emerald-700" />
                Transaction history
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {totalTransactions} completed or voided transaction records from backend.
              </p>
            </div>
            <Button type="button" variant="outline" onClick={() => void loadTransactions()} disabled={isLoading}>
              <RotateCcw />
              Refresh
            </Button>
          </div>
          <Separator />
        </CardHeader>
        <CardContent>
          {error ? (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Transactions unavailable</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="overflow-hidden rounded-lg border">
            <div className="grid grid-cols-[1fr_auto] gap-4 border-b bg-stone-50 px-4 py-3 text-xs font-black uppercase text-stone-500 md:grid-cols-[1fr_140px_140px_140px]">
              <span>Invoice</span>
              <span className="hidden md:block">Items</span>
              <span className="hidden md:block">Payment</span>
              <span className="text-right">Total</span>
            </div>

            {isLoading
              ? Array.from({ length: 5 }).map((_, index) => (
                  <div className="border-b p-4 last:border-b-0" key={index}>
                    <Skeleton className="h-12 w-full" />
                  </div>
                ))
              : null}

            {!isLoading && transactions.length === 0 ? (
              <div className="px-4 py-16 text-center">
                <p className="font-black text-emerald-950">No transactions found.</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Checkout from the POS page to create the first invoice.
                </p>
              </div>
            ) : null}

            {!isLoading
              ? transactions.map((transaction) => (
                  <div
                    className="grid gap-4 border-b p-4 last:border-b-0 hover:bg-emerald-50/50 md:grid-cols-[1fr_140px_140px_140px] md:items-center"
                    key={transaction.id}
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-black text-emerald-950">{transaction.invoiceNumber}</p>
                        <Badge variant={transaction.status === "voided" ? "secondary" : "default"}>
                          {transaction.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-stone-500">
                        Cashier ID {transaction.cashierId ?? "-"} - Paid {formatCurrency(transaction.paidAmount)}
                      </p>
                    </div>
                    <div className="text-sm font-bold text-stone-600">
                      {getItemCount(transaction)} items
                    </div>
                    <div className="flex items-center gap-2 text-sm font-bold text-stone-600">
                      <CreditCard className="size-4 text-emerald-700" />
                      {transaction.paymentMethod}
                    </div>
                    <div className="text-right">
                      <p className="font-black text-emerald-700">{formatCurrency(transaction.total)}</p>
                      <p className="mt-1 text-xs font-bold text-stone-500">
                        Change {formatCurrency(transaction.changeAmount)}
                      </p>
                    </div>
                  </div>
                ))
              : null}
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={page <= 1 || isLoading}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={page >= totalPages || isLoading}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
