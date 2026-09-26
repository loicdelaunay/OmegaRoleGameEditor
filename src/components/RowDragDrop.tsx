/**
 * Helpers partagés pour le réordonnancement par drag-and-drop des
 * lignes des tableaux de la fiche de personnage (Équipement, Modificateurs,
 * Armes, Inventaire, Compétences).
 *
 * Le HTML5 Drag & Drop API est utilisée pour rester 100% compatible avec
 * l'environnement navigateur (pas de dépendance supplémentaire).
 *
 * Architecture :
 * - `useRowDragDrop<T>(items, getId, reorder, rowIndex)` retourne un set
 *   de handlers / props.
 * - `<DraggableRow>` est un wrapper de ligne (HTML `<tr>` ou `<div>`) qui
 *   encapsule le hook et fournit les `handleProps` (à coller sur la
 *   poignée) et les `rowProps` (à coller sur la ligne) à ses enfants
 *   via un Context React. C'EST CE WRAPPER QU'IL FAUT UTILISER dans
 *   un `.map()` : appeler `useRowDragDrop` directement dans un `.map()`
 *   viole les règles des hooks (le nombre de hooks varie si la liste
 *   grandit/réduit).
 * - `<RowDragHandle>` consomme le Context et applique automatiquement
 *   les `handleProps` (dont `draggable={true}` et les `onDragStart` /
 *   `onDragEnd`). La poignée est le SEUL élément `draggable` de la ligne
 *   : c'est ce qui garantit que le drag HTML5 démarre bien (cf. note
 *   dans le hook).
 * - `<RowDeleteButton>` est un petit bouton corbeille aligné à droite.
 *
 * Pourquoi la poignée (et pas la ligne) est l'élément `draggable` ?
 * Si on met `draggable={true}` sur le `<tr>` et que l'utilisateur
 * clique sur un enfant interactif (`<input>`, `<select>`, élément
 * avec `role="button"` / `tabIndex={0}`, etc.), de nombreux navigateurs
 * n'arrivent pas à démarrer le drag natif car ils interprètent le
 * mousedown comme le début d'une interaction avec l'enfant. En ne
 * rendant draggable QUE la poignée (un `<span>` neutre, sans rôle
 * cliquable ni tabIndex), on garantit que tout mousedown dessus
 * démarre systématiquement un drag HTML5.
 */
import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { GripVertical, Trash2 } from 'lucide-react';
import { Tooltip } from '@mui/material';

/** Format d'identifiant générique. */
type Id = string | number;

/**
 * Props à spreader sur la poignée draggable (l'élément `.row-drag-handle`).
 * Contient `draggable={true}` et les handlers de début/fin de drag.
 */
export interface RowDragHandleProps {
    draggable: true;
    onDragStart: (e: React.DragEvent) => void;
    onDragEnd: (e: React.DragEvent) => void;
}

/** Contexte fourni par `<DraggableRow>` à ses enfants. */
const RowDragContext = createContext<{
    handleProps: RowDragHandleProps;
} | null>(null);

/**
 * Réordonne un tableau : retire l'élément à `from` et l'insère à `to`.
 * Renvoie un nouveau tableau (immutable) ou le même si invalide.
 */
export function moveRow<T>(arr: T[], from: number, to: number): T[] {
    if (from === to) return arr;
    if (from < 0 || from >= arr.length) return arr;
    if (to < 0 || to >= arr.length) return arr;
    const next = arr.slice();
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
}

/**
 * Hook réutilisable : à utiliser dans le composant de ligne.
 *
 * @param items      liste actuelle des items
 * @param getId      extrait l'identifiant unique d'un item
 * @param reorder    callback(fromId, toIndex) appliqué au drop
 * @param rowIndex   index de cette ligne dans `items`
 *
 * Retourne un objet avec :
 *  - `handleProps` : à spreader sur la poignée `.row-drag-handle`
 *                    (c'est LUI qui porte l'attribut `draggable`)
 *  - `rowProps` : à spreader sur le `<tr>` / `<div>` de la ligne
 *                 (uniquement les handlers de drop)
 *  - `isDraggingThisRow` : vrai pour la ligne en cours de drag
 *  - `dropIndicator` : 'above' | 'below' | null (pour cette ligne)
 *
 * Pourquoi la poignée est l'élément draggable et pas la ligne ?
 * Si on met `draggable={true}` sur le `<tr>` et que l'utilisateur
 * clique sur un enfant interactif (`<input>`, `<select>`, élément
 * avec `role="button"`, etc.), de nombreux navigateurs n'arrivent
 * pas à démarrer le drag natif car ils interprètent le mousedown
 * comme le début d'une interaction avec l'enfant. En ne rendant
 * draggable QUE la poignée (un `<span>` neutre, sans rôle cliquable),
 * on garantit que tout mousedown dessus démarre systématiquement
 * un drag HTML5.
 */
