"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  Minus,
  PackageSearch,
  Plus,
  ReceiptText,
  Search,
  ShoppingCart,
  Trash2,
} from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Product,
  Transaction,
  createTransaction,
  listProducts,
} from "@/lib/pos-api";
import { useAuthSession } from "@/lib/use-auth-session";

const PAGE_LIMIT = 24;

type CartItem = {
  product: Product;
  quantity: number;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function getStock(product: Product) {
  return product.stock ?? 0;
}

function getUnit(product: Product) {
  return product.unit ?? "pcs";
}

export function PosClient() {
  const auth = useAuthSession();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paidAmount, setPaidAmount] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<Transaction | null>(null);

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [cart],
  );
  const paidValue = Number(paidAmount || 0);
  const isPaidAmountValid = paidAmount.trim() !== "" && !Number.isNaN(paidValue) && paidValue >= subtotal;
  const canCheckout = Boolean(auth) && cart.length > 0 && subtotal > 0 && isPaidAmountValid && !isSaving;

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await listProducts({
        page: 1,
        limit: PAGE_LIMIT,
        search: submittedSearch || undefined,
        isActive: true,
      });

      setProducts(response.data);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Failed to load products.";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [submittedSearch]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadProducts();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadProducts]);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedSearch(search.trim());
  }

  function addToCart(product: Product) {
    const stock = getStock(product);

    if (stock <= 0) {
      toast.error(`${product.name} is out of stock.`);
      return;
    }

    setCart((current) => {
      const existingItem = current.find((item) => item.product.id === product.id);

      if (!existingItem) {
        return [...current, { product, quantity: 1 }];
      }

      if (existingItem.quantity >= stock) {
        toast.error(`Only ${stock} ${getUnit(product)} available for ${product.name}.`);
        return current;
      }

      return current.map((item) =>
        item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
      );
    });
  }

  function decreaseQuantity(productId: number) {
    setCart((current) =>
      current
        .map((item) =>
          item.product.id === productId ? { ...item, quantity: item.quantity - 1 } : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  function increaseQuantity(productId: number) {
    const item = cart.find((cartItem) => cartItem.product.id === productId);

    if (!item) {
      return;
    }

    addToCart(item.product);
  }

  function removeItem(productId: number) {
    setCart((current) => current.filter((item) => item.product.id !== productId));
  }

  function clearSale() {
    setCart([]);
    setPaidAmount("");
  }

  async function handleCheckout() {
    if (!auth) {
      toast.error("Login is required before checkout.");
      return;
    }

    if (!isPaidAmountValid) {
      toast.error("Paid amount must cover the total.");
      return;
    }

    setIsSaving(true);

    try {
      const transaction = await createTransaction({
        cashierId: auth.user.id,
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
        paidAmount: paidValue,
        paymentMethod: "cash",
      });

      setReceipt(transaction);
      clearSale();
      await loadProducts();
      toast.success(`${transaction.invoiceNumber} completed.`);
    } catch (checkoutError) {
      toast.error(checkoutError instanceof Error ? checkoutError.message : "Checkout failed.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Kasir"
        title="POS"
        description="Layar register kasir untuk search produk aktif, susun cart, terima pembayaran cash, dan membuat transaksi backend."
      />

      <section className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Card className="rounded-lg">
          <CardHeader className="gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg font-black">
                  <PackageSearch className="size-5 text-emerald-700" />
                  Product lookup
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Cari nama, SKU, atau barcode. Produk nonaktif tidak ditampilkan di kasir.
                </p>
              </div>
              <Badge variant="secondary" className="w-fit">
                Active products
              </Badge>
            </div>
            <Separator />
            <form className="flex gap-2" onSubmit={handleSearchSubmit}>
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, SKU, or barcode"
              />
              <Button type="submit" variant="outline" disabled={isLoading}>
                <Search />
                Search
              </Button>
            </form>
          </CardHeader>
          <CardContent>
            {error ? (
              <Alert variant="destructive" className="mb-4">
                <AlertTitle>Products unavailable</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              {isLoading
                ? Array.from({ length: 6 }).map((_, index) => (
                    <Skeleton key={index} className="h-32 rounded-lg" />
                  ))
                : null}

              {!isLoading && products.length === 0 ? (
                <div className="col-span-full rounded-lg border border-dashed bg-stone-50 px-4 py-12 text-center">
                  <p className="font-black text-emerald-950">No active products found.</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Adjust search or ask admin to activate stock items.
                  </p>
                </div>
              ) : null}

              {!isLoading
                ? products.map((product) => {
                    const stock = getStock(product);
                    const isOut = stock <= 0;

                    return (
                      <button
                        type="button"
                        className="rounded-lg border border-emerald-950/10 bg-white p-4 text-left shadow-sm shadow-emerald-950/5 transition hover:border-emerald-600 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-55"
                        key={product.id}
                        onClick={() => addToCart(product)}
                        disabled={isOut}
                      >
                        <span className="flex items-start justify-between gap-3">
                          <span>
                            <span className="block font-black text-emerald-950">{product.name}</span>
                            <span className="mt-1 block text-xs font-semibold text-stone-500">
                              {product.sku || product.barcode || `ID #${product.id}`}
                            </span>
                          </span>
                          <Badge variant={isOut ? "secondary" : "default"}>
                            {isOut ? "Out" : "Ready"}
                          </Badge>
                        </span>
                        <span className="mt-5 flex items-end justify-between gap-3">
                          <span className="text-xl font-black text-emerald-700">
                            {formatCurrency(product.price)}
                          </span>
                          <span className="rounded-md bg-stone-100 px-2 py-1 text-xs font-bold text-stone-600">
                            {stock} {getUnit(product)}
                          </span>
                        </span>
                      </button>
                    );
                  })
                : null}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-lg font-black">
              <ShoppingCart className="size-5 text-emerald-700" />
              Current sale
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {auth ? `Cashier: ${auth.user.email}` : "Login is required to checkout."}
            </p>
          </CardHeader>
          <CardContent className="pt-4">
            {!auth ? (
              <Alert className="mb-4">
                <AlertTitle>Session required</AlertTitle>
                <AlertDescription>Login first so the transaction can record cashier ID.</AlertDescription>
              </Alert>
            ) : null}

            {cart.length === 0 ? (
              <div className="rounded-lg border border-dashed bg-stone-50 px-4 py-10 text-center">
                <p className="text-sm font-black text-emerald-950">Belum ada item.</p>
                <p className="mt-2 text-xs font-semibold text-stone-500">
                  Pilih produk dari lookup untuk mulai transaksi.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    className="rounded-lg border border-emerald-950/10 bg-stone-50 p-3"
                    key={item.product.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-emerald-950">{item.product.name}</p>
                        <p className="mt-1 text-xs font-semibold text-stone-500">
                          {formatCurrency(item.product.price)} / {getUnit(item.product)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remove ${item.product.name}`}
                        onClick={() => removeItem(item.product.id)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          aria-label={`Decrease ${item.product.name}`}
                          onClick={() => decreaseQuantity(item.product.id)}
                        >
                          <Minus />
                        </Button>
                        <span className="w-10 text-center text-sm font-black">{item.quantity}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          aria-label={`Increase ${item.product.name}`}
                          onClick={() => increaseQuantity(item.product.id)}
                          disabled={item.quantity >= getStock(item.product)}
                        >
                          <Plus />
                        </Button>
                      </div>
                      <p className="font-black text-emerald-700">
                        {formatCurrency(item.product.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Separator className="my-4" />

            <div className="space-y-2 text-sm font-bold">
              <div className="flex items-center justify-between text-stone-600">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-stone-600">
                <span>Payment</span>
                <span>Cash</span>
              </div>
              <div className="flex items-center justify-between border-t pt-3 text-2xl font-black text-emerald-950">
                <span>Total</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
            </div>

            <div className="mt-4 grid gap-2">
              <Label htmlFor="paid-amount">Paid amount</Label>
              <div className="relative">
                <Banknote className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-500" />
                <Input
                  id="paid-amount"
                  type="number"
                  min="0"
                  value={paidAmount}
                  onChange={(event) => setPaidAmount(event.target.value)}
                  className="pl-9"
                  placeholder="50000"
                />
              </div>
              {paidAmount.trim() !== "" && !Number.isNaN(paidValue) ? (
                <p className="text-xs font-bold text-stone-500">
                  Change estimate: {formatCurrency(Math.max(0, paidValue - subtotal))}
                </p>
              ) : null}
            </div>

            <div className="mt-5 grid grid-cols-[1fr_auto] gap-2">
              <Button type="button" size="lg" disabled={!canCheckout} onClick={() => void handleCheckout()}>
                <ReceiptText />
                {isSaving ? "Processing..." : "Checkout"}
              </Button>
              <Button type="button" variant="outline" size="lg" disabled={cart.length === 0 || isSaving} onClick={clearSale}>
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <Dialog open={Boolean(receipt)} onOpenChange={(open) => !open && setReceipt(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Receipt {receipt?.invoiceNumber}</DialogTitle>
            <DialogDescription>
              Cash sale completed. Backend totals are shown as the final source of truth.
            </DialogDescription>
          </DialogHeader>
          {receipt ? (
            <div className="space-y-4">
              <div className="rounded-lg border bg-stone-50 p-4">
                <div className="flex items-center justify-between gap-4 text-sm font-bold">
                  <span>Status</span>
                  <Badge>{receipt.status}</Badge>
                </div>
                <Separator className="my-3" />
                <div className="space-y-2 text-sm">
                  {receipt.items?.map((item) => (
                    <div className="flex items-center justify-between gap-3" key={item.id}>
                      <span className="font-bold">
                        {item.productName} x {item.quantity}
                      </span>
                      <span>{formatCurrency(item.subtotal)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2 text-sm font-bold">
                <div className="flex items-center justify-between text-stone-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(receipt.subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-stone-600">
                  <span>Paid</span>
                  <span>{formatCurrency(receipt.paidAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-stone-600">
                  <span>Change</span>
                  <span>{formatCurrency(receipt.changeAmount)}</span>
                </div>
                <div className="flex items-center justify-between border-t pt-3 text-xl font-black text-emerald-950">
                  <span>Total</span>
                  <span>{formatCurrency(receipt.total)}</span>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
