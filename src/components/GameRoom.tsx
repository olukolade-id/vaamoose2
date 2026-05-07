import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gamepad2, Users, ArrowLeft, Copy, CheckCircle2,
  Send, Crown, Dice1, Play, SkipForward,
  MessageCircle, X, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { io, Socket } from 'socket.io-client';

interface GameRoomProps {
  bookingReference?: string;
  playerName: string;
  onBack: () => void;
}

interface ChatMessage {
  player: string;
  message: string;
}

const SOCKET_URL = import.meta.env.DEV ? 'http://localhost:5000' : 'https://blissful-exploration-production.up.railway.app';

const GAMES = [
  { id: 'undercover',    name: 'Undercover',        emoji: '🕵️', desc: 'Find the undercover agent before they blend in', minPlayers: 3 },
  { id: 'whoami',        name: 'Who Am I?',          emoji: '🎭', desc: 'Guess your secret character from clues',         minPlayers: 2 },
  { id: 'wouldyourather',name: 'Would You Rather',   emoji: '🤔', desc: 'Nigerian edition with wild scenarios',           minPlayers: 2 },
  { id: 'truthordare',   name: 'Truth or Dare',      emoji: '🎯', desc: 'Student edition — dare your bus mates',          minPlayers: 2 },
  { id: 'trivia',        name: 'Naija Trivia',        emoji: '🧠', desc: 'Nigerian pop culture & school life quiz',        minPlayers: 2 },
  { id: 'whot',          name: 'Whot!',               emoji: '🃏', desc: 'The classic Nigerian card game — real-time',     minPlayers: 2 },
  { id: 'impostor',      name: 'Impostor',            emoji: '👾', desc: 'One secret mission. Can you complete it?',       minPlayers: 3 },
];

const SUIT_COLORS: Record<string, string> = {
  Circle: 'bg-red-500', Triangle: 'bg-blue-500', Cross: 'bg-green-500',
  Square: 'bg-yellow-500', Star: 'bg-purple-500', Whot: 'bg-slate-800',
};

