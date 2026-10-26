import { useEffect, useMemo, useState } from 'react';

import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import useGameStore from '../store/gameStore';
import { CARD_DATA } from '../data/cardData';
import { BOOSTABLE_TYPES, BEAST_CARDS, CARD_TYPES, getPetCombo } from '../../../shared/cardTypes.js';
import { clearIdentity } from '../socket.js';
import { soundEffects } from '../utils/soundEffects';
import {
  clearTableBackground,
  fileToTableBackground,
  readTableBackground,
  saveTableBackground,
} from '../utils/tableBackground';

import GameBoard from '../components/GameBoard';
import DrawPile from '../components/DrawPile';
import DiscardPile from '../components/DiscardPile';
import CardHand from '../components/CardHand';
import DefuseModal from '../components/DefuseModal';
import NopePopup from '../components/NopePopup';
import SeeTheFutureModal from '../components/SeeTheFutureModal';
import StealCardModal from '../components/StealCardModal';
import ChoiceModal from '../components/ChoiceModal';
import GameOverModal from '../components/GameOverModal';
import RulesModal from '../components/RulesModal';
import GameSidePanel from '../components/GameSidePanel';
import CardAnimationOverlay from '../components/CardAnimationOverlay';
import CardPresentation from '../components/CardPresentation';
import AnimatedCount from '../components/AnimatedCount';
import TurnTimerRing from '../components/TurnTimerRing';
import { anchorRect, captureCardOrigins } from '../utils/animationGeometry';
import AlterFutureModal from '../components/AlterFutureModal';
import ModalShell from '../components/ModalShell';
import TimerSettings from '../components/TimerSettings';

