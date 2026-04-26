import ActionButton from "./ActionButton";

type NavItem = {
  href: string;
  label: string;
};

type NavbarProps = {
  activeHref?: string;
  items: NavItem[];
};

function Navbar({ activeHref = "/", items }: NavbarProps) {
  return (
    <header className="navbar">
      <a aria-label="POSWebApp beranda" className="navbar__brand" href="/">
        <span className="navbar__mark">P</span>
        <span>
          <strong>POSWebApp</strong>
          <small>Kasir & inventori</small>
        </span>
      </a>

      <nav aria-label="Navigasi utama" className="navbar__links">
        {items.map((item) => (
          <a
            aria-current={activeHref === item.href ? "page" : undefined}
            className="navbar__link"
            href={item.href}
            key={item.href}
          >
            {item.label}
          </a>
        ))}
      </nav>

      <div className="navbar__actions">
        <ActionButton variant="secondary">Buka Kasir</ActionButton>
      </div>
    </header>
  );
}

export default Navbar;
