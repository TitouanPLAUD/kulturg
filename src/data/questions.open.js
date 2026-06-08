// Questions à réponse libre (l'utilisateur tape la réponse).
// Format : { id, theme, difficulty (1-3), q, answer (référence), accepts? (variantes), explain? }
// La tolérance gère déjà : accents, majuscules, articles, pluriels, féminin, fautes mineures.
// `accepts` n'est utile que pour des synonymes ou variantes non couvertes par les règles.
export const OPEN_QUESTIONS = [

  // ── HISTOIRE ──────────────────────────────────────
  { id: 'oh1',  theme: 'histoire', difficulty: 1, q: "Quel roi de France est surnommé « le Roi-Soleil » ?", answer: "Louis XIV", accepts: ["Louis 14", "louis quatorze"] },
  { id: 'oh2',  theme: 'histoire', difficulty: 1, q: "En quelle année a eu lieu la prise de la Bastille ?", answer: "1789" },
  { id: 'oh3',  theme: 'histoire', difficulty: 2, q: "Qui a peint la Joconde ?", answer: "Léonard de Vinci", accepts: ["Leonard de Vinci", "Da Vinci", "Vinci"] },
  { id: 'oh4',  theme: 'histoire', difficulty: 2, q: "Quel empereur romain a fait construire le Colisée ?", answer: "Vespasien", accepts: ["Titus"] },
  { id: 'oh5',  theme: 'histoire', difficulty: 1, q: "Qui a découvert l'Amérique en 1492 ?", answer: "Christophe Colomb", accepts: ["Colomb"] },
  { id: 'oh6',  theme: 'histoire', difficulty: 2, q: "Quelle reine a été décapitée en 1793 ?", answer: "Marie-Antoinette", accepts: ["Marie Antoinette"] },
  { id: 'oh7',  theme: 'histoire', difficulty: 2, q: "Qui a signé l'appel du 18 juin 1940 ?", answer: "Charles de Gaulle", accepts: ["De Gaulle"] },
  { id: 'oh8',  theme: 'histoire', difficulty: 3, q: "Quel pharaon a fait construire la grande pyramide de Gizeh ?", answer: "Khéops", accepts: ["Kheops", "Khoufou"] },
  { id: 'oh9',  theme: 'histoire', difficulty: 1, q: "En quelle année est tombé le mur de Berlin ?", answer: "1989" },
  { id: 'oh10', theme: 'histoire', difficulty: 2, q: "Quelle bataille marque la défaite définitive de Napoléon en 1815 ?", answer: "Waterloo" },

  // ── GÉOGRAPHIE ───────────────────────────────────
  { id: 'og1',  theme: 'geographie', difficulty: 1, q: "Quelle est la capitale de l'Australie ?", answer: "Canberra" },
  { id: 'og2',  theme: 'geographie', difficulty: 1, q: "Quel est le plus long fleuve du monde ?", answer: "Nil", accepts: ["le Nil"] },
  { id: 'og3',  theme: 'geographie', difficulty: 2, q: "Dans quel pays se trouve le Machu Picchu ?", answer: "Pérou", accepts: ["Perou"] },
  { id: 'og4',  theme: 'geographie', difficulty: 1, q: "Quelle est la capitale du Japon ?", answer: "Tokyo", accepts: ["Tôkyô"] },
  { id: 'og5',  theme: 'geographie', difficulty: 2, q: "Quel océan borde la côte ouest des États-Unis ?", answer: "Pacifique", accepts: ["océan Pacifique"] },
  { id: 'og6',  theme: 'geographie', difficulty: 2, q: "Quel est le plus haut sommet du monde ?", answer: "Everest", accepts: ["mont Everest"] },
  { id: 'og7',  theme: 'geographie', difficulty: 1, q: "Quelle est la capitale de l'Espagne ?", answer: "Madrid" },
  { id: 'og8',  theme: 'geographie', difficulty: 3, q: "Quel pays a la plus grande superficie au monde ?", answer: "Russie" },
  { id: 'og9',  theme: 'geographie', difficulty: 2, q: "Sur quel continent se trouve le désert du Sahara ?", answer: "Afrique" },
  { id: 'og10', theme: 'geographie', difficulty: 1, q: "Quelle est la capitale de l'Italie ?", answer: "Rome" },
  { id: 'og11', theme: 'geographie', difficulty: 2, q: "Quel pays a pour drapeau une feuille d'érable ?", answer: "Canada" },
  { id: 'og12', theme: 'geographie', difficulty: 3, q: "Quelle est la capitale du Brésil ?", answer: "Brasília", accepts: ["Brasilia"] },

  // ── SCIENCES ─────────────────────────────────────
  { id: 'os1',  theme: 'sciences', difficulty: 1, q: "Quel est le symbole chimique de l'or ?", answer: "Au" },
  { id: 'os2',  theme: 'sciences', difficulty: 1, q: "Combien y a-t-il de planètes dans le système solaire ?", answer: "8", accepts: ["huit"] },
  { id: 'os3',  theme: 'sciences', difficulty: 2, q: "Qui a formulé la théorie de la relativité ?", answer: "Einstein", accepts: ["Albert Einstein"] },
  { id: 'os4',  theme: 'sciences', difficulty: 1, q: "Quel organe pompe le sang dans le corps humain ?", answer: "Cœur", accepts: ["coeur"] },
  { id: 'os5',  theme: 'sciences', difficulty: 2, q: "Quel gaz les plantes absorbent-elles pour la photosynthèse ?", answer: "Dioxyde de carbone", accepts: ["CO2", "CO₂", "gaz carbonique"] },
  { id: 'os6',  theme: 'sciences', difficulty: 1, q: "Quelle est la planète la plus proche du Soleil ?", answer: "Mercure" },
  { id: 'os7',  theme: 'sciences', difficulty: 2, q: "Quel scientifique a découvert la pénicilline ?", answer: "Alexander Fleming", accepts: ["Fleming"] },
  { id: 'os8',  theme: 'sciences', difficulty: 3, q: "Combien d'os possède le squelette humain adulte ?", answer: "206" },
  { id: 'os9',  theme: 'sciences', difficulty: 2, q: "Quelle planète est surnommée « la planète rouge » ?", answer: "Mars" },
  { id: 'os10', theme: 'sciences', difficulty: 1, q: "Quel est le symbole chimique de l'eau ?", answer: "H2O", accepts: ["H₂O"] },
  { id: 'os11', theme: 'sciences', difficulty: 3, q: "Quelle est l'unité de mesure de la fréquence ?", answer: "Hertz", accepts: ["Hz"] },

  // ── SPORT ────────────────────────────────────────
  { id: 'osp1', theme: 'sport', difficulty: 1, q: "Combien de joueurs y a-t-il dans une équipe de football sur le terrain ?", answer: "11", accepts: ["onze"] },
  { id: 'osp2', theme: 'sport', difficulty: 1, q: "Quel pays a remporté la Coupe du Monde de football 2018 ?", answer: "France" },
  { id: 'osp3', theme: 'sport', difficulty: 2, q: "Sur quelle surface se joue Roland-Garros ?", answer: "terre battue" },
  { id: 'osp4', theme: 'sport', difficulty: 2, q: "Quel athlète jamaïcain détient le record du 100 m ?", answer: "Usain Bolt", accepts: ["Bolt"] },
  { id: 'osp5', theme: 'sport', difficulty: 1, q: "Quel sport pratique Roger Federer ?", answer: "Tennis" },
  { id: 'osp6', theme: 'sport', difficulty: 2, q: "Combien de joueurs dans une équipe de basket sur le terrain ?", answer: "5", accepts: ["cinq"] },
  { id: 'osp7', theme: 'sport', difficulty: 2, q: "Dans quel pays sont nés les Jeux Olympiques ?", answer: "Grèce", accepts: ["Grece"] },
  { id: 'osp8', theme: 'sport', difficulty: 3, q: "Combien de trous compte un parcours de golf standard ?", answer: "18", accepts: ["dix-huit"] },
  { id: 'osp9', theme: 'sport', difficulty: 1, q: "Quel sport pratique Tony Parker ?", answer: "Basket", accepts: ["Basketball"] },
  { id: 'osp10', theme: 'sport', difficulty: 2, q: "Combien de Ballons d'Or a Lionel Messi (en 2024) ?", answer: "8", accepts: ["huit"] },

  // ── MUSIQUE ──────────────────────────────────────
  { id: 'om1',  theme: 'musique', difficulty: 1, q: "Quel groupe britannique a sorti l'album « Abbey Road » ?", answer: "Beatles", accepts: ["The Beatles", "les Beatles"] },
  { id: 'om2',  theme: 'musique', difficulty: 2, q: "Qui a composé la « Symphonie n°9 » ?", answer: "Beethoven", accepts: ["Ludwig van Beethoven"] },
  { id: 'om3',  theme: 'musique', difficulty: 1, q: "Quel chanteur français a interprété « La Bohème » ?", answer: "Charles Aznavour", accepts: ["Aznavour"] },
  { id: 'om4',  theme: 'musique', difficulty: 2, q: "Quelle chanteuse interprète « Hello » sorti en 2015 ?", answer: "Adele" },
  { id: 'om5',  theme: 'musique', difficulty: 1, q: "Quel instrument joue principalement Jimi Hendrix ?", answer: "Guitare" },
  { id: 'om6',  theme: 'musique', difficulty: 2, q: "Quel groupe a chanté « Bohemian Rhapsody » ?", answer: "Queen" },
  { id: 'om7',  theme: 'musique', difficulty: 3, q: "Quel compositeur autrichien est l'auteur du « Requiem » ?", answer: "Mozart", accepts: ["Wolfgang Amadeus Mozart"] },
  { id: 'om8',  theme: 'musique', difficulty: 2, q: "Quel rappeur français a sorti l'album « Mauvais Sang » ?", answer: "Bigflo et Oli", accepts: ["Bigflo & Oli", "Bigflo"] },
  { id: 'om9',  theme: 'musique', difficulty: 1, q: "Quelle chanteuse interprète « Toxic » ?", answer: "Britney Spears", accepts: ["Britney"] },
  { id: 'om10', theme: 'musique', difficulty: 2, q: "Quel rappeur a sorti l'album « Damso » nommé « Lithopédion » ?", answer: "Damso" },

  // ── CINÉMA ───────────────────────────────────────
  { id: 'oc1',  theme: 'cinema', difficulty: 1, q: "Qui a réalisé « Titanic » et « Avatar » ?", answer: "James Cameron", accepts: ["Cameron"] },
  { id: 'oc2',  theme: 'cinema', difficulty: 2, q: "Quel acteur joue Jack dans « Titanic » ?", answer: "Leonardo DiCaprio", accepts: ["DiCaprio", "Leo DiCaprio"] },
  { id: 'oc3',  theme: 'cinema', difficulty: 1, q: "Qui est le créateur de Mickey Mouse ?", answer: "Walt Disney", accepts: ["Disney"] },
  { id: 'oc4',  theme: 'cinema', difficulty: 2, q: "Dans quel film entend-on « Que la Force soit avec toi » ?", answer: "Star Wars" },
  { id: 'oc5',  theme: 'cinema', difficulty: 1, q: "Quel acteur a joué James Bond pendant les années 60 ?", answer: "Sean Connery", accepts: ["Connery"] },
  { id: 'oc6',  theme: 'cinema', difficulty: 2, q: "Quel réalisateur français a tourné « Le Fabuleux Destin d'Amélie Poulain » ?", answer: "Jean-Pierre Jeunet", accepts: ["Jeunet"] },
  { id: 'oc7',  theme: 'cinema', difficulty: 3, q: "Quel film a remporté l'Oscar du meilleur film en 2020 ?", answer: "Parasite" },
  { id: 'oc8',  theme: 'cinema', difficulty: 2, q: "Quel acteur français a joué dans « Intouchables » ?", answer: "Omar Sy", accepts: ["Omar"] },
  { id: 'oc9',  theme: 'cinema', difficulty: 1, q: "Comment s'appelle le sorcier créé par J.K. Rowling ?", answer: "Harry Potter", accepts: ["Harry"] },
  { id: 'oc10', theme: 'cinema', difficulty: 2, q: "Quelle saga met en scène Frodon et l'Anneau Unique ?", answer: "Le Seigneur des Anneaux", accepts: ["Seigneur des Anneaux", "LOTR", "Lord of the Rings"] },

  // ── LITTÉRATURE ──────────────────────────────────
  { id: 'ol1',  theme: 'litterature', difficulty: 1, q: "Qui a écrit « Les Misérables » ?", answer: "Victor Hugo", accepts: ["Hugo"] },
  { id: 'ol2',  theme: 'litterature', difficulty: 2, q: "Quel auteur a écrit « Le Petit Prince » ?", answer: "Saint-Exupéry", accepts: ["Antoine de Saint-Exupéry", "Saint Exupéry"] },
  { id: 'ol3',  theme: 'litterature', difficulty: 2, q: "Qui a écrit « 1984 » ?", answer: "George Orwell", accepts: ["Orwell"] },
  { id: 'ol4',  theme: 'litterature', difficulty: 1, q: "Qui a écrit « Roméo et Juliette » ?", answer: "Shakespeare", accepts: ["William Shakespeare"] },
  { id: 'ol5',  theme: 'litterature', difficulty: 3, q: "Quel auteur français a écrit « À la recherche du temps perdu » ?", answer: "Marcel Proust", accepts: ["Proust"] },
  { id: 'ol6',  theme: 'litterature', difficulty: 2, q: "Quel auteur a créé Sherlock Holmes ?", answer: "Arthur Conan Doyle", accepts: ["Conan Doyle", "Doyle"] },
  { id: 'ol7',  theme: 'litterature', difficulty: 1, q: "Quel auteur a écrit la saga « Harry Potter » ?", answer: "J.K. Rowling", accepts: ["JK Rowling", "Rowling"] },
  { id: 'ol8',  theme: 'litterature', difficulty: 2, q: "Qui a écrit « Madame Bovary » ?", answer: "Flaubert", accepts: ["Gustave Flaubert"] },

  // ── ARTS ─────────────────────────────────────────
  { id: 'oa1',  theme: 'arts', difficulty: 1, q: "Qui a peint « La Nuit étoilée » ?", answer: "Van Gogh", accepts: ["Vincent Van Gogh"] },
  { id: 'oa2',  theme: 'arts', difficulty: 2, q: "Quel peintre espagnol est célèbre pour ses œuvres cubistes ?", answer: "Picasso", accepts: ["Pablo Picasso"] },
  { id: 'oa3',  theme: 'arts', difficulty: 1, q: "Dans quel musée parisien se trouve la Joconde ?", answer: "Louvre", accepts: ["le Louvre", "musée du Louvre"] },
  { id: 'oa4',  theme: 'arts', difficulty: 2, q: "Quel sculpteur français a créé « Le Penseur » ?", answer: "Rodin", accepts: ["Auguste Rodin"] },
  { id: 'oa5',  theme: 'arts', difficulty: 3, q: "Quel artiste néerlandais est célèbre pour ses tournesols ?", answer: "Van Gogh", accepts: ["Vincent Van Gogh"] },
  { id: 'oa6',  theme: 'arts', difficulty: 2, q: "Quel peintre est l'auteur de « La Persistance de la mémoire » (les montres molles) ?", answer: "Dalí", accepts: ["Salvador Dalí", "Dali", "Salvador Dali"] },

  // ── TV / CULTURE POP ────────────────────────────
  { id: 'otv1', theme: 'tv', difficulty: 1, q: "Comment s'appelle le présentateur des « 12 Coups de Midi » ?", answer: "Jean-Luc Reichmann", accepts: ["Reichmann", "Jean Luc Reichmann"] },
  { id: 'otv2', theme: 'tv', difficulty: 2, q: "Dans quelle série Walter White est-il le personnage principal ?", answer: "Breaking Bad" },
  { id: 'otv3', theme: 'tv', difficulty: 1, q: "Quel personnage est interprété par Omar Sy dans la série Netflix ?", answer: "Lupin", accepts: ["Arsène Lupin"] },
  { id: 'otv4', theme: 'tv', difficulty: 2, q: "Comment s'appelle l'auberge dans la série « Kaamelott » ?", answer: "Kaamelott" },
  { id: 'otv5', theme: 'tv', difficulty: 1, q: "Quelle série espagnole raconte un braquage de la Maison de la Monnaie ?", answer: "La Casa de Papel", accepts: ["Casa de Papel", "Money Heist"] },
  { id: 'otv6', theme: 'tv', difficulty: 2, q: "Comment s'appelle le dragon de Daenerys dans « Game of Thrones » ?", answer: "Drogon" },

  // ── SOCIÉTÉ ──────────────────────────────────────
  { id: 'oso1', theme: 'societe', difficulty: 1, q: "Quelle est la monnaie utilisée en France ?", answer: "Euro" },
  { id: 'oso2', theme: 'societe', difficulty: 2, q: "Quel président américain a été élu en 2008 ?", answer: "Barack Obama", accepts: ["Obama"] },
  { id: 'oso3', theme: 'societe', difficulty: 1, q: "Quelle est la langue officielle du Brésil ?", answer: "Portugais" },
  { id: 'oso4', theme: 'societe', difficulty: 2, q: "Quelle organisation internationale a son siège à Bruxelles ?", answer: "OTAN", accepts: ["Union européenne", "UE"] },
  { id: 'oso5', theme: 'societe', difficulty: 1, q: "Quel réseau social est représenté par un oiseau bleu ?", answer: "Twitter", accepts: ["X"] },
  { id: 'oso6', theme: 'societe', difficulty: 2, q: "Quel milliardaire dirige Tesla et SpaceX ?", answer: "Elon Musk", accepts: ["Musk"] },
  { id: 'oso7', theme: 'societe', difficulty: 1, q: "Quelle est la capitale de la France ?", answer: "Paris" },
  { id: 'oso8', theme: 'societe', difficulty: 3, q: "En quelle année l'euro est-il devenu la monnaie unique européenne en pièces et billets ?", answer: "2002" },
]
