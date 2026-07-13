/** Efectos sutiles de celebración (colores cercanos a la paleta de la app). */
export function WelcomeBirthdayEffects() {
  const brandColors = [
    'hsl(262 83% 58%)',
    'hsl(280 70% 55%)',
    'hsl(230 70% 60%)',
    'hsl(190 65% 48%)',
    'hsl(40 90% 55%)',
    'hsl(330 70% 58%)',
  ]

  const balloons = [
    { left: '8%', delay: '0s', duration: '11s', color: brandColors[0]!, size: 24 },
    { left: '18%', delay: '1.4s', duration: '12s', color: brandColors[2]!, size: 20 },
    { left: '30%', delay: '0.6s', duration: '10.5s', color: brandColors[1]!, size: 26 },
    { left: '48%', delay: '2s', duration: '13s', color: brandColors[4]!, size: 22 },
    { left: '62%', delay: '0.9s', duration: '11.5s', color: brandColors[3]!, size: 24 },
    { left: '76%', delay: '1.8s', duration: '12.5s', color: brandColors[5]!, size: 21 },
    { left: '88%', delay: '0.3s', duration: '10.8s', color: brandColors[0]!, size: 25 },
  ]

  const fireworks = [
    { left: '15%', top: '16%', delay: '0s', color: brandColors[0]! },
    { left: '42%', top: '22%', delay: '1.6s', color: brandColors[4]! },
    { left: '70%', top: '14%', delay: '0.9s', color: brandColors[2]! },
    { left: '85%', top: '28%', delay: '2.4s', color: brandColors[5]! },
  ]

  const confetti = Array.from({ length: 16 }, (_, i) => ({
    left: `${6 + ((i * 19) % 88)}%`,
    delay: `${(i % 7) * 0.4}s`,
    duration: `${6.5 + (i % 4) * 0.8}s`,
    color: brandColors[i % brandColors.length]!,
    rotate: `${(i * 41) % 360}deg`,
    width: 5 + (i % 3) * 2,
    height: 8 + (i % 3) * 2,
  }))

  return (
    <div
      className="birthday-fx pointer-events-none fixed inset-0 z-40 overflow-hidden opacity-70"
      aria-hidden
    >
      {balloons.map((balloon, index) => (
        <span
          key={`balloon-${index}`}
          className="birthday-balloon"
          style={{
            left: balloon.left,
            animationDelay: balloon.delay,
            animationDuration: balloon.duration,
            ['--balloon-color' as string]: balloon.color,
            ['--balloon-size' as string]: `${balloon.size}px`,
          }}
        >
          <span className="birthday-balloon-body" />
          <span className="birthday-balloon-string" />
        </span>
      ))}

      {confetti.map((piece, index) => (
        <span
          key={`confetti-${index}`}
          className="birthday-confetti"
          style={{
            left: piece.left,
            animationDelay: piece.delay,
            animationDuration: piece.duration,
            backgroundColor: piece.color,
            width: piece.width,
            height: piece.height,
            ['--confetti-rotate' as string]: piece.rotate,
          }}
        />
      ))}

      {fireworks.map((burst, index) => (
        <span
          key={`fw-${index}`}
          className="birthday-firework"
          style={{
            left: burst.left,
            top: burst.top,
            animationDelay: burst.delay,
            ['--fw-color' as string]: burst.color,
          }}
        >
          {Array.from({ length: 8 }, (_, ray) => (
            <span
              key={ray}
              className="birthday-firework-ray"
              style={{
                ['--ray-angle' as string]: `${ray * 45}deg`,
              }}
            />
          ))}
        </span>
      ))}
    </div>
  )
}
