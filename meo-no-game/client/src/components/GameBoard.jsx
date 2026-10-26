import PlayerSlot from './PlayerSlot';

// Chia đối thủ quanh bàn theo kiểu Tiến Lên: trên, trái, phải.
function seatClass(index, count) {
  if (count === 1) return 'left-1/2 top-0 -translate-x-1/2';
  if (count === 2) return index === 0 ? 'left-0 top-0' : 'right-0 top-0';
  if (count === 3) {
    return ['left-0 top-8', 'left-1/2 top-0 -translate-x-1/2', 'right-0 top-8'][index];
  }
  if (count === 4) {
    return ['left-0 top-0', 'right-0 top-0', 'left-0 top-44', 'right-0 top-44'][index];
  }
  return index % 2 === 0 ? 'left-0 top-0' : 'right-0 top-0';
}

export default function GameBoard({
  players = [],
  currentPlayerId,
  attackInfo = null,
  targetedPlayerId = null,
  fueledPlayerId = null,
  turnSecondsLeft = null,
  turnTotalSeconds = 60,
}) {
  return (
    <div className="game-seats w-full max-w-4xl mx-auto px-1 sm:px-2 py-1">
      <div className="relative min-h-[190px] max-sm:grid max-sm:grid-cols-2 max-sm:gap-1 max-sm:min-h-0 sm:min-h-[230px]">
        {players.map((p, i) => (
          <div
            key={p.id}
            data-player-seat={p.id}
            className={`flex max-sm:static max-sm:translate-x-0 sm:absolute ${seatClass(i, players.length)} max-sm:justify-center ${players.length === 1 ? 'max-sm:col-span-2' : ''}`}
          >
            <PlayerSlot
              player={p}
              isCurrentTurn={p.id === currentPlayerId}
              isAttacked={attackInfo?.targetId === p.id}
              attackerName={
                attackInfo?.targetId === p.id
                  ? players.find((x) => x.id === attackInfo.attackerId)?.name || ''
                  : ''
              }
              isTargeted={targetedPlayerId === p.id}
              isFueled={fueledPlayerId === p.id}
              secondsLeft={p.id === currentPlayerId ? turnSecondsLeft : null}
              totalSeconds={turnTotalSeconds}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
