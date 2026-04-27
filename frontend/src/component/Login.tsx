import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

type LoginProps = {
  onLogin: () => void;
};

function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onLogin();
    navigate("/app", { replace: true });
  };

  return (
    <main className="login-page">
      <div className="login-backdrop" aria-hidden="true">
        <span className="login-backdrop__line" />
        <span className="login-backdrop__line" />
        <span className="login-backdrop__line" />
      </div>

      <section className="login-panel">
        <div className="login-panel__intro">
          <div className="login-panel__brand">
            <span>POS</span>
            <p>Point Of Sale</p>
          </div>

          <h1>Masuk ke kasir</h1>
          <p className="login-panel__copy">
            Kelola transaksi, produk, dan pembayaran dari satu meja kerja yang
            cepat.
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="login-form__field">
            <span>Email</span>
            <input
              type="email"
              placeholder="kasir@toko.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label className="login-form__field">
            <span>Password</span>
            <input
              type="password"
              placeholder="Masukkan password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          <button className="login-form__submit" type="submit">
            <span>Masuk</span>
            <span aria-hidden="true">→</span>
          </button>
        </form>
      </section>
    </main>
  );
}

export default Login;
