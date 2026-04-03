import React from "react";
import { getCurrentYear } from "../utils/year";

const Footer: React.FC = () => {
  const year = getCurrentYear();
  return (
    <footer style={{ width: "100%", textAlign: "center", padding: 12, opacity: 0.6 }}>
      © {year} Theordertz Branding Demo
    </footer>
  );
};

export default Footer;
