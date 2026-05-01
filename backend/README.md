# Backend — Point of Sale API

REST API untuk aplikasi Point of Sale. Dibangun dengan **Express 5**, **Prisma 7**, dan **PostgreSQL**.

---

## Daftar Isi

- [Arsitektur](#arsitektur)
- [Setup](#setup)
- [Format Response](#format-response)
- [Autentikasi](#autentikasi)
- [Endpoints](#endpoints)
  - [Health](#health)
  - [Auth](#auth) — register, login, refresh, me
  - [Users](#users)
  - [Categories](#categories)
  - [Products](#products)
  - [Stock Movements](#stock-movements)
  - [Transactions](#transactions)
  - [Payments](#payments)

---

## Arsitektur

```
Frontend (React)
      │
      │ HTTP / JSON
      ▼
┌─────────────────────────────────────────┐
│              Express App                │
│                                         │
│  routes/          ← definisi URL & method│
│    ↓                                    │
│  controllers/     ← validasi param HTTP │
│    ↓                                    │
│  services/        ← bisnis logic & DB   │
│    ↓                                    │
│  Prisma Client    ← query ke PostgreSQL │
└─────────────────────────────────────────┘
      │
      ▼
  PostgreSQL
```

### Pola yang dipakai di seluruh codebase

**Result Pattern** — service tidak pernah throw untuk error yang sudah diprediksi. Semua method service mengembalikan:
```ts
{ ok: true,  data: T }           // sukses
{ ok: false, status: 400 | 401 | 404 | 409, error: string }  // gagal
```
Controller membaca hasil ini dan menerjemahkan ke HTTP response.

**Factory Function** — router, controller, dan service dibuat lewat fungsi `create*()` yang menerima prisma client sebagai parameter. Ini memudahkan testing karena prisma bisa di-mock tanpa mengubah implementasi.

### Struktur file

```
src/
├── index.ts                  ← entry point, start server
├── app.ts                    ← setup Express, daftarkan semua router
├── db.ts                     ← koneksi Prisma ke PostgreSQL
├── routes/                   ← definisi URL dan method HTTP
├── controllers/              ← validasi param, panggil service, kirim response
├── services/                 ← validasi body, logika bisnis, query DB
└── utils/
    └── prismaErrors.ts       ← helper untuk deteksi error Prisma (P2002, P2025)
```

---

## Setup

### Prasyarat

- Node.js 20+
- PostgreSQL

### Langkah

```bash
# 1. Install dependencies
npm install

# 2. Buat file .env
cp .env.example .env
# Isi DATABASE_URL dan AUTH_TOKEN_SECRET

# 3. Jalankan migrasi database
npx prisma migrate deploy

# 4. Jalankan server (development)
npm run dev

# 5. Build dan jalankan (production)
npm start
```

### Variabel Environment

| Variable | Wajib | Keterangan |
|---|---|---|
| `DATABASE_URL` | Ya | `postgresql://user:pass@host:5432/dbname` |
| `AUTH_TOKEN_SECRET` | Direkomendasikan | Secret untuk JWT. Default ke nilai hardcoded jika tidak diisi (jangan dipakai di production) |
| `PORT` | Tidak | Default `5000` |

---

## Troubleshooting

### Endpoint baru atau model Prisma mengembalikan `404`

Jika source code route sudah ada tetapi endpoint seperti `/transactions`, `/payments`, atau `/stock-movements` tetap mengembalikan `404`, cek apakah Prisma Client dan build output sudah mengikuti schema terbaru.

Jalankan:

```bash
npm exec prisma validate -- --schema prisma/schema.prisma
npx prisma generate
npm run build
```

Setelah itu restart backend di `http://localhost:5000`. Route yang bergantung pada model Prisma baru tidak akan terpasang jika server masih memakai generated client atau proses lama.

---

## Format Response

### Sukses — single resource

Response body langsung berisi object, tanpa wrapper.

```json
{ "id": 1, "name": "Kopi Susu", "price": 15000 }
```

### Sukses — list / koleksi

Semua endpoint `GET` yang mengembalikan array dibungkus dalam **pagination envelope**:

```json
{
  "data": [ ... ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

**Query params pagination** (berlaku di semua list endpoint):

| Param | Default | Maksimum | Keterangan |
|---|---|---|---|
| `page` | `1` | — | Nomor halaman, dimulai dari 1 |
| `limit` | `20` | `100` | Jumlah item per halaman |

### Error

Semua error mengembalikan format yang sama:

```json
{ "error": "pesan error" }
```

| Status | Kapan terjadi |
|---|---|
| `400` | Request body tidak valid, stok tidak cukup, data tidak konsisten |
| `401` | Token tidak ada, expired, atau tidak valid |
| `403` | Token valid tapi role tidak punya akses |
| `404` | Resource tidak ditemukan |
| `409` | Konflik data (email sudah terdaftar, kategori sudah ada) |
| `500` | Error server yang tidak terduga |

---

## Autentikasi

API menggunakan **dua token JWT**:

| Token | Expiry | Kegunaan |
|---|---|---|
| **Access token** (`token`) | 1 jam | Dikirim di header `Authorization: Bearer <token>` untuk setiap request |
| **Refresh token** (`refreshToken`) | 7 hari | Dikirim ke `POST /auth/refresh` untuk mendapatkan token baru |

### Cara mendapatkan token

Lakukan register atau login. Kedua token dikembalikan sekaligus:

```json
{
  "user": { "id": 1, "email": "kasir@toko.com", "role": "user" },
  "token": "eyJhbGciOiJIUzI1Ni...",
  "refreshToken": "eyJhbGciOiJIUzI1Ni..."
}
```

### Cara memakai access token

Sertakan di header setiap request yang memerlukan autentikasi:

```
Authorization: Bearer <token>
```

### Cara refresh token

Ketika access token sudah expired, kirim refresh token ke `POST /auth/refresh`. Server mengembalikan pasangan token baru (token lama tidak bisa dipakai lagi).

### Akses berdasarkan role

| Method & Path | Role yang diizinkan |
|---|---|
| `GET /auth/me` | semua (perlu token) |
| `POST /auth/refresh` | semua |
| Semua `/users` endpoint | `admin` saja |
| `POST /products`, `PUT /products/:id` | `user`, `admin` |
| `DELETE /products/:id` | `admin` saja |
| `POST /categories`, `PUT /categories/:id` | `user`, `admin` |
| `DELETE /categories/:id` | `admin` saja |
| `POST /stock-movements` | `user`, `admin` |
| `POST /transactions` | `user`, `admin` |
| `POST /transactions/:id/void` | `admin` saja |
| Semua endpoint `GET` lain | terbuka (tidak perlu token) |

**Error autentikasi:**
- `401 { "error": "authorization token is required" }` — tidak ada token
- `401 { "error": "invalid authorization token" }` — token rusak atau expired
- `403 { "error": "insufficient permissions" }` — token valid tapi role tidak cukup

### Role default

User baru yang mendaftar lewat `POST /auth/register` mendapat `role: "user"`. Untuk membuat atau mengubah akun admin, gunakan endpoint `/users` dengan token admin.

---

## Endpoints

Base URL: `http://localhost:5000`

---

### Health

#### `GET /health`

Cek apakah server berjalan.

**Response `200`**
```json
{ "status": "ok" }
```

---

### Auth

#### `POST /auth/register`

Daftarkan akun baru. Mengembalikan user dan token langsung.

**Request Body**
```json
{
  "email": "kasir@toko.com",
  "password": "rahasia123"
}
```

**Response `201`**
```json
{
  "user": {
    "id": 1,
    "email": "kasir@toko.com",
    "role": "user"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Error yang mungkin**
| Status | Error |
|---|---|
| `400` | `valid email is required` / `password must be at least 6 characters` |
| `409` | `email already registered` |

---

#### `POST /auth/login`

Masuk dengan email dan password.

**Request Body**
```json
{
  "email": "kasir@toko.com",
  "password": "rahasia123"
}
```

**Response `200`** — sama dengan register (user + token)

**Error yang mungkin**
| Status | Error |
|---|---|
| `400` | Input tidak valid |
| `401` | `invalid email or password` |

---

#### `GET /auth/me`

Ambil data user yang sedang login. **Memerlukan token.**

**Headers**
```
Authorization: Bearer <token>
```

**Response `200`**
```json
{
  "user": {
    "id": 1,
    "email": "kasir@toko.com",
    "role": "user"
  }
}
```

**Error yang mungkin**
| Status | Error |
|---|---|
| `401` | Token tidak ada atau tidak valid |

---

### Users

Endpoint ini dipakai halaman admin untuk mengelola akun staf. Semua endpoint `/users` memerlukan token admin.

#### `GET /users`

Ambil daftar user dengan pagination, search email, dan filter role.

**Query Parameters** (semua opsional)

| Param | Tipe | Keterangan |
|---|---|---|
| `page` | number | Nomor halaman |
| `limit` | number | Jumlah item per halaman |
| `search` | string | Cari berdasarkan email |
| `role` | `"admin"` \| `"user"` | Filter role |

**Response `200`**
```json
{
  "data": [
    { "id": 1, "email": "admin@toko.com", "role": "admin" }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

#### `POST /users`

Buat akun staf dari halaman admin.

**Request Body**
```json
{
  "email": "kasir@toko.com",
  "password": "rahasia123",
  "role": "user"
}
```

**Response `201`**
```json
{ "id": 2, "email": "kasir@toko.com", "role": "user" }
```

#### `PUT /users/:id`

Update email dan role akun staf.

**Request Body**
```json
{
  "email": "lead@toko.com",
  "role": "admin"
}
```

**Response `200`**
```json
{ "id": 2, "email": "lead@toko.com", "role": "admin" }
```

Admin tidak bisa menurunkan role akunnya sendiri dari `admin` ke `user`.

#### `PUT /users/:id/password`

Reset password akun staf lain.

**Request Body**
```json
{ "password": "passwordbaru123" }
```

**Response `200`**
```json
{ "message": "password updated" }
```

#### `DELETE /users/:id`

Hapus akun staf. Admin tidak bisa menghapus akunnya sendiri.

**Response `200`**
```json
{ "message": "user deleted" }
```

**Error yang mungkin**
| Status | Error |
|---|---|
| `400` | `invalid user id` / input body tidak valid / self-action ditolak |
| `401` | Token tidak ada atau tidak valid |
| `403` | Token valid tapi bukan admin |
| `404` | `user not found` |
| `409` | `email already registered` |

---

### Categories

#### `GET /categories`

Ambil semua kategori, diurutkan dari ID terkecil.

**Response `200`**
```json
[
  { "id": 1, "name": "Minuman", "slug": "minuman" },
  { "id": 2, "name": "Makanan Ringan", "slug": "makanan-ringan" }
]
```

---

#### `POST /categories`

Buat kategori baru. Slug dibuat otomatis dari nama (contoh: `"Minuman Dingin"` → `"minuman-dingin"`).

**Request Body**
```json
{ "name": "Minuman Dingin" }
```

**Response `201`**
```json
{ "id": 3, "name": "Minuman Dingin", "slug": "minuman-dingin" }
```

**Error yang mungkin**
| Status | Error |
|---|---|
| `400` | `name is required` / `name must contain letters or numbers` |
| `409` | `category already exists` |

---

#### `PUT /categories/:id`

Update nama kategori. Slug diperbarui otomatis.

**Request Body**
```json
{ "name": "Minuman Hangat" }
```

**Response `200`**
```json
{ "id": 3, "name": "Minuman Hangat", "slug": "minuman-hangat" }
```

---

#### `DELETE /categories/:id`

Hapus kategori. Produk yang terhubung ke kategori ini akan memiliki `category: null` (tidak ikut terhapus).

**Response `200`**
```json
{ "message": "category deleted" }
```

---

### Products

Setiap produk mengembalikan objek kategori lengkap di field `category` (bukan hanya ID).

#### `GET /products`

Ambil produk, diurutkan dari ID terkecil. Mendukung filter via query parameter.

**Query Parameters** (semua opsional)

| Param | Tipe | Keterangan |
|---|---|---|
| `isActive` | `"true"` \| `"false"` | Filter berdasarkan status aktif. Tanpa param berarti semua produk dikembalikan. |
| `search` | string | Case-insensitive substring match di **name**, **sku**, dan **barcode**. Cocok untuk search box dan barcode scanner di POS. |
| `categoryId` | number | Filter produk berdasarkan ID kategori. |

**Contoh URL**
```
GET /products?isActive=true                  ← hanya produk aktif (untuk halaman kasir)
GET /products?search=kopi                    ← cari produk yang mengandung "kopi"
GET /products?search=8991234567890           ← cari by barcode (scanner)
GET /products?categoryId=1&isActive=true     ← kombinasi filter
```

**Response `200`**
```json
[
  {
    "id": 1,
    "name": "Kopi Susu",
    "price": 15000,
    "sku": "KPS-001",
    "barcode": null,
    "category": { "id": 1, "name": "Minuman", "slug": "minuman" },
    "description": null,
    "imageUrl": null,
    "stock": 50,
    "unit": "cup",
    "costPrice": 8000,
    "isActive": true
  }
]
```

**Error**
| Status | Error |
|---|---|
| `400` | `isActive must be true or false` / `categoryId must be a positive integer` |

---

#### `GET /products/:id`

Ambil satu produk berdasarkan ID.

**Response `200`** — satu objek produk (sama dengan format di atas)

**Error**
| Status | Error |
|---|---|
| `400` | `invalid product id` |
| `404` | `product not found` |

---

#### `POST /products`

Buat produk baru.

**Request Body**

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `name` | string | Ya | Nama produk |
| `price` | number | Ya | Harga jual (>= 0) |
| `sku` | string \| null | Tidak | Kode SKU unik |
| `barcode` | string \| null | Tidak | Barcode unik |
| `category` | string \| null | Tidak | Nama kategori. Dibuat otomatis jika belum ada. `null` untuk tanpa kategori. |
| `description` | string \| null | Tidak | |
| `imageUrl` | string \| null | Tidak | URL gambar |
| `stock` | number | Tidak | Default `0` |
| `unit` | string | Tidak | Default `"pcs"` |
| `costPrice` | number \| null | Tidak | Harga modal |
| `isActive` | boolean | Tidak | Default `true` |

```json
{
  "name": "Teh Tarik",
  "price": 12000,
  "category": "Minuman",
  "stock": 100,
  "unit": "cup",
  "costPrice": 6000
}
```

**Response `201`** — objek produk lengkap

---

#### `PUT /products/:id`

Update produk. Semua field bersifat opsional kecuali `name` dan `price` yang wajib ada.

Untuk **menghapus relasi kategori**, kirim `"category": null`.

**Request Body** — sama dengan POST

**Response `200`** — objek produk yang sudah diperbarui

---

#### `DELETE /products/:id`

Hapus produk.

**Response `200`**
```json
{ "message": "product deleted" }
```

---

### Stock Movements

Mencatat setiap perubahan stok. Membuat movement juga mengupdate `product.stock` secara atomik (satu DB transaction).

#### `GET /stock-movements`

Ambil semua riwayat pergerakan stok, terbaru duluan.

**Response `200`**
```json
[
  {
    "id": 5,
    "productId": 1,
    "userId": 2,
    "type": "in",
    "quantity": 50,
    "stockBefore": 10,
    "stockAfter": 60,
    "referenceType": null,
    "referenceId": null,
    "notes": "Restock dari supplier"
  }
]
```

---

#### `GET /products/:id/stock-movements`

Ambil riwayat stok untuk satu produk saja, terbaru duluan.

**Response `200`** — array StockMovement (sama dengan format di atas)

**Error**
| Status | Error |
|---|---|
| `400` | `invalid product id` |
| `404` | `product not found` |

---

#### `POST /stock-movements`

Buat pergerakan stok secara manual (restock atau koreksi).

**Request Body**

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `productId` | number | Ya | ID produk |
| `type` | `"in"` \| `"out"` | Ya | `in` = tambah stok, `out` = kurangi stok |
| `quantity` | number | Ya | Jumlah (bilangan bulat positif) |
| `userId` | number \| null | Tidak | ID user yang melakukan perubahan |
| `referenceType` | string \| null | Tidak | Tipe referensi, contoh: `"adjustment"` |
| `referenceId` | number \| null | Tidak | ID referensi |
| `notes` | string \| null | Tidak | Catatan |

```json
{
  "productId": 1,
  "type": "in",
  "quantity": 50,
  "notes": "Restock dari supplier"
}
```

**Response `201`** — objek StockMovement yang baru dibuat

**Error yang mungkin**
| Status | Error |
|---|---|
| `400` | Field tidak valid atau `stock cannot be negative` (untuk type `out`) |
| `404` | `product not found` |

---

### Transactions

Membuat transaksi adalah satu operasi atomik yang sekaligus:
- Menghitung total harga
- Memotong stok setiap item
- Membuat record `TransactionItem` per baris
- Membuat record `StockMovement` per baris
- Membuat record `Payment`

#### `GET /transactions`

Ambil semua transaksi dengan item dan pembayaran, terbaru duluan.

**Response `200`**
```json
[
  {
    "id": 1,
    "invoiceNumber": "INV-000001",
    "cashierId": 2,
    "subtotal": 30000,
    "discount": 0,
    "tax": 0,
    "total": 30000,
    "paidAmount": 50000,
    "changeAmount": 20000,
    "paymentMethod": "cash",
    "status": "completed",
    "notes": null,
    "items": [
      {
        "id": 1,
        "transactionId": 1,
        "productId": 1,
        "productName": "Kopi Susu",
        "quantity": 2,
        "unitPrice": 15000,
        "costPrice": 8000,
        "discount": 0,
        "subtotal": 30000
      }
    ],
    "payments": [
      {
        "id": 1,
        "transactionId": 1,
        "amount": 50000,
        "method": "cash",
        "provider": null,
        "referenceNumber": null,
        "status": "paid"
      }
    ]
  }
]
```

---

#### `GET /transactions/:id`

Ambil satu transaksi lengkap (dengan items dan payments).

**Response `200`** — satu objek transaksi (format sama dengan di atas)

**Error**
| Status | Error |
|---|---|
| `400` | `invalid transaction id` |
| `404` | `transaction not found` |

---

#### `POST /transactions`

Buat transaksi baru (checkout).

**Request Body**

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `items` | array | Ya | Minimal 1 item |
| `items[].productId` | number | Ya | |
| `items[].quantity` | number | Ya | Bilangan bulat positif |
| `items[].discount` | number | Tidak | Diskon per item. Default `0` |
| `cashierId` | number \| null | Tidak | ID kasir |
| `discount` | number | Tidak | Diskon level order. Default `0` |
| `tax` | number | Tidak | Pajak level order. Default `0` |
| `paidAmount` | number | Tidak | Jumlah uang yang dibayar. Default = total (kembalian 0) |
| `paymentMethod` | string | Tidak | Default `"cash"` |
| `paymentProvider` | string \| null | Tidak | Contoh: `"GoPay"`, `"OVO"` |
| `paymentReferenceNumber` | string \| null | Tidak | Nomor referensi dari payment gateway |
| `notes` | string \| null | Tidak | Catatan transaksi |

**Kalkulasi harga:**
```
item.subtotal  = product.price × item.quantity − item.discount
subtotal       = Σ item.subtotal
total          = subtotal − discount + tax
changeAmount   = paidAmount − total
```

**Contoh Request**
```json
{
  "cashierId": 2,
  "items": [
    { "productId": 1, "quantity": 2 },
    { "productId": 3, "quantity": 1, "discount": 2000 }
  ],
  "paidAmount": 50000,
  "paymentMethod": "cash",
  "notes": "Meja 5"
}
```

**Response `201`** — objek transaksi lengkap dengan `invoiceNumber` format `INV-XXXXXX`

**Error yang mungkin**
| Status | Error |
|---|---|
| `400` | `items must contain at least one item` |
| `400` | `item subtotal cannot be negative` |
| `400` | `total cannot be negative` |
| `400` | `paidAmount must cover total` |
| `400` | `stock cannot be negative` |
| `404` | `product not found` |

---

#### `POST /transactions/:id/void`

Batalkan transaksi yang sudah `completed`. Stok setiap item dikembalikan secara atomik.

Hanya transaksi dengan status `"completed"` yang bisa di-void. Transaksi yang sudah `"voided"` akan ditolak.

**Request Body** (opsional)
```json
{ "notes": "Salah input item" }
```

> Body boleh dikosongkan sepenuhnya (tidak perlu mengirim `{}` atau `Content-Type` header).

**Response `200`** — objek transaksi dengan `status: "voided"` dan items + payments

**Error yang mungkin**
| Status | Error |
|---|---|
| `400` | `invalid transaction id` |
| `400` | `transaction cannot be voided` (sudah voided atau bukan completed) |
| `404` | `transaction not found` |

---

### Payments

Payment dibuat otomatis saat membuat transaksi. Endpoint ini hanya untuk membaca.

#### `GET /payments`

Ambil semua record pembayaran, terbaru duluan.

**Response `200`**
```json
[
  {
    "id": 2,
    "transactionId": 2,
    "amount": 25000,
    "method": "qris",
    "provider": "GoPay",
    "referenceNumber": "TRX-ABC123",
    "status": "paid"
  }
]
```

---

## Nilai Enum

### Transaction `status`
| Nilai | Keterangan |
|---|---|
| `completed` | Transaksi berhasil |
| `voided` | Transaksi dibatalkan, stok sudah dikembalikan |

### StockMovement `type`
| Nilai | Dibuat oleh |
|---|---|
| `in` | POST /stock-movements manual |
| `out` | POST /stock-movements manual |
| `sale` | POST /transactions (otomatis per item) |
| `void` | POST /transactions/:id/void (otomatis per item) |

### Payment `method`
Nilai bebas (string), disarankan konsisten: `cash`, `qris`, `transfer`, `debit`, `kredit`.
