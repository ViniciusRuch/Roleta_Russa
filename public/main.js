const socket = new WebSocket("ws://localhost:3000");

let username = "";
let room = null;
let rerollUsed = false;

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("Mensagem recebida do servidor:", data);

  switch (data.type) {
    case "rooms":
      updateRoomList(data.rooms);
      break;
    case "joined":
      room = data.room;
      document.getElementById("rooms").style.display = "none";
      document.getElementById("game").style.display = "block";
      document.getElementById("roomId").textContent = room;
      break;
    case "update":
      updateGame(data);
      break;
    case "end":
      alert(`Fim de jogo! Vencedor: ${data.winner}`);
      location.reload();
      break;
  }
};

function enterGame() {
  username = document.getElementById("username").value;
  if (!username.trim()) return alert("Digite um nome.");
  document.getElementById("login").style.display = "none";
  document.getElementById("rooms").style.display = "block";
  socket.send(JSON.stringify({ type: "getRooms" }));
}

function createRoom() {
  socket.send(JSON.stringify({ type: "createRoom", username }));
}

function joinRoom(roomId) {
  socket.send(JSON.stringify({ type: "joinRoom", username, roomId }));
}

function reroll() {
  if (rerollUsed) return alert("Você já usou a rotação.");
  socket.send(JSON.stringify({ type: "reroll", room }));
  rerollUsed = true;
}

function reveal() {
  socket.send(JSON.stringify({ type: "reveal", room, username }));
}

function updateRoomList(rooms) {
  const list = document.getElementById("roomList");
  list.innerHTML = "";
  rooms.forEach(r => {
    const li = document.createElement("li");
    li.textContent = `Sala ${r.id} (${r.players.length}/6)`;
    const btn = document.createElement("button");
    btn.textContent = "Entrar";
    btn.onclick = () => joinRoom(r.id);
    li.appendChild(btn);
    list.appendChild(li);
  });
}

function updateGame(data) {
  const playersStatus = data.players.map(p => {
    return p.status === "dead" ? `${p.name} &#128565;` : p.name; // 😵 emoji
  }).join(", ");

  document.getElementById("players").innerHTML = playersStatus;

  const currentPlayer = data.players.find(p => p.name === username);
  const isDead = currentPlayer.status === "dead";
  const isYourTurn = data.turn === username;

  updatePlayerIndicator(isYourTurn, isDead);

  if (data.result && currentPlayer && data.result.player === username) {
    const isLucky = data.result.lucky;
    showResultMessage(isLucky);

    setTimeout(() => {
      if (!isDead) {
        updatePlayerIndicator(isYourTurn, isDead);
      }
    }, 1200);
  }

  rerollUsed = data.rerollUsed;
}

function updatePlayerIndicator(isYourTurn, isDead) {
  const light = document.getElementById("status-light");
  const message = document.getElementById("status-message");

  if (isDead) {
    light.className = "light gray";
    message.textContent = "Você morreu.";
    return;
  }

  if (isYourTurn) {
    light.className = "light green";
    message.textContent = "É sua vez! Clique para jogar.";
  } else {
    light.className = "light red";
    message.textContent = "Aguardando outros jogadores...";
  }
}

function showResultMessage(isLucky) {
  const light = document.getElementById("status-light");
  const message = document.getElementById("status-message");

  if (isLucky) {
    light.className = "light green";
    message.textContent = "Você deu sorte!";
  } else {
    light.className = "light gray";
    message.textContent = "Você morreu.";
  }
}

playe