import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, Typography } from '@mui/material';
import type { ColumnWidthDef, ColumnWidthsState } from './ColumnWidthEditor';

export interface TableColumnSettingsDialogProps {
    open: boolean;
    onClose: () => void;
    title: string;
    columns: ColumnWidthDef[];
    currentWidths: ColumnWidthsState;
    currentMins?: ColumnWidthsState;
    onSave: (newWidths: ColumnWidthsState, newMins: ColumnWidthsState) => void;
    onApplyToAll?: (newWidths: ColumnWidthsState, newMins: ColumnWidthsState) => void;
}

export const TableColumnSettingsDialog: React.FC<TableColumnSettingsDialogProps> = ({
    open,
    onClose,
    title,
    columns,
    currentWidths,
    currentMins,
    onSave,
    onApplyToAll,
}) => {
    // Local state for the widths currently being edited in the dialog
    const [localWidths, setLocalWidths] = useState<Record<string, string>>({});
    const [localMins, setLocalMins] = useState<Record<string, string>>({});
    const [confirmApplyAll, setConfirmApplyAll] = useState(false);

    // Reset local state when dialog opens
    useEffect(() => {
        if (open) {
            const initial: Record<string, string> = {};
            const initialMins: Record<string, string> = {};
            columns.forEach(col => {
                const val = currentWidths[col.key];
                if (val !== undefined) {
                    initial[col.key] = val.toString();
                } else {
                    initial[col.key] = col.default.toString();
                }
                
                const minVal = currentMins?.[col.key];
                if (minVal !== undefined) {
                    initialMins[col.key] = minVal.toString();
                } else if (col.min !== undefined) {
                    initialMins[col.key] = col.min.toString();
                } else {
                    initialMins[col.key] = '0';
                }
            });
            setLocalWidths(initial);
            setLocalMins(initialMins);
        }
    }, [open, columns, currentWidths, currentMins]);

    const handleSave = () => {
        const resultWidths: ColumnWidthsState = {};
        const resultMins: ColumnWidthsState = {};

        const parseVal = (val: string) => {
            if (!val) return undefined;
            if (val.endsWith('%')) return val;
            const num = parseFloat(val);
            return isNaN(num) ? undefined : num;
        };

        Object.keys(localWidths).forEach(key => {
            const val = localWidths[key]?.trim();
            resultWidths[key] = parseVal(val);
        });

        Object.keys(localMins).forEach(key => {
            const val = localMins[key]?.trim();
            resultMins[key] = parseVal(val);
        });

        onSave(resultWidths, resultMins);
        onClose();
    };

    const handleApplyToAll = () => {
        const resultWidths: ColumnWidthsState = {};
        const resultMins: ColumnWidthsState = {};

        const parseVal = (val: string) => {
            if (!val) return undefined;
            if (val.endsWith('%')) return val;
            const num = parseFloat(val);
            return isNaN(num) ? undefined : num;
        };

        Object.keys(localWidths).forEach(key => {
            const val = localWidths[key]?.trim();
            resultWidths[key] = parseVal(val);
        });

        Object.keys(localMins).forEach(key => {
            const val = localMins[key]?.trim();
            resultMins[key] = parseVal(val);
        });

        if (onApplyToAll) {
            onApplyToAll(resultWidths, resultMins);
        }
        // Apply to current character as well
        onSave(resultWidths, resultMins);
        setConfirmApplyAll(false);
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth sx={{ zIndex: 20000, '& .MuiDialog-paper': { background: 'var(--md-sys-color-surface-container)', color: 'var(--md-sys-color-on-surface)' } }}>
            <DialogTitle sx={{ borderBottom: '1px solid var(--md-sys-color-outline-variant)' }}>
                Largeur des colonnes - {title}
            </DialogTitle>
            <DialogContent sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant="body2" sx={{ color: 'var(--md-sys-color-on-surface-variant)', mb: 1 }}>
                    Entrez une taille en pixels (ex: <code>150</code>) ou en pourcentage (ex: <code>20%</code>).
                </Typography>
                
                {columns.map((col) => (
                    <Box key={col.key} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                        <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>{col.label}</Typography>
                        <TextField
                            size="small"
                            label="Taille"
                            sx={{ width: '100px', '& .MuiInputBase-input': { color: 'var(--md-sys-color-on-surface)' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'var(--md-sys-color-outline-variant)' } } }}
                            value={localWidths[col.key] || ''}
                            onChange={(e) => setLocalWidths(prev => ({ ...prev, [col.key]: e.target.value }))}
                            placeholder={`${col.default}px`}
                            slotProps={{ inputLabel: { shrink: true } }}
                        />
                        <TextField
                            size="small"
                            label="Min"
                            sx={{ width: '80px', '& .MuiInputBase-input': { color: 'var(--md-sys-color-on-surface)' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'var(--md-sys-color-outline-variant)' } } }}
                            value={localMins[col.key] || ''}
                            onChange={(e) => setLocalMins(prev => ({ ...prev, [col.key]: e.target.value }))}
                            placeholder="0px"
                            slotProps={{ inputLabel: { shrink: true } }}
                        />
                    </Box>
                ))}
            </DialogContent>
            <DialogActions sx={{ p: 2, borderTop: '1px solid var(--md-sys-color-outline-variant)', display: 'flex', gap: 1 }}>
                {onApplyToAll && (
                    <Button onClick={() => setConfirmApplyAll(true)} sx={{ color: 'var(--md-sys-color-error)' }}>
                        Appliquer à tous
                    </Button>
                )}
                <Box sx={{ flexGrow: 1 }} />
                <Button onClick={onClose} sx={{ color: 'var(--md-sys-color-on-surface)' }}>Annuler</Button>
                <Button onClick={handleSave} variant="contained" sx={{ bgcolor: 'var(--md-sys-color-primary)', color: 'var(--md-sys-color-on-primary)' }}>Appliquer</Button>
            </DialogActions>

            <Dialog open={confirmApplyAll} onClose={() => setConfirmApplyAll(false)} sx={{ zIndex: 30000, '& .MuiDialog-paper': { background: 'var(--md-sys-color-surface-container)', color: 'var(--md-sys-color-on-surface)' } }}>
                <DialogTitle>Confirmation globale</DialogTitle>
                <DialogContent>
                    <Typography>
                        Êtes-vous sûr de vouloir appliquer cette configuration de colonnes ({title}) à <strong>TOUTES</strong> les fiches de personnage existantes dans ce terrain ?
                        Cela modifiera tous les fichiers personnages.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmApplyAll(false)} sx={{ color: 'var(--md-sys-color-on-surface)' }}>Annuler</Button>
                    <Button onClick={handleApplyToAll} variant="contained" color="error">Appliquer partout</Button>
                </DialogActions>
            </Dialog>
        </Dialog>
    );
};
