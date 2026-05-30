// Draft prospect generation and scouting reveal logic.
import { generatePlayerAttributes } from "../player/attributes";
import type { Position, Potential, PlayerAttributes } from "../types";

export interface ProspectSeed {
  position: Position;
  potential: Potential;
  age: number;
  nationality: string;
  firstName: string;
  lastName: string;
}

// Attributes revealed at each scouting level (0=none, 5=full)
const REVEAL_TIERS: Record<number, (keyof PlayerAttributes)[]> = {
  1: ["speed", "verticalJump", "stamina"],                           // Physical glimpse
  2: ["threePoint", "insideScoring", "rebounding", "shotBlocking"], // Basic skills
  3: ["ballHandling", "passing", "perimeterDef", "interiorDef"],    // Core skills
  4: ["midRange", "postGame", "offensiveIQ", "defensiveIQ", "stealing"], // Full skill set
  5: ["freeThrow", "offMovement", "leadership", "clutch", "coachability", "consistency", "strength", "wingspan"], // Everything
};

export function generateProspects(count: number, rng: () => number = Math.random): ProspectSeed[] {
  const positionDistribution: Position[] = [
    "PG", "PG", "PG",
    "SG", "SG", "SG",
    "SF", "SF", "SF",
    "PF", "PF",
    "C", "C",
  ];

  const potentialWeights: { pot: Potential; weight: number }[] = [
    { pot: "ELITE",    weight: 0.05 },
    { pot: "STAR",     weight: 0.15 },
    { pot: "STARTER",  weight: 0.30 },
    { pot: "ROTATION", weight: 0.35 },
    { pot: "FRINGE",   weight: 0.15 },
  ];

  const FIRST_NAMES = ["Zion","Victor","Cade","Evan","Jaden","Paolo","Jabari","Scottie","Franz","Alperen","Dyson","Brandon","Keyonte","Gradey","Cason","Jordan","AJ","Colby","Jarace","Ausar","Thompson","Kobe","Noah","KJ","Cam","Dillon","Patrick","Cole","Drake","Tre"];
  const LAST_NAMES  = ["Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Wilson","Taylor","Moore","Jackson","Martin","Lee","Thompson","White","Harris","Clark","Lewis","Robinson","Walker","Young","King","Scott","Adams","Carter","Mitchell","Campbell","Roberts","Evans"];
  const NATIONALITIES = ["🇺🇸","🇺🇸","🇺🇸","🇺🇸","🇺🇸","🇺🇸","🇫🇷","🇩🇪","🇨🇦","🇦🇺","🇷🇸","🇸🇳","🇬🇷","🇩🇰","🇨🇲","🇧🇷","🇫🇮","🇧🇦","🇮🇹","🇸🇱"];

  const prospects: ProspectSeed[] = [];

  for (let i = 0; i < count; i++) {
    const pos = positionDistribution[Math.floor(rng() * positionDistribution.length)];
    const pot = weightedPick(potentialWeights, rng);
    const age = 19 + Math.floor(rng() * 3); // 19-21

    prospects.push({
      position: pos,
      potential: pot,
      age,
      nationality: NATIONALITIES[Math.floor(rng() * NATIONALITIES.length)],
      firstName: FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)],
      lastName: LAST_NAMES[Math.floor(rng() * LAST_NAMES.length)],
    });
  }

  return prospects;
}

function weightedPick<T>(items: { weight: number; [k: string]: any }[], rng: () => number): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = rng() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item.pot as T;
  }
  return items[items.length - 1].pot as T;
}

// Generate full attributes for a prospect (used when they're actually drafted/converted to Player)
export function generateProspectAttributes(
  position: Position,
  potential: Potential,
  age: number,
  rng: () => number = Math.random
): PlayerAttributes {
  return generatePlayerAttributes(position, potential, age, rng);
}

// Reveal attributes progressively based on scouting level
export function getRevealedAttributes(
  fullAttrs: PlayerAttributes,
  scoutingLevel: number
): Partial<PlayerAttributes> & { _unknown: number } {
  const revealed: Partial<PlayerAttributes> = {};
  let revealed_count = 0;

  for (let level = 1; level <= Math.min(5, scoutingLevel); level++) {
    for (const attr of REVEAL_TIERS[level] ?? []) {
      revealed[attr] = fullAttrs[attr];
      revealed_count++;
    }
  }

  const total = Object.keys(fullAttrs).length;
  return { ...revealed, _unknown: total - revealed_count };
}

// Scouting cost in $K — increases for top prospects
export function scoutingCost(currentLevel: number): number {
  const costs = [0, 500, 800, 1200, 2000, 3500];
  return costs[currentLevel + 1] ?? 5000;
}

// AI teams draft logic — picks best available by position need + overall
export function aiDraftPick(
  availableProspects: Array<{ id: string; position: Position; potential: Potential; attributes: any }>,
  teamNeeds: Partial<Record<Position, number>>, // lower = more urgent
  rng: () => number = Math.random
): string {
  if (availableProspects.length === 0) throw new Error("No prospects available");

  const potentialScore: Record<Potential, number> = {
    ELITE: 100, STAR: 80, STARTER: 60, ROTATION: 40, FRINGE: 20,
  };

  const scored = availableProspects.map((p) => {
    const needScore = 5 - (teamNeeds[p.position] ?? 3); // lower need index = more urgent
    const qualScore = potentialScore[p.potential] / 100;
    const noise = rng() * 0.2; // some randomness in AI decisions
    return { id: p.id, score: qualScore * 0.7 + needScore * 0.2 + noise };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].id;
}
