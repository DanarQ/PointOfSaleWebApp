"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Boxes, Minus, Plus, RefreshCcw, Search, TriangleAlert, Warehouse } from "lucide-react";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Product,
  StockMovement,
  StockMovementPayload,
  createStockMovement,
  getSettings,
  listProducts,
  listStockMovements,
} from "@/lib/pos-api";
import { useAuthSession } from "@/lib/use-auth-session";

const ALL_FILTER = "__all__";
const PRODUCT_PAGE_LIMIT = 100;
const MOVEMENT_PAGE_LIMIT = 10;
const DEFAULT_LOW_STOCK_THRESHOLD = 5;

type AdjustmentFormState = {
  productId: string;
  type: "in" | "out";
  quantity: string;
  notes: string;
};

const emptyAdjustmentForm: AdjustmentFormState = {
  productId: "",
  type: "in",
  quantity: "1",
  notes: "",
};

function formatCount(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

function formatDate(value?: string) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getProductStock(product: Product) {
  return product.stock ?? 0;
}

function getProductUnit(product: Product) {
  return product.unit ?? "pcs";
}

function getMovementProductName(movement: StockMovement, productsById: Map<number, Product>) {
  return movement.product?.name ?? productsById.get(movement.productId)?.name ?? `Product #${movement.productId}`;
}

function getMovementUnit(movement: StockMovement, productsById: Map<number, Product>) {
  return movement.product?.unit ?? productsById.get(movement.productId)?.unit ?? "pcs";
}

function getMovementBadgeVariant(type: string) {
  if (type === "out" || type === "sale") {
    return "destructive" as const;
  }

  if (type === "void") {
    return "secondary" as const;
  }

  return "default" as const;
}

async function fetchAllProducts() {
  const firstPage = await listProducts({ page: 1, limit: PRODUCT_PAGE_LIMIT });
  const totalPages = firstPage.pagination.totalPages || 1;

  if (totalPages === 1) {
    return firstPage.data;
  }

  const remainingPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      listProducts({ page: index + 2, limit: PRODUCT_PAGE_LIMIT }),
    ),
  );

  return firstPage.data.concat(remainingPages.flatMap((page) => page.data));
}

