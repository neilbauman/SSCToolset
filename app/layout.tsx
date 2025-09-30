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
  // Default props for global header (can be overridden per page)
  const defaultHeader = {
    title: "Welcome",
    group: "dashboard" as const,
    description: "Shelter and Settlements Severity Classification Toolset",
  };

  return (
    <html lang="en">
      <body className="antialiased">
        <SidebarLayout headerProps={defaultHeader}>{children}</SidebarLayout>
      </body>
    </html>
  );
}
