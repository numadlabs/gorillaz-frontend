"use client"
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";
import { useAccount } from "wagmi";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const { address } = useAccount();

  useEffect(() => {
    if(!address){
      localStorage.removeItem("gorillaz_token")
      router.push("/");
    }
  }, [])
  

  return <div>{children}</div>;
};

export default DashboardLayout;