export function GameRoom({ bookingReference, playerName, onBack }: GameRoomProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [screen, setScreen] = useState<'lobby' | 'room' | 'game'>('lobby');
  const [roomId, setRoomId] = useState(bookingReference || '');
  const [room, setRoom] = useState<any>(null);
  const [gameState, setGameState] = useState<any>(null);
  const [currentGame, setCurrentGame] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [events, setEvents] = useState<string[]>([]);
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [createMode, setCreateMode] = useState(false);
  const [chosenGame, setChosenGame] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const myPlayerId = useRef<string>('');

  useEffect(() => {
    const s = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    setSocket(s);

    s.on('connect', () => console.log('Connected to game server'));
    s.on('joined_room', ({ room: r, playerId }) => {
      setRoom(r);
      myPlayerId.current = playerId;
      setScreen('room');
      setIsConnecting(false);
    });
    s.on('room_created', (data) => {
      console.log('room_created event received - full data:', data);
      console.log('data.room:', data?.room);
      console.log('data.playerId:', data?.playerId);
      if (data?.room) {
        console.log('Setting room to:', data.room);
        setRoom(data.room);
        myPlayerId.current = data.playerId;
        setRoomId(data.room.code);
        setScreen('room');
        setIsConnecting(false);
      } else {
        console.error('No room in data!');
      }
    });
    s.on('room_updated', ({ room: r }) => setRoom(r));
    s.on('game_started', ({ game, gameState: gs }) => {
      setCurrentGame(game);
      setGameState(gs);
      setScreen('game');
      addEvent(`🎮 Game started: ${GAMES.find(g => g.id === game)?.name}`);
    });
    s.on('game_state_updated', ({ gameState: gs, event }) => {
      setGameState({ ...gs });
      if (event?.type) addEvent(formatEvent(event));
    });
    s.on('new_round', ({ gameState: gs }) => {
      setGameState({ ...gs });
      addEvent('🔄 New round started!');
    });
    s.on('vote_cast', ({ voter, totalVotes, totalPlayers }) => {
      addEvent(`🗳️ ${voter} voted (${totalVotes}/${totalPlayers})`);
    });
    s.on('player_eliminated', ({ eliminatedName, gameState: gs }) => {
      setGameState({ ...gs });
      addEvent(`💀 ${eliminatedName} was eliminated!`);
    });
    s.on('chat_message', (msg: ChatMessage) => {
      setChatMessages(prev => [...prev, msg]);
    });
    s.on('player_left', ({ playerName: name }: { playerName: string }) => addEvent(`👋 ${name} left the room`));
    s.on('error', ({ message }: { message: string }) => toast.error(message));

    return () => { s.disconnect(); };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const addEvent = (msg: string) => setEvents(prev => [msg, ...prev].slice(0, 20));

  const formatEvent = (event: any) => {
    switch (event.type) {
      case 'described': return `💬 ${event.player}: "${event.description}"`;
      case 'voted': return `✅ ${event.player} voted`;
      case 'card_played': return `🃏 ${event.player} played ${event.card?.suit} ${event.card?.value}`;
      case 'card_drawn': return `📥 ${event.player} drew ${event.count} card(s)`;
      case 'game_won': return `🏆 ${event.winner} wins!`;
      case 'last_card': return `⚠️ ${event.player} has ONE card left!`;
      case 'challenge_completed': return `✅ ${event.player} completed their challenge!`;
      case 'answered': return `💡 ${event.player} answered`;
      default: return JSON.stringify(event);
    }
  };

  const joinRoom = () => {
    if (!roomId.trim()) { toast.error('Enter a room ID or booking reference'); return; }
    if (!playerName.trim()) { toast.error('Enter your name'); return; }
    setIsConnecting(true);
    socket?.emit('join_room', { code: roomId.toUpperCase(), playerName });
  };

  const createRoom = () => {
    if (!chosenGame) { toast.error('Choose a game first'); return; }
    if (!playerName.trim()) { toast.error('Enter your name'); return; }
    console.log('Creating room with:', { playerName, game: chosenGame });
    setIsConnecting(true);
    socket?.emit('create_room', { playerName, game: chosenGame });
  };

  const startGame = (gameId: string) => {
    socket?.emit('start_game', { code: roomId.toUpperCase(), game: gameId });
  };

  const sendChat = () => {
    if (!chatInput.trim()) return;
    socket?.emit('chat_message', { message: chatInput });
    setChatInput('');
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(room?.code || roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Room ID copied!');
  };

  const isHost = room?.host === myPlayerId.current;
  const myAssignment = gameState?.assignments?.[myPlayerId.current];
  const myRole = gameState?.roles?.[myPlayerId.current];
  const myHand = gameState?.hands?.[myPlayerId.current] || [];
  const currentPlayerId = gameState?.playerOrder?.[gameState?.currentPlayerIndex];
  const isMyTurn = currentPlayerId === myPlayerId.current;

  // ── LOBBY ──
  if (screen === 'lobby') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Gamepad2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">Bus Games 🎮</h1>
            <p className="text-slate-400 mt-2">Play with your bus mates in real time</p>
          </div>

          {/* Mode selector */}
          <div className="flex bg-white/10 rounded-xl p-1 mb-6">
            <button
              onClick={() => setCreateMode(true)}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                createMode ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Create Room
            </button>
            <button
              onClick={() => setCreateMode(false)}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                !createMode ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Join Room
            </button>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 space-y-4 border border-white/20">
            {createMode ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Choose a Game</label>
                  <div className="space-y-2">
                    {GAMES.map(game => (
                      <button
                        key={game.id}
                        onClick={() => setChosenGame(game.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                          chosenGame === game.id
                            ? 'border-blue-400 bg-blue-500/20'
                            : 'border-white/20 hover:border-blue-400 hover:bg-blue-500/10'
                        }`}
                      >
                        <span className="text-2xl">{game.emoji}</span>
                        <div className="flex-1">
                          <p className="text-white font-semibold text-sm">{game.name}</p>
                          <p className="text-slate-400 text-xs">{game.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={createRoom}
                  disabled={isConnecting || !chosenGame || !playerName.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isConnecting ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating...</>
                  ) : (
                    <><Gamepad2 className="w-5 h-5" /> Create Game Room</>
                  )}
                </button>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Room ID / Booking Reference</label>
                  <input
                    type="text"
                    value={roomId}
                    onChange={e => setRoomId(e.target.value.toUpperCase())}
                    placeholder="e.g. VAM-1234-ABCD"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-slate-500 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 font-mono"
                  />
                  <p className="text-xs text-slate-400 mt-1">Use your booking reference or room code</p>
                </div>
                <button
                  onClick={joinRoom}
                  disabled={isConnecting || !roomId.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isConnecting ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Joining...</>
                  ) : (
                    <><Gamepad2 className="w-5 h-5" /> Join Game Room</>
                  )}
                </button>
              </>
            )}
          </div>

          {/* Game preview */}
          <div className="mt-6 space-y-2">
            <p className="text-slate-400 text-xs text-center mb-3">Available Games</p>
            {GAMES.map(g => (
              <div key={g.id} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-2.5 border border-white/10">
                <span className="text-xl">{g.emoji}</span>
                <div>
                  <p className="text-white text-sm font-medium">{g.name}</p>
                  <p className="text-slate-400 text-xs">{g.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  // ── ROOM (Waiting) ──
  if (screen === 'room') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm">
              <ArrowLeft className="w-4 h-4" /> Leave
            </button>
            <button onClick={copyRoomId} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-sm font-mono transition-all">
              {copied ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              {room?.code || roomId}
            </button>
          </div>

          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white">Game Lobby</h2>
            <p className="text-slate-400 text-sm mt-1">Share the room ID with your bus mates</p>
          </div>

          {/* Players */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20 mb-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4" /> Players ({room?.players?.length || 0})
              </h3>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-green-400 text-xs">Live</span>
              </div>
            </div>
            <div className="space-y-2">
              {room?.players?.map((player: any) => (
                <div key={player.id} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3">
                  <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-white">
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-white font-medium">{player.name}</span>
                  {player.isHost && <Crown className="w-4 h-4 text-amber-400 ml-auto" />}
                  {player.id === myPlayerId.current && <span className="text-xs text-blue-400 ml-auto">You</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Game Selection — host only */}
          {isHost && (
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <Dice1 className="w-4 h-4" /> Choose a Game
              </h3>
              <div className="space-y-2">
                {GAMES.map(game => {
                  const playerCount = room?.players?.length || 0;
                  const needsMore = playerCount < game.minPlayers;
                  return (
                    <button
                      key={game.id}
                      onClick={() => startGame(game.id)}
                      className="w-full flex items-center gap-4 p-4 rounded-xl border border-white/20 hover:border-blue-400 hover:bg-blue-500/20 cursor-pointer transition-all text-left"
                    >
                      <span className="text-2xl">{game.emoji}</span>
                      <div className="flex-1">
                        <p className="text-white font-semibold">{game.name}</p>
                        <p className="text-slate-400 text-xs">{game.desc}</p>
                      </div>
                      {needsMore
                        ? <span className="text-xs text-amber-400">Best with {game.minPlayers}+</span>
                        : <Play className="w-4 h-4 text-blue-400" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {!isHost && (
            <div className="bg-white/10 rounded-2xl p-6 border border-white/20 text-center">
              <div className="w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-white font-medium">Waiting for host to start a game...</p>
              <p className="text-slate-400 text-sm mt-1">The host is choosing a game</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── GAME SCREEN ──
  const gameInfo = GAMES.find(g => g.id === currentGame);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <button onClick={onBack} className="text-slate-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-lg">{gameInfo?.emoji}</span>
          <span className="text-white font-bold text-sm">{gameInfo?.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowChat(!showChat)} className="relative p-2 text-slate-400 hover:text-white">
            <MessageCircle className="w-5 h-5" />
            {chatMessages.length > 0 && <div className="absolute top-0 right-0 w-2 h-2 bg-blue-500 rounded-full" />}
          </button>
          {isHost && (
            <button onClick={() => socket?.emit('next_round')} className="p-2 text-slate-400 hover:text-white">
              <SkipForward className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* My role/assignment card */}
        {myAssignment && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white text-center shadow-lg"
          >
            <p className="text-blue-200 text-sm mb-1">Your secret word</p>
            <p className="text-3xl font-bold">{myAssignment.word}</p>
            <p className={`text-sm mt-2 font-medium px-3 py-1 rounded-full inline-block ${
              myAssignment.role === 'undercover' ? 'bg-red-500/30 text-red-200' :
              myAssignment.role === 'mrwhite' ? 'bg-slate-500/30 text-slate-200' :
              'bg-green-500/30 text-green-200'
            }`}>
              {myAssignment.role === 'undercover' ? '🕵️ You are the Undercover' :
               myAssignment.role === 'mrwhite' ? '❓ You are Mr. White' :
               '👤 You are a Civilian'}
            </p>
            <p className="text-blue-200 text-xs mt-2">Don't reveal your word! Describe it without saying it.</p>
          </motion.div>
        )}

        {/* Impostor role */}
        {myRole && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className={`rounded-2xl p-5 text-white text-center shadow-lg ${
              myRole.role === 'impostor'
                ? 'bg-gradient-to-br from-red-700 to-rose-900'
                : 'bg-gradient-to-br from-blue-600 to-indigo-700'
            }`}
          >
            <p className="text-lg font-bold mb-1">
              {myRole.role === 'impostor' ? '👾 You are the Impostor!' : '👤 You are a Civilian'}
            </p>
            {myRole.role === 'impostor' && (
              <>
                <p className="text-red-200 text-sm">Your secret mission:</p>
                <p className="font-semibold mt-1 text-sm bg-red-500/30 rounded-xl p-3">{myRole.mission}</p>
                <button
                  onClick={() => socket?.emit('game_action', { action: 'report_mission', data: {} })}
                  className="mt-3 bg-white/20 hover:bg-white/30 text-white text-sm px-4 py-2 rounded-xl"
                >
                  Report Mission Complete
                </button>
              </>
            )}
          </motion.div>
        )}

        {/* Who Am I assignment */}
        {gameState?.assignments?.[myPlayerId.current]?.character && !myAssignment && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-purple-600 to-pink-700 rounded-2xl p-5 text-white text-center"
          >
            <p className="text-purple-200 text-sm mb-1">Other players see you as...</p>
            <p className="text-3xl font-bold">{gameState.assignments[myPlayerId.current].character}</p>
            <p className="text-purple-200 text-xs mt-2">But YOU don't know this — ask yes/no questions to guess!</p>
          </motion.div>
        )}

        {/* Would You Rather */}
        {currentGame === 'wouldyourather' && gameState?.question && (
          <div className="space-y-3">
            <div className="bg-white/10 rounded-2xl p-5 border border-white/20 text-center">
              <p className="text-slate-300 text-sm mb-3">Would you rather...</p>
              <div className="space-y-3">
                <button
                  onClick={() => gameState.phase === 'voting' && socket?.emit('game_action', { action: 'vote', data: { choice: 'a' } })}
                  className={`w-full p-4 rounded-xl text-left font-medium transition-all ${
                    gameState.votes?.[myPlayerId.current] === 'a'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  A) {gameState.question.a}
                </button>
                <button
                  onClick={() => gameState.phase === 'voting' && socket?.emit('game_action', { action: 'vote', data: { choice: 'b' } })}
                  className={`w-full p-4 rounded-xl text-left font-medium transition-all ${
                    gameState.votes?.[myPlayerId.current] === 'b'
                      ? 'bg-red-600 text-white'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  B) {gameState.question.b}
                </button>
              </div>
              {gameState.phase === 'results' && gameState.results && (
                <div className="mt-4 bg-white/10 rounded-xl p-4">
                  <p className="text-white font-bold mb-2">Results!</p>
                  <div className="flex gap-4 justify-center text-sm">
                    <span className="text-blue-400 font-bold">A: {gameState.results.a} votes</span>
                    <span className="text-red-400 font-bold">B: {gameState.results.b} votes</span>
                  </div>
                  {isHost && (
                    <button onClick={() => socket?.emit('next_round')} className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm">
                      Next Question →
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Truth or Dare */}
        {currentGame === 'truthordare' && (
          <div className="space-y-3">
            <div className="bg-white/10 rounded-2xl p-5 border border-white/20">
              <p className="text-slate-300 text-sm mb-2">Current player:</p>
              <p className="text-white font-bold text-lg mb-4">
                {room?.players?.find((p: any) => p.id === gameState?.playerOrder?.[gameState?.currentPlayerIndex])?.name}
                {isMyTurn && <span className="text-blue-400 text-sm ml-2">(You!)</span>}
              </p>

              {gameState?.phase === 'choose' && isMyTurn && (
                <div className="flex gap-3">
                  <button
                    onClick={() => socket?.emit('game_action', { action: 'choose', data: { type: 'truth' } })}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl"
                  >
                    🤔 Truth
                  </button>
                  <button
                    onClick={() => socket?.emit('game_action', { action: 'choose', data: { type: 'dare' } })}
                    className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-xl"
                  >
                    🎯 Dare
                  </button>
                </div>
              )}

              {gameState?.phase === 'choose' && !isMyTurn && (
                <div className="text-center py-4 text-slate-400">Waiting for them to choose...</div>
              )}

              {gameState?.phase === 'challenge' && gameState?.currentChallenge && (
                <div className="space-y-4">
                  <div className={`p-4 rounded-xl font-medium text-white ${
                    gameState.currentChallenge.type === 'truth' ? 'bg-blue-600/50' : 'bg-red-600/50'
                  }`}>
                    {gameState.currentChallenge.type === 'truth' ? '🤔 Truth: ' : '🎯 Dare: '}
                    {gameState.currentChallenge.content}
                  </div>
                  {isMyTurn && (
                    <button
                      onClick={() => socket?.emit('game_action', { action: 'complete', data: {} })}
                      className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl"
                    >
                      ✅ Done!
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Trivia */}
        {currentGame === 'trivia' && gameState?.question && (
          <div className="space-y-3">
            <div className="bg-white/10 rounded-2xl p-5 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <span className="text-slate-300 text-sm">Question {gameState.questionIndex + 1}</span>
                <span className="text-blue-400 text-sm font-bold">Round {gameState.round}</span>
              </div>
              <p className="text-white font-bold text-lg mb-4">{gameState.question.q}</p>
              <div className="space-y-2">
                {gameState.question.options.map((opt: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => !gameState.answers?.[myPlayerId.current] && socket?.emit('game_action', { action: 'answer', data: { answerIndex: i } })}
                    className={`w-full text-left p-3 rounded-xl text-sm font-medium transition-all ${
                      gameState.answers?.[myPlayerId.current] === i
                        ? gameState.phase === 'results'
                          ? i === gameState.question.answer ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                          : 'bg-blue-600 text-white'
                        : gameState.phase === 'results' && i === gameState.question.answer
                          ? 'bg-green-600/50 text-white'
                          : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    {String.fromCharCode(65 + i)}) {opt}
                  </button>
                ))}
              </div>
              {gameState.phase === 'results' && (
                <div className="mt-4 space-y-2">
                  <p className="text-white font-bold">Scores:</p>
                  {room?.players?.sort((a: any, b: any) => (gameState.scores?.[b.id] || 0) - (gameState.scores?.[a.id] || 0)).map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between bg-white/10 rounded-xl px-4 py-2">
                      <span className="text-white text-sm">{p.name}</span>
                      <span className="text-blue-400 font-bold">{gameState.scores?.[p.id] || 0} pts</span>
                    </div>
                  ))}
                  {isHost && (
                    <button onClick={() => socket?.emit('next_round')} className="w-full bg-blue-600 text-white py-2 rounded-xl mt-2 text-sm font-bold">
                      Next Question →
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Whot Card Game */}
        {currentGame === 'whot' && gameState && (
          <div className="space-y-4">
            {/* Top card */}
            <div className="flex justify-center">
              <div className={`w-20 h-28 ${SUIT_COLORS[gameState.topCard?.suit]} rounded-xl flex flex-col items-center justify-center text-white font-bold shadow-2xl`}>
                <span className="text-xs opacity-70">{gameState.topCard?.suit}</span>
                <span className="text-3xl">{gameState.topCard?.value}</span>
              </div>
            </div>

            {/* Current player */}
            <div className="text-center">
              <p className="text-slate-300 text-sm">
                {isMyTurn ? '⚡ Your turn!' : `Waiting for ${room?.players?.find((p: any) => p.id === currentPlayerId)?.name}...`}
              </p>
              {gameState.pendingPickup > 0 && (
                <p className="text-red-400 text-sm font-bold">⚠️ Must pick {gameState.pendingPickup} cards or stack!</p>
              )}
            </div>

            {/* My hand */}
            <div>
              <p className="text-slate-300 text-xs mb-2">Your hand ({myHand.length} cards)</p>
              <div className="flex flex-wrap gap-2">
                {myHand.map((card: any) => (
                  <button
                    key={card.id}
                    onClick={() => isMyTurn && setSelectedCard(card.id === selectedCard ? null : card.id)}
                    className={`w-14 h-20 ${SUIT_COLORS[card.suit]} rounded-xl flex flex-col items-center justify-center text-white font-bold transition-all ${
                      selectedCard === card.id ? 'ring-4 ring-white scale-110' : isMyTurn ? 'hover:scale-105' : 'opacity-60'
                    }`}
                  >
                    <span className="text-xs opacity-70">{card.suit}</span>
                    <span className="text-xl">{card.value}</span>
                  </button>
                ))}
              </div>
            </div>

            {isMyTurn && (
              <div className="flex gap-3">
                {selectedCard && (
                  <button
                    onClick={() => { socket?.emit('game_action', { action: 'play_card', data: { cardId: selectedCard } }); setSelectedCard(null); }}
                    className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl"
                  >
                    Play Card ✅
                  </button>
                )}
                <button
                  onClick={() => socket?.emit('game_action', { action: 'draw_card', data: {} })}
                  className="flex-1 bg-slate-600 hover:bg-slate-500 text-white font-bold py-3 rounded-xl"
                >
                  Draw Card 📥
                </button>
              </div>
            )}

            {/* Other players hand count */}
            <div className="bg-white/10 rounded-xl p-3">
              {room?.players?.filter((p: any) => p.id !== myPlayerId.current).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between text-sm py-1">
                  <span className="text-white">{p.name}</span>
                  <span className="text-slate-300">{gameState.hands?.[p.id]?.length || 0} cards</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vote section */}
        {gameState?.phase === 'vote' && (
          <div className="bg-red-900/30 border border-red-500/30 rounded-2xl p-5">
            <p className="text-white font-bold mb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400" /> Vote to Eliminate
            </p>
            <div className="space-y-2">
              {room?.players
                ?.filter((p: any) => !gameState?.eliminated?.includes(p.id) && p.id !== myPlayerId.current)
                .map((p: any) => (
                  <button
                    key={p.id}
                    onClick={() => socket?.emit('vote', { targetId: p.id })}
                    disabled={!!gameState?.votes?.[myPlayerId.current]}
                    className={`w-full text-left p-3 rounded-xl text-white font-medium transition-all ${
                      gameState?.votes?.[myPlayerId.current] === p.id
                        ? 'bg-red-600'
                        : 'bg-white/10 hover:bg-red-500/30'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
            </div>
            <p className="text-slate-400 text-xs mt-3">
              Votes cast: {Object.keys(gameState?.votes || {}).length}/{room?.players?.length}
            </p>
          </div>
        )}

        {/* Undercover describe */}
        {currentGame === 'undercover' && gameState?.phase === 'describe' && (
          <div className="bg-white/10 rounded-2xl p-5 border border-white/20">
            <p className="text-white font-bold mb-2">
              {isMyTurn ? '⚡ Your turn — give a clue!' : `Waiting for ${room?.players?.find((p: any) => p.id === currentPlayerId)?.name}...`}
            </p>
            {gameState.descriptions && Object.keys(gameState.descriptions).length > 0 && (
              <div className="space-y-2 mb-4">
                {Object.entries(gameState.descriptions).map(([pid, desc]: any) => (
                  <div key={pid} className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2">
                    <span className="text-blue-400 text-sm font-medium">{room?.players?.find((p: any) => p.id === pid)?.name}:</span>
                    <span className="text-white text-sm">"{desc}"</span>
                  </div>
                ))}
              </div>
            )}
            {isMyTurn && !gameState.descriptions?.[myPlayerId.current] && (
              <UndercoverDescribeInput onSubmit={(desc) => socket?.emit('game_action', { action: 'describe', data: { description: desc } })} />
            )}
          </div>
        )}

        {/* Events feed */}
        {events.length > 0 && (
          <div className="bg-white/5 rounded-xl p-3 space-y-1">
            {events.slice(0, 5).map((e, i) => (
              <p key={i} className="text-slate-400 text-xs">{e}</p>
            ))}
          </div>
        )}
      </div>

      {/* Chat panel */}
      <AnimatePresence>
        {showChat && (
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-white/10 p-4 z-50"
            style={{ maxHeight: '50vh' }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-white font-bold text-sm">Chat</p>
              <button onClick={() => setShowChat(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <div className="overflow-y-auto space-y-2 mb-3" style={{ maxHeight: '30vh' }}>
              {chatMessages.map((msg, i) => (
                <div key={i} className="text-sm">
                  <span className="text-blue-400 font-medium">{msg.player}: </span>
                  <span className="text-white">{msg.message}</span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChat()}
                placeholder="Message..."
                className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white text-sm outline-none"
              />
              <button onClick={sendChat} className="bg-blue-600 p-2 rounded-xl">
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function UndercoverDescribeInput({ onSubmit }: { onSubmit: (desc: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && value.trim() && onSubmit(value)}
        placeholder="Give a one-word or short clue..."
        className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white text-sm outline-none"
      />
      <button
        onClick={() => value.trim() && onSubmit(value)}
        className="bg-blue-600 hover:bg-blue-500 p-2 rounded-xl"
      >
        <Send className="w-4 h-4 text-white" />
      </button>
    </div>
  );
}