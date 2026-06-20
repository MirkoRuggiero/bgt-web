import type { TicTacToeState } from '../types';

interface TicTacToeBoardProps {
  state: TicTacToeState;
  isMyTurn: boolean;
  onCellClick: (row: number, col: number) => void;
}

export function TicTacToeBoard({ state, isMyTurn, onCellClick }: TicTacToeBoardProps) {
  const disabled = !isMyTurn || state.gameOver;

  return (
    <div className="grid grid-cols-3 gap-2 w-72 h-72">
      {state.board.map((row, rowIdx) =>
        row.map((cell, colIdx) => (
          <button
            key={`${rowIdx}-${colIdx}`}
            onClick={() => onCellClick(rowIdx, colIdx)}
            disabled={disabled || cell !== null}
            className={`
              w-full h-full text-4xl font-bold rounded-lg
              transition-colors duration-150
              ${cell === 'X' ? 'text-indigo-400' : cell === 'O' ? 'text-emerald-400' : ''}
              ${disabled || cell !== null
                ? 'bg-gray-700 cursor-not-allowed'
                : 'bg-gray-800 hover:bg-gray-600 cursor-pointer active:bg-gray-500'
              }
              border-2 border-gray-600
              focus:outline-none focus:ring-2 focus:ring-indigo-500
            `}
          >
            {cell}
          </button>
        ))
      )}
    </div>
  );
}
