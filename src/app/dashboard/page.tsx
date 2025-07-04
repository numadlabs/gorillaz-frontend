"use client";

import React from "react";
import { useAuth } from "@/contexts/auth-context";

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-4xl font-bold mb-8">Dashboard</h1>
      <p className="text-xl mb-4">Welcome, {user?.walletAddress}!</p>
    </div>
  );
};

export default Dashboard;
