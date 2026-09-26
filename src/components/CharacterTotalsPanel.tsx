import React from 'react';
import './character-totals-panel.css';

interface CharacterTotalsPanelProps {
    /**
     * Liste d'items (équipement ou modificateur) sur laquelle calculer les totaux.
     * Doit exposer un champ `weight: number` et tous les champs `<key>Mod: number`
     * déclarés dans `MOD_FIELDS` (cf. `CharacterSheetDialog.tsx`).
     */
    items: Array<Record<string, any>>;
    /** Titre affiché en haut du panneau (ex: "Totaux Équipement"). */
    title: string;
}

interface TotalsDef {
    /** Clé d'accès sur l'item (ex: 'weight', 'healthMod'). */
    key: string;
    /** Label court affiché (ex: 'Poids', 'Sant.'). */
    short: string;
    /** Emoji optionnel affiché avant le label. */
    emoji?: string;
    /** Couleur d'accent (optionnel). */
    color?: string;
    /** Afficher une décimale (uniquement pour `weight`). */
    decimals?: number;
}

/**
 * Définition compacte des colonnes affichées dans le panneau horizontal.
 * L'ordre est intentionnel : poids d'abord, puis Santé / Mental / Armure /
 * Astra (ressources), puis les 9 caractéristiques.
 */
const TOTALS_DEF: TotalsDef[] = [
    { key: 'weight', short: 'Poids', emoji: '⚖', color: 'var(--stat-color-weight)', decimals: 1 },
    { key: 'healthMod', short: 'Sant.', emoji: '♥', color: 'var(--stat-color-health)' },
    { key: 'mentalMod', short: 'Ment.', emoji: '@', color: 'var(--stat-color-mental)' },
    { key: 'armorMod', short: 'Armu.', emoji: '🛡', color: 'var(--stat-color-armor)' },
    { key: 'astraMod', short: 'Astr.', emoji: '✨', color: 'var(--stat-color-astra)' },
    { key: 'enduranceMod', short: 'Endu.', emoji: '🔋' },
    { key: 'strengthMod', short: 'Forc.', emoji: '💪' },
    { key: 'agilityMod', short: 'Agil.', emoji: '🦘' },
    { key: 'intelligenceMod', short: 'Inte.', emoji: '🧠' },
    { key: 'astraMasteryMod', short: 'Maît.', emoji: '💫' },
    { key: 'charismaMod', short: 'Char.', emoji: '🔊' },
    { key: 'wisdomMod', short: 'Sag.', emoji: '🌿' },
    { key: 'luckMod', short: 'Chan.', emoji: '🍀' },
    { key: 'perceptionMod', short: 'Perc.', emoji: '👀' },
];

/**
 * Panneau de totaux partagé entre l'onglet Équipement et l'onglet Modificateurs.
 *
 * Layout horizontal (Material Design 3) : chaque total est une "carte" compacte
 * avec emoji + libellé court + valeur. S'adapte aux écrans étroits en
 * wrap-ant sur plusieurs lignes. Le panneau se réduit en hauteur sur mobile
 * grâce à un scroll horizontal si la largeur ne suffit pas.
 */
export const CharacterTotalsPanel: React.FC<CharacterTotalsPanelProps> = ({ items, title }) => {
    // Calcule les totaux une fois par render — peu coûteux (≤ quelques items).
    const totals: Record<string, number> = {};
    for (const def of TOTALS_DEF) {
        totals[def.key] = items.reduce(
            (acc, it) => acc + (Number((it as any)[def.key]) || 0),
            0,
        );
    }

    return (
        <aside className="char-totals-panel" aria-label={title}>
            <div className="char-totals-panel-title">
                <span className="char-totals-panel-icon" aria-hidden>∑</span>
                {title}
            </div>
            <div className="char-totals-panel-grid" role="list">
                {TOTALS_DEF.map((def) => {
                    const value = totals[def.key] ?? 0;
                    const valueClass =
                        value > 0 ? 'char-totals-value--positive'
                            : value < 0 ? 'char-totals-value--negative'
                                : 'char-totals-value--zero';
                    // Affichage de la valeur : nombre entier par défaut, décimal pour `weight`.
                    const valueDisplay = def.decimals
                        ? value.toFixed(def.decimals)
                        : (value > 0 ? `+${value}` : `${value}`);
                    return (
                        <div
                            key={def.key}
                            className={`char-totals-cell ${valueClass}`}
                            role="listitem"
                            title={def.short}
                        >
                            <span
                                className="char-totals-emoji"
                                style={{ color: def.color || 'var(--md-sys-color-on-surface-variant)' }}
                                aria-hidden
                            >
                                {def.emoji}
                            </span>
                            <span className="char-totals-label">{def.short}</span>
                            <span className="char-totals-value">{valueDisplay}</span>
                        </div>
                    );
                })}
            </div>
        </aside>
    );
};

export default CharacterTotalsPanel;
