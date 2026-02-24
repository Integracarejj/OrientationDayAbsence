import "./globals.css";
import { Suspense } from "react";
import { AppShellClient } from "../components/layout/AppShellClient";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={null}>
          <AppShellClient>{children}</AppShellClient>
        </Suspense>
      </body>
    </html>
  );
}