import React, { useCallback, useEffect, useRef, useState } from 'react';
import './table-column-resize.css';

export interface TableColumnResizeProps {
    /**
     * Table `<table>` element sur lequel la variable CSS doit être pilotée.
     * Pendant le drag, on écrit la nouvelle largeur directement dans
     * `table.style.setProperty('--col-<key>-width', 'Npx')` pour un feedback
     * visuel instantané, sans passer par React (perf : 1 écriture par
     * event mousemove, pas de re-render).
     * Au relâchement, on appelle `onCommit` pour persister dans le state
     * (et donc dans le JSON).
     */
    tableRef: React.RefObject<HTMLTableElement | null>;
    /** Clé de la colonne (sert à nommer la variable CSS `--col-<key>-width`). */
    columnKey: string;
    /** Largeur courante (en px ou %), utilisée comme point de départ du drag. */
    currentWidth: number | string;
    /** Borne minimum (en px). (obsolète) */
    min?: number;
    /** Borne minimum configurée par l'utilisateur (en px ou string parsé). Précède `min` si définie. */
    userMin?: number;
    /** Borne maximum (en px). (obsolète) */
    max?: number;
    /** Appelée au relâchement avec la largeur finale (clampée dans [min, max]). */
    onCommit: (finalWidth: number) => void;
    /** Appelée au clic avec CTRL enfoncé. */
    onSettingsOpen?: () => void;
    /** Désactive le handle (utilisé en readOnly). */
    disabled?: boolean;
    /** Étiquette accessible (aria-label + title). */
    label: string;
}

/**
 * Poignée de redimensionnement de colonne (pattern M3 + UX tableurs).
 *
 * Rendu : un petit `<div>` positionné en absolu sur le bord droit de la
 * cellule `<th>` parente (`position: relative` côté CSS). Au survol, le
 * curseur passe à `col-resize` et la poignée devient visible. Au
 * mousedown, on capture la souris (`setPointerCapture`) et on suit le
 * mouvement pour ajuster la largeur en temps réel via une variable CSS
 * sur le `<table>`.
 *
 * Le drag n'écrit QUE dans le DOM (style CSS variable), pas dans le
 * state React → zéro re-render pendant le drag = 60fps même sur des
 * tables très larges. La persistance dans le state (et donc le JSON
 * sauvegardé) n'a lieu qu'au relâchement via `onCommit`.
 *
 * Le touch est supporté via les Pointer Events (unifie souris + tactile
 * + stylet), conformément aux bonnes pratiques M3.
 *
 * @example
 *   // Dans une <th> :
 *   <th style={{ position: 'relative' }}>
 *     Description
 *     <TableColumnResize
 *       tableRef={tableRef}
 *       columnKey="description"
 *       currentWidth={widths.description ?? 160}
 *       min={80}
 *       max={400}
 *       onCommit={(w) => setWidths(prev => ({ ...prev, description: w }))}
 *       label="Redimensionner la colonne Description"
 *     />
 *   </th>
 */
