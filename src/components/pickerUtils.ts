/**
 * Helpers partagés entre les pickers (Tags, Action d'intervention, ...)
 * pour sérialiser une sélection multiple en string CSV rétro-compatible.
 *
 * Format de stockage : string d'ids séparés par virgule.
 *  - Vide       = aucune option sélectionnée
 *  - `"a, b"`   = options "a" et "b" sélectionnées
 *  - Insensible à la casse et aux espaces
 *
 * Pourquoi CSV et pas JSON array :
 *  - JSON existant reste lisible (les JSON humainement éditables préfèrent
 *    un CSV : "cac, origine" est plus naturel que `["cac", "origine"]`).
 *  - Compat descendante : un JSON d'avant la migration contenant
 *    "1 action" reste valide (lu comme "aucun id reconnu", donc vide).
 *  - Stable : on ne change jamais le séparateur.
 */

import type { SkillSingleSelectOption } from './SkillSingleSelectPicker'

/** Convertit une string CSV en Set d'ids normalisés (lowercase, trim). */
export function parseIds(raw: string): Set<string> {
    return new Set(
        raw
            .split(',')
            .map(t => t.trim().toLowerCase())
            .filter(Boolean)
    )
}

/** Convertit un Set d'ids en string CSV, dans l'ordre de `optionDefs`. */
export function serializeIds(ids: Set<string>, optionDefs: { id: string }[]): string {
    return optionDefs
        .filter(t => ids.has(t.id))
        .map(t => t.id)
        .join(', ')
}

/** Toggle d'un id dans un Set (retourne un nouveau Set pour rester immutable). */
export function toggleId(ids: Set<string>, id: string): Set<string> {
    const next = new Set(ids)
    if (next.has(id)) {
        next.delete(id)
    } else {
        next.add(id)
    }
    return next
}

/** Map id → option pour un lookup O(1). */
export function buildOptionMap(options: SkillSingleSelectOption[]): Map<string, SkillSingleSelectOption> {
    return new Map(options.map(o => [o.id, o]))
}
