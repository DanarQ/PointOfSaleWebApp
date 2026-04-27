import {
  LockOutlined,
  LoginOutlined,
  SafetyCertificateOutlined,
  ShoppingCartOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  ConfigProvider,
  Flex,
  Form,
  Input,
  Typography,
} from "antd";
import Images from "../assets/Gambar";
import "./Login.css";

const { Text, Title } = Typography;

function Login() {
  return (
    <main className="login-page">
      <div className="login-background" aria-hidden="true">
        <img src={Images.loginBackground} alt="" />
        <span className="login-background__wash" />
        <span className="login-background__blue-panel" />
      </div>

      <ConfigProvider
        theme={{
          token: {
            borderRadius: 8,
            colorPrimary: "#1666e8",
            fontFamily:
              '"Segoe UI Variable", "Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
          },
        }}
      >
        <Card className="login-card" variant="borderless">
          <div className="login-hero">
            <div className="login-mark">
              <ShoppingCartOutlined aria-hidden="true" />
            </div>

            <div className="login-copy">
              <Title id="login-title" level={1}>
                POS <span>Swalayan</span>
              </Title>
              <div className="login-subtitle">
                <span className="login-subtitle__line" />
                <Text className="login-subtitle__text">Point of Sale</Text>
                <span className="login-subtitle__line" />
              </div>
              <Text className="login-description">
                Aplikasi kasir untuk swalayan / minimarket
              </Text>
            </div>
          </div>

          <Form
            className="login-form"
            layout="vertical"
            requiredMark={false}
            autoComplete="off"
          >
            <Title level={2}>Login</Title>

            <Form.Item
              label="Email / Username"
              name="identity"
              rules={[
                { required: true, message: "Email atau username wajib diisi" },
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="Username"
                size="large"
                autoComplete="username"
              />
            </Form.Item>

            <Form.Item
              label="Password"
              name="password"
              rules={[{ required: true, message: "Password wajib diisi" }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Password"
                size="large"
                autoComplete="current-password"
              />
            </Form.Item>

            <Button
              className="login-button"
              type="primary"
              htmlType="submit"
              size="large"
              icon={<LoginOutlined />}
              block
            >
              Login
            </Button>
          </Form>

          <footer className="login-footer" aria-label="Informasi aplikasi">
            <Flex align="center" justify="center" gap={8} wrap>
              <SafetyCertificateOutlined />
              <Text>Aman</Text>
              <Text>|</Text>
              <Text>Cepat</Text>
              <Text>|</Text>
              <Text>Terpercaya</Text>
            </Flex>
          </footer>
        </Card>
      </ConfigProvider>
    </main>
  );
}

export default Login;
