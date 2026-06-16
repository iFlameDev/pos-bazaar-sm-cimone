import React from 'react';

const Ornaments = () => {
  return (
    <div className="fixed top-0 left-0 right-0 h-16 pointer-events-none z-[100] overflow-hidden">
      <div className="absolute top-0 left-0 right-0 flex justify-around">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className={`w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[25px] drop-shadow-sm origin-top animate-swing ${
              ['border-t-carnival-pink', 'border-t-carnival-blue', 'border-t-carnival-yellow', 'border-t-carnival-green'][i % 4]
            }`}
            style={{ animationDelay: `${i * 0.1}s` }}
          />
        ))}
      </div>
    </div>
  );
};

export default Ornaments;
