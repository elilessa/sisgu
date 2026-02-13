import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Alert
} from '@mui/material';

interface ConfirmDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    message: React.ReactNode;
    alertMessage?: string;
    confirmButtonText?: string;
    cancelButtonText?: string;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    open,
    onClose,
    onConfirm,
    title = 'Confirmar Exclusão',
    message,
    alertMessage = 'Esta ação não pode ser desfeita.',
    confirmButtonText = 'Excluir',
    cancelButtonText = 'Cancelar'
}) => {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ color: '#f44336' }}>{title}</DialogTitle>
            <DialogContent>
                <Typography component="div">
                    {message}
                </Typography>
                {alertMessage && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        {alertMessage}
                    </Alert>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{cancelButtonText}</Button>
                <Button onClick={onConfirm} variant="contained" color="error">
                    {confirmButtonText}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
