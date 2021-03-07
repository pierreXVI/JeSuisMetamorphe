class Token{
  constructor(color, c_position){
    this.color = color;
    this.color_shade = shade_color(color, Token.SHADE_FACTOR);
    this.center = c_position;
    this.hold = false;
    this.offset = [0, 0];
  }

  collide(x, y){
    var dx = (x - this.center[0]) / Token.SIZE;
    var dy = (y - this.center[1]) / Token.SIZE;
    if ((Math.abs(dx) < 1 && Math.abs(dy) < 1)
        || Math.pow(dx, 2) + Math.pow(2 * dy + 2, 2) < 1
        || Math.pow(dx, 2) + Math.pow(2 * dy - 2, 2) < 1){
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
    ctx.ellipse.apply(ctx, rel2abs(x, y + Token.SIZE, Token.SIZE, Token.SIZE / 2).concat([0, 0, 2 * Math.PI]));
    ctx.rect(...rel2abs(x - Token.SIZE, y - Token.SIZE, 2 * Token.SIZE, 2 * Token.SIZE));
    ctx.fill();
    ctx.closePath();

    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.ellipse.apply(ctx, rel2abs(x, y - Token.SIZE, Token.SIZE, Token.SIZE / 2).concat([0, 0, 2 * Math.PI]));
    ctx.fill();
    ctx.closePath();
  }
}
Token.SIZE = 0.007;
Token.SHADE_FACTOR = 0.8;


class Dice{
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

  collide(x, y){
    var dx = (x - this.center[0]) / Dice.SIZE;
    var dy = (y - this.center[1]) / Dice.SIZE;
    return Math.pow(dx, 2) + Math.pow(dy, 2) < 1;
  }

  draw_on(ctx){
    if (this.roll_since != -1 && Date.now() - this.roll_since < Dice.ROLL_TIME){
      for (var i in this.edges) {
        var dx = this.edges[i][0] - this.center[0];
        var dy = this.edges[i][1] - this.center[1];
        var c = Math.cos(Dice.ROLL_SPEED * Math.PI);
        var s = Math.sin(Dice.ROLL_SPEED * Math.PI);
        this.edges[i][0] = this.center[0] + c * dx + s * dy;
        this.edges[i][1] = this.center[1] - s * dx + c * dy;
      }
      var value = Math.floor(Math.random() * this.n_val) + 1;
    } else {
      this.roll_since = -1;
      var value = this.value;
    }

    ctx.fillStyle = Dice.COLOR;
    ctx.beginPath();
    ctx.moveTo(...rel2abs(this.edges[0]));
    for (var i in this.edges) ctx.lineTo(...rel2abs(this.edges[i]));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = Dice.FONT_COLOR;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.font = 'bold 1.5vw Arial';
    ctx.fillText.apply(ctx, [value].concat(rel2abs(this.center)));
  }

  roll_to(value){
    this.roll_since = Date.now();
    this.value = value;
  }
}
Dice.SIZE = .025;
Dice.ROLL_TIME = 1000;
Dice.ROLL_SPEED = 0.05;
Dice.COLOR = '#00FF00';
Dice.FONT_COLOR = '#FFFFFF'


class Area{
  constructor(i_area, i_slot){
    this.angle = Math.PI * Area.AREA_LOCATIONS[i_slot]['angle'] / 180;
    this.nw_position = Area.AREA_LOCATIONS[i_slot]['nw_position'];
    this.values = AREAS[i_area]['values'];
    this.name = AREAS[i_area]['name'];
    this.text = AREAS[i_area]['text'];
  }

  draw_on(ctx){
    ctx.fillStyle = '#FFFF00';
    ctx.save();
    ctx.translate(...rel2abs(this.nw_position));
    ctx.rotate(this.angle);
    ctx.beginPath();
    ctx.rect.apply(ctx, [0, 0].concat(rel2abs(Area.WIDTH, Area.HEIGHT)));
    ctx.fill();
    ctx.closePath();

    if (this.values.length == 2) {
      ctx.fillStyle = '#646464';
      ctx.beginPath();
      ctx.arc.apply(ctx, rel2abs(Area.WIDTH * (.5 + .2), Area.HEIGHT * .2, Area.WIDTH * .15).concat([0, 2 * Math.PI, false]));
      ctx.arc.apply(ctx, rel2abs(Area.WIDTH * (.5 - .2), Area.HEIGHT * .2, Area.WIDTH * .15).concat([0, 2 * Math.PI, false]));
      ctx.fill();
      ctx.closePath();
    } else {
      ctx.fillStyle = '#646464';
      ctx.beginPath();
      ctx.arc.apply(ctx, rel2abs(Area.WIDTH * .5, Area.HEIGHT * .2, Area.WIDTH * .15).concat([0, 2 * Math.PI, false]));
      ctx.fill();
      ctx.closePath();
    }

    ctx.fillStyle = "#000000";
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.font = 'bold 1vw Arial';
    if (this.values.length == 2) {
      ctx.fillText.apply(ctx, [this.values[0]].concat(rel2abs(Area.WIDTH * (.5 + .2), Area.HEIGHT * .2, Area.WIDTH * .95)));
      ctx.fillText.apply(ctx, [this.values[1]].concat(rel2abs(Area.WIDTH * (.5 - .2), Area.HEIGHT * .2, Area.WIDTH * .95)));
    } else {
      ctx.fillText.apply(ctx, [this.values[0]].concat(rel2abs(Area.WIDTH * .5, Area.HEIGHT * .2, Area.WIDTH * .95)));
    }
    ctx.textBaseline = 'alphabetic';
    ctx.font = 'bold 0.6vw Arial';
    ctx.fillText.apply(ctx, [this.name].concat(rel2abs(Area.WIDTH / 2, Area.HEIGHT * .4, Area.WIDTH * .95)));
    ctx.font = 'bold 0.5vw Arial';
    fillTextMultiLine.apply(null, [ctx, this.text].concat(rel2abs(0.007, Area.WIDTH / 2, Area.HEIGHT * .6, Area.WIDTH * .95)));

    ctx.restore();
  }
}
Area.WIDTH = 0.062;
Area.HEIGHT = 0.087;
Area.AREA_LOCATIONS = [
  {'nw_position': [.266, .249], 'angle': -70},
  {'nw_position': [.29, .186], 'angle': -70},
  {'nw_position': [.215, .192], 'angle': 70},
  {'nw_position': [.192, .13], 'angle': 70},
  {'nw_position': [.254, .02], 'angle': 0},
  {'nw_position': [.187, .02], 'angle': 0},
]


class Character{
  constructor(align, i_character, revealed, equipments, nw_position, i_player, i_client){
    this.align = align;
    this.character = CHARACTERS[align][i_character]
    this.revealed = revealed;
    this.nw_position = nw_position;
    this.i_player = i_player;
    this.i_client = i_client;
    this.show = false;
    this.equipments = [];
    for (var i in equipments) this.equipments.push(CARDS[equipments[i]['type']][equipments[i]['i_card']]);
  }

  collide(x, y){
    return (x - this.nw_position[0] > 0 && x - this.nw_position[0] < Character.WIDTH
      && y - this.nw_position[1] > 0 && y - this.nw_position[1] < Character.HEIGHT);
  }

  draw_on(ctx){
    ctx.save();
    ctx.translate(...rel2abs(this.nw_position));

    ctx.fillStyle = PLAYERS[this.i_player]['color'];
    ctx.beginPath();
    ctx.rect(...rel2abs(-Character.BORDER, -Character.BORDER,
      Character.WIDTH + 2 * Character.BORDER, Character.HEIGHT + 2 * Character.BORDER));
    ctx.fill();
    ctx.stroke();
    ctx.closePath();
    if (this.revealed || this.show) {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.rect.apply(ctx, [0, 0].concat(rel2abs(Character.WIDTH, Character.HEIGHT)));
      ctx.fill();
      ctx.closePath();

      ctx.fillStyle = this.align == 'Shadow' ? '#FF0000' : this.align == 'Hunter' ? '#0000FF' : '#F09632';
      ctx.beginPath();
      ctx.arc.apply(ctx, rel2abs(Character.WIDTH * .1, Character.HEIGHT * .1,  Character.WIDTH * .08).concat([0, 2 * Math.PI, false]));
      ctx.fill();
      ctx.closePath();
      ctx.fillStyle = "#000000";
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.font = 'bold 1.2vw Arial';
      ctx.fillText.apply(ctx, [this.character['name'][0]].concat(rel2abs(Character.WIDTH * .1, Character.HEIGHT * .1)));
      ctx.textAlign = 'left';
      ctx.fillText.apply(ctx, [this.character['name'].slice(1, this.character['name'].length)].concat(rel2abs(Character.WIDTH * .18, Character.HEIGHT * .12)));

      ctx.fillStyle = '#FF0000';
      ctx.beginPath();
      ctx.arc.apply(ctx, rel2abs(Character.WIDTH * .9, Character.HEIGHT * .08,  Character.WIDTH * .07).concat([0, 2 * Math.PI, false]));
      ctx.fill();
      ctx.closePath();
      ctx.fillStyle = "#000000";
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.font = 'bold 1vw Arial';
      ctx.fillText.apply(ctx, [this.character['hp']].concat(rel2abs(Character.WIDTH * .9, Character.HEIGHT * .08)));
      ctx.textAlign = 'right';
      ctx.fillText.apply(ctx, ["PV"].concat(rel2abs(Character.WIDTH * .83, Character.HEIGHT * .08)));

      ctx.fillStyle = "#000000";
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.font = 'bold 1vw Arial';
      ctx.fillText.apply(ctx, ["Condition de victoire :"].concat(rel2abs(Character.WIDTH * .5, Character.HEIGHT * .3, Character.WIDTH * .95)));
      ctx.font = '.8vw Arial';
      fillTextMultiLine.apply(null, [ctx, this.character['victory']].concat(rel2abs(.007, Character.WIDTH * .5, Character.HEIGHT * .37, Character.WIDTH * .95)));
      ctx.font = 'bold 1vw Arial';
      var y = Character.HEIGHT * .6;
      y = fillTextMultiLine.apply(null, [ctx, this.character['ability']].concat(rel2abs(.01, Character.WIDTH * .5, y, Character.WIDTH * .95)));
      ctx.font = '.8vw Arial';
      fillTextMultiLine.apply(null, [ctx, this.character['ability_desc']].concat(rel2abs(.007, Character.WIDTH * .5, abs2rel(y), Character.WIDTH * .95)));
    }
    ctx.restore();
  }

  ask_reveal(){
    if (! this.revealed) {
      var popup = document.createElement("div");
      popup.className = "modal";
      var popup_content = document.createElement("div");
      popup_content.className = "modal-content";
      var title = document.createElement("h2");
      title.textContent = "Voulez vous vraiment vous révéler ?";
      var button_yes = document.createElement("input");
      button_yes.type = "button"
      button_yes.value = "Oui";
      button_yes.onclick = function () {
        popup.remove();
        reveal();
      }
      var button_no = document.createElement("input");
      button_no.type = "button"
      button_no.value = "Non";
      button_no.onclick = function () {
        popup.remove();
        lock_screen = document.getElementsByClassName("modal").length > 0;
      }
      popup_content.appendChild(title);
      popup_content.appendChild(button_yes);
      popup_content.appendChild(button_no);
      popup.appendChild(popup_content);
      document.body.appendChild(popup);
      lock_screen = true;

    }
  }

  inspect(){
    var popup = document.createElement("div");
    popup.className = "modal";
    var popup_content = document.createElement("div");
    popup_content.className = "modal-content";

    var title = document.createElement("h2");
    var button = document.createElement("input");
    button.type = "button";
    button.value = "OK";
    button.onclick = function () {
      popup.remove();
      lock_screen = document.getElementsByClassName("modal").length > 0;
    }

    var character_0 = characters[this.i_player];
    var character = new Character(character_0.align, CHARACTERS[character_0.align].indexOf(character_0.character),
      character_0.revealed || this.i_player == id, [], [Character.BORDER, Character.BORDER], this.i_player, id);
    var canvas = document.createElement("canvas");
    canvas.width  = rel2abs(Character.WIDTH + 2 * Character.BORDER);
    canvas.height = rel2abs(Character.HEIGHT + 2 * Character.BORDER);
    canvas.style.display = "block";
    canvas.style.margin = "auto";
    canvas.style.padding = "1vw";
    character.draw_on(canvas.getContext('2d'));
    popup_content.appendChild(canvas);

    var button_reveal = document.createElement("input");
    button_reveal.type = "button";
    button_reveal.value = "Se réveler";
    button_reveal.onclick = function() {
      popup.remove();
      characters[id].ask_reveal();
    }
    if (this.i_player == this.i_client && !this.revealed) popup_content.appendChild(button_reveal);

    if (this.equipments.length == 0) {
      title.textContent = "Le joueur " +  PLAYERS[this.i_player]['name'] + " ne possède pas d'équipements";
      popup_content.appendChild(title);
      popup_content.appendChild(button);
    } else {
      title.textContent = "Equipements du joueur " +  PLAYERS[this.i_player]['name'] + " :";
      popup_content.appendChild(title);

      for (var i in this.equipments) {
        var radio = document.createElement("input");
        radio.type = "radio";
        radio.id = "radio" + i.toString();
        radio.name = "equipment";
        radio.value = i;
        radio.style.display = "none";

        var label = document.createElement("label");
        label.textContent = this.equipments[i]['name'] + " : " + this.equipments[i]['desc'];
        label.htmlFor = "radio" + i.toString();

        var div = document.createElement("div");
        div.style.margin = "1vw";

        if (this.i_player != this.i_client) div.appendChild(radio);
        div.appendChild(label);

        popup_content.appendChild(div);
      }

      var i_player = this.i_player;
      var button_take = document.createElement("input");
      button_take.type = "button";
      button_take.value = "Prendre équipement";
      button_take.onclick = function () {
        var radios = document.getElementsByName('equipment');
        for (var i = 0, length = radios.length; i < length; i++) {
          if (radios[i].checked) {
            var i_equipment = radios[i].value
            popup.remove();
            lock_screen = document.getElementsByClassName("modal").length > 0;
            take_equipment(i_player, i_equipment);
            break;
          }
        }
      }
      if (this.i_player != this.i_client) popup_content.appendChild(button_take);
      popup_content.appendChild(button);
    }

    popup.appendChild(popup_content);
    document.body.appendChild(popup);
    lock_screen = true;
  }
}
Character.WIDTH = .11
Character.HEIGHT = .15
Character.BORDER = .004
Character.MARGIN = .005


class Card{
  constructor(nw_position, color){
    this.nw_position = nw_position;
    this.color = color;
  }

  collide(x, y){
    return (x - this.nw_position[0] > 0 && x - this.nw_position[0] < Card.WIDTH
      && y - this.nw_position[1] > 0 && y - this.nw_position[1] < Card.HEIGHT);
  }

  draw_on(ctx){
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.rect(...rel2abs(this.nw_position).concat(rel2abs(Card.WIDTH, Card.HEIGHT)));
    ctx.fill();
    ctx.stroke();
    ctx.closePath();
  }
}
Card.WIDTH = .11;
Card.HEIGHT = .15;

class BlackCard extends Card {

  constructor(nw_position) {
    super(nw_position, '#141414');
  }

  draw_card(who, i_card){
    var card = CARDS['Black'][i_card];
    if (card['equip']) {
      characters[who].equipments.push(card);
    }
    var popup = document.createElement("div");
    popup.className = "modal";
    var popup_content = document.createElement("div");
    popup_content.className = "modal-content";
    var title = document.createElement("h2");
    title.textContent = "Le joueur " + PLAYERS[who]['name'] + " pioche la carte ténèbre :";
    var name = document.createElement("div");
    name.textContent = card['name'];
    var desc = document.createElement("div");
    desc.textContent = card['desc'];
    var button = document.createElement("input");
    button.type = "button"
    button.value = "OK";
    button.onclick = function () {
      popup.remove();
      lock_screen = document.getElementsByClassName("modal").length > 0;
    }
    popup_content.appendChild(title);
    popup_content.appendChild(name);
    popup_content.appendChild(desc);
    popup_content.appendChild(button);
    popup.appendChild(popup_content);
    document.body.appendChild(popup);
    lock_screen = true;
  }
}

class VisionCard extends Card {

  constructor(nw_position) {
    super(nw_position, '#00FF00');
  }

  draw_card(who, i_card){
    if (who != id) {
      return;
    }
    var card = CARDS['Vision'][i_card];

    var popup = document.createElement("div");
    popup.className = "modal";
    var popup_content = document.createElement("div");
    popup_content.className = "modal-content";
    var title = document.createElement("h2");
    title.textContent = "A quel joueur voulez vous donner cette carte vision ?";
    var name = document.createElement("div");
    name.textContent = card['name'];
    name.style.marginBottom = "2vw";
    var desc1 = document.createElement("div");
    desc1.textContent = card['desc1'];
    var desc2 = document.createElement("div");
    desc2.textContent = card['desc2'];
    desc2.style.marginBottom = "2vw";
    var button = document.createElement("input");
    button.type = "button";
    button.value = "OK";
    button.onclick = function () {
      var radios = document.getElementsByName('vision_to_player');
      for (var i = 0, length = radios.length; i < length; i++) {
        if (radios[i].checked) {
          var i_player = radios[i].value
          popup.remove();
          lock_screen = document.getElementsByClassName("modal").length > 0;
          send_vision(i_card, i_player);
          break;
        }
      }
    }

    popup_content.appendChild(title);
    popup_content.appendChild(name);
    popup_content.appendChild(desc1);
    popup_content.appendChild(desc2);

    for (var i = 0; i < characters.length; i++) {
      if (i == id) {
        continue;
      }
      var radio = document.createElement("input");
      radio.type = "radio";
      radio.id = "radio" + i.toString();
      radio.name = "vision_to_player";
      radio.value = i;
      radio.style.marginRight = "1vw";
      var label = document.createElement("label");
      label.for = "radio" + i.toString();
      label.appendChild(radio);
      label.innerHTML = label.innerHTML + PLAYERS[i]['name'];
      label.style.display = "block";
      label.style.margin = "1vw";
      popup_content.appendChild(label);
    }

    popup_content.appendChild(button);
    popup.appendChild(popup_content);
    document.body.appendChild(popup);
    lock_screen = true;
  }

  answer(i_card, i_from){
    var card = CARDS['Vision'][i_card];

    var popup = document.createElement("div");
    popup.className = "modal";
    var popup_content = document.createElement("div");
    popup_content.className = "modal-content";
    var title = document.createElement("h2");
    title.textContent = "Le joueur " + PLAYERS[i_from]['name'] + " vous donne la vision :";
    var name = document.createElement("div");
    name.textContent = card['name'];
    var desc1 = document.createElement("div");
    desc1.textContent = card['desc1'];
    var desc2 = document.createElement("div");
    desc2.textContent = card['desc2'];
    var button = document.createElement("input");
    button.type = "button";
    button.value = "OK";
    button.onclick = function () {
      popup.remove();
      lock_screen = document.getElementsByClassName("modal").length > 0;
    }

    popup_content.appendChild(title);
    popup_content.appendChild(name);
    popup_content.appendChild(desc1);
    popup_content.appendChild(desc2);
    popup_content.appendChild(button);
    popup.appendChild(popup_content);
    document.body.appendChild(popup);
    lock_screen = true;

  }

  view_character(i_player){
    var character_0 = characters[i_player];

    var character = new Character(character_0.align, CHARACTERS[character_0.align].indexOf(character_0.character),
      true, [], [Character.BORDER, Character.BORDER], i_player, id);

    var popup = document.createElement("div");
    popup.className = "modal";
    var popup_content = document.createElement("div");
    popup_content.className = "modal-content";
    var canvas = document.createElement("canvas");
    canvas.width  = rel2abs(Character.WIDTH + 2 * Character.BORDER);
    canvas.height = rel2abs(Character.HEIGHT + 2 * Character.BORDER);
    canvas.style.display = "block";
    canvas.style.margin = "auto";
    canvas.style.padding = "1vw";
    character.draw_on(canvas.getContext('2d'));

    var button = document.createElement("input");
    button.type = "button";
    button.value = "OK";
    button.onclick = function () {
      popup.remove();
      lock_screen = document.getElementsByClassName("modal").length > 0;
    }


    popup_content.appendChild(canvas);
    popup_content.appendChild(button);
    popup.appendChild(popup_content);
    document.body.appendChild(popup);
    lock_screen = true;
  }
}

class WhiteCard extends Card {

  constructor(nw_position) {
    super(nw_position, '#FFFFFF');
  }

  draw_card(who, i_card){
    var card = CARDS['White'][i_card];
    if (card['equip']) {
      characters[who].equipments.push(card);
    }

    var popup = document.createElement("div");
    popup.className = "modal";
    var popup_content = document.createElement("div");
    popup_content.className = "modal-content";
    var title = document.createElement("h2");
    title.textContent = "Le joueur " + PLAYERS[who]['name'] + " pioche la carte lumière :";
    var name = document.createElement("div");
    name.textContent = card['name'];
    var desc = document.createElement("div");
    desc.textContent = card['desc'];
    var button = document.createElement("input");
    button.type = "button"
    button.value = "OK";
    button.onclick = function () {
      popup.remove();
      lock_screen = document.getElementsByClassName("modal").length > 0;
    }
    popup_content.appendChild(title);
    popup_content.appendChild(name);
    popup_content.appendChild(desc);
    popup_content.appendChild(button);
    popup.appendChild(popup_content);
    document.body.appendChild(popup);
    lock_screen = true;
  }
}


function loader_on(what){
  var popup = document.createElement("div");
  popup.className = "modal";
  var loader = document.createElement("div");
  loader.className = "loader";
  loader.id = what;
  popup.appendChild(loader);
  document.body.appendChild(popup);
  lock_screen = true;
}

function loader_off(what){
  loader = document.getElementById(what);
  if (loader) {
    loader.parentElement.remove();
    lock_screen = document.getElementsByClassName("modal").length > 0;
  }
}


function rel2abs(){
  if (arguments.length == 1) {
    if (arguments[0] instanceof Array) {
      out = new Array(arguments[0].length);
      for (i = 0; i < arguments[0].length; i++) {
        out[i] = arguments[0][i] * document.documentElement.clientWidth;
      }
      return out;
    } else {
      return arguments[0] * document.documentElement.clientWidth;
    }
  }

  out = new Array(arguments.length);
  for (i = 0; i < arguments.length; i++) {
    out[i] = arguments[i] * document.documentElement.clientWidth;
  }
  return out;
}

function abs2rel(){
  if (arguments.length == 1) {
    if (arguments[0] instanceof Array) {
      out = new Array(arguments[0].length);
      for (i = 0; i < arguments[0].length; i++) {
        out[i] = arguments[0][i] / document.documentElement.clientWidth;
      }
      return out;
    } else {
      return arguments[0] / document.documentElement.clientWidth;
    }
  }

  out = new Array(arguments.length);
  for (i = 0; i < arguments.length; i++) {
    out[i] = arguments[i] / document.documentElement.clientWidth;
  }
  return out;
}


function fillTextMultiLine(ctx, text, lineHeight, x, y, maxWidth){
  // if (maxWidth === undefined) maxWidth = null;
  text = text.split('\n');
  for (var i in text) {
    ctx.fillText(text[i], x, y, maxWidth);
    y += lineHeight;
  }
  return y;
}


function shade_color(color, factor) {
  var r = Math.min(parseInt(parseInt(color.substring(1, 3), 16) * factor), 255).toString(16);
  var g = Math.min(parseInt(parseInt(color.substring(3, 5), 16) * factor), 255).toString(16);
  var b = Math.min(parseInt(parseInt(color.substring(5, 7), 16) * factor), 255).toString(16);
  return '#' + ((r.length==1) ? '0' + r:r) + ((g.length==1) ? '0' + g:g) + ((b.length==1) ? '0' + b:b);
}
