import React, { useState, useEffect, useMemo } from "react"

type SplashScreenProps = {
  onComplete?: () => void
  duration?: number
}

const NUM_BARS = 14
const SPLIT_COLS = 6

const SplashScreen: React.FC<SplashScreenProps> = ({ 
  onComplete,
  duration = 3000 
}) => {
  const [phase, setPhase] = useState<"bars" | "logo" | "fade">("bars")
  const [isComplete, setIsComplete] = useState(false)

  const randomDelays = useMemo(() => 
    Array.from({ length: NUM_BARS }, () => Math.random() * 600 + 50)
  , [])

  const barHeights = useMemo(() => 
    Array.from({ length: NUM_BARS }, () => 40 + Math.random() * 60)
  , [])

  useEffect(() => {
    const barsTimer = setTimeout(() => setPhase("logo"), 1000)
    const logoTimer = setTimeout(() => setPhase("fade"), duration)
    const completeTimer = setTimeout(() => {
      setIsComplete(true)
      onComplete?.()
    }, duration + 600)

    return () => {
      clearTimeout(barsTimer)
      clearTimeout(logoTimer)
      clearTimeout(completeTimer)
    }
  }, [duration, onComplete])

  if (isComplete) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#111827] overflow-hidden">
      {phase === "bars" && (
        <div className="absolute inset-0 flex items-end justify-center gap-[3px] px-8">
          {Array.from({ length: NUM_BARS }).map((_, i) => (
            <div
              key={i}
              className="w-full animate-bar"
              style={{
                height: `${barHeights[i]}%`,
                animationDelay: `${randomDelays[i]}ms`,
              }}
            />
          ))}
        </div>
      )}

      {(phase === "logo" || phase === "fade") && (
        <div 
          className={`transition-all duration-700 ease-out ${
            phase === "fade" ? "opacity-0 scale-125" : "opacity-100 scale-100"
          }`}
        >
          <div 
            className="grid gap-[2px] p-4"
            style={{
              gridTemplateColumns: `repeat(${SPLIT_COLS}, 1fr)`,
            }}
          >
            {Array.from({ length: SPLIT_COLS * 3 }).map((_, i) => (
              <div
                key={i}
                className="overflow-hidden"
                style={{
                  animationDelay: `${150 + (i * 40)}ms`,
                }}
              >
                <div 
                  className="w-16 h-16 animate-split"
                  style={{
                    backgroundImage: "url('/logo.png')",
                    backgroundSize: `${SPLIT_COLS * 4}rem ${3 * 4}rem`,
                    backgroundPosition: `-${(i % SPLIT_COLS) * 4}rem -${Math.floor(i / SPLIT_COLS) * 4}rem`,
                  }}
                />
              </div>
            ))}
          </div>
          <p 
            className="mt-6 text-center text-lg tracking-[0.25em] uppercase font-semibold animate-fade-in"
            style={{ color: '#fbb040', fontFamily: 'Playfair Display, Georgia, serif' }}
          >
            SERVICE INTERFACE PORTAL SYSTEM
          </p>
        </div>
      )}

      <style>{`
        @keyframes bar {
          0% { height: 0%; }
          60% { height: var(--target-height, 50%); }
          100% { height: 0%; }
        }
        .animate-bar {
          --target-height: var(--height);
          background: linear-gradient(to top, #fbb040, #f9a827, #fbb040);
          animation: bar 0.7s ease-out forwards;
        }
        @keyframes split {
          0% { 
            transform: scaleX(0);
            opacity: 0;
          }
          100% { 
            transform: scaleX(1);
            opacity: 1;
          }
        }
        .animate-split {
          animation: split 0.4s ease-out forwards;
          transform-origin: var(--origin, center);
        }
        .animate-fade-in {
          animation: fadeIn 0.8s ease-out 0.5s forwards;
          opacity: 0;
        }
        @keyframes fadeIn {
          to { opacity: 1; }
        }
      `}</style>
    </div>
  )
}

export default SplashScreen