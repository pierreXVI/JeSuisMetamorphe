const http     = require('http');
const express  = require('express');
const socketIO = require('socket.io');

const port = 1616;
const N_PLAYERS = 8;


clients = new Array(N_PLAYERS).fill(null);

tokens_center = new Array(2 * N_PLAYERS);
for (var i = 0; i < N_PLAYERS; i++) {
	tokens_center[2 * i] = [.25 + .02 * Math.cos(2 * i * Math.PI / N_PLAYERS), .15 + .02 * Math.sin(2 * i * Math.PI / N_PLAYERS)];
	tokens_center[2 * i + 1] = [.03 + .02 * (i % (N_PLAYERS / 2)), .25 + .02 * Math.floor(i / (N_PLAYERS / 2))];
}

dices_val = [Math.floor(Math.random() * 4) + 1, Math.floor(Math.random() * 6) + 1];

characters = new Array(N_PLAYERS);

areas = new Array(6);

active_player = 0;


/*
self.characters = []
if _N_PLAYERS >= 7:  # Removing Bob for 7 and 8 players
		game.Character.CHARACTERS[1 + 0].pop(4)
for align in (0, 1, 2):
		n_total = len(game.Character.CHARACTERS[align])
		n_avail = game.Character.CHARACTERS_REPARTITION[_N_PLAYERS][align]
		self.characters += [[align, i, False, []] for i in random.sample(range(n_total), n_avail)]
random.shuffle(self.characters)

self.areas = list(range(6))
random.shuffle(self.areas)

self.active_player = 0  # Todo
# self.active_player = random.randrange(_N_PLAYERS)

self.cards = [list(range(len(card_type.CARDS))) for card_type in card.TYPES]
for c in self.cards:
		random.shuffle(c)
*/


let app = express();
app.use(express.static('.'));
let http_server = http.createServer(app);
http_server.listen(port, () => {console.log("Server started on port", port)});


let io = socketIO(http_server);
io.on('connection', (socket) => {
	var i = clients.indexOf(null);
	if (i < 0){
		console.log("Connection from", socket.request.connection._peername, "\tdenied");
		socket.emit('init', {'id': -1});
		return;
	}
	console.log("Connection from", socket.request.connection._peername, "\tgranted as player", i);
	clients[i] = socket;
	socket.emit('init', {'id': i, 'tokens_center': tokens_center, 'dices_val': dices_val, 'characters': characters,
		'areas': areas, 'active_player': active_player});

	socket.on('disconnect', () => {
		clients[i] = null;
		console.log("Lost connection from client", i);
	});

	socket.on('token', (data) => {
		console.log("Player", i, "moved token", data['i_token'], "in", data['center']);
		tokens_center[data['i_token']] = data['center'];
		io.emit('token', data)
	});

	socket.on('dices', () => {
		console.log("Player", i, "rolled the dices");
		dices_val = [Math.floor(Math.random() * 4) + 1, Math.floor(Math.random() * 6) + 1];
		io.emit('dices', dices_val)
	});

	socket.on('reveal', (data) => {
		console.log(data);
		// print("Player {0} came out of the closet".format(game.PLAYERS[self.i][0]))
		// self.server.characters[self.i][2] = True
		// for client in self.server.clients:
		// 		if client is not None:
		// 				comm.send(client, ['reveal', self.i])

	});

	socket.on('turn', (data) => {
		console.log(data);
		// print("Player {0} ended it's turn".format(game.PLAYERS[self.i][0]))
		// self.server.active_player = (self.server.active_player + 1) % _N_PLAYERS
		// for client in self.server.clients:
		// 		if client is not None:
		// 				comm.send(client, ['turn', self.server.active_player])
	});

	socket.on('draw', (data) => {
		console.log(data);
		// if self.server.cards[msg[1]]:
		// 		print("Player {0} draw a card".format(game.PLAYERS[self.i][0]))
		// 		i_card = self.server.cards[msg[1]].pop()
		// 		if card.TYPES[msg[1]] != card.CardVision and card.TYPES[msg[1]].CARDS[i_card][1]:
		// 				self.server.characters[self.i][3].append((msg[1], i_card))
		// 		for client in self.server.clients:
		// 				if client is not None:
		// 						comm.send(client, ['draw', self.i, msg[1], i_card])
		// else:
		// 		print("Cannot draw card of type {0}".format(msg[1]))
	});

	socket.on('vision', (data) => {
		console.log(data);
		// if self.server.clients[msg[2]]:
		// 		print("Player {0} send vision card to player {1}"
		// 					.format(game.PLAYERS[self.i][0], game.PLAYERS[msg[2]][0]))
		// 		comm.send(self.server.clients[msg[2]], ['vision', msg[1], self.i])
		// else:
		// 		print("Error: Client {0} is not connected".format(msg[2]))
	});

	socket.on('take', (data) => {
		console.log(data);
		// self.server.characters[self.i][3].append(self.server.characters[msg[1]][3].pop(msg[2]))
		// for client in self.server.clients:
		// 		if client is not None:
		// 				comm.send(client, ['take', self.i, msg[1], msg[2]])

	});
});
