import React from "react";
import LogoInline from "./LogoInline";

type LogoProps = {
  inline?: boolean;
  alt?: string;
  className?: string;
  assetPath?: string;
  size?: string;
  showName?: boolean;
};

const Logo: React.FC<LogoProps> = ({ inline = false, alt = "Brand Logo", className, assetPath, size, showName }) => {
  if (inline) {
    return <LogoInline aria-label={alt} className={className} />;
  }

  const src = assetPath ?? "/logo.png";
  const sizeClass = size === "lg" ? "w-16 h-16" : size === "sm" ? "w-8 h-8" : "";
  return (
    <div className={`flex items-center gap-2 ${className || ""}`}>
      <img src={src} alt={alt} className={`${sizeClass} flex-shrink-0`} style={{ display: "block", maxWidth: "100%", height: "auto" }} />
      {showName && (
        <div className="flex flex-col">
          <p className="text-white font-bold text-sm leading-tight" style={{ fontFamily: 'Aptos Display, Aptos, sans-serif' }}>The Order</p>
          <p className="text-pink-300 text-xs leading-tight">Reagizo Service Co.</p>
        </div>
      )}
    </div>
  );
};

export default Logo;
