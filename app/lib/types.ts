export type PlayerColor = 'red' | 'blue' | 'green' | 'yellow';

export interface Pawn {
  id: string;
  color: PlayerColor;
  position: number; // 0-67 for main track
  status: 'start' | 'board' | 'home-path' | 'home';
  homePathPos?: number; // 1-7
}

export interface Player {
  id: string;
  name: string;
  color: PlayerColor;
  pawns: Pawn[];
  hasPaid: boolean;
  isCpu: boolean;
}

export interface GameState {
  players: Player[];
  currentTurn: number;
  dice: number[];
  canRoll: boolean;
  selectedPawnId: string | null;
  winner: PlayerColor | null;
  logs: string[];
}
