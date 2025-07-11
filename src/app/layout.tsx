'use client'
import "./globals.css";
import { Providers } from "./provider";
import { AuthProvider } from "@/contexts/auth-context";
// import PageTransition from "@/components/page-transition";
import type { ReactNode } from "react";
import Header from "@/components/sections/header";
import { Toaster } from "@/components/ui/sonner";

import { usePathname } from "next/navigation";

export default function RootLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const background = findBackGroundImage(pathname)

  return (
    <html lang="en" className="">
      <body
        className="h-full min-h-screen bg-black"
        suppressHydrationWarning={true}
      >

        <div className={`fixed inset-0 bg-cover bg-center bg-no-repeat z-0`}
          style={{
            backgroundImage: `url(/${background}.png)`,
          }}
        ></div>
        <div className="fixed inset-0 bg-[url(/Noiselayer.svg)] bg-repeat opacity-50 pointer-events-none z-[1]"></div>
        <div className="relative z-10 min-h-[100dvh]">
          <Providers>
            <AuthProvider>
              <div className="flex items-center w-full justify-center">
                <Header />
              </div>
              {/* <PageTransition></PageTransition> */}
              {children}
            </AuthProvider>
          </Providers>
        </div>
        <Toaster />
      </body>
    </html>
  );
}

function findBackGroundImage(path: string) {
  switch (path) {
    case '/':
      return 'HomeBackground'
    case '/dashboard':
      return 'DashboardBackground'
    case '/profile':
      return 'ProfileBackground'
    case '/dashboard/flip':
      return 'FlipBackground'
    default:
      return 'HomeBackground'
  }
}