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
    if (! this.revealed) {
      modal.style.display = "block";
    }
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


class Card{
  static WIDTH = .11;
  static HEIGHT = .15;

  static CARDS = [];

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
    ctx.rect(...rel2abs(...this.nw_position, Card.WIDTH, Card.HEIGHT));
    ctx.fill();
    ctx.stroke();
    ctx.closePath();
  }

  draw_card(){}
}

class BlackCard extends Card {

  static CARDS = [
    {'name': "Chauve-souris vampire", 'equip': false, 'desc': "Infligez 2 Blessures au joueur de votre choix, puis soignez une de vos Blessures."},
    {'name': "Chauve-souris vampire", 'equip': false, 'desc': "Infligez 2 Blessures au joueur de votre choix, puis soignez une de vos Blessures."},
    {'name': "Chauve-souris vampire", 'equip': false, 'desc': "Infligez 2 Blessures au joueur de votre choix, puis soignez une de vos Blessures."},
    {'name': "Succube tentatrice",    'equip': false, 'desc': "Volez une carte équipement au joueur de votre choix."},
    {'name': "Succube tentatrice",    'equip': false, 'desc': "Volez une carte équipement au joueur de votre choix."},
    {'name': "Araignée sanguinaire",  'equip': false, 'desc': "Vous infligez 2 Blessures au personnage de votre choix, puis vous subissez vous-même 2 Blessures."},
    {'name': "Poupée démoniaque",     'equip': false, 'desc': "Désignez un joueur et lancez le dé à 6 faces. 1 à 4 : infligez lui 3 Blessures. 5 ou 6 subissez 3 Blessures."},
    {'name': "Dynamite",              'equip': false, 'desc': "Lancez les 2 dés et infligez 3 Blessures à tous les joueurs (vous compris) se trouvant dans le secteur désigné par le total des 2 dés. Il ne se passe rien si ce total est 7."},
    {'name': "Rituel diabolique",     'equip': false, 'desc': "Si vous êtes un Shadow, et si vous décidez de révéler (ou avez déjà révélé) votre identité, soignez toutes vos Blessures."},
    {'name': "Peau de banane",        'equip': false, 'desc': "Donnez une de vos cartes équipements à un autre personnage. Si vous n'en possédez aucune, vous encaissez 1 Blessure."},
    {'name': "Tronçonneuse du mal",   'equip': true,  'desc': "Si votre attaque inflige des Blessures, la victime subit 1 Blessure en plus."},
    {'name': "Hachoir maudit",        'equip': true,  'desc': "Si votre attaque inflige des Blessures, la victime subit 1 Blessure en plus."},
    {'name': "Hache tueuse",          'equip': true,  'desc': "Si votre attaque inflige des Blessures, la victime subit 1 Blessure en plus."},
    {'name': "Revolver des ténèbres", 'equip': true,  'desc': "Vous pouvez attaquer un joueur présent sur l'un des 4 lieux hors de votre secteur, mais vous ne pouvez plus attaquer un joueur situé dans le même secteur que vous."},
    {'name': "Sabre hanté Masamuné",  'equip': true,  'desc': "Vous êtes obligé d'attaquer durant votre tour. Lancez uniquement le dé à 4 faces, le résultat indique les Blessures que vous infligez."},
    {'name': "Mitrailleuse funeste",  'equip': true,  'desc': "Votre attaque affecte tous les personnages qui sont à votre porté. Effectuez un seul jet de Blessures pour tous les joueurs concernés."}
  ]

  constructor(nw_position) {
    super(nw_position, '#141414');
  }

  draw_card(){
    /*
    card = self.CARDS[i_card]

    if card[1]:
        self.game.characters[i_player].equipments.append((self.__class__, i_card))

    class DrawDarkPopup(popup.Popup):
        def __init__(self, game_instance):
            super().__init__(game_instance)

            tkinter.Label(self, text="Le joueur {0} pioche la carte :".format(game.PLAYERS[i_player][0]),
                          wraplength=600, padx=30, pady=10, font=(None, 16)).pack()
            tkinter.Label(self, text=card[0], wraplength=300, padx=30, pady=10, font=(None, 12)).pack()
            tkinter.Label(self, text=card[2], wraplength=300, padx=30, pady=10, font=(None, 12)).pack()
            tkinter.Button(self, text="Ok", padx=30, pady=10, command=self.destroy).pack(padx=30, pady=30)

            self.center()
            self.show()

    DrawDarkPopup(self.game)
    */
  }
}

class VisionCard extends Card {