export function StockClient() {
  const auth = useAuthSession();
  const isAdmin = auth?.user.role === "admin";
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [lowStockThreshold, setLowStockThreshold] = useState(DEFAULT_LOW_STOCK_THRESHOLD);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalMovements, setTotalMovements] = useState(0);
  const [productFilter, setProductFilter] = useState(ALL_FILTER);
  const [typeFilter, setTypeFilter] = useState(ALL_FILTER);
  const [isLoading, setIsLoading] = useState(true);
  const [isMovementsLoading, setIsMovementsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState<AdjustmentFormState>(emptyAdjustmentForm);
  const [isSaving, setIsSaving] = useState(false);

  const productsById = useMemo(() => {
    return new Map(products.map((product) => [product.id, product]));
  }, [products]);

  const activeProducts = useMemo(() => {
    return products
      .filter((product) => product.isActive !== false)
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [products]);

  const summary = useMemo(() => {
    const trackedProducts = products.filter((product) => product.isActive !== false);
    const outOfStock = trackedProducts.filter((product) => getProductStock(product) <= 0);
    const lowStock = trackedProducts.filter((product) => {
      const stock = getProductStock(product);
      return stock > 0 && stock <= lowStockThreshold;
    });
    const totalUnits = trackedProducts.reduce((sum, product) => sum + getProductStock(product), 0);

    return {
      trackedProducts: trackedProducts.length,
      totalUnits,
      lowStock,
      outOfStock,
      attentionProducts: outOfStock.concat(lowStock)
        .sort((left, right) => getProductStock(left) - getProductStock(right))
        .slice(0, 8),
    };
  }, [lowStockThreshold, products]);

  const loadInventory = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const [productData, settings] = await Promise.all([
        fetchAllProducts(),
        getSettings().catch(() => null),
      ]);

      setProducts(productData);
      setLowStockThreshold(settings?.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Failed to load stock inventory.";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadMovements = useCallback(async () => {
    setIsMovementsLoading(true);
    setError("");

    try {
      const response = await listStockMovements({
        page,
        limit: MOVEMENT_PAGE_LIMIT,
        productId: productFilter === ALL_FILTER ? undefined : Number(productFilter),
        type: typeFilter === ALL_FILTER ? undefined : typeFilter,
      });

      setMovements(response.data);
      setTotalPages(response.pagination.totalPages || 1);
      setTotalMovements(response.pagination.total);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Failed to load stock movements.";
      setError(message);
      toast.error(message);
    } finally {
      setIsMovementsLoading(false);
    }
  }, [page, productFilter, typeFilter]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadInventory(), loadMovements()]);
  }, [loadInventory, loadMovements]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadInventory();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadInventory]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadMovements();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadMovements]);

  function openAdjustmentDialog(product?: Product, type: "in" | "out" = "in") {
    setForm({
      ...emptyAdjustmentForm,
      productId: product ? String(product.id) : "",
      type,
    });
    setIsDialogOpen(true);
  }

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    void loadMovements();
  }

  async function handleAdjustmentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const productId = Number(form.productId);
    const quantity = Number(form.quantity);

    if (!Number.isInteger(productId) || productId <= 0) {
      toast.error("Select a product first.");
      return;
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      toast.error("Quantity must be a positive integer.");
      return;
    }

    const payload: StockMovementPayload = {
      productId,
      type: form.type,
      quantity,
      referenceType: "adjustment",
      notes: form.notes.trim() || null,
    };

    setIsSaving(true);

    try {
      await createStockMovement(payload);
      toast.success(form.type === "in" ? "Stock added." : "Stock reduced.");
      setIsDialogOpen(false);
      await refreshAll();
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Stock adjustment could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={isAdmin ? "Admin Inventory" : "Inventory Lookup"}
        title="Stock"
        description="Pantau stok produk, audit pergerakan inventory, dan lakukan koreksi manual yang tercatat."
        action={isAdmin ? "Adjust Stock" : undefined}
        onAction={isAdmin ? () => openAdjustmentDialog() : undefined}
      />

      {error ? (
        <Alert variant="destructive" className="mt-5">
          <AlertTitle>Stock module unavailable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <section className="mt-5 grid gap-3 xl:grid-cols-4">
        <Card className="rounded-lg">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-black uppercase text-stone-500">Tracked products</p>
              <Boxes className="size-4 text-emerald-700" />
            </div>
            {isLoading ? <Skeleton className="mt-4 h-9 w-24" /> : (
              <p className="mt-3 text-3xl font-black text-emerald-950">{formatCount(summary.trackedProducts)}</p>
            )}
            <p className="mt-2 text-sm font-semibold text-stone-600">Active products in inventory.</p>
          </CardContent>
        </Card>
        <Card className="rounded-lg">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-black uppercase text-stone-500">Total units</p>
              <Warehouse className="size-4 text-emerald-700" />
            </div>
            {isLoading ? <Skeleton className="mt-4 h-9 w-28" /> : (
              <p className="mt-3 text-3xl font-black text-emerald-950">{formatCount(summary.totalUnits)}</p>
            )}
            <p className="mt-2 text-sm font-semibold text-stone-600">Combined stock count.</p>
          </CardContent>
        </Card>
        <Card className="rounded-lg">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-black uppercase text-stone-500">Low stock</p>
              <TriangleAlert className="size-4 text-amber-500" />
            </div>
            {isLoading ? <Skeleton className="mt-4 h-9 w-20" /> : (
              <p className="mt-3 text-3xl font-black text-emerald-950">{formatCount(summary.lowStock.length)}</p>
            )}
            <p className="mt-2 text-sm font-semibold text-stone-600">
              Threshold: {formatCount(lowStockThreshold)} unit.
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-lg">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-black uppercase text-stone-500">Out of stock</p>
              <Minus className="size-4 text-destructive" />
            </div>
            {isLoading ? <Skeleton className="mt-4 h-9 w-20" /> : (
              <p className="mt-3 text-3xl font-black text-emerald-950">{formatCount(summary.outOfStock.length)}</p>
            )}
            <p className="mt-2 text-sm font-semibold text-stone-600">Needs immediate action.</p>
          </CardContent>
        </Card>
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-black">
              <TriangleAlert className="size-5 text-amber-500" />
              Stock attention
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Products at or below the configured low-stock threshold.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <Skeleton className="h-16 w-full" key={index} />
              ))
            ) : null}
            {!isLoading && summary.attentionProducts.length === 0 ? (
              <div className="rounded-lg border border-dashed border-emerald-950/15 bg-stone-50 px-4 py-10 text-center">
                <p className="font-black text-emerald-950">Stock levels look healthy.</p>
                <p className="mt-2 text-sm text-muted-foreground">No active product is below the threshold.</p>
              </div>
            ) : null}
            {!isLoading
              ? summary.attentionProducts.map((product) => {
                  const stock = getProductStock(product);
                  const isOut = stock <= 0;

                  return (
                    <div
                      className="flex items-center justify-between gap-3 rounded-lg border border-emerald-950/10 bg-stone-50 px-4 py-3"
                      key={product.id}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-black text-emerald-950">{product.name}</p>
                          <Badge variant={isOut ? "destructive" : "secondary"}>
                            {isOut ? "Out" : "Low"}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs font-bold uppercase text-stone-500">
                          {product.sku || product.barcode || `ID #${product.id}`}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <p className="text-right text-sm font-black text-emerald-950">
                          {formatCount(stock)} {getProductUnit(product)}
                        </p>
                        {isAdmin ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => openAdjustmentDialog(product, "in")}
                          >
                            <Plus />
                            Add
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              : null}
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader className="gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg font-black">
                  <Warehouse className="size-5 text-emerald-700" />
                  Stock movement audit
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatCount(totalMovements)} movement records from backend.
                </p>
              </div>
              <Button type="button" variant="outline" onClick={() => void refreshAll()} disabled={isLoading || isMovementsLoading}>
                <RefreshCcw />
                Refresh
              </Button>
            </div>
            <Separator />
            <form className="grid gap-3 lg:grid-cols-[1fr_150px_auto]" onSubmit={handleFilterSubmit}>
              <Select
                value={productFilter}
                onValueChange={(value) => {
                  setPage(1);
                  setProductFilter(value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Product" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER}>All products</SelectItem>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={String(product.id)}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={typeFilter}
                onValueChange={(value) => {
                  setPage(1);
                  setTypeFilter(value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER}>All types</SelectItem>
                  <SelectItem value="in">In</SelectItem>
                  <SelectItem value="out">Out</SelectItem>
                  <SelectItem value="sale">Sale</SelectItem>
                  <SelectItem value="void">Void</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" variant="outline">
                <Search />
                Filter
              </Button>
            </form>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Before / After</TableHead>
                    <TableHead>Operator</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isMovementsLoading
                    ? Array.from({ length: 5 }).map((_, index) => (
                        <TableRow key={index}>
                          <TableCell colSpan={6}>
                            <Skeleton className="h-8 w-full" />
                          </TableCell>
                        </TableRow>
                      ))
                    : null}
                  {!isMovementsLoading && movements.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-28 text-center">
                        <div className="font-bold">No movements found.</div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Adjust filters or create a stock adjustment.
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {!isMovementsLoading
                    ? movements.map((movement) => {
                        const unit = getMovementUnit(movement, productsById);

                        return (
                          <TableRow key={movement.id}>
                            <TableCell>
                              <div className="font-bold">{getMovementProductName(movement, productsById)}</div>
                              <div className="text-xs text-muted-foreground">Movement #{movement.id}</div>
                              {movement.notes ? (
                                <div className="mt-1 max-w-52 truncate text-xs text-stone-500">{movement.notes}</div>
                              ) : null}
                            </TableCell>
                            <TableCell>
                              <Badge variant={getMovementBadgeVariant(movement.type)}>{movement.type}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-bold">
                              {formatCount(movement.quantity)} {unit}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCount(movement.stockBefore)} / {formatCount(movement.stockAfter)}
                            </TableCell>
                            <TableCell>{movement.user?.email ?? "-"}</TableCell>
                            <TableCell>{formatDate(movement.createdAt)}</TableCell>
                          </TableRow>
                        );
                      })
                    : null}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={page <= 1 || isMovementsLoading}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={page >= totalPages || isMovementsLoading}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Adjust stock</DialogTitle>
            <DialogDescription>
              Manual adjustment is admin-only and will create an audit movement.
            </DialogDescription>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={handleAdjustmentSubmit}>
            <div className="grid gap-2">
              <Label>Product</Label>
              <Select
                value={form.productId}
                onValueChange={(value) => setForm((current) => ({ ...current, productId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {activeProducts.map((product) => (
                    <SelectItem key={product.id} value={String(product.id)}>
                      {product.name} - {formatCount(getProductStock(product))} {getProductUnit(product)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Movement</Label>
                <Select
                  value={form.type}
                  onValueChange={(value: "in" | "out") => setForm((current) => ({ ...current, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">Tambah stok</SelectItem>
                    <SelectItem value="out">Kurangi stok</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="stock-quantity">Quantity</Label>
                <Input
                  id="stock-quantity"
                  type="number"
                  min="1"
                  value={form.quantity}
                  onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="stock-notes">Notes</Label>
              <Input
                id="stock-notes"
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Restock supplier, koreksi shrinkage, atau catatan opname"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : form.type === "in" ? "Add Stock" : "Reduce Stock"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
