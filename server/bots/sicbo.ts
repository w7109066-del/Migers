
import { Server } from 'socket.io';
import { getUserBalance, tambahCoin, potongCoin } from '../storage';

interface Player {
  id: string;
  username: string;
  socketId: string;
  coin: number;
  bet: number;
}

interface GameData {
  players: Player[];
  isRunning: boolean;
  timeout?: NodeJS.Timeout;
}

const rooms: Record<string, GameData> = {};
const botPresence: Record<string, boolean> = {};

function getDiceImages(rolls: number[]) {
  return rolls.map(r => `/cards/d${r}.png`).join(',');
}

function getBotStatus(roomId: string): string {
  const data = rooms[roomId];
  if (!data) {
    return `🎲 Sicbo Bot Status: No game active\n\nCommands:\n!start <bet> - Start a new Sicbo game\n!j - Join current game\n!roll - Roll dice (when game is active)\n!status - Show game status\n!leave - Leave current game`;
  }

  if (data.isRunning) {
    return `🎲 Game in progress with ${data.players.length} players. Waiting for dice rolls...`;
  } else {
    return `🎲 Game lobby: ${data.players.length} players joined. Waiting for more players or game start...`;
  }
}

async function startSicboGame(io: Server, roomId: string) {
  const data = rooms[roomId];
  if (!data || data.players.length === 0) return;

  data.isRunning = true;
  io.to(roomId).emit('bot_message', 'SicboBot', `🎲 Sicbo game starting! ${data.players.length} players joined. Type !roll to roll the dice!`, null, roomId);
}

async function rollDiceGame(io: Server, roomId: string) {
  const data = rooms[roomId];
  if (!data || !data.isRunning) return;

  const diceRolls = [
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1
  ];

  const total = diceRolls.reduce((sum, roll) => sum + roll, 0);
  const diceImages = getDiceImages(diceRolls);

  // Display dice results
  io.to(roomId).emit('bot_message', 'SicboBot', `🎲 Dice rolled: ${diceRolls.join(', ')} (Total: ${total})`, diceImages, roomId);

  // Determine winner (random for now, can be enhanced with betting logic)
  const winner = data.players[Math.floor(Math.random() * data.players.length)];
  const totalPot = data.players.reduce((sum, p) => sum + p.bet, 0);
  const houseCut = Math.floor(totalPot * 0.1);
  const winnings = totalPot - houseCut;

  // Award winnings
  tambahCoin(winner.id, winnings);

  // Show results
  io.to(roomId).emit('bot_message', 'SicboBot', `🎉 ${winner.username} wins Sicbo! +${winnings} COIN`, null, roomId);
  io.to(roomId).emit('bot_message', 'SicboBot', `💰 Total pot: ${totalPot}, House cut: ${houseCut}`, null, roomId);
  io.to(roomId).emit('bot_message', 'SicboBot', `Type !start <bet> to play again!`, null, roomId);

  // Clean up
  delete rooms[roomId];
}

