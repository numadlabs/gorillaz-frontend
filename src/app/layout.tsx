// app/layout.tsx
import "./globals.css";
import { Providers } from "./provider";
import { AuthProvider } from "@/contexts/auth-context";
import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <AuthProvider>{children}</AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
