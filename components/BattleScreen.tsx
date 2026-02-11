
import React, { useState, useEffect, useRef } from 'react';
import { Mascot, Move, BattleState } from '../types';
import { getNarrativeAction } from '../services/geminiService';
import MascotCard from './MascotCard';
import TeamStatus from './TeamStatus';

interface BattleScreenProps {
  playerTeam: Mascot[];
  opponentTeam: Mascot[];
  onBattleEnd: (winnerTeam: Mascot[], logs: string[]) => void;
}

const BattleScreen: React.FC<BattleScreenProps> = ({ playerTeam, opponentTeam, onBattleEnd }) => {
  const [state, setState] = useState<BattleState>({
    playerTeam: playerTeam.map(m => ({ ...m })),
    opponentTeam: opponentTeam.map(m => ({ ...m })),
    playerActiveIndex: 0,
    opponentActiveIndex: 0,
    turn: 1,
    isPlayerTurn: true,
    logs: [`戦闘開始！`],
    isGameOver: false
  });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [showStartOverlay, setShowStartOverlay] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  
  // Animation states
  const [playerAnim, setPlayerAnim] = useState<'idle' | 'attack' | 'hit' | 'buff'>('idle');
  const [opponentAnim, setOpponentAnim] = useState<'idle' | 'attack' | 'hit' | 'buff'>('idle');
  const [isScreenShaking, setIsScreenShaking] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const loopRef = useRef<number | null>(null);

  // Background Music Synthesis
  useEffect(() => {
    if (isMuted) {
      if (audioContextRef.current) {
        audioContextRef.current.suspend();
      }
      return;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    } else {
      audioContextRef.current.resume();
    }

    const ctx = audioContextRef.current;
    const tempo = 130;
    const secondsPerBeat = 60 / tempo;
    
    const melody = [261.63, 293.66, 329.63, 392.00, 440.00, 392.00, 329.63, 293.66];
    let noteIndex = 0;

    const playNote = (time: number) => {
      if (isMuted || ctx.state === 'suspended') return;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle'; 
      osc.frequency.setValueAtTime(melody[noteIndex % melody.length], time);
      
      gain.gain.setValueAtTime(0.1, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + secondsPerBeat * 0.8);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(time);
      osc.stop(time + secondsPerBeat);
      
      noteIndex++;
      const nextTime = time + secondsPerBeat;
      loopRef.current = window.setTimeout(() => playNote(nextTime), secondsPerBeat * 1000);
    };

    if (ctx.state === 'running' || ctx.state === 'suspended') {
      playNote(ctx.currentTime);
    }

    return () => {
      if (loopRef.current) clearTimeout(loopRef.current);
    };
  }, [isMuted]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [state.logs]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowStartOverlay(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const activePlayer = state.playerTeam[state.playerActiveIndex];
  const activeOpponent = state.opponentTeam[state.opponentActiveIndex];

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const executeMove = async (attacker: Mascot, defender: Mascot, move: Move, isPlayer: boolean) => {
    setIsProcessing(true);
    
    // Trigger Attacker Animation (Explosive lunge starts now)
    if (isPlayer) {
      setPlayerAnim(move.type === 'attack' ? 'attack' : 'buff');
    } else {
      setOpponentAnim(move.type === 'attack' ? 'attack' : 'buff');
    }

    // Wait for anticipation + impact moment (around 200ms in our new 350ms anim)
    await sleep(200); 

    let resultText = "";
    const nextPlayerTeam = [...state.playerTeam];
    const nextOpponentTeam = [...state.opponentTeam];
    
    const currentAttacker = isPlayer ? nextPlayerTeam[state.playerActiveIndex] : nextOpponentTeam[state.opponentActiveIndex];
    const currentDefender = isPlayer ? nextOpponentTeam[state.opponentActiveIndex] : nextPlayerTeam[state.playerActiveIndex];

    if (move.type === 'attack') {
      const damage = Math.max(5, move.power + currentAttacker.attack - currentDefender.defense);
      currentDefender.hp -= damage;
      resultText = `${damage}のダメージ！`;
      
      // Global impact effect
      setIsScreenShaking(true);
      
      // Trigger Defender Hit Animation
      if (isPlayer) setOpponentAnim('hit');
      else setPlayerAnim('hit');
      
      // Stop screen shake after a moment
      setTimeout(() => setIsScreenShaking(false), 200);
    } else if (move.type === 'heal') {
      const heal = move.power;
      currentAttacker.hp = Math.min(currentAttacker.maxHp, currentAttacker.hp + heal);
      resultText = `${heal}回復した！`;
    } else if (move.type === 'buff') {
      currentAttacker.attack += 5;
      resultText = `攻撃力が上がった！`;
    }

    // Fetch narrative concurrently to avoid blocking UI feel
    const narrationPromise = getNarrativeAction(currentAttacker, currentDefender, move, resultText);
    
    await sleep(300); // Snappy hit animation duration
    
    // Reset Animations
    setPlayerAnim('idle');
    setOpponentAnim('idle');

    const narration = await narrationPromise;

    let gameOver = false;
    let nextPlayerIdx = state.playerActiveIndex;
    let nextOpponentIdx = state.opponentActiveIndex;
    const additionalLogs: string[] = [narration];

    if (currentDefender.hp <= 0) {
      if (isPlayer) {
        if (state.opponentActiveIndex < state.opponentTeam.length - 1) {
          nextOpponentIdx++;
          additionalLogs.push(`💥 ${currentDefender.name}が倒れた！ ${nextOpponentTeam[nextOpponentIdx].name}が登場！`);
        } else {
          gameOver = true;
        }
      } else {
        if (state.playerActiveIndex < state.playerTeam.length - 1) {
          nextPlayerIdx++;
          additionalLogs.push(`💥 ${currentDefender.name}が倒れた！次は ${nextPlayerTeam[nextPlayerIdx].name}に任せた！`);
        } else {
          gameOver = true;
        }
      }
    }

    const finalLogs = [...state.logs, ...additionalLogs];

    if (gameOver) {
      const winnerTeam = isPlayer ? nextPlayerTeam : nextOpponentTeam;
      const winnerName = isPlayer ? "プレイヤーチーム" : "ライバルチーム";
      const victoryLog = `🎊 決着！${winnerName}の完全勝利です！`;
      setState(prev => ({ 
        ...prev, 
        playerTeam: nextPlayerTeam,
        opponentTeam: nextOpponentTeam,
        isGameOver: true, 
        winner: winnerTeam,
        logs: [...finalLogs, victoryLog]
      }));
      
      setTimeout(() => onBattleEnd(winnerTeam, [...finalLogs, victoryLog]), 3000);
      return;
    }

    setState(prev => ({
      ...prev,
      playerTeam: nextPlayerTeam,
      opponentTeam: nextOpponentTeam,
      playerActiveIndex: nextPlayerIdx,
      opponentActiveIndex: nextOpponentIdx,
      logs: finalLogs,
      isPlayerTurn: !isPlayer
    }));

    setIsProcessing(false);

    if (isPlayer) {
      // Enemy reacts faster
      setTimeout(() => {
        const currentOpp = nextOpponentTeam[nextOpponentIdx];
        const currentPlr = nextPlayerTeam[nextPlayerIdx];
        opponentAction(currentOpp, currentPlr);
      }, 800);
    }
  };

  const opponentAction = async (opp: Mascot, plr: Mascot) => {
    const move = opp.moves[Math.floor(Math.random() * opp.moves.length)];
    await executeMove(opp, plr, move, false);
  };

  const handlePlayerMove = (move: Move) => {
    if (!state.isPlayerTurn || isProcessing || state.isGameOver || showStartOverlay) return;
    executeMove(activePlayer, activeOpponent, move, true);
  };

  return (
    <div className={`max-w-4xl mx-auto w-full p-4 space-y-4 relative transition-transform duration-75 ${isScreenShaking ? 'animate-screen-shake' : ''}`}>
      {showStartOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-white/80 backdrop-blur-sm w-full h-40 flex items-center justify-center border-y-8 border-orange-500 shadow-2xl animate-[bounce_1s_infinite]">
            <span className="text-6xl md:text-8xl font-black text-orange-600 drop-shadow-[0_4px_4px_rgba(0,0,0,0.25)] tracking-tighter">
              戦闘開始！
            </span>
          </div>
        </div>
      )}

      <div className="absolute top-0 right-4 z-20">
        <button 
          onClick={() => setIsMuted(!isMuted)}
          className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center text-orange-500 hover:bg-orange-50 transition-colors border border-orange-100"
        >
          <i className={`fas ${isMuted ? 'fa-volume-mute' : 'fa-volume-up'}`}></i>
        </button>
      </div>

      <div className="flex justify-between items-end mb-2 px-4 pt-4">
        <TeamStatus team={state.playerTeam} activeIndex={state.playerActiveIndex} />
        <div className="text-orange-500 font-black text-xl italic animate-pulse">VS</div>
        <TeamStatus team={state.opponentTeam} activeIndex={state.opponentActiveIndex} isOpponent />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div className="flex flex-col items-center">
          <MascotCard mascot={activePlayer} animation={playerAnim} />
        </div>
        <div className="flex flex-col items-center">
          <MascotCard mascot={activeOpponent} animation={opponentAnim} isOpponent />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-inner p-4 h-40 overflow-y-auto border-2 border-orange-100" ref={scrollRef}>
        {state.logs.map((log, i) => (
          <div key={i} className="mb-2 text-gray-700 text-sm animate-fadeIn flex items-start gap-2">
            <span className="text-orange-400 mt-1 font-bold"><i className="fas fa-bolt"></i></span>
            <span className={log.includes('💥') ? 'text-red-600 font-bold' : ''}>{log}</span>
          </div>
        ))}
        {isProcessing && <div className="text-gray-400 italic text-xs">実況を生成中...</div>}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {activePlayer.moves.map((move, i) => (
          <button
            key={i}
            onClick={() => handlePlayerMove(move)}
            disabled={!state.isPlayerTurn || isProcessing || state.isGameOver || showStartOverlay}
            className={`p-3 rounded-xl text-white font-bold transition-all shadow-lg transform hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
              ${move.type === 'attack' ? 'bg-gradient-to-r from-red-500 to-pink-600 hover:brightness-110' : 
                move.type === 'heal' ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:brightness-110' : 
                'bg-gradient-to-r from-blue-500 to-indigo-600 hover:brightness-110'}`}
          >
            <div className="text-[10px] uppercase opacity-75">{move.type}</div>
            <div className="text-base truncate">{move.name}</div>
            <div className="text-[10px] font-normal mt-1 leading-tight line-clamp-2 opacity-80">{move.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default BattleScreen;
