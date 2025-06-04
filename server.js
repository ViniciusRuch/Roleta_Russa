const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 3000 });

let rooms = {};

function broadcast(roomId, data) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN && client.room === roomId) {
            client.send(JSON.stringify(data));
        }
    });
}

function createRoulette() {
    const arr = [0, 0, 0, 0, 0, 1];
    return arr.sort(() => Math.random() - 0.5);
}

wss.on('connection', ws => {
    ws.on('message', message => {
        const data = JSON.parse(message);

        switch (data.type) {
            case 'getRooms':
                ws.send(JSON.stringify({ type: 'rooms', rooms: Object.entries(rooms).map(([id, room]) => ({ id, players: room.players })) }));
                break;

            case 'createRoom':
                const newId = Math.random().toString(36).substr(2, 6);
                rooms[newId] = {
                    players: [{ name: data.username, status: 'active' }],
                    turnIndex: 0,
                    roulette: createRoulette(),
                    rerollUsed: false
                };
                ws.room = newId;
                ws.username = data.username;
                ws.send(JSON.stringify({ type: 'joined', room: newId }));
                broadcast(newId, { type: 'update', ...rooms[newId], turn: data.username });
                break;

            case 'joinRoom':
                const room = rooms[data.roomId];
                if (room && room.players.length < 6) {
                    room.players.push({ name: data.username, status: 'active' });
                    ws.room = data.roomId;
                    ws.username = data.username;
                    ws.send(JSON.stringify({ type: 'joined', room: data.roomId }));
                    broadcast(data.roomId, { type: 'update', ...room, turn: room.players[room.turnIndex].name });
                }
                break;

            case 'reroll':
                const r = rooms[data.room];
                if (!r) return;
                r.roulette = createRoulette();
                r.rerollUsed = true;
                broadcast(data.room, { type: 'update', ...r, turn: r.players[r.turnIndex].name });
                break;

            case 'reveal':
                const roomData = rooms[data.room];
                if (!roomData) return;

                const currentPlayer = roomData.players[roomData.turnIndex];
                if (currentPlayer.name !== data.username || currentPlayer.status !== 'active') return;

                const result = roomData.roulette.pop();

                if (result === 0) {
                    currentPlayer.status = 'eliminated';
                }

                const activePlayers = roomData.players.filter(p => p.status === 'active');
                if (activePlayers.length === 1) {
                    broadcast(data.room, { type: 'end', winner: activePlayers[0].name });
                    delete rooms[data.room];
                    return;
                }

                do {
                    roomData.turnIndex = (roomData.turnIndex + 1) % roomData.players.length;
                } while (roomData.players[roomData.turnIndex].status === 'eliminated');

                roomData.rerollUsed = false;

                broadcast(data.room, {
                    type: 'update',
                    ...roomData,
                    result: result === 1 ? 'Sorte!' : 'Azar!',
                    turn: roomData.players[roomData.turnIndex].name
                });
                break;
        }
    });

    ws.on('close', () => {
    });
});

console.log('Servidor WebSocket rodando em ws://localhost:3000');

