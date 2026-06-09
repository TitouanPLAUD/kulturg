import { EXTRA } from './questions.extra.js'
import { BULK } from './questions.bulk.js'
import { MORE } from './questions.more.js'
import { NEW } from './questions.new.js'
import { OPEN_QUESTIONS } from './questions.open.js'
import { ORDER_QUESTIONS } from './questions.order.js'
import { COMMUNITY } from './questions.community.js'

// Les questions communautaires gardent leur type ('open'/'order') si défini, sinon QCM
const COMMUNITY_TAGGED = COMMUNITY.map(q => q.type ? { ...q } : q)

// Marque les questions à réponse libre / classement
const OPEN_TAGGED  = OPEN_QUESTIONS.map(q => ({ ...q, type: 'open' }))
const ORDER_TAGGED = ORDER_QUESTIONS.map(q => ({ ...q, type: 'order' }))

// Détecteurs de type
export const isOpenQuestion  = (q) => q?.type === 'open'
export const isOrderQuestion = (q) => q?.type === 'order'
export const isMcqQuestion   = (q) => !q?.type && Array.isArray(q?.choices)

// Banque de questions — format: { id, theme, difficulty (1-3), q, choices: [a,b,c,d], answer (index), explain? }
// "answer" est l'index dans choices.

const BASE = [
  // ============ HISTOIRE ============
  { id: 'h1', theme: 'histoire', difficulty: 1, q: "En quelle année a eu lieu la prise de la Bastille ?", choices: ["1769", "1789", "1799", "1815"], answer: 1, explain: "Le 14 juillet 1789." },
  { id: 'h2', theme: 'histoire', difficulty: 1, q: "Qui était le premier empereur des Français ?", choices: ["Louis XIV", "Charlemagne", "Napoléon Ier", "Napoléon III"], answer: 2 },
  { id: 'h3', theme: 'histoire', difficulty: 1, q: "Quelle guerre s'est terminée en 1918 ?", choices: ["Guerre de Sécession", "Première Guerre mondiale", "Seconde Guerre mondiale", "Guerre de Cent Ans"], answer: 1 },
  { id: 'h4', theme: 'histoire', difficulty: 2, q: "Qui a découvert l'Amérique en 1492 ?", choices: ["Vasco de Gama", "Magellan", "Christophe Colomb", "Amerigo Vespucci"], answer: 2 },
  { id: 'h5', theme: 'histoire', difficulty: 2, q: "Quel roi de France était surnommé « le Roi-Soleil » ?", choices: ["Louis XIII", "Louis XIV", "Louis XV", "Louis XVI"], answer: 1 },
  { id: 'h6', theme: 'histoire', difficulty: 2, q: "Quelle bataille marque la fin de Napoléon en 1815 ?", choices: ["Austerlitz", "Iéna", "Waterloo", "Marengo"], answer: 2 },
  { id: 'h7', theme: 'histoire', difficulty: 2, q: "Qui a écrit le « Manifeste du Parti communiste » avec Engels ?", choices: ["Lénine", "Marx", "Trotski", "Staline"], answer: 1 },
  { id: 'h8', theme: 'histoire', difficulty: 1, q: "En quelle année le mur de Berlin est-il tombé ?", choices: ["1985", "1989", "1991", "1993"], answer: 1 },
  { id: 'h9', theme: 'histoire', difficulty: 3, q: "Quel traité met fin à la guerre de Trente Ans en 1648 ?", choices: ["Traité de Versailles", "Paix d'Utrecht", "Traité des Pyrénées", "Traités de Westphalie"], answer: 3 },
  { id: 'h10', theme: 'histoire', difficulty: 2, q: "Qui était président des États-Unis lors de l'abolition de l'esclavage ?", choices: ["Washington", "Jefferson", "Lincoln", "Roosevelt"], answer: 2 },
  { id: 'h11', theme: 'histoire', difficulty: 3, q: "Quelle dynastie a régné en Chine de 1368 à 1644 ?", choices: ["Tang", "Song", "Ming", "Qing"], answer: 2 },
  { id: 'h12', theme: 'histoire', difficulty: 2, q: "Vercingétorix a été vaincu à quelle bataille ?", choices: ["Gergovie", "Alésia", "Bibracte", "Lugdunum"], answer: 1 },
  { id: 'h13', theme: 'histoire', difficulty: 1, q: "Qui a peint le plafond de la chapelle Sixtine ?", choices: ["Léonard de Vinci", "Raphaël", "Michel-Ange", "Botticelli"], answer: 2 },
  { id: 'h14', theme: 'histoire', difficulty: 2, q: "En quelle année Jeanne d'Arc a-t-elle été brûlée ?", choices: ["1429", "1431", "1453", "1492"], answer: 1 },
  { id: 'h15', theme: 'histoire', difficulty: 3, q: "Quel pharaon a fait construire la grande pyramide de Gizeh ?", choices: ["Toutânkhamon", "Ramsès II", "Khéops", "Akhenaton"], answer: 2 },
  { id: 'h16', theme: 'histoire', difficulty: 2, q: "Quand débute la Révolution russe ?", choices: ["1905", "1917", "1922", "1924"], answer: 1 },
  { id: 'h17', theme: 'histoire', difficulty: 1, q: "Qui a prononcé l'appel du 18 juin 1940 ?", choices: ["Pétain", "Clemenceau", "De Gaulle", "Mendès France"], answer: 2 },
  { id: 'h18', theme: 'histoire', difficulty: 3, q: "Quelle reine d'Angleterre a régné de 1558 à 1603 ?", choices: ["Marie Ire", "Élisabeth Ire", "Anne", "Victoria"], answer: 1 },
  { id: 'h19', theme: 'histoire', difficulty: 2, q: "Quel événement a déclenché la Première Guerre mondiale ?", choices: ["Assassinat de François-Ferdinand", "Invasion de la Pologne", "Crise de Cuba", "Attentat de Sarajevo (1908)"], answer: 0 },
  { id: 'h20', theme: 'histoire', difficulty: 3, q: "Qui a fondé l'Empire mongol ?", choices: ["Kubilai Khan", "Tamerlan", "Gengis Khan", "Attila"], answer: 2 },

  // ============ GÉOGRAPHIE ============
  { id: 'g1', theme: 'geographie', difficulty: 1, q: "Quelle est la capitale de l'Australie ?", choices: ["Sydney", "Melbourne", "Canberra", "Perth"], answer: 2 },
  { id: 'g2', theme: 'geographie', difficulty: 1, q: "Quel est le plus long fleuve du monde ?", choices: ["Amazone", "Nil", "Yangtsé", "Mississippi"], answer: 1, explain: "Le Nil mesure environ 6 650 km." },
  { id: 'g3', theme: 'geographie', difficulty: 1, q: "Quel pays a la forme d'une botte ?", choices: ["Espagne", "Grèce", "Italie", "Portugal"], answer: 2 },
  { id: 'g4', theme: 'geographie', difficulty: 2, q: "Combien y a-t-il de continents ?", choices: ["5", "6", "7", "Cela dépend des conventions"], answer: 3 },
  { id: 'g5', theme: 'geographie', difficulty: 2, q: "Quelle est la capitale du Canada ?", choices: ["Toronto", "Montréal", "Ottawa", "Vancouver"], answer: 2 },
  { id: 'g6', theme: 'geographie', difficulty: 1, q: "Quel océan borde la côte ouest des États-Unis ?", choices: ["Atlantique", "Pacifique", "Indien", "Arctique"], answer: 1 },
  { id: 'g7', theme: 'geographie', difficulty: 2, q: "Quel est le plus grand désert chaud du monde ?", choices: ["Gobi", "Kalahari", "Sahara", "Atacama"], answer: 2 },
  { id: 'g8', theme: 'geographie', difficulty: 3, q: "Quel détroit sépare l'Espagne du Maroc ?", choices: ["Bosphore", "Gibraltar", "Ormuz", "Malacca"], answer: 1 },
  { id: 'g9', theme: 'geographie', difficulty: 2, q: "Quelle chaîne de montagnes traverse l'Amérique du Sud ?", choices: ["Rocheuses", "Alpes", "Andes", "Himalaya"], answer: 2 },
  { id: 'g10', theme: 'geographie', difficulty: 1, q: "Quelle est la capitale du Japon ?", choices: ["Kyoto", "Osaka", "Tokyo", "Sapporo"], answer: 2 },
  { id: 'g11', theme: 'geographie', difficulty: 3, q: "Quel pays compte le plus de fuseaux horaires ?", choices: ["États-Unis", "Russie", "France", "Chine"], answer: 2, explain: "Avec ses territoires d'outre-mer, la France couvre 12 fuseaux." },
  { id: 'g12', theme: 'geographie', difficulty: 2, q: "Quel pays a pour capitale Helsinki ?", choices: ["Suède", "Norvège", "Finlande", "Estonie"], answer: 2 },
  { id: 'g13', theme: 'geographie', difficulty: 2, q: "Quelle est la plus grande île du monde ?", choices: ["Madagascar", "Bornéo", "Groenland", "Nouvelle-Guinée"], answer: 2 },
  { id: 'g14', theme: 'geographie', difficulty: 1, q: "Quel pays est le plus peuplé du monde en 2024 ?", choices: ["Chine", "Inde", "États-Unis", "Indonésie"], answer: 1 },
  { id: 'g15', theme: 'geographie', difficulty: 3, q: "Quel est le point culminant de l'Afrique ?", choices: ["Mont Kenya", "Kilimandjaro", "Ras Dashen", "Mont Elgon"], answer: 1 },
  { id: 'g16', theme: 'geographie', difficulty: 2, q: "La Loire se jette dans quel océan ?", choices: ["Manche", "Atlantique", "Méditerranée", "Mer du Nord"], answer: 1 },
  { id: 'g17', theme: 'geographie', difficulty: 2, q: "Quel pays a pour drapeau une feuille d'érable ?", choices: ["Canada", "Liban", "Norvège", "Mexique"], answer: 0 },
  { id: 'g18', theme: 'geographie', difficulty: 3, q: "Quelle ville est traversée par le Tage ?", choices: ["Madrid", "Lisbonne", "Séville", "Porto"], answer: 1 },
  { id: 'g19', theme: 'geographie', difficulty: 1, q: "Quel est le plus petit pays du monde ?", choices: ["Monaco", "Vatican", "Saint-Marin", "Liechtenstein"], answer: 1 },
  { id: 'g20', theme: 'geographie', difficulty: 2, q: "Quel pays partage la péninsule ibérique avec le Portugal ?", choices: ["France", "Espagne", "Italie", "Maroc"], answer: 1 },

  // ============ SCIENCES ============
  { id: 's1', theme: 'sciences', difficulty: 1, q: "Quel est le symbole chimique de l'or ?", choices: ["Or", "Au", "Ag", "Go"], answer: 1 },
  { id: 's2', theme: 'sciences', difficulty: 1, q: "Combien de planètes compte le système solaire ?", choices: ["7", "8", "9", "10"], answer: 1 },
  { id: 's3', theme: 'sciences', difficulty: 2, q: "Qui a formulé la théorie de la relativité ?", choices: ["Newton", "Einstein", "Hawking", "Bohr"], answer: 1 },
  { id: 's4', theme: 'sciences', difficulty: 1, q: "Quel organe pompe le sang dans le corps ?", choices: ["Foie", "Cerveau", "Cœur", "Rein"], answer: 2 },
  { id: 's5', theme: 'sciences', difficulty: 2, q: "Quelle est l'unité de la force dans le SI ?", choices: ["Joule", "Watt", "Newton", "Pascal"], answer: 2 },
  { id: 's6', theme: 'sciences', difficulty: 2, q: "Quel gaz les plantes absorbent-elles ?", choices: ["O₂", "CO₂", "N₂", "H₂"], answer: 1 },
  { id: 's7', theme: 'sciences', difficulty: 3, q: "Quelle est la vitesse de la lumière (approximative) ?", choices: ["150 000 km/s", "200 000 km/s", "300 000 km/s", "1 000 000 km/s"], answer: 2 },
  { id: 's8', theme: 'sciences', difficulty: 2, q: "Combien d'os possède un adulte humain ?", choices: ["186", "206", "256", "306"], answer: 1 },
  { id: 's9', theme: 'sciences', difficulty: 3, q: "Qui a découvert la pénicilline ?", choices: ["Pasteur", "Fleming", "Curie", "Koch"], answer: 1 },
  { id: 's10', theme: 'sciences', difficulty: 1, q: "Quelle est la planète la plus proche du Soleil ?", choices: ["Vénus", "Terre", "Mars", "Mercure"], answer: 3 },
  { id: 's11', theme: 'sciences', difficulty: 2, q: "Quel scientifique a énoncé la loi de la gravitation universelle ?", choices: ["Galilée", "Newton", "Kepler", "Copernic"], answer: 1 },
  { id: 's12', theme: 'sciences', difficulty: 3, q: "Quelle est la formule chimique du sel de table ?", choices: ["KCl", "NaCl", "CaCl₂", "MgCl₂"], answer: 1 },
  { id: 's13', theme: 'sciences', difficulty: 1, q: "À quelle température l'eau bout-elle au niveau de la mer ?", choices: ["90°C", "95°C", "100°C", "110°C"], answer: 2 },
  { id: 's14', theme: 'sciences', difficulty: 2, q: "Quel est l'élément le plus abondant dans l'univers ?", choices: ["Oxygène", "Hélium", "Hydrogène", "Carbone"], answer: 2 },
  { id: 's15', theme: 'sciences', difficulty: 3, q: "Quelle particule a une charge négative dans l'atome ?", choices: ["Proton", "Neutron", "Électron", "Photon"], answer: 2 },
  { id: 's16', theme: 'sciences', difficulty: 2, q: "Combien de chromosomes possède un humain ?", choices: ["23", "44", "46", "48"], answer: 2 },
  { id: 's17', theme: 'sciences', difficulty: 3, q: "Quel est le plus grand os du corps humain ?", choices: ["Tibia", "Humérus", "Fémur", "Crâne"], answer: 2 },
  { id: 's18', theme: 'sciences', difficulty: 2, q: "Quelle galaxie abrite notre Système solaire ?", choices: ["Andromède", "Voie lactée", "Triangle", "Sombrero"], answer: 1 },
  { id: 's19', theme: 'sciences', difficulty: 1, q: "Quel animal pond les plus gros œufs ?", choices: ["Aigle", "Autruche", "Pingouin", "Albatros"], answer: 1 },
  { id: 's20', theme: 'sciences', difficulty: 3, q: "Quel mathématicien a démontré le « dernier théorème » de Fermat ?", choices: ["Perelman", "Wiles", "Tao", "Grothendieck"], answer: 1 },

  // ============ CINÉMA ============
  { id: 'c1', theme: 'cinema', difficulty: 1, q: "Qui a réalisé « Titanic » (1997) ?", choices: ["Spielberg", "Cameron", "Scorsese", "Nolan"], answer: 1 },
  { id: 'c2', theme: 'cinema', difficulty: 2, q: "Combien d'Oscars « Le Seigneur des anneaux : Le Retour du Roi » a-t-il remportés ?", choices: ["7", "9", "11", "13"], answer: 2 },
  { id: 'c3', theme: 'cinema', difficulty: 1, q: "Dans « Star Wars », qui est le père de Luke ?", choices: ["Obi-Wan", "Yoda", "Dark Vador", "Palpatine"], answer: 2 },
  { id: 'c4', theme: 'cinema', difficulty: 2, q: "Qui joue Vincent Vega dans « Pulp Fiction » ?", choices: ["Bruce Willis", "John Travolta", "Samuel L. Jackson", "Tim Roth"], answer: 1 },
  { id: 'c5', theme: 'cinema', difficulty: 1, q: "Quel acteur a incarné James Bond le plus de fois ?", choices: ["Sean Connery", "Roger Moore", "Daniel Craig", "Pierce Brosnan"], answer: 1 },
  { id: 'c6', theme: 'cinema', difficulty: 2, q: "Quel film a gagné la Palme d'or à Cannes en 2019 ?", choices: ["Parasite", "Joker", "Once Upon a Time…", "Roma"], answer: 0 },
  { id: 'c7', theme: 'cinema', difficulty: 2, q: "Qui a réalisé « Pulp Fiction » ?", choices: ["Tarantino", "Scorsese", "Coppola", "Fincher"], answer: 0 },
  { id: 'c8', theme: 'cinema', difficulty: 3, q: "Quel est le premier film de Pixar ?", choices: ["1001 Pattes", "Toy Story", "Monstres et Cie", "Le Monde de Nemo"], answer: 1 },
  { id: 'c9', theme: 'cinema', difficulty: 2, q: "Dans « Le Parrain », qui joue Michael Corleone ?", choices: ["Brando", "Pacino", "De Niro", "Caan"], answer: 1 },
  { id: 'c10', theme: 'cinema', difficulty: 1, q: "Quel film d'animation a pour héros Simba ?", choices: ["Le Livre de la Jungle", "Bambi", "Le Roi Lion", "Madagascar"], answer: 2 },
  { id: 'c11', theme: 'cinema', difficulty: 3, q: "Qui a réalisé « 2001 : l'Odyssée de l'espace » ?", choices: ["Spielberg", "Kubrick", "Lucas", "Scott"], answer: 1 },
  { id: 'c12', theme: 'cinema', difficulty: 2, q: "Quel acteur français a joué dans « Intouchables » ?", choices: ["Jean Dujardin", "Omar Sy", "Vincent Cassel", "Gad Elmaleh"], answer: 1 },
  { id: 'c13', theme: 'cinema', difficulty: 1, q: "Qui est l'ennemi de Harry Potter ?", choices: ["Drago Malefoy", "Voldemort", "Bellatrix", "Severus Rogue"], answer: 1 },
  { id: 'c14', theme: 'cinema', difficulty: 3, q: "Quel film a inauguré la Nouvelle Vague française en 1959 ?", choices: ["À bout de souffle", "Les 400 coups", "Hiroshima mon amour", "Pickpocket"], answer: 1 },
  { id: 'c15', theme: 'cinema', difficulty: 2, q: "Qui réalise « Inception » et « Interstellar » ?", choices: ["Villeneuve", "Nolan", "Fincher", "Aronofsky"], answer: 1 },
  { id: 'c16', theme: 'cinema', difficulty: 1, q: "Dans Toy Story, quel est le nom du cowboy ?", choices: ["Buzz", "Woody", "Jessie", "Rex"], answer: 1 },
  { id: 'c17', theme: 'cinema', difficulty: 3, q: "Quel acteur a refusé l'Oscar du meilleur acteur en 1973 pour Le Parrain ?", choices: ["Pacino", "De Niro", "Brando", "Hoffman"], answer: 2 },
  { id: 'c18', theme: 'cinema', difficulty: 2, q: "« Casablanca » est sorti en quelle année ?", choices: ["1939", "1942", "1948", "1955"], answer: 1 },
  { id: 'c19', theme: 'cinema', difficulty: 1, q: "Qui est le réalisateur de « E.T. » ?", choices: ["Lucas", "Spielberg", "Cameron", "Zemeckis"], answer: 1 },
  { id: 'c20', theme: 'cinema', difficulty: 2, q: "Dans « Le Fabuleux Destin d'Amélie Poulain », qui joue le rôle-titre ?", choices: ["Marion Cotillard", "Audrey Tautou", "Sophie Marceau", "Mélanie Laurent"], answer: 1 },

  // ============ MUSIQUE ============
  { id: 'm1', theme: 'musique', difficulty: 1, q: "Quel groupe a composé « Bohemian Rhapsody » ?", choices: ["The Beatles", "Queen", "Pink Floyd", "Led Zeppelin"], answer: 1 },
  { id: 'm2', theme: 'musique', difficulty: 1, q: "Qui est surnommée la « Reine de la pop » ?", choices: ["Beyoncé", "Whitney Houston", "Madonna", "Mariah Carey"], answer: 2 },
  { id: 'm3', theme: 'musique', difficulty: 2, q: "Combien y a-t-il de touches sur un piano classique ?", choices: ["76", "85", "88", "92"], answer: 2 },
  { id: 'm4', theme: 'musique', difficulty: 2, q: "Quel compositeur est devenu sourd ?", choices: ["Mozart", "Bach", "Beethoven", "Chopin"], answer: 2 },
  { id: 'm5', theme: 'musique', difficulty: 1, q: "Qui chante « Hello » (2015) ?", choices: ["Adele", "Rihanna", "Sia", "Lady Gaga"], answer: 0 },
  { id: 'm6', theme: 'musique', difficulty: 2, q: "De quel pays est originaire le reggae ?", choices: ["Cuba", "Jamaïque", "Bahamas", "Haïti"], answer: 1 },
  { id: 'm7', theme: 'musique', difficulty: 3, q: "Combien de symphonies a écrit Beethoven ?", choices: ["7", "9", "12", "21"], answer: 1 },
  { id: 'm8', theme: 'musique', difficulty: 2, q: "Quel instrument joue Yo-Yo Ma ?", choices: ["Violon", "Piano", "Violoncelle", "Flûte"], answer: 2 },
  { id: 'm9', theme: 'musique', difficulty: 1, q: "Qui chante « Formidable » ?", choices: ["Stromae", "Maître Gims", "Vianney", "Christophe Maé"], answer: 0 },
  { id: 'm10', theme: 'musique', difficulty: 2, q: "Quel groupe a sorti « The Dark Side of the Moon » ?", choices: ["The Who", "Pink Floyd", "Rolling Stones", "Genesis"], answer: 1 },
  { id: 'm11', theme: 'musique', difficulty: 3, q: "Quel opéra de Mozart commence par « La Vendetta » ?", choices: ["Don Giovanni", "Les Noces de Figaro", "La Flûte enchantée", "Cosi fan tutte"], answer: 1 },
  { id: 'm12', theme: 'musique', difficulty: 1, q: "Combien de Beatles y a-t-il ?", choices: ["3", "4", "5", "6"], answer: 1 },
  { id: 'm13', theme: 'musique', difficulty: 2, q: "Qui a composé « Les Quatre Saisons » ?", choices: ["Bach", "Vivaldi", "Haendel", "Telemann"], answer: 1 },
  { id: 'm14', theme: 'musique', difficulty: 3, q: "Quel chanteur a popularisé la chanson « My Way » ?", choices: ["Elvis Presley", "Frank Sinatra", "Tom Jones", "Dean Martin"], answer: 1 },
  { id: 'm15', theme: 'musique', difficulty: 2, q: "Quel rappeur a sorti l'album « To Pimp a Butterfly » ?", choices: ["Drake", "Jay-Z", "Kendrick Lamar", "Kanye West"], answer: 2 },
  { id: 'm16', theme: 'musique', difficulty: 1, q: "Dans quel pays est né le tango ?", choices: ["Espagne", "Mexique", "Argentine", "Brésil"], answer: 2 },
  { id: 'm17', theme: 'musique', difficulty: 3, q: "Qui a composé « La Marseillaise » ?", choices: ["Rouget de Lisle", "Berlioz", "Saint-Saëns", "Lully"], answer: 0 },
  { id: 'm18', theme: 'musique', difficulty: 2, q: "Quel chanteur français a pour vrai nom Jean-Philippe Smet ?", choices: ["Eddy Mitchell", "Johnny Hallyday", "Sardou", "Aznavour"], answer: 1 },
  { id: 'm19', theme: 'musique', difficulty: 1, q: "Combien de cordes a une guitare classique ?", choices: ["4", "5", "6", "7"], answer: 2 },
  { id: 'm20', theme: 'musique', difficulty: 2, q: "Quel DJ français a composé « Get Lucky » avec Pharrell ?", choices: ["David Guetta", "Daft Punk", "Bob Sinclar", "Justice"], answer: 1 },

  // ============ SPORT ============
  { id: 'sp1', theme: 'sport', difficulty: 1, q: "Combien de joueurs dans une équipe de football sur le terrain ?", choices: ["10", "11", "12", "9"], answer: 1 },
  { id: 'sp2', theme: 'sport', difficulty: 1, q: "Quel pays a remporté la Coupe du monde 2018 ?", choices: ["Croatie", "France", "Allemagne", "Brésil"], answer: 1 },
  { id: 'sp3', theme: 'sport', difficulty: 2, q: "Combien de Grands Chelems Rafael Nadal a-t-il remportés (2024) ?", choices: ["20", "22", "24", "21"], answer: 1 },
  { id: 'sp4', theme: 'sport', difficulty: 1, q: "Quel sport pratique Usain Bolt ?", choices: ["Saut en hauteur", "Sprint", "Marathon", "Décathlon"], answer: 1 },
  { id: 'sp5', theme: 'sport', difficulty: 2, q: "Le Tour de France part traditionnellement de quel mois ?", choices: ["Mai", "Juin", "Juillet", "Août"], answer: 2 },
  { id: 'sp6', theme: 'sport', difficulty: 2, q: "Combien dure un match de basket NBA (temps réglementaire) ?", choices: ["40 min", "48 min", "60 min", "90 min"], answer: 1 },
  { id: 'sp7', theme: 'sport', difficulty: 3, q: "Qui détient le record du 100 m hommes ?", choices: ["Tyson Gay", "Asafa Powell", "Usain Bolt", "Justin Gatlin"], answer: 2 },
  { id: 'sp8', theme: 'sport', difficulty: 1, q: "Quelle est la couleur du maillot du leader du Tour de France ?", choices: ["Vert", "Pois rouges", "Jaune", "Blanc"], answer: 2 },
  { id: 'sp9', theme: 'sport', difficulty: 2, q: "Combien de sets faut-il pour gagner Roland-Garros (hommes) ?", choices: ["2", "3", "4", "5"], answer: 1 },
  { id: 'sp10', theme: 'sport', difficulty: 3, q: "En quelle année les JO ont-ils eu lieu à Paris pour la dernière fois avant 2024 ?", choices: ["1900", "1924", "1948", "1968"], answer: 1 },
  { id: 'sp11', theme: 'sport', difficulty: 2, q: "Quel sport se joue avec un volant ?", choices: ["Tennis", "Badminton", "Squash", "Ping-pong"], answer: 1 },
  { id: 'sp12', theme: 'sport', difficulty: 3, q: "Combien de fois Michael Schumacher a-t-il été champion du monde de F1 ?", choices: ["5", "6", "7", "8"], answer: 2 },
  { id: 'sp13', theme: 'sport', difficulty: 1, q: "Dans quel sport peut-on faire un strike ?", choices: ["Tennis", "Bowling", "Curling", "Golf"], answer: 1 },
  { id: 'sp14', theme: 'sport', difficulty: 2, q: "Quel club a remporté le plus de Ligues des champions ?", choices: ["FC Barcelone", "Bayern", "Real Madrid", "AC Milan"], answer: 2 },
  { id: 'sp15', theme: 'sport', difficulty: 1, q: "Combien de joueurs dans une équipe de rugby à XV ?", choices: ["13", "14", "15", "16"], answer: 2 },
  { id: 'sp16', theme: 'sport', difficulty: 3, q: "Quel boxeur a battu Sonny Liston en 1964 ?", choices: ["Joe Frazier", "Mike Tyson", "Mohamed Ali", "George Foreman"], answer: 2 },
  { id: 'sp17', theme: 'sport', difficulty: 2, q: "Combien de pays composent le Tournoi des Six Nations ?", choices: ["4", "5", "6", "7"], answer: 2 },
  { id: 'sp18', theme: 'sport', difficulty: 1, q: "Sport où l'on dit « 15-30-40 » ?", choices: ["Squash", "Tennis", "Padel", "Ping-pong"], answer: 1 },
  { id: 'sp19', theme: 'sport', difficulty: 3, q: "Qui a marqué la « main de Dieu » en 1986 ?", choices: ["Pelé", "Maradona", "Platini", "Zidane"], answer: 1 },
  { id: 'sp20', theme: 'sport', difficulty: 2, q: "Combien de trous compte un parcours de golf standard ?", choices: ["9", "12", "18", "24"], answer: 2 },

  // ============ LITTÉRATURE ============
  { id: 'l1', theme: 'litterature', difficulty: 1, q: "Qui a écrit « Les Misérables » ?", choices: ["Zola", "Hugo", "Balzac", "Flaubert"], answer: 1 },
  { id: 'l2', theme: 'litterature', difficulty: 1, q: "Qui est l'auteur de « Harry Potter » ?", choices: ["Rowling", "Tolkien", "Pullman", "Rick Riordan"], answer: 0 },
  { id: 'l3', theme: 'litterature', difficulty: 2, q: "Qui a écrit « L'Étranger » ?", choices: ["Sartre", "Camus", "Gide", "Malraux"], answer: 1 },
  { id: 'l4', theme: 'litterature', difficulty: 2, q: "« Madame Bovary » est un roman de…", choices: ["Stendhal", "Maupassant", "Flaubert", "Zola"], answer: 2 },
  { id: 'l5', theme: 'litterature', difficulty: 3, q: "Qui a écrit « Crime et Châtiment » ?", choices: ["Tolstoï", "Dostoïevski", "Tchekhov", "Pouchkine"], answer: 1 },
  { id: 'l6', theme: 'litterature', difficulty: 1, q: "Quel personnage a un long nez ?", choices: ["Pinocchio", "Cyrano", "Les deux", "Aucun"], answer: 2 },
  { id: 'l7', theme: 'litterature', difficulty: 2, q: "Qui a écrit « Le Petit Prince » ?", choices: ["Verne", "Saint-Exupéry", "Pagnol", "Daudet"], answer: 1 },
  { id: 'l8', theme: 'litterature', difficulty: 3, q: "Combien de tomes compte « À la recherche du temps perdu » ?", choices: ["5", "7", "9", "12"], answer: 1 },
  { id: 'l9', theme: 'litterature', difficulty: 2, q: "Qui a écrit « 1984 » ?", choices: ["Huxley", "Orwell", "Bradbury", "Asimov"], answer: 1 },
  { id: 'l10', theme: 'litterature', difficulty: 1, q: "Don Quichotte est un roman de…", choices: ["Cervantès", "Lope de Vega", "Borges", "García Márquez"], answer: 0 },
  { id: 'l11', theme: 'litterature', difficulty: 3, q: "Quel poète a écrit « Les Fleurs du mal » ?", choices: ["Verlaine", "Rimbaud", "Baudelaire", "Mallarmé"], answer: 2 },
  { id: 'l12', theme: 'litterature', difficulty: 2, q: "Qui a créé Sherlock Holmes ?", choices: ["Christie", "Conan Doyle", "Poe", "Chesterton"], answer: 1 },
  { id: 'l13', theme: 'litterature', difficulty: 1, q: "Qui a écrit « Le Seigneur des anneaux » ?", choices: ["Lewis", "Tolkien", "Rowling", "Martin"], answer: 1 },
  { id: 'l14', theme: 'litterature', difficulty: 2, q: "Quel auteur a écrit « Germinal » ?", choices: ["Hugo", "Maupassant", "Zola", "Dumas"], answer: 2 },
  { id: 'l15', theme: 'litterature', difficulty: 3, q: "Quel auteur a reçu le Nobel de littérature en 2022 ?", choices: ["Houellebecq", "Le Clézio", "Annie Ernaux", "Modiano"], answer: 2 },
  { id: 'l16', theme: 'litterature', difficulty: 1, q: "Qui a écrit « Roméo et Juliette » ?", choices: ["Shakespeare", "Molière", "Marlowe", "Goethe"], answer: 0 },
  { id: 'l17', theme: 'litterature', difficulty: 2, q: "« Les Trois Mousquetaires » a été écrit par…", choices: ["Hugo", "Dumas", "Verne", "Stendhal"], answer: 1 },
  { id: 'l18', theme: 'litterature', difficulty: 3, q: "Qui est l'auteur de « Cent ans de solitude » ?", choices: ["Borges", "Vargas Llosa", "García Márquez", "Cortázar"], answer: 2 },
  { id: 'l19', theme: 'litterature', difficulty: 1, q: "Quel auteur a écrit « Le Tour du monde en 80 jours » ?", choices: ["Verne", "Dumas", "Hugo", "Daudet"], answer: 0 },
  { id: 'l20', theme: 'litterature', difficulty: 2, q: "Quel personnage de Molière est « le Malade imaginaire » ?", choices: ["Harpagon", "Tartuffe", "Argan", "Sganarelle"], answer: 2 },

  // ============ ARTS ============
  { id: 'a1', theme: 'arts', difficulty: 1, q: "Qui a peint la Joconde ?", choices: ["Michel-Ange", "Léonard de Vinci", "Raphaël", "Botticelli"], answer: 1 },
  { id: 'a2', theme: 'arts', difficulty: 1, q: "Dans quel musée se trouve La Joconde ?", choices: ["Prado", "Louvre", "Uffizi", "MoMA"], answer: 1 },
  { id: 'a3', theme: 'arts', difficulty: 2, q: "Qui a peint « La Nuit étoilée » ?", choices: ["Monet", "Van Gogh", "Cézanne", "Gauguin"], answer: 1 },
  { id: 'a4', theme: 'arts', difficulty: 2, q: "Qui est l'auteur du « Penseur » ?", choices: ["Rodin", "Maillol", "Bourdelle", "Camille Claudel"], answer: 0 },
  { id: 'a5', theme: 'arts', difficulty: 3, q: "Quel mouvement a fondé Breton ?", choices: ["Dadaïsme", "Surréalisme", "Cubisme", "Fauvisme"], answer: 1 },
  { id: 'a6', theme: 'arts', difficulty: 1, q: "Qui a peint « Guernica » ?", choices: ["Dalí", "Miró", "Picasso", "Braque"], answer: 2 },
  { id: 'a7', theme: 'arts', difficulty: 2, q: "À quel mouvement appartient Monet ?", choices: ["Romantisme", "Impressionnisme", "Réalisme", "Cubisme"], answer: 1 },
  { id: 'a8', theme: 'arts', difficulty: 3, q: "Qui a sculpté le David à Florence ?", choices: ["Donatello", "Michel-Ange", "Bernin", "Ghiberti"], answer: 1 },
  { id: 'a9', theme: 'arts', difficulty: 2, q: "Le Cri est une œuvre de…", choices: ["Klimt", "Munch", "Schiele", "Kandinsky"], answer: 1 },
  { id: 'a10', theme: 'arts', difficulty: 1, q: "Dans quelle ville se trouve la tour Eiffel ?", choices: ["Lyon", "Marseille", "Paris", "Bordeaux"], answer: 2 },
  { id: 'a11', theme: 'arts', difficulty: 3, q: "Quel peintre flamand a réalisé le « Jardin des délices » ?", choices: ["Van Eyck", "Bosch", "Brueghel", "Rubens"], answer: 1 },
  { id: 'a12', theme: 'arts', difficulty: 2, q: "Qui a peint « Les Demoiselles d'Avignon » ?", choices: ["Matisse", "Picasso", "Cézanne", "Modigliani"], answer: 1 },
  { id: 'a13', theme: 'arts', difficulty: 1, q: "Quel art est associé au mot « ballet » ?", choices: ["Sculpture", "Danse", "Peinture", "Architecture"], answer: 1 },
  { id: 'a14', theme: 'arts', difficulty: 3, q: "Qui a conçu la pyramide du Louvre ?", choices: ["Niemeyer", "Pei", "Foster", "Gehry"], answer: 1 },
  { id: 'a15', theme: 'arts', difficulty: 2, q: "Quel architecte espagnol a conçu la Sagrada Família ?", choices: ["Calatrava", "Gaudí", "Bofill", "Moneo"], answer: 1 },

  // ============ TV & SÉRIES ============
  { id: 't1', theme: 'tv', difficulty: 1, q: "Dans « Friends », qui est paléontologue ?", choices: ["Joey", "Chandler", "Ross", "Phoebe"], answer: 2 },
  { id: 't2', theme: 'tv', difficulty: 1, q: "Dans « Breaking Bad », quel est le métier initial de Walter White ?", choices: ["Médecin", "Avocat", "Prof de chimie", "Comptable"], answer: 2 },
  { id: 't3', theme: 'tv', difficulty: 2, q: "Qui présente « Les 12 coups de midi » sur TF1 ?", choices: ["Nagui", "Cyril Féraud", "Jean-Luc Reichmann", "Arthur"], answer: 2 },
  { id: 't4', theme: 'tv', difficulty: 2, q: "Quelle série suit la famille Crawley à Downton ?", choices: ["The Crown", "Downton Abbey", "Bridgerton", "Peaky Blinders"], answer: 1 },
  { id: 't5', theme: 'tv', difficulty: 3, q: "Quel acteur joue Tyrion Lannister dans Game of Thrones ?", choices: ["Kit Harington", "Peter Dinklage", "Sean Bean", "Iwan Rheon"], answer: 1 },
  { id: 't6', theme: 'tv', difficulty: 1, q: "Dans « Les Simpson », quelle est la profession d'Homer ?", choices: ["Policier", "Employé centrale nucléaire", "Conducteur de bus", "Patron du bar"], answer: 1 },
  { id: 't7', theme: 'tv', difficulty: 2, q: "Quelle série Netflix met en scène Eleven ?", choices: ["Dark", "Stranger Things", "The OA", "Black Mirror"], answer: 1 },
  { id: 't8', theme: 'tv', difficulty: 3, q: "Dans « Mad Men », quel est le métier de Don Draper ?", choices: ["Avocat", "Publicitaire", "Banquier", "Producteur"], answer: 1 },
  { id: 't9', theme: 'tv', difficulty: 1, q: "Combien d'amis dans « Friends » ?", choices: ["4", "5", "6", "7"], answer: 2 },
  { id: 't10', theme: 'tv', difficulty: 2, q: "Quelle série tourne autour de la famille Soprano ?", choices: ["The Wire", "The Sopranos", "Boardwalk Empire", "Ozark"], answer: 1 },
  { id: 't11', theme: 'tv', difficulty: 3, q: "Qui présente « Qui veut gagner des millions ? » à l'origine en France ?", choices: ["Foucault", "Nagui", "Sébastien", "Drucker"], answer: 0 },
  { id: 't12', theme: 'tv', difficulty: 2, q: "Dans « House », quelle est la canne du médecin ?", choices: ["Métal", "Bois", "Plastique", "Carbone"], answer: 1 },
  { id: 't13', theme: 'tv', difficulty: 1, q: "Dans Game of Thrones, quelle maison a pour devise « Winter is Coming » ?", choices: ["Lannister", "Stark", "Targaryen", "Tyrell"], answer: 1 },
  { id: 't14', theme: 'tv', difficulty: 2, q: "« La Casa de Papel » est diffusée sur…", choices: ["Amazon", "Disney+", "Netflix", "HBO"], answer: 2 },
  { id: 't15', theme: 'tv', difficulty: 3, q: "Quel acteur joue Jack Bauer dans « 24 heures chrono » ?", choices: ["Hugh Laurie", "Kiefer Sutherland", "Hugh Jackman", "Jon Hamm"], answer: 1 },

  // ============ SOCIÉTÉ / ACTU ============
  { id: 'so1', theme: 'societe', difficulty: 1, q: "Quelle est la monnaie de l'Union européenne (zone euro) ?", choices: ["Franc", "Livre", "Euro", "Couronne"], answer: 2 },
  { id: 'so2', theme: 'societe', difficulty: 2, q: "Quel est le siège de l'ONU ?", choices: ["Genève", "Bruxelles", "Paris", "New York"], answer: 3 },
  { id: 'so3', theme: 'societe', difficulty: 2, q: "Quelle institution émet l'euro ?", choices: ["FMI", "BCE", "Banque mondiale", "OCDE"], answer: 1 },
  { id: 'so4', theme: 'societe', difficulty: 1, q: "Combien y a-t-il d'États membres de l'UE (2024) ?", choices: ["25", "26", "27", "28"], answer: 2 },
  { id: 'so5', theme: 'societe', difficulty: 3, q: "Qui dirige la Commission européenne en 2024 ?", choices: ["Charles Michel", "Ursula von der Leyen", "Josep Borrell", "Roberta Metsola"], answer: 1 },
  { id: 'so6', theme: 'societe', difficulty: 1, q: "Quel est le drapeau de l'UE ?", choices: ["12 étoiles or sur fond bleu", "13 bandes", "Croix blanche", "Étoile rouge"], answer: 0 },
  { id: 'so7', theme: 'societe', difficulty: 2, q: "Quelle ville accueille le Parlement européen ?", choices: ["Bruxelles", "Strasbourg", "Luxembourg", "Francfort"], answer: 1 },
  { id: 'so8', theme: 'societe', difficulty: 3, q: "Quelle est la devise de la République française ?", choices: ["Honneur, Patrie", "Liberté, Égalité, Fraternité", "Liberté, Justice, Paix", "Foi, Travail, Famille"], answer: 1 },
  { id: 'so9', theme: 'societe', difficulty: 1, q: "Combien de régions en France métropolitaine (depuis 2016) ?", choices: ["11", "12", "13", "22"], answer: 2 },
  { id: 'so10', theme: 'societe', difficulty: 2, q: "Qui est le secrétaire général de l'ONU (2024) ?", choices: ["Ban Ki-moon", "Kofi Annan", "António Guterres", "Boutros-Ghali"], answer: 2 },
]

export const QUESTIONS = [...BASE, ...EXTRA, ...BULK, ...MORE, ...NEW, ...OPEN_TAGGED, ...ORDER_TAGGED, ...COMMUNITY_TAGGED]

export const QUESTIONS_BY_THEME = QUESTIONS.reduce((acc, q) => {
  (acc[q.theme] ||= []).push(q)
  return acc
}, {})
