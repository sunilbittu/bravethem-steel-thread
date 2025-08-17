import "./../styles/globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BraveThem — Steel Thread",
  description: "Calm command center for work & home",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
