import React, { useState, useRef, useEffect } from 'react';
import './column-width-editor.css';
import { SlidersHorizontal, RotateCcw } from 'lucide-react';

/**
 * Définition d'une colonne éditable : identifiant, libellé français et
 * valeur par défaut (en px). L'ordre est important : il détermine l'ordre
 * d'affichage dans le popover.
 */
export interface ColumnWidthDef {
    /** Clé unique, utilisée comme index dans `widths`. */
    key: string;
    /** Libellé français affiché dans le popover. */
    label: string;
    /** Largeur CSS par défaut (si non surchargée par l'utilisateur). */
    default: number;
    /** Largeur minimum autorisée (slider). */
    min: number;
    /** Largeur maximum autorisée (slider). */
    max: number;
}

export interface ColumnWidthsState {
    [key: string]: number | string | undefined;
}

export interface ColumnWidthEditorProps {
    /** Définition des colonnes éditables. */
    columns: ColumnWidthDef[];
    /** Largeurs actuelles (en px). `undefined` = utiliser la valeur par défaut. */
    widths: ColumnWidthsState;
    /** Callback appelé à chaque modification. */
    onChange: (widths: ColumnWidthsState) => void;
    /** Libellé du bouton d'ouverture (par défaut "Largeur des colonnes"). */
    buttonLabel?: string;
    /** Désactive le bouton + popover. */
    disabled?: boolean;
}

/**
 * Petit bouton + popover (Material Design 3) qui permet d'ajuster
 * la largeur de chaque colonne d'une table via un slider.
 *
 * M3 styling : surface élevée, divider, slider MUI, bouton de réinitialisation.
 */
export const ColumnWidthEditor: React.FC<ColumnWidthEditorProps> = ({
    columns,
    widths,
    onChange,
    buttonLabel = 'Largeur des colonnes',
    disabled = false,
}) => {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);

    // Ferme le popover au clic en dehors
    useEffect(() => {
        if (!open) return;
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        function handleEscape(e: KeyboardEvent) {
            if (e.key === 'Escape') setOpen(false);
        }
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [open]);

    function setWidth(key: string, value: number) {
        onChange({ ...widths, [key]: value });
    }

    function resetAll() {
        onChange({});
    }

    function resetColumn(key: string) {
        const next = { ...widths };
        delete next[key];
        onChange(next);
    }

    return (
        <div className="col-width-editor" ref={containerRef}>
            <button
                type="button"
                className="ghost col-width-trigger"
                onClick={() => setOpen((o) => !o)}
                disabled={disabled}
                title={buttonLabel}
                aria-label={buttonLabel}
                aria-expanded={open}
            >
                <SlidersHorizontal size={14} />
                <span>{buttonLabel}</span>
            </button>

            {open && (
                <div className="col-width-popover" role="dialog" aria-label={buttonLabel}>
                    <div className="col-width-popover-header">
                        <span className="col-width-popover-title">{buttonLabel}</span>
                        <button
                            type="button"
                            className="ghost col-width-reset-all"
                            onClick={resetAll}
                            title="Réinitialiser toutes les colonnes"
                        >
                            <RotateCcw size={14} />
                            <span>Réinitialiser</span>
                        </button>
                    </div>
                    <div className="col-width-popover-body">
                        {columns.map((col) => {
                            const current = widths[col.key] ?? col.default;
                            const isCustom = widths[col.key] !== undefined;
                            return (
                                <div key={col.key} className="col-width-row">
                                    <div className="col-width-row-header">
                                        <label htmlFor={`cw-${col.key}`} className="col-width-label">
                                            {col.label}
                                        </label>
                                        <div className="col-width-row-actions">
                                            <span className="col-width-value">{current}px</span>
                                            {isCustom && (
                                                <button
                                                    type="button"
                                                    className="ghost col-width-reset"
                                                    onClick={() => resetColumn(col.key)}
                                                    title="Réinitialiser cette colonne"
                                                >
                                                    <RotateCcw size={12} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <input
                                        id={`cw-${col.key}`}
                                        type="range"
                                        min={col.min}
                                        max={col.max}
                                        step={1}
                                        value={current}
                                        className="col-width-slider"
                                        onChange={(e) => setWidth(col.key, parseInt(e.target.value, 10))}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ColumnWidthEditor;
