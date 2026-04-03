import React from "react";

// Lightweight inline SVG variant of the brand logo.
const LogoInline: React.FC<React.SVGProps<SVGSVGElement> & { "aria-label"?: string } & { className?: string }> = (
  { className, "aria-label": ariaLabel = "Brand Logo" , ...rest }
) => {
  return (
    <svg
      width="180"
      height="48"
      viewBox="0 0 180 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={ariaLabel}
      className={className}
      {...rest}
    >
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#4F46E5" offset="0" />
          <stop stopColor="#06B6D4" offset="1" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="180" height="48" rx="8" fill="url(#g)" />
      <text x="90" y="32" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="20" fill="white">Brand</text>
    </svg>
  );
};

export default LogoInline;