  static CARDS = [
    {'name': "Vision cupide",        'desc1': "Je pense que tu es Neutre ou Shadow",                           'desc2': "Si c'est le cas, tu dois : soit me donner une carte équipement, soit subir une Blessure."},
    {'name': "Vision cupide",        'desc1': "Je pense que tu es Neutre ou Shadow",                           'desc2': "Si c'est le cas, tu dois : soit me donner une carte équipement, soit subir une Blessure."},
    {'name': "Vision enivrante",     'desc1': "Je pense que tu es Neutre ou Hunter",                           'desc2': "Si c'est le cas, tu dois : soit me donner une carte équipement, soit subir une Blessure"},
    {'name': "Vision enivrante",     'desc1': "Je pense que tu es Neutre ou Hunter",                           'desc2': "Si c'est le cas, tu dois : soit me donner une carte équipement, soit subir une Blessure"},
    {'name': "Vision furtive",       'desc1': "Je pense que tu es Hunter ou Shadow",                           'desc2': "Si c'est le cas, tu dois : soit me donner une carte équipement, soit subir une Blessure."},
    {'name': "Vision furtive",       'desc1': "Je pense que tu es Hunter ou Shadow",                           'desc2': "Si c'est le cas, tu dois : soit me donner une carte équipement, soit subir une Blessure."},
    {'name': "Vision mortifère",     'desc1': "Je pense que tu es Hunter",                                     'desc2': "Si c'est le cas, subis 1 Blessure !"},
    {'name': "Vision mortifère",     'desc1': "Je pense que tu es Hunter",                                     'desc2': "Si c'est le cas, subis 1 Blessure !"},
    {'name': "Vision destructrice",  'desc1': "Je pense que tu es un personnage de 12 Points de vie ou plus",  'desc2': "Si c'est le cas, subis 2 Blessures !"},
    {'name': "Vision clairvoyante",  'desc1': "Je pense que tu es un personnage de 11 Points de vie ou moins", 'desc2': "Si c'est le cas, subis 1 Blessures !"},
    {'name': "Vision divine",        'desc1': "Je pense que tu es Hunter",                                     'desc2': "Si c'est le cas, soigne 1 Blessure. (Toutefois, si tu n'avais aucune blessure, subis 1 Blessure !)"},
    {'name': "Vision réconfortante", 'desc1': "Je pense que tu es Neutre",                                     'desc2': "Si c'est le cas, soigne 1 Blessure. (Toutefois, si tu n'avais aucune blessure, subis 1 Blessure !)"},
    {'name': "Vision lugubre",       'desc1': "Je pense que tu es Shadow",                                     'desc2': "Si c'est le cas, soigne 1 Blessure. (Toutefois, si tu n'avais aucune blessure, subis 1 Blessure !)"},
    {'name': "Vision foudroyante",   'desc1': "Je pense que tu es Shadow",                                     'desc2': "Si c'est le cas, subis 1 Blessure !"},
    {'name': "Vision purificatrice", 'desc1': "Je pense que tu es Shadow",                                     'desc2': "Si c'est le cas, subis 2 Blessures !"},
    {'name': "Vision suprème",       'desc1': "",                                                              'desc2': "Monte moi secrètement ta carte Personnage !"}
  ]

  constructor(nw_position) {
    super(nw_position, '#00FF00');
  }

  draw_card(){
    /*
    card = self.CARDS[i_card]

    class DrawVisionPopup(popup.Popup):
        def __init__(self, game_instance):
            super().__init__(game_instance)
            self.i = -1

            tkinter.Label(self, text="A quel joueur voulez vous donner cette vision ?",
                          wraplength=600, padx=30, pady=10, font=(None, 16)).pack()
            tkinter.Label(self, text=card[0], wraplength=300, padx=30, pady=10, font=(None, 12)).pack()
            tkinter.Label(self, text=card[1], wraplength=300, padx=30, pady=10, font=(None, 12)).pack()
            tkinter.Label(self, text=card[2], wraplength=300, padx=30, pady=10, font=(None, 12)).pack()

            frame = tkinter.Frame(self)
            self.var = tkinter.IntVar()
            self.var.set(-1)
            for i in range(len(game.PLAYERS)):
                if i != self._game.client.i:
                    tkinter.Radiobutton(frame, text=game.PLAYERS[i][0], variable=self.var, value=i).grid(
                        row=i // 4, column=i % 4, sticky=tkinter.W, padx=10, pady=10)
            frame.pack()

            tkinter.Button(self, text="Ok", padx=30, pady=10, command=self.answer).pack(padx=30, pady=30)

            self.center()
            self.show()

        def answer(self):
            self.i = self.var.get()
            if self.i >= 0:
                self.destroy()

    return DrawVisionPopup(self.game).i
    */
  }

