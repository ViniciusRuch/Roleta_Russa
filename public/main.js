const socket = new WebSocket("ws://localhost:3000");

let username = "";
let room = null;
let rerollUsed = false;

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
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
  document.getElementById("players").textContent =
    data.players.map(p => `${p.name} (${p.status})`).join(", ");
  document.getElementById("yourTurn").textContent =
    data.turn === username ? "Sim" : "Não";
  document.getElementById("result").textContent = data.result || "";
  rerollUsed = data.rerollUsed;
}
