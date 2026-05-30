import type { SimPlayer } from "../types";

// Convert a Prisma player record (any shape with the right fields) to SimPlayer.
export function toSimPlayer(p: any): SimPlayer {
  return {
    id: p.id,
    name: `${p.firstName} ${p.lastName}`,
    position: p.position,
    secondPos: p.secondPos ?? null,
    age: p.age,
    attrs: {
      speed: p.speed,
      strength: p.strength,
      verticalJump: p.verticalJump,
      stamina: p.stamina,
      wingspan: p.wingspan,
      ballHandling: p.ballHandling,
      passing: p.passing,
      threePoint: p.threePoint,
      midRange: p.midRange,
      insideScoring: p.insideScoring,
      postGame: p.postGame,
      freeThrow: p.freeThrow,
      offMovement: p.offMovement,
      perimeterDef: p.perimeterDef,
      interiorDef: p.interiorDef,
      rebounding: p.rebounding,
      shotBlocking: p.shotBlocking,
      stealing: p.stealing,
      defensiveIQ: p.defensiveIQ,
      offensiveIQ: p.offensiveIQ,
      leadership: p.leadership,
      clutch: p.clutch,
      coachability: p.coachability,
      consistency: p.consistency,
    },
    potential: p.potential,
    morale: p.morale ?? 75,
    form: p.form ?? 75,
    fatigue: p.fatigue ?? 0,
    isInjured: p.isInjured ?? false,
    salary: p.salary,
  };
}
