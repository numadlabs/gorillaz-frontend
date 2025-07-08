"use client";

import GlareButton from "@/components/ui/glare-button";
import { useAuth } from "@/contexts/auth-context";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import GlowButton from "../ui/glow-button";
import ArrowRight from "../icons/arrow-right";
import Image from "next/image";

export default function Header() {
  const { isAuthenticated } = useAuth();
  const [flipCount] = useState<{
    count: number;
    remaining: number;
  } | null>(null);

  const router = useRouter();
  const pathname = usePathname();

  const handleNavigation = () => {
    if (pathname === "/dashboard/flip") {
      router.push("/dashboard");
    } else {
      router.push("/dashboard/flip");
    }
  };

  //todo flipcount oruulah
  //todo 2 svg oruulah

  return (
    <div className=" max-w-[1920px] flex top-0 w-full justify-between items-center px-4 py-4 sm:px-6 sm:py-5 z-20">
      <Link href={isAuthenticated ? "/dashboard" : "/"}>
        <Image
          src="/logo/Logo.svg"
          alt="logo"
          className="h-8 sm:h-10 md:h-12"
          width={200}
          height={100}
        />
      </Link>
      <div className="flex flex-row gap-2 sm:gap-3">
        {isAuthenticated ? (
          <GlowButton
            background={pathname === "/dashboard/flip" ? "#FAFAFA" : "#FFD700"}
            borderRadius="12px"
            onClick={() => handleNavigation()}
            borderColor="rgba(255, 255, 255, 0.04)"
            className="p-2 sm:p-3 backdrop-blur-[40px] flex items-center gap-2"
          >
            <div className="flex gap-2 items-center">
              <span className="text-dark-primary text-button-56 font-medium">
                {pathname === "/dashboard/flip"
                  ? "Dashboard"
                  : flipCount
                    ? `${flipCount.remaining} draws/10`
                    : "Let's Play!"}
              </span>
              <ArrowRight size={24} color="#000000" />
            </div>
          </GlowButton>
        ) : (
          <>
            <GlareButton
              background="rgba(255, 255, 255, 0.16)"
              borderRadius="12px"
              borderColor="rgba(255, 255, 255, 0.04)"
              className="p-2 sm:p-3 backdrop-blur-[40px]"
            >
              <Image src="/Twitter.svg" alt="Twitter" width={24} height={24} />
            </GlareButton>
            <GlareButton
              background="rgba(255, 255, 255, 0.16)"
              borderRadius="12px"
              borderColor="rgba(255, 255, 255, 0.04)"
              className="p-2 sm:p-3 backdrop-blur-[40px]"
            >
              <Image src="/Discord.svg" alt="Discord" width={24} height={24} />
            </GlareButton>
          </>
        )}
      </div>
    </div>
  );
}
