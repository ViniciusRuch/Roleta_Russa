let ws = new WebSocket("ws://localhost:8080");;

function join() {
  
  
  const name = document.getElementById('name').value.trim();
  if (!name) {
    alert('Informe seu nome');
    return;
  }
  ws.onopen = () => {
    ws.send(JSON.stringify({ type: 'join', name }));
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    const game = document.getElementById('game');
    const turno = document.getElementById('turno');

    switch (data.type) {
      case 'players':
        game.innerHTML = '<p>Jogadores: ' + data.players.join(', ') + '</p>';
        break;
      case 'start':
        game.innerHTML += '<p>Jogo iniciado!</p>';
        appendLog('O jogo começou.');
        break;
      case 'next':
        turno.innerText = 'É a vez de: ' + data.name;
        break;
      case 'dead':
        game.innerHTML += '<p>' + data.name + ' morreu!</p>';
        appendLog(`${data.name} puxou o gatilho e morreu.`);
        break;
      case 'safe':
        game.innerHTML += '<p>' + data.name + ' sobreviveu.</p>';
        appendLog(`${data.name} puxou o gatilho e nada aconteceu.`);
        break;
      case 'win':
        game.innerHTML += '<p>' + data.name + ' venceu!</p>';
        appendLog(`${data.name} venceu a rodada!`);
        turno.innerText = '';
        game.innerHTML += '<p>Leaderboard:</p><ul>' +
          Object.entries(data.leaderboard).map(([k, v]) => `<li>${k}: ${v}</li>`).join('') + '</ul>';
        break;
      case 'error':
        alert(data.message);
        break;
    }
  };
}

function shoot() {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    alert('Você precisa entrar no jogo primeiro.');
    return;
  }
  ws.send(JSON.stringify({ type: 'shoot' }));
}

function appendLog(msg) {
  const log = document.getElementById('log');
  const p = document.createElement('p');
  p.textContent = msg;
  log.appendChild(p);
}
