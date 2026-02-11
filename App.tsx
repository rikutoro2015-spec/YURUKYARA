
import React, { useState, useEffect } from 'react';
import { Mascot, GameStage, BattleMode } from './types';
import { generateMascot, generateTeam, generateVictoryMessage } from './services/geminiService';
import BattleScreen from './components/BattleScreen';

const App: React.FC = () => {
  const [stage, setStage] = useState<GameStage>(GameStage.START);
  const [mode, setMode] = useState<BattleMode>('single');
  const [theme, setTheme] = useState('');
  const [playerTeam, setPlayerTeam] = useState<Mascot[]>([]);
  const [opponentTeam, setOpponentTeam] = useState<Mascot[]>([]);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [winnerTeam, setWinnerTeam] = useState<Mascot[] | null>(null);
  const [victorySpeech, setVictorySpeech] = useState<string>('');
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  const [hasCustomKey, setHasCustomKey] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasCustomKey(hasKey);
      }
    };
    checkKey();
  }, [stage]);

  const handleOpenKeyDialog = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setIsQuotaExceeded(false);
      setHasCustomKey(true);
      // After selecting key, we don't need to delay, but the app is now ready with a new key
    } else {
      window.open('https://ai.google.dev/gemini-api/docs/billing', '_blank');
    }
  };

  const handleStartGeneration = async () => {
    if (!theme.trim()) return;
    
    setStage(GameStage.GENERATING);
    setIsQuotaExceeded(false);

    try {
      if (mode === 'single') {
        setLoadingMsg("あなたのゆるキャラを生成しています...");
        const p = await generateMascot(theme);
        setPlayerTeam([p]);
        
        setLoadingMsg("ライバルゆるキャラを生成しています...");
        const rivalThemes = ['宇宙の猫', 'お菓子の騎士', '雷のカッパ', 'おにぎり忍者', '火炎パンダ', '氷のペンギン'];
        const o = await generateMascot(rivalThemes[Math.floor(Math.random() * rivalThemes.length)]);
        setOpponentTeam([o]);
      } else {
        setLoadingMsg("最強のゆるキャラチームを結成しています...");
        const pTeam = await generateTeam(theme);
        setPlayerTeam(pTeam);
        
        setLoadingMsg("ライバルチームがアップを始めました...");
        const rivalTheme = ['深海の伝説', '森のオーケストラ', 'デジタル戦隊', '古代の精霊', '銀河の守護者'][Math.floor(Math.random() * 5)];
        const oTeam = await generateTeam(rivalTheme);
        setOpponentTeam(oTeam);
      }
      
      setStage(GameStage.BATTLE);
    } catch (error: any) {
      console.error(error);
      if (error?.message?.includes('429') || error?.status === 429) {
        setIsQuotaExceeded(true);
      } else {
        alert("生成中にエラーが発生しました。もう一度お試しください。");
      }
      setStage(GameStage.START);
    }
  };

  const handleBattleEnd = async (win: Mascot[], logs: string[]) => {
    setWinnerTeam(win);
    setStage(GameStage.RESULT);
    
    try {
      const speech = await generateVictoryMessage(win, logs);
      setVictorySpeech(speech);
    } catch (e) {
      setVictorySpeech("素晴らしい戦いでした！おめでとう！");
    }
  };

  const resetGame = () => {
    setStage(GameStage.START);
    setTheme('');
    setPlayerTeam([]);
    setOpponentTeam([]);
    setWinnerTeam(null);
    setVictorySpeech('');
    setIsQuotaExceeded(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-orange-50">
      <header className="py-6 text-center">
        <h1 className="text-4xl md:text-5xl font-black text-orange-600 drop-shadow-sm mb-1">
          ゆるキャラ・バトル
        </h1>
        <div className="flex items-center justify-center gap-2">
           <span className="h-1 w-8 bg-orange-300 rounded-full"></span>
           <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">AI-Powered Combat</p>
           <span className="h-1 w-8 bg-orange-300 rounded-full"></span>
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl flex flex-col items-center justify-center">
        {stage === GameStage.START && (
          <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full border-4 border-orange-200">
            {isQuotaExceeded && (
              <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-2xl animate-shake">
                <p className="text-red-600 font-bold text-sm mb-2 text-center">
                  <i className="fas fa-exclamation-triangle mr-2"></i>
                  アクセス制限がかかりました (Quota Exceeded)
                </p>
                <p className="text-gray-600 text-xs mb-3 text-center">
                  無料枠の制限を超えた可能性があります。時間を置くか、ご自身のAPIキーをご利用ください。
                </p>
                <button 
                  onClick={handleOpenKeyDialog}
                  className="w-full py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl text-xs transition-colors shadow-sm"
                >
                  自分のAPIキーを設定する
                </button>
                <p className="mt-2 text-[10px] text-center text-gray-400 italic">
                  ※ 課金設定済みのプロジェクトのキーが必要です
                </p>
              </div>
            )}

            <div className="text-center mb-6">
              <i className="fas fa-wand-magic-sparkles text-5xl text-orange-400 mb-4 block"></i>
              <h2 className="text-2xl font-bold text-gray-800">参戦準備</h2>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2 uppercase">Battle Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setMode('single')}
                    className={`py-2 px-4 rounded-xl font-bold border-2 transition-all ${mode === 'single' ? 'bg-orange-100 border-orange-500 text-orange-600' : 'bg-white border-gray-100 text-gray-400'}`}
                  >
                    1 vs 1
                  </button>
                  <button 
                    onClick={() => setMode('team')}
                    className={`py-2 px-4 rounded-xl font-bold border-2 transition-all ${mode === 'team' ? 'bg-orange-100 border-orange-500 text-orange-600' : 'bg-white border-gray-100 text-gray-400'}`}
                  >
                    3 vs 3
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2 uppercase">Character Theme</label>
                <input 
                  type="text" 
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  placeholder="例: たこ焼き、宇宙のサメ..."
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-orange-400 outline-none transition-colors"
                />
              </div>

              <button 
                onClick={handleStartGeneration}
                disabled={!theme}
                className="w-full py-4 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white font-black text-xl rounded-2xl shadow-lg transform transition active:scale-95"
              >
                生成してバトル！
              </button>

              {hasCustomKey && (
                <div className="pt-2 text-center">
                   <p className="text-[10px] text-green-500 font-bold flex items-center justify-center gap-1">
                     <i className="fas fa-check-circle"></i> 自前APIキーを使用中
                   </p>
                </div>
              )}
            </div>
          </div>
        )}

        {stage === GameStage.GENERATING && (
          <div className="text-center">
            <div className="mb-8 relative">
              <div className="w-20 h-20 border-8 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto"></div>
              <i className="fas fa-magic text-2xl text-orange-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></i>
            </div>
            <p className="text-xl font-bold text-orange-800 animate-pulse">{loadingMsg}</p>
            <p className="text-gray-400 mt-4 text-sm italic">AIが魂を込めて描いています...</p>
          </div>
        )}

        {stage === GameStage.BATTLE && playerTeam.length > 0 && opponentTeam.length > 0 && (
          <BattleScreen 
            playerTeam={playerTeam} 
            opponentTeam={opponentTeam} 
            onBattleEnd={handleBattleEnd} 
          />
        )}

        {stage === GameStage.RESULT && winnerTeam && (
          <div className="text-center animate-fadeIn p-8 bg-white rounded-3xl shadow-2xl border-4 border-orange-300 max-w-2xl w-full">
            <h2 className="text-5xl font-black text-orange-600 mb-6 italic animate-bounce">VICTORY!</h2>
            
            {victorySpeech ? (
              <div className="relative mb-8 bg-orange-50 p-6 rounded-2xl border-2 border-orange-200 shadow-inner">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-3 py-1 rounded-full text-[10px] font-bold text-orange-400 border border-orange-100 uppercase">Commentary</div>
                <p className="text-gray-700 text-lg font-bold italic leading-relaxed">
                  「{victorySpeech}」
                </p>
              </div>
            ) : (
              <div className="mb-8 p-6 text-gray-400 animate-pulse italic">実況者からのメッセージを待機中...</div>
            )}

            <div className="flex justify-center gap-4 mb-8">
              {winnerTeam.map((m, i) => (
                <div key={m.id} className="text-center">
                  <div className={`w-32 h-32 bg-gray-50 rounded-2xl border-2 p-2 mb-2 ${m.hp > 0 ? 'border-orange-200' : 'border-gray-200 grayscale brightness-75'}`}>
                    <img src={m.imageUrl} alt={m.name} className="w-full h-full object-contain bouncy" />
                  </div>
                  <p className="text-xs font-bold text-gray-600 truncate w-32">{m.name}</p>
                  {m.hp <= 0 && <p className="text-[10px] text-red-400 font-bold uppercase">Knock Out</p>}
                </div>
              ))}
            </div>

            <button 
              onClick={resetGame}
              className="px-12 py-4 bg-orange-500 hover:bg-orange-600 text-white font-black text-xl rounded-2xl shadow-lg transform transition active:scale-95"
            >
              ホームに戻る
            </button>
          </div>
        )}
      </main>

      <footer className="w-full py-4 text-center text-gray-300 text-[10px]">
        &copy; 2024 Yuru-Chara Ultimate Battle | Gemini Powered
      </footer>
    </div>
  );
};

export default App;
