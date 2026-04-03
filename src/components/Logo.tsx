import React from "react";
import LogoInline from "./LogoInline";

type LogoProps = {
  inline?: boolean;
  alt?: string;
  className?: string;
  assetPath?: string; // path to external asset (e.g. /logo.svg)
};

// Reusable Logo component
const Logo: React.FC<LogoProps> = ({ inline = false, alt = "Brand Logo", className, assetPath }) => {
  if (inline) {
    return <LogoInline aria-label={alt} className={className} />;
  }

  const src = assetPath ?? "/logo.svg";
  return (
    <img src={src} alt={alt} className={className} style={{ display: "block", maxWidth: "100%", height: "auto" }} />
  );
};

export default Logo;
