const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const server = http.createServer((req, res) => {
  let filePath = '.' + req.url;
  if (filePath === './') filePath = './index.html';

  const extname = path.extname(filePath);
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
  };

  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404);
      res.end('Arquivo não encontrado');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

const wss = new WebSocket.Server({ server });

let players = [];
let currentTurnIndex = 0;
let chamber = 0;
const chambersCount = 6;
let bulletPosition = -1;
let leaderboard = {};

function resetRound() {
  bulletPosition = Math.floor(Math.random() * chambersCount);
  chamber = 0;
  currentTurnIndex = 0;
}

function broadcast(data) {
  const message = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

wss.on('connection', ws => {
  ws.on('message', message => {
    let data;
    try {
      data = JSON.parse(message);
    } catch {
      ws.send(JSON.stringify({ type: 'error', message: 'Mensagem inválida' }));
      return;
    }

    if (data.type === 'join') {
      if (players.length >= 4) {
        ws.send(JSON.stringify({ type: 'error', message: 'Sala cheia' }));
        return;
      }
      if (!data.name || data.name.trim() === '') {
        ws.send(JSON.stringify({ type: 'error', message: 'Nome inválido' }));
        return;
      }
      players.push({ name: data.name, ws, alive: true });
      leaderboard[data.name] = leaderboard[data.name] || 0;

      broadcast({ type: 'players', players: players.map(p => p.name) });

      if (players.length >= 2) {
        resetRound();
        players.forEach(p => p.alive = true);
        broadcast({ type: 'start' });
        broadcast({ type: 'next', name: players[currentTurnIndex].name });
      }
    } else if (data.type === 'shoot') {
      if (players.length < 2) {
        ws.send(JSON.stringify({ type: 'error', message: 'Esperando mais jogadores' }));
        return;
      }
      const player = players[currentTurnIndex];
      if (ws !== player.ws) {
        ws.send(JSON.stringify({ type: 'error', message: 'Não é sua vez' }));
        return;
      }
      // Verifica se o tiro foi fatal
      if (chamber === bulletPosition) {
        player.alive = false;
        broadcast({ type: 'dead', name: player.name });
        // Remove jogador morto
        // Verifica quantos ainda vivos
        const alivePlayers = players.filter(p => p.alive);
        if (alivePlayers.length === 1) {
          // Ganhador
          const winner = alivePlayers[0];
          leaderboard[winner.name]++;
          broadcast({ type: 'win', name: winner.name, leaderboard });
          // Reset para próxima rodada
          resetRound();
          players.forEach(p => p.alive = true);
          broadcast({ type: 'start' });
          broadcast({ type: 'next', name: players[currentTurnIndex].name });
          return;
        } else if (alivePlayers.length === 0) {
          // Todos morreram (improvável mas possível)
          broadcast({ type: 'win', name: 'Ninguém', leaderboard });
          resetRound();
          players.forEach(p => p.alive = true);
          broadcast({ type: 'start' });
          broadcast({ type: 'next', name: players[currentTurnIndex].name });
          return;
        }
      } else {
        broadcast({ type: 'safe', name: player.name });
      }

      // Próximo turno: encontrar próximo jogador vivo
      do {
        currentTurnIndex = (currentTurnIndex + 1) % players.length;
      } while (!players[currentTurnIndex].alive);

      chamber = (chamber + 1) % chambersCount;
      broadcast({ type: 'next', name: players[currentTurnIndex].name });
    }
  });

  ws.on('close', () => {
    // Remove jogador desconectado
    players = players.filter(p => p.ws !== ws);
    broadcast({ type: 'players', players: players.map(p => p.name) });
  });
});

const PORT = 8080;
server.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
