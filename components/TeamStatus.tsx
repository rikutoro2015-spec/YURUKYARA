
import React from 'react';
import { Mascot } from '../types';

interface TeamStatusProps {
  team: Mascot[];
  activeIndex: number;
  isOpponent?: boolean;
}

const TeamStatus: React.FC<TeamStatusProps> = ({ team, activeIndex, isOpponent }) => {
  return (
    <div className={`flex gap-2 ${isOpponent ? 'flex-row-reverse' : 'flex-row'}`}>
      {team.map((m, i) => {
        const isFainted = m.hp <= 0;
        const isActive = i === activeIndex;
        return (
          <div 
            key={m.id} 
            className={`relative w-12 h-12 rounded-full border-2 overflow-hidden transition-all duration-300
              ${isActive ? (isOpponent ? 'border-red-500 scale-110 shadow-lg' : 'border-blue-500 scale-110 shadow-lg') : 'border-gray-200'}
              ${isFainted ? 'grayscale brightness-50' : ''}`}
          >
            <img src={m.imageUrl} alt={m.name} className="w-full h-full object-cover" />
            {isFainted && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-[10px] font-bold">
                KO
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-300">
               <div 
                className={`h-full transition-all duration-500 ${m.hp > 50 ? 'bg-green-400' : 'bg-red-400'}`} 
                style={{ width: `${Math.max(0, (m.hp / m.maxHp) * 100)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TeamStatus;
