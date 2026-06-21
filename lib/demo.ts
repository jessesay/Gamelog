import type { Game, GameList, GameLog, Profile } from "./types";
import { megaStarterGames } from "./megaCatalog";

export const demoProfile: Profile = {
  id: "demo-user",
  username: "playerone",
  display_name: "Player One",
  bio: "Logging my backlog one game at a time.",
  favorite_game: "Elden Ring"
};

const coreStarterGames: Game[] = [
  {
    id: "elden-ring",
    title: "Elden Ring",
    slug: "elden-ring",
    developer: "FromSoftware",
    publisher: "Bandai Namco",
    release_year: 2022,
    genre: "Action RPG",
    platforms: ["PC", "PlayStation", "Xbox"],
    summary: "Open-world action RPG with brutal bosses, exploration, and buildcrafting."
  },
  {
    id: "baldurs-gate-3",
    title: "Baldur's Gate 3",
    slug: "baldurs-gate-3",
    developer: "Larian Studios",
    publisher: "Larian Studios",
    release_year: 2023,
    genre: "CRPG",
    platforms: ["PC", "PlayStation", "Xbox"],
    summary: "Party-based RPG where choice, dice, and chaos drive the story."
  },
  {
    id: "minecraft",
    title: "Minecraft",
    slug: "minecraft",
    developer: "Mojang Studios",
    publisher: "Xbox Game Studios",
    release_year: 2011,
    genre: "Sandbox",
    platforms: ["PC", "Console", "Mobile"],
    summary: "Survival, building, exploration, servers, mods, and pure imagination."
  },
  {
    id: "helldivers-2",
    title: "Helldivers 2",
    slug: "helldivers-2",
    developer: "Arrowhead Game Studios",
    publisher: "Sony Interactive Entertainment",
    release_year: 2024,
    genre: "Co-op Shooter",
    platforms: ["PC", "PlayStation"],
    summary: "Squad-based chaos, bugs, bots, friendly fire, and democracy."
  },
  {
    id: "disco-elysium",
    title: "Disco Elysium",
    slug: "disco-elysium",
    developer: "ZA/UM",
    publisher: "ZA/UM",
    release_year: 2019,
    genre: "Narrative RPG",
    platforms: ["PC", "PlayStation", "Xbox", "Switch"],
    summary: "A detective RPG about ideology, memory, failure, and very bad decisions."
  },
  {
    id: "stardew-valley",
    title: "Stardew Valley",
    slug: "stardew-valley",
    developer: "ConcernedApe",
    publisher: "ConcernedApe",
    release_year: 2016,
    genre: "Cozy Sim",
    platforms: ["PC", "Console", "Mobile"],
    summary: "Farming, relationships, fishing, caves, decorating, and chill progression."
  },
  {
    id: "ready-or-not",
    title: "Ready or Not",
    slug: "ready-or-not",
    developer: "VOID Interactive",
    publisher: "VOID Interactive",
    release_year: 2023,
    genre: "Tactical Shooter",
    platforms: ["PC"],
    summary: "Slow, tense tactical entries where every doorway feels personal."
  },
  {
    id: "hades",
    title: "Hades",
    slug: "hades",
    developer: "Supergiant Games",
    publisher: "Supergiant Games",
    release_year: 2020,
    genre: "Roguelike",
    platforms: ["PC", "PlayStation", "Xbox", "Switch"],
    summary: "Fast roguelike action, Greek mythology, and perfect one-more-run energy."
  },
  {
    id: "zelda-tears-of-the-kingdom",
    title: "The Legend of Zelda: Tears of the Kingdom",
    slug: "zelda-tears-of-the-kingdom",
    developer: "Nintendo",
    publisher: "Nintendo",
    release_year: 2023,
    genre: "Adventure",
    platforms: ["Switch"],
    summary: "Physics-driven adventure about building, exploring, and breaking the game in creative ways."
  },
  {
    id: "zelda-breath-of-the-wild",
    title: "The Legend of Zelda: Breath of the Wild",
    slug: "zelda-breath-of-the-wild",
    developer: "Nintendo",
    publisher: "Nintendo",
    release_year: 2017,
    genre: "Adventure",
    platforms: ["Switch", "Wii U"],
    summary: "Open-air adventure built around exploration, experiments, and quiet discovery."
  },
  {
    id: "cyberpunk-2077",
    title: "Cyberpunk 2077",
    slug: "cyberpunk-2077",
    developer: "CD Projekt Red",
    publisher: "CD Projekt",
    release_year: 2020,
    genre: "RPG",
    platforms: ["PC", "PlayStation", "Xbox"],
    summary: "A neon open-world RPG about mercs, chrome, bad choices, and Night City."
  },
  {
    id: "hollow-knight",
    title: "Hollow Knight",
    slug: "hollow-knight",
    developer: "Team Cherry",
    publisher: "Team Cherry",
    release_year: 2017,
    genre: "Metroidvania",
    platforms: ["PC", "PlayStation", "Xbox", "Switch"],
    summary: "Beautiful, brutal bug kingdom exploration with precise combat and massive vibes."
  },
  {
    id: "red-dead-redemption-2",
    title: "Red Dead Redemption 2",
    slug: "red-dead-redemption-2",
    developer: "Rockstar Games",
    publisher: "Rockstar Games",
    release_year: 2018,
    genre: "Open World",
    platforms: ["PC", "PlayStation", "Xbox"],
    summary: "A massive western about loyalty, survival, and the slow death of the outlaw era."
  },
  {
    id: "god-of-war",
    title: "God of War",
    slug: "god-of-war",
    developer: "Santa Monica Studio",
    publisher: "Sony Interactive Entertainment",
    release_year: 2018,
    genre: "Action Adventure",
    platforms: ["PC", "PlayStation"],
    summary: "Mythic action adventure about fatherhood, rage, and throwing an axe extremely hard."
  },
  {
    id: "god-of-war-ragnar-k",
    title: "God of War Ragnarök",
    slug: "god-of-war-ragnar-k",
    developer: "Santa Monica Studio",
    publisher: "Sony Interactive Entertainment",
    release_year: 2022,
    genre: "Action Adventure",
    platforms: ["PlayStation", "PC"],
    summary: "A bigger mythic sequel with cinematic combat, family drama, and realm-hopping spectacle."
  },
  {
    id: "the-last-of-us-part-i",
    title: "The Last of Us Part I",
    slug: "the-last-of-us-part-i",
    developer: "Naughty Dog",
    publisher: "Sony Interactive Entertainment",
    release_year: 2022,
    genre: "Survival Action",
    platforms: ["PC", "PlayStation"],
    summary: "A cinematic survival journey through grief, trust, and infected ruins."
  },
  {
    id: "the-last-of-us-part-ii",
    title: "The Last of Us Part II",
    slug: "the-last-of-us-part-ii",
    developer: "Naughty Dog",
    publisher: "Sony Interactive Entertainment",
    release_year: 2020,
    genre: "Survival Action",
    platforms: ["PlayStation"],
    summary: "A brutal revenge story with stealth, violence, and moral fallout."
  },
  {
    id: "ghost-of-tsushima",
    title: "Ghost of Tsushima",
    slug: "ghost-of-tsushima",
    developer: "Sucker Punch Productions",
    publisher: "Sony Interactive Entertainment",
    release_year: 2020,
    genre: "Open World",
    platforms: ["PlayStation", "PC"],
    summary: "Samurai open-world action with duels, stealth, wind guidance, and beautiful landscapes."
  },
  {
    id: "death-stranding",
    title: "Death Stranding",
    slug: "death-stranding",
    developer: "Kojima Productions",
    publisher: "Sony Interactive Entertainment",
    release_year: 2019,
    genre: "Adventure",
    platforms: ["PC", "PlayStation"],
    summary: "A strange delivery odyssey about connection, isolation, terrain, and cargo anxiety."
  },
  {
    id: "marvels-spider-man-remastered",
    title: "Marvel’s Spider-Man Remastered",
    slug: "marvels-spider-man-remastered",
    developer: "Insomniac Games",
    publisher: "Sony Interactive Entertainment",
    release_year: 2020,
    genre: "Action Adventure",
    platforms: ["PC", "PlayStation"],
    summary: "Fast superhero traversal, city crimes, gadgets, and web-swinging power fantasy."
  },
  {
    id: "marvels-spider-man-2",
    title: "Marvel’s Spider-Man 2",
    slug: "marvels-spider-man-2",
    developer: "Insomniac Games",
    publisher: "Sony Interactive Entertainment",
    release_year: 2023,
    genre: "Action Adventure",
    platforms: ["PlayStation"],
    summary: "Dual-Spider hero action with faster movement, bigger fights, and symbiote chaos."
  },
  {
    id: "super-mario-odyssey",
    title: "Super Mario Odyssey",
    slug: "super-mario-odyssey",
    developer: "Nintendo",
    publisher: "Nintendo",
    release_year: 2017,
    genre: "Platformer",
    platforms: ["Switch"],
    summary: "Joyful 3D platforming built around captures, kingdoms, moons, and pure movement fun."
  },
  {
    id: "mario-kart-8-deluxe",
    title: "Mario Kart 8 Deluxe",
    slug: "mario-kart-8-deluxe",
    developer: "Nintendo",
    publisher: "Nintendo",
    release_year: 2017,
    genre: "Racing",
    platforms: ["Switch"],
    summary: "Arcade kart racing, item chaos, couch competition, and online grudges."
  },
  {
    id: "super-smash-bros-ultimate",
    title: "Super Smash Bros. Ultimate",
    slug: "super-smash-bros-ultimate",
    developer: "Bandai Namco Studios",
    publisher: "Nintendo",
    release_year: 2018,
    genre: "Fighting",
    platforms: ["Switch"],
    summary: "Platform fighting crossover with a giant roster and party-to-sweaty range."
  },
  {
    id: "animal-crossing-new-horizons",
    title: "Animal Crossing: New Horizons",
    slug: "animal-crossing-new-horizons",
    developer: "Nintendo",
    publisher: "Nintendo",
    release_year: 2020,
    genre: "Life Sim",
    platforms: ["Switch"],
    summary: "Island life, decorating, collecting, debt repayment, and cozy daily routines."
  },
  {
    id: "pok-mon-legends-arceus",
    title: "Pokémon Legends: Arceus",
    slug: "pok-mon-legends-arceus",
    developer: "Game Freak",
    publisher: "Nintendo",
    release_year: 2022,
    genre: "RPG",
    platforms: ["Switch"],
    summary: "A semi-open Pokémon adventure focused on catching, studying, and exploring."
  },
  {
    id: "metroid-dread",
    title: "Metroid Dread",
    slug: "metroid-dread",
    developer: "MercurySteam",
    publisher: "Nintendo",
    release_year: 2021,
    genre: "Metroidvania",
    platforms: ["Switch"],
    summary: "Fast sci-fi exploration with tense chases, precision movement, and sharp boss fights."
  },
  {
    id: "fire-emblem-three-houses",
    title: "Fire Emblem: Three Houses",
    slug: "fire-emblem-three-houses",
    developer: "Intelligent Systems",
    publisher: "Nintendo",
    release_year: 2019,
    genre: "Tactical RPG",
    platforms: ["Switch"],
    summary: "Tactical battles, school management, relationship building, and branching war stories."
  },
  {
    id: "persona-5-royal",
    title: "Persona 5 Royal",
    slug: "persona-5-royal",
    developer: "Atlus",
    publisher: "Sega",
    release_year: 2019,
    genre: "JRPG",
    platforms: ["PC", "PlayStation", "Xbox", "Switch"],
    summary: "Stylish turn-based RPG about thieves, school life, jazz, and fighting rotten adults."
  },
  {
    id: "final-fantasy-vii-remake",
    title: "Final Fantasy VII Remake",
    slug: "final-fantasy-vii-remake",
    developer: "Square Enix",
    publisher: "Square Enix",
    release_year: 2020,
    genre: "JRPG",
    platforms: ["PC", "PlayStation"],
    summary: "A cinematic reimagining with hybrid combat, iconic characters, and Midgar drama."
  },
  {
    id: "final-fantasy-xvi",
    title: "Final Fantasy XVI",
    slug: "final-fantasy-xvi",
    developer: "Square Enix",
    publisher: "Square Enix",
    release_year: 2023,
    genre: "Action RPG",
    platforms: ["PlayStation", "PC"],
    summary: "Dark fantasy action RPG with huge Eikon battles and political revenge."
  },
  {
    id: "yakuza-like-a-dragon",
    title: "Yakuza: Like a Dragon",
    slug: "yakuza-like-a-dragon",
    developer: "Ryu Ga Gotoku Studio",
    publisher: "Sega",
    release_year: 2020,
    genre: "JRPG",
    platforms: ["PC", "PlayStation", "Xbox"],
    summary: "Crime drama turned turn-based RPG with absurd side content and huge heart."
  },
  {
    id: "like-a-dragon-infinite-wealth",
    title: "Like a Dragon: Infinite Wealth",
    slug: "like-a-dragon-infinite-wealth",
    developer: "Ryu Ga Gotoku Studio",
    publisher: "Sega",
    release_year: 2024,
    genre: "JRPG",
    platforms: ["PC", "PlayStation", "Xbox"],
    summary: "Vacation chaos, turn-based fights, friendship, jobs, and deeply weird minigames."
  },
  {
    id: "resident-evil-4",
    title: "Resident Evil 4",
    slug: "resident-evil-4",
    developer: "Capcom",
    publisher: "Capcom",
    release_year: 2023,
    genre: "Survival Horror",
    platforms: ["PC", "PlayStation", "Xbox"],
    summary: "Modern survival-horror action with tight shooting, tension, and village nightmares."
  },
  {
    id: "resident-evil-village",
    title: "Resident Evil Village",
    slug: "resident-evil-village",
    developer: "Capcom",
    publisher: "Capcom",
    release_year: 2021,
    genre: "Survival Horror",
    platforms: ["PC", "PlayStation", "Xbox"],
    summary: "First-person horror adventure with monsters, castles, and escalating chaos."
  },
  {
    id: "silent-hill-2",
    title: "Silent Hill 2",
    slug: "silent-hill-2",
    developer: "Bloober Team",
    publisher: "Konami",
    release_year: 2024,
    genre: "Survival Horror",
    platforms: ["PC", "PlayStation"],
    summary: "Psychological horror about guilt, fog, grief, and a town that refuses to be normal."
  },
  {
    id: "alan-wake-2",
    title: "Alan Wake 2",
    slug: "alan-wake-2",
    developer: "Remedy Entertainment",
    publisher: "Epic Games",
    release_year: 2023,
    genre: "Survival Horror",
    platforms: ["PC", "PlayStation", "Xbox"],
    summary: "A surreal horror mystery about writers, rituals, reality edits, and flashlight tension."
  },
  {
    id: "control",
    title: "Control",
    slug: "control",
    developer: "Remedy Entertainment",
    publisher: "505 Games",
    release_year: 2019,
    genre: "Action Adventure",
    platforms: ["PC", "PlayStation", "Xbox", "Switch"],
    summary: "Paranormal office combat with telekinesis, government weirdness, and brutalist style."
  },
  {
    id: "doom-eternal",
    title: "DOOM Eternal",
    slug: "doom-eternal",
    developer: "id Software",
    publisher: "Bethesda Softworks",
    release_year: 2020,
    genre: "Shooter",
    platforms: ["PC", "PlayStation", "Xbox", "Switch"],
    summary: "Aggressive arena shooter where movement, resources, and demons never let up."
  },
  {
    id: "halo-infinite",
    title: "Halo Infinite",
    slug: "halo-infinite",
    developer: "343 Industries",
    publisher: "Xbox Game Studios",
    release_year: 2021,
    genre: "Shooter",
    platforms: ["PC", "Xbox"],
    summary: "Sci-fi shooter with arena multiplayer, campaign grapple, and classic Halo feel."
  },
  {
    id: "halo-the-master-chief-collection",
    title: "Halo: The Master Chief Collection",
    slug: "halo-the-master-chief-collection",
    developer: "343 Industries",
    publisher: "Xbox Game Studios",
    release_year: 2014,
    genre: "Shooter",
    platforms: ["PC", "Xbox"],
    summary: "A collection of classic Halo campaigns and multiplayer memories."
  },
  {
    id: "call-of-duty-modern-warfare-ii",
    title: "Call of Duty: Modern Warfare II",
    slug: "call-of-duty-modern-warfare-ii",
    developer: "Infinity Ward",
    publisher: "Activision",
    release_year: 2022,
    genre: "Shooter",
    platforms: ["PC", "PlayStation", "Xbox"],
    summary: "Military shooter campaign and multiplayer built around fast loadouts and reaction time."
  },
  {
    id: "call-of-duty-warzone",
    title: "Call of Duty: Warzone",
    slug: "call-of-duty-warzone",
    developer: "Raven Software",
    publisher: "Activision",
    release_year: 2020,
    genre: "Battle Royale",
    platforms: ["PC", "PlayStation", "Xbox"],
    summary: "Large-scale battle royale with loadouts, squads, chaos, and constant meta shifts."
  },
  {
    id: "apex-legends",
    title: "Apex Legends",
    slug: "apex-legends",
    developer: "Respawn Entertainment",
    publisher: "Electronic Arts",
    release_year: 2019,
    genre: "Battle Royale",
    platforms: ["PC", "PlayStation", "Xbox", "Switch"],
    summary: "Hero battle royale with movement, squad abilities, and clutch revive plays."
  },
  {
    id: "fortnite",
    title: "Fortnite",
    slug: "fortnite",
    developer: "Epic Games",
    publisher: "Epic Games",
    release_year: 2017,
    genre: "Battle Royale",
    platforms: ["PC", "Console", "Mobile"],
    summary: "Battle royale and creative platform with building, seasons, events, and crossovers."
  },
  {
    id: "valorant",
    title: "Valorant",
    slug: "valorant",
    developer: "Riot Games",
    publisher: "Riot Games",
    release_year: 2020,
    genre: "Tactical Shooter",
    platforms: ["PC"],
    summary: "Precise tactical shooter mixing CS-style rounds with agent abilities."
  },
  {
    id: "counter-strike-2",
    title: "Counter-Strike 2",
    slug: "counter-strike-2",
    developer: "Valve",
    publisher: "Valve",
    release_year: 2023,
    genre: "Tactical Shooter",
    platforms: ["PC"],
    summary: "Round-based tactical shooter about angles, economy, utility, and nerves."
  },
  {
    id: "overwatch-2",
    title: "Overwatch 2",
    slug: "overwatch-2",
    developer: "Blizzard Entertainment",
    publisher: "Blizzard Entertainment",
    release_year: 2022,
    genre: "Hero Shooter",
    platforms: ["PC", "PlayStation", "Xbox", "Switch"],
    summary: "Team hero shooter with objectives, abilities, counters, and highlight plays."
  },
  {
    id: "league-of-legends",
    title: "League of Legends",
    slug: "league-of-legends",
    developer: "Riot Games",
    publisher: "Riot Games",
    release_year: 2009,
    genre: "MOBA",
    platforms: ["PC"],
    summary: "Competitive MOBA with champions, lanes, teamfights, and lifelong arguments."
  },
  {
    id: "dota-2",
    title: "Dota 2",
    slug: "dota-2",
    developer: "Valve",
    publisher: "Valve",
    release_year: 2013,
    genre: "MOBA",
    platforms: ["PC"],
    summary: "Deep competitive MOBA known for punishing decisions and wild comeback potential."
  },
  {
    id: "world-of-warcraft",
    title: "World of Warcraft",
    slug: "world-of-warcraft",
    developer: "Blizzard Entertainment",
    publisher: "Blizzard Entertainment",
    release_year: 2004,
    genre: "MMO",
    platforms: ["PC"],
    summary: "Long-running fantasy MMO about raids, dungeons, leveling, guilds, and loot."
  },
  {
    id: "final-fantasy-xiv",
    title: "Final Fantasy XIV",
    slug: "final-fantasy-xiv",
    developer: "Square Enix",
    publisher: "Square Enix",
    release_year: 2010,
    genre: "MMO",
    platforms: ["PC", "PlayStation", "Xbox"],
    summary: "Story-heavy MMO with jobs, dungeons, raids, crafting, and fashion endgame."
  },
  {
    id: "destiny-2",
    title: "Destiny 2",
    slug: "destiny-2",
    developer: "Bungie",
    publisher: "Bungie",
    release_year: 2017,
    genre: "Looter Shooter",
    platforms: ["PC", "PlayStation", "Xbox"],
    summary: "Sci-fi looter shooter with raids, builds, seasons, and space-magic gunplay."
  },
  {
    id: "warframe",
    title: "Warframe",
    slug: "warframe",
    developer: "Digital Extremes",
    publisher: "Digital Extremes",
    release_year: 2013,
    genre: "Looter Shooter",
    platforms: ["PC", "PlayStation", "Xbox", "Switch"],
    summary: "Fast space-ninja looter with frames, weapons, crafting, and endless grind paths."
  },
  {
    id: "the-witcher-3-wild-hunt",
    title: "The Witcher 3: Wild Hunt",
    slug: "the-witcher-3-wild-hunt",
    developer: "CD Projekt Red",
    publisher: "CD Projekt",
    release_year: 2015,
    genre: "RPG",
    platforms: ["PC", "PlayStation", "Xbox", "Switch"],
    summary: "Monster contracts, political messes, excellent quests, and open-world fantasy drama."
  },
  {
    id: "the-elder-scrolls-v-skyrim",
    title: "The Elder Scrolls V: Skyrim",
    slug: "the-elder-scrolls-v-skyrim",
    developer: "Bethesda Game Studios",
    publisher: "Bethesda Softworks",
    release_year: 2011,
    genre: "RPG",
    platforms: ["PC", "PlayStation", "Xbox", "Switch"],
    summary: "Open-world fantasy RPG of quests, dragons, mods, stealth archers, and wandering."
  },
  {
    id: "fallout-new-vegas",
    title: "Fallout: New Vegas",
    slug: "fallout-new-vegas",
    developer: "Obsidian Entertainment",
    publisher: "Bethesda Softworks",
    release_year: 2010,
    genre: "RPG",
    platforms: ["PC", "PlayStation", "Xbox"],
    summary: "Post-apocalyptic RPG with factions, sharp writing, and questionable desert choices."
  },
  {
    id: "fallout-4",
    title: "Fallout 4",
    slug: "fallout-4",
    developer: "Bethesda Game Studios",
    publisher: "Bethesda Softworks",
    release_year: 2015,
    genre: "RPG",
    platforms: ["PC", "PlayStation", "Xbox"],
    summary: "Wasteland RPG with settlement building, power armor, companions, and scavenging."
  },
  {
    id: "starfield",
    title: "Starfield",
    slug: "starfield",
    developer: "Bethesda Game Studios",
    publisher: "Bethesda Softworks",
    release_year: 2023,
    genre: "RPG",
    platforms: ["PC", "Xbox"],
    summary: "Space RPG about exploration, factions, ship building, and very many planets."
  },
  {
    id: "no-mans-sky",
    title: "No Man’s Sky",
    slug: "no-mans-sky",
    developer: "Hello Games",
    publisher: "Hello Games",
    release_year: 2016,
    genre: "Space Survival",
    platforms: ["PC", "PlayStation", "Xbox", "Switch"],
    summary: "Procedural space exploration with planets, bases, ships, creatures, and updates."
  },
  {
    id: "subnautica",
    title: "Subnautica",
    slug: "subnautica",
    developer: "Unknown Worlds Entertainment",
    publisher: "Unknown Worlds Entertainment",
    release_year: 2018,
    genre: "Survival",
    platforms: ["PC", "PlayStation", "Xbox", "Switch"],
    summary: "Ocean survival about crafting, fear, beauty, and hearing something big nearby."
  },
  {
    id: "terraria",
    title: "Terraria",
    slug: "terraria",
    developer: "Re-Logic",
    publisher: "Re-Logic",
    release_year: 2011,
    genre: "Sandbox",
    platforms: ["PC", "Console", "Mobile"],
    summary: "2D sandbox adventure packed with crafting, bosses, loot, and wild progression."
  },
  {
    id: "dont-starve-together",
    title: "Don't Starve Together",
    slug: "dont-starve-together",
    developer: "Klei Entertainment",
    publisher: "Klei Entertainment",
    release_year: 2016,
    genre: "Survival",
    platforms: ["PC", "PlayStation", "Xbox", "Switch"],
    summary: "Co-op survival full of crafting, weird creatures, darkness, and panic."
  },
  {
    id: "rimworld",
    title: "RimWorld",
    slug: "rimworld",
    developer: "Ludeon Studios",
    publisher: "Ludeon Studios",
    release_year: 2018,
    genre: "Colony Sim",
    platforms: ["PC", "Console"],
    summary: "Colony storyteller about survival, disasters, questionable ethics, and emergent drama."
  },
  {
    id: "factorio",
    title: "Factorio",
    slug: "factorio",
    developer: "Wube Software",
    publisher: "Wube Software",
    release_year: 2020,
    genre: "Automation",
    platforms: ["PC", "Switch"],
    summary: "Automation factory builder where the conveyor belts consume your brain."
  },
  {
    id: "satisfactory",
    title: "Satisfactory",
    slug: "satisfactory",
    developer: "Coffee Stain Studios",
    publisher: "Coffee Stain Publishing",
    release_year: 2024,
    genre: "Automation",
    platforms: ["PC"],
    summary: "First-person factory building across alien terrain with belts, pipes, and math."
  },
  {
    id: "cities-skylines",
    title: "Cities: Skylines",
    slug: "cities-skylines",
    developer: "Colossal Order",
    publisher: "Paradox Interactive",
    release_year: 2015,
    genre: "City Builder",
    platforms: ["PC", "Console"],
    summary: "City builder about roads, zoning, traffic disasters, and urban planning dreams."
  },
  {
    id: "civilization-vi",
    title: "Civilization VI",
    slug: "civilization-vi",
    developer: "Firaxis Games",
    publisher: "2K",
    release_year: 2016,
    genre: "Strategy",
    platforms: ["PC", "Console", "Mobile"],
    summary: "Turn-based empire strategy where one more turn becomes sunrise."
  },
  {
    id: "crusader-kings-iii",
    title: "Crusader Kings III",
    slug: "crusader-kings-iii",
    developer: "Paradox Development Studio",
    publisher: "Paradox Interactive",
    release_year: 2020,
    genre: "Grand Strategy",
    platforms: ["PC", "Console"],
    summary: "Dynasty grand strategy about power, family, betrayal, and medieval chaos."
  },
  {
    id: "stellaris",
    title: "Stellaris",
    slug: "stellaris",
    developer: "Paradox Development Studio",
    publisher: "Paradox Interactive",
    release_year: 2016,
    genre: "Grand Strategy",
    platforms: ["PC", "Console"],
    summary: "Space empire strategy with exploration, politics, alien ethics, and galactic disasters."
  },
  {
    id: "xcom-2",
    title: "XCOM 2",
    slug: "xcom-2",
    developer: "Firaxis Games",
    publisher: "2K",
    release_year: 2016,
    genre: "Tactics",
    platforms: ["PC", "PlayStation", "Xbox", "Switch"],
    summary: "Turn-based tactics where 95% shots still somehow ruin your whole night."
  },
  {
    id: "slay-the-spire",
    title: "Slay the Spire",
    slug: "slay-the-spire",
    developer: "Mega Crit",
    publisher: "Mega Crit",
    release_year: 2019,
    genre: "Deckbuilder",
    platforms: ["PC", "PlayStation", "Xbox", "Switch", "Mobile"],
    summary: "Deckbuilding roguelike with clean choices, nasty relic combos, and endless runs."
  },
  {
    id: "vampire-survivors",
    title: "Vampire Survivors",
    slug: "vampire-survivors",
    developer: "poncle",
    publisher: "poncle",
    release_year: 2022,
    genre: "Roguelite",
    platforms: ["PC", "Xbox", "Switch", "Mobile"],
    summary: "Auto-shooter chaos about builds, waves, upgrades, and becoming the bullet hell."
  },
  {
    id: "dead-cells",
    title: "Dead Cells",
    slug: "dead-cells",
    developer: "Motion Twin",
    publisher: "Motion Twin",
    release_year: 2018,
    genre: "Roguelite",
    platforms: ["PC", "PlayStation", "Xbox", "Switch", "Mobile"],
    summary: "Fast action roguelite with tight combat, builds, biomes, and brutal resets."
  },
  {
    id: "celeste",
    title: "Celeste",
    slug: "celeste",
    developer: "Maddy Makes Games",
    publisher: "Maddy Makes Games",
    release_year: 2018,
    genre: "Platformer",
    platforms: ["PC", "PlayStation", "Xbox", "Switch"],
    summary: "Precision platformer about climbing a mountain and fighting yourself."
  },
  {
    id: "cuphead",
    title: "Cuphead",
    slug: "cuphead",
    developer: "Studio MDHR",
    publisher: "Studio MDHR",
    release_year: 2017,
    genre: "Run and Gun",
    platforms: ["PC", "PlayStation", "Xbox", "Switch"],
    summary: "Hand-drawn boss rush with jazz, old-cartoon style, and controller-gripping difficulty."
  },
  {
    id: "undertale",
    title: "Undertale",
    slug: "undertale",
    developer: "Toby Fox",
    publisher: "Toby Fox",
    release_year: 2015,
    genre: "RPG",
    platforms: ["PC", "PlayStation", "Xbox", "Switch"],
    summary: "A strange, funny RPG where mercy, choices, and music matter."
  },
  {
    id: "outer-wilds",
    title: "Outer Wilds",
    slug: "outer-wilds",
    developer: "Mobius Digital",
    publisher: "Annapurna Interactive",
    release_year: 2019,
    genre: "Adventure",
    platforms: ["PC", "PlayStation", "Xbox", "Switch"],
    summary: "A solar-system mystery about curiosity, time loops, and discovery you cannot unlearn."
  },
  {
    id: "firewatch",
    title: "Firewatch",
    slug: "firewatch",
    developer: "Campo Santo",
    publisher: "Panic",
    release_year: 2016,
    genre: "Adventure",
    platforms: ["PC", "PlayStation", "Xbox", "Switch"],
    summary: "First-person mystery about isolation, radio friendship, and watching the woods."
  },
  {
    id: "what-remains-of-edith-finch",
    title: "What Remains of Edith Finch",
    slug: "what-remains-of-edith-finch",
    developer: "Giant Sparrow",
    publisher: "Annapurna Interactive",
    release_year: 2017,
    genre: "Narrative Adventure",
    platforms: ["PC", "PlayStation", "Xbox", "Switch"],
    summary: "Short narrative anthology exploring a family, a house, and strange memories."
  },
  {
    id: "journey",
    title: "Journey",
    slug: "journey",
    developer: "thatgamecompany",
    publisher: "Sony Computer Entertainment",
    release_year: 2012,
    genre: "Adventure",
    platforms: ["PC", "PlayStation", "iOS"],
    summary: "Wordless desert pilgrimage about movement, music, and quiet connection."
  },
  {
    id: "among-us",
    title: "Among Us",
    slug: "among-us",
    developer: "Innersloth",
    publisher: "Innersloth",
    release_year: 2018,
    genre: "Social Deduction",
    platforms: ["PC", "Console", "Mobile"],
    summary: "Social deduction chaos about tasks, impostors, lying, and yelling in meetings."
  },
  {
    id: "phasmophobia",
    title: "Phasmophobia",
    slug: "phasmophobia",
    developer: "Kinetic Games",
    publisher: "Kinetic Games",
    release_year: 2020,
    genre: "Horror",
    platforms: ["PC"],
    summary: "Co-op ghost hunting where equipment, evidence, and panic all matter."
  },
  {
    id: "lethal-company",
    title: "Lethal Company",
    slug: "lethal-company",
    developer: "Zeekerss",
    publisher: "Zeekerss",
    release_year: 2023,
    genre: "Co-op Horror",
    platforms: ["PC"],
    summary: "Co-op scavenging horror about quotas, monsters, proximity chat, and bad ideas."
  },
  {
    id: "valheim",
    title: "Valheim",
    slug: "valheim",
    developer: "Iron Gate Studio",
    publisher: "Coffee Stain Publishing",
    release_year: 2021,
    genre: "Survival",
    platforms: ["PC", "Xbox"],
    summary: "Viking survival with building, sailing, bosses, biomes, and cozy danger."
  },
  {
    id: "palworld",
    title: "Palworld",
    slug: "palworld",
    developer: "Pocketpair",
    publisher: "Pocketpair",
    release_year: 2024,
    genre: "Survival",
    platforms: ["PC", "Xbox"],
    summary: "Creature-collecting survival with base work, guns, crafting, and chaos."
  },
  {
    id: "sea-of-thieves",
    title: "Sea of Thieves",
    slug: "sea-of-thieves",
    developer: "Rare",
    publisher: "Xbox Game Studios",
    release_year: 2018,
    genre: "Adventure",
    platforms: ["PC", "Xbox", "PlayStation"],
    summary: "Pirate sandbox about sailing, treasure, betrayal, and yelling at the crew."
  },
  {
    id: "monster-hunter-world",
    title: "Monster Hunter: World",
    slug: "monster-hunter-world",
    developer: "Capcom",
    publisher: "Capcom",
    release_year: 2018,
    genre: "Action RPG",
    platforms: ["PC", "PlayStation", "Xbox"],
    summary: "Big creature hunts, weapon mastery, co-op preparation, and satisfying gear loops."
  },
  {
    id: "monster-hunter-rise",
    title: "Monster Hunter Rise",
    slug: "monster-hunter-rise",
    developer: "Capcom",
    publisher: "Capcom",
    release_year: 2021,
    genre: "Action RPG",
    platforms: ["PC", "PlayStation", "Xbox", "Switch"],
    summary: "Fast monster hunting with wirebugs, traversal, builds, and flashy combat."
  },
  {
    id: "dark-souls-iii",
    title: "Dark Souls III",
    slug: "dark-souls-iii",
    developer: "FromSoftware",
    publisher: "Bandai Namco",
    release_year: 2016,
    genre: "Action RPG",
    platforms: ["PC", "PlayStation", "Xbox"],
    summary: "Gothic action RPG of bosses, ashes, dodges, and repeated humbling."
  },
  {
    id: "sekiro-shadows-die-twice",
    title: "Sekiro: Shadows Die Twice",
    slug: "sekiro-shadows-die-twice",
    developer: "FromSoftware",
    publisher: "Activision",
    release_year: 2019,
    genre: "Action Adventure",
    platforms: ["PC", "PlayStation", "Xbox"],
    summary: "Swordplay action about posture, parries, discipline, and revenge."
  },
  {
    id: "bloodborne",
    title: "Bloodborne",
    slug: "bloodborne",
    developer: "FromSoftware",
    publisher: "Sony Computer Entertainment",
    release_year: 2015,
    genre: "Action RPG",
    platforms: ["PlayStation"],
    summary: "Gothic nightmare action RPG about beasts, blood, and aggressive combat."
  },
  {
    id: "lies-of-p",
    title: "Lies of P",
    slug: "lies-of-p",
    developer: "Neowiz Games",
    publisher: "Neowiz",
    release_year: 2023,
    genre: "Action RPG",
    platforms: ["PC", "PlayStation", "Xbox"],
    summary: "Soulslike puppet nightmare with sharp combat, lies, and Belle Époque horror."
  },
  {
    id: "armored-core-vi-fires-of-rubicon",
    title: "Armored Core VI: Fires of Rubicon",
    slug: "armored-core-vi-fires-of-rubicon",
    developer: "FromSoftware",
    publisher: "Bandai Namco",
    release_year: 2023,
    genre: "Mech Action",
    platforms: ["PC", "PlayStation", "Xbox"],
    summary: "Fast mech action with customization, missiles, dodges, and boss walls."
  },
  {
    id: "gran-turismo-7",
    title: "Gran Turismo 7",
    slug: "gran-turismo-7",
    developer: "Polyphony Digital",
    publisher: "Sony Interactive Entertainment",
    release_year: 2022,
    genre: "Racing",
    platforms: ["PlayStation"],
    summary: "Driving sim focused on cars, tracks, tuning, licenses, and collection."
  },
  {
    id: "forza-horizon-5",
    title: "Forza Horizon 5",
    slug: "forza-horizon-5",
    developer: "Playground Games",
    publisher: "Xbox Game Studios",
    release_year: 2021,
    genre: "Racing",
    platforms: ["PC", "Xbox"],
    summary: "Open-world racing festival with fast cars, events, stunts, and chill driving."
  },
  {
    id: "rocket-league",
    title: "Rocket League",
    slug: "rocket-league",
    developer: "Psyonix",
    publisher: "Psyonix",
    release_year: 2015,
    genre: "Sports",
    platforms: ["PC", "PlayStation", "Xbox", "Switch"],
    summary: "Car soccer that starts simple and becomes aerial physics wizardry."
  },
  {
    id: "ea-sports-fc-24",
    title: "EA Sports FC 24",
    slug: "ea-sports-fc-24",
    developer: "EA Vancouver",
    publisher: "Electronic Arts",
    release_year: 2023,
    genre: "Sports",
    platforms: ["PC", "PlayStation", "Xbox", "Switch"],
    summary: "Club football/soccer with Ultimate Team, career, and quick online matches."
  },
  {
    id: "madden-nfl-24",
    title: "Madden NFL 24",
    slug: "madden-nfl-24",
    developer: "EA Tiburon",
    publisher: "Electronic Arts",
    release_year: 2023,
    genre: "Sports",
    platforms: ["PC", "PlayStation", "Xbox"],
    summary: "Football sim with franchises, plays, rosters, and weekly rage moments."
  },
  {
    id: "mlb-the-show-24",
    title: "MLB The Show 24",
    slug: "mlb-the-show-24",
    developer: "San Diego Studio",
    publisher: "Sony Interactive Entertainment",
    release_year: 2024,
    genre: "Sports",
    platforms: ["PlayStation", "Xbox", "Switch"],
    summary: "Baseball sim with Road to the Show, Diamond Dynasty, and franchise play."
  },
  {
    id: "nba-2k24",
    title: "NBA 2K24",
    slug: "nba-2k24",
    developer: "Visual Concepts",
    publisher: "2K",
    release_year: 2023,
    genre: "Sports",
    platforms: ["PC", "PlayStation", "Xbox", "Switch"],
    summary: "Basketball sim with MyCareer, teams, online play, and yearly roster drama."
  }
];

