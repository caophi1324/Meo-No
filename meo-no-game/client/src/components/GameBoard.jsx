import PlayerSlot from './PlayerSlot';

// Chia đối thủ ra các góc rộng thay vì ngồi sát một hàng.
// 1 người: giữa trên — 2 người: 2 góc trên — 3 người: 2 góc trên + giữa dưới
// 4 người: đủ 4 góc.
function seatClass(index, count) {
  if (count === 1) return 'col-span-2 justify-self-center';
  if (count === 3 && index === 2) return 'col-span-2 justify-self-center';
  if (count === 4) {
    // 4 góc theo chiều kim đồng hồ để dễ nhìn hướng đi của lượt.
    return [
      'col-start-1 row-start-1 justify-self-start',
      'col-start-2 row-start-1 justify-self-end',
      'col-start-2 row-start-2 justify-self-end',
      'col-start-1 row-start-2 justify-self-start',
    ][index];
  }
  return index % 2 === 0 ? 'justify-self-start' : 'justify-self-end';
}

export default function GameBoard({
  players = [],
  currentPlayerId,
  attackInfo = null,
  targetedPlayerId = null,
  fueledPlayerId = null,
}) {
  return (
    <div className="w-full max-w-5xl mx-auto px-1 sm:px-2 py-1">
      <div className="grid grid-cols-2 gap-x-4 sm:gap-x-24 lg:gap-x-44 gap-y-2 sm:gap-y-3 items-start">
        {players.map((p, i) => (
          <div key={p.id} className={`flex ${seatClass(i, players.length)}`}>
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
            />
          </div>
        ))}
      </div>
    </div>
  );
}