export function useRowDragDrop<T>(
    items: T[],
    getId: (item: T) => Id,
    reorder: (fromId: Id, toIndex: number) => void,
    rowIndex: number,
) {
    const [dragState, setDragState] = useState<{
        draggingId: Id;
        hoverIndex: number;
        dropPos: 'above' | 'below';
    } | null>(null);

    const isDraggingThisRow =
        dragState != null && items[rowIndex] != null && getId(items[rowIndex]) === dragState.draggingId;

    const dropIndicator: 'above' | 'below' | null =
        dragState != null && dragState.hoverIndex === rowIndex ? dragState.dropPos : null;

    const onDragStart = useCallback(
        (e: React.DragEvent) => {
            const id = getId(items[rowIndex]);
            e.dataTransfer.effectAllowed = 'move';
            try {
                e.dataTransfer.setData('text/plain', String(id));
            } catch {
                // Certains navigateurs refusent le setData si la drag n'est
                // pas « légitime » : on tente quand même, ça n'est pas bloquant.
            }
            setDragState({ draggingId: id, hoverIndex: rowIndex, dropPos: 'above' });
        },
        [getId, items, rowIndex],
    );

    const onDragOver = useCallback(
        (e: React.DragEvent) => {
            // Si le drag vient d'une autre fenêtre / d'une autre ligne, on
            // accepte le drop (dataTransfer.types contient 'text/plain').
            // Si le drag vient de cette même instance de tableau, on
            // dispose de `dragState` qui nous donne l'identifiant.
            if (dragState == null && !Array.from(e.dataTransfer.types).includes('text/plain')) {
                return;
            }
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const midY = rect.top + rect.height / 2;
            const pos: 'above' | 'below' = e.clientY < midY ? 'above' : 'below';
            if (dragState && (dragState.hoverIndex !== rowIndex || dragState.dropPos !== pos)) {
                setDragState({ ...dragState, hoverIndex: rowIndex, dropPos: pos });
            }
        },
        [dragState, rowIndex],
    );

    const onDragLeave = useCallback((e: React.DragEvent) => {
        // Ignore les leave quand on passe d'un enfant à l'autre de la même ligne
        const related = e.relatedTarget as Node | null;
        if (related && e.currentTarget.contains(related)) return;
        setDragState(prev => (prev ? { ...prev, hoverIndex: -1, dropPos: 'above' } : prev));
    }, []);

    const onDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const midY = rect.top + rect.height / 2;
            const pos: 'above' | 'below' = e.clientY < midY ? 'above' : 'below';
            let fromId: Id | null = null;
            if (dragState) {
                fromId = dragState.draggingId;
            } else {
                const raw = e.dataTransfer.getData('text/plain');
                if (raw) fromId = isNaN(Number(raw)) ? raw : Number(raw);
            }
            if (fromId == null) {
                setDragState(null);
                return;
            }
            const fromIndex = items.findIndex(i => getId(i) === fromId);
            if (fromIndex < 0) {
                setDragState(null);
                return;
            }
            let toIndex = pos === 'above' ? rowIndex : rowIndex + 1;
            // Si on déplace vers le bas, retirer 1 car la suppression de l'item
            // d'origine décale les index à partir de fromIndex.
            if (fromIndex < toIndex) toIndex -= 1;
            reorder(fromId, toIndex);
            setDragState(null);
        },
        [dragState, getId, items, reorder, rowIndex],
    );

    const onDragEnd = useCallback(() => {
        setDragState(null);
    }, []);

    return {
        isDraggingThisRow,
        dropIndicator,
        handleProps: {
            draggable: true as const,
            onDragStart,
            onDragEnd,
        },
        rowProps: {
            onDragOver,
            onDragLeave,
            onDrop,
        },
    };
}

/**
 * Petite poignée « ⋮⋮ » affichée dans la colonne d'actions.
 *
 * Cette poignée est le SEUL élément `draggable` de la ligne. Elle
 * récupère automatiquement ses props drag depuis le `<DraggableRow>`
 * parent via un Context React. Il n'y a rien à spreader manuellement.
 *
 * Pas de `role="button"`, pas de `tabIndex` : la poignée doit être
 * neutre pour que le navigateur démarre systématiquement le drag
 * HTML5 (cf. note d'architecture en haut du fichier).
 */
