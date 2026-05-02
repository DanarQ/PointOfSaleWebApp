"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Building2, ReceiptText, RotateCcw, Save, Settings2, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell/PageHeader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  StoreSettings,
  StoreSettingsPayload,
  getSettings,
  updateSettings,
} from "@/lib/pos-api";

type SettingsFormState = {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  receiptFooter: string;
  taxPercent: string;
  currency: string;
  lowStockThreshold: string;
};

const emptyForm: SettingsFormState = {
  storeName: "",
  storeAddress: "",
  storePhone: "",
  receiptFooter: "",
  taxPercent: "0",
  currency: "IDR",
  lowStockThreshold: "5",
};

function settingsToForm(settings: StoreSettings): SettingsFormState {
  return {
    storeName: settings.storeName,
    storeAddress: settings.storeAddress ?? "",
    storePhone: settings.storePhone ?? "",
    receiptFooter: settings.receiptFooter ?? "",
    taxPercent: String(settings.taxPercent),
    currency: settings.currency,
    lowStockThreshold: String(settings.lowStockThreshold),
  };
}

function buildPayload(form: SettingsFormState): StoreSettingsPayload {
  return {
    storeName: form.storeName.trim(),
    storeAddress: form.storeAddress.trim() || null,
    storePhone: form.storePhone.trim() || null,
    receiptFooter: form.receiptFooter.trim() || null,
    taxPercent: Number(form.taxPercent),
    currency: form.currency.trim().toUpperCase(),
    lowStockThreshold: Number(form.lowStockThreshold),
  };
}

function formatPercent(value: string) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? `${numericValue}%` : "0%";
}

