const STAR_POSITIONS = Array.from({ length: 48 }, (_, index) => ({
  id: `bg-star-${index}`,
  left: (index * 37 + 11) % 100,
  top: (index * 53 + 7) % 100,
  delay: ((index * 13) % 22) / 10,
  duration: 2.4 + ((index * 17) % 16) / 10,
}));

export default function AppTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative z-0 flex-1 overflow-x-hidden">
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,200,135,0.2)_1px,transparent_0)] [background-size:30px_30px]" />
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute -right-24 bottom-8 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="absolute -left-1/2 top-0 h-full w-1/2 bg-gradient-to-r from-transparent via-orange-300/12 to-transparent animate-data-sweep motion-reduce:hidden" />
        <div className="absolute right-[8%] top-20 h-28 w-28 rounded-full border border-orange-300/20 animate-float-drift motion-reduce:animate-none" />
        {STAR_POSITIONS.map((star) => (
          <span
            key={star.id}
            className="absolute h-1 w-1 rounded-full bg-orange-100/45 animate-pulse motion-reduce:animate-none"
            style={{
              left: `${star.left}%`,
              top: `${star.top}%`,
              animationDelay: `${star.delay}s`,
              animationDuration: `${star.duration}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 animate-reveal-up motion-reduce:animate-none">
        {children}
      </div>
    </div>
  );
}
