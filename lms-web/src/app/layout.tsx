import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  title: "Card Catalog",
  description: "Library catalog, circulation, and collection management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-paper font-sans text-ink">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