export const TableColumnResize: React.FC<TableColumnResizeProps> = ({
    tableRef,
    columnKey,
    currentWidth,
    min,
    userMin,
    max,
    onCommit,
    onSettingsOpen,
    disabled = false,
    label,
}) => {
    const handleRef = useRef<HTMLDivElement | null>(null);
    /** Largeur de départ du drag (pour calculer le delta). */
    const startWidthRef = useRef<number>(typeof currentWidth === 'number' ? currentWidth : 100);
    /** Position X de départ (pour calculer le delta). */
    const startXRef = useRef<number>(0);
    /** Indique si un drag est en cours (utilisé pour l'état visuel + pour
     *  bypasser le `<th>` qui pourrait avoir d'autres handlers). */
    const [isDragging, setIsDragging] = useState(false);

    const cssVarName = `--col-${columnKey}-width`;

    /** Clamp la largeur pour ne pas être négative, on respecte userMin si défini, sinon min, sinon 0. */
    const clamp = useCallback(
        (w: number) => {
            const effectiveMin = userMin !== undefined ? userMin : (min ?? 0);
            return Math.max(effectiveMin, Math.round(w));
        },
        [userMin, min],
    );

    /**
     * Démarre le drag : capture la position X initiale et la largeur
     * initiale. On utilise `setPointerCapture` pour recevoir tous les
     * events même si la souris sort de la poignée (UX standard tableurs).
     */
    const handlePointerDown = useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            if (disabled) return;
            // Bloque la sélection de texte et autres comportements par défaut.
            e.preventDefault();
            e.stopPropagation();
            const handle = handleRef.current;
            if (!handle) return;
            // setPointerCapture peut échouer si aucun pointer actif n'est
            // associé à e.pointerId (ex: PointerEvent synthétique, ou si
            // un autre handler a déjà released le capture). On tolère
            // l'échec silencieusement — sans capture, on retombera sur
            // les events de window pendant le drag, ce qui est
            // parfaitement fonctionnel (juste moins "robuste" si la souris
            // sort du handle).
            try {
                handle.setPointerCapture(e.pointerId);
            } catch {
                // noop
            }
            // Si currentWidth est un %, on récupère la taille en px calculée par le navigateur
            // pour garantir un drag fluide.
            let startPx = typeof currentWidth === 'number' ? currentWidth : 100;
            if (typeof currentWidth === 'string' && handle) {
                const parentRect = handle.parentElement?.getBoundingClientRect();
                if (parentRect) {
                    startPx = parentRect.width;
                }
            }

            startWidthRef.current = startPx;
            startXRef.current = e.clientX;
            setIsDragging(true);
        },
        [currentWidth, disabled],
    );

    const handleClick = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            if (disabled) return;
            if (e.ctrlKey && onSettingsOpen) {
                e.preventDefault();
                e.stopPropagation();
                onSettingsOpen();
            }
        },
        [disabled, onSettingsOpen]
    );

    /**
     * Pendant le drag : on calcule la nouvelle largeur (largeur de
     * départ + delta X), on la clamp, et on l'écrit dans la variable
     * CSS du `<table>`. Aucune écriture dans le state React → pas de
     * re-render → drag fluide à 60fps.
     */
    const handlePointerMove = useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            if (!isDragging) return;
            const table = tableRef.current;
            if (!table) return;
            const delta = e.clientX - startXRef.current;
            const newWidth = clamp(startWidthRef.current + delta);
            table.style.setProperty(cssVarName, `${newWidth}px`);
        },
        [clamp, cssVarName, isDragging, tableRef],
    );

    /**
     * Fin du drag : on relit la valeur DOM pour récupérer la largeur
     * finale (au cas où un dernier event aurait été coalescé), on
     * libère le pointer capture, et on appelle `onCommit` pour
     * persister la nouvelle largeur dans le state React (= JSON).
     */
    const handlePointerUp = useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            if (!isDragging) return;
            const handle = handleRef.current;
            if (handle && handle.hasPointerCapture(e.pointerId)) {
                handle.releasePointerCapture(e.pointerId);
            }
            const table = tableRef.current;
            let finalWidth = startWidthRef.current;
            if (table) {
                // Lecture directe depuis la variable CSS qu'on vient de
                // écrire pendant le drag (single source of truth).
                const inline = table.style.getPropertyValue(cssVarName).trim();
                if (inline.endsWith('px')) {
                    const parsed = parseFloat(inline);
                    if (Number.isFinite(parsed)) finalWidth = parsed;
                }
            }
            finalWidth = clamp(finalWidth);
            setIsDragging(false);
            onCommit(finalWidth);
        },
        [clamp, cssVarName, isDragging, onCommit, tableRef],
    );

    /**
     * Annulation du drag (Escape, perte de focus, etc.) : on restaure
     * la largeur de départ et on libère le pointer capture, sans
     * appeler `onCommit`. Cela évite de polluer le state avec une
     * largeur "à mi-chemin" si l'utilisateur change d'avis.
     */
    const handlePointerCancel = useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            if (!isDragging) return;
            const handle = handleRef.current;
            if (handle && handle.hasPointerCapture(e.pointerId)) {
                handle.releasePointerCapture(e.pointerId);
            }
            const table = tableRef.current;
            if (table) {
                // Restaure la largeur de départ (celle du state).
                table.style.setProperty(cssVarName, `${clamp(startWidthRef.current)}px`);
            }
            setIsDragging(false);
        },
        [clamp, cssVarName, isDragging, tableRef],
    );

    /**
     * Double-clic sur la poignée : remet la colonne à sa largeur par
     * défaut. Convention standard des tableurs (Excel, Google Sheets).
     * `default` n'est pas une prop → on remet la valeur de départ du
     * drag (= `currentWidth` au moment du mousedown, qui est la
     * largeur visible avant le drag). Pour reset "vrai" (à la valeur
     * définie dans `MOD_TABLE_COLUMN_DEFS`), le MJ peut double-cliquer
     * puis re-saisir la valeur voulue, ou simplement recharger la
     * fiche (les largeurs custom sont stockées en JSON, pas les
     * défauts). Ce comportement est intentionnel et aligné sur les
     * tableurs.
     *
     * Note : on utilise `onCommit(clamp(currentWidth))` pour respecter
     * le contrat de l'API (toujours passer par le clamp). Si
     * `currentWidth` est déjà dans les bornes, c'est un no-op effectif.
     */
    const handleDoubleClick = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            if (disabled) return;
            e.preventDefault();
            e.stopPropagation();
            // Reset à la largeur par défaut de la définition : on doit
            // pour cela connaître le `default` du ColumnWidthDef, mais
            // ici on n'a que `currentWidth`. Le composant parent
            // (CharacterSheetDialog) peut donc gérer un double-clic
            // custom au niveau du <th> ; ici on se contente d'aligner
            // sur la valeur courante déjà persistée (= no-op visible).
            onCommit(clamp(startWidthRef.current));
        },
        [clamp, disabled, onCommit],
    );

    // Empêche le menu contextuel (clic droit) sur la poignée pour
    // éviter les "Reset column" natifs du navigateur qui pourraient
    // interférer avec notre UX.
    useEffect(() => {
        const node = handleRef.current;
        if (!node) return;
        const onContext = (e: MouseEvent) => {
            e.preventDefault();
        };
        node.addEventListener('contextmenu', onContext);
        return () => node.removeEventListener('contextmenu', onContext);
    }, []);

    // Pendant un drag, on ajoute la classe `is-resizing-table` sur
    // <body> pour forcer le curseur `col-resize` partout dans le
    // document (cf. CSS `.is-resizing-table`). Sans cela, le curseur
    // peut "flicker" en curseur par défaut quand la souris quitte la
    // poignée, même si `setPointerCapture` continue de recevoir les
    // events. On utilise `useEffect` plutôt que de poser la classe
    // dans le handler pour qu'elle soit nettoyée même si le composant
    // est démonté en plein drag.
    useEffect(() => {
        if (!isDragging) return;
        const prev = document.body.className;
        document.body.classList.add('is-resizing-table');
        return () => {
            document.body.classList.remove('is-resizing-table');
            // Restaure la classe d'origine au cas où un autre code
            // s'appuierait dessus (sécurité, normalement prev === prev).
            if (prev) document.body.className = prev;
        };
    }, [isDragging]);

    return (
        <div
            ref={handleRef}
            className={`table-col-resize-handle${isDragging ? ' is-dragging' : ''}${disabled ? ' is-disabled' : ''}`}
            role="separator"
            aria-orientation="vertical"
            aria-label={label}
            aria-valuenow={typeof currentWidth === 'number' ? currentWidth : undefined}
            aria-valuemin={min}
            aria-valuemax={max}
            tabIndex={disabled ? -1 : 0}
            title={label}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            onDoubleClick={handleDoubleClick}
            onClick={handleClick}
            draggable={false}
            // Bloque la sélection de texte si le drag démarre sur la poignée
            // et que la souris sort de l'élément avant pointerdown (edge case).
            onDragStart={(e) => e.preventDefault()}
        />
    );
};

export default TableColumnResize;