export function SettingsClient() {
  const [form, setForm] = useState<SettingsFormState>(emptyForm);
  const [lastSavedSettings, setLastSavedSettings] = useState<StoreSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const settings = await getSettings();
      setLastSavedSettings(settings);
      setForm(settingsToForm(settings));
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Failed to load settings.";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSettings();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadSettings]);

  function resetForm() {
    if (lastSavedSettings) {
      setForm(settingsToForm(lastSavedSettings));
      toast.info("Settings form reset to last saved values.");
      return;
    }

    setForm(emptyForm);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.storeName.trim()) {
      toast.error("Store name is required.");
      return;
    }

    if (!Number.isFinite(Number(form.taxPercent)) || Number(form.taxPercent) < 0 || Number(form.taxPercent) > 100) {
      toast.error("Tax percent must be between 0 and 100.");
      return;
    }

    if (!Number.isInteger(Number(form.lowStockThreshold)) || Number(form.lowStockThreshold) < 0) {
      toast.error("Low stock threshold must be a non-negative integer.");
      return;
    }

    if (!/^[A-Za-z]{3}$/.test(form.currency.trim())) {
      toast.error("Currency must be a 3-letter code.");
      return;
    }

    setIsSaving(true);

    try {
      const settings = await updateSettings(buildPayload(form));
      setLastSavedSettings(settings);
      setForm(settingsToForm(settings));
      toast.success("Settings saved.");
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Settings could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Admin Settings"
        title="Settings"
        description="Kelola identitas toko, preferensi struk, dan default operasional POS tanpa mengubah kalkulasi checkout v1."
      />

      {error ? (
        <Alert variant="destructive" className="mt-5">
          <AlertTitle>Settings unavailable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <form className="mt-5 grid gap-5 xl:grid-cols-[1fr_360px]" onSubmit={handleSubmit}>
        <div className="grid gap-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="size-5 text-emerald-700" />
                Store identity
              </CardTitle>
              <CardDescription>Data ini dipakai untuk profil toko dan preview struk.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton className="h-11 w-full" key={index} />
                ))
              ) : (
                <>
                  <div className="grid gap-2 md:col-span-2">
                    <Label htmlFor="store-name">Store name</Label>
                    <Input
                      id="store-name"
                      value={form.storeName}
                      onChange={(event) => setForm((current) => ({ ...current, storeName: event.target.value }))}
                      placeholder="POS Swalayan"
                    />
                  </div>
                  <div className="grid gap-2 md:col-span-2">
                    <Label htmlFor="store-address">Store address</Label>
                    <textarea
                      id="store-address"
                      value={form.storeAddress}
                      onChange={(event) => setForm((current) => ({ ...current, storeAddress: event.target.value }))}
                      placeholder="Jl. Pasar No. 8"
                      className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm font-semibold shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="store-phone">Store phone</Label>
                    <Input
                      id="store-phone"
                      value={form.storePhone}
                      onChange={(event) => setForm((current) => ({ ...current, storePhone: event.target.value }))}
                      placeholder="021-555-0199"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Input
                      id="currency"
                      value={form.currency}
                      maxLength={3}
                      onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value }))}
                      placeholder="IDR"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ReceiptText className="size-5 text-emerald-700" />
                Receipt footer
              </CardTitle>
              <CardDescription>Pesan bawah struk untuk informasi kasir dan pelanggan.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-28 w-full" />
              ) : (
                <div className="grid gap-2">
                  <Label htmlFor="receipt-footer">Footer message</Label>
                  <textarea
                    id="receipt-footer"
                    value={form.receiptFooter}
                    onChange={(event) => setForm((current) => ({ ...current, receiptFooter: event.target.value }))}
                    placeholder="Terima kasih sudah berbelanja."
                    className="min-h-28 rounded-md border border-input bg-background px-3 py-2 text-sm font-semibold shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SlidersHorizontal className="size-5 text-emerald-700" />
                Operational defaults
              </CardTitle>
              <CardDescription>Disimpan sebagai konfigurasi; tax belum mengubah checkout otomatis di v1.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {isLoading ? (
                <>
                  <Skeleton className="h-11 w-full" />
                  <Skeleton className="h-11 w-full" />
                </>
              ) : (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="tax-percent">Tax percent</Label>
                    <Input
                      id="tax-percent"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={form.taxPercent}
                      onChange={(event) => setForm((current) => ({ ...current, taxPercent: event.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="low-stock-threshold">Low stock threshold</Label>
                    <Input
                      id="low-stock-threshold"
                      type="number"
                      min="0"
                      step="1"
                      value={form.lowStockThreshold}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, lowStockThreshold: event.target.value }))
                      }
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="grid content-start gap-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="size-5 text-emerald-700" />
                Receipt preview
              </CardTitle>
              <CardDescription>Preview tampilan data toko untuk struk kasir.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-dashed border-emerald-900/25 bg-stone-50 p-4 font-mono text-xs text-stone-700">
                <div className="text-center">
                  <p className="text-sm font-black text-emerald-950">{form.storeName || "POS Swalayan"}</p>
                  <p className="mt-1 whitespace-pre-line">{form.storeAddress || "Alamat toko belum diisi"}</p>
                  <p className="mt-1">{form.storePhone || "Telepon belum diisi"}</p>
                </div>
                <Separator className="my-4" />
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Currency</span>
                    <span>{form.currency.trim().toUpperCase() || "IDR"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax config</span>
                    <span>{formatPercent(form.taxPercent)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Low stock</span>
                    <span>{form.lowStockThreshold || "0"} item</span>
                  </div>
                </div>
                <Separator className="my-4" />
                <p className="text-center font-bold">{form.receiptFooter || "Terima kasih sudah berbelanja."}</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="secondary">Read public</Badge>
                <Badge>Admin write</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Save control</CardTitle>
              <CardDescription>Perubahan tersimpan ke backend settings singleton.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Button type="submit" disabled={isLoading || isSaving}>
                <Save />
                {isSaving ? "Saving..." : "Save Settings"}
              </Button>
              <Button type="button" variant="outline" disabled={isLoading || isSaving} onClick={resetForm}>
                <RotateCcw />
                Reset Form
              </Button>
            </CardContent>
          </Card>
        </aside>
      </form>
    </>
  );
}
