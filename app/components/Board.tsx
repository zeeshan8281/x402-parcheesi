import React from 'react';
import { GameState, Pawn, PlayerColor } from '../lib/types';
import styles from './Board.module.css';

// Mapping of linear board position (0-67) to Grid Coordinates (row, col) 1-15
// This is a simplified mapping for the demo.
// In a real implementation, this would be precise.
// Mapping of linear board position (0-51)
const PATH_COORDS: Record<number, { r: number, c: number }> = {
    // Left Arm (Red)
    0: { r: 9, c: 6 }, 1: { r: 9, c: 5 }, 2: { r: 9, c: 4 }, 3: { r: 9, c: 3 }, 4: { r: 9, c: 2 }, 5: { r: 9, c: 1 },
    6: { r: 8, c: 1 },
    7: { r: 7, c: 1 }, 8: { r: 7, c: 2 }, 9: { r: 7, c: 3 }, 10: { r: 7, c: 4 }, 11: { r: 7, c: 5 }, 12: { r: 7, c: 6 },

    // Top Arm (Green)
    13: { r: 6, c: 7 }, 14: { r: 5, c: 7 }, 15: { r: 4, c: 7 }, 16: { r: 3, c: 7 }, 17: { r: 2, c: 7 }, 18: { r: 1, c: 7 },
    19: { r: 1, c: 8 },
    20: { r: 1, c: 9 }, 21: { r: 2, c: 9 }, 22: { r: 3, c: 9 }, 23: { r: 4, c: 9 }, 24: { r: 5, c: 9 }, 25: { r: 6, c: 9 },

    // Right Arm (Yellow)
    26: { r: 7, c: 10 }, 27: { r: 7, c: 11 }, 28: { r: 7, c: 12 }, 29: { r: 7, c: 13 }, 30: { r: 7, c: 14 }, 31: { r: 7, c: 15 },
    32: { r: 8, c: 15 },
    33: { r: 9, c: 15 }, 34: { r: 9, c: 14 }, 35: { r: 9, c: 13 }, 36: { r: 9, c: 12 }, 37: { r: 9, c: 11 }, 38: { r: 9, c: 10 },

    // Bottom Arm (Blue)
    39: { r: 10, c: 9 }, 40: { r: 11, c: 9 }, 41: { r: 12, c: 9 }, 42: { r: 13, c: 9 }, 43: { r: 14, c: 9 }, 44: { r: 15, c: 9 },
    45: { r: 15, c: 8 },
    46: { r: 15, c: 7 }, 47: { r: 14, c: 7 }, 48: { r: 13, c: 7 }, 49: { r: 12, c: 7 }, 50: { r: 11, c: 7 }, 51: { r: 10, c: 7 }
};

const HOME_PATHS: Record<string, { r: number, c: number }[]> = {
    red: [
        { r: 8, c: 2 }, { r: 8, c: 3 }, { r: 8, c: 4 }, { r: 8, c: 5 }, { r: 8, c: 6 }
    ],
    green: [
        { r: 2, c: 8 }, { r: 3, c: 8 }, { r: 4, c: 8 }, { r: 5, c: 8 }, { r: 6, c: 8 }
    ],
    yellow: [
        { r: 8, c: 14 }, { r: 8, c: 13 }, { r: 8, c: 12 }, { r: 8, c: 11 }, { r: 8, c: 10 }
    ],
    blue: [
        { r: 14, c: 8 }, { r: 13, c: 8 }, { r: 12, c: 8 }, { r: 11, c: 8 }, { r: 10, c: 8 }
    ]
};

// Helper to get coordinates
const BASE_OFFSETS = {
    red: { r: 2, c: 2 },
    green: { r: 2, c: 12 },
    blue: { r: 11, c: 2 },
    yellow: { r: 11, c: 12 },
};

