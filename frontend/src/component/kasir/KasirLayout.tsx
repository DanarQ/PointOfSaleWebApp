import "./KasirLayout.css";
import Sidebar from "./layout/sidebar/Sidebar";

function KasirLayout() {
  return (
    <div className="kasir-layout">
      <Sidebar />
      <main className="kasir-layout__content">
        <h1>Kasir Layout</h1>
      </main>
    </div>
  );
}
export default KasirLayout;
