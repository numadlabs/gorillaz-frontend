'use client'
import "./globals.css";
import { Providers } from "./provider";
import { AuthProvider } from "@/contexts/auth-context";
import Image from 'next/image';

// import PageTransition from "@/components/page-transition";
import type { ReactNode } from "react";
import Header from "@/components/sections/header";
import { Toaster } from "@/components/ui/sonner";

import { usePathname } from "next/navigation";
import { useIsMobile } from "@/hooks/use-mobile";

export default function RootLayout({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile()
  const pathname = usePathname()
  const background = findBackGroundImage(pathname)

  if (isMobile) {
    return (
      <html lang="en" className="">
        <body className="h-full min-h-screen bg-black flex items-center justify-center text-center font-semibold text-white flex-col gap-4">
          <Image src="/Vector.svg" height={100} width={100} alt="Gorilla" />
          <h1 className="text-3xl px-16">Real Gorillas use PC Cuzz Gorillas have too big fINGERS</h1>
          <div className="text-center w-full absolute bottom-12">
            <h1 className="text-3xl px-20">Deal With It</h1>
          </div>
        </body>
      </html>
    )
  }

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