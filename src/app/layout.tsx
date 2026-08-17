import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "포남동 예약관리",
  description: "포남동 숙소 예약·청소·정산 관리",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
