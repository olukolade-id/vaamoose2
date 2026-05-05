const { Server } = require('socket.io');

const rooms = new Map();

// ── GAME DATA ──
const WHOT_CARDS = [];
['Circle','Triangle','Cross','Square'].forEach(suit =>
  [1,2,3,4,5,7,8,10,11,12,13,14].forEach(val =>
    WHOT_CARDS.push({ suit, value: val, id: `${suit}-${val}-${Math.random()}` })
  )
);
for (let i = 0; i < 5; i++) WHOT_CARDS.push({ suit: 'Whot', value: 20, id: `Whot-20-${i}` });

const TRIVIA = [
  { q: 'What is the capital of Nigeria?', options: ['Lagos','Abuja','Kano','Ibadan'], answer: 1 },
  { q: 'Which musician is known as "Odogwu"?', options: ['Davido','Wizkid','Burna Boy','Rema'], answer: 2 },
  { q: 'What does JAMB stand for?', options: ['Joint Admissions & Matriculation Board','Junior Academic Board','Joint Academic Management Board','Junior Admissions Bureau'], answer: 0 },
  { q: 'When did Nigeria gain independence?', options: ['1957','1960','1963','1966'], answer: 1 },
  { q: 'What does NYSC stand for?', options: ['National Youth Service Corps','Nigerian Youth Student Council','National Youth Skills Centre','Nigerian Youth Social Club'], answer: 0 },
  { q: 'What is "Owambe"?', options: ['A type of food','A big party','A dance style','A greeting'], answer: 1 },
  { q: 'What is "Suya"?', options: ['A soup','Spicy grilled meat','A dance','A cap'], answer: 1 },
  { q: 'What does "Omo" mean in Yoruba slang?', options: ['Friend','Wow/surprise','Money','Eat'], answer: 1 },
  { q: 'Which app do Nigerians use most for transfers?', options: ['PayPal','Opay','Venmo','CashApp'], answer: 1 },
  { q: 'Who founded Dangote Group?', options: ['Mike Adenuga','Aliko Dangote','Tony Elumelu','Femi Otedola'], answer: 1 },
  { q: 'Which state is "The Center of Excellence"?', options: ['Abuja','Lagos','Rivers','Kano'], answer: 1 },
  { q: 'What is the Nigerian currency?', options: ['Cedis','Pounds','Naira','Shilling'], answer: 2 },
  { q: 'what is the color of the Nigeria Flag?', options:['GWG','YGW','GGR','RGB'], answer: 0},
];

const WYR = [
  { q: 'Would you rather repeat 100 level forever OR never finish school?', a: 'Repeat 100 level forever', b: 'Never finish school' },
  { q: 'Would you rather eat jollof rice every day OR never eat jollof again?', a: 'Jollof every day', b: 'Never eat jollof' },
  { q: 'Would you rather have ASUU strike every semester OR double tuition?', a: 'ASUU strike', b: 'Double tuition' },
  { q: 'Would you rather lose your phone OR lose your wallet?', a: 'Lose phone', b: 'Lose wallet' },
  { q: 'Would you rather fail finals OR repeat a year?', a: 'Fail finals', b: 'Repeat a year' },
  { q: 'Would you rather be broke but happy OR rich but stressed?', a: 'Broke but happy', b: 'Rich but stressed' },
  { q: 'Would you rather have no data for a week OR no transport money?', a: 'No data', b: 'No transport' },
  { q: 'Would you rather know when OR how you will die?', a: 'When I die', b: 'How I die' },
  { q: 'Would you rather be famous in Nigeria OR successful abroad?', a: 'Famous in Nigeria', b: 'Successful abroad' },
  { q: 'Would you rather eat school cafeteria food every day OR cook yourself?', a: 'School cafeteria', b: 'Cook myself' },
];

const TRUTHS = [
  'Who is your secret crush in school?',
  'Have you ever cheated in an exam?',
  'What is your actual GPA?',
  'Have you ever lied to your parents about your grades?',
  'Have you ever ghosted someone?',
  'What is the most embarrassing thing on your phone right now?',
  'Have you ever fallen asleep in a lecture?',
  'What is your biggest fear about graduating?',
  'Who on this bus do you think is the most boring?',
  'What is the most money you spent in one day and regretted?',
];

