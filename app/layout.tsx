// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Blockcraft Tactics",
  description: "Pixel-RTS prototype with AI opponent",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#0f0f12", color: "#eaeaea" }}>
        {children}
      </body>
    </html>
  );
}
