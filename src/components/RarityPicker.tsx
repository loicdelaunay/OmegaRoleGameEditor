import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Tooltip } from '@mui/material';
import { RARITY_OPTIONS, RARITY_META, type Rarity } from '../lib/character';
import './rarity-picker.css';

export interface RarityPickerProps {
    /** Rareté actuelle. Si `undefined`, on affiche un placeholder. */
    value: Rarity | undefined;
    /** Callback appelé quand l'utilisateur choisit une rareté. */
    onChange: (rarity: Rarity) => void;
    /** Désactive le sélecteur. */
    disabled?: boolean;
    /** Titre (tooltip + aria-label). */
    title?: string;
}

/**
 * Sélecteur de rareté compact (Material Design 3).
 *
 * - **État fermé** (lecture) : on affiche UNIQUEMENT la pastille de
 *   couleur, centrée. Si aucune rareté n'est sélectionnée, on affiche
 *   un tiret « — » discret.
 * - **État ouvert** (édition) : un popover liste les 7 raretés avec,
 *   pour chacune, la pastille + le libellé (ex. « Commun »).
 *
 * Le popover est rendu via un React Portal au niveau du <body> pour
 * échapper à l'overflow et au contexte d'empilement de la table parente
 * (sinon il est tronqué par les <td>).
 */
export const RarityPicker: React.FC<RarityPickerProps> = ({
    value,
    onChange,
    disabled = false,
    title = 'Rareté',
}) => {
    const [open, setOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const popoverRef = useRef<HTMLDivElement | null>(null);
    // Position absolue du popover en coordonnées viewport, recalculée à
    // chaque ouverture / scroll / resize.
    const [popoverPos, setPopoverPos] = useState<{ top: number; left: number; minWidth: number } | null>(null);
    const meta = value ? RARITY_META[value] : null;
    const tooltip = meta ? `${title} : ${meta.label}` : title;

    // Ferme le popover au clic en dehors ou sur Escape
    useEffect(() => {
        if (!open) return;
        function handleClickOutside(e: MouseEvent) {
            const target = e.target as Node;
            if (
                popoverRef.current && !popoverRef.current.contains(target) &&
                triggerRef.current && !triggerRef.current.contains(target)
            ) {
                setOpen(false);
            }
        }
        function handleEscape(e: KeyboardEvent) {
            if (e.key === 'Escape') setOpen(false);
        }
        function handleScroll() {
            // Re-positionne si la table scrolle
            recomputePosition();
        }
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        window.addEventListener('scroll', handleScroll, true);
        window.addEventListener('resize', handleScroll);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
            window.removeEventListener('scroll', handleScroll, true);
            window.removeEventListener('resize', handleScroll);
        };
    }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

    function recomputePosition() {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        setPopoverPos({
            top: rect.bottom + 4,
            left: rect.left,
            minWidth: Math.max(180, rect.width),
        });
    }

    // Recalcule la position dès l'ouverture (et à chaque rendu pendant qu'on
    // est ouvert, au cas où la taille de la cellule changerait).
    useLayoutEffect(() => {
        if (open) {
            recomputePosition();
        } else {
            setPopoverPos(null);
        }
    }, [open]);

    function selectValue(r: Rarity) {
        onChange(r);
        setOpen(false);
    }

    return (
        <>
            <Tooltip
                title={tooltip}
                placement="top"
                arrow
                enterDelay={200}
                leaveDelay={0}
                disableInteractive
                // On évite le tooltip quand le popover est ouvert : il ferait
                // doublon visuel avec l'option "active" surlignée. On utilise
                // `disableHoverListener`/`disableFocusListener` (plutôt qu'un
                // `open` contrôlé) pour que MUI garde la gestion native de
                // l'affichage au survol : le tooltip se ferme dès que la
                // souris quitte l'élément, sans rester bloqué "ouvert" quand
                // l'utilisateur clique ailleurs pour fermer le popover.
                disableHoverListener={open}
                disableFocusListener={open}
                disableTouchListener={open}
            >
                <button
                    ref={triggerRef}
                    type="button"
                    className={`rarity-picker-trigger ${open ? 'rarity-picker-trigger--open' : ''} ${meta ? 'rarity-picker-trigger--set' : 'rarity-picker-trigger--unset'}`}
                    onClick={() => !disabled && setOpen((o) => !o)}
                    disabled={disabled}
                    aria-label={tooltip}
                    aria-haspopup="listbox"
                    aria-expanded={open}
                >
                    {meta ? (
                        <span
                            className="rarity-picker-dot"
                            style={{ background: meta.color, boxShadow: `0 0 0 2px ${meta.color}33` }}
                            aria-hidden
                        />
                    ) : (
                        <span className="rarity-picker-placeholder" aria-hidden>—</span>
                    )}
                </button>
            </Tooltip>

            {open && popoverPos && createPortal(
                <div
                    ref={popoverRef}
                    className="rarity-picker-popover"
                    role="listbox"
                    aria-label={title}
                    style={{
                        top: popoverPos.top,
                        left: popoverPos.left,
                        minWidth: popoverPos.minWidth,
                    }}
                >
                    <button
                        type="button"
                        className={`rarity-picker-option ${!value ? 'rarity-picker-option--active' : ''}`}
                        onClick={() => { onChange('common' as Rarity); setOpen(false); }}
                        role="option"
                        aria-selected={!value}
                        title="Non définie — clique pour remettre à Commun"
                    >
                        <span className="rarity-picker-option-dot rarity-picker-option-dot--unset" aria-hidden />
                        <span className="rarity-picker-option-label">— (non définie)</span>
                    </button>
                    {RARITY_OPTIONS.map((opt) => {
                        const m = RARITY_META[opt.value];
                        const isActive = value === opt.value;
                        return (
                            <button
                                key={opt.value}
                                type="button"
                                className={`rarity-picker-option ${isActive ? 'rarity-picker-option--active' : ''}`}
                                onClick={() => selectValue(opt.value)}
                                role="option"
                                aria-selected={isActive}
                                title={m.label}
                            >
                                <span
                                    className="rarity-picker-option-dot"
                                    style={{ background: m.color, boxShadow: `0 0 0 2px ${m.color}33` }}
                                    aria-hidden
                                />
                                <span className="rarity-picker-option-label">{m.label}</span>
                            </button>
                        );
                    })}
                </div>,
                document.body
            )}
        </>
    );
};

/**
 * Pastille de rareté (lecture seule). À utiliser dans les en-têtes de
 * table et les cellules quand l'utilisateur n'a pas besoin d'éditer.
 */
export const RarityDot: React.FC<{ value: Rarity | undefined; size?: number }> = ({ value, size = 12 }) => {
    if (!value) return <span className="rarity-dot rarity-dot--unset" style={{ width: size, height: size }} aria-hidden />;
    const meta = RARITY_META[value];
    return (
        <span
            className="rarity-dot"
            style={{ background: meta.color, width: size, height: size, boxShadow: `0 0 0 2px ${meta.color}33` }}
            title={meta.label}
            aria-label={meta.label}
        />
    );
};

export default RarityPicker;
