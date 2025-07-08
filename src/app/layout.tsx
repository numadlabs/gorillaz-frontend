// app/layout.tsx
import "./globals.css";
import { Providers } from "./provider";
import { AuthProvider } from "@/contexts/auth-context";
import PageTransition from "@/components/page-transition";
import type { ReactNode } from "react";
import Header from "@/components/sections/header";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full min-h-screen bg-black">
        <div className="fixed inset-0 bg-[url(/Background.png)] bg-cover bg-center bg-no-repeat z-0"></div>
        <div className="fixed inset-0 bg-[url(/Noiselayer.svg)] bg-repeat opacity-50 pointer-events-none z-[1]"></div>
        <div className="relative z-10 min-h-[100dvh]">
          <Providers>
            <AuthProvider>
              <div className="flex items-center w-full justify-center">
                <Header />
              </div>
              <PageTransition>{children}</PageTransition>
            </AuthProvider>
          </Providers>
        </div>
      </body>
    </html>
  );
}