const DARES = [
  'Call someone in your contacts and sing them a Nigerian anthem',
  'Do your best impression of your strictest lecturer',
  'Speak only in Pidgin English for the next 5 minutes',
  'Do 10 squats right now in the bus',
  'Change your WhatsApp status to "I love Vaamoose 🚌" for 10 minutes',
  'Call your mum and tell her you miss her food',
  'Imitate a conductor shouting bus stops',
  'Tell a joke — if nobody laughs, do 5 push-ups',
  'Send a voice note to your last WhatsApp contact saying "I miss you"',
  'Speak only Hausa for 2 minutes',
];

const UNDERCOVER_WORDS = [
  { normal: 'Jollof Rice', undercover: 'Fried Rice' },
  { normal: 'WhatsApp', undercover: 'Telegram' },
  { normal: 'Danfo', undercover: 'BRT Bus' },
  { normal: 'Naira', undercover: 'Dollar' },
  { normal: 'Suya', undercover: 'Shawarma' },
  { normal: 'Lagos', undercover: 'Abuja' },
  { normal: 'Garri', undercover: 'Semovita' },
  { normal: 'Okada', undercover: 'Keke Napep' },
  { normal: 'MTN', undercover: 'Glo' },
  { normal: 'Lecturer', undercover: 'Professor' },
  { normal: 'UNILAG', undercover: 'OAU' },
  { normal: 'Agege Bread', undercover: 'Croissant' },
  { normal: 'heart', undercover:'lungs'},
  { normal: 'blade', undercover: 'knife'},
  
];

const WHO_AM_I = [
  'Dangote','Davido','Wizkid','Burna Boy','Funke Akindele',
  'Simi','Olamide','Tiwa Savage','Adekunle Gold','Mr Eazi',
  'Fireboy DML','Rema','Ayra Starr','Kizz Daniel','Falz',
  'Fela Kuti','Chinua Achebe','Wole Soyinka','2baba','Don Jazzy',
  'Ngozi Okonjo-Iweala','Tems','Asake','Yemi Alade','Seun Kuti',
];

const IMPOSTOR_MISSIONS = [
  'Convince everyone the driver took a wrong turn without being obvious',
  'Make passengers think there is a bad smell in the bus',
  'Start a debate about jollof rice vs fried rice and defend the losing side',
  'Make people think the bus is going too fast',
  'Convince everyone they heard a strange noise from the engine',
];

