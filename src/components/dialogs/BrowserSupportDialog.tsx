import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  Chip,
} from '@mui/material';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { isGoogleChrome, getDetectedBrowserName } from '../../lib/browserDetection';

export interface BrowserSupportDialogProps {
  /** Optional override for controlled open state */
  isOpen?: boolean;
  /** Optional callback when dismissed */
  onClose?: () => void;
}

const STORAGE_KEY = 'omega_browser_warning_dismissed';

export const BrowserSupportDialog: React.FC<BrowserSupportDialogProps> = ({
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
}) => {
  const [open, setOpen] = useState<boolean>(() => {
    if (controlledIsOpen !== undefined) return controlledIsOpen;
    if (typeof window === 'undefined') return false;
    const dismissed = sessionStorage.getItem(STORAGE_KEY);
    if (dismissed === 'true') return false;
    return !isGoogleChrome();
  });

  const [detectedBrowser, setDetectedBrowser] = useState<string>('Unknown Browser');

  useEffect(() => {
    setDetectedBrowser(getDetectedBrowserName());
  }, []);

  useEffect(() => {
    if (controlledIsOpen !== undefined) {
      setOpen(controlledIsOpen);
    }
  }, [controlledIsOpen]);

  const handleContinueAnyway = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(STORAGE_KEY, 'true');
    }
    setOpen(false);
    if (controlledOnClose) {
      controlledOnClose();
    }
  };

  const isDisplayed = controlledIsOpen !== undefined ? controlledIsOpen : open;

  if (!isDisplayed) {
    return null;
  }

  return (
    <Dialog
      open={isDisplayed}
      onClose={handleContinueAnyway}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 4,
            p: 1.5,
            backgroundImage: 'none',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.4)',
          },
        },
      }}
    >
      <DialogTitle sx={{ pb: 1, pt: 2, px: 2.5 }}>
        <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              borderRadius: '50%',
              bgcolor: 'error.main',
              color: 'error.contrastText',
              flexShrink: 0,
            }}
          >
            <WarningAmberRoundedIcon sx={{ fontSize: 28 }} />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="h6" component="div" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              Unsupported Browser
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                Detected:
              </Typography>
              <Chip
                label={detectedBrowser}
                size="small"
                variant="outlined"
                color="warning"
                sx={{ height: 20, fontSize: '0.72rem', fontWeight: 600 }}
              />
            </Box>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: 2.5, py: 1.5 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Alert
            severity="warning"
            variant="outlined"
            sx={{
              borderRadius: 2.5,
              '& .MuiAlert-message': { width: '100%' },
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
              Omega RGE is currently optimized exclusively for Google Chrome.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              This application does not officially support other browsers at this moment. You may encounter unexpected display bugs, missing audio features, or broken canvas interactions.
            </Typography>
          </Alert>

          <Box
            sx={{
              p: 2,
              borderRadius: 2.5,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
              Recommended Action
            </Typography>
            <Typography variant="body2" color="text.secondary">
              For the best, fully functional experience, please open this application in <strong>Google Chrome</strong>.
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 2.5, pb: 2, pt: 1, justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
        <Button
          component="a"
          href="https://www.google.com/chrome/"
          target="_blank"
          rel="noopener noreferrer"
          variant="outlined"
          color="inherit"
          endIcon={<OpenInNewRoundedIcon fontSize="small" />}
          sx={{ borderRadius: 2 }}
        >
          Get Google Chrome
        </Button>

        <Button
          variant="contained"
          color="primary"
          onClick={handleContinueAnyway}
          endIcon={<ArrowForwardRoundedIcon />}
          sx={{
            borderRadius: 2,
            px: 2.5,
            fontWeight: 700,
          }}
        >
          Continue anyway
        </Button>
      </DialogActions>
    </Dialog>
  );
};
