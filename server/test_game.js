// Test script for game room creation
const io = require('socket.io-client');

const SOCKET_URL = 'http://localhost:5000';

console.log('Testing game room creation...');

const socket = io(SOCKET_URL, {
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('✅ Connected to game server');

  // Test room creation
  console.log('Creating room...');
  socket.emit('create_room', {
    playerName: 'TestPlayer',
    game: 'trivia'
  });
});

socket.on('room_created', (data) => {
  console.log('🎮 Room created successfully!');
  console.log('Room data:', data);
  console.log('Room code:', data.room?.code);
  console.log('Player ID:', data.playerId);

  // Test joining the room with another player
  console.log('Testing join room...');
  const secondSocket = io(SOCKET_URL, {
    transports: ['websocket', 'polling']
  });

  secondSocket.on('connect', () => {
    console.log('✅ Second player connected');
    secondSocket.emit('join_room', {
      code: data.room.code,
      playerName: 'TestPlayer2'
    });
  });

  secondSocket.on('joined_room', (joinData) => {
    console.log('✅ Second player joined successfully!');
    console.log('Join data:', joinData);

    // Test starting game
    console.log('Testing game start...');
    socket.emit('start_game', {
      code: data.room.code,
      game: 'trivia'
    });
  });

  secondSocket.on('game_started', (gameData) => {
    console.log('🎮 Game started successfully!');
    console.log('Game data:', gameData);

    // Clean up
    setTimeout(() => {
      socket.disconnect();
      secondSocket.disconnect();
      console.log('Test completed successfully!');
      process.exit(0);
    }, 2000);
  });

  secondSocket.on('error', (error) => {
    console.error('❌ Join error:', error);
  });
});

socket.on('error', (error) => {
  console.error('❌ Creation error:', error);
});

socket.on('disconnect', () => {
  console.log('Socket disconnected');
});

// Timeout after 10 seconds
setTimeout(() => {
  console.error('❌ Test timed out');
  socket.disconnect();
  process.exit(1);
}, 10000);