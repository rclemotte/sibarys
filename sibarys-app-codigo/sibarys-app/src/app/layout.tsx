import type { Metadata, Viewport } from "next";
import "@fontsource/baloo-2/600.css";
import "@fontsource/baloo-2/700.css";
import "@fontsource/baloo-2/800.css";
import "@fontsource/nunito/400.css";
import "@fontsource/nunito/600.css";
import "@fontsource/nunito/700.css";
import "@fontsource/nunito/800.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sibarys — Combustible",
  description: "Registro de kilometraje y combustible de la flota Sibarys",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Sibarys" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#7A1A22",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
