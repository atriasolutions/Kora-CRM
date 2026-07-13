/** Globos cayendo + fuegos artificiales para el día de cumpleaños. */
export function WelcomeBirthdayEffects() {
  const balloons = [
    { left: '6%', delay: '0s', duration: '9s', color: '#ff6b9d', size: 28 },
    { left: '14%', delay: '1.2s', duration: '11s', color: '#ffd166', size: 22 },
    { left: '22%', delay: '0.4s', duration: '10s', color: '#06d6a0', size: 26 },
    { left: '33%', delay: '2.1s', duration: '12s', color: '#4cc9f0', size: 24 },
    { left: '41%', delay: '0.8s', duration: '9.5s', color: '#f72585', size: 30 },
    { left: '52%', delay: '1.6s', duration: '11.5s', color: '#ff9f1c', size: 23 },
    { left: '61%', delay: '0.2s', duration: '10.5s', color: '#7b2cbf', size: 27 },
    { left: '72%', delay: '2.4s', duration: '9.8s', color: '#2ec4b6', size: 25 },
    { left: '81%', delay: '1s', duration: '12.2s', color: '#ef476f', size: 29 },
    { left: '90%', delay: '1.8s', duration: '10.2s', color: '#118ab2', size: 22 },
  ]

  const fireworks = [
    { left: '12%', top: '18%', delay: '0s', color: '#ff6b9d' },
    { left: '28%', top: '28%', delay: '1.4s', color: '#ffd166' },
    { left: '48%', top: '14%', delay: '0.7s', color: '#4cc9f0' },
    { left: '68%', top: '24%', delay: '2.1s', color: '#06d6a0' },
    { left: '84%', top: '16%', delay: '1.1s', color: '#f72585' },
    { left: '38%', top: '40%', delay: '2.8s', color: '#ff9f1c' },
  ]

  const confetti = Array.from({ length: 24 }, (_, i) => ({
    left: `${4 + ((i * 17) % 92)}%`,
    delay: `${(i % 8) * 0.35}s`,
    duration: `${5.5 + (i % 5) * 0.7}s`,
    color: ['#ff6b9d', '#ffd166', '#06d6a0', '#4cc9f0', '#f72585', '#ff9f1c'][i % 6]!,
    rotate: `${(i * 37) % 360}deg`,
    width: 6 + (i % 4) * 2,
    height: 10 + (i % 3) * 3,
  }))

  return (
    <div
      className="birthday-fx pointer-events-none fixed inset-0 z-40 overflow-hidden"
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
          {Array.from({ length: 10 }, (_, ray) => (
            <span
              key={ray}
              className="birthday-firework-ray"
              style={{
                ['--ray-angle' as string]: `${ray * 36}deg`,
              }}
            />
          ))}
        </span>
      ))}
    </div>
  )
}
