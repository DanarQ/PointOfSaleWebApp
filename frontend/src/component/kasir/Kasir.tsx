import "./Kasir.css";
import KasirNavbar from "./layout/KasirNavbar/KasirNavbar";

type KasirProps = {
  onLogout: () => void;
};

function Kasir({ onLogout }: KasirProps) {
  return (
    <div className="app-shell">
      <KasirNavbar onLogout={onLogout} />

      <main className="app-home">
        <div className="app-home__hero">
          <p className="app-home__eyebrow">Point of Sale</p>
          <h1>Kasir siap dipakai begitu auth backend sudah kita sambungkan.</h1>
          <p className="app-home__copy">
            Untuk sekarang route login sudah aktif dan mengarahkan pengguna ke
            halaman aplikasi utama. Nanti kita tinggal ganti aksi tombol login
            ini ke request API yang sebenarnya.
          </p>
        </div>

        <section className="app-home__grid" aria-label="Preview kasir">
          <article className="app-home__panel">
            <span className="app-home__label">Status</span>
            <strong>Login placeholder aktif</strong>
            <p>
              Session sementara disimpan di browser agar alur route bisa dites.
            </p>
          </article>

          <article className="app-home__panel">
            <span className="app-home__label">Next step</span>
            <strong>Hubungkan ke `/auth/login`</strong>
            <p>
              Saat data auth sudah ada di database, kita tinggal ganti handler
              tombol login tanpa ubah struktur route.
            </p>
          </article>
        </section>
      </main>
    </div>
  );
}

export default Kasir;
