const http     = require('http');
const express  = require('express');
const socketIO = require('socket.io');
const utils    = require('./utils.js');

const PORT = 1616;

const N_PLAYERS = 8;

const N_CHARACTERS = {'Shadow': 6, 'Neutral': 8, 'Hunter': 6};
const CHARACTERS_REPARTITION = {
		4: {'Shadow': 2, 'Neutral': 0, 'Hunter': 2},
		5: {'Shadow': 2, 'Neutral': 1, 'Hunter': 2},
		6: {'Shadow': 2, 'Neutral': 2, 'Hunter': 2},
		7: {'Shadow': 3, 'Neutral': 1, 'Hunter': 3},
		8: {'Shadow': 3, 'Neutral': 2, 'Hunter': 3}
};


Object.defineProperty(Array.prototype, 'shuffle', {
    value: function() {
        for (let i = this.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this[i], this[j]] = [this[j], this[i]];
        }
        return this;
    }
});


clients = new Array(N_PLAYERS).fill(null);

tokens_center = new Array(2 * N_PLAYERS);
for (var i = 0; i < N_PLAYERS; i++) {
	tokens_center[2 * i] = [.25 + .02 * Math.cos(2 * i * Math.PI / N_PLAYERS), .15 + .02 * Math.sin(2 * i * Math.PI / N_PLAYERS)];
	tokens_center[2 * i + 1] = [.03 + .02 * (i % (N_PLAYERS / 2)), .25 + .02 * Math.floor(i / (N_PLAYERS / 2))];
}

dices_val = [Math.floor(Math.random() * 4) + 1, Math.floor(Math.random() * 6) + 1];

characters = [];
if (N_PLAYERS >= 7){N_CHARACTERS['Neutral'] = N_CHARACTERS['Neutral'] - 1;} // Removing Bob for 7 and 8 players
for (var align in N_CHARACTERS) {
	[...Array(N_CHARACTERS[align]).keys()].shuffle().slice(0, CHARACTERS_REPARTITION[N_PLAYERS][align]).forEach((i_character, i) => {
		characters.push({'align': align, 'i': i_character, 'revealed':false, 'equipments':[]});
	});
}
characters.shuffle();

areas = [...Array(utils.Areas.length).keys()].shuffle();

active_player = 0;

cards = [
	[...Array(utils.Cards[0].length).keys()].shuffle(),
	[...Array(utils.Cards[1].length).keys()].shuffle(),
	[...Array(utils.Cards[2].length).keys()].shuffle()
]


let app = express();
app.use(express.static(__dirname));
let http_server = http.createServer(app);
http_server.listen(PORT, () => {console.log("Server started on port", PORT)});


let io = socketIO(http_server);
io.on('connection', (socket) => {
	var id = clients.indexOf(null);
	if (id < 0){
		console.log("Connection from", socket.request.connection._peername, "\tdenied");
		socket.emit('init', {'id': -1});
		return;
	}
	console.log("Connection from", socket.request.connection._peername, "\tgranted as player", i);
	clients[i] = socket;
	socket.emit('init', {'id': id, 'tokens_center': tokens_center, 'dices_val': dices_val, 'characters': characters,
		'areas': areas, 'active_player': active_player});

	socket.on('disconnect', () => {
		clients[id] = null;
		console.log("Lost connection from client", id);
	});

	socket.on('token', (data) => {
		console.log("Player", id, "moved token", data['i_token'], "in", data['center']);
		tokens_center[data['i_token']] = data['center'];
		io.emit('token', data);
	});

	socket.on('dices', () => {
		console.log("Player", id, "rolled the dices");
		dices_val = [Math.floor(Math.random() * 4) + 1, Math.floor(Math.random() * 6) + 1];
		io.emit('dices', dices_val);
	});

	socket.on('reveal', () => {
		console.log("Player", id, "came out of the closet");
		characters[id]['revealed'] = true;
		io.emit('reveal', id);

	});

	socket.on('turn', (data) => {
		console.log(data);
		// print("Player {0} ended it's turn".format(game.PLAYERS[self.i][0]))
		// self.server.active_player = (self.server.active_player + 1) % _N_PLAYERS
		// for client in self.server.clients:
		// 		if client is not None:
		// 				comm.send(client, ['turn', self.server.active_player])
	});

	socket.on('draw_card', (i) => {
		if (cards[i].length > 0) {
			console.log("Player", id, "draw a card", i);
			i_card = cards[i].pop()
			if (i != 1 && utils.Cards[i][i_card]['equip']){
				characters[id]['equipments'].push({'type':i, 'i_card': i_card});
			}
			io.emit('draw_card', {'who': id, 'type': i, 'i_card': i_card});
		} else {
			console.log("Cannot draw card of type", i);
		}
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
