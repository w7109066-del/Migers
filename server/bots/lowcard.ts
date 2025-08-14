
import { Server } from 'socket.io';

type Player = {
  id: string;
  name: string;
  isBot: boolean;
  card?: string;
  bet?: number;
};

type GameRoom = {
  players: Player[];
  isRunning: boolean;
  bet: number;
  timeout?: NodeJS.Timeout;
};

const rooms: Record<string, GameRoom> = {};
const botPresence: Record<string, boolean> = {}; // Track bot presence in rooms
const suits = ['c', 'd', 'h', 's'];

function getDeck(): string[] {
  const deck = [];
  for (let i = 2; i <= 14; i++) {
    for (const s of suits) {
      const label = i <= 10 ? `${i}` : i === 11 ? 'j' : i === 12 ? 'q' : i === 13 ? 'k' : 'a';
      deck.push(`lc_${label}${s}.png`);
    }
  }
  return deck;
}

function shuffle(array: string[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function getCardValue(filename: string): number {
  const name = filename.split('_')[1].split('.')[0];
  const val = name.slice(0, -1); // Remove suit character
  if (val === 'a') return 14;
  if (val === 'k') return 13;
  if (val === 'q') return 12;
  if (val === 'j') return 11;
  return parseInt(val);
}

// Dummy potongCoin, ganti dengan DB logic kamu
function potongCoin(userId: string, amount: number): boolean {
  // TODO: cek dan potong saldo user, return false jika saldo kurang
  return true;
}

function drawOneCard(player: Player): void {
  const deck = getDeck();
  shuffle(deck);
  player.card = deck.pop();
}

function startDrawTimer(io: Server, room: string): void {
  const game = rooms[room];
  if (!game) return;

  if (game.timeout) clearTimeout(game.timeout);

  game.timeout = setTimeout(() => {
    game.players.forEach(p => {
      if (!p.card) {
        drawOneCard(p);
        io.to(room).emit('bot_message', 'LowCardBot', `⏱️ Auto-draw - ${p.name}:`, `/cards/${p.card}`, room);
      }
    });
    checkAllDrawn(io, room);
  }, 20000);
}

function checkAllDrawn(io: Server, room: string): void {
  const game = rooms[room];
  if (!game) return;
  const allDrawn = game.players.every(p => p.card);
  if (!allDrawn) return;

  const lowest = game.players.reduce((prev, curr) => {
    return getCardValue(curr.card!) < getCardValue(prev.card!) ? curr : prev;
  });

  io.to(room).emit('bot_message', 'LowCardBot', `${lowest.name} OUT dengan kartu terendah!`, null, room);
  game.players = game.players.filter(p => p.name !== lowest.name);

  if (game.players.length <= 1) {
    const winner = game.players[0]?.name || 'No one';
    io.to(room).emit('bot_message', 'LowCardBot', `🎉 Game selesai! Pemenang: ${winner}! Ketik !start <bet> untuk game baru.`, null, room);
    // Don't delete the room, just reset the game state
    game.isRunning = false;
    game.players = [];
    if (game.timeout) {
      clearTimeout(game.timeout);
      delete game.timeout;
    }
  } else {
    game.players.forEach(p => delete p.card);
    startDrawTimer(io, room);
    io.to(room).emit('bot_message', 'LowCardBot', `Ronde berikutnya! Ketik !d untuk draw, atau tunggu 20 detik.`, null, room);
  }
}

// Function to check if bot is active in a room
export function isBotActiveInRoom(roomId: string): boolean {
  return botPresence[roomId] === true;
}

// Function to get bot status for a room
export function getBotStatus(roomId: string): string {
  if (botPresence[roomId]) {
    const game = rooms[roomId];
    if (game?.isRunning) {
      return `🎮 LowCardBot sedang menjalankan game dengan ${game.players.length} pemain.`;
    }
    return `🎮 LowCardBot aktif! Ketik !start <bet> untuk memulai game.`;
  }
  return `🎮 LowCardBot tidak aktif di room ini.`;
}

export function handleLowcardCommand(socket: any, msg: string): void {
  const [command, ...args] = msg.trim().split(" ");

  switch (command) {
    case "!start":
      // Start game logic
      break;
    case "!j":
      // Join logic
      break;
    case "!d":
      // Draw card logic
      break;
    case "!status":
      // Show bot status
      break;
    default:
      break;
  }
}

// Initialize bot presence in a room
function ensureBotPresence(io: Server, roomId: string): void {
  if (!botPresence[roomId]) {
    botPresence[roomId] = true;
    // Announce bot presence to room
    io.to(roomId).emit('bot_message', 'LowCardBot', '🎮 LowCardBot is now active! Type !start <bet> to begin playing.', null, roomId);
    console.log(`LowCardBot initialized in room: ${roomId}`);
  }
}

// Remove bot from room (only when explicitly needed)
function removeBotPresence(roomId: string): void {
  delete botPresence[roomId];
  delete rooms[roomId];
  console.log(`LowCardBot removed from room: ${roomId}`);
}

export function handleLowCardBot(io: Server, socket: any): void {
  socket.on('command', (room: string, msg: string) => {
    if (!msg.startsWith('!')) return;

    // Ensure bot is present in the room when any command is used
    ensureBotPresence(io, room);

    const cmd = msg.split(' ')[0];

    switch (cmd) {
      case '!start': {
        if (rooms[room]?.isRunning) return;
        const parts = msg.split(' ');
        const bet = parts.length > 1 ? parseInt(parts[1]) : 0;
        if (bet <= 0) {
          io.to(room).emit('bot_message', 'LowCardBot', 'Jumlah taruhan tidak valid.');
          return;
        }

        rooms[room] = {
          players: [],
          isRunning: true,
          bet,
        };

        io.to(room).emit('bot_message', 'LowCardBot', `🎮 Game dimulai dengan taruhan ${bet} koin! Ketik !j untuk join.`, null, room);
        break;
      }

      case '!j': {
        const game = rooms[room];
        if (!game?.isRunning) {
          io.to(room).emit('bot_message', 'LowCardBot', 'Game belum dimulai, ketik !start (bet) dulu.');
          return;
        }
        if (game.players.find(p => p.id === socket.id)) return;

        if (!potongCoin(socket.id, game.bet)) {
          io.to(room).emit('bot_message', 'LowCardBot', `${socket.username} saldo tidak cukup untuk join.`, null, room);
          return;
        }

        game.players.push({ id: socket.id, name: socket.username, isBot: false, bet: game.bet });
        io.to(room).emit('bot_message', 'LowCardBot', `✅ ${socket.username} bergabung dengan taruhan ${game.bet} koin!`, null, room);

        if (game.players.length >= 2 && !game.timeout) {
          startDrawTimer(io, room);
          io.to(room).emit('bot_message', 'LowCardBot', `🚀 Game mulai! Semua player ketik !d untuk draw, atau tunggu 20 detik.`, null, room);
        }

        break;
      }

      case '!d': {
        const game = rooms[room];
        if (!game?.isRunning) return;

        const player = game.players.find(p => p.id === socket.id);
        if (!player) return;
        if (player.card) return; // sudah draw

        drawOneCard(player);
        io.to(room).emit('bot_message', 'LowCardBot', `🎯 ${player.name} menarik kartu!`, `/cards/${player.card}`, room);
        // cek semua sudah draw atau belum
        const allDrawn = game.players.every(p => p.card);
        if (allDrawn) {
          checkAllDrawn(io, room);
        }

        break;
      }

      case '!bot': {
        // Activate bot in room
        ensureBotPresence(io, room);
        break;
      }

      case '!status': {
        // Show bot and game status
        const status = getBotStatus(room);
        io.to(room).emit('bot_message', 'LowCardBot', status, null, room);
        break;
      }
    }
  });

  socket.on('disconnecting', () => {
    // Jika player left, remove from game but keep bot active
    Object.entries(rooms).forEach(([room, game]) => {
      const idx = game.players.findIndex(p => p.id === socket.id);
      if (idx !== -1) {
        const playerName = socket.username;
        game.players.splice(idx, 1);
        io.to(room).emit('bot_message', 'LowCardBot', `${playerName} keluar dari game.`, null, room);
        
        if (game.players.length <= 1) {
          const winner = game.players[0]?.name || 'No one';
          io.to(room).emit('bot_message', 'LowCardBot', `🎉 Game selesai! Pemenang: ${winner}! Ketik !start <bet> untuk game baru.`, null, room);
          // Reset game but keep bot active
          game.isRunning = false;
          game.players = [];
          if (game.timeout) {
            clearTimeout(game.timeout);
            delete game.timeout;
          }
        }
      }
    });
  });
}
