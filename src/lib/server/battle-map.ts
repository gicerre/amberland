import { LEGACY_TERRAIN_MAP } from "@/features/battle/terrain";
import type { TerrainKind } from "@/types/battle";
import type { TacticalMap } from "@/types/battlemap";

/**
 * Proiezione verso il modello legacy: `Battle.terrain` conosce sei tipi
 * e continua a servire chi non è stato aggiornato allo strato tattico.
 * La verità resta `tactical.cells`; questo è un riflesso, ricalcolato a
 * ogni scrittura — anche quando una porta si apre in mezzo allo scontro.
 */
export function deriveLegacyTerrain(
  map: TacticalMap
): Record<string, TerrainKind> {
  const terrain: Record<string, TerrainKind> = {};

  for (const [key, cell] of Object.entries(map.cells)) {
    const legacy = LEGACY_TERRAIN_MAP[cell.terrain] ?? "NORMAL";
    if (cell.blocked) {
      terrain[key] = "WALL";
      continue;
    }
    if (legacy === "NORMAL") continue;
    terrain[key] = legacy as TerrainKind;
  }

  for (const object of map.objects) {
    if (!object.blocksMovement) continue;
    if (object.state === "OPEN" || object.state === "BROKEN") continue;
    for (const key of object.cells) terrain[key] = "WALL";
  }

  return terrain;
}