export const starterGames: Game[] = mergeGames(coreStarterGames, megaStarterGames);

export const demoLogs: GameLog[] = [
  {
    id: "demo-log-1",
    user_id: demoProfile.id,
    game_id: "elden-ring",
    status: "Completed",
    rating: 5,
    review: "I hated half of these bosses and still think about this game constantly. 5 stars, easy.",
    vibe: "Masterpiece",
    played_on: "2026-06-18",
    created_at: new Date().toISOString(),
    games: starterGames[0],
    profiles: demoProfile,
    review_likes: [],
    comments: [
      {
        id: "demo-comment-1",
        user_id: "demo-friend",
        log_id: "demo-log-1",
        body: "This is exactly the kind of review GameLog needs.",
        created_at: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
        profiles: { username: "questdad", display_name: "Quest Dad" }
      }
    ]
  },
  {
    id: "demo-log-2",
    user_id: demoProfile.id,
    game_id: "minecraft",
    status: "Currently Playing",
    rating: 4.5,
    review: "Started a new world and immediately got humbled by a skeleton. Classic.",
    vibe: "Forever Game",
    played_on: "2026-06-20",
    created_at: new Date(Date.now() - 3600 * 1000 * 7).toISOString(),
    games: starterGames[2],
    profiles: demoProfile,
    review_likes: [{ user_id: "demo-friend", log_id: "demo-log-2" }],
    comments: []
  }
];