export const RowDragHandle: React.FC<{
    label?: string;
}> = ({ label = 'Glisser pour réorganiser' }) => {
    const ctx = useContext(RowDragContext);
    const noop = useCallback((_e: React.DragEvent) => undefined, []);
    const handleProps: RowDragHandleProps = ctx?.handleProps ?? {
        // Cas de repli : si la poignée est utilisée en dehors d'un
        // DraggableRow, on n'attache pas de drag (mais l'icône reste
        // visible pour signaler la fonctionnalité).
        draggable: true,
        onDragStart: noop,
        onDragEnd: noop,
    };
    return (
        <Tooltip title={label} placement="left" arrow enterDelay={300}>
            <span
                className="row-drag-handle"
                aria-label={label}
                {...handleProps}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'grab',
                    padding: '2px',
                    userSelect: 'none',
                    touchAction: 'none',
                }}
            >
                <GripVertical size={16} color="var(--md-sys-color-on-surface-variant)" />
            </span>
        </Tooltip>
    );
};

/** Bouton corbeille compact pour la colonne d'actions. */
export const RowDeleteButton: React.FC<{
    onClick: () => void;
    disabled?: boolean;
    label?: string;
}> = ({ onClick, disabled, label = 'Supprimer la ligne' }) => (
    <Tooltip title={label} placement="left" arrow enterDelay={300}>
        <span>
            <button
                type="button"
                className="ghost compact-icon-button"
                onClick={onClick}
                disabled={disabled}
                aria-label={label}
                style={{ padding: '2px' }}
            >
                <Trash2 size={14} color={disabled ? 'var(--md-sys-color-outline)' : 'var(--md-sys-color-error)'} />
            </button>
        </span>
    </Tooltip>
);

/**
 * Wrapper de ligne draggable. À utiliser dans un `.map()` à la place
 * d'un `<tr>` ou `<div>` nu : il encapsule l'appel à `useRowDragDrop`
 * (qui DOIT être appelé au top-level d'un composant, jamais dans une
 * boucle, sinon React lève « Rendered more hooks than during the
 * previous render »).
 *
 * Le wrapper fournit à ses enfants un Context contenant les
 * `handleProps` à spreader sur la poignée `<RowDragHandle>`. La
 * poignée est ainsi automatiquement rendue `draggable` et équipée
 * des bons handlers.
 *
 * @param as          'tr' (par défaut, pour les `<table>`) ou 'div' (grille inventaire)
 * @param items       liste complète (passée au hook pour qu'il connaisse
 *                    la position de la ligne dans le tableau)
 * @param rowIndex    index de CETTE ligne dans `items`
 * @param getId       extracteur d'identifiant
 * @param reorder     callback(fromId, toIndex) appliqué au drop
 * @param className   classes CSS additionnelles appliquées à la ligne
 * @param children    cellules de la ligne (`<td>` ou éléments)
 */
export const DraggableRow = <T,>(props: {
    as?: 'tr' | 'div';
    items: T[];
    rowIndex: number;
    getId: (item: T) => string | number;
    reorder: (fromId: string | number, toIndex: number) => void;
    className?: string;
    style?: React.CSSProperties;
    children: React.ReactNode;
    rowKey?: string | number;
}) => {
    const { as = 'tr', items, rowIndex, getId, reorder, className, style, children } = props;
    const dnd = useRowDragDrop(items, getId, reorder, rowIndex);
    const finalClass = useMemo(() => {
        const parts = ['char-row'];
        if (dnd.isDraggingThisRow) parts.push('is-dragging');
        if (dnd.dropIndicator) parts.push(`drop-${dnd.dropIndicator}`);
        if (className) parts.push(className);
        return parts.join(' ');
    }, [dnd.isDraggingThisRow, dnd.dropIndicator, className]);
    const contextValue = useMemo(() => ({ handleProps: dnd.handleProps }), [dnd.handleProps]);
    if (as === 'div') {
        return (
            <div className={`char-row-grid ${finalClass}`.trim()} style={style} {...dnd.rowProps}>
                <RowDragContext.Provider value={contextValue}>
                    {children}
                </RowDragContext.Provider>
            </div>
        );
    }
    return (
        <tr className={finalClass} style={style} {...dnd.rowProps}>
            <RowDragContext.Provider value={contextValue}>
                {children}
            </RowDragContext.Provider>
        </tr>
    );
};
