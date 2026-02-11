
export interface Move {
  name: string;
  power: number;
  description: string;
  type: 'attack' | 'heal' | 'buff';
}

export interface Mascot {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  moves: Move[];
  element: string;
}

export type BattleMode = 'single' | 'team';

export interface BattleState {
  playerTeam: Mascot[];
  opponentTeam: Mascot[];
  playerActiveIndex: number;
  opponentActiveIndex: number;
  turn: number;
  isPlayerTurn: boolean;
  logs: string[];
  isGameOver: boolean;
  winner?: Mascot[];
}

export enum GameStage {
  START = 'START',
  GENERATING = 'GENERATING',
  BATTLE = 'BATTLE',
  RESULT = 'RESULT'
}
