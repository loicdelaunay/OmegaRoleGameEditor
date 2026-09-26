/**
 * Harness de test isolé pour le CharacterSheetDialog.
 * Monté uniquement quand l'URL contient `?testCharSheet=1`.
 * Permet de vérifier visuellement les nouvelles fonctionnalités
 * (re-ordering, etc.) sans dépendre d'un workfolder ou d'un host.
 */
import React, { useState, useMemo } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { createAppMuiTheme } from './lib/muiTheme';
import { CharacterSheetDialog } from './components/CharacterSheetDialog';
import { createDefaultCharacter, type CharacterDocument } from './lib/character';

function makeId(): string {
    return 'id-' + Math.random().toString(36).slice(2, 10);
}

function buildTestCharacter(): CharacterDocument {
    const base = createDefaultCharacter();
    // Renseigne un nom pour faciliter la lecture
    base.general.firstName = 'Test';
    base.general.lastName = 'Reorder';
    // Équipement : 5 lignes
    base.equipment = [
        { id: makeId(), rarity: 'common', description: 'Lampe torche', effects: '', weight: 0.5, healthMod: 0, mentalMod: 0, armorMod: 0, astraMod: 0, enduranceMod: 0, strengthMod: 0, agilityMod: 0, intelligenceMod: 0, astraMasteryMod: 0, charismaMod: 0, wisdomMod: 0, luckMod: 0, perceptionMod: 0 },
        { id: makeId(), rarity: 'rare', description: 'Pistolet laser', effects: '2d6 feu', weight: 1.2, healthMod: 0, mentalMod: 0, armorMod: 0, astraMod: 0, enduranceMod: 0, strengthMod: 0, agilityMod: 1, intelligenceMod: 0, astraMasteryMod: 0, charismaMod: 0, wisdomMod: 0, luckMod: 0, perceptionMod: 0 },
        { id: makeId(), rarity: 'epic', description: "Cape d'invisibilite", effects: '+10 discretion', weight: 0.8, healthMod: 0, mentalMod: 0, armorMod: 0, astraMod: 0, enduranceMod: 0, strengthMod: 0, agilityMod: 0, intelligenceMod: 0, astraMasteryMod: 0, charismaMod: 0, wisdomMod: 0, luckMod: 0, perceptionMod: 2 },
        { id: makeId(), rarity: 'legendary', description: 'Epee du dragon', effects: '3d8 tranchant', weight: 3.5, healthMod: 0, mentalMod: 0, armorMod: 0, astraMod: 0, enduranceMod: 0, strengthMod: 2, agilityMod: 0, intelligenceMod: 0, astraMasteryMod: 0, charismaMod: 0, wisdomMod: 0, luckMod: 0, perceptionMod: 0 },
        { id: makeId(), rarity: 'unique', description: 'Anneau de pouvoir', effects: '+5% reussite', weight: 0.1, healthMod: 0, mentalMod: 0, armorMod: 0, astraMod: 0, enduranceMod: 0, strengthMod: 0, agilityMod: 0, intelligenceMod: 1, astraMasteryMod: 0, charismaMod: 1, wisdomMod: 0, luckMod: 0, perceptionMod: 0 },
    ];
    // Modificateurs : 3 lignes
    base.modificateurs = [
        { id: makeId(), rarity: 'common', description: 'Bonus Force', effects: '', weight: 0, healthMod: 0, mentalMod: 0, armorMod: 0, astraMod: 0, enduranceMod: 0, strengthMod: 2, agilityMod: 0, intelligenceMod: 0, astraMasteryMod: 0, charismaMod: 0, wisdomMod: 0, luckMod: 0, perceptionMod: 0 },
        { id: makeId(), rarity: 'rare', description: 'Agilite feline', effects: '', weight: 0, healthMod: 0, mentalMod: 0, armorMod: 0, astraMod: 0, enduranceMod: 0, strengthMod: 0, agilityMod: 3, intelligenceMod: 0, astraMasteryMod: 0, charismaMod: 0, wisdomMod: 0, luckMod: 0, perceptionMod: 0 },
        { id: makeId(), rarity: 'epic', description: 'Esprit superieur', effects: '', weight: 0, healthMod: 0, mentalMod: 0, armorMod: 0, astraMod: 0, enduranceMod: 0, strengthMod: 0, agilityMod: 0, intelligenceMod: 4, astraMasteryMod: 0, charismaMod: 0, wisdomMod: 0, luckMod: 0, perceptionMod: 0 },
    ];
    // Armes : 3 lignes
    base.weapons = [
        { id: makeId(), rarity: 'common', name: 'Dague', type: 'Corps a corps', damage: '1d4+0', range: 'Melee', hasAmmo: false, ammo: 0, maxAmmo: 0, magazines: 0, tags: [], effects: '', weight: 0.5 },
        { id: makeId(), rarity: 'rare', name: 'Arc court', type: 'Distance', damage: '1d8+2', range: '30m', hasAmmo: true, ammo: 20, maxAmmo: 20, magazines: 3, tags: [], effects: 'Portee 30m', weight: 1.0 },
        { id: makeId(), rarity: 'epic', name: 'Sabre laser', type: 'Corps a corps', damage: '2d8+5', range: 'Melee', hasAmmo: false, ammo: 0, maxAmmo: 0, magazines: 0, tags: ['brulure'], effects: 'Brulure', weight: 1.5 },
    ];
    // Inventaire : 4 lignes
    base.inventory.items = [
        { id: makeId(), rarity: 'common', description: 'Potion de soin', quantity: 3, effect: 'Restaure 2d4+2 PV', weightPerItem: 0.2 },
        { id: makeId(), rarity: 'common', description: 'Rations', quantity: 10, effect: '', weightPerItem: 0.5 },
        { id: makeId(), rarity: 'rare', description: 'Antidote', quantity: 2, effect: 'Soigne poison', weightPerItem: 0.1 },
        { id: makeId(), rarity: 'epic', description: "Cristal d'astra", quantity: 1, effect: '+1 astra max', weightPerItem: 0.05 },
    ];
    // Compétences : 4 lignes
    base.skills = [
        { id: makeId(), name: 'Athletisme', tags: 'Physique', type: 'Active', level: 2, actionRequired: 'oui_avec_action, ne_bloquera_pas_attaque', effect: '+2 Force temporaire', astraCost: 0, dependentStat: 'strength' },
        { id: makeId(), name: 'Discretion', tags: 'Physique', type: 'Active', level: 3, actionRequired: 'oui_avec_action', effect: 'Cache si pas observe', astraCost: 0, dependentStat: 'agility' },
        { id: makeId(), name: 'Arcanes', tags: 'Magie', type: 'Active', level: 4, actionRequired: 'oui_avec_action, ne_bloquera_pas_attaque', effect: 'Lance un sort', astraCost: 5, dependentStat: 'intelligence' },
        { id: makeId(), name: 'Medecine', tags: 'Connaissance', type: 'Active', level: 2, actionRequired: 'oui_sans_action', effect: 'Stabilise un blesse', astraCost: 0, dependentStat: 'wisdom' },
    ];
    base.stats.health = { current: 12, max: 24 };
    base.stats.mental = { current: 18, max: 24 };
    return base;
}

