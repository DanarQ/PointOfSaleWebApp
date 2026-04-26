import "./App.css";
import { ActionButton, Card, DataTable, Navbar, StatCard } from "./components";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/products", label: "Produk" },
  { href: "/sales", label: "Transaksi" },
  { href: "/reports", label: "Laporan" },
];

const lowStockProducts = [
  {
    id: 1,
    product: "Kopi Susu Botol",
    sku: "KSB-001",
    stock: "8 pcs",
    status: "Perlu restock",
  },
  {
    id: 2,
    product: "Roti Gandum",
    sku: "RTG-014",
    stock: "12 pcs",
    status: "Pantau",
  },
  {
    id: 3,
    product: "Teh Lemon",
    sku: "TLM-009",
    stock: "5 pcs",
    status: "Perlu restock",
  },
];

function App() {
  return (
    <div className="app-shell">
      <Navbar activeHref="/" items={navItems} />

      <main className="dashboard">
        <section className="dashboard__hero">
          <div>
            <p className="eyebrow">Shift pagi aktif</p>
            <h1>Kelola transaksi dan stok toko dari satu layar.</h1>
            <p className="dashboard__intro">
              Komponen awal ini disiapkan untuk dashboard POS: ringkasan
              penjualan, status stok, dan akses cepat ke kasir.
            </p>
          </div>
          <div className="dashboard__hero-actions">
            <ActionButton>Tambah Transaksi</ActionButton>
            <ActionButton variant="ghost">Input Produk</ActionButton>
          </div>
        </section>

        <section className="stat-grid" aria-label="Ringkasan toko">
          <StatCard label="Penjualan hari ini" tone="mint" trend="+12%" value="Rp 4,8 jt" />
          <StatCard label="Transaksi" tone="ink" trend="38 struk" value="156" />
          <StatCard label="Stok menipis" tone="amber" trend="3 perlu aksi" value="25" />
        </section>

        <div className="dashboard__content">
          <Card
            actions={<ActionButton variant="secondary">Lihat Semua</ActionButton>}
            eyebrow="Inventori"
            title="Produk perlu perhatian"
          >
            <DataTable
              columns={[
                { key: "product", header: "Produk" },
                { key: "sku", header: "SKU" },
                { key: "stock", header: "Stok" },
                { key: "status", header: "Status" },
              ]}
              data={lowStockProducts}
            />
          </Card>

          <Card eyebrow="Kasir" title="Aksi cepat">
            <div className="quick-actions">
              <ActionButton>Scan Barang</ActionButton>
              <ActionButton variant="secondary">Tambah Customer</ActionButton>
              <ActionButton variant="secondary">Cetak Laporan</ActionButton>
              <ActionButton variant="danger">Void Transaksi</ActionButton>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default App;
