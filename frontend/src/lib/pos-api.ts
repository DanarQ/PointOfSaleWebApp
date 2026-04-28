import { readStoredAuth } from "@/lib/session";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

export type Pagination = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination: Pagination;
};

export type Category = {
  id: number;
  name: string;
  slug: string;
};

export type Product = {
  id: number;
  name: string;
  price: number;
  sku?: string | null;
  barcode?: string | null;
  category?: Category | null;
  description?: string | null;
  imageUrl?: string | null;
  stock?: number;
  unit?: string;
  costPrice?: number | null;
  isActive?: boolean;
};

export type ProductListParams = {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: number;
  isActive?: boolean;
};

export type ProductPayload = {
  name: string;
  price: number;
  sku?: string | null;
  barcode?: string | null;
  category?: string | null;
  stock?: number;
  unit?: string;
  isActive?: boolean;
};

export type CategoryPayload = {
  name: string;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type BackendError = {
  error?: string;
};

function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>) {
  const url = new URL(path, API_URL);

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

function getAuthHeader() {
  if (typeof window === "undefined") {
    return {};
  }

  const auth = readStoredAuth();

  if (!auth?.token) {
    return {};
  }

  return { Authorization: `Bearer ${auth.token}` };
}

async function parseApiError(response: Response) {
  try {
    const body = (await response.json()) as BackendError;
    return body.error || `Request failed with status ${response.status}`;
  } catch {
    return `Request failed with status ${response.status}`;
  }
}

async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  options: { auth?: boolean; params?: Record<string, string | number | boolean | undefined> } = {},
) {
  const headers = new Headers(init.headers);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (options.auth) {
    Object.entries(getAuthHeader()).forEach(([key, value]) => headers.set(key, value));
  }

  const response = await fetch(buildUrl(path, options.params), {
    ...init,
    headers,
  });

  if (!response.ok) {
    throw new ApiError(await parseApiError(response), response.status);
  }

  return response.json() as Promise<T>;
}

export function listProducts(params: ProductListParams = {}) {
  return apiRequest<PaginatedResponse<Product>>("/products", {
    method: "GET",
  }, {
    params,
  });
}

export function createProduct(payload: ProductPayload) {
  return apiRequest<Product>("/products", {
    method: "POST",
    body: JSON.stringify(payload),
  }, {
    auth: true,
  });
}

export function updateProduct(id: number, payload: ProductPayload) {
  return apiRequest<Product>(`/products/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  }, {
    auth: true,
  });
}

export function deleteProduct(id: number) {
  return apiRequest<{ message: string }>(`/products/${id}`, {
    method: "DELETE",
  }, {
    auth: true,
  });
}

export function listCategories(params: { page?: number; limit?: number } = {}) {
  return apiRequest<PaginatedResponse<Category>>("/categories", {
    method: "GET",
  }, {
    params,
  });
}

export function createCategory(payload: CategoryPayload) {
  return apiRequest<Category>("/categories", {
    method: "POST",
    body: JSON.stringify(payload),
  }, {
    auth: true,
  });
}

export function updateCategory(id: number, payload: CategoryPayload) {
  return apiRequest<Category>(`/categories/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  }, {
    auth: true,
  });
}

export function deleteCategory(id: number) {
  return apiRequest<{ message: string }>(`/categories/${id}`, {
    method: "DELETE",
  }, {
    auth: true,
  });
}
