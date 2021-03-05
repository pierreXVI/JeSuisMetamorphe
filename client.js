// GLOBAL VARIABLES
  let socket = io();

  let callback_id;
  let lock_screen = true;
  let id;

  let tokens;
  let owned_tokens;
  let dices;
  let cards;
  let areas;
  let characters;


// CLIENT --> SERVER
  function move_token(i_token) {
    socket.emit('move_token', {'i_token': i_token, 'center': tokens[i_token].center});
  }

  function roll_dice() {
    socket.emit('roll_dice');
    loader_on('roll_dice');
  }

  function reveal() {
    socket.emit('reveal');
    loader_on('reveal');
  }

  function draw_card(i_card) {
    socket.emit('draw_card', i_card);
    loader_on('draw_card');
  }

  function send_vision(i_card, i_player) {
    socket.emit('vision', {'i_card': i_card, 'i_player': i_player});
    if (i_card == 0) cards['Vision'].view_character(i_player);
  }

  function take_equipment(i_player, i_equipment) {
    socket.emit('take_equipment', {'i_player': i_player, 'i_equipment': i_equipment});
    loader_on('take_equipment');
  }


// SERVER --> CLIENT
  socket.on('move_token', (data) => {
    tokens[data['i_token']].center = data['center'];
  });

  socket.on('roll_dice', (data) => {
    dices.forEach((dice, i) => dice.roll_to(data[i]));
    loader_off('roll_dice');
  });

  socket.on('reveal', (data) => {
    characters[data].revealed = true;
    if (data == id) loader_off('reveal');
  });

  socket.on('draw_card', (data) => {
    cards[data['type']].draw_card(data['who'], data['i_card']);
    if (data['who'] == id) loader_off('draw_card');
  });

  socket.on('vision', (data) => {
    cards['Vision'].answer(data['i_card'], data['i_from']);
  });

  socket.on('take_equipment', (data) => {
    characters[data['who']]['equipments'].push(...characters[data['i_player']]['equipments'].splice(data['i_equipment'], 1));
    if (data['who'] == id) loader_off('take_equipment');
  });


// EVENT HANDLERS
  function mousedown_handler(e) {
    if (lock_screen) return;

    if (true /* TODO */) {
      let bcr = e.target.getBoundingClientRect();
      var offsetX = e.offsetX;
      var offsetY = e.offsetY;
    } else {
      let bcr = e.target.getBoundingClientRect();
      var offsetX = e.targetTouches[0].clientX - bcr.x;
      var offsetY = e.targetTouches[0].clientY - bcr.y;
    }

    owned_tokens.sort((a, b) => {return 10 * (a.center[1] - b.center[1]) + (a.center[0] - b.center[0])});
    for (let i = 0; i < owned_tokens.length; i++) {
      owned_tokens[i].hold = owned_tokens[i].collide(...abs2rel(offsetX, offsetY));
      if (owned_tokens[i].hold) return;
    }
  }

  function click_handler(e) {
    if (lock_screen) return;
    for (var type in cards) {if (cards[type].collide(...abs2rel(e.offsetX, e.offsetY))) draw_card(type);}
    characters.forEach((character, i) => {if (character.collide(...abs2rel(e.offsetX, e.offsetY))) character.inventory();});
  }

  function mouseup_handler(e) {
    if (lock_screen) return;
    owned_tokens.forEach((token, i) => {
      if (token.hold) {
        token.drop();
        move_token(tokens.indexOf(token), token.center);
      }
    });
  }

  function mousemove_handler(e) {
    if (lock_screen) return;

    if (true /* TODO */) {
      let bcr = e.target.getBoundingClientRect();
      var offsetX = e.offsetX;
      var offsetY = e.offsetY;
    } else {
      let bcr = e.target.getBoundingClientRect();
      var offsetX = e.targetTouches[0].clientX - bcr.x;
      var offsetY = e.targetTouches[0].clientY - bcr.y;
    }

    owned_tokens.forEach((token, i) => {
      if (token.hold) {
        e.preventDefault();
        token.center = abs2rel(offsetX, offsetY);
      }
    });
    characters[id].show = characters[id].collide(...abs2rel(offsetX, offsetY));
  }

  function keydown_handler(e) {
    if (lock_screen) return;
    switch (e.key) {
      case 'd':
        roll_dice();
        break;
      case 'r':
        characters[id].reveal();
        break;
    }
  }


// CONNECT / DISCONNECT
  socket.on('disconnect', () => {
    console.log("Lost connection from server");
    clearInterval(callback_id);
    lock_screen = true;
  });

  socket.on('init', (data) => {
    if (data['id'] < 0) {
      console.log("Connection denied by server");
      return;
    }

    lock_screen = false;

    areas = new Array(6);
    for (let i = 0; i < data['areas'].length; i++) areas[i] = new Area(i, data['areas'][i]);

    id = data['id'];

    cards = {
      'Vision': new VisionCard([.65, .07]),
      'Black': new BlackCard([.5, .07]),
      'White': new WhiteCard([.8, .07])
    };

    dices = [new Dice(3, 4, [0.45, 0.1], data['dices_val'][0]), new Dice(4, 6, [.45, .2], data['dices_val'][1])];

    tokens = new Array(data['tokens_center'].length);
    for (let i = 0; i < data['characters'].length; i++) {
      tokens[2 * i]     = new Token(PLAYERS[i]['color'], data['tokens_center'][2 * i]);
      tokens[2 * i + 1] = new Token(PLAYERS[i]['color'], data['tokens_center'][2 * i + 1]);
    }
    owned_tokens = [tokens[2 * id], tokens[2 * id + 1]];

    characters = new Array(data['characters'].length);
    data['characters'].forEach((character, i) => {
      characters[i] = new Character(character['align'], character['i'], character['revealed'], character['equipments'],
        [Character.MARGIN + Character.BORDER + i * (Character.WIDTH + 2 * Character.BORDER + Character.MARGIN), .35], i, id);
    });


    document.addEventListener('mousedown',  mousedown_handler, false);
    document.addEventListener('touchstart', mousedown_handler,   false);
    document.addEventListener('click',      click_handler,     false);
    document.addEventListener('mouseup',    mouseup_handler,   false);
    document.addEventListener('touchend',   mouseup_handler,   false);
    document.addEventListener('mousemove',  mousemove_handler, false);
    document.addEventListener('touchmove',  mousemove_handler, {passive: false});
    document.addEventListener('keydown',    keydown_handler,   false);


    let background = document.getElementById('background');
    let background_dim = [0.4, 0.4 * background.height / background.width];
    let canvas = document.getElementById('game_canvas');
    let canvas_ctx = canvas.getContext('2d');

    callback_id = setInterval(() => {
      canvas.width  = document.documentElement.clientWidth;
      canvas.height = document.documentElement.clientHeight;

      canvas_ctx.drawImage(background, 0, 0, ...rel2abs(background_dim));
      areas.forEach((area, i) => area.draw_on(canvas_ctx));
      for (let type in cards) cards[type].draw_on(canvas_ctx);
      dices.forEach((dice, i) => dice.draw_on(canvas_ctx));
      characters.forEach((character, i) => character.draw_on(canvas_ctx));
      [...tokens].sort((a, b) => {
        return 100 * (a.hold - b.hold)
          + 10 * (a.center[1] - b.center[1] - a.offset[1] + b.offset[1])
          + (a.center[0] - b.center[0] - a.offset[0] + b.offset[0])
      }).forEach((token, i) => token.draw_on(canvas_ctx));

      if (lock_screen) owned_tokens.forEach((token, i) => token.drop());
    }, 100);
  });
