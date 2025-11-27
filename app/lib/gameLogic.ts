import { GameState, Pawn, Player, PlayerColor } from './types';

export const BOARD_SIZE = 52;
export const HOME_PATH_LENGTH = 5;

const START_POSITIONS: Record<PlayerColor, number> = {
    red: 4,
    green: 17,
    yellow: 30,
    blue: 43,
};

const HOME_ENTRANCES: Record<PlayerColor, number> = {
    red: 3,
    green: 16,
    yellow: 29,
    blue: 42,
};

export function initializeGame(): GameState {
    const colors: PlayerColor[] = ['red', 'blue', 'green', 'yellow'];
    const players: Player[] = colors.map((color, index) => ({
        id: `player-${index}`,
        name: index === 0 ? `Player ${color}` : `CPU ${color}`,
        color,
        hasPaid: false,
        isCpu: index !== 0, // First player is human, others are CPU
        pawns: Array.from({ length: 4 }).map((_, i) => ({
            id: `${color}-${i}`,
            color,
            position: -1,
            status: 'start',
        })),
    }));

    return {
        players,
        currentTurn: 0,
        dice: [],
        canRoll: true,
        selectedPawnId: null,
        winner: null,
        logs: ['Game initialized. Waiting for players...'],
    };
}

export function rollDice(state: GameState): GameState {
    if (!state.canRoll) return state;

    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;

    return {
        ...state,
        dice: [d1, d2],
        canRoll: false,
        logs: [...state.logs, `${state.players[state.currentTurn].name} rolled ${d1} and ${d2}`],
    };
}

export function skipTurn(state: GameState): GameState {
    return {
        ...state,
        canRoll: true,
        currentTurn: (state.currentTurn + 1) % 4,
        dice: [],
        logs: [...state.logs, `${state.players[state.currentTurn].name} skipped turn`],
    };
}

// Simplified move logic
export function movePawn(state: GameState, pawnId: string, steps: number): GameState {
    // Find pawn and player
    const playerIndex = state.players.findIndex(p => p.pawns.some(pw => pw.id === pawnId));
    if (playerIndex === -1) return state;

    const player = state.players[playerIndex];
    const pawnIndex = player.pawns.findIndex(p => p.id === pawnId);
    const pawn = player.pawns[pawnIndex];

    // Logic to move pawn
    let newPawn = { ...pawn };
    let moveSuccessful = false;

    if (pawn.status === 'start') {
        if (steps >= 5) {
            newPawn.status = 'board';
            newPawn.position = START_POSITIONS[player.color];
            moveSuccessful = true;
        }
    } else if (pawn.status === 'board') {
        const entrance = HOME_ENTRANCES[player.color];
        // Calculate distance to entrance
        const distToEntrance = (entrance - pawn.position + BOARD_SIZE) % BOARD_SIZE;

        if (steps > distToEntrance) {
            // Enter home path
            const stepsIntoHome = steps - distToEntrance - 1;
            if (stepsIntoHome < HOME_PATH_LENGTH) {
                newPawn.status = 'home-path';
                newPawn.position = -1; // No longer on main board
                newPawn.homePathPos = stepsIntoHome;
                moveSuccessful = true;
            } else if (stepsIntoHome === HOME_PATH_LENGTH) {
                // Reached home!
                newPawn.status = 'home';
                newPawn.position = -1;
                newPawn.homePathPos = HOME_PATH_LENGTH;
                moveSuccessful = true;
            } else {
                // Overshot home, cannot move
                moveSuccessful = false;
            }
        } else {
            // Normal move on board
            newPawn.position = (pawn.position + steps) % BOARD_SIZE;
            moveSuccessful = true;
        }
    } else if (pawn.status === 'home-path') {
        const currentHomePos = pawn.homePathPos || 0;
        const newHomePos = currentHomePos + steps;

        if (newHomePos < HOME_PATH_LENGTH) {
            newPawn.homePathPos = newHomePos;
            moveSuccessful = true;
        } else if (newHomePos === HOME_PATH_LENGTH) {
            newPawn.status = 'home';
            newPawn.homePathPos = HOME_PATH_LENGTH;
            moveSuccessful = true;
        } else {
            // Overshot
            moveSuccessful = false;
        }
    }

    if (!moveSuccessful) return state;

    const newPlayers = [...state.players];
    newPlayers[playerIndex] = {
        ...player,
        pawns: [
            ...player.pawns.slice(0, pawnIndex),
            newPawn,
            ...player.pawns.slice(pawnIndex + 1),
        ]
    };

    // Check win condition
    const allHome = newPlayers[playerIndex].pawns.every(p => p.status === 'home');
    let winner = state.winner;
    if (allHome) {
        winner = player.color;
    }

    return {
        ...state,
        players: newPlayers,
        canRoll: true, // Should be next turn logic
        currentTurn: (state.currentTurn + 1) % 4,
        dice: [],
        winner,
        logs: [...state.logs, `${player.name} moved pawn`],
    };
}

export function hasValidMoves(state: GameState): boolean {
    const player = state.players[state.currentTurn];
    const steps = state.dice.reduce((a, b) => a + b, 0);

    if (steps === 0) return false;

    // Check if any pawn can move
    return player.pawns.some(pawn => {
        if (pawn.status === 'start') {
            return steps >= 5;
        }
        if (pawn.status === 'home') return false;

        // For board and home-path, assume move is valid unless overshot
        // We could duplicate the logic from movePawn to be precise, 
        // but for now, let's assume if they are on board, they can likely move 
        // unless they are right at the end of home path.

        if (pawn.status === 'home-path') {
            const currentHomePos = pawn.homePathPos || 0;
            return (currentHomePos + steps) <= HOME_PATH_LENGTH;
        }

        // Board pawn might overshoot home entrance?
        // movePawn logic handles overshooting home.
        // Let's do a quick check:
        if (pawn.status === 'board') {
            const entrance = HOME_ENTRANCES[player.color];
            const distToEntrance = (entrance - pawn.position + BOARD_SIZE) % BOARD_SIZE;
            if (steps > distToEntrance) {
                const stepsIntoHome = steps - distToEntrance - 1;
                return stepsIntoHome <= HOME_PATH_LENGTH;
            }
        }

        return true;
    });
}

export function performCpuTurn(state: GameState): GameState {
    // 1. Roll Dice
    let nextState = rollDice(state);
    const steps = nextState.dice.reduce((a, b) => a + b, 0);
    const player = nextState.players[nextState.currentTurn];

    // 2. Find valid move
    // Try to find a pawn that can move
    let validPawnId: string | null = null;

    // Strategy:
    // 1. Enter board if possible
    // 2. Move furthest pawn? Or random?

    // Check for enter
    const pawnInStart = player.pawns.find(p => p.status === 'start');
    if (pawnInStart && steps === 5) {
        validPawnId = pawnInStart.id;
    } else {
        // Find any pawn on board
        const pawnOnBoard = player.pawns.find(p => p.status === 'board');
        if (pawnOnBoard) {
            validPawnId = pawnOnBoard.id;
        }
    }

    if (validPawnId) {
        return movePawn(nextState, validPawnId, steps);
    } else {
        return skipTurn(nextState);
    }
}
