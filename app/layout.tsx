import "./globals.css";
import Sidebar from "@/components/ui/Sidebar";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SSC Toolset",
  description: "Global Shelter Cluster – Shelter Severity Classification Toolset",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">
        <div className="flex min-h-screen">
          {/* Sidebar */}
          <Sidebar />

          {/* Main Content */}
          <main className="flex-1">
            <div className="max-w-6xl mx-auto px-6 py-6">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
