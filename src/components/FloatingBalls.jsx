import React, { useEffect, useState, useRef } from 'react';

const EMOJIS = ['⚽', '🏀', '🏈', '🏐'];

const FloatingBalls = () => {
  const [balls, setBalls] = useState([]);
  const lastSpawnTime = useRef(0);
  const scrollTimeout = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      const now = Date.now();
      
      // Throttle spawn rate to 1 ball per 300ms of active scrolling (reduced intensity by 50%)
      if (now - lastSpawnTime.current > 300) {
        lastSpawnTime.current = now;
        
        const newBall = {
          id: crypto.randomUUID(),
          emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
          left: Math.random() * 80 + 10, // 10% to 90% horizontal position
          size: Math.random() * 20 + 30, // 30px to 50px
          duration: Math.random() * 0.4 + 1.2, // 1.2s to 1.6s
        };

        setBalls((prev) => [...prev, newBall]);

        // Remove the ball after its animation completes
        setTimeout(() => {
          setBalls((prev) => prev.filter((b) => b.id !== newBall.id));
        }, newBall.duration * 1000);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[50]">
      {balls.map((ball) => (
        <div
          key={ball.id}
          className="absolute bottom-[-100px]"
          style={{
            left: `${ball.left}%`,
            fontSize: `${ball.size}px`,
            animation: `bounceUp ${ball.duration}s forwards`,
          }}
        >
          {ball.emoji}
        </div>
      ))}
    </div>
  );
};

export default FloatingBalls;