export default function GamePage() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const {
    drawCard,
    playCard,
    defusePlace,
    implodingPlace,
    nopeAction,
    nopePass,
    favorGive,
    alterFutureSubmit,
    choiceRespond,
    restartGame,
    leaveRoom,
    sendChat,
    setTimers,
  } = useSocket();

  const gameState = useGameStore((s) => s.gameState);
  const playerId = useGameStore((s) => s.playerId);
  const playerName = useGameStore((s) => s.playerName);
  const selectedCards = useGameStore((s) => s.selectedCards);
  const toggleSelectCard = useGameStore((s) => s.toggleSelectCard);
  const clearSelectedCards = useGameStore((s) => s.clearSelectedCards);
  const chatMessages = useGameStore((s) => s.chatMessages);
  const lobbyPlayers = useGameStore((s) => s.lobbyPlayers);
  const connectionLost = useGameStore((s) => s.connectionLost);
  const deckTheme = useGameStore((s) => s.deckTheme);
  const activePresentationId = useGameStore(s => s.cardEffect?.effectId);

  const showNopePopup = useGameStore((s) => s.showNopePopup);
  const nopeInfo = useGameStore((s) => s.nopeInfo);
  const nopeCountdown = useGameStore((s) => s.nopeCountdown);
  const nopeTotal = useGameStore((s) => s.nopeTotal);

  const showSeeTheFuture = useGameStore((s) => s.showSeeTheFuture);
  const seeTheFutureCards = useGameStore((s) => s.seeTheFutureCards);
  const seeFuturePending = useGameStore((s) => s.seeFuturePending);
  const cardEffectPhase = useGameStore((s) => s.cardEffect?.phase || null);
  const setSeeTheFuture = useGameStore((s) => s.setSeeTheFuture);
  const choice = gameState?.choice || null;
  const choiceOwnerId = gameState?.choiceOwnerId || null;
  const showFavorGive = useGameStore((s) => s.showFavorGive);
  const favorGiveInfo = useGameStore((s) => s.favorGiveInfo);


  const [picker, setPicker] = useState(null);
  const [defuseDismissed, setDefuseDismissed] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [isMuted, setIsMuted] = useState(soundEffects.isMuted());

  const [showSidePanel, setShowSidePanel] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 1024
  );
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [cardAnimation, setCardAnimation] = useState(null);
  const [hasDealt, setHasDealt] = useState(false);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [tableBackground, setTableBackground] = useState(readTableBackground);
  const [deckInsert, setDeckInsert] = useState(null);
  const [tableTrim, setTableTrim] = useState(() => {
    try {
      return Math.max(0, Math.min(90, Number(localStorage.getItem('meono_table_trim')) || 0));
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('meono_table_trim', String(tableTrim));
    } catch {
      /* bỏ qua */
    }
  }, [tableTrim]);

  useEffect(() => () => useGameStore.getState().clearEffects(), [roomCode]);
  useEffect(() => { if (activePresentationId) setCardAnimation(null); }, [activePresentationId]);

  // Nhìn Tương Lai: chờ lá đáp xong mới mở modal để không che animation.
  useEffect(() => {
    if (!seeFuturePending) return;
    if (cardEffectPhase && cardEffectPhase !== 'effect') return;
    useGameStore.setState({
      showSeeTheFuture: true,
      seeTheFutureCards: seeFuturePending,
      seeFuturePending: null,
    });
  }, [seeFuturePending, cardEffectPhase]);

  // đồng bộ mã phòng khi vào thẳng URL (F5)
  useEffect(() => {
    if (roomCode && useGameStore.getState().roomCode !== roomCode) {
      useGameStore.getState().setRoomCode(roomCode);
    }
  }, [roomCode]);

  const myHand = gameState?.myHand || [];
  const nopeCards = myHand.filter(
    (card) =>
      !card.disabled &&
      (card.type === CARD_TYPES.NOPE ||
        (card.type === CARD_TYPES.CHONG_XAO_BAI && nopeInfo?.action === CARD_TYPES.SHUFFLE))
  );
  const opponents = gameState?.opponents || [];
  const currentPlayerId = gameState?.currentPlayerId;
  const waitingFor = gameState?.waitingFor ?? null;
  const isMyTurn = !!gameState?.isMyTurn;
  const turnsRemaining = gameState?.turnsRemaining ?? 1;
  const drawPileCount = gameState?.drawPileCount ?? 0;
  const drawPileTop = gameState?.drawPileTop || null;
  const discardPile = gameState?.discardPile || [];
  const gameLog = gameState?.gameLog || [];
  const publicLog = gameState?.publicLog || [];
  const myPrivateLog = gameState?.myPrivateLog || [];
  const mergedLog = useMemo(() => {
    const pub = publicLog.length > 0
      ? publicLog.map((entry) => ({ ...entry, private: false }))
      : gameLog.map((text, index) => ({
          id: `legacy-${index}`,
          ts: 0,
          kind: 'system',
          text,
          private: false,
        }));
    const priv = myPrivateLog.map((entry) => ({ ...entry, private: true }));
    return [...pub, ...priv].sort(
      (a, b) => (a.ts || 0) - (b.ts || 0) || String(a.id).localeCompare(String(b.id))
    );
  }, [publicLog, myPrivateLog, gameLog]);
  const [logReplayCards, setLogReplayCards] = useState(null);
  const winner = gameState?.winner;
  const pendingOwner = gameState?.pendingActionOwner;
  const attackInfo = gameState?.attackInfo || null;
  const targetedPlayerId = gameState?.pendingActionTarget || null;
  const turnDirection = gameState?.turnDirection ?? 1;
  const fueledPlayerId = gameState?.fueledPlayerId || null;
  const isFueled = fueledPlayerId === playerId;
  const myAlive = gameState?.isAlive !== false;
  const alterFutureCards = gameState?.alterFutureCards || [];
  const showAlterFuture = waitingFor === 'alter_future' && alterFutureCards.length > 0;
  const alterFutureOwnerName =
    gameState?.alterFutureOwner === playerId
      ? 'Bạn'
      : opponents.find((o) => o.id === gameState?.alterFutureOwner)?.name || 'Ai đó';
  const turnEndsAt = gameState?.turnEndsAt || null;
  const turnSecondsLeft = turnEndsAt
    ? Math.max(0, Math.ceil((turnEndsAt - clockNow) / 1000))
    : null;
  const turnTimeLimit = Number(gameState?.timers?.turnTimeLimit) || 60;
  const turnTotalSeconds = Math.max(turnTimeLimit, turnSecondsLeft || 0, 1);

  const isHost =
    !!gameState?.isHost || !!lobbyPlayers.find((p) => p.id === playerId && p.isHost);
  const busy = waitingFor !== null;
  const canAct = isMyTurn && !busy && !connectionLost && gameState?.status === 'playing';
  const canNopeNow =
    myAlive &&
    waitingFor === 'nope' &&
    pendingOwner !== playerId &&
    nopeCards.length > 0 &&
    !connectionLost;

  const currentName =
    currentPlayerId === playerId
      ? 'Bạn'
      : opponents.find((o) => o.id === currentPlayerId)?.name || 'Đối thủ';
  const attackerName =
    opponents.find((o) => o.id === attackInfo?.attackerId)?.name ||
    (attackInfo?.attackerId === playerId ? 'Bạn' : 'Ai đó');
  const allPlayers = [
    { id: playerId, name: playerName || 'Bạn' },
    ...opponents.map((o) => ({ id: o.id, name: o.name })),
  ];

  useEffect(() => {
    if (waitingFor !== 'defuse_place') setDefuseDismissed(false);
  }, [waitingFor]);

  const handleToggleMute = () => {
    const next = soundEffects.toggleMute();
    setIsMuted(next);
  };

  // ===== Phân tích lựa chọn để gợi ý combo =====
  const combo = useMemo(() => {
    const cards = myHand.filter((c) => selectedCards.includes(c.id));
    if (cards.length === 0) return { valid: false, label: 'CHỌN BÀI ĐỂ ĐÁNH', reason: '' };
    if (cards.length === 1) {
      const c = cards[0];
      if (c.type === CARD_TYPES.DEFUSE)
        return { valid: false, label: '🔧 GỠ BOM', reason: 'Chỉ dùng khi rút phải lá Mèo Nổ' };
      if (c.type === CARD_TYPES.NOPE)
        return { valid: false, label: '🚫 PHỦ NHẬN', reason: 'Chỉ kích hoạt trong cửa sổ Phủ Nhận' };
      if (c.type === CARD_TYPES.FAVOR)
        return { valid: true, needsTarget: true, label: '🙏 XIN BÀI', reason: 'Chọn 1 đối thủ để xin bài' };
      if (c.type === CARD_TYPES.CHONG_XAO_BAI)
        return {
          valid: false,
          label: '🛡️ CHỐNG XÀO BÀI',
          reason: 'Chỉ dùng khi có người Xào Bài',
        };
      if (c.type === CARD_TYPES.VUONG_NIEM)
        return {
          valid: false,
          label: '👑 VƯƠNG NIỆM',
          reason: 'Chỉ cần giữ trên tay để chống bị cướp/xin bài',
        };
      if (c.type === CARD_TYPES.TANG_CUONG)
        return {
          valid: false,
          label: '🐰 TĂNG CƯỜNG',
          reason: 'Phải chọn thêm đúng 1 lá để tăng gấp đôi hiệu ứng',
        };
      if (c.type === CARD_TYPES.TRA_DUA || c.type === CARD_TYPES.MOC_RAC)
        return {
          valid: false,
          label: '🛡️ PHẢN ĐÒN',
          reason: 'Chỉ dùng khi bạn vừa bị cướp bài',
        };
      if (c.type === CARD_TYPES.STEAL_CARD)
        return {
          valid: true,
          needsTarget: true,
          label: '🐧 TRỘM BÀI',
          reason: 'Chọn người bị trộm 1 lá úp',
        };
      if (c.type === CARD_TYPES.TAN_CONG_CHI_DINH)
        return {
          valid: true,
          needsTarget: true,
          label: '🎯 TẤN CÔNG CHỈ ĐỊNH',
          reason: 'Chọn người phải bốc 2 lượt',
        };
      if ([CARD_TYPES.CHIA_SE, CARD_TYPES.GIO_GIAI_LAO, CARD_TYPES.HUY_BAI, CARD_TYPES.THOI_MIEN, CARD_TYPES.LAM_PHIEN, CARD_TYPES.NHAN_BAN, CARD_TYPES.TO_SE_LAY_NO].includes(c.type))
        return {
          valid: true,
          needsTarget: true,
          label: `🎯 ${CARD_DATA[c.type]?.nameVN?.toUpperCase() || ''}`,
          reason: 'Chọn người chơi mục tiêu',
        };
      if (c.type === CARD_TYPES.SUPER_DESTROY)
        return {
          valid: true,
          needsTarget: true,
          action: 'super_destroy',
          label: '🧨 SIÊU HỦY BÀI',
          reason: 'Chọn đối thủ rồi chọn loại bài muốn hủy',
        };
      if (c.type === CARD_TYPES.FUEL && isFueled)
        return { valid: false, label: '⛽ ĐÃ NẠP NHIÊN LIỆU', reason: 'Hãy dùng Tấn Công trước khi nạp thêm' };
      if (deckTheme === 'lol' && BEAST_CARDS.includes(c.type) && c.lolName)
        return {
          valid: true,
          label: `CHƠI ${c.lolName.toUpperCase()} ⚡`,
          reason: CARD_DATA[c.type]?.shortTip || '',
        };
      return {
        valid: true,
        label: `CHƠI ${CARD_DATA[c.type]?.nameVN?.toUpperCase() || ''} ⚡`,
        reason: CARD_DATA[c.type]?.shortTip || '',
      };
    }
    const types = cards.map((c) => c.type);
    const boostIndex = types.indexOf(CARD_TYPES.TANG_CUONG);
    if (cards.length === 2 && boostIndex !== -1) {
      const base = cards[1 - boostIndex];
      if (!BOOSTABLE_TYPES.includes(base.type)) {
        return { valid: false, label: '🐰 TĂNG CƯỜNG', reason: 'Không thể tăng cường lá này' };
      }
      const targetTypes = [
        CARD_TYPES.TAN_CONG_CHI_DINH,
        CARD_TYPES.CHIA_SE,
        CARD_TYPES.GIO_GIAI_LAO,
        CARD_TYPES.HUY_BAI,
      ];
      return {
        valid: true,
        needsTarget: targetTypes.includes(base.type),
        label: `🐰 TĂNG CƯỜNG ×2 — ${CARD_DATA[base.type]?.nameVN?.toUpperCase() || ''}`,
        reason: 'Hiệu ứng của lá đi kèm được kích hoạt thêm 1 lần',
      };
    }
    if (boostIndex !== -1) {
      return {
        valid: false,
        label: '🐰 TĂNG CƯỜNG',
        reason: 'Chỉ được đánh chung với đúng 1 lá khác',
      };
    }
    const petCombo = getPetCombo(types);
    if (petCombo?.size === 2)
      return { valid: true, comboSize: 2, needsTarget: true, label: petCombo.family === 'beast' ? '🦊 COMBO 2 THÚ — CƯỚP BÀI' : '🐱 COMBO 2 — CƯỚP BÀI', reason: 'Chọn người rồi lấy 1 lá úp' };
    if (petCombo?.size === 3)
      return { valid: true, comboSize: 3, needsTarget: true, label: petCombo.family === 'beast' ? '🦊 COMBO 3 THÚ — ĐÒI BÀI' : '🐱 COMBO 3 — ĐÒI BÀI', reason: 'Chỉ định 1 đối thủ và đòi loại bài bạn muốn' };
    if (petCombo?.size === 5)
      return { valid: true, comboSize: 5, needsDiscard: true, label: petCombo.family === 'beast' ? '🦊 COMBO 5 THÚ — LẤY BÀI HẠ' : '🐱 COMBO 5 — LẤY BÀI HẠ', reason: 'Lấy 1 lá bất kỳ từ chồng bài hạ' };
    return { valid: false, label: 'CHƠI BÀI', reason: 'Kết hợp các lá bài không hợp lệ' };
  }, [myHand, selectedCards, isFueled, deckTheme]);

  // Đồng hồ lượt: server gửi mốc kết thúc, client chỉ đếm lùi.
  useEffect(() => {
    if (!turnEndsAt) return;
    setClockNow(Date.now());
    const timer = setInterval(() => setClockNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [turnEndsAt]);

  // Đóng bảng chọn khi lượt đã kết thúc hoặc mất kết nối.
  useEffect(() => {
    if (!isMyTurn || waitingFor || connectionLost) setPicker(null);
  }, [isMyTurn, waitingFor, connectionLost]);

  useEffect(() => {
    if (gameState?.status === 'finished') setShowSettings(false);
  }, [gameState?.status]);

  // Hiệu ứng chia bài khi bắt đầu ván mới
  useEffect(() => {
    if (gameState?.status === 'playing' && myHand.length > 0 && !hasDealt) {
      setHasDealt(true);
      setCardAnimation({ type: 'deal' });
      soundEffects.playDraw();
    }
  }, [gameState?.status, myHand.length, hasDealt]);

  // ===== Hành động =====
  const preparePlay = (ids) => {
    soundEffects.init();
    useGameStore.getState().preparePlay(myHand.filter(c => ids.includes(c.id)), captureCardOrigins(ids));
  };

  const handleDraw = () => {
    if (!canAct) return;
    soundEffects.init();
    useGameStore.getState().enqueueDraw(anchorRect('[data-draw-pile]'));
    clearSelectedCards();
    drawCard(roomCode);
  };

  const handlePlay = () => {
    if (!canAct || !combo.valid) return;
    const cardIds = [...selectedCards];
    if (combo.needsTarget) {
      setPicker({
        mode: 'target',
        cardIds,
        comboSize: combo.comboSize || 0,
        label: combo.label,
      });
      return;
    }
    if (combo.needsDiscard) {
      setPicker({ mode: 'discard', cardIds });
      return;
    }
    preparePlay(cardIds);
    playCard(roomCode, cardIds);
    clearSelectedCards();
  };

  const handlePickTarget = (targetId) => {
    if (picker?.comboSize === 3 || picker?.action === 'super_destroy') {
      setPicker({ ...picker, mode: 'type', targetPlayerId: targetId });
      return;
    }
    preparePlay(picker.cardIds);
    playCard(roomCode, picker.cardIds, { targetPlayerId: targetId });
    setPicker(null);
    clearSelectedCards();
  };

  const handlePickType = (type) => {
    preparePlay(picker.cardIds);
    playCard(roomCode, picker.cardIds, {
      targetPlayerId: picker.targetPlayerId,
      requestedCardType: type,
    });
    setPicker(null);
    clearSelectedCards();
  };

  const handlePickDiscard = (cardId) => {
    preparePlay(picker.cardIds);
    playCard(roomCode, picker.cardIds, { discardPickId: cardId });
    setPicker(null);
    clearSelectedCards();
  };

  const handleFavorGive = (cardId) => {
    favorGive(roomCode, cardId);
    useGameStore.setState({ showFavorGive: false, favorGiveInfo: null });
  };

  const handleNope = () => {
    if (nopeCards[0]) preparePlay([nopeCards[0].id]);
    nopeAction(roomCode);
    useGameStore.setState({ showNopePopup: false });
  };

  const handleNopePass = () => {
    nopePass(roomCode);
    useGameStore.setState({ showNopePopup: false });
  };

  const handleChoice = (value) => {
    if (!choice) return;
    choiceRespond(roomCode, choice.id, value);
  };

  const handlePlayAgain = () => {
    setHasDealt(false);
    if (isHost) {
      restartGame(roomCode);
    } else {
      useGameStore.getState().pushToast('⏳ Chờ chủ phòng bắt đầu ván mới nhé!');
    }
  };

  const handleExitRoom = () => {
    leaveRoom(roomCode);
    clearIdentity();
    useGameStore.getState().resetGame();
    navigate('/');
  };

  const handleHome = () => {
    handleExitRoom();
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      useGameStore.getState().pushToast('📋 Đã sao chép mã phòng: ' + roomCode);
    } catch {
      useGameStore.getState().pushToast('Mã phòng: ' + roomCode);
    }
  };

  const handleBackgroundFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const dataUrl = await fileToTableBackground(file);
      saveTableBackground(dataUrl);
      setTableBackground(dataUrl);
      useGameStore.getState().pushToast('✅ Đã đổi nền bàn chơi');
    } catch (error) {
      useGameStore.getState().pushToast(`⚠️ ${error.message || 'Không đọc được ảnh'}`);
    }
  };

  const handleRemoveBackground = () => {
    clearTableBackground();
    setTableBackground('');
    useGameStore.getState().pushToast('🧹 Đã xóa nền bàn chơi');
  };

  // ===== Trạng thái chờ hiển thị trên bàn =====
  const turnClock =
    turnSecondsLeft !== null ? (
      <span
        className={`inline-flex items-center gap-1 rounded-[3px] border-2 border-[var(--ink)] px-2 py-0.5 text-[10px] font-black tabular-nums shadow-[1px_1px_0_var(--hard-shadow)] ${
          turnSecondsLeft <= 10
            ? 'bg-[var(--oxblood)] text-[var(--paper)]'
            : 'bg-[var(--paper-2)] text-[var(--ink)]'
        }`}
        aria-label={`Còn ${turnSecondsLeft} giây`}
      >
        ⏳ {turnSecondsLeft}s
      </span>
    ) : null;

  let statusBanner = null;
  if (gameState?.status === 'playing') {
    if (waitingFor === 'choice') {
      const actorName =
        choiceOwnerId === playerId
          ? 'Bạn'
          : opponents.find((o) => o.id === choiceOwnerId)?.name || 'Ai đó';
      statusBanner = (
        <div className="game-status game-status--waiting flex items-center justify-center gap-2 text-center text-xs font-black sm:text-sm">
          <span className="text-lg">🎴</span>
          <span>
            {choiceOwnerId === playerId
              ? 'BẠN ĐANG CHỌN BÀI — HÃY HOÀN TẤT LỰA CHỌN!'
              : `${actorName.toUpperCase()} ĐANG CHỌN BÀI...`}
          </span>
          {turnClock}
        </div>
      );
    } else if (waitingFor === 'nope') {
      statusBanner = (
        <div className="game-status game-status--danger flex items-center justify-center gap-2 text-center text-xs font-black sm:text-sm">
          <span className="text-lg">🚫</span>
          <span>ĐANG CHỜ PHỦ NHẬN...</span>
        </div>
      );
    } else if (waitingFor === 'defuse_place') {
      const actorName = pendingOwner === playerId ? 'Bạn' : opponents.find((o) => o.id === pendingOwner)?.name || 'Ai đó';
      statusBanner = (
        <div className="game-status flex items-center justify-center gap-2 text-center text-xs font-black sm:text-sm">
          <span className="text-lg">🔧</span>
          <span>{actorName} ĐANG BÍ MẬT GỠ BOM VÀ NHÉT MÈO NỔ...</span>
          {turnClock}
        </div>
      );
    } else if (waitingFor === 'imploding_place') {
      const actorName = pendingOwner === playerId ? 'Bạn' : opponents.find((o) => o.id === pendingOwner)?.name || 'Ai đó';
      statusBanner = (
        <div className="game-status flex items-center justify-center gap-2 text-center text-xs font-black text-[var(--oxblood)] sm:text-sm">
          <span className="text-lg">💣</span>
          <span>{actorName} ĐANG ĐẶT LẠI IMPLODING KITTEN MẶT NGỬA...</span>
          {turnClock}
        </div>
      );
    } else if (waitingFor === 'favor_give') {
      const isTarget = gameState?.favorTarget === playerId;
      statusBanner = (
        <div className="game-status game-status--turn flex items-center justify-center gap-2 text-center text-xs font-black sm:text-sm">
          <span className="text-lg">🙏</span>
          <span>
            {isTarget
              ? `${favorGiveInfo?.requesterName || 'Ai đó'} ĐANG ĐÒI 1 LÁ BÀI TỪ BẠN!`
              : 'ĐANG CHỜ GIAO BÀI (XIN BÀI)...'}
          </span>
          {turnClock}
        </div>
      );
    } else if (waitingFor === 'alter_future') {
      statusBanner = (
        <div className="game-status game-status--waiting flex items-center justify-center gap-2 text-center text-xs font-black sm:text-sm">
          <span className="text-lg">🌌</span>
          <span>
            {gameState?.alterFutureOwner === playerId
              ? 'BẠN ĐANG KIẾN TẠO TƯƠNG LAI — HÃY SẮP XẾP 3 LÁ!'
              : `${alterFutureOwnerName.toUpperCase()} ĐANG KIẾN TẠO TƯƠNG LAI...`}
          </span>
        </div>
      );
    } else if (isMyTurn) {
      statusBanner = (
        <div
          className={`game-status flex items-center justify-center gap-2 text-center text-xs font-black sm:text-sm ${
            turnsRemaining > 1 ? 'game-status--danger' : 'game-status--turn'
          }`}
        >
          <span className="text-lg">{turnsRemaining > 1 ? '⚔️' : '🎯'}</span>
          <span>
            {turnsRemaining > 1
              ? `LƯỢT CỦA BẠN — CÒN ${turnsRemaining} LƯỢT ÉP BUỘC!`
              : 'ĐẾN LƯỢT BẠN: HÃY CHƠI BÀI HOẶC RÚT BÀI!'}
          </span>
          {turnClock}
        </div>
      );
    } else if (attackInfo?.targetId === currentPlayerId) {
      statusBanner = (
        <div className="game-status game-status--danger flex items-center justify-center gap-2 text-center text-xs font-black sm:text-sm">
          <span className="text-lg">⚔️</span>
          <span>
            {currentName} ĐANG BỊ {attackerName.toUpperCase()} TẤN CÔNG — CÒN {turnsRemaining} LƯỢT!
          </span>
          {turnClock}
        </div>
      );
    } else {
      statusBanner = (
        <div className="game-status game-status--waiting flex items-center justify-center gap-2 text-center text-xs font-bold sm:text-sm">
          <span className="text-base">⏳</span>
          <span>Đang chờ <strong className="font-black text-[var(--ink)]">{currentName}</strong> đi nước bài...</span>
          {turnClock}
        </div>
      );
    }
  }

  if (!gameState) {
    return (
      <div className="game-root flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-6xl animate-bounce mb-3 filter drop-shadow">🐱💣</div>
          <div className="text-[var(--paper)] font-bold font-display text-lg">Đang kết nối bàn chơi...</div>
          <button
            type="button"
            onClick={handleExitRoom}
            className="landing-btn landing-btn--paper mt-5 text-xs"
          >
            ← Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  const showDefuse = waitingFor === 'defuse_place' && pendingOwner === playerId;
  const showImploding = waitingFor === 'imploding_place' && pendingOwner === playerId;

  return (
    <div
      className="game-root min-h-screen overflow-x-hidden flex flex-col justify-between selection:bg-[var(--mustard)] selection:text-[var(--ink)]"
      style={
        tableBackground
          ? {
              backgroundImage: `linear-gradient(rgba(22, 56, 43, 0.86), rgba(11, 20, 16, 0.92)), url("${tableBackground}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : undefined
      }
    >
      {/* Top Bar Gaming HUD */}
      <header className="game-header px-2 sm:px-4 py-2 flex items-center justify-between gap-2 z-30">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1.5 border-2 border-[var(--ink)] bg-[var(--paper-2)] px-2.5 sm:px-3 py-1.5 rounded-[4px] shadow-[2px_2px_0_var(--hard-shadow)]">
            <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--ink-soft)]">Phòng:</span>
            <span className="font-black text-xs sm:text-sm tracking-[0.18em] sm:tracking-widest text-[var(--oxblood)] font-display">
              {roomCode}
            </span>
            <button
              onClick={handleCopyCode}
              title="Sao chép mã phòng"
              aria-label="Sao chép mã phòng"
              className="text-[10px] font-bold text-[var(--ink-soft)] hover:text-[var(--ink)] px-0.5 cursor-pointer"
            >
              <span className="hidden sm:inline">Sao chép</span>
              <span className="sm:hidden" aria-hidden="true">📋</span>
            </button>
          </div>
        </div>

        {/* Nút công cụ: Âm thanh, Chat/Diễn biến, Luật, Thoát phòng */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={handleToggleMute}
            className="landing-icon-btn"
            title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
            aria-label={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>

          <button
            onClick={() => setShowSidePanel((open) => !open)}
            aria-pressed={showSidePanel}
            aria-label={showSidePanel ? 'Đóng chat và diễn biến' : 'Mở chat và diễn biến'}
            title={showSidePanel ? 'Đóng chat và diễn biến' : 'Mở chat và diễn biến'}
            className={`landing-btn landing-btn--compact ${showSidePanel ? 'landing-btn--mustard' : 'landing-btn--paper'}`}
          >
            <span className="sm:hidden" aria-hidden="true">💬</span>
            <span className="hidden sm:inline">Bên lề</span>
          </button>

          <button
            onClick={() => setShowSettings(true)}
            title="Cài đặt"
            aria-label="Cài đặt"
            className="landing-icon-btn"
          >
            ⚙️
          </button>

          <button
            onClick={() => setShowRules(true)}
            aria-label="Luật chơi"
            className="landing-btn landing-btn--compact landing-btn--paper"
          >
            <span className="sm:hidden" aria-hidden="true">📖</span>
            <span className="hidden sm:inline">Luật</span>
          </button>

          <button
            onClick={() => setShowExitConfirm(true)}
            title="Thoát phòng"
            aria-label="Thoát phòng"
            className="landing-btn landing-btn--compact landing-btn--oxblood"
          >
            <span className="sm:hidden" aria-hidden="true">🚪</span>
            <span className="hidden sm:inline">Thoát</span>
          </button>
        </div>
      </header>

      {/* Main Game Arena / Thảm Bàn Chơi */}
      <div className="flex w-full flex-1 flex-col lg:flex-row lg:items-start lg:justify-center lg:gap-3">
        <GameSidePanel
          open={showSidePanel}
          onClose={() => setShowSidePanel(false)}
          messages={chatMessages}
          logs={mergedLog}
          playerId={playerId}
          playerName={playerName}
          roomCode={roomCode}
          onSend={(msg) => sendChat(roomCode, msg)}
          onReplayCards={(entry) => setLogReplayCards(entry.cards)}
        />

        <main className="flex-1 min-w-0 max-w-6xl w-full mx-auto p-2 sm:p-3 flex flex-col justify-between gap-1.5 sm:gap-2.5 max-sm:pb-28">
        {/* Khu vực đối thủ */}
        <div className="w-full">
          {opponents.length > 0 ? (
            <GameBoard
              players={opponents}
              currentPlayerId={currentPlayerId}
              attackInfo={attackInfo}
              targetedPlayerId={targetedPlayerId}
              fueledPlayerId={fueledPlayerId}
              turnSecondsLeft={turnSecondsLeft}
              turnTotalSeconds={turnTotalSeconds}
            />
          ) : (
            <div className="text-center text-xs text-[var(--paper)]/60 py-1">Chờ đối thủ kết nối...</div>
          )}
        </div>

        {/* Khu vực trung tâm: Thảm Bàn Bài Đấu Casino */}
        <div
          data-play-table
          style={tableTrim ? { marginTop: `-${tableTrim}px` } : undefined}
          className="game-table relative w-full max-w-2xl mx-auto my-1 py-3 sm:py-5 px-4 flex items-center justify-around gap-6 sm:gap-12 overflow-hidden"
        >
          {/* Vùng chồng bài rút */}
          <div className="flex flex-col items-center">
            <DrawPile count={drawPileCount} topCard={drawPileTop} onClick={handleDraw} disabled={!canAct} insert={deckInsert} onInsertDone={() => setDeckInsert(null)} />
          </div>

          {/* Biểu tượng VS + chiều lượt */}
          <div className="flex flex-col items-center justify-center select-none gap-1.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] font-display text-sm font-black text-[var(--ink)] shadow-[2px_2px_0_var(--hard-shadow)]">
              VS
            </span>
            <span className="landing-chip" title="Chiều lượt chơi">
              {turnDirection === -1 ? '↺ NGƯỢC' : '↻ XUÔI'}
            </span>
          </div>

          {/* Vùng chồng bài hạ */}
          <div className="flex flex-col items-center">
            <DiscardPile cards={discardPile} />
          </div>
        </div>

        {/* Diễn biến mini khi bảng bên lề đang đóng */}
        {mergedLog.length > 0 && !showSidePanel && (
          <button
            type="button"
            onClick={() => setShowSidePanel(true)}
            className="w-full max-w-md mx-auto py-1.5 px-3 bg-[var(--paper)] border-2 border-[var(--ink)] rounded-[4px] text-left text-[11px] text-[var(--ink-soft)] shadow-[2px_2px_0_var(--hard-shadow)] hover:bg-[var(--paper-2)] transition-colors flex items-center justify-between"
          >
            <span className="truncate">{mergedLog[mergedLog.length - 1]?.text}</span>
            <span className="text-[10px] text-[var(--oxblood)] font-bold ml-2 shrink-0">Mở bên lề</span>
          </button>
        )}

        {/* Khu vực tay bài người chơi */}
        <div
          data-player-seat={playerId}
          className={`game-hand w-full rounded-[6px] p-3 sm:p-4 relative transition-all ${
            attackInfo?.targetId === playerId
              ? 'game-hand--attacked'
              : canAct
                ? 'game-hand--turn'
                : ''
          }`}
        >
          {/* Tiêu đề khay bài: số lá, đồng hồ và nút hành động cùng hàng */}
          <div className="flex flex-col gap-1.5 border-b border-[var(--line)] px-1 pb-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs sm:text-sm font-black text-[var(--ink)] font-display flex flex-wrap items-center gap-2">
              <span>🐱 TAY BÀI CỦA BẠN</span>
              {attackInfo?.targetId === playerId && (
                <span className="landing-stamp border-[var(--oxblood)] text-[var(--oxblood)]">
                  ⚔️ BỊ TẤN CÔNG
                </span>
              )}
              {isFueled && (
                <span className="inline-flex items-center gap-1.5 border-2 border-[var(--ink)] bg-[var(--paper-2)] px-2 py-0.5 text-[10px] font-bold text-[var(--ink)]">
                  <span className="h-1.5 w-12 overflow-hidden rounded-full border border-[var(--ink)] bg-[var(--paper)]">
                    <span className="fuel-fill block h-full w-full bg-[var(--mustard)]" />
                  </span>
                  ⛽ Tấn Công kế tiếp ×3
                </span>
              )}
            </div>

            <div className="flex flex-nowrap items-center justify-end gap-1.5">
              <TurnTimerRing seconds={turnSecondsLeft} total={turnTotalSeconds} size={40} />
              <span className="landing-chip whitespace-nowrap"><AnimatedCount value={myHand.length} /> lá</span>
              <button
                onClick={handlePlay}
                disabled={!canAct || !combo.valid}
                className={`landing-btn ${!canAct || !combo.valid ? '' : 'landing-btn--oxblood'} px-3 py-1.5 text-[10px] sm:text-xs`}
              >
                <span className="sm:hidden">{combo.valid ? 'ĐÁNH' : 'CHỌN'}</span>
                <span className="hidden sm:inline">{combo.label}</span>
              </button>
            </div>
          </div>

          {combo.reason && (
            <div className="px-1 pt-1 text-[10px] sm:text-xs text-[var(--oxblood)] font-semibold">
              💡 {combo.reason}
            </div>
          )}

          {/* Component tay bài: 2 hàng, cuộn dọc, có tìm kiếm */}
          <CardHand
            cards={myHand}
            selectedIds={selectedCards}
            onToggle={toggleSelectCard}
            onDraw={handleDraw}
            onPlay={handlePlay}
            canAct={canAct}
            playLabel={combo.label}
            playDisabled={!combo.valid}
            comboInfo={combo}
            highlightTypes={
              canNopeNow ? [CARD_TYPES.NOPE, CARD_TYPES.CHONG_XAO_BAI] : null
            }
            canUseNope={canNopeNow}
            onUseNope={handleNope}
            hideActions
          />
        </div>
        </main>
      </div>

      {/* Floating Defuse Reminder Button (nếu tắt nhầm modal) */}
      {showDefuse && defuseDismissed && (
        <button
          onClick={() => setDefuseDismissed(false)}
          className="landing-btn landing-btn--oxblood fixed bottom-28 left-1/2 -translate-x-1/2 z-40 text-sm"
        >
          🔧 MỞ LẠI HỘP THOẠI NHÉT MÈO NỔ!
        </button>
      )}

      {/* ===== Modals ===== */}
      {showDefuse && !defuseDismissed && (
        <DefuseModal
          max={drawPileCount}
          secondsLeft={turnSecondsLeft}
          onPlace={(pos) => {
            setDeckInsert({
              id: `defuse-${Date.now()}`,
              type: CARD_TYPES.EXPLODING_KITTEN,
              index: pos,
              count: drawPileCount,
              faceUp: false,
            });
            defusePlace(roomCode, pos);
            setDefuseDismissed(false);
          }}
          onClose={() => setDefuseDismissed(true)}
        />
      )}

      {showImploding && (
        <DefuseModal
          max={drawPileCount}
          mode="imploding"
          secondsLeft={turnSecondsLeft}
          onPlace={(pos) => {
            setDeckInsert({
              id: `imploding-${Date.now()}`,
              type: CARD_TYPES.IMPLODING_KITTEN,
              index: pos,
              count: drawPileCount,
              faceUp: true,
            });
            implodingPlace(roomCode, pos);
          }}
        />
      )}

      {showNopePopup && nopeInfo && myAlive && (
        <NopePopup
          info={nopeInfo}
          countdown={nopeCountdown}
          total={nopeTotal}
          canNope={canNopeNow}
          nopeCards={nopeCards}
          onNope={handleNope}
          onPass={handleNopePass}
        />
      )}

      {choice && choice.kind === 'steal_pick' && (
        <StealCardModal
          mode="cards"
          title={`🐾 Chọn 1 lá úp từ ${choice.targetName || 'đối thủ'}`}
          cardCount={choice.cardCount || 0}
          targetName={choice.targetName}
          secondsLeft={turnSecondsLeft}
          onPickIndex={handleChoice}
        />
      )}

      {choice && choice.kind !== 'steal_pick' && (
        <ChoiceModal
          choice={choice}
          secondsLeft={turnSecondsLeft}
          onRespond={handleChoice}
        />
      )}

      {showSeeTheFuture && (
        <SeeTheFutureModal cards={seeTheFutureCards} onClose={() => setSeeTheFuture(false)} />
      )}

      {/* Xem lại danh sách lá đã lưu trong private log */}
      {logReplayCards && (
        <SeeTheFutureModal
          cards={logReplayCards}
          title="👁️ LÁ BẠN ĐÃ THẤY"
          subtitle="Chi tiết từ nhật ký riêng tư — chỉ mình bạn thấy."
          showOrder={false}
          onClose={() => setLogReplayCards(null)}
        />
      )}

      {/* Sắp xếp 3 lá tương lai */}
      {showAlterFuture && (
        <AlterFutureModal
          cards={alterFutureCards}
          onSubmit={(order) => alterFutureSubmit(roomCode, order)}
        />
      )}

      {/* Giao bài khi bị Xin Bài */}
      {showFavorGive && waitingFor === 'favor_give' && gameState?.favorTarget === playerId && (
        <ModalShell
          label="Giao bài"
          overlayClassName="bg-black/85 backdrop-blur-sm"
          panelClassName="paper-modal max-w-md w-full p-6 text-center"
        >
            <h2 className="text-xl font-black text-[var(--ink)] mb-1 font-display">🙏 BẠN BỊ XIN BÀI!</h2>
            <p className="text-xs text-slate-300 mb-4">
              <span className="font-bold text-amber-300">{favorGiveInfo?.requesterName || 'Ai đó'}</span> muốn 1 lá — hãy chọn 1 lá bạn tự nguyện đưa:
            </p>
            {turnSecondsLeft !== null && (
              <p className="mb-3 text-[11px] font-black text-amber-300" aria-live="polite">
                ⏳ Tự động giao lá đầu tiên sau {turnSecondsLeft}s
              </p>
            )}
            <div className="flex flex-wrap gap-2.5 justify-center max-h-72 overflow-y-auto p-1">
              {myHand.map((card) => {
                const info = CARD_DATA[card.type] || card;
                const lolBeast = deckTheme === 'lol' && BEAST_CARDS.includes(card.type);
                return (
                  <button
                    key={card.id}
                    onClick={() => handleFavorGive(card.id)}
                    className="w-24 py-2.5 px-1 bg-[var(--paper-2)] hover:bg-[var(--paper)] border-2 border-[var(--line)] hover:border-[var(--oxblood)] rounded-[4px] text-[var(--ink)] transition-all cursor-pointer flex flex-col items-center gap-1 shadow-[2px_2px_0_var(--hard-shadow)]"
                  >
                    <div className="text-2xl">{lolBeast ? '🐾' : info.emoji}</div>
                    <div className="text-[11px] font-bold leading-tight truncate w-full text-center">
                      {lolBeast && card.lolName ? card.lolName : info.nameVN}
                    </div>
                  </button>
                );
              })}
            </div>
        </ModalShell>
      )}

      {/* Modal chọn đối thủ / cướp bài */}
      {picker && (
        <StealCardModal
          mode={picker.mode}
          title={
            picker.mode === 'discard'
              ? '🐱 Combo 5 lá — Chọn 1 lá từ chồng bài đã hạ'
              : picker.action === 'super_destroy'
                ? '🧨 Siêu Hủy Bài — Chọn đối thủ'
                : picker.comboSize === 3
                  ? '🐱 Combo 3 lá — Chọn đối thủ muốn đòi bài'
                  : picker.comboSize === 2
                    ? '🐾 Combo 2 lá — Chọn đối thủ muốn cướp 1 lá úp'
                    : picker.label || '🙏 Chọn người để Xin Bài'
          }
          targets={opponents.filter((o) => o.isAlive && o.cardCount > 0)}
          discardCards={[...discardPile].reverse()}
          secondsLeft={turnSecondsLeft}
          onPickTarget={handlePickTarget}
          onPickCard={handlePickDiscard}
          onClose={() => setPicker(null)}
        />
      )}

      {/* Modal chọn loại bài muốn đòi (Combo 3 lá) */}
      {picker?.mode === 'type' && (
        <ModalShell
          label="Chọn loại bài"
          onClose={() => setPicker(null)}
          overlayClassName="bg-black/85 backdrop-blur-sm"
          panelClassName="paper-modal max-w-md w-full p-6"
        >
            <h2 className="text-xl font-black text-[var(--ink)] mb-1 text-center font-display">
              {picker.action === 'super_destroy'
                ? '🧨 BẠN MUỐN HỦY LOẠI BÀI NÀO?'
                : '🐱 BẠN MUỐN ĐÒI LOẠI BÀI NÀO?'}
            </h2>
            <p className="text-xs text-slate-400 text-center mb-4">
              {picker.action === 'super_destroy'
                ? 'Nếu đối thủ có lá này, nó sẽ bị hủy vĩnh viễn khỏi ván!'
                : 'Nếu đối thủ có lá bài này trên tay, họ buộc phải đưa cho bạn!'}
            </p>
            <div className="grid grid-cols-3 gap-2.5 max-h-72 overflow-y-auto p-1">
              {Object.keys(CARD_DATA).map((type) => {
                const info = CARD_DATA[type];
                return (
                  <button
                    key={type}
                    onClick={() => handlePickType(type)}
                    className="py-3 px-1 bg-[var(--paper-2)] hover:bg-[var(--paper)] border-2 border-[var(--line)] hover:border-[var(--oxblood)] rounded-[4px] text-[var(--ink)] transition-all cursor-pointer flex flex-col items-center gap-1 shadow-[2px_2px_0_var(--hard-shadow)]"
                  >
                    <div className="text-2xl">{info.emoji}</div>
                    <div className="text-[10px] font-bold leading-tight truncate w-full text-center">
                      {info.nameVN}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="text-center mt-4">
              <button
                onClick={() => setPicker(null)}
                className="landing-btn landing-btn--paper px-6 py-2 text-xs"
              >
                Hủy bỏ
              </button>
            </div>
        </ModalShell>
      )}

      {/* Kết thúc ván chơi */}
      {gameState?.status === 'finished' && winner && (
        <GameOverModal
          winnerName={winner.name}
          winnerId={winner.id}
          playerId={playerId}
          stats={gameState.myStats}
          deckTheme={deckTheme}
          onPlayAgain={handlePlayAgain}
          onHome={handleHome}
        />
      )}

      {showSettings && (
        <ModalShell
          label="Cài đặt"
          onClose={() => setShowSettings(false)}
          panelClassName="paper-modal w-full max-w-lg p-5"
        >
          <h2 className="mb-1 font-display text-xl font-black text-[var(--ink)]">⚙️ Cài đặt</h2>
          <p className="mb-4 text-xs text-slate-400">
            Timer do chủ phòng chỉnh. Ảnh nền chỉ lưu trên máy của bạn.
          </p>

          {isHost ? (
            <>
              <div className="mb-2 text-xs font-black text-slate-300">⏱ Thời gian</div>
              <TimerSettings
                values={gameState?.timers}
                applyLabel="Lưu thay đổi"
                tone="paper"
                onApply={(timers) => {
                  setTimers(roomCode, timers);
                  setShowSettings(false);
                }}
              />
            </>
          ) : (
            <p className="rounded-xl border border-slate-700 bg-slate-800/70 px-3 py-2 text-xs text-slate-400">
              Chỉ chủ phòng mới đổi được timer.
            </p>
          )}

          <div className="mt-5 border-t border-slate-700 pt-4">
            <div className="mb-2 text-xs font-black text-slate-300">🖼️ Nền bàn chơi</div>
            <input
              type="file"
              accept="image/*"
              onChange={handleBackgroundFile}
              aria-label="Chọn ảnh nền"
              className="block w-full rounded-xl border border-slate-700 bg-slate-800 p-2 text-xs text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--mustard)] file:px-3 file:py-1.5 file:text-xs file:font-black file:text-[var(--ink)]"
            />
            {tableBackground && (
              <>
                <img
                  src={tableBackground}
                  alt="Nền bàn chơi đã chọn"
                  className="mt-3 h-24 w-full rounded-xl border border-slate-700 object-cover"
                />
                <button
                  type="button"
                  onClick={handleRemoveBackground}
                  className="mt-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-700"
                >
                  Xóa nền
                </button>
              </>
            )}
          </div>

          <div className="mt-5 border-t border-slate-700 pt-4">
            <div className="mb-2 text-xs font-black text-slate-300">🎛️ Giao diện bàn</div>
            <label className="flex items-center gap-3 text-xs font-bold text-slate-300">
              <span className="shrink-0">Thu gọn bàn</span>
              <input
                type="range"
                min="0"
                max="90"
                step="5"
                value={tableTrim}
                onChange={(e) => setTableTrim(Number(e.target.value))}
                aria-label="Thu gọn bàn trong cài đặt"
                className="h-2 w-full cursor-pointer accent-[var(--mustard)]"
              />
              <span className="w-10 text-right tabular-nums">{tableTrim}px</span>
            </label>
            <button
              type="button"
              onClick={() => setTableTrim(0)}
              className="mt-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-700"
            >
              Đặt lại giao diện
            </button>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
              Timer và ảnh nền cũ vẫn giữ nguyên; thay đổi giao diện chỉ lưu trên máy này.
            </p>
          </div>
        </ModalShell>
      )}

      {showRules && <RulesModal onClose={() => setShowRules(false)} />}

      {showExitConfirm && (
        <ModalShell
          label="Rời khỏi phòng"
          onClose={() => setShowExitConfirm(false)}
          overlayClassName="z-[60] bg-black/85 backdrop-blur-sm"
          panelClassName="paper-modal w-full max-w-sm p-5"
        >
            <h2 className="font-display text-xl font-black text-[var(--ink)]">🚪 Rời khỏi phòng?</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              {gameState?.status === 'playing'
                ? 'Bạn sẽ về trang chủ. Ván đấu vẫn tiếp tục và bot sẽ đánh thay bạn.'
                : 'Bạn sẽ về trang chủ và rời khỏi bàn chơi này.'}
            </p>
            <p className="mt-2 text-xs font-semibold text-slate-500">Mã phòng: {roomCode}</p>
            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="landing-btn landing-btn--paper flex-1 py-2.5 text-xs"
              >
                Ở lại
              </button>
              <button
                type="button"
                onClick={handleExitRoom}
                className="landing-btn landing-btn--oxblood flex-1 py-2.5 text-xs"
              >
                Rời phòng
              </button>
            </div>
        </ModalShell>
      )}

      {/* Viền đỏ cảnh báo khi chính bạn đang bị tấn công */}
      {attackInfo?.targetId === playerId && (
        <div className="pointer-events-none fixed inset-0 z-30 ring-4 ring-inset ring-[var(--oxblood)]/40 shadow-[inset_0_0_90px_rgba(123,45,38,0.3)]" />
      )}

      {/* Hiệu ứng chia bài / rút bài */}
      <CardAnimationOverlay
        animation={activePresentationId ? null : cardAnimation}
        onComplete={() => setCardAnimation(null)}
      />

      {/* Hiệu ứng riêng của từng lá bài khi được đánh */}
      <CardPresentation players={allPlayers} />
    </div>
  );
}