export const demoLists: GameList[] = [
  {
    id: "demo-list-1",
    user_id: demoProfile.id,
    title: "Games I wish I could play again for the first time",
    description: "The ones that hit different.",
    is_ranked: false,
    created_at: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
    profiles: demoProfile,
    list_items: [
      { id: "item-1", games: starterGames[0] },
      { id: "item-2", games: starterGames[1] },
      { id: "item-3", games: starterGames[4] }
    ]
  }
];

function mergeGames(base: Game[], saved: Game[]) {
  const bySlug = new Map<string, Game>();
  for (const game of base) bySlug.set(game.slug ?? game.id, game);
  for (const game of saved) bySlug.set(game.slug ?? game.id, { ...bySlug.get(game.slug ?? game.id), ...game });
  return Array.from(bySlug.values());
}

export function loadDemoState() {
  if (typeof window === "undefined") {
    return { games: starterGames, logs: demoLogs, profile: demoProfile, lists: demoLists };
  }

  const raw = window.localStorage.getItem("gamelog-next-demo");
  if (!raw) return { games: starterGames, logs: demoLogs, profile: demoProfile, lists: demoLists };

  try {
    const parsed = JSON.parse(raw);
    return {
      games: mergeGames(starterGames, parsed.games ?? []),
      logs: parsed.logs ?? demoLogs,
      profile: parsed.profile ?? demoProfile,
      lists: parsed.lists ?? demoLists
    };
  } catch {
    return { games: starterGames, logs: demoLogs, profile: demoProfile, lists: demoLists };
  }
}

export function saveDemoState(state: { games: Game[]; logs: GameLog[]; profile: Profile; lists: GameList[] }) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("gamelog-next-demo", JSON.stringify(state));
}
