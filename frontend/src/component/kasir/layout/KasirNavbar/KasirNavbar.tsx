import "./KasirNavbar.css";

type KasirNavbarProps = {
  onLogout: () => void;
};

function KasirNavbar({ onLogout }: KasirNavbarProps) {
  return (
    <nav className="kasir-navbar">
      <div className="kasir-navbar__brand">
        <span className="kasir-navbar__badge">POS</span>
        <div>
          <p>Point Of Sale</p>
          <strong>Dashboard Kasir</strong>
        </div>
      </div>

      <button className="kasir-navbar__logout" type="button" onClick={onLogout}>
        Logout
      </button>
    </nav>
  );
}

export default KasirNavbar;
