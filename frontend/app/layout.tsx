import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Point of Sale Login",
  description: "Login page for the Point of Sale web application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
