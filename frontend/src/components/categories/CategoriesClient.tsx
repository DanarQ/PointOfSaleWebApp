"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell/PageHeader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from "@/lib/pos-api";

const PAGE_LIMIT = 10;

export function CategoriesClient() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCategories, setTotalCategories] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await listCategories({ page, limit: PAGE_LIMIT });
      setCategories(response.data);
      setTotalPages(response.pagination.totalPages || 1);
      setTotalCategories(response.pagination.total);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Failed to load categories.";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCategories();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadCategories]);

  function openCreateDialog() {
    setEditingCategory(null);
    setCategoryName("");
    setIsDialogOpen(true);
  }

  function openEditDialog(category: Category) {
    setEditingCategory(category);
    setCategoryName(category.name);
    setIsDialogOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = categoryName.trim();

    if (!name) {
      toast.error("Category name is required.");
      return;
    }

    setIsSaving(true);

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, { name });
        toast.success("Category updated.");
      } else {
        await createCategory({ name });
        toast.success("Category created.");
      }

      setIsDialogOpen(false);
      await loadCategories();
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Category could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(category: Category) {
    if (!window.confirm(`Delete category ${category.name}?`)) {
      return;
    }

    try {
      await deleteCategory(category.id);
      toast.success("Category deleted.");
      await loadCategories();
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "Category could not be deleted.");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Admin Taxonomy"
        title="Categories"
        description="Kelola kategori produk dengan slug otomatis supaya data seperti Mie dan mie tetap konsisten di backend."
      />

      <Card className="mt-5 rounded-lg">
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg font-black">Category controls</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {totalCategories} category records available from backend.
              </p>
            </div>
            <Button type="button" onClick={openCreateDialog}>
              <Plus />
              Add Category
            </Button>
          </div>
          <Separator />
        </CardHeader>
        <CardContent>
          {error ? (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Categories unavailable</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead className="text-right">ID</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell colSpan={4}>
                          <Skeleton className="h-8 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  : null}

                {!isLoading && categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-28 text-center">
                      <div className="font-bold">No categories yet.</div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Create categories before adding a larger product catalog.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : null}

                {!isLoading
                  ? categories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell className="font-bold">{category.name}</TableCell>
                        <TableCell className="text-muted-foreground">{category.slug}</TableCell>
                        <TableCell className="text-right">{category.id}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${category.name}`}>
                                <MoreHorizontal />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(category)}>
                                Edit category
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => void handleDelete(category)}
                              >
                                Delete category
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit category" : "Add category"}</DialogTitle>
            <DialogDescription>
              Backend will normalize the slug so duplicate names with different casing collapse safely.
            </DialogDescription>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="category-name">Name</Label>
              <Input
                id="category-name"
                value={categoryName}
                onChange={(event) => setCategoryName(event.target.value)}
                placeholder="Makanan Instan"
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
                {isSaving ? "Saving..." : editingCategory ? "Save changes" : "Create category"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
