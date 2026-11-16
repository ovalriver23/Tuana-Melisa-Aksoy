import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tuana Melisa Aksoy",
  description: "Portfolio of Tuana Melisa Aksoy, computer engineering student.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
