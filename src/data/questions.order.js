// Questions de classement : ordonner 4 propositions selon un critère.
// `items` est TOUJOURS dans le BON ordre — l'affichage les mélange.
// `hint` décrit le sens du classement (ex : "du plus ancien au plus récent").
// type:'order' est ajouté automatiquement dans questions.js
export const ORDER_QUESTIONS = [

  // ── HISTOIRE (chronologie) ────────────────────────
  { id: 'ord_h1', theme: 'histoire', difficulty: 1, q: "Classe ces événements du plus ancien au plus récent", hint: "Plus ancien → plus récent",
    items: ["Préhistoire", "Antiquité", "Moyen Âge", "Renaissance"] },
  { id: 'ord_h2', theme: 'histoire', difficulty: 2, q: "Classe ces événements du plus ancien au plus récent", hint: "Plus ancien → plus récent",
    items: ["Révolution française", "Première Guerre mondiale", "Chute du mur de Berlin", "Attentats du 11 septembre"] },
  { id: 'ord_h3', theme: 'histoire', difficulty: 2, q: "Classe ces rois de France du plus ancien au plus récent", hint: "Plus ancien → plus récent",
    items: ["Clovis", "Charlemagne", "Louis XIV", "Louis XVI"] },
  { id: 'ord_h4', theme: 'histoire', difficulty: 3, q: "Classe ces inventions de la plus ancienne à la plus récente", hint: "Plus ancienne → plus récente",
    items: ["L'imprimerie", "La machine à vapeur", "Le téléphone", "Internet"] },
  { id: 'ord_h5', theme: 'histoire', difficulty: 2, q: "Classe ces conflits du plus ancien au plus récent", hint: "Plus ancien → plus récent",
    items: ["Guerre de Cent Ans", "Révolution américaine", "Guerre de Sécession", "Guerre du Vietnam"] },
  { id: 'ord_h6', theme: 'histoire', difficulty: 3, q: "Classe ces civilisations de la plus ancienne à la plus récente", hint: "Plus ancienne → plus récente",
    items: ["Sumer", "Égypte antique", "Empire romain", "Empire byzantin"] },

  // ── GÉOGRAPHIE (taille, population, hauteur) ───────
  { id: 'ord_g1', theme: 'geographie', difficulty: 2, q: "Classe ces pays du plus grand au plus petit (superficie)", hint: "Plus grand → plus petit",
    items: ["Russie", "Canada", "France", "Belgique"] },
  { id: 'ord_g2', theme: 'geographie', difficulty: 2, q: "Classe ces villes de la plus peuplée à la moins peuplée", hint: "Plus peuplée → moins peuplée",
    items: ["Tokyo", "Paris", "Lyon", "Annecy"] },
  { id: 'ord_g3', theme: 'geographie', difficulty: 3, q: "Classe ces montagnes de la plus haute à la plus basse", hint: "Plus haute → plus basse",
    items: ["Everest", "Mont Blanc", "Mont Fuji", "Tour Eiffel"] },
  { id: 'ord_g4', theme: 'geographie', difficulty: 2, q: "Classe ces fleuves du plus long au plus court", hint: "Plus long → plus court",
    items: ["Nil", "Amazone", "Loire", "Seine"] },
  { id: 'ord_g5', theme: 'geographie', difficulty: 1, q: "Classe ces étendues d'eau de la plus grande à la plus petite", hint: "Plus grande → plus petite",
    items: ["Océan Pacifique", "Mer Méditerranée", "Lac Léman", "Étang"] },
  { id: 'ord_g6', theme: 'geographie', difficulty: 3, q: "Classe ces pays du plus peuplé au moins peuplé", hint: "Plus peuplé → moins peuplé",
    items: ["Inde", "États-Unis", "France", "Islande"] },

  // ── SCIENCES (taille, distance, vitesse) ──────────
  { id: 'ord_s1', theme: 'sciences', difficulty: 2, q: "Classe ces planètes de la plus proche du Soleil à la plus éloignée", hint: "Plus proche → plus éloignée",
    items: ["Mercure", "Terre", "Jupiter", "Neptune"] },
  { id: 'ord_s2', theme: 'sciences', difficulty: 1, q: "Classe ces objets du plus petit au plus grand", hint: "Plus petit → plus grand",
    items: ["Atome", "Cellule", "Fourmi", "Humain"] },
  { id: 'ord_s3', theme: 'sciences', difficulty: 2, q: "Classe ces animaux du plus rapide au plus lent", hint: "Plus rapide → plus lent",
    items: ["Guépard", "Cheval", "Humain", "Tortue"] },
  { id: 'ord_s4', theme: 'sciences', difficulty: 3, q: "Classe ces planètes de la plus grande à la plus petite", hint: "Plus grande → plus petite",
    items: ["Jupiter", "Saturne", "Terre", "Mars"] },
  { id: 'ord_s5', theme: 'sciences', difficulty: 2, q: "Classe ces unités de longueur de la plus petite à la plus grande", hint: "Plus petite → plus grande",
    items: ["Millimètre", "Centimètre", "Mètre", "Kilomètre"] },
  { id: 'ord_s6', theme: 'sciences', difficulty: 3, q: "Classe ces animaux du plus lourd au plus léger", hint: "Plus lourd → plus léger",
    items: ["Baleine bleue", "Éléphant", "Cheval", "Chat"] },

  // ── SPORT ─────────────────────────────────────────
  { id: 'ord_sp1', theme: 'sport', difficulty: 2, q: "Classe ces distances de course de la plus courte à la plus longue", hint: "Plus courte → plus longue",
    items: ["100 mètres", "1 500 mètres", "10 000 mètres", "Marathon"] },
  { id: 'ord_sp2', theme: 'sport', difficulty: 2, q: "Classe ces pays hôtes de Coupe du Monde de football de la plus ancienne à la plus récente", hint: "Plus ancienne → plus récente",
    items: ["France", "Allemagne", "Brésil", "Qatar"] },
  { id: 'ord_sp3', theme: 'sport', difficulty: 1, q: "Classe ces médailles de la plus prestigieuse à la moins prestigieuse", hint: "Plus prestigieuse → moins prestigieuse",
    items: ["Or", "Argent", "Bronze", "Aucune"] },
  { id: 'ord_sp4', theme: 'sport', difficulty: 3, q: "Classe ces sports par nombre de joueurs sur le terrain (du plus au moins)", hint: "Plus de joueurs → moins",
    items: ["Rugby à XV", "Football", "Basket-ball", "Tennis (simple)"] },

  // ── MUSIQUE ───────────────────────────────────────
  { id: 'ord_m1', theme: 'musique', difficulty: 3, q: "Classe ces genres musicaux du plus ancien au plus récent", hint: "Plus ancien → plus récent",
    items: ["Musique classique", "Jazz", "Rock", "Rap"] },
  { id: 'ord_m2', theme: 'musique', difficulty: 2, q: "Classe ces instruments du plus grave au plus aigu", hint: "Plus grave → plus aigu",
    items: ["Contrebasse", "Violoncelle", "Alto", "Violon"] },
  { id: 'ord_m3', theme: 'musique', difficulty: 2, q: "Classe ces albums des Beatles du plus ancien au plus récent", hint: "Plus ancien → plus récent",
    items: ["Please Please Me", "Help!", "Sgt. Pepper's", "Abbey Road"] },

  // ── CINÉMA ────────────────────────────────────────
  { id: 'ord_c1', theme: 'cinema', difficulty: 2, q: "Classe ces films Star Wars dans l'ordre de sortie au cinéma", hint: "Plus ancien → plus récent",
    items: ["Un nouvel espoir", "Le Retour du Jedi", "La Menace fantôme", "Le Réveil de la Force"] },
  { id: 'ord_c2', theme: 'cinema', difficulty: 3, q: "Classe ces films du Seigneur des Anneaux dans l'ordre de l'histoire", hint: "Début → fin",
    items: ["La Communauté de l'Anneau", "Les Deux Tours", "Le Retour du Roi", "(fin)"] },
  { id: 'ord_c3', theme: 'cinema', difficulty: 2, q: "Classe ces réalisateurs du plus ancien au plus récent (naissance)", hint: "Plus ancien → plus récent",
    items: ["Alfred Hitchcock", "Steven Spielberg", "Quentin Tarantino", "Christopher Nolan"] },

  // ── LITTÉRATURE ───────────────────────────────────
  { id: 'ord_l1', theme: 'litterature', difficulty: 3, q: "Classe ces auteurs du plus ancien au plus récent", hint: "Plus ancien → plus récent",
    items: ["Molière", "Victor Hugo", "Marcel Proust", "J.K. Rowling"] },
  { id: 'ord_l2', theme: 'litterature', difficulty: 2, q: "Classe ces tomes de Harry Potter dans l'ordre de l'histoire", hint: "Début → fin",
    items: ["À l'école des sorciers", "La Chambre des secrets", "Le Prisonnier d'Azkaban", "La Coupe de feu"] },

  // ── ARTS ──────────────────────────────────────────
  { id: 'ord_a1', theme: 'arts', difficulty: 3, q: "Classe ces mouvements artistiques du plus ancien au plus récent", hint: "Plus ancien → plus récent",
    items: ["Renaissance", "Impressionnisme", "Cubisme", "Pop Art"] },
  { id: 'ord_a2', theme: 'arts', difficulty: 2, q: "Classe ces monuments du plus ancien au plus récent", hint: "Plus ancien → plus récent",
    items: ["Pyramides de Gizeh", "Colisée", "Tour Eiffel", "Burj Khalifa"] },

  // ── TV / CULTURE POP ──────────────────────────────
  { id: 'ord_tv1', theme: 'tv', difficulty: 2, q: "Classe ces réseaux sociaux du plus ancien au plus récent", hint: "Plus ancien → plus récent",
    items: ["Facebook", "Instagram", "Snapchat", "TikTok"] },
  { id: 'ord_tv2', theme: 'tv', difficulty: 1, q: "Classe ces consoles de jeux de la plus ancienne à la plus récente", hint: "Plus ancienne → plus récente",
    items: ["Game Boy", "PlayStation 2", "Wii", "PlayStation 5"] },

  // ── SOCIÉTÉ ───────────────────────────────────────
  { id: 'ord_so1', theme: 'societe', difficulty: 2, q: "Classe ces inventions technologiques de la plus ancienne à la plus récente", hint: "Plus ancienne → plus récente",
    items: ["Téléphone fixe", "Télévision", "Téléphone portable", "Smartphone"] },
  { id: 'ord_so2', theme: 'societe', difficulty: 1, q: "Classe ces grades de l'école du plus bas au plus élevé", hint: "Plus bas → plus élevé",
    items: ["Maternelle", "Primaire", "Collège", "Lycée"] },
  { id: 'ord_so3', theme: 'societe', difficulty: 3, q: "Classe ces présidents français du plus ancien au plus récent", hint: "Plus ancien → plus récent",
    items: ["Charles de Gaulle", "François Mitterrand", "Jacques Chirac", "Emmanuel Macron"] },
]
