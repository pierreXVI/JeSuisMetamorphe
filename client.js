let socket = io();

socket.on('disconnect', () => {
  console.log("Lost connection from server");
  clearInterval(timer_id);
});

socket.on('init', (data) => {
  if (data['id'] < 0) {
    console.log("Connection denied by server");
    return;
  }
  game(data['id'], data['tokens_center'], data['dices_val'], data['characters'], data['areas'], data['active_player']);
});

socket.on('token', (data) => {
  tokens[data['i_token']].center = data['center'];
});

socket.on('dices', (data) => {
  dices.forEach((dice, i) => {dice.roll_to(data[i]);});
});

socket.on('reveal', (data) => {
  characters[data].revealed = true;
});

socket.on('turn', (data) => {
  console.log(data);
  // self.game.active_player.i = msg[1]
});

socket.on('draw_card', (data) => {
  if (data['type'] == 1) {
    if (data['who'] == id) {
      send_vision(data['i_card'], cards[data['type']].draw_card(data['who'], data['i_card']));
    }
  } else {
    cards[data['type']].draw_card(data['who'], data['i_card']);
  }
});

socket.on('vision', (data) => {
  console.log(data);
  // self.game.cards[card.TYPES.index(card.CardVision)].answer(msg[1], msg[2])
});

socket.on('take', (data) => {
  console.log(data);
  // self.game.characters[msg[1]].equipments.append(self.game.characters[msg[2]].equipments.pop(msg[3]))
});


function move_token(i_token, center){
  socket.emit('token', {'i_token': i_token, 'center': center});
}

function roll_dice(){
  socket.emit('dices');
}

function reveal(){
  socket.emit('reveal');
}

function end_turn(){
  socket.emit('turn');
}

function draw_card(i){
  socket.emit('draw_card', i);
}

function send_vision(i_vision, i_player){
  socket.emit('vision', {'i_vision': i_vision, 'i_player': i_player});
}

function take(i_player, i_equipment){
  socket.emit('take', {'i_player': i_player, 'i_equipment': i_equipment});
}


function rel2abs(){
  if (arguments.length == 1){
    if (arguments[0] instanceof Array){
      var out = new Array(arguments[0].length);
      for (var i = 0; i < arguments[0].length; i++) {
        out[i] = arguments[0][i] * document.documentElement.clientWidth;
      }
      return out;
    } else {
      return arguments[0] * document.documentElement.clientWidth;
    }
  }

  var out = new Array(arguments.length);
  for (var i = 0; i < arguments.length; i++) {
    out[i] = arguments[i] * document.documentElement.clientWidth;
  }
  return out;
}

function abs2rel(){
  if (arguments.length == 1){
    if (arguments[0] instanceof Array){
      var out = new Array(arguments[0].length);
      for (var i = 0; i < arguments[0].length; i++) {
        out[i] = arguments[0][i] / document.documentElement.clientWidth;
      }
      return out;
    } else {
      return arguments[0] / document.documentElement.clientWidth;
    }
  }

  var out = new Array(arguments.length);
  for (var i = 0; i < arguments.length; i++) {
    out[i] = arguments[i] / document.documentElement.clientWidth;
  }
  return out;
}

function fillTextMultiLine(ctx, text, lineHeight, x, y, maxWidth=null) {
  text.split('\n').forEach((line, i) => {
    ctx.fillText(line, x, y, maxWidth);
    y += lineHeight;
  });
  return y;
}


const PLAYERS = ['#FF0000', '#00FF00', '#0000FF', '#FFFFFF', '#FF9632', '#FFFF00', '#6400C8', '#141414']


function game(id_player, tokens_center, dices_val, characters_data, areas_order, active_player){
  var canvas = document.getElementById("game_canvas");
  var canvas_ctx = canvas.getContext("2d");

  var background = document.createElement("img")
  background.src="background.jpg";
  var background_dim = [0.4, 0.4 * background.height / background.width]

  var areas = new Array(6);
  for (var i = 0; i < areas.length; i++) {areas[i] = new Area(i, areas_order[i]);}

  id = id_player;

  cards = [new BlackCard([.5, .07]), new VisionCard([.65, .07]), new WhiteCard([.8, .07])]

  dices = [new Dice(3, 4, [0.45, 0.1], dices_val[0]), new Dice(4, 6, [.45, .2], dices_val[1])];

  tokens = new Array(tokens_center.length);
  for (var i = 0; i < characters_data.length; i++) {
    tokens[2 * i] = new Token(PLAYERS[i], tokens_center[2 * i]);
    tokens[2 * i + 1] = new Token(PLAYERS[i], tokens_center[2 * i + 1]);
  }
  owned_tokens = [tokens[2 * id], tokens[2 * id + 1]]

  characters = new Array(characters_data.length);
  characters_data.forEach((character, i) => {
    characters[i] = new Character(character['align'], character['i'], character['revealed'], character['equipments'],
      [Character.MARGIN + Character.BORDER + i * (Character.WIDTH + 2 * Character.BORDER + Character.MARGIN), .35], i, id);
  });


  document.addEventListener('mousedown', e => {
    owned_tokens.sort((a, b) => {return 10 * (b.center[1] - b.center[1]) + (a.center[0] - b.center[0])});
    for (var i = 0; i < owned_tokens.length; i++) {
      owned_tokens[i].hold = owned_tokens[i].collide(...abs2rel(e.offsetX, e.offsetY));
      if (owned_tokens[i].hold){
        return;
      }
    }

    cards.forEach((card, i) => {
      if (card.collide(...abs2rel(e.offsetX, e.offsetY))) {draw_card(i);}
    });
  });

  document.addEventListener('mouseup', e => {
    owned_tokens.forEach((token, i) => {
      if (token.hold) {
        token.drop();
        move_token(tokens.indexOf(token), token.center);
      }
    });
  });

  document.addEventListener('mousemove', e => {
    owned_tokens.forEach((token, i) => {
      if (token.hold){
        token.center = abs2rel(e.offsetX, e.offsetY);
      }
    });

    characters[id].show = characters[id].collide(...abs2rel(e.offsetX, e.offsetY));
  });

  document.addEventListener('keydown', e => {
    switch (e.key) {
      case 'd':
        roll_dice();
        break;
      case 'r':
        characters[id].reveal();
        break;
    }
  });


  timer_id = setInterval(() => {
    canvas.width  = document.documentElement.clientWidth;
    canvas.height = document.documentElement.clientHeight;
    canvas_ctx.clearRect(0, 0, canvas.width, canvas.height);

    canvas_ctx.drawImage(background, 0, 0, ...rel2abs(background_dim));

    areas.forEach((area, i) => {area.draw_on(canvas_ctx);});

    cards.forEach((card, i) => {card.draw_on(canvas_ctx);});

    dices.forEach((dice, i) => {dice.draw_on(canvas_ctx);});

    characters.forEach((character, i) => {character.draw_on(canvas_ctx);});

    [...tokens].sort((a, b) => {
      return 100 * (a.hold - b.hold)
        + 10 * (a.center[1] - b.center[1] - a.offset[1] + b.offset[1])
        + (a.center[0] - b.center[0] - a.offset[0] + b.offset[0])
    }).forEach((token, i) => {token.draw_on(canvas_ctx);});
  }, 100);
}
