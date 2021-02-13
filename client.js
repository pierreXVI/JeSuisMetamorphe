let socket = io();

socket.on('init', (data) => {
  if (data['id'] < 0) {
    console.log("Connection denied by server");
    return;
  }
  id = data['id'];
  tokens_center = data['tokens_center'];
  dices_val = data['dices_val'];
  characters = data['characters'];
  areas = data['areas'];
  active_player = data['active_player'];

  setInterval(update_display, 100);
});

socket.on('token', (data) => {
  console.log(data);
  // self.game.tokens[msg[1]].center = msg[2]
});

socket.on('dices', (data) => {
  console.log(data);
  // self.game.dices[0].roll_to(msg[1][0])
  // self.game.dices[1].roll_to(msg[1][1])
});

socket.on('reveal', (data) => {
  console.log(data);
  // self.game.characters[msg[1]].revealed = True
});

socket.on('turn', (data) => {
  console.log(data);
  // self.game.active_player.i = msg[1]
});

socket.on('draw', (data) => {
  console.log(data);
  // if card.TYPES[msg[2]] == card.CardVision:
  //     if self.i == msg[1]:
  //         self.send_vision(msg[3], self.game.cards[msg[2]].draw(msg[3], msg[1]))
  // else:
  //     self.game.cards[msg[2]].draw(msg[3], msg[1])
});

socket.on('vision', (data) => {
  console.log(data);
  // self.game.cards[card.TYPES.index(card.CardVision)].answer(msg[1], msg[2])
});

socket.on('take', (data) => {
  console.log(data);
  // self.game.characters[msg[1]].equipments.append(self.game.characters[msg[2]].equipments.pop(msg[3]))
});


function send_token(i){
  socket.emit('token', {'id': i, 'center': self.game.tokens[i].center});
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

function draw(i){
  socket.emit('draw', {'type': i});
}

function vision(){
  socket.emit('vision', {'i_vision': i_vision, 'i_player': i_player});
}

function take(){
  socket.emit('take', {'i_player': i_player, 'i_equipment': i_equipment});
}


var canvas = document.getElementById("game_canvas");
var canvas_ctx = canvas.getContext("2d");


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


class Token{
  static SIZE = 0.01;
  static SHADE_FACTOR = 0.8;

  constructor(color, c_position){
    this.color = color;
    this.color_shade = Token.shade_color(color, Token.SHADE_FACTOR);
    this.center = c_position;
    this.hold = false;
    this.offset = [0, 0];
  }

  collide(x, y){
    var dx = (x - this.center[0]) / Token.SIZE;
    var dy = (y - this.center[1]) / Token.SIZE;
    if ((Math.abs(dx) < 1 && Math.abs(dy) < 1) || dx ** 2 + (2 * dy + 2) ** 2 < 1 || dx ** 2 + (2 * dy - 2) ** 2 < 1){
      this.offset = [dx * Token.SIZE, dy * Token.SIZE];
      this.center = [this.center[0] + this.offset[0], this.center[1] + this.offset[1]];
      return true;
    } else {
      return false;
    }
  }

  drop(){
    this.hold = false;
    this.center = [this.center[0] - this.offset[0], this.center[1] - this.offset[1]];
    this.offset = [0, 0];
  }

  draw_on(ctx){
    var x = this.center[0] - this.offset[0];
    var y = this.center[1] - this.offset[1];

    ctx.fillStyle = this.color_shade;
    ctx.beginPath();
    ctx.ellipse(...rel2abs(x, y + Token.SIZE, Token.SIZE, Token.SIZE / 2), 0, 0, 2 * Math.PI);
    ctx.rect(...rel2abs(x - Token.SIZE, y - Token.SIZE, 2 * Token.SIZE, 2 * Token.SIZE));
    ctx.fill();
    ctx.closePath();

    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.ellipse(...rel2abs(x, y - Token.SIZE, Token.SIZE, Token.SIZE / 2), 0, 0, 2 * Math.PI);
    ctx.fill();
    ctx.closePath();
  }

  static shade_color(color, factor) {
    var r = Math.min(parseInt(parseInt(color.substring(1, 3), 16) * factor), 255).toString(16);
    var g = Math.min(parseInt(parseInt(color.substring(3, 5), 16) * factor), 255).toString(16);
    var b = Math.min(parseInt(parseInt(color.substring(5, 7), 16) * factor), 255).toString(16);
    return '#' + ((r.length==1) ? '0' + r:r) + ((g.length==1) ? '0' + g:g) + ((b.length==1) ? '0' + b:b);
  }
}

class Dice{
  static SIZE = .025;
  static ROLL_TIME = 1000;
  static ROLL_SPEED = 0.05;
  static COLOR = '#00FF00';
  static FONT_COLOR = '#FFFFFF'

  constructor(n_shape, n_val, center, value){
    this.n_val = n_val;
    this.value = value;
    this.center = center;
    this.roll_since = -1;
    this.edges = new Array(n_shape);
    for (var i = 0; i < n_shape; i++) {
      var theta = Math.PI * ((2 * i + 1) / n_shape + 1 / 2);
      this.edges[i] = [this.center[0] + Dice.SIZE * Math.cos(theta), this.center[1] + Dice.SIZE * Math.sin(theta)];
    }
  }


  draw_on(ctx){
    if (this.roll_since != -1 && Date.now() - this.roll_since < Dice.ROLL_TIME){
      this.edges.forEach((edge, i) => {
        var dx = edge[0] - this.center[0];
        var dy = edge[1] - this.center[1];
        var c = Math.cos(Dice.ROLL_SPEED * Math.PI);
        var s = Math.sin(Dice.ROLL_SPEED * Math.PI);
        edge[0] = this.center[0] + c * dx + s * dy;
        edge[1] = this.center[1] - s * dx + c * dy;
      });
      var value = Math.floor(Math.random() * this.n_val) + 1;
    } else {
      this.roll_since = -1;
      var value = this.value;
    }

    ctx.fillStyle = Dice.COLOR;
    ctx.beginPath();
    ctx.moveTo(...rel2abs(this.edges[0]));
    this.edges.forEach((edge, i) => {ctx.lineTo(...rel2abs(edge));});
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = Dice.FONT_COLOR;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.font = 'bold 1.5vw Arial';
    ctx.fillText(value, ...rel2abs(this.center));
  }

  roll_to(value){
    this.roll_since = Date.now();
    this.value = value;
  }
}


var background = document.getElementById("source");
background_dim = [0.4, 0.4 * background.height / background.width]

token = new Token("#00B7FF", [.1, .1]);
dices = [new Dice(3, 4, [0.5, 0.4], 1), new Dice(4, 6, [.6, .4], 1)];


document.addEventListener('mousedown', e => {
  token.hold = token.collide(...abs2rel(e.offsetX, e.offsetY));
});
document.addEventListener('mouseup', e => {
  token.drop();
});
document.addEventListener('mousemove', e => {
  if (token.hold){
    token.center = abs2rel(e.offsetX, e.offsetY);
  }
});
document.addEventListener('keydown', e => {
  switch (e.key) {
    case 'd':
      roll_dice();
      break;
  }
});


function update_display() {
  canvas.width  = document.documentElement.clientWidth;
  canvas.height = document.documentElement.clientHeight;
  canvas_ctx.clearRect(0, 0, canvas.width, canvas.height);

  canvas_ctx.drawImage(background, 0, 0, ...rel2abs(background_dim));

  dices.forEach((dice, i) => {dice.draw_on(canvas_ctx);});
  token.draw_on(canvas_ctx);
}
