import math
import os
import random
import tkinter

import card

os.environ['PYGAME_HIDE_SUPPORT_PROMPT'] = "hide"  # To hide pygame message
import pygame  # noqa: E402
import popup  # noqa: E402

PLAYERS = [('Red', (255, 0, 0)), ('Green', (0, 255, 0)), ('Blue', (0, 0, 255)), ('White', (255, 255, 255)),
           ('Orange', (250, 150, 50)), ('Yellow', (255, 255, 0)), ('Purple', (100, 0, 200)), ('Black', (20, 20, 20))]
""" List of the player, where a player is represented by the tuple (name (str), color_rgb (Tuple[int, int, int])) """


class Game:
    """
    The game instance

    Attributes:
        client (client.client)
        running (bool)
        clock (pygame.time.Clock)

        screen (pygame.Surface)
        bg (pygame.Surface): background, with the area cards
        zoom (pygame.Surface)
        flag_zoom (bool)

        cards (List[Card]): the three card decks, list of three Card instances
        tokens (List[Token]): the 2 * server._N_PLAYERS Token instances
        owned_tokens (List[Token]): the 2 Token instances owned by the player
        dices (List[Dice]): the 2 Dice instances
        characters (List[Character]): the server._N_PLAYERS Character instances
        active_player (ActivePlayer)
    """

    W, H = 1600, 900  # Width and height of the graphic window

    ZOOM_W, ZOOM_H = 600, 350  # Width and height of the rendered zoom area
    ZOOM_SCALE = 2.5

    FRAME_RATE = 30

    BACKGROUND_COLOR = (200, 200, 200)

    def __init__(self, c, tokens_center, dices_val, characters, areas, active_player):
        """
        Args:
            c (client.Client)
            tokens_center (List[Tuple[float, float]]): the 2 * server._N_PLAYERS token coordinates,
                stored as tuples of length 2, where token_center[2 * i] and token_center[2 * i + 1] belong to player i
            dices_val (List[int]): the dice 4 and dice 6 values, in this order
            characters (List[Tuple[int, int, bool]]): the playing characters, stored as (alignment, i, flag_revealed),
                the character is then Character.CHARACTERS[alignment][i], and is revealed if flag_revealed == True
            areas (List[int]): order of the 6 area cards
            active_player (int)
        """
        pygame.init()
        tkinter.Tk().wm_withdraw()

        self.client = c

        self.running = False
        self.clock = pygame.time.Clock()

        self.screen = pygame.display.set_mode((self.W, self.H), flags=pygame.HWSURFACE | pygame.DOUBLEBUF)
        pygame.display.set_caption('Shadow Hunters, player {0}'.format(PLAYERS[self.client.i][0]))

        self.bg = self.screen.copy()
        self.bg.fill(self.BACKGROUND_COLOR)
        self.bg.blit(pygame.image.load("resources/background.jpg"), (0, 0))

        self.cards = [card.TYPES[0]((800, 25), self), card.TYPES[1]((1000, 25), self), card.TYPES[2]((1200, 25), self)]
        for c in self.cards:
            c.draw_on(self.bg)

        for i in range(len(areas)):
            Area(areas[i], i).draw_on(self.bg)

        self.zoom = pygame.Surface((int(self.ZOOM_W / self.ZOOM_SCALE),
                                    int(self.ZOOM_H / self.ZOOM_SCALE)), flags=pygame.HWSURFACE | pygame.DOUBLEBUF)
        self.flag_zoom = False

        self.tokens = []
        for i in range(len(characters)):
            self.tokens.append(Token(PLAYERS[i][1], tokens_center[2 * i]))
            self.tokens.append(Token(PLAYERS[i][1], tokens_center[2 * i + 1]))
        self.owned_tokens = [self.tokens[2 * self.client.i], self.tokens[2 * self.client.i + 1]]

        self.dices = [Dice(3, 4, ((self.ZOOM_W + self.W - 4 * (Character.WIDTH + 30)) / 2, 600), dices_val[0]),
                      Dice(4, 6, ((self.ZOOM_W + self.W - 4 * (Character.WIDTH + 30)) / 2, 700), dices_val[1])]

        self.characters = []
        for i in range(len(characters)):
            self.characters.append(Character(*characters[i],
                                             nw_position=(self.W - (i % 4 + 1) * (Character.WIDTH + 30),
                                                          self.H - (i // 4 + 1) * (Character.HEIGHT + 30)),
                                             i_player=i, game=self))

        self.active_player = ActivePlayer(active_player, self.client.i)

    def run(self):
        """
        Runs the game

        Runs the game loop:
            check for server input
            handle events
            update token position, if necessary
            update display

        Returns:
            None
        """
        self.running = True

        while self.running:
            self.client.poll()

            for event in pygame.event.get():
                if event.type == pygame.QUIT or (event.type == pygame.KEYDOWN and event.key == pygame.K_q):
                    self.client.close()
                if event.type == pygame.KEYDOWN and event.key == pygame.K_z:
                    self.flag_zoom = not self.flag_zoom
                if event.type == pygame.KEYDOWN and event.key == pygame.K_d:
                    self.client.roll_dice()
                if event.type == pygame.KEYDOWN and event.key == pygame.K_r:
                    if self.characters[self.client.i].reveal():
                        self.client.reveal()
                if event.type == pygame.MOUSEBUTTONDOWN:
                    for token in sorted(self.owned_tokens, key=lambda t: (t.center[1], t.center[0]), reverse=True):
                        if token.collide(event.pos):
                            token.hold = True
                            break
                    if any(token.hold for token in self.owned_tokens):
                        continue

                    if self.active_player.collide(event.pos):
                        self.client.end_turn()

                    for i in range(len(self.cards)):
                        if self.cards[i].collide(event.pos):
                            self.client.draw(i)

                    for c in self.characters:
                        if c.collide(event.pos):
                            c.inventory()
                if event.type == pygame.MOUSEBUTTONUP:
                    for i in (2 * self.client.i, 2 * self.client.i + 1):
                        token = self.tokens[i]
                        if token.hold:
                            token.drop()
                            self.client.send_token(i)

            for token in self.owned_tokens:
                if token.hold:
                    token.center = pygame.mouse.get_pos()

            self.update_display()
            self.clock.tick(self.FRAME_RATE)

    def update_display(self):
        """
        Update the screen

        Returns:
            None
        """
        self.screen.blit(self.bg, (0, 0))

        for dice in self.dices:
            dice.draw_on(self.screen)

        for character in self.characters:
            character.draw_on(self.screen)

        self.active_player.draw_on(self.screen)

        for token in sorted(self.tokens, key=lambda t: (t.hold, t.center[1] - t.offset[1], t.center[0] - t.offset[0])):
            token.draw_on(self.screen)

        if self.flag_zoom:
            mouse_x, mouse_y = pygame.mouse.get_pos()
            self.zoom.fill((0, 0, 0))
            self.zoom.blit(self.screen, (0, 0),
                           pygame.Rect(mouse_x - self.zoom.get_width() / 2, mouse_y - self.zoom.get_height() / 2,
                                       self.zoom.get_width(), self.zoom.get_height()))
            self.screen.blit(pygame.transform.smoothscale(self.zoom, (self.ZOOM_W, self.ZOOM_H)),
                             (5, self.H - self.ZOOM_H - 5))

        pygame.display.flip()


class Area:
    """
    Represents an area card, and defines the data regarding the areas

    Attributes:
        nw_position (Tuple[float, float])
        card (pygame.Surface)
    """
    WIDTH, HEIGHT = 105, 150

    AREAS = [
        ([2, 3], "Antre de\nl'ermite", "Vous pouvez\npiocher une\ncarte Vision"),
        ([4, 5], "Porte de\nl'Outremonde", "Vous pouvez\npiocher une\ncarte dans\nla pile de\nvotre choix"),
        ([6], "Monast??re", "Vous pouvez\npiocher une\ncarte Lumi??re"),
        ([8], "Cimeti??re", "Vous pouvez\npiocher une\ncarte T??n??bres"),
        ([9], "For??t hant??e", "Le joueur de\nvotre choix peut\nsubir 2 blessures\nOU\nsoigner 1 blessure"),
        ([10], "Sanctuaire\nancien", "Vous pouvez\nvoler une carte\n??quipement ??\nun autre joueur")
    ]
    """ The areas cards, stored as tuple: (values (int), name (str), description (str)) """

    AREA_LOCATIONS = [(318, 32, 0), (430, 32, 0),
                      (185, 220, -70), (225, 325, -70),
                      (452, 325, 70), (490, 220, 70)]
    """ The area card slots, as tuples (x (float), y (float), rotation in degrees (float)) """

    def __init__(self, i_area, i_slot):
        """
        Args:
            i_area (int): the area id
            i_slot (int): where to place it
        """
        self.nw_position = Area.AREA_LOCATIONS[i_slot][:-1]

        self.card = pygame.surface.Surface((self.WIDTH, self.HEIGHT),
                                           flags=pygame.HWSURFACE | pygame.DOUBLEBUF | pygame.SRCALPHA)
        self.card.fill((255, 255, 0))

        area = Area.AREAS[i_area]

        font = pygame.font.SysFont('dejavuserif', 20)
        if len(area[0]) == 2:
            pygame.draw.circle(self.card, (100, 100, 100), (self.WIDTH / 2 - 20, 20), 15)
            text = font.render(str(area[0][0]), True, (0, 0, 0))
            self.card.blit(text, ((self.WIDTH - text.get_width()) / 2 - 20, 20 - text.get_height() / 2))
            pygame.draw.circle(self.card, (100, 100, 100), (self.WIDTH / 2 + 20, 20), 15)
            text = font.render(str(area[0][1]), True, (0, 0, 0))
            self.card.blit(text, ((self.WIDTH - text.get_width()) / 2 + 20, 20 - text.get_height() / 2))
        else:
            pygame.draw.circle(self.card, (100, 100, 100), (self.WIDTH / 2, 20), 15)
            text = font.render(str(area[0][0]), True, (0, 0, 0))
            self.card.blit(text, ((self.WIDTH - text.get_width()) / 2, 20 - text.get_height() / 2))

        y = render_text(area[1], pygame.font.SysFont('dejavuserif', 12), (0, 0, 0), self.card, 'c', self.WIDTH / 2, 40)
        _ = render_text(area[2], pygame.font.SysFont('dejavuserif', 10), (0, 0, 0), self.card, 'c', self.WIDTH / 2,
                        y + 10)

        self.card = pygame.transform.rotozoom(self.card, Area.AREA_LOCATIONS[i_slot][-1], 1)

    def draw_on(self, surface):
        """
        Draw the area card on the surface

        Args:
            surface (pygame.Surface)

        Returns:
            None
        """
        surface.blit(self.card, self.nw_position)


class Character:
    """
    Represents a character card, and defines the data regarding the characters

    Attributes:
        revealed (bool)
        nw_position (Tuple[float, float])
        i_player (int): the corresponding player id
        game (Game): the Game instance
        equipments (List[Tuple[Card, int]]): the character equipments
        card_back (pygame.Surface)
        card (pygame.Surface)
    """
    WIDTH, HEIGHT = 180, 240
    MARGIN = 10

    CHARACTERS = [
        [
            ('M??tamorphe',
             11,
             "Tous les personnages Hunter\nsont morts ou 3 personnages\nNeutres sont morts.",
             "Pouvoir permanent : Imitation",
             "Vous pouvez mentir (sans\navoir ?? r??v??ler votre identit??)\nlorsqu'on vous donne\nune carte Vision."),
            ('Momie',
             11,
             "Tous les personnages Hunter\nsont morts ou 3 personnages\nNeutres sont morts.",
             "Capacit?? sp??ciale :\nRayon d'Outremonde",
             "Au d??but de votre tour,\nvous pouvez infliger 3 Blessures\n?? un joueur pr??sent dans le Lieu\n"
             "Porte de l'Outremonde."),
            ('Vampire',
             13,
             "Tous les personnages Hunter\nsont morts ou 3 personnages\nNeutres sont morts.",
             "Capacit?? sp??ciale : Morsure",
             "Si vous attaquez un joueur\net lui infligez des Blessures,\nsoignez imm??diatement\n2 de vos Blessures."),
            ('Valkyrie',
             13,
             "Tous les personnages Hunter\nsont morts ou 3 personnages\nNeutres sont morts.",
             "Capacit?? sp??ciale : Chant de guerre",
             "Quand vous attaquez,\nlancez seulement le d?? ?? 4 faces\npour d??terminer les d??gats."),
            ('Loup-Garou',
             14,
             "Tous les personnages Hunter\nsont morts ou 3 personnages\nNeutres sont morts.",
             "Capacit?? sp??ciale : Contre-attaque",
             "Apr??s avoir subi l'attaque\nd'un joueur, vous pouvez\ncontre-attaquer imm??diatement."),
            ('Liche',
             14,
             "Tous les personnages Hunter\nsont morts ou 3 personnages\nNeutres sont morts.",
             "Capacit?? sp??ciale : N??cromancie",
             "Vous pouvez rejouer autant de fois\nqu'il y a de personnages morts.\nUtilisation unique.")
        ],
        [
            ('Allie',
             8,
             "Etre encore en vie lorsque\nla partie se termine.",
             "Capacit?? sp??ciale : Amour maternel",
             "Soignez toutes vos blessures.\nUtilisation unique."),
            ('Agnes',
             8,
             "Le joueur ?? votre droite gagne.",
             "Capacit?? sp??ciale : Caprice",
             "Au d??but de votre tour, changez\nvotre condition de victoire par :\n\"Le joueur ?? votre gauche gagne\"."),
            ('Daniel',
             13,
             "Etre le premier ?? mourir\nOU ??tre en vie quand tous\nles personnages Shadow\nsont morts.",
             "Particularit?? : D??sespoir",
             "D??s qu'un personnage meurt,\nvous devez r??v??ler\nvotre identit??."),
            ('David',
             13,
             "Avoir au minimum 3 de ces cartes :\nCrucifix en argent, Amulette,\nLance de Longinus, Toge sainte.",
             "Capacit?? sp??class :\nPilleur de tombes",
             "R??cup??rez dans la d??fausse la\ncarte ??quipement de votre choix.\nUtilisation unique."),
            ('Bob',
             10,
             "Poss??der 5 cartes ??quipements\nou plus.",
             "Capacit?? sp??ciale : Braquage",
             "Si vous tuez un personnage,\nvous pouvez r??cup??rer\ntoutes ses cartes ??quipements."),
            ('Bryan',
             10,
             "Tuer un personnage de\n13 Points de Vie ou plus,\nOU ??tre dans le Sanctuaire ancien\n?? la fin du jeu.",
             "Particularit?? : Oh my god !",
             "Si vous tuez un personnage de\n12 Points de Vie ou moins,\nvous devez r??v??ler votre identit??."),
            ('Charles',
             11,
             "Tuer un personnage par\nune attaque alors qu'il y a\nd??j?? eu 3 morts ou plus.",
             "Capacit?? sp??ciale : Festin sanglant",
             "Apr??s votre attaque, vous pouvez\nvous infliger 2 Blessures afin\nd'attaquer de nouveau\n"
             "le m??me joueur."),
            ('Catherine',
             11,
             "??tre la premi??re ?? mourir\nOU ??tre l'un des deux\nseuls personnages en vie.",
             "Capacit?? sp??ciale : Stigmates",
             "Guerissez de 1 Blessure\nau d??but de votre tour.")
        ],
        [
            ('Emi',
             10,
             "Tous les personnages Shadow\nsont morts.",
             "Capacit?? sp??ciale : T??l??portation",
             "Pour vous d??placer, vous pouvez\nlancer normalement les d??s,\nou vous d??placer sur\n"
             "la carte lieu adjacente."),
            ('Ellen',
             10,
             "Tous les personnages Shadow\nsont morts.",
             "Capacit?? sp??ciale : Exorcisme",
             "Au d??but de votre tour,\nvous pouvez d??signer un joueur.\nIl perd sa capacit?? sp??ciale\n"
             "jusqu'?? la fin de la partie.\nUtilisation unique."),
            ('Georges',
             14,
             "Tous les personnages Shadow\nsont morts.",
             "Capacit?? sp??ciale : D??molition",
             "Au d??but de votre tour, choisissez\nun joueur et infligez lui autant\nde blessures que le r??sultat\n"
             "d'un d?? ?? 4 faces.\nUtilisation unique."),
            ('Gregor',
             14,
             "Tous les personnages Shadow\nsont morts.",
             "Capacit?? sp??ciale :\nBouclier fant??me",
             "Ce pouvoir peut s'activer ?? la fin\nde votre tour. Vous ne subissez\naucune Blessure jusqu'au d??but\n"
             "de votre prochain tour.\nUtilisation unique."),
            ('Franklin',
             12,
             "Tous les personnages Shadow\nsont morts.",
             "Capacit?? sp??ciale : Poudre",
             "Au d??but de votre tour, choisissez\nun joueur et infligez lui autant\nde blessures que le r??sultat\n"
             "d'un d?? ?? 6 faces.\nUtilisation unique."),
            ('Fu-Ka',
             12,
             "Tous les personnages Shadow\nsont morts.",
             "Capacit?? sp??ciale :\nSoins particuliers",
             "Au d??but de votre tour,\nplacez le marqueur\nde Blessures d'un joueur sur 7.\nUtilisation unique.")
        ]
    ]
    """
    The playable characters, in three lists : the Shadows, the Neutrals, the Hunters.
    A character is stored as the tuple:
        (name (str), health points (int), victory condition (str), power name (str), power description (str))
    """

    CHARACTERS_REPARTITION = {
        4: (2, 0, 2),
        5: (2, 1, 2),
        6: (2, 2, 2),
        7: (3, 1, 3),
        8: (3, 2, 3)
    }

    def __init__(self, align, i_character, revealed, equipments, nw_position, i_player, game):
        """
        Args:
            align (int): 0 for Shadow, 1 for Neutral and 2 for Hunter
            i_character (int): the character id in it's alignment
            revealed (bool)
            equipments (List[Tuple[int, int]])
            nw_position (Tuple[float, float])
            i_player (int): the corresponding player id
            game (Game)
        """
        self.revealed = revealed
        self.nw_position = nw_position
        self.i_player = i_player
        self.game = game
        self.equipments = [(card.TYPES[e[0]], e[1]) for e in equipments]

        self.card_back = pygame.surface.Surface((self.WIDTH + 2 * self.MARGIN, self.HEIGHT + 2 * self.MARGIN),
                                                flags=pygame.HWSURFACE | pygame.DOUBLEBUF)
        self.card_back.fill(PLAYERS[i_player][1])

        self.card = pygame.surface.Surface((self.WIDTH + 2 * self.MARGIN, self.HEIGHT + 2 * self.MARGIN),
                                           flags=pygame.HWSURFACE | pygame.DOUBLEBUF)
        self.card.fill(PLAYERS[i_player][1])
        self.card.fill((255, 255, 255), (self.MARGIN, self.MARGIN, self.WIDTH, self.HEIGHT))

        color = (255, 0, 0) if align == 0 else (0, 0, 255) if align == 2 else (240, 150, 50)
        character = Character.CHARACTERS[align][i_character]

        pygame.draw.circle(self.card, color, (30, 30), 15)
        font = pygame.font.SysFont('dejavuserif', 20)
        text = font.render(character[0][0], True, (0, 0, 0))
        self.card.blit(text, (30 - text.get_width() / 2, 30 - text.get_height() / 2))
        font = pygame.font.SysFont('dejavuserif', 14)
        text = font.render(character[0][1:], True, (0, 0, 0))
        self.card.blit(text, (30 + 15, 30))

        pygame.draw.circle(self.card, (255, 0, 0), (self.WIDTH - 15, 25), 10)
        text = font.render(str(character[1]), True, (0, 0, 0))
        self.card.blit(text, (self.WIDTH - 15 - text.get_width() / 2, 25 - text.get_height() / 2))
        text = font.render("PV", True, (0, 0, 0))
        self.card.blit(text, (self.WIDTH - 15 - 10 - text.get_width(), 25 - text.get_height() / 2))

        font = pygame.font.SysFont('dejavuserif', 10)
        y = render_text("Condition de victoire :", font, color, self.card, 'c', self.MARGIN + self.WIDTH / 2, 75)
        y = render_text(character[2], font, (0, 0, 0), self.card, 'c', self.MARGIN + self.WIDTH / 2, y)
        y = render_text(character[3], font, color, self.card, 'c', self.MARGIN + self.WIDTH / 2, y + 20)
        _ = render_text(character[4], font, (0, 0, 0), self.card, 'c', self.MARGIN + self.WIDTH / 2, y)

    def collide(self, loc):
        """
        Test if the given location is on the character card

        Args:
            loc (Tuple[float, float])

        Returns:
            bool
        """
        return self.card.get_rect().collidepoint(loc[0] - self.nw_position[0], loc[1] - self.nw_position[1])

    def draw_on(self, surface):
        """
        Draw the character card on the surface

        Args:
            surface (pygame.Surface)

        Returns:
            None
        """
        if self.revealed or (self.i_player == self.game.client.i and self.collide(pygame.mouse.get_pos())):
            surface.blit(self.card, self.nw_position)
        else:
            surface.blit(self.card_back, self.nw_position)

    def reveal(self):
        """
        Ask the player for character reveal

        Returns:
            bool: does the player want to reveal it's character
        """
        if not self.revealed:
            class RevealPopup(popup.Popup):
                def __init__(self, game):
                    super().__init__(game)
                    self.answer = False
                    tkinter.Label(self, text="Voulez vous vraiment vous r??v??ler ?",
                                  wraplength=200, padx=30, pady=10, font=(None, 16)).pack()
                    tkinter.Button(self, text="Oui", padx=30, pady=10, command=self.answer_yes) \
                        .pack(side=tkinter.LEFT, padx=30, pady=30)
                    tkinter.Button(self, text="Non", padx=30, pady=10, command=self.answer_no) \
                        .pack(side=tkinter.RIGHT, padx=30, pady=30)
                    self.center()
                    self.show()

                def answer_yes(self):
                    self.answer = True
                    self.destroy()

                def answer_no(self):
                    self.answer = False
                    self.destroy()

            return RevealPopup(self.game).answer
        return False

    def inventory(self):
        class InventoryPopup(popup.Popup):
            def __init__(self, game, character):
                super().__init__(game)
                self.character = character

                self.label = tkinter.Label(self, text='', wraplength=600, padx=30, pady=10, font=(None, 16))
                self.listbox = tkinter.Listbox(self, selectmode=tkinter.SINGLE)
                self.button_take = tkinter.Button(self, text="Prendre ??quipement", padx=30, pady=10, command=self.take)
                self.button_ok = tkinter.Button(self, text="Ok", padx=30, pady=10, command=self.destroy)
                self.update_widgets()

                self.show()

            def update_widgets(self):
                self.label.pack_forget()
                self.listbox.pack_forget()
                self.button_take.pack_forget()
                self.button_ok.pack_forget()

                self.listbox.delete(0, tkinter.END)
                self.listbox.config(width=0, height=0)
                if self.character.equipments:
                    self.label.config(text="Le joueur {0} poss??de les ??quipements :"
                                      .format(PLAYERS[self.character.i_player][0]))

                    for equip in self.character.equipments:
                        c = equip[0].CARDS[equip[1]]
                        self.listbox.insert(tkinter.END, '{0} : {1}'.format(c[0], c[2]))

                    self.label.pack()
                    self.listbox.pack()
                    if self._game.client.i != self.character.i_player:
                        self.button_take.pack()
                else:
                    self.label.config(text="Le joueur {0} ne poss??de pas d'??quipement"
                                      .format(PLAYERS[self.character.i_player][0]))

                    self.label.pack()

                self.button_ok.pack()
                self.center()

            def callback(self):
                """
                Update the listbox

                Returns:
                    None
                """
                if self.listbox.size() != len(self.character.equipments):
                    self.update_widgets()

            def take(self):
                ids = self.listbox.curselection()
                if ids:
                    self._game.client.take_equipment(self.character.i_player, ids[0])

        return InventoryPopup(self.game, self)


class Token:
    """
    A draggable token

    A token is represented by a square of size Token.SIZE,
    with two ellipses of width and height Token.SIZE, Token.SIZE / 2.
    The square and the bottom ellipse are darkened.

    Attributes:
        color (Tuple[int, int, int])
        center (Tuple[float, float])

    """
    SIZE = 10
    DARKEN_FACTOR = 0.8

    def __init__(self, color, c_position):
        """
        Args:
            color (Tuple[int, int, int])
            c_position (Tuple[float, float]): position of the center
        """
        self.color = color
        self.center = c_position
        self.hold = False
        self.offset = 0, 0

    def collide(self, loc):
        """
        Test if the given location is on the token

        Args:
            loc (Tuple[float, float])

        Returns:
            bool
        """
        dx = (loc[0] - self.center[0]) / self.SIZE
        dy = (loc[1] - self.center[1]) / self.SIZE
        if (abs(dx) < 1 and abs(dy) < 1) or dx ** 2 + (2 * dy + 2) ** 2 < 1 or dx ** 2 + (2 * dy - 2) ** 2 < 1:
            self.offset = dx * self.SIZE, dy * self.SIZE
            return True

        self.offset = 0, 0
        return False

    def draw_on(self, surface):
        """
        Draw the token on the surface

        Args:
            surface (pygame.Surface)

        Returns:
            None
        """
        x, y = self.center[0] - self.offset[0], self.center[1] - self.offset[1]
        c_dark = [c * self.DARKEN_FACTOR for c in self.color]
        pygame.draw.ellipse(surface, c_dark, pygame.Rect(x - self.SIZE, y + self.SIZE / 2, 2 * self.SIZE, self.SIZE))
        pygame.draw.rect(surface, c_dark, pygame.Rect(x - self.SIZE, y - self.SIZE, 2 * self.SIZE, 2 * self.SIZE))
        pygame.draw.ellipse(surface, self.color, pygame.Rect(x - self.SIZE, y - 3 * self.SIZE / 2,
                                                             2 * self.SIZE, self.SIZE))

    def drop(self):
        """
        Drop the token

        Returns:
            None
        """
        self.hold = False
        self.center = self.center[0] - self.offset[0], self.center[1] - self.offset[1]
        self.offset = 0, 0


class Dice:
    """
    A dice

    Attributes:
        n_val (int): the values on the dice are 1, ..., n_val
        roll_since (float): since when is the dice rolling, or -1 if it is not
        value (int): the current value, note that it is not the displayed value if the dice is rolling
        center (Tuple[float, float]): the position of the dice center
        edges (list)
    """
    SIZE = 30
    ROLL_TIME = 1000
    ROLL_SPEED = 0.05
    COLOR = (0, 255, 0)
    FONT_COLOR = (255, 255, 255)

    def __init__(self, n_shape, n_val, center, value):
        """
        Args:
            n_shape (int): the shape of the dice representation (3 for triangle, 4 for square, ...)
            n_val (int)
            center (Tuple[float, float])
            value (int)
        """
        self.n_val = n_val
        self.roll_since = -1
        self.value = value

        angles = [math.pi * ((2 * k + 1) / n_shape + 1 / 2) for k in range(n_shape)]
        self.center = center
        self.edges = [(self.center[0] + self.SIZE * math.cos(theta),
                       self.center[1] + self.SIZE * math.sin(theta)) for theta in angles]

    def draw_on(self, surface):
        """
        Draw the dice on the surface

        Args:
            surface (pygame.Surface)

        Returns:
            None
        """
        if self.roll_since != -1 and pygame.time.get_ticks() - self.roll_since < self.ROLL_TIME:
            value = random.randint(1, self.n_val)
            for i in range(len(self.edges)):
                dx, dy = self.edges[i][0] - self.center[0], self.edges[i][1] - self.center[1]
                c, s = math.cos(self.ROLL_SPEED * math.pi), math.sin(self.ROLL_SPEED * math.pi)
                self.edges[i] = (self.center[0] + c * dx + s * dy, self.center[1] - s * dx + c * dy)
        else:
            self.roll_since = -1
            value = self.value

        font = pygame.font.Font(pygame.font.get_default_font(), self.SIZE)
        text_value = font.render(str(value), True, self.FONT_COLOR)

        pygame.draw.polygon(surface, self.COLOR, self.edges, 0)
        surface.blit(text_value, (self.center[0] - text_value.get_width() / 2,
                                  self.center[1] - text_value.get_height() / 2))

    def roll_to(self, value):
        """
        Roll the dice to reach the value

        Args:
            value (int)

        Returns:
            None
        """
        self.roll_since = pygame.time.get_ticks()
        self.value = value


class ActivePlayer:
    """
    Manage the active player

    Attributes:
        i (int)
        owner (int)
        end_turn (pygame.Surface): the "end of turn" button
    """
    MARGIN = 5
    FONT_SIZE = 20
    BUTTON_COLOR = (150, 150, 150)
    S_POSITION = (Game.W - 2 * (Character.WIDTH + 30),
                  Game.H - 2 * (Character.HEIGHT + 30) - 15)  # Position of the bottom center

    def __init__(self, i, owner):
        """
        Args:
            i (int): the active player id
            owner (int): the id of the player owning the Game instance
        """
        self.i = i
        self.owner = owner

        font = pygame.font.Font(pygame.font.get_default_font(), self.FONT_SIZE)
        text = font.render("Fin du tour", True, (0, 0, 0))
        self.end_turn = pygame.Surface((text.get_width() + 2 * self.MARGIN, text.get_height() + 2 * self.MARGIN))
        self.end_turn.fill(self.BUTTON_COLOR)
        self.end_turn.blit(text, (self.MARGIN, self.MARGIN))

    def collide(self, loc):
        """
        Test if the given location is on the "end of turn" button

        Args:
            loc (Tuple[float, float])

        Returns:
            bool
        """
        return self.i == self.owner and self.end_turn.get_rect().collidepoint(
            loc[0] - self.S_POSITION[0] + self.end_turn.get_width() / 2,
            loc[1] - self.S_POSITION[1] + self.end_turn.get_height())

    def draw_on(self, surface):
        """
        Draw the active player status :
        the active player name if it's somebody else, the "end of turn" button if it's the Game instance owner

        Args:
            surface (pygame.Surface)

        Returns:
            None
        """
        if self.i == self.owner:
            surface.blit(self.end_turn, (self.S_POSITION[0] - self.end_turn.get_width() / 2,
                                         self.S_POSITION[1] - self.end_turn.get_height()))
        else:
            font = pygame.font.Font(pygame.font.get_default_font(), 20)
            text = font.render("Tour du joueur : ", True, (0, 0, 0))
            surface.blit(text, (self.S_POSITION[0] - text.get_width(), self.S_POSITION[1] - text.get_height()))
            text = font.render(PLAYERS[self.i][0], True, PLAYERS[self.i][1])
            surface.blit(text, (self.S_POSITION[0], self.S_POSITION[1] - text.get_height()))


def render_text(text, font, color, surface, justify, x, y):
    """
    Render a text with line breaks on a surface

    Args:
        text (str)
        font (pygame.font.Font)
        color (Tuple[int, int, int])
        surface (pygame.Surface)
        justify (str): 'l', 'r', 'c' for left, right and center
        x (float)
        y (float)

    Returns:
        float: the y coordinate of the last rendered line
    """
    for line in text.split('\n'):
        text = font.render(line, True, color)
        if justify == 'l':
            surface.blit(text, (x, y))
        elif justify == 'r':
            surface.blit(text, (x - text.get_width(), y))
        elif justify == 'c':
            surface.blit(text, (x - text.get_width() / 2, y))
        else:
            raise ValueError("Unknown justify value: {0}".format(justify))
        y += text.get_height()
    return y
