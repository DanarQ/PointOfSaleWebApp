import {
  AppstoreOutlined,
  FileTextOutlined,
  LogoutOutlined,
  ProductOutlined,
  ShoppingCartOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Button } from "antd";
import { NavLink, useNavigate } from "react-router-dom";
import { clearAuthSession, getStoredUser } from "../../../../services/auth";
import "./Sidebar.css";

const menuItems = [
  {
    label: "Kasir",
    path: "/kasir",
    icon: <ShoppingCartOutlined />,
  },
  {
    label: "Produk",
    path: "/kasir/produk",
    icon: <ProductOutlined />,
  },
  {
    label: "Transaksi",
    path: "/kasir/transaksi",
    icon: <FileTextOutlined />,
  },
];

function Sidebar() {
  const navigate = useNavigate();
  const user = getStoredUser();
  const displayEmail = user?.email ?? "Kasir";
  const displayRole = user?.role ?? "user";

  function handleLogout() {
    clearAuthSession();
    navigate("/login", { replace: true });
  }

  return (
    <aside className="kasir-sidebar" aria-label="Navigasi kasir">
      <div className="kasir-sidebar__brand">
        <div className="kasir-sidebar__logo">
          <AppstoreOutlined />
        </div>
        <div>
          <p>POS Swalayan</p>
          <span>Kasir Panel</span>
        </div>
      </div>

      <nav className="kasir-sidebar__nav">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/kasir"}
            className={({ isActive }) =>
              isActive
                ? "kasir-sidebar__link kasir-sidebar__link--active"
                : "kasir-sidebar__link"
            }
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="kasir-sidebar__account">
        <div className="kasir-sidebar__user">
          <div className="kasir-sidebar__avatar">
            <UserOutlined />
          </div>
          <div>
            <p>{displayEmail}</p>
            <span>{displayRole}</span>
          </div>
        </div>

        <Button
          className="kasir-sidebar__logout"
          icon={<LogoutOutlined />}
          onClick={handleLogout}
          block
        >
          Logout
        </Button>
      </div>
    </aside>
  );
}

export default Sidebar;