const getPawnStyle = (pawn: Pawn, index: number, total: number) => {
    // If in base
    if (pawn.status === 'start') {
        const offset = BASE_OFFSETS[pawn.color];
        const r = offset.r + Math.floor(index / 2) * 2;
        const c = offset.c + (index % 2) * 2;
        return { gridRow: r, gridColumn: c };
    }

    if (pawn.status === 'board') {
        const coords = PATH_COORDS[pawn.position];
        if (coords) {
            return { gridRow: coords.r, gridColumn: coords.c };
        }
        // Default fallback
        return { gridRow: 8, gridColumn: 8 };
    }

    if (pawn.status === 'home-path') {
        const homePath = HOME_PATHS[pawn.color];
        if (homePath && pawn.homePathPos !== undefined && homePath[pawn.homePathPos]) {
            const coords = homePath[pawn.homePathPos];
            return { gridRow: coords.r, gridColumn: coords.c };
        }
    }

    if (pawn.status === 'home') {
        // Center of the board
        return { gridRow: 8, gridColumn: 8 };
    }

    return { gridRow: 8, gridColumn: 8 };
};

const getPixelCoords = (r: number, c: number) => {
    // 600px / 15 = 40px per cell
    // Center is +20px
    const x = (c - 1) * 40 + 20;
    const y = (r - 1) * 40 + 20;
    return { x, y };
};

interface BoardProps {
    gameState: GameState;
    onPawnClick: (pawnId: string) => void;
}

export default function Board({ gameState, onPawnClick }: BoardProps) {
    const mainPathPoints = React.useMemo(() => {
        let points = "";
        for (let i = 0; i <= 51; i++) {
            const coord = PATH_COORDS[i];
            if (coord) {
                const { x, y } = getPixelCoords(coord.r, coord.c);
                points += `${x},${y} `;
            }
        }
        // Close the loop
        if (PATH_COORDS[0]) {
            const { x, y } = getPixelCoords(PATH_COORDS[0].r, PATH_COORDS[0].c);
            points += `${x},${y}`;
        }
        return points;
    }, []);

    return (
        <div className={styles.board}>
            {/* Main Path Cells */}
            {Object.entries(PATH_COORDS).map(([i, coord]) => (
                <div
                    key={`path-${i}`}
                    className={`${styles.cell} ${styles.path}`}
                    style={{ gridRow: coord.r, gridColumn: coord.c }}
                />
            ))}

            {/* Home Path Cells */}
            {Object.entries(HOME_PATHS).map(([color, coords]) => (
                coords.map((coord, i) => (
                    <div
                        key={`home-${color}-${i}`}
                        className={`${styles.cell} ${styles[color]}`}
                        style={{ gridRow: coord.r, gridColumn: coord.c }}
                    />
                ))
            ))}

            {/* Path Lines Overlay */}
            <svg className={styles.svgOverlay}>
                <polyline points={mainPathPoints} className={styles.pathLine} />
                {Object.entries(HOME_PATHS).map(([color, coords]) => {
                    const points = coords.map(c => {
                        const { x, y } = getPixelCoords(c.r, c.c);
                        return `${x},${y}`;
                    }).join(' ');
                    return (
                        <polyline
                            key={color}
                            points={points}
                            className={styles.homeLine}
                            style={{ stroke: `var(--player-${color})` }}
                        />
                    );
                })}
            </svg>
            {/* Bases */}
            <div className={`${styles.base} ${styles.red}`}></div>
            <div className={`${styles.base} ${styles.green}`}></div>
            <div className={`${styles.base} ${styles.blue}`}></div>
            <div className={`${styles.base} ${styles.yellow}`}></div>

            {/* Base Slots (Visual Placeholders) */}
            {(['red', 'green', 'blue', 'yellow'] as const).map(color => (
                [0, 1, 2, 3].map(i => {
                    const offset = BASE_OFFSETS[color];
                    const r = offset.r + Math.floor(i / 2) * 2;
                    const c = offset.c + (i % 2) * 2;
                    return (
                        <div
                            key={`slot-${color}-${i}`}
                            className={styles.baseSlot}
                            style={{ gridRow: r, gridColumn: c }}
                        />
                    );
                })
            ))}

            {/* Home */}
            <div className={styles.home}>HOME</div>

            {/* Pawns */}
            {gameState.players.flatMap(player =>
                player.pawns.map((pawn, i) => (
                    <div
                        key={pawn.id}
                        className={`${styles.pawn} ${styles[pawn.color]}`}
                        style={getPawnStyle(pawn, i, 4)}
                        onClick={() => onPawnClick(pawn.id)}
                        title={`${pawn.color} pawn ${i}`}
                    />
                ))
            )}
        </div>
    );
}
