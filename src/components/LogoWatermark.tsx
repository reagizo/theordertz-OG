export function LogoWatermark({ className = '' }: { className?: string }) {
  return (
    <div className={`pointer-events-none select-none ${className}`}>
      <svg viewBox="0 0 400 420" className="w-full h-full" aria-hidden="true">
        <polygon points="200,20 360,90 340,120 200,60 60,120 40,90" fill="#0D1B2A" />
        <polygon points="200,100 330,160 310,190 200,135 90,190 70,160" fill="#C41E3A" />
        <polygon points="200,170 280,210 260,235 200,205 140,235 120,210" fill="#E8822A" />
        <text x="200" y="320" textAnchor="middle" fontFamily="Great Vibes, cursive" fontSize="72" fill="#0D1B2A">The Order</text>
        <text x="200" y="370" textAnchor="middle" fontFamily="Playfair Display, Georgia, serif" fontSize="20" fill="#C41E3A" letterSpacing="3">REAGIZO SERVICE COMPANY</text>
      </svg>
    </div>
  )
}
