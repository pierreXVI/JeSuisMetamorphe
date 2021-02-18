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
  console.log(data);
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


function send_token(i_token, center){
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

function draw(i){
  socket.emit('draw', {'type': i});
}

function vision(i_vision, i_player){
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

const PLAYERS = ['#FF0000', '#00FF00', '#0000FF', '#FFFFFF', '#FF9632', '#FFFF00', '#6400C8', '#141414']


class Token{
  static SIZE = 0.007;
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


class Area{
  static WIDTH = 0.062;
  static HEIGHT = 0.087;

  static AREAS = [
    {'values': [2, 3], 'name': "Antre de l'ermite", 'text': "Vous pouvez piocher\nune carte Vision"},
    {'values': [4, 5], 'name': "Porte de l'Outremonde", 'text': "Vous pouvez piocher\nune carte dans la pile\nde votre choix"},
    {'values': [6], 'name': "Monastère", 'text': "Vous pouvez piocher\nune carte Lumière"},
    {'values': [8], 'name': "Cimetière", 'text': "Vous pouvez piocher\nune carte Ténèbres"},
    {'values': [9], 'name': "Forêt hantée", 'text': "Le joueur de votre choix\npeut subir 2 blessures\nOU soigner 1 blessure"},
    {'values': [10], 'name':  "Sanctuaire ancien", 'text': "Vous pouvez voler\nune carte équipement\nà un autre joueur"}
  ];

  static AREA_LOCATIONS = [
    {'nw_position': [.266, .249], 'angle': -70},
    {'nw_position': [.29, .186], 'angle': -70},
    {'nw_position': [.215, .192], 'angle': 70},
    {'nw_position': [.192, .13], 'angle': 70},
    {'nw_position': [.254, .02], 'angle': 0},
    {'nw_position': [.187, .02], 'angle': 0},
  ]

  constructor(i_area, i_slot){
    this.angle = Math.PI * Area.AREA_LOCATIONS[i_slot]['angle'] / 180;
    this.nw_position = Area.AREA_LOCATIONS[i_slot]['nw_position'];
    this.values = Area.AREAS[i_area]['values'];
    this.name = Area.AREAS[i_area]['name'];
    this.text = Area.AREAS[i_area]['text'];
  }

  draw_on(ctx){
    ctx.fillStyle = '#FFFF00';
    ctx.save();
    ctx.translate(...rel2abs(this.nw_position));
    ctx.rotate(this.angle);
    ctx.beginPath();
    ctx.rect(0, 0, ...rel2abs(Area.WIDTH, Area.HEIGHT));
    ctx.fill();
    ctx.closePath();

    if (this.values.length == 2) {
      ctx.fillStyle = '#646464';
      ctx.beginPath();
      ctx.arc(...rel2abs(Area.WIDTH * (.5 + .2), Area.HEIGHT * .2, Area.WIDTH * .15), 0, 2 * Math.PI, false);
      ctx.arc(...rel2abs(Area.WIDTH * (.5 - .2), Area.HEIGHT * .2, Area.WIDTH * .15), 0, 2 * Math.PI, false);
      ctx.fill();
      ctx.closePath();
    } else {
      ctx.fillStyle = '#646464';
      ctx.beginPath();
      ctx.arc(...rel2abs(Area.WIDTH * .5, Area.HEIGHT * .2, Area.WIDTH * .15), 0, 2 * Math.PI, false);
      ctx.fill();
      ctx.closePath();
    }

    ctx.fillStyle = "#000000";
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.font = 'bold 1vw Arial';
    if (this.values.length == 2) {
      ctx.fillText(this.values[0], ...rel2abs(Area.WIDTH * (.5 + .2), Area.HEIGHT * .2, Area.WIDTH * .95));
      ctx.fillText(this.values[1], ...rel2abs(Area.WIDTH * (.5 - .2), Area.HEIGHT * .2, Area.WIDTH * .95));
    } else {
      ctx.fillText(this.values[0], ...rel2abs(Area.WIDTH * .5, Area.HEIGHT * .2, Area.WIDTH * .95));
    }
    ctx.textBaseline = 'alphabetic';
    ctx.font = 'bold 0.6vw Arial';
    ctx.fillText(this.name, ...rel2abs(Area.WIDTH / 2, Area.HEIGHT * .4, Area.WIDTH * .95));
    ctx.font = 'bold 0.5vw Arial';
    fillTextMultiLine(ctx, this.text, ...rel2abs(0.007, Area.WIDTH / 2, Area.HEIGHT * .6, Area.WIDTH * .95));

    ctx.restore();
  }
}


class Character{
  static WIDTH = .11
  static HEIGHT = .15
  static BORDER = .004
  static MARGIN = .005

  static CHARACTERS = {
    'Shadow': [
      {'name': 'Métamorphe',
      'hp': 11,
      'victory': "Tous les personnages Hunter\nsont morts ou 3 personnages\nNeutres sont morts.",
      'ability': "Pouvoir permanent : Imitation",
      'ability_desc': "Vous pouvez mentir (sans\navoir à révéler votre identité)\nlorsqu'on vous donne\nune carte Vision."},
      {'name': 'Momie',
      'hp': 11,
      'victory': "Tous les personnages Hunter\nsont morts ou 3 personnages\nNeutres sont morts.",
      'ability': "Capacité spéciale :\nRayon d'Outremonde",
      'ability_desc': "Au début de votre tour,\nvous pouvez infliger 3 Blessures\nà un joueur présent dans le Lieu\nPorte de l'Outremonde."},
      {'name': 'Vampire',
      'hp': 13,
      'victory': "Tous les personnages Hunter\nsont morts ou 3 personnages\nNeutres sont morts.",
      'ability': "Capacité spéciale : Morsure",
      'ability_desc': "Si vous attaquez un joueur\net lui infligez des Blessures,\nsoignez immédiatement\n2 de vos Blessures."},
      {'name': 'Valkyrie',
      'hp': 13,
      'victory': "Tous les personnages Hunter\nsont morts ou 3 personnages\nNeutres sont morts.",
      'ability': "Capacité spéciale : Chant de guerre",
      'ability_desc': "Quand vous attaquez,\nlancez seulement le dé à 4 faces\npour déterminer les dégats."},
      {'name': 'Loup-Garou',
      'hp': 14,
      'victory': "Tous les personnages Hunter\nsont morts ou 3 personnages\nNeutres sont morts.",
      'ability': "Capacité spéciale : Contre-attaque",
      'ability_desc': "Après avoir subi l'attaque\nd'un joueur, vous pouvez\ncontre-attaquer immédiatement."},
      {'name': 'Liche',
      'hp': 14,
      'victory': "Tous les personnages Hunter\nsont morts ou 3 personnages\nNeutres sont morts.",
      'ability': "Capacité spéciale : Nécromancie",
      'ability_desc': "Vous pouvez rejouer autant de fois\nqu'il y a de personnages morts.\nUtilisation unique."}
    ],
    'Neutral': [
      {'name': 'Allie',
      'hp': 8,
      'victory': "Etre encore en vie lorsque\nla partie se termine.",
      'ability': "Capacité spéciale : Amour maternel",
      'ability_desc': "Soignez toutes vos blessures.\nUtilisation unique."},
      {'name': 'Agnes',
      'hp': 8,
      'victory': "Le joueur à votre droite gagne.",
      'ability': "Capacité spéciale : Caprice",
      'ability_desc': "Au début de votre tour, changez\nvotre condition de victoire par :\n\"Le joueur à votre gauche gagne\""},
      {'name': 'Daniel',
      'hp': 13,
      'victory': "Etre le premier à mourir\nOU être en vie quand tous\nles personnages Shadow\nsont morts.",
      'ability': "Particularité : Désespoir",
      'ability_desc': "Dès qu'un personnage meurt,\nvous devez révéler\nvotre identité."},
      {'name': 'David',
      'hp': 13,
      'victory': "Avoir au minimum 3 de ces cartes :\nCrucifix en argent, Amulette,\nLance de Longinus, Toge sainte.",
      'ability': "Capacité spéclass :\nPilleur de tombes",
      'ability_desc': "Récupérez dans la défausse la\ncarte équipement de votre choix.\nUtilisation unique."},
      {'name': 'Charles',
      'hp': 11,
      'victory': "Tuer un personnage par\nune attaque alors qu'il y a\ndéjà eu 3 morts ou plus.",
      'ability': "Capacité spéciale : Festin sanglant",
      'ability_desc': "Après votre attaque, vous pouvez\nvous infliger 2 Blessures afin\nd'attaquer de nouveau\nle même joueur."},
      {'name': 'Catherine',
      'hp': 11,
      'victory': "Être la première à mourir\nOU être l'un des deux\nseuls personnages en vie.",
      'ability': "Capacité spéciale : Stigmates",
      'ability_desc': "Guerissez de 1 Blessure\nau début de votre tour."},
      {'name': 'Bryan',
      'hp': 10,
      'victory': "Tuer un personnage de\n13 Points de Vie ou plus,\nOU être dans le Sanctuaire ancien\nà la fin du jeu.",
      'ability': "Particularité : Oh my god !",
      'ability_desc': "Si vous tuez un personnage de\n12 Points de Vie ou moins,\nvous devez révéler votre identité."},
      {'name': 'Bob',
      'hp': 10,
      'victory': "Posséder 5 cartes équipements\nou plus.",
      'ability': "Capacité spéciale : Braquage",
      'ability_desc': "Si vous tuez un personnage,\nvous pouvez récupérer\ntoutes ses cartes équipements."}
    ],
    'Hunter': [
      {'name': 'Emi',
      'hp': 10,
      'victory': "Tous les personnages Shadow\nsont morts.",
      'ability': "Capacité spéciale : Téléportation",
      'ability_desc': "Pour vous déplacer, vous pouvez\nlancer normalement les dés,\nou vous déplacer sur\nla carte lieu adjacente."},
      {'name': 'Ellen',
      'hp': 10,
      'victory': "Tous les personnages Shadow\nsont morts.",
      'ability': "Capacité spéciale : Exorcisme",
      'ability_desc': "Au début de votre tour,\nvous pouvez désigner un joueur.\nIl perd sa capacité spéciale\njusqu'à la fin de la partie.\nUtilisation unique."},
      {'name': 'Georges',
      'hp': 14,
      'victory': "Tous les personnages Shadow\nsont morts.",
      'ability': "Capacité spéciale : Démolition",
      'ability_desc': "Au début de votre tour, choisissez\nun joueur et infligez lui autant\nde blessures que le résultat\nd'un dé à 4 faces.\nUtilisation unique."},
      {'name': 'Gregor',
      'hp': 14,
      'victory': "Tous les personnages Shadow\nsont morts.",
      'ability': "Capacité spéciale :\nBouclier fantôme",
      'ability_desc': "Ce pouvoir peut s'activer à la fin\nde votre tour. Vous ne subissez\naucune Blessure jusqu'au début\nde votre prochain tour.\nUtilisation unique."},
      {'name': 'Franklin',
      'hp': 12,
      'victory': "Tous les personnages Shadow\nsont morts.",
      'ability': "Capacité spéciale : Poudre",
      'ability_desc': "Au début de votre tour, choisissez\nun joueur et infligez lui autant\nde blessures que le résultat\nd'un dé à 6 faces.\nUtilisation unique."},
      {'name': 'Fu-Ka',
      'hp': 12,
      'victory': "Tous les personnages Shadow\nsont morts.",
      'ability': "Capacité spéciale :\nSoins particuliers",
      'ability_desc': "Au début de votre tour,\nplacez le marqueur\nde Blessures d'un joueur sur 7.\nUtilisation unique."}
    ]
  };

  constructor(align, i_character, revealed, equipments, nw_position, i_player, i_client){
    this.align = align;
    this.character = Character.CHARACTERS[align][i_character]
    this.revealed = revealed;
    this.nw_position = nw_position;
    this.i_player = i_player;
    this.i_client = i_client;
    this.show = false;
    // self.equipments = [(card.TYPES[e[0]], e[1]) for e in equipments]
    //
    // y = render_text(character[2], font, (0, 0, 0), self.card, 'c', self.MARGIN + self.WIDTH / 2, y)
    // y = render_text(character[3], font, color, self.card, 'c', self.MARGIN + self.WIDTH / 2, y + 20)
    // _ = render_text(character[4], font, (0, 0, 0), self.card, 'c', self.MARGIN + self.WIDTH / 2, y)
  }

  collide(x, y){
    return (x - this.nw_position[0] > 0 && x - this.nw_position[0] < Character.WIDTH
      && y - this.nw_position[1] > 0 && y - this.nw_position[1] < Character.HEIGHT);
  }

  draw_on(ctx){
    ctx.save();
    ctx.translate(...rel2abs(this.nw_position));

    ctx.fillStyle = PLAYERS[this.i_player];
    ctx.beginPath();
    ctx.rect(...rel2abs(-Character.BORDER, -Character.BORDER,
      Character.WIDTH + 2 * Character.BORDER, Character.HEIGHT + 2 * Character.BORDER));
    ctx.fill();
    ctx.stroke();
    ctx.closePath();
    if (this.revealed || this.show) {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.rect(0, 0, ...rel2abs(Character.WIDTH, Character.HEIGHT));
      ctx.fill();
      ctx.closePath();

      ctx.fillStyle = this.align == 'Shadow' ? '#FF0000' : this.align == 'Hunter' ? '#0000FF' : '#F09632';
      ctx.beginPath();
      ctx.arc(...rel2abs(Character.WIDTH * .1, Character.HEIGHT * .1,  Character.WIDTH * .08), 0, 2 * Math.PI, false);
      ctx.fill();
      ctx.closePath();
      ctx.fillStyle = "#000000";
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.font = 'bold 1.2vw Arial';
      ctx.fillText(this.character['name'][0], ...rel2abs(Character.WIDTH * .1, Character.HEIGHT * .1));
      ctx.textAlign = 'left';
      ctx.fillText(this.character['name'].slice(1, this.character['name'].length),
        ...rel2abs(Character.WIDTH * .18, Character.HEIGHT * .12));

      ctx.fillStyle = '#FF0000';
      ctx.beginPath();
      ctx.arc(...rel2abs(Character.WIDTH * .9, Character.HEIGHT * .08,  Character.WIDTH * .07), 0, 2 * Math.PI, false);
      ctx.fill();
      ctx.closePath();
      ctx.fillStyle = "#000000";
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.font = 'bold 1vw Arial';
      ctx.fillText(this.character['hp'], ...rel2abs(Character.WIDTH * .9, Character.HEIGHT * .08));
      ctx.textAlign = 'right';
      ctx.fillText("PV", ...rel2abs(Character.WIDTH * .83, Character.HEIGHT * .08));

      ctx.fillStyle = "#000000";
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.font = 'bold 1vw Arial';
      ctx.fillText("Condition de victoire :", ...rel2abs(Character.WIDTH * .5, Character.HEIGHT * .3, Character.WIDTH * .95));
      ctx.font = '.8vw Arial';
      fillTextMultiLine(ctx, this.character['victory'], ...rel2abs(.007, Character.WIDTH * .5, Character.HEIGHT * .37, Character.WIDTH * .95));
      ctx.font = 'bold 1vw Arial';
      var y = Character.HEIGHT * .6;
      y = fillTextMultiLine(ctx, this.character['ability'], ...rel2abs(.01, Character.WIDTH * .5, y, Character.WIDTH * .95));
      ctx.font = '.8vw Arial';
      fillTextMultiLine(ctx, this.character['ability_desc'], ...rel2abs(.007, Character.WIDTH * .5, abs2rel(y), Character.WIDTH * .95));
    }
    ctx.restore();
  }

  reveal(){
    return (! this.revealed) && confirm("Voulez vous vraiment vous révéler ?");
  }

  inventory(){
        // class InventoryPopup(popup.Popup):
        //     def __init__(self, game, character):
        //         super().__init__(game)
        //         self.character = character
        //
        //         self.label = tkinter.Label(self, text='', wraplength=600, padx=30, pady=10, font=(None, 16))
        //         self.listbox = tkinter.Listbox(self, selectmode=tkinter.SINGLE)
        //         self.button_take = tkinter.Button(self, text="Prendre équipement", padx=30, pady=10, command=self.take)
        //         self.button_ok = tkinter.Button(self, text="Ok", padx=30, pady=10, command=self.destroy)
        //         self.update_widgets()
        //
        //         self.show()
        //
        //     def update_widgets(self):
        //         self.label.pack_forget()
        //         self.listbox.pack_forget()
        //         self.button_take.pack_forget()
        //         self.button_ok.pack_forget()
        //
        //         self.listbox.delete(0, tkinter.END)
        //         self.listbox.config(width=0, height=0)
        //         if self.character.equipments:
        //             self.label.config(text="Le joueur {0} possède les équipements :"
        //                               .format(PLAYERS[self.character.i_player][0]))
        //
        //             for equip in self.character.equipments:
        //                 c = equip[0].CARDS[equip[1]]
        //                 self.listbox.insert(tkinter.END, '{0} : {1}'.format(c[0], c[2]))
        //
        //             self.label.pack()
        //             self.listbox.pack()
        //             if self._game.client.i != self.character.i_player:
        //                 self.button_take.pack()
        //         else:
        //             self.label.config(text="Le joueur {0} ne possède pas d'équipement"
        //                               .format(PLAYERS[self.character.i_player][0]))
        //
        //             self.label.pack()
        //
        //         self.button_ok.pack()
        //         self.center()
        //
        //     def callback(self):
        //         """
        //         Update the listbox
        //
        //         Returns:
        //             None
        //         """
        //         if self.listbox.size() != len(self.character.equipments):
        //             self.update_widgets()
        //
        //     def take(self):
        //         ids = self.listbox.curselection()
        //         if ids:
        //             self._game.client.take_equipment(self.character.i_player, ids[0])
        //
        // return InventoryPopup(self.game, self)
  }
}


function fillTextMultiLine(ctx, text, lineHeight, x, y, maxWidth=null) {
  text.split('\n').forEach((line, i) => {
    ctx.fillText(line, x, y, maxWidth);
    y += lineHeight;
  });
  return y;
}


function game(id, tokens_center, dices_val, characters_data, areas_order, active_player){
  var canvas = document.getElementById("game_canvas");
  var canvas_ctx = canvas.getContext("2d");

  var background = document.getElementById("source");
  var background_dim = [0.4, 0.4 * background.height / background.width]

  var areas = new Array(6);
  for (var i = 0; i < areas.length; i++) {areas[i] = new Area(i, areas_order[i]);}

  dices = [new Dice(3, 4, [0.5, 0.1], dices_val[0]), new Dice(4, 6, [.5, .2], dices_val[1])];

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
  });

  document.addEventListener('mouseup', e => {
    owned_tokens.forEach((token, i) => {
      if (token.hold) {
        token.drop();
        send_token(tokens.indexOf(token), token.center);
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
        if (characters[id].reveal()) {
          reveal();
        }
        break;
    }
  });


  timer_id = setInterval(() => {
    canvas.width  = document.documentElement.clientWidth;
    canvas.height = document.documentElement.clientHeight;
    canvas_ctx.clearRect(0, 0, canvas.width, canvas.height);

    canvas_ctx.drawImage(background, 0, 0, ...rel2abs(background_dim));
    areas.forEach((area, i) => {area.draw_on(canvas_ctx);});

    dices.forEach((dice, i) => {dice.draw_on(canvas_ctx);});

    characters.forEach((character, i) => {character.draw_on(canvas_ctx);});

    [...tokens].sort((a, b) => {
      return 100 * (a.hold - b.hold)
        + 10 * (a.center[1] - b.center[1] - a.offset[1] + b.offset[1])
        + (a.center[0] - b.center[0] - a.offset[0] + b.offset[0])
    }).forEach((token, i) => {token.draw_on(canvas_ctx);});
  }, 100);
}
