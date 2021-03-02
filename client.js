let socket = io();

let timer_id;
let id;
let lock_screen = false;

let tokens;
let owned_tokens;
let dices;
let characters;
let cards;
let areas;


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

socket.on('move_token', (data) => {
  tokens[data['i_token']].center = data['center'];
});

socket.on('roll_dice', (data) => {
  dices.forEach((dice, i) => {dice.roll_to(data[i]);});
});

socket.on('reveal', (data) => {
  characters[data].revealed = true;
});

socket.on('draw_card', (data) => {
  cards[data['type']].draw_card(data['who'], data['i_card']);
});

socket.on('vision', (data) => {
  cards[1].answer(data['i_card'], data['i_from']);
});


function move_token(i_token){
  socket.emit('move_token', {'i_token': i_token, 'center': tokens[i_token].center});
}

function roll_dice(){
  socket.emit('roll_dice');
}

function reveal(){
  socket.emit('reveal');
}

function draw_card(i_card){
  socket.emit('draw_card', i_card);
}

function send_vision(i_card, i_player){
  socket.emit('vision', {'i_card': i_card, 'i_player': i_player});
}


function game(id_player, tokens_center, dices_val, characters_data, areas_order, active_player){
  areas = new Array(6);
  for (let i = 0; i < areas_order.length; i++) areas[i] = new Area(i, areas_order[i]);

  id = id_player;

  cards = [new BlackCard([.5, .07]), new VisionCard([.65, .07]), new WhiteCard([.8, .07])];

  dices = [new Dice(3, 4, [0.45, 0.1], dices_val[0]), new Dice(4, 6, [.45, .2], dices_val[1])];

  tokens = new Array(tokens_center.length);
  for (let i = 0; i < characters_data.length; i++) {
    tokens[2 * i] = new Token(PLAYERS[i]['color'], tokens_center[2 * i]);
    tokens[2 * i + 1] = new Token(PLAYERS[i]['color'], tokens_center[2 * i + 1]);
  }
  owned_tokens = [tokens[2 * id], tokens[2 * id + 1]];

  characters = new Array(characters_data.length);
  characters_data.forEach((character, i) => {
    characters[i] = new Character(character['align'], character['i'], character['revealed'], character['equipments'],
      [Character.MARGIN + Character.BORDER + i * (Character.WIDTH + 2 * Character.BORDER + Character.MARGIN), .35], i, id);
  });


  document.addEventListener('mousedown', e => {
    if (lock_screen) return;
    owned_tokens.sort((a, b) => {return 10 * (b.center[1] - b.center[1]) + (a.center[0] - b.center[0])});
    for (let i = 0; i < owned_tokens.length; i++) {
      owned_tokens[i].hold = owned_tokens[i].collide(...abs2rel(e.offsetX, e.offsetY));
      if (owned_tokens[i].hold) return;
    }
  });

  document.addEventListener('click', e => {
    if (lock_screen) return;
    cards.forEach((card, i) => {if (card.collide(...abs2rel(e.offsetX, e.offsetY))) draw_card(i);});

    characters.forEach((character, i) => {if (character.collide(...abs2rel(e.offsetX, e.offsetY))) character.inventory();});
  });

  document.addEventListener('mouseup', e => {
    if (lock_screen) return;
    owned_tokens.forEach((token, i) => {
      if (token.hold) {
        token.drop();
        move_token(tokens.indexOf(token), token.center);
      }
    });
  });

  document.addEventListener('mousemove', e => {
    if (lock_screen) return;
    owned_tokens.forEach((token, i) => {if (token.hold) token.center = abs2rel(e.offsetX, e.offsetY);});

    characters[id].show = characters[id].collide(...abs2rel(e.offsetX, e.offsetY));
  });

  document.addEventListener('keydown', e => {
    if (lock_screen) return;
    switch (e.key) {
      case 'd':
        roll_dice();
        break;
      case 'r':
        characters[id].reveal();
        break;
    }
  });

  let background = document.getElementById('background');
  let background_dim = [0.4, 0.4 * background.height / background.width];
  let canvas = document.getElementById('game_canvas');
  let canvas_ctx = canvas.getContext('2d');

  timer_id = setInterval(() => {
    canvas.width  = document.documentElement.clientWidth;
    canvas.height = document.documentElement.clientHeight;

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

    if (lock_screen) owned_tokens.forEach((token, i) => {token.drop();});
  }, 100);
}
