// UTILITIES
	Object.defineProperty(Array.prototype, 'shuffle', {
	    value: function() {
	        for (let i = this.length - 1; i > 0; i--) {
	            let j = Math.floor(Math.random() * (i + 1));
	            [this[i], this[j]] = [this[j], this[i]];
	        }
	        return this;
	    }
	});


// PARAMETERS
	const PORT = 1616;
	const N_PLAYERS = 8;


// MODULES
	const http     = require('http');
	const express  = require('express');
	const socketIO = require('socket.io');
	const data     = require('./data.js');


// GLOBAL VARIABLES
	let clients;
	let tokens_center;
	let dices_val;
	let characters;
	let areas;
	let cards;


// SERVER SETUP
	clients = new Array(N_PLAYERS).fill(null);

	tokens_center = new Array(2 * N_PLAYERS);
	for (let i = 0; i < N_PLAYERS; i++) {
		tokens_center[2 * i] = [.25 + .02 * Math.cos(2 * i * Math.PI / N_PLAYERS), .15 + .02 * Math.sin(2 * i * Math.PI / N_PLAYERS)];
		tokens_center[2 * i + 1] = [.03 + .02 * (i % (N_PLAYERS / 2)), .25 + .02 * Math.floor(i / (N_PLAYERS / 2))];
	}

	dices_val = [Math.floor(Math.random() * 4) + 1, Math.floor(Math.random() * 6) + 1];

	characters = [];

	if (N_PLAYERS >= 7) data.CHARACTERS['Neutral'].pop(); // Removing Bob for 7 and 8 players
	for (let align in data.CHARACTERS) {
		let avail = [...Array(data.CHARACTERS[align].length).keys()].shuffle().slice(0, data.TEAMS[N_PLAYERS][align])
		avail.forEach((i_character, i) => characters.push({'align': align, 'i': i_character, 'revealed':false, 'equipments':[]}));
	}
	characters.shuffle();

	areas = [...Array(data.AREAS.length).keys()].shuffle();

	cards = {};
	for (let type in data.CARDS) {
		cards[type] = [...Array(data.CARDS[type].length).keys()].shuffle()
	}

	let app = express();
	app.use(express.static(__dirname));
	let http_server = http.createServer(app);
	http_server.listen(PORT, () => console.log("Server started on port", PORT));


// SERVER ACTIONS
	let io = socketIO(http_server);
	io.on('connection', (socket) => {
		let id = clients.indexOf(null);

		if (id < 0){
			console.log("Connection from", socket.request.connection._peername, "\tdenied");
			socket.emit('init', {'id': -1});
			return;
		}
		console.log("Connection from", socket.request.connection._peername, "\tgranted as player", id);

		clients[id] = socket;
		socket.emit('init', {
			'id': id,
			'tokens_center': tokens_center,
			'dices_val': dices_val,
			'characters': characters,
			'areas': areas
		});

		socket.on('disconnect', () => {
			console.log("Lost connection from client", id);
			clients[id] = null;
		});

		socket.on('move_token', (data) => {
			console.log("Player", id, "moved token", data['i_token'], "in", data['center']);
			tokens_center[data['i_token']] = data['center'];
			io.emit('move_token', data);
		});

		socket.on('roll_dice', () => {
			console.log("Player", id, "rolled the dices");
			dices_val = [Math.floor(Math.random() * 4) + 1, Math.floor(Math.random() * 6) + 1];
			io.emit('roll_dice', dices_val);
		});

		socket.on('reveal', () => {
			console.log("Player", id, "came out of the closet");
			characters[id]['revealed'] = true;
			io.emit('reveal', id);

		});

		socket.on('draw_card', (type) => {
			if (cards[type].length > 0) {
				i_card = cards[type].pop()
				console.log("Player", id, "draw card", i_card, "from", type);
				if (data.CARDS[type][i_card]['equip']) characters[id]['equipments'].push({'type': type, 'i_card': i_card});
				io.emit('draw_card', {'who': id, 'type': type, 'i_card': i_card});
			} else {
				console.log("Cannot draw card of type", type);
			}
		});

		socket.on('vision', (data) => {
			console.log("Player", id, "send vision card", data['i_card'], "to player", data['i_player']);
			if (clients[data['i_player']]) {
				clients[data['i_player']].emit('vision', {'i_card': data['i_card'], 'i_from': id});
			} else {
				console.log("Error: Client", data['i_player'], "is not connected");
			}
		});

		socket.on('take_equipment', (data) => {
			console.log("Player", id, "takes equipment", data['i_equipment'], "from player", data['i_player']);
			characters[id]['equipments'].push(...characters[data['i_player']]['equipments'].splice(data['i_equipment'], 1));
			io.emit('take_equipment', {'who': id, 'i_player': data['i_player'], 'i_equipment': data['i_equipment']});
		});
	});
