import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "tom-select/dist/css/tom-select.css";

export const metadata: Metadata = {
  title: "SIRAMA",
  description: "Sistem Informasi Rekognisi Pembelajaran Lampau",
  icons: {
    icon: "/favicon-v1.ico",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
