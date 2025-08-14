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
const suits = ['c', 'd', 'h', 's'];

function getDeck(): string[] {
  const deck = [];
  for (let i = 2; i <= 14; i++) {
    for (const s of suits) {
      const label = i <= 10 ? `i` : i === 11 ? 'j' : i === 12 ? 'q' : i === 13 ? 'k' : 'a';
      deck.push(`lc_{label}${s}.png`);
    }
  }
  return deck;
}

function shuffle(array: string[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function getCardValue(filename: string): number {
  const name = filename.split('_')[1].split('.')[0];
if (val === 'a') return 14;
  if (val === 'k') return 13;
  if (val === 'q') return 12;
  if (val === 'j') return 11;
  return parseInt(val);


// Dummy potongCoin, ganti dengan DB logic kamu
function potongCoin(userId: string, amount: number): boolean 
  // TODO: cek dan potong saldo user, return false jika saldo kurang
  return true;


function drawOneCard(player: Player) 
  const deck = getDeck();
  shuffle(deck);
  player.card = deck.pop();


function startDrawTimer(io: Server, room: string) 
  const game = rooms[room];
  if (!game) return;

  if (game.timeout) clearTimeout(game.timeout);

  game.timeout = setTimeout(() => 
    game.players.forEach(p => 
      if (!p.card) 
        drawOneCard(p);
        io.to(room).emit('bot_message', 'LowCardBot', `⏱️ Auto-draw -{p.name}:`, `/cards/p.card`);
      );
    checkAllDrawn(io, room);
  , 20000);


function checkAllDrawn(io: Server, room: string) 
  const game = rooms[room];
  if (!game) return;
  const allDrawn = game.players.every(p => p.card);
  if (!allDrawn) return;

  const lowest = game.players.reduce((prev, curr) => 
    return getCardValue(curr.card!) < getCardValue(prev.card!) ? curr : prev;
  );

  io.to(room).emit('bot_message', 'LowCardBot', `{lowest.name} OUT dengan kartu terendah!`);
game.players = game.players.filter(p => p.name !== lowest.name);

  if (game.players.length <= 1) {
    io.to(room).emit('bot_message', 'LowCardBot', `Game selesai! Pemenang: game.players[0]?.name || 'Bot'`);
    delete rooms[room];
   else 
    game.players.forEach(p => delete p.card);
    startDrawTimer(io, room);
    io.to(room).emit('bot_message', 'LowCardBot', `Ronde berikutnya! Ketik !d untuk draw, atau tunggu 20 detik.`);


export function handleLowCardBot(io: Server, socket: any) 
  socket.on('command', (room: string, msg: string) => 
    if (!msg.startsWith('!')) return;

    const cmd = msg.split(' ')[0];

    switch (cmd) 
      case '!start': 
        if (rooms[room]?.isRunning) return;
        const parts = msg.split(' ');
        const bet = parts.length > 1 ? parseInt(parts[1]) : 0;
        if (bet <= 0) 
          io.to(room).emit('bot_message', 'LowCardBot', 'Jumlah taruhan tidak valid.');
          return;


        rooms[room] = 
          players: [],
          isRunning: true,
          bet,
        ;

        io.to(room).emit('bot_message', 'LowCardBot', `Game dimulai dengan taruhan{bet} koin! Ketik !j untuk join.`);
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
          io.to(room).emit('bot_message', 'LowCardBot', `socket.username saldo tidak cukup untuk join.`);
          return;


        game.players.push( id: socket.id, name: socket.username, isBot: false, bet: game.bet );
        io.to(room).emit('bot_message', 'LowCardBot', `{socket.username} join dengan taruhan game.bet koin¡);

        if (game.players.length >= 2        !game.timeout) 
          startDrawTimer(io, room);
          io.to(room).emit('bot_message', 'LowCardBot', `Game mulai! Semua player ketik !d untuk draw, atau tunggu 20 detik.`);

        break;


      case '!d': 
        const game = rooms[room];
        if (!game?.isRunning) return;

        const player = game.players.find(p => p.id === socket.id);
        if (!player) return;
        if (player.card) return; // sudah draw

        drawOneCard(player);
        io.to(room).emit('bot_message', 'LowCardBot', `Bot draws -{player.name}:`, `/cards/${player.card}`);
        // cek semua sudah draw atau belum
const allDrawn = game.players.every(p => p.card);
        if (allDrawn) 
          checkAllDrawn(io, room);

        break;
      );

  socket.on('disconnecting', () => 
    // Jika player left, ganti dengan bot (opsional)
    Object.entries(rooms).forEach(([room, game]) => 
      const idx = game.players.findIndex(p => p.id === socket.id);
      if (idx !== -1) 
        game.players.splice(idx, 1);
        io.to(room).emit('bot_message', 'LowCardBot', `{socket.username} keluar dari game.`);
        if (game.players.length <= 1) {
          io.to(room).emit('bot_message', 'LowCardBot', `Game selesai! Pemenang: ${game.players[0]?.name || 'Bot'}`);
          delete rooms[room];
        }
      }
    });
  });
}