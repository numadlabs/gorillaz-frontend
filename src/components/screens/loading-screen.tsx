import React from "react";
import Logo from "../icons/logo";

const LoadingScreen = () => {
  return (
    <div className="min-h-screen flex items-center justify-center ">
      <div className="flex justify-center items-center">
        <div className="animate-bounce duration-150">
          <Logo size={120} />
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
