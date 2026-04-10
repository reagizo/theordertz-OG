import React from "react";
import AnimatedLogo from "./AnimatedLogo";
import Footer from "./Footer";

type BrandLayoutProps = {
  children: React.ReactNode;
  logoInline?: boolean;
};

const BrandLayout: React.FC<BrandLayoutProps> = ({ children, logoInline = false }) => {
  return (
    <div className="min-h-screen bg-[#1a1a3e] flex items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Blur background layers */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#e8346a]/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#fbb040]/20 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#4F46E5]/10 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 w-full max-w-6xl">
        <header className="flex justify-center mb-8">
          <AnimatedLogo showText={true} animate={true} size="lg" />
        </header>
        <main>{children}</main>
        <Footer />
      </div>
    </div>
  );
};

export default BrandLayout;