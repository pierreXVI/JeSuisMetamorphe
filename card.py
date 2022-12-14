import os
import tkinter

import game
import popup

os.environ['PYGAME_HIDE_SUPPORT_PROMPT'] = "hide"  # To hide pygame message
import pygame  # noqa: E402


class _Card:
    """
    A basic card instance.

    A card represents the top of the deck, where the player can click to draw a card.

    Attributes:
        nw_position (Tuple[float, float])
        game_instance (Game): the Game instance
        card_back (pygame.Surface)
    """

    WIDTH, HEIGHT = 180, 240

    CARDS = []

    TYPES = []  # The card types

    def __init__(self, nw_position, game_instance):
        """
        Args:
            nw_position (Tuple[float, float])
            game_instance (game.Game)
        """
        self.nw_position = nw_position
        self.game = game_instance
        self.card_back = pygame.surface.Surface((self.WIDTH, self.HEIGHT), flags=pygame.HWSURFACE | pygame.DOUBLEBUF)

    def draw_on(self, surface):
        """
        Draw the card on the surface

        Args:
            surface (pygame.Surface)

        Returns:
            None
        """
        surface.blit(self.card_back, self.nw_position)

    def collide(self, loc):
        """
        Test if the given location is on the card

        Args:
            loc (Tuple[float, float])

        Returns:
            bool:
        """
        return self.card_back.get_rect().collidepoint(loc[0] - self.nw_position[0], loc[1] - self.nw_position[1])

    def draw(self, i_card, i_player):
        """
        Called to draw the card self.CARDS[i_card]

        Args:
            i_card (int)
            i_player (int): the player who draw the card

        Returns:
            any
        """
        pass


class CardBlack(_Card):
    """
    Dark cards

    A dark card is represented by the tuple (name (str), flag equipment (bool), description (str))
    """

    CARDS = [
        ("Chauve-souris vampire", False,
         "Infligez 2 Blessures au joueur de votre choix, puis soignez une de vos Blessures."),
        ("Chauve-souris vampire", False,
         "Infligez 2 Blessures au joueur de votre choix, puis soignez une de vos Blessures."),
        ("Chauve-souris vampire", False,
         "Infligez 2 Blessures au joueur de votre choix, puis soignez une de vos Blessures."),
        ("Succube tentatrice", False, "Volez une carte ??quipement au joueur de votre choix."),
        ("Succube tentatrice", False, "Volez une carte ??quipement au joueur de votre choix."),
        ("Araign??e sanguinaire", False,
         "Vous infligez 2 Blessures au personnage de votre choix, puis vous subissez vous-m??me 2 Blessures."),
        ("Poup??e d??moniaque", False,
         "D??signez un joueur et lancez le d?? ?? 6 faces. "
         "1 ?? 4 : infligez lui 3 Blessures. 5 ou 6 subissez 3 Blessures."),
        ("Dynamite", False,
         "Lancez les 2 d??s et infligez 3 Blessures ?? tous les joueurs (vous compris) se trouvant dans le secteur "
         "d??sign?? par le total des 2 d??s. Il ne se passe rien si ce total est 7."),
        ("Rituel diabolique", False,
         "Si vous ??tes un Shadow, et si vous d??cidez de r??v??ler (ou avez d??j?? r??v??l??) "
         "votre identit??, soignez toutes vos Blessures."),
        ("Peau de banane", False,
         "Donnez une de vos cartes ??quipements ?? un autre personnage. "
         "Si vous n'en poss??dez aucune, vous encaissez 1 Blessure."),
        ("Tron??onneuse du mal", True, "Si votre attaque inflige des Blessures, la victime subit 1 Blessure en plus."),
        ("Hachoir maudit", True, "Si votre attaque inflige des Blessures, la victime subit 1 Blessure en plus."),
        ("Hache tueuse", True, "Si votre attaque inflige des Blessures, la victime subit 1 Blessure en plus."),
        ("Revolver des t??n??bres", True,
         "Vous pouvez attaquer un joueur pr??sent sur l'un des 4 lieux hors de votre secteur, "
         "mais vous ne pouvez plus attaquer un joueur situ?? dans le m??me secteur que vous."),
        ("Sabre hant?? Masamun??", True,
         "Vous ??tes oblig?? d'attaquer durant votre tour. Lancez uniquement le d?? ?? 4 faces, "
         "le r??sultat indique les Blessures que vous infligez."),
        ("Mitrailleuse funeste", True,
         "Votre attaque affecte tous les personnages qui sont ?? votre port??. "
         "Effectuez un seul jet de Blessures pour tous les joueurs concern??s.")
    ]

    COLOR = (20, 20, 20)

    def __init__(self, nw_position, game_instance):
        """
        Args:
            nw_position (Tuple[float, float])
        """
        super().__init__(nw_position, game_instance)
        self.card_back.fill(self.COLOR)

    def draw(self, i_card, i_player):
        """
        Args:
            i_card (int)
            i_player (int)

        Returns:
            None
        """
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