export const CharacterSheetTestHarness: React.FC = () => {
    const mode: 'light' | 'dark' = 'dark';
    const muiTheme = useMemo(() => createAppMuiTheme(mode), [mode]);
    const [character, setCharacter] = useState<CharacterDocument>(() => buildTestCharacter());
    const [open, setOpen] = useState(true);

    return (
        <ThemeProvider theme={muiTheme}>
            <CssBaseline />
            <div style={{ minHeight: '100vh', background: 'var(--md-sys-color-background, #1a1a1a)' }}>
                {open && (
                    <CharacterSheetDialog
                        character={character}
                        initialFileName="Test-Reorder"
                        onClose={() => setOpen(false)}
                        onSave={(c) => { setCharacter(c); }}
                        statSuccessDivisor={5}
                        successModifierMin={-10}
                        successModifierMax={15}
                        vitalsCriticalThresholdPercent={25}
                        vitalsWeightHealth={1}
                        vitalsWeightMental={1}
                    />
                )}
                {!open && (
                    <div style={{ padding: 24 }}>
                        <h2>Test harness : dialogue fermé.</h2>
                        <pre style={{ color: '#fff', fontSize: 12, maxHeight: 400, overflow: 'auto' }}>
                            {JSON.stringify(character.equipment.map(e => e.description), null, 2)}
                        </pre>
                        <button onClick={() => setOpen(true)}>Rouvrir</button>
                    </div>
                )}
            </div>
        </ThemeProvider>
    );
};