  answer(){
    /*
    def answer(self, i_card, i_from):
        """
        Answer the vision i_card from player i_from

        Args:
            i_card (int)
            i_from (int)

        Returns:
            None
        """
        card = self.CARDS[i_card]

        class AnswerVisionPopup(popup.Popup):
            def __init__(self, game_instance):
                super().__init__(game_instance)

                tkinter.Label(self, text="Le joueur {0} vous donne la vision :".format(game.PLAYERS[i_from][0]),
                              wraplength=600, padx=30, pady=10, font=(None, 16)).pack()
                tkinter.Label(self, text=card[0], wraplength=300, padx=30, pady=10, font=(None, 12)).pack()
                tkinter.Label(self, text=card[1], wraplength=300, padx=30, pady=10, font=(None, 12)).pack()
                tkinter.Label(self, text=card[2], wraplength=300, padx=30, pady=10, font=(None, 12)).pack()
                tkinter.Button(self, text="Ok", padx=30, pady=10, command=self.destroy).pack(padx=30, pady=30)

                self.center()
                self.show()

        AnswerVisionPopup(self.game)
    */
  }
}

class WhiteCard extends Card {

  static CARDS = [
    {'name': "Éclair purificateur", 'equip': false, 'desc': "Chaque personnage, à l'exception de vous même, subit 2 Blessures."},
    {'name': "Eau bénite",          'equip': false, 'desc': "Vous êtes soigné de 2 Blessures."},
    {'name': "Eau bénite",          'equip': false, 'desc': "Vous êtes soigné de 2 Blessures."},
    {'name': "Savoir ancestral",    'equip': false, 'desc': "Lorsque votre tour est terminé, jouez immédiatement un nouveau tour."},
    {'name': "Avènement suprème",   'equip': false, 'desc': "Si vous êtes un Hunter, vous pouvez révéler votre identité. Si vous le faites, ou si vous êtes déjà révélé, vous soignez toutes vos Blessures."},
    {'name': "Miroir divin",        'equip': false, 'desc': "Si vous êtes un Shadow, autre que Métamorphe, vous devez révéler votre identité."},
    {'name': "Premiers secours",    'equip': false, 'desc': "Placez le marqueur de Blessures du joueur de votre choix (y compris vous) sur le 7."},
    {'name': "Ange gardien",        'equip': false, 'desc': "Les attaques ne vous infligent aucune Blessure jusqu'à la fin de votre prochain tour."},
    {'name': "Barre de chocolat",   'equip': false, 'desc': "Si vous êtes Allie, Agnes, Emi, Ellen, Momie ou Métamorphe, et que vous choisissez de révéler (ou avez déjà révélé) votre identité, vous soignez toutes vos Blessures."},
    {'name': "Bénédiction",         'equip': false, 'desc': "Choisissez un joueur autre que vous même et lancez le dé à 6 faces. Ce joueur guérit d'autant de Blessures que le résultat du dé."},
    {'name': "Crucifix en argent",  'equip': true,  'desc': "Si vous attaquez et tuez un autre personnage, vous récupérez toutes ses cartes équipements."},
    {'name': "Toge sainte",         'equip': true,  'desc': "Vos attaques infligent 1 Blessure en moins, et les Blessures que vous subissez sont réduites de 1."},
    {'name': "Lance de Longinus",   'equip': true,  'desc': "Si vous êtes un Hunter, et que votre identité est révélée, chaque fois qu'une de vos attaque inflige des Blessures, vous infligez 2 Blessures supplémentaires."},
    {'name': "Amulette",            'equip': true,  'desc': "Vous ne subissez aucune Blessure causée par les cartes Ténèbres : Araignée sanguinaire, Dynamite ou Chauve-souris vampire."},
    {'name': "Broche de chance",    'equip': true,  'desc': "Un joueur dans la Forêt hantée ne peut pas utiliser le pouvoir du Lieu pour vous infliger des Blessures (mais il peut toujours vous guérir)."},
    {'name': "Boussole mystique",   'equip': true,  'desc': "Quand vous vous déplacez, vous pouvez lancer 2 fois les dés, et choisir quel résultat utiliser."},
  ]

  constructor(nw_position) {
    super(nw_position, '#FFFFFF');
  }

  draw_card(){
    /*
    card = self.CARDS[i_card]

    if card[1]:
        self.game.characters[i_player].equipments.append((CardWhite, i_card))

    class DrawWhitePopup(popup.Popup):
        def __init__(self, game_instance):
            super().__init__(game_instance)

            tkinter.Label(self, text="Le joueur {0} pioche la carte :".format(game.PLAYERS[i_player][0]),
                          wraplength=600, padx=30, pady=10, font=(None, 16)).pack()
            tkinter.Label(self, text=card[0], wraplength=300, padx=30, pady=10, font=(None, 12)).pack()
            tkinter.Label(self, text=card[2], wraplength=300, padx=30, pady=10, font=(None, 12)).pack()

            tkinter.Button(self, text="Ok", padx=30, pady=10, command=self.destroy).pack(padx=30, pady=30)

            self.center()
            self.show()

    DrawWhitePopup(self.game)

    */
  }
}