class CardVision(_Card):
    """
    Vision cards

    A vision card is represented by the tuple (name (str), "I think you are ..." (str), "if so, ..." (str))

    Attributes:
        game_instance (Game): the Game instance
    """

    CARDS = [
        ("Vision cupide", "Je pense que tu es Neutre ou Shadow",
         "Si c'est le cas, tu dois : soit me donner une carte ??quipement, soit subir une Blessure."),
        ("Vision cupide", "Je pense que tu es Neutre ou Shadow",
         "Si c'est le cas, tu dois : soit me donner une carte ??quipement, soit subir une Blessure."),
        ("Vision enivrante", "Je pense que tu es Neutre ou Hunter",
         "Si c'est le cas, tu dois : soit me donner une carte ??quipement, soit subir une Blessure"),
        ("Vision enivrante", "Je pense que tu es Neutre ou Hunter",
         "Si c'est le cas, tu dois : soit me donner une carte ??quipement, soit subir une Blessure"),
        ("Vision furtive", "Je pense que tu es Hunter ou Shadow",
         "Si c'est le cas, tu dois : soit me donner une carte ??quipement, soit subir une Blessure."),
        ("Vision furtive", "Je pense que tu es Hunter ou Shadow",
         "Si c'est le cas, tu dois : soit me donner une carte ??quipement, soit subir une Blessure."),
        ("Vision mortif??re", "Je pense que tu es Hunter", "Si c'est le cas, subis 1 Blessure !"),
        ("Vision mortif??re", "Je pense que tu es Hunter", "Si c'est le cas, subis 1 Blessure !"),
        ("Vision destructrice", "Je pense que tu es un personnage de 12 Points de vie ou plus",
         "Si c'est le cas, subis 2 Blessures !"),
        ("Vision clairvoyante", "Je pense que tu es un personnage de 11 Points de vie ou moins",
         "Si c'est le cas, subis 1 Blessures !"),
        ("Vision divine", "Je pense que tu es Hunter",
         "Si c'est le cas, soigne 1 Blessure. (Toutefois, si tu n'avais aucune blessure, subis 1 Blessure !)"),
        ("Vision r??confortante", "Je pense que tu es Neutre",
         "Si c'est le cas, soigne 1 Blessure. (Toutefois, si tu n'avais aucune blessure, subis 1 Blessure !)"),
        ("Vision lugubre", "Je pense que tu es Shadow",
         "Si c'est le cas, soigne 1 Blessure. (Toutefois, si tu n'avais aucune blessure, subis 1 Blessure !)"),
        ("Vision foudroyante", "Je pense que tu es Shadow", "Si c'est le cas, subis 1 Blessure !"),
        ("Vision purificatrice", "Je pense que tu es Shadow", "Si c'est le cas, subis 2 Blessures !"),
        ("Vision supr??me", "", "Monte moi secr??tement ta carte Personnage !")
    ]

    COLOR = (0, 255, 0)

    def __init__(self, nw_position, game_instance):
        """
        Args:
            nw_position (Tuple[float, float])
            game_instance (Game)
        """
        super().__init__(nw_position, game_instance)
        self.card_back.fill(self.COLOR)

    def draw(self, i_card, i_player):
        """
        Args:
            i_card (int)
            i_player (int)
        Returns:
            int: who to send the vision card
        """
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


class CardWhite(_Card):
    """
    White cards

    A white card is represented by the tuple (name (str), flag equipment (bool), description (str))
    """

    CARDS = [
        ("??clair purificateur", False, "Chaque personnage, ?? l'exception de vous m??me, subit 2 Blessures."),
        ("Eau b??nite", False, "Vous ??tes soign?? de 2 Blessures."),
        ("Eau b??nite", False, "Vous ??tes soign?? de 2 Blessures."),
        ("Savoir ancestral", False, "Lorsque votre tour est termin??, jouez imm??diatement un nouveau tour."),
        ("Av??nement supr??me", False,
         "Si vous ??tes un Hunter, vous pouvez r??v??ler votre identit??. Si vous le faites, ou si vous ??tes d??j?? r??v??l??, "
         "vous soignez toutes vos Blessures."),
        ("Miroir divin", False, "Si vous ??tes un Shadow, autre que M??tamorphe, vous devez r??v??ler votre identit??."),
        ("Premiers secours", False,
         "Placez le marqueur de Blessures du joueur de votre choix (y compris vous) sur le 7."),
        ("Ange gardien", False,
         "Les attaques ne vous infligent aucune Blessure jusqu'?? la fin de votre prochain tour."),
        ("Barre de chocolat", False,
         "Si vous ??tes Allie, Agnes, Emi, Ellen, Momie ou M??tamorphe, et que vous choisissez de r??v??ler "
         "(ou avez d??j?? r??v??l??) votre identit??, vous soignez toutes vos Blessures."),
        ("B??n??diction", False,
         "Choisissez un joueur autre que vous m??me et lancez le d?? ?? 6 faces. "
         "Ce joueur gu??rit d'autant de Blessures que le r??sultat du d??."),
        ("Crucifix en argent", True,
         "Si vous attaquez et tuez un autre personnage, vous r??cup??rez toutes ses cartes ??quipements."),
        ("Toge sainte", True,
         "Vos attaques infligent 1 Blessure en moins, et les Blessures que vous subissez sont r??duites de 1."),
        ("Lance de Longinus", True,
         "Si vous ??tes un Hunter, et que votre identit?? est r??v??l??e, chaque fois qu'une de vos attaque inflige des "
         "Blessures, vous infligez 2 Blessures suppl??mentaires."),
        ("Amulette", True,
         "Vous ne subissez aucune Blessure caus??e par les cartes T??n??bres : "
         "Araign??e sanguinaire, Dynamite ou Chauve-souris vampire."),
        ("Broche de chance", True,
         "Un joueur dans la For??t hant??e ne peut pas utiliser le pouvoir du Lieu pour vous infliger des Blessures "
         "(mais il peut toujours vous gu??rir)."),
        ("Boussole mystique", True,
         "Quand vous vous d??placez, vous pouvez lancer 2 fois les d??s, et choisir quel r??sultat utiliser."),
    ]

    COLOR = (255, 255, 255)

    def __init__(self, nw_position, game_instance):
        """
        Args:
            nw_position (Tuple[float, float])
        """
        super().__init__(nw_position, game_instance)
        self.card_back.fill(self.COLOR)

    def draw(self, i_card, i_player):
        """
        Args:
            i_card (int)
            i_player (int)

        Returns:
            None
        """
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


TYPES = [CardBlack, CardVision, CardWhite]
