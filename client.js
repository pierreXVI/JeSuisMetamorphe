// GLOBAL VARIABLES
  socket = io();

  callback_id = null;
  lock_screen = true;
  id = null;

  tokens = null;
  owned_tokens = null;
  dices = null;
  cards = null;
  areas = null;
  characters = null;


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
  socket.on('move_token', function(data) {
    tokens[data['i_token']].center = data['center'];
  });

  socket.on('roll_dice', function(data) {
    dices.forEach(function(dice, i) {dice.roll_to(data[i]);});
    loader_off('roll_dice');
  });

  socket.on('reveal', function(data) {
    characters[data].revealed = true;
    if (data == id) loader_off('reveal');
  });

  socket.on('draw_card', function(data) {
    cards[data['type']].draw_card(data['who'], data['i_card']);
    if (data['who'] == id) loader_off('draw_card');
  });

  socket.on('vision', function(data) {
    cards['Vision'].answer(data['i_card'], data['i_from']);
  });

  socket.on('take_equipment', function(data) {
    characters[data['who']]['equipments'].push(...characters[data['i_player']]['equipments'].splice(data['i_equipment'], 1));
    if (data['who'] == id) loader_off('take_equipment');
  });


// EVENT HANDLERS
  function mousedown_handler(e) {
    if (lock_screen) return;

    if (e.type == "touchstart") {
      bcr = e.target.getBoundingClientRect();
      offsetX = e.targetTouches[0].clientX - bcr.left;
      offsetY = e.targetTouches[0].clientY - bcr.top;
    } else {
      offsetX = e.offsetX;
      offsetY = e.offsetY;
    }

    owned_tokens.sort(function(a, b) {return 10 * (a.center[1] - b.center[1]) + (a.center[0] - b.center[0])});
    for (var i in owned_tokens) {
      owned_tokens[i].hold = owned_tokens[i].collide(...abs2rel(offsetX, offsetY));
      if (owned_tokens[i].hold) return;
    }

    for (var type in cards) {if (cards[type].collide(...abs2rel(offsetX, offsetY))) draw_card(type);}
    dices.forEach(function(dice, i) {if (dice.collide(...abs2rel(offsetX, offsetY))) roll_dice();});

    characters.forEach(function(character, i) {if (character.collide(...abs2rel(offsetX, offsetY))) character.inspect();});
  }

  function mouseup_handler(e) {
    if (lock_screen) return;
    owned_tokens.forEach(function(token, i) {
      if (token.hold) {
        token.drop();
        move_token(tokens.indexOf(token), token.center);
      }
    });
  }

  function mousemove_handler(e) {
    if (lock_screen) return;

    if (e.type == "touchmove") {
      bcr = e.target.getBoundingClientRect();
      offsetX = e.targetTouches[0].clientX - bcr.left;
      offsetY = e.targetTouches[0].clientY - bcr.top;
    } else {
      offsetX = e.offsetX;
      offsetY = e.offsetY;
    }

    owned_tokens.forEach(function(token, i) {
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
        characters[id].ask_reveal();
        break;
    }
  }


// CONNECT / DISCONNECT
  socket.on('disconnect', function() {
    console.log("Lost connection from server");
    clearInterval(callback_id);
    lock_screen = true;
  });

  socket.on('init', function(data) {
    if (data['id'] < 0) {
      console.log("Connection denied by server");
      return;
    }

    lock_screen = false;

    areas = new Array(6);
    for (var i in data['areas']) areas[i] = new Area(i, data['areas'][i]);

    id = data['id'];

    cards = {
      'Vision': new VisionCard([.65, .07]),
      'Black': new BlackCard([.5, .07]),
      'White': new WhiteCard([.8, .07])
    };

    dices = [new Dice(3, 4, [0.45, 0.1], data['dices_val'][0]), new Dice(4, 6, [.45, .2], data['dices_val'][1])];

    tokens = new Array(data['tokens_center'].length);
    for (var i in data['characters']) {
      tokens[2 * i]     = new Token(PLAYERS[i]['color'], data['tokens_center'][2 * i]);
      tokens[2 * i + 1] = new Token(PLAYERS[i]['color'], data['tokens_center'][2 * i + 1]);
    }
    owned_tokens = [tokens[2 * id], tokens[2 * id + 1]];

    characters = new Array(data['characters'].length);
    data['characters'].forEach(function(character, i) {
      characters[i] = new Character(character['align'], character['i'], character['revealed'], character['equipments'],
        [Character.MARGIN + Character.BORDER + i * (Character.WIDTH + 2 * Character.BORDER + Character.MARGIN), .35], i, id);
    });


    document.addEventListener('mousedown',  mousedown_handler, false);
    document.addEventListener('touchstart', mousedown_handler, false);
    document.addEventListener('mouseup',    mouseup_handler,   false);
    document.addEventListener('touchend',   mouseup_handler,   false);
    document.addEventListener('mousemove',  mousemove_handler, false);
    document.addEventListener('touchmove',  mousemove_handler, {passive: false});
    document.addEventListener('keydown',    keydown_handler,   false);


    background = document.getElementById('background');
    background_dim = [0.4, 0.4 * background.height / background.width];
    canvas = document.getElementById('game_canvas');
    canvas_ctx = canvas.getContext('2d');

    callback_id = setInterval(function() {
      canvas.width  = document.documentElement.clientWidth;
      canvas.height = Math.max(document.documentElement.clientHeight,
        document.documentElement.clientWidth * (.35 + Character.HEIGHT + Character.BORDER + Character.MARGIN));

      canvas_ctx.drawImage.apply(canvas_ctx, [background, 0, 0].concat(rel2abs(background_dim)));
      areas.forEach(function(area, i) {area.draw_on(canvas_ctx);});
      for (var type in cards) cards[type].draw_on(canvas_ctx);
      dices.forEach(function(dice, i) {dice.draw_on(canvas_ctx);});
      characters.forEach(function(character, i) {character.draw_on(canvas_ctx);});
      tokens.slice().sort(function(a, b) {
        return 100 * (a.hold - b.hold)
          + 10 * (a.center[1] - b.center[1] - a.offset[1] + b.offset[1])
          + (a.center[0] - b.center[0] - a.offset[0] + b.offset[0])
      }).forEach(function(token, i) {token.draw_on(canvas_ctx);});

      if (lock_screen) owned_tokens.forEach(function(token, i) {token.drop();});
    }, 100);
  });
