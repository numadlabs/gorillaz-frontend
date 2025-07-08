import React from "react";

interface GlowButtonProps {
  width?: string;
  height?: string;
  background?: string;
  borderRadius?: string;
  borderColor?: string;
  children?: React.ReactNode;
  glowColor?: string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  disabled?: boolean;
}

const GlowButton: React.FC<GlowButtonProps> = ({
  width = "auto",
  height = "auto",
  background = "#000",
  borderRadius = "16px",
  borderColor = "rgba(15, 16, 18, 0.16)",
  children,
  glowColor,
  className = "",
  style = {},
  onClick,
  disabled = false,
}) => {
  // Use background color as glow color if not specified
  const shadowColor = glowColor || background;

  return (
    <button
      className={`relative cursor-pointer transition-all duration-300 ease-in-out ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      } ${className}`}
      style={{
        width,
        height,
        background,
        borderRadius,
        border: `2px solid ${borderColor}`,
        boxShadow: disabled ? "none" : undefined,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.boxShadow = `0px 0px 16px 0px ${shadowColor}`;
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.boxShadow = "none";
        }
      }}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export default GlowButton;
