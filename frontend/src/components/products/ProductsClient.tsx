"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { MoreHorizontal, Plus, Search } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Category,
  Product,
  ProductPayload,
  createProduct,
  deleteProduct,
  listCategories,
  listProducts,
  updateProduct,
} from "@/lib/pos-api";
import { useAuthSession } from "@/lib/use-auth-session";

const ALL_FILTER = "__all__";
const NONE_CATEGORY = "__none__";
const PAGE_LIMIT = 10;

type ProductFormState = {
  name: string;
  price: string;
  sku: string;
  barcode: string;
  category: string;
  stock: string;
  unit: string;
  isActive: "true" | "false";
};

const emptyForm: ProductFormState = {
  name: "",
  price: "",
  sku: "",
  barcode: "",
  category: NONE_CATEGORY,
  stock: "0",
  unit: "pcs",
  isActive: "true",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function productToForm(product: Product): ProductFormState {
  return {
    name: product.name,
    price: String(product.price),
    sku: product.sku ?? "",
    barcode: product.barcode ?? "",
    category: product.category?.name ?? NONE_CATEGORY,
    stock: String(product.stock ?? 0),
    unit: product.unit ?? "pcs",
    isActive: product.isActive === false ? "false" : "true",
  };
}

function buildProductPayload(form: ProductFormState): ProductPayload {
  return {
    name: form.name.trim(),
    price: Number(form.price),
    sku: form.sku.trim() || null,
    barcode: form.barcode.trim() || null,
    category: form.category === NONE_CATEGORY ? null : form.category,
    stock: Number(form.stock),
    unit: form.unit.trim() || "pcs",
    isActive: form.isActive === "true",
  };
}

export function ProductsClient() {
  const auth = useAuthSession();
  const isAdmin = auth?.user.role === "admin";
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(ALL_FILTER);
  const [statusFilter, setStatusFilter] = useState(ALL_FILTER);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  const categoryOptions = useMemo(() => {
    const names = new Set(categories.map((category) => category.name));

    products.forEach((product) => {
      if (product.category?.name) {
        names.add(product.category.name);
      }
    });

    return Array.from(names).sort((first, second) => first.localeCompare(second));
  }, [categories, products]);

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await listProducts({
        page,
        limit: PAGE_LIMIT,
        search: submittedSearch || undefined,
        categoryId: categoryFilter === ALL_FILTER ? undefined : Number(categoryFilter),
        isActive: statusFilter === ALL_FILTER ? undefined : statusFilter === "true",
      });

      setProducts(response.data);
      setTotalPages(response.pagination.totalPages || 1);
      setTotalProducts(response.pagination.total);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Failed to load products.";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [categoryFilter, page, statusFilter, submittedSearch]);

  const loadCategories = useCallback(async () => {
    try {
      const response = await listCategories({ page: 1, limit: 100 });
      setCategories(response.data);
    } catch {
      toast.warning("Categories could not be loaded. Product forms still work with typed category values.");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCategories();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadCategories]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadProducts();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadProducts]);

  function openCreateDialog() {
    setEditingProduct(null);
    setForm(emptyForm);
    setIsDialogOpen(true);
  }

  function openEditDialog(product: Product) {
    setEditingProduct(product);
    setForm(productToForm(product));
    setIsDialogOpen(true);
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSubmittedSearch(search.trim());
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim()) {
      toast.error("Product name is required.");
      return;
    }

    if (Number.isNaN(Number(form.price)) || Number(form.price) < 0) {
      toast.error("Price must be a non-negative number.");
      return;
    }

    if (!Number.isInteger(Number(form.stock)) || Number(form.stock) < 0) {
      toast.error("Stock must be a non-negative integer.");
      return;
    }

    setIsSaving(true);

    try {
      const payload = buildProductPayload(form);

      if (editingProduct) {
        await updateProduct(editingProduct.id, payload);
        toast.success("Product updated.");
      } else {
        await createProduct(payload);
        toast.success("Product created.");
      }

      setIsDialogOpen(false);
      await Promise.all([loadProducts(), loadCategories()]);
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Product could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(product: Product) {
    if (!window.confirm(`Delete ${product.name}? This cannot be undone.`)) {
      return;
    }

    try {
      await deleteProduct(product.id);
      toast.success("Product deleted.");
      await loadProducts();
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "Product could not be deleted.");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={isAdmin ? "Admin Inventory" : "Kasir Lookup"}
        title="Products"
        description={
          isAdmin
            ? "Kelola katalog produk swalayan dengan search, kategori, stok, dan status jual."
            : "Cari produk, barcode, SKU, harga, dan stok tanpa akses edit admin."
        }
      />

      <Card className="mt-5 rounded-lg">
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-lg font-black">Product catalog</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {totalProducts} product records available from backend.
              </p>
            </div>
            {isAdmin ? (
              <Button type="button" onClick={openCreateDialog}>
                <Plus />
                Add Product
              </Button>
            ) : null}
          </div>
          <Separator />
          <div className="grid gap-3 lg:grid-cols-[1fr_180px_160px]">
            <form className="flex gap-2" onSubmit={handleSearchSubmit}>
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, SKU, or barcode"
              />
              <Button type="submit" variant="outline">
                <Search />
                Search
              </Button>
            </form>
            <Select
              value={categoryFilter}
              onValueChange={(value) => {
                setPage(1);
                setCategoryFilter(value);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FILTER}>All categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={String(category.id)}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setPage(1);
                setStatusFilter(value);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FILTER}>All status</SelectItem>
                <SelectItem value="true">Active only</SelectItem>
                <SelectItem value="false">Inactive only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Products unavailable</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU / Barcode</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin ? <TableHead className="w-12" /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell colSpan={isAdmin ? 7 : 6}>
                          <Skeleton className="h-8 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  : null}

                {!isLoading && products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 7 : 6} className="h-28 text-center">
                      <div className="font-bold">No products found.</div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {isAdmin
                          ? "Create the first product or adjust your filters."
                          : "Ask admin to add products or adjust your search."}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : null}

                {!isLoading
                  ? products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="font-bold">{product.name}</div>
                          <div className="text-xs text-muted-foreground">ID #{product.id}</div>
                        </TableCell>
                        <TableCell>
                          <div>{product.sku || "-"}</div>
                          <div className="text-xs text-muted-foreground">{product.barcode || "No barcode"}</div>
                        </TableCell>
                        <TableCell>{product.category?.name ?? "Uncategorized"}</TableCell>
                        <TableCell className="text-right font-bold">
                          {formatCurrency(product.price)}
                        </TableCell>
                        <TableCell className="text-right">
                          {product.stock ?? 0} {product.unit ?? "pcs"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={product.isActive === false ? "secondary" : "default"}>
                            {product.isActive === false ? "Inactive" : "Active"}
                          </Badge>
                        </TableCell>
                        {isAdmin ? (
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${product.name}`}>
                                  <MoreHorizontal />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditDialog(product)}>
                                  Edit product
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => void handleDelete(product)}
                                >
                                  Delete product
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    ))
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Edit product" : "Add product"}</DialogTitle>
            <DialogDescription>
              Core POS fields only. Cost price, description, and image URL are deferred for a later pass.
            </DialogDescription>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="product-name">Name</Label>
                <Input
                  id="product-name"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Beras premium 5kg"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="product-price">Price</Label>
                <Input
                  id="product-price"
                  type="number"
                  min="0"
                  value={form.price}
                  onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
                  placeholder="75000"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="product-sku">SKU</Label>
                <Input
                  id="product-sku"
                  value={form.sku}
                  onChange={(event) => setForm((current) => ({ ...current, sku: event.target.value }))}
                  placeholder="BR-5000"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="product-barcode">Barcode</Label>
                <Input
                  id="product-barcode"
                  value={form.barcode}
                  onChange={(event) => setForm((current) => ({ ...current, barcode: event.target.value }))}
                  placeholder="8990000000000"
                />
              </div>
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(value) => setForm((current) => ({ ...current, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_CATEGORY}>No category</SelectItem>
                    {categoryOptions.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="product-stock">Stock</Label>
                <Input
                  id="product-stock"
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={(event) => setForm((current) => ({ ...current, stock: event.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="product-unit">Unit</Label>
                <Input
                  id="product-unit"
                  value={form.unit}
                  onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value }))}
                  placeholder="pcs"
                />
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select
                  value={form.isActive}
                  onValueChange={(value: "true" | "false") =>
                    setForm((current) => ({ ...current, isActive: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                {isSaving ? "Saving..." : editingProduct ? "Save changes" : "Create product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
