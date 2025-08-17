import "./../styles/globals.css";
import type { Metadata, Viewport } from "next";
import RegisterSW from "../components/RegisterSW";

export const metadata: Metadata = {
  title: "BraveThem — Steel Thread",
  description: "Calm command center for work & home",
};

export const viewport: Viewport = {
  themeColor: "#0B0B0C",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#0B0B0C" />
        <link rel="icon" href="/icons/icon-192.png" sizes="192x192" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
