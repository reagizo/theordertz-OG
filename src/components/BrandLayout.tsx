import React from "react";
import Logo from "./Logo";
import Footer from "./Footer";

type BrandLayoutProps = {
  children: React.ReactNode;
  logoInline?: boolean;
};

// Simple layout wrapper to enforce branding (logo at top, consistent background)
const BrandLayout: React.FC<BrandLayoutProps> = ({ children, logoInline = false }) => {
  return (
    <div className="branding-root" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <header style={{ width: "100%", display: "flex", justifyContent: "center", padding: "24px 16px 8px" }}>
        <Logo inline={logoInline} alt="Brand Logo" />
      </header>
      <main style={{ width: "100%", maxWidth: 960, padding: "0 16px", flex: 1 }}>{children}</main>
      <Footer />
    </div>
  );
};

export default BrandLayout;
