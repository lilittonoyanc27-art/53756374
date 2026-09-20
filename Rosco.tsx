import React from 'react';
import { QuestionItem } from './questions.ts';

export type LetterStatus = 'pending' | 'correct' | 'wrong' | 'passed';

interface RoscoProps {
  questions: QuestionItem[];
  currentIndex: number;
  statuses: Record<number, LetterStatus>;
  onSelectLetter: (index: number) => void;
  size?: number;
}

export const Rosco: React.FC<RoscoProps> = ({
  questions,
  currentIndex,
  statuses,
  onSelectLetter,
  size = 460,
}) => {
  const total = questions.length; // 27
  const center = size / 2;
  const radius = size * 0.405; // radius for letter centers
  const letterCircleRadius = Math.max(16, size * 0.048); // dynamically scaled

  return (
    <div className="relative flex items-center justify-center select-none" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible drop-shadow-2xl"
      >
        {/* Subtle decorative guide track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-slate-800/80 stroke-dasharray-[4_6]"
        />

        {/* Outer ambient glow */}
        <circle
          cx={center}
          cy={center}
          r={radius + letterCircleRadius + 4}
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          className="text-sky-500/15"
        />

        {/* Rosco Letters */}
        {questions.map((q, idx) => {
          // Angle starts at top (-90 deg = -PI/2) and rotates clockwise
          const angle = -Math.PI / 2 + (idx * 2 * Math.PI) / total;
          const x = center + radius * Math.cos(angle);
          const y = center + radius * Math.sin(angle);
          const status = statuses[idx] || 'pending';
          const isActive = idx === currentIndex;

          // TV Show Pasapalabra colors
          let fillColor = '#1e3a8a'; // rich deep blue (pending)
          let strokeColor = '#3b82f6';
          let textColor = '#ffffff';

          if (status === 'correct') {
            fillColor = '#15803d'; // rich TV emerald green
            strokeColor = '#22c55e';
          } else if (status === 'wrong') {
            fillColor = '#b91c1c'; // rich TV red
            strokeColor = '#ef4444';
          } else if (status === 'passed') {
            fillColor = '#1d4ed8'; // blue with pulse
            strokeColor = '#60a5fa';
          }

          return (
            <g
              key={q.id}
              className="cursor-pointer transition-transform duration-200 hover:scale-115 origin-center"
              style={{
                transformOrigin: `${x}px ${y}px`,
              }}
              onClick={() => onSelectLetter(idx)}
            >
              {/* Active glow ring */}
              {isActive && (
                <circle
                  cx={x}
                  cy={y}
                  r={letterCircleRadius + 5}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="3.5"
                  className="animate-pulse"
                >
                  <animate
                    attributeName="r"
                    values={`${letterCircleRadius + 4};${letterCircleRadius + 8};${letterCircleRadius + 4}`}
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.9;0.4;0.9"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}

              {/* Base letter circle */}
              <circle
                cx={x}
                cy={y}
                r={letterCircleRadius}
                fill={fillColor}
                stroke={isActive ? '#fef08a' : strokeColor}
                strokeWidth={isActive ? 3 : 2}
                className="transition-colors duration-300"
              />

              {/* Highlight gradient shine on top half */}
              <path
                d={`M ${x - letterCircleRadius + 2} ${y} A ${letterCircleRadius - 2} ${letterCircleRadius - 2} 0 0 1 ${x + letterCircleRadius - 2} ${y} Z`}
                fill="#ffffff"
                fillOpacity="0.22"
              />

              {/* Letter text */}
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                fill={textColor}
                fontSize={letterCircleRadius * 1.05}
                fontWeight="800"
                fontFamily="Outfit, system-ui, sans-serif"
                style={{
                  textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                }}
              >
                {q.letter}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
