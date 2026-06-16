import React, { useEffect, useState } from 'react';

const balls = Array.from({ length: 15 }).map((_, i) => ({
  id: i,
  size: Math.random() * 50 + 20,
  left: Math.random() * 100,
  top: Math.random() * 100, // percentage of viewport
  color: ['#f72585', '#4cc9f0', '#f8961e', '#f9c74f', '#43aa8b'][i % 5],
  speed: Math.random() * 0.4 + 0.1,
  delay: Math.random() * 2,
}));

const FloatingBalls = () => {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[1] opacity-30">
      {balls.map((ball) => (
        <div
          key={ball.id}
          className="absolute rounded-full animate-pulse shadow-sm"
          style={{
            width: ball.size,
            height: ball.size,
            left: `${ball.left}%`,
            top: `${ball.top}%`,
            backgroundColor: ball.color,
            transform: `translateY(${scrollY * ball.speed * -1}px)`,
            animationDuration: `${3 + ball.speed * 2}s`,
            animationDelay: `${ball.delay}s`,
          }}
        />
      ))}
    </div>
  );
};

export default FloatingBalls;