const CREW_TASKS = [
  'Describe what you see outside the window right now',
  'Share your favourite memory of your university town',
  'Say something genuine and nice about the person on your left',
  'Describe the current vibe in this bus in 3 words',
  'Share your best advice for surviving university life',
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function initGameServer(server) {
  console.log('🎮 Initializing game server...');

  const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on('connection', (socket) => {
    console.log('🎮 Player connected:', socket.id);

    // ── CREATE ROOM ──
    // Client sends: { playerName, game, bookingRef? }
    // Client listens: room_created { room, playerId }
    socket.on('create_room', ({ playerName, game, bookingRef }) => {
      if (!playerName?.trim()) return socket.emit('error', { message: 'Name is required' });
      if (!game) return socket.emit('error', { message: 'Choose a game first' });

      const code = bookingRef
        ? bookingRef.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 6)
        : generateCode();

      const room = {
        code,
        game,
        host: socket.id,
        players: [{ id: socket.id, name: playerName.trim(), score: 0, isHost: true }],
        state: 'lobby',
        gameData: {},
        createdAt: Date.now(),
      };

      rooms.set(code, room);
      socket.join(code);

      console.log(`✅ Room ${code} created by ${playerName} for game: ${game}`);

      // This matches what GameRoom.tsx listens for
      socket.emit('room_created', { room, playerId: socket.id });
    });

    // ── JOIN ROOM ──
    // Client sends: { code, playerName }
    // Client listens: joined_room { room, playerId }
    socket.on('join_room', ({ code, playerName }) => {
      const roomCode = code?.toUpperCase().trim();
      if (!roomCode) return socket.emit('error', { message: 'Enter a room code' });
      if (!playerName?.trim()) return socket.emit('error', { message: 'Enter your name' });

      const room = rooms.get(roomCode);
      if (!room) return socket.emit('error', { message: `Room "${roomCode}" not found. Check the code!` });
      if (room.state !== 'lobby') return socket.emit('error', { message: 'Game has already started!' });
      if (room.players.length >= 12) return socket.emit('error', { message: 'Room is full (max 12 players)' });
      if (room.players.find(p => p.name.toLowerCase() === playerName.trim().toLowerCase())) {
        return socket.emit('error', { message: 'That name is already taken in this room!' });
      }

      const newPlayer = { id: socket.id, name: playerName.trim(), score: 0, isHost: false };
      room.players.push(newPlayer);
      socket.join(roomCode);

      console.log(`✅ ${playerName} joined room ${roomCode}`);

      // Notify everyone in room that player list changed
      io.to(roomCode).emit('room_updated', { room });

      // Send joined confirmation to THIS player
      // This matches what GameRoom.tsx listens for: 'joined_room'
      socket.emit('joined_room', { room, playerId: socket.id });

      // Notify others that someone joined
      socket.to(roomCode).emit('player_joined_notification', {
        playerName: playerName.trim(),
        playerCount: room.players.length,
        game: room.game,
      });
    });

    // ── START GAME ──
    // Client sends: { code, game }
    // Client listens: game_started { game, gameState }
    socket.on('start_game', ({ code, game }) => {
      const roomCode = (code || '').toUpperCase();
      const room = rooms.get(roomCode);

      if (!room) return socket.emit('error', { message: 'Room not found' });
      if (room.host !== socket.id) return socket.emit('error', { message: 'Only the host can start the game' });
      if (room.players.length < 2) return socket.emit('error', { message: 'Need at least 2 players to start!' });

      const gameId = game || room.game;
      room.game = gameId;
      room.state = 'playing';

      console.log(`🎮 Starting ${gameId} in room ${roomCode}`);

      const starters = {
        undercover:    () => startUndercover(room, io),
        whoami:        () => startWhoAmI(room, io),
        wouldyourather:() => startWouldRather(room, io),
        truthordare:   () => startTruthDare(room, io),
        whot:          () => startWhot(room, io),
        trivia:        () => startTrivia(room, io),
        impostor:      () => startImpostor(room, io),
        // aliases
        who_am_i:      () => startWhoAmI(room, io),
        would_rather:  () => startWouldRather(room, io),
        truth_dare:    () => startTruthDare(room, io),
      };

      if (starters[gameId]) starters[gameId]();
      else socket.emit('error', { message: `Unknown game: ${gameId}` });
    });

    // ── UNDERCOVER ──
    socket.on('undercover_clue', ({ code, clue }) => {
      const room = rooms.get(code?.toUpperCase());
      if (!room) return;
      const player = room.players.find(p => p.id === socket.id);
      if (!player) return;

      room.gameData.clues = room.gameData.clues || [];
      // Prevent duplicate clues
      if (room.gameData.clues.find(c => c.playerId === socket.id)) return;
      room.gameData.clues.push({ playerId: socket.id, playerName: player.name, clue });

      const alive = room.players.filter(p => !(room.gameData.eliminated || []).includes(p.id));
      io.to(code.toUpperCase()).emit('clue_submitted', {
        clues: room.gameData.clues,
        remaining: alive.length - room.gameData.clues.length,
      });

      if (room.gameData.clues.length >= alive.length) {
        io.to(code.toUpperCase()).emit('voting_phase', {
          clues: room.gameData.clues,
          players: alive,
        });
      }
    });

    socket.on('undercover_vote', ({ code, targetId }) => {
      const room = rooms.get(code?.toUpperCase());
      if (!room) return;
      room.gameData.votes = room.gameData.votes || {};
      if (room.gameData.votes[socket.id]) return; // already voted
      room.gameData.votes[socket.id] = targetId;

      const alive = room.players.filter(p => !(room.gameData.eliminated || []).includes(p.id));
      io.to(code.toUpperCase()).emit('vote_update', {
        votesIn: Object.keys(room.gameData.votes).length,
        total: alive.length,
      });

      if (Object.keys(room.gameData.votes).length >= alive.length) {
        const counts = {};
        Object.values(room.gameData.votes).forEach(v => counts[v] = (counts[v] || 0) + 1);
        const eliminatedId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
        const eliminated = room.players.find(p => p.id === eliminatedId);
        const wasUndercover = eliminatedId === room.gameData.undercoverId;

        room.gameData.eliminated = [...(room.gameData.eliminated || []), eliminatedId];

        io.to(code.toUpperCase()).emit('player_eliminated', {
          eliminatedName: eliminated?.name,
          wasUndercover,
          undercoverWord: wasUndercover ? room.gameData.undercoverWord : null,
          normalWord: wasUndercover ? room.gameData.normalWord : null,
          gameState: room.gameData,
        });

        if (wasUndercover) {
          room.state = 'finished';
          io.to(code.toUpperCase()).emit('game_over', {
            winner: 'civilians',
            undercoverPlayer: eliminated?.name,
            undercoverWord: room.gameData.undercoverWord,
            normalWord: room.gameData.normalWord,
          });
        } else {
          const remaining = room.players.filter(p => !(room.gameData.eliminated || []).includes(p.id));
          if (remaining.length <= 2) {
            room.state = 'finished';
            const undercoverPlayer = room.players.find(p => p.id === room.gameData.undercoverId);
            io.to(code.toUpperCase()).emit('game_over', {
              winner: 'undercover',
              undercoverPlayer: undercoverPlayer?.name,
              undercoverWord: room.gameData.undercoverWord,
              normalWord: room.gameData.normalWord,
            });
          } else {
            room.gameData.clues = [];
            room.gameData.votes = {};
            io.to(code.toUpperCase()).emit('new_round', {
              players: remaining,
              gameState: room.gameData,
            });
          }
        }
      }
    });

    // ── GAME ACTIONS (unified handler) ──
    socket.on('game_action', ({ action, data }) => {
      // Find which room this socket is in
      const roomCode = [...socket.rooms].find(r => r !== socket.id && rooms.has(r));
      if (!roomCode) return;
      const room = rooms.get(roomCode);
      if (!room) return;
      const player = room.players.find(p => p.id === socket.id);
      if (!player) return;

      switch (action) {

        // WOULD YOU RATHER
        case 'vote': {
          const { choice } = data;
          if (!room.gameData.votes) room.gameData.votes = {};
          if (room.gameData.votes[socket.id]) return; // already voted
          room.gameData.votes[socket.id] = choice;
          const countA = Object.values(room.gameData.votes).filter(v => v === 'a').length;
          const countB = Object.values(room.gameData.votes).filter(v => v === 'b').length;
          io.to(roomCode).emit('game_state_updated', {
            gameState: { ...room.gameData, phase: 'voting', votes: room.gameData.votes },
            event: { type: 'voted', player: player.name },
          });
          if (Object.keys(room.gameData.votes).length >= room.players.length) {
            room.gameData.phase = 'results';
            room.gameData.results = { a: countA, b: countB };
            io.to(roomCode).emit('game_state_updated', { gameState: room.gameData });
          }
          break;
        }

        // TRUTH OR DARE
        case 'choose': {
          const { type } = data;
          const list = type === 'truth' ? TRUTHS : DARES;
          const content = list[Math.floor(Math.random() * list.length)];
          room.gameData.currentChallenge = { type, content };
          room.gameData.phase = 'challenge';
          io.to(roomCode).emit('game_state_updated', { gameState: room.gameData });
          break;
        }
        case 'complete': {
          room.gameData.currentPlayerIndex = ((room.gameData.currentPlayerIndex || 0) + 1) % room.players.length;
          room.gameData.phase = 'choose';
          room.gameData.currentChallenge = null;
          const nextPlayer = room.players[room.gameData.currentPlayerIndex];
          io.to(roomCode).emit('game_state_updated', {
            gameState: { ...room.gameData, playerOrder: room.gameData.playerOrder },
            event: { type: 'challenge_completed', player: player.name },
          });
          io.to(nextPlayer.id).emit('your_turn');
          break;
        }

        // TRIVIA
        case 'answer': {
          const { answerIndex } = data;
          if (!room.gameData.answers) room.gameData.answers = {};
          if (room.gameData.answers[socket.id] !== undefined) return;
          room.gameData.answers[socket.id] = answerIndex;
          const q = room.gameData.question;
          if (answerIndex === q.answer) {
            room.gameData.scores = room.gameData.scores || {};
            room.gameData.scores[socket.id] = (room.gameData.scores[socket.id] || 0) + 1;
          }
          io.to(roomCode).emit('game_state_updated', {
            gameState: room.gameData,
            event: { type: 'answered', player: player.name },
          });
          if (Object.keys(room.gameData.answers).length >= room.players.length) {
            room.gameData.phase = 'results';
            io.to(roomCode).emit('game_state_updated', { gameState: room.gameData });
          }
          break;
        }

        // WHO AM I: give clue
        case 'describe': {
          const { description } = data;
          io.to(roomCode).emit('game_state_updated', {
            gameState: room.gameData,
            event: { type: 'described', player: player.name, description },
          });
          break;
        }

        // WHOT
        case 'play_card': {
          const { cardId } = data;
          const hand = room.gameData.hands?.[socket.id] || [];
          const cardIdx = hand.findIndex(c => c.id === cardId);
          if (cardIdx === -1) return socket.emit('error', { message: 'Card not in your hand' });
          const card = hand[cardIdx];
          const top = room.gameData.pile?.[room.gameData.pile.length - 1];
          const valid = card.suit === 'Whot' || card.suit === room.gameData.currentSuit || card.value === top?.value;
          if (!valid) return socket.emit('error', { message: 'Cannot play that card!' });

          hand.splice(cardIdx, 1);
          room.gameData.pile.push(card);
          if (card.suit !== 'Whot') room.gameData.currentSuit = card.suit;

          if (hand.length === 0) {
            room.state = 'finished';
            io.to(roomCode).emit('game_state_updated', {
              gameState: room.gameData,
              event: { type: 'game_won', winner: player.name },
            });
            break;
          }
          if (hand.length === 1) io.to(roomCode).emit('game_state_updated', { gameState: room.gameData, event: { type: 'last_card', player: player.name } });

          room.gameData.currentPlayerIndex = (room.gameData.currentPlayerIndex + 1) % room.players.length;
          io.to(roomCode).emit('game_state_updated', {
            gameState: {
              ...room.gameData,
              topCard: card,
              hands: Object.fromEntries(Object.entries(room.gameData.hands).map(([k, v]) => [k, v.length])),
            },
            event: { type: 'card_played', player: player.name, card },
          });
          socket.emit('hand_updated', { hand });
          break;
        }

        case 'draw_card': {
          if (!room.gameData.deck?.length) room.gameData.deck = shuffle([...WHOT_CARDS]);
          const drawn = room.gameData.deck.pop();
          room.gameData.hands[socket.id].push(drawn);
          room.gameData.currentPlayerIndex = (room.gameData.currentPlayerIndex + 1) % room.players.length;
          io.to(roomCode).emit('game_state_updated', {
            gameState: room.gameData,
            event: { type: 'card_drawn', player: player.name, count: 1 },
          });
          socket.emit('hand_updated', { hand: room.gameData.hands[socket.id] });
          break;
        }

        // IMPOSTOR
        case 'report_mission': {
          io.to(roomCode).emit('game_state_updated', {
            gameState: room.gameData,
            event: { type: 'mission_reported', player: player.name },
          });
          // Start voting
          setTimeout(() => {
            room.gameData.phase = 'vote';
            io.to(roomCode).emit('game_state_updated', { gameState: room.gameData });
          }, 2000);
          break;
        }
      }
    });

    // ── NEXT ROUND (host) ──
    socket.on('next_round', ({ code } = {}) => {
      const roomCode = code?.toUpperCase() || [...socket.rooms].find(r => r !== socket.id && rooms.has(r));
      if (!roomCode) return;
      const room = rooms.get(roomCode);
      if (!room || room.host !== socket.id) return;

      if (room.game === 'wouldyourather' || room.game === 'would_rather') {
        room.gameData.questionIndex = (room.gameData.questionIndex || 0) + 1;
        room.gameData.votes = {};
        room.gameData.phase = 'voting';
        const idx = room.gameData.questionIndex;
        const qs = room.gameData.questions;
        if (!qs || idx >= qs.length) {
          room.state = 'finished';
          io.to(roomCode).emit('game_over', { message: 'All questions done! What a journey! 🚌' });
        } else {
          room.gameData.question = qs[idx];
          io.to(roomCode).emit('new_round', { gameState: room.gameData });
        }
      }

      if (room.game === 'trivia') {
        room.gameData.questionIndex = (room.gameData.questionIndex || 0) + 1;
        room.gameData.answers = {};
        room.gameData.phase = 'question';
        const idx = room.gameData.questionIndex;
        const qs = room.gameData.questions;
        if (!qs || idx >= qs.length) {
          room.state = 'finished';
          const sorted = room.players.sort((a, b) => (room.gameData.scores?.[b.id] || 0) - (room.gameData.scores?.[a.id] || 0));
          io.to(roomCode).emit('game_over', { winner: sorted[0].name, players: sorted });
        } else {
          room.gameData.question = qs[idx];
          io.to(roomCode).emit('new_round', { gameState: room.gameData });
        }
      }
    });

    // ── VOTE (undercover/impostor direct) ──
    socket.on('vote', ({ targetId }) => {
      const roomCode = [...socket.rooms].find(r => r !== socket.id && rooms.has(r));
      if (!roomCode) return;
      const room = rooms.get(roomCode);
      if (!room) return;

      room.gameData.votes = room.gameData.votes || {};
      if (room.gameData.votes[socket.id]) return;
      room.gameData.votes[socket.id] = targetId;

      io.to(roomCode).emit('vote_cast', {
        voter: room.players.find(p => p.id === socket.id)?.name,
        totalVotes: Object.keys(room.gameData.votes).length,
        totalPlayers: room.players.length,
      });

      if (Object.keys(room.gameData.votes).length >= room.players.length) {
        const counts = {};
        Object.values(room.gameData.votes).forEach(v => counts[v] = (counts[v] || 0) + 1);
        const accusedId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
        const accused = room.players.find(p => p.id === accusedId);
        const impostorPlayer = room.players.find(p => p.id === room.gameData.impostorId);

        room.state = 'finished';
        io.to(roomCode).emit('game_over', {
          caught: accusedId === room.gameData.impostorId,
          impostor: impostorPlayer?.name,
          accused: accused?.name,
          mission: room.gameData.mission,
          winner: accusedId === room.gameData.impostorId ? 'crew' : 'impostor',
        });
      }
    });

    // ── CHAT ──
    socket.on('chat_message', ({ message }) => {
      const roomCode = [...socket.rooms].find(r => r !== socket.id && rooms.has(r));
      if (!roomCode || !message?.trim()) return;
      const room = rooms.get(roomCode);
      const player = room?.players.find(p => p.id === socket.id);
      io.to(roomCode).emit('chat_message', {
        player: player?.name || 'Unknown',
        message: message.trim(),
        time: new Date().toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' }),
      });
    });

    // ── DISCONNECT ──
    socket.on('disconnect', () => {
      rooms.forEach((room, code) => {
        const idx = room.players.findIndex(p => p.id === socket.id);
        if (idx === -1) return;
        const player = room.players.splice(idx, 1)[0];
        if (room.players.length === 0) {
          rooms.delete(code);
          console.log(`Room ${code} deleted (empty)`);
        } else {
          if (room.host === socket.id) {
            room.host = room.players[0].id;
            room.players[0].isHost = true;
          }
          io.to(code).emit('player_left', { playerName: player.name, players: room.players });
          io.to(code).emit('room_updated', { room });
        }
      });
    });
  });

  // ── GAME STARTERS ──

  function startUndercover(room, io) {
    const pair = UNDERCOVER_WORDS[Math.floor(Math.random() * UNDERCOVER_WORDS.length)];
    const undercoverIdx = Math.floor(Math.random() * room.players.length);
    const undercoverPlayer = room.players[undercoverIdx];

    room.gameData = {
      normalWord: pair.normal,
      undercoverWord: pair.undercover,
      undercoverId: undercoverPlayer.id,
      eliminated: [],
      clues: [],
      votes: {},
      phase: 'clue',
      round: 1,
    };

    room.players.forEach(p => {
      const word = p.id === undercoverPlayer.id ? pair.undercover : pair.normal;
      io.to(p.id).emit('game_started', {
        game: 'undercover',
        gameState: {
          ...room.gameData,
          yourWord: word,
          isUndercover: p.id === undercoverPlayer.id,
          players: room.players.map(x => ({ id: x.id, name: x.name })),
        },
      });
    });
  }

  function startWhoAmI(room, io) {
    const chars = shuffle(WHO_AM_I);
    const assignments = {};
    room.players.forEach((p, i) => { assignments[p.id] = { character: chars[i % chars.length] }; });
    room.gameData = { assignments, phase: 'playing' };

    room.players.forEach(p => {
      const others = {};
      room.players.filter(x => x.id !== p.id).forEach(x => { others[x.id] = assignments[x.id]; });
      io.to(p.id).emit('game_started', {
        game: 'whoami',
        gameState: {
          ...room.gameData,
          assignments: { ...others, [p.id]: { character: '???' } },
          players: room.players.map(x => ({ id: x.id, name: x.name })),
        },
      });
    });
  }

  function startWouldRather(room, io) {
    const questions = shuffle(WYR);
    room.gameData = { questionIndex: 0, questions, question: questions[0], votes: {}, phase: 'voting' };
    io.to(room.code).emit('game_started', {
      game: 'wouldyourather',
      gameState: { ...room.gameData, players: room.players },
    });
  }

  function startTruthDare(room, io) {
    const order = shuffle([...room.players]);
    room.gameData = {
      currentPlayerIndex: 0,
      playerOrder: order.map(p => p.id),
      phase: 'choose',
      currentChallenge: null,
    };
    io.to(room.code).emit('game_started', {
      game: 'truthordare',
      gameState: { ...room.gameData, players: room.players },
    });
    io.to(order[0].id).emit('your_turn');
  }

  function startWhot(room, io) {
    const deck = shuffle([...WHOT_CARDS]);
    const hands = {};
    room.players.forEach(p => { hands[p.id] = deck.splice(0, 5); });
    const topCard = deck.pop();
    room.gameData = {
      deck,
      hands,
      pile: [topCard],
      topCard,
      currentSuit: topCard.suit,
      currentPlayerIndex: 0,
      playerOrder: room.players.map(p => p.id),
      phase: 'playing',
    };

    io.to(room.code).emit('game_started', {
      game: 'whot',
      gameState: {
        topCard,
        currentSuit: topCard.suit,
        currentPlayerIndex: 0,
        playerOrder: room.players.map(p => p.id),
        hands: Object.fromEntries(Object.entries(hands).map(([k, v]) => [k, v.length])),
        phase: 'playing',
        players: room.players,
      },
    });

    room.players.forEach(p => {
      io.to(p.id).emit('hand_updated', { hand: hands[p.id] });
    });
  }

  function startTrivia(room, io) {
    const questions = shuffle([...TRIVIA]).slice(0, 10);
    room.gameData = { questionIndex: 0, questions, question: questions[0], answers: {}, scores: {}, phase: 'question', round: 1 };
    io.to(room.code).emit('game_started', {
      game: 'trivia',
      gameState: { ...room.gameData, players: room.players },
    });
  }

  function startImpostor(room, io) {
    const impostorIdx = Math.floor(Math.random() * room.players.length);
    const impostor = room.players[impostorIdx];
    const mission = IMPOSTOR_MISSIONS[Math.floor(Math.random() * IMPOSTOR_MISSIONS.length)];
    const task = CREW_TASKS[Math.floor(Math.random() * CREW_TASKS.length)];

    room.gameData = { impostorId: impostor.id, mission, task, phase: 'acting', votes: {} };

    room.players.forEach(p => {
      const isImpostor = p.id === impostor.id;
      io.to(p.id).emit('game_started', {
        game: 'impostor',
        gameState: {
          ...room.gameData,
          roles: {
            [p.id]: {
              role: isImpostor ? 'impostor' : 'crew',
              mission: isImpostor ? mission : task,
            },
          },
          players: room.players.map(x => ({ id: x.id, name: x.name })),
        },
      });
    });
  }

  return io;
}

module.exports = { initGameServer };