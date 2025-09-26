import "./globals.css";
import type { ReactNode } from "react";
import Sidebar from "@/components/ui/Sidebar";

export const metadata = {
  title: "SSC Toolset",
  description: "Global Shelter Cluster SSC Toolset",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased bg-gray-50 text-gray-900">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
