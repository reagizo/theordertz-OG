import React, { useState, useEffect } from "react"

type AnimatedLogoProps = {
  className?: string
  showText?: boolean
  animate?: boolean
  size?: "sm" | "md" | "lg"
}

const AnimatedLogo: React.FC<AnimatedLogoProps> = ({ 
  className = "", 
  showText = true, 
  animate = true,
  size = "md" 
}) => {
  const [isVisible, setIsVisible] = useState(!animate)
  const [isFadingOut, setIsFadingOut] = useState(false)

  useEffect(() => {
    if (!animate) return

    const fadeOutTimer = setTimeout(() => {
      setIsFadingOut(true)
    }, 3000)

    const hideTimer = setTimeout(() => {
      setIsVisible(true)
    }, 3500)

    const fadeInTimer = setTimeout(() => {
      setIsFadingOut(false)
    }, 4500)

    return () => {
      clearTimeout(fadeOutTimer)
      clearTimeout(hideTimer)
      clearTimeout(fadeInTimer)
    }
  }, [animate])

  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32"
  }[size]

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl"
  }[size]

  const textClass = `tracking-[0.25em] uppercase font-semibold text-center w-full ${textSizeClasses}`

  if (!animate) {
    return (
      <div className={`flex flex-col items-center justify-center w-full ${className}`}>
        <div className="flex justify-center">
          <img 
            src="/logo.png" 
            alt="Service Interface Portal System" 
            className={`${sizeClasses} object-contain drop-shadow-2xl`}
          />
        </div>
        {showText && (
          <div className="w-full max-w-sm mt-4">
            <p className={textClass} style={{ color: '#F57C00', fontFamily: 'Aptos Display, Aptos, sans-serif' }}>
              SERVICE INTERFACE PORTAL SYSTEM
            </p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div 
      className={`flex flex-col items-center justify-center w-full transition-opacity duration-1000 ${isFadingOut ? 'opacity-0' : 'opacity-100'} ${className}`}
    >
      <div className="flex justify-center">
        <img 
          src="/logo.png" 
          alt="Service Interface Portal System" 
          className={`${sizeClasses} object-contain drop-shadow-2xl`}
        />
      </div>
      {showText && (
        <div className="w-full max-w-sm mt-4">
          <p className={textClass} style={{ color: '#F57C00', fontFamily: 'Aptos Display, Aptos, sans-serif' }}>
            SERVICE INTERFACE PORTAL SYSTEM
          </p>
        </div>
      )}
    </div>
  )
}

export default AnimatedLogo