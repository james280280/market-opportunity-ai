import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "市場機会発掘AI MVP",
  description: "ダミーデータで市場評価・足切り・ランキング・詳細表示まで確認できるMVP",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
