
import React from 'react';
import { Mascot } from '../types';

interface MascotCardProps {
  mascot: Mascot;
  isOpponent?: boolean;
  animation?: 'idle' | 'attack' | 'hit' | 'buff';
}

const MascotCard: React.FC<MascotCardProps> = ({ mascot, isOpponent, animation = 'idle' }) => {
  const hpPercent = (mascot.hp / mascot.maxHp) * 100;
  const hpColor = hpPercent > 50 ? 'bg-green-400' : hpPercent > 20 ? 'bg-yellow-400' : 'bg-red-500';

  const getAnimationClass = () => {
    switch (animation) {
      case 'attack':
        return isOpponent ? 'animate-lunge-left' : 'animate-lunge-right';
      case 'hit':
        return 'animate-shake-heavy animate-flash-red';
      case 'buff':
        return 'animate-flash-white';
      default:
        return 'bouncy';
    }
  };

  return (
    <div className={`flex flex-col items-center p-4 bg-white rounded-3xl shadow-xl transition-all duration-500 ${isOpponent ? 'border-4 border-red-200' : 'border-4 border-blue-200'} ${mascot.hp <= 0 ? 'grayscale brightness-75 opacity-50' : ''}`}>
      <div className="relative w-48 h-48 mb-4 overflow-visible rounded-2xl bg-gray-50/50 flex items-center justify-center">
        <img 
          src={mascot.imageUrl} 
          alt={mascot.name} 
          className={`object-contain w-full h-full transition-transform duration-300 ${getAnimationClass()}`} 
        />
        {animation === 'buff' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
             <i className="fas fa-sparkles text-yellow-400 text-5xl animate-ping"></i>
          </div>
        )}
      </div>
      
      <div className="w-full">
        <div className="flex justify-between items-center mb-1">
          <span className="font-bold text-lg text-gray-800">{mascot.name}</span>
          <span className="text-sm px-2 py-0.5 bg-gray-100 rounded-full text-gray-600 font-mono">{mascot.element}</span>
        </div>
        
        <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden mb-1 shadow-inner">
          <div 
            className={`h-full transition-all duration-300 ${hpColor}`} 
            style={{ width: `${Math.max(0, hpPercent)}%` }}
          />
        </div>
        <div className="text-right text-xs font-bold text-gray-400">
          HP: {Math.max(0, mascot.hp)} / {mascot.maxHp}
        </div>
      </div>
    </div>
  );
};

export default MascotCard;
