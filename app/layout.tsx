import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DispatchIQ",
  description: "Delivery dispatch for the Chennai Central depot",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  );
}