export function initializeSicboBot(io: Server): void {
  console.log('Initializing Sicbo Bot...');

  io.on('connection', (socket) => {
    socket.on('join_room', (room: string) => {
      if (!botPresence[room]) {
        botPresence[room] = true;
        socket.to(room).emit('bot_message', 'SicboBot', '🎲 Sicbo Bot is now active! Type !start <bet> to begin a game.', null, room);
      }
    });

    socket.on('sicbo_command', async (room: string, command: string, userId: string, username: string) => {
      console.log(`Sicbo command received: ${command} from ${username} in room ${room}`);

      const args = command.trim().split(' ');
      const cmd = args[0];

      switch (cmd) {
        case '!start': {
          const betAmount = parseInt(args[1]);
          if (isNaN(betAmount) || betAmount <= 0) {
            io.to(room).emit('bot_message', 'SicboBot', '❗ Format salah. Gunakan: !start <bet>', null, room);
            return;
          }

          // Check if user has enough coins
          if (!potongCoin(userId, betAmount)) {
            io.to(room).emit('bot_message', 'SicboBot', `❌ ${username} doesn't have enough COIN to bet ${betAmount}.`, null, room);
            return;
          }

          if (!rooms[room]) {
            rooms[room] = { players: [], isRunning: false };
          }

          const data = rooms[room];
          if (data.isRunning) {
            io.to(room).emit('bot_message', 'SicboBot', '🎲 Game is already running! Wait for it to finish.', null, room);
            potongCoin(userId, -betAmount); // Refund
            return;
          }

          // Check if player already joined
          if (data.players.find(p => p.id === userId)) {
            io.to(room).emit('bot_message', 'SicboBot', `${username} is already in this game!`, null, room);
            potongCoin(userId, -betAmount); // Refund
            return;
          }

          const player: Player = {
            id: userId,
            username,
            socketId: socket.id,
            coin: 1000,
            bet: betAmount
          };

          data.players.push(player);
          io.to(room).emit('bot_message', 'SicboBot', `🎲 ${username} started a Sicbo game with bet ${betAmount} COIN! (${data.players.length} players)`, null, room);

          // Auto-start game after 10 seconds
          if (data.timeout) {
            clearTimeout(data.timeout);
          }
          data.timeout = setTimeout(() => {
            if (data.players.length > 0) {
              startSicboGame(io, room);
            }
          }, 10000);
          break;
        }

        case '!j': {
          const data = rooms[room];
          if (!data) {
            io.to(room).emit('bot_message', 'SicboBot', 'No game in progress. Start one with !start <bet>', null, room);
            return;
          }

          if (data.isRunning) {
            io.to(room).emit('bot_message', 'SicboBot', 'Game is already running! Wait for it to finish.', null, room);
            return;
          }

          // Check if player already joined
          if (data.players.find(p => p.id === userId)) {
            io.to(room).emit('bot_message', 'SicboBot', `${username} is already in this game!`, null, room);
            return;
          }

          if (data.players.length >= 10) {
            io.to(room).emit('bot_message', 'SicboBot', 'Game is full! Maximum 10 players.', null, room);
            return;
          }

          // Get bet amount from first player or default
          const betAmount = data.players.length > 0 ? data.players[0].bet : 10;

          // Check if user has enough coins
          if (!potongCoin(userId, betAmount)) {
            io.to(room).emit('bot_message', 'SicboBot', `❌ ${username} doesn't have enough COIN to join (bet: ${betAmount}).`, null, room);
            return;
          }

          const player: Player = {
            id: userId,
            username,
            socketId: socket.id,
            coin: 1000,
            bet: betAmount
          };

          data.players.push(player);
          io.to(room).emit('bot_message', 'SicboBot', `🎲 ${username} joined the Sicbo game! (${data.players.length} players)`, null, room);
          break;
        }

        case '!roll': {
          const data = rooms[room];
          if (!data) {
            io.to(room).emit('bot_message', 'SicboBot', 'No game in progress.', null, room);
            return;
          }

          if (!data.isRunning) {
            io.to(room).emit('bot_message', 'SicboBot', 'Game hasn\'t started yet!', null, room);
            return;
          }

          const player = data.players.find(p => p.id === userId);
          if (!player) {
            io.to(room).emit('bot_message', 'SicboBot', `${username} is not in this game!`, null, room);
            return;
          }

          rollDiceGame(io, room);
          break;
        }

        case '!status': {
          const status = getBotStatus(room);
          io.to(room).emit('bot_message', 'SicboBot', status, null, room);
          break;
        }

        case '!leave': {
          const data = rooms[room];
          if (!data) {
            io.to(room).emit('bot_message', 'SicboBot', 'No game in progress.', null, room);
            return;
          }

          if (data.isRunning) {
            io.to(room).emit('bot_message', 'SicboBot', 'Cannot leave during game! Wait for round to finish.', null, room);
            return;
          }

          const playerIndex = data.players.findIndex(p => p.id === userId);
          if (playerIndex === -1) {
            io.to(room).emit('bot_message', 'SicboBot', `${username} is not in this game!`, null, room);
            return;
          }

          const player = data.players[playerIndex];
          data.players.splice(playerIndex, 1);
          
          // Refund bet
          tambahCoin(player.id, player.bet);
          
          io.to(room).emit('bot_message', 'SicboBot', `${username} left the game. Bet refunded.`, null, room);

          // Cancel game if not enough players
          if (data.players.length === 0) {
            if (data.timeout) {
              clearTimeout(data.timeout);
            }
            delete rooms[room];
            io.to(room).emit('bot_message', 'SicboBot', 'Game canceled - no players remaining.', null, room);
          }
          break;
        }

        default: {
          io.to(room).emit('bot_message', 'SicboBot', '❓ Unknown command. Available: !start <bet>, !j, !roll, !status, !leave', null, room);
          break;
        }
      }
    });

    socket.on('disconnect', () => {
      // Handle player disconnection
      for (const [room, data] of Object.entries(rooms)) {
        const playerIndex = data.players.findIndex(p => p.socketId === socket.id);
        if (playerIndex !== -1) {
          const player = data.players[playerIndex];
          
          if (!data.isRunning) {
            // Game not started - remove player and refund
            data.players.splice(playerIndex, 1);
            tambahCoin(player.id, player.bet);
            
            io.to(room).emit('bot_message', 'SicboBot', `${player.username} disconnected and left the game.`, null, room);
            
            // Cancel game if not enough players
            if (data.players.length === 0 && data.timeout) {
              clearTimeout(data.timeout);
              io.to(room).emit('bot_message', 'SicboBot', 'Game canceled - no players remaining.', null, room);
              delete rooms[room];
            }
          } else {
            // Game is running - mark as auto-loss
            io.to(room).emit('bot_message', 'SicboBot', `${player.username} disconnected during game!`, null, room);
          }
        }
      }
    });
  });
}

export function processSicboCommand(io: Server, roomId: string, command: string, userId: string, username: string): void {
  // Handle /bot off command specifically
  if (command.trim() === '/bot off') {
    // Remove bot presence from room
    delete botPresence[roomId];
    
    // Cancel any ongoing games in this room
    const data = rooms[roomId];
    if (data) {
      // Refund all players if game exists
      data.players.forEach(player => {
        tambahCoin(player.id, player.bet);
      });
      
      // Clear timeouts
      if (data.timeout) {
        clearTimeout(data.timeout);
      }
      
      // Remove room data
      delete rooms[roomId];
    }
    
    // Send goodbye message
    io.to(roomId).emit('bot_message', 'SicboBot', '🎲 SicboBot has left the room. Type "/add bot sicbo" to add the bot back.', null, roomId);
    return;
  }

  // Mark bot as present when any sicbo command is used
  if (!botPresence[roomId]) {
    botPresence[roomId] = true;
  }
  
  io.emit('sicbo_command', roomId, command, userId, username);
}

export function activateSicboBot(roomId: string): void {
  botPresence[roomId] = true;
}

export function isSicboBotActiveInRoom(roomId: string): boolean {
  return botPresence[roomId] === true;
}
