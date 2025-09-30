import "./globals.css";
import type { Metadata } from "next";
import SidebarLayout from "@/components/layout/SidebarLayout";

export const metadata: Metadata = {
  title: "SSC Toolset",
  description: "Shelter and Settlements Severity Classification Toolset",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {/* ✅ Do not force a default header here.
            SidebarLayout will still render correctly,
            but expects headerProps from the page itself. */}
        {children}
      </body>
    </html>
  );
}
