import { useState } from 'react';
import { Box, Button, TextField, IconButton, Typography, List, ListItem, ListItemText, ListItemSecondaryAction, Chip } from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon, CloudUpload as UploadIcon } from '@mui/icons-material';

interface FileUploadProps {
    empresaId: string;
    componenteId: string;
    tipo: 'fotos' | 'datasheets';
    arquivos: string[];
    onUpdate: (arquivos: string[]) => void;
}

export function FileUpload({ empresaId, ingredienteId, tipo, arquivos = [], onUpdate }: FileUploadProps & { ingredienteId?: string }) {
    // Nota: ingredienteId é alias para componenteId para compatibilidade se necessário
    const [urlInput, setUrlInput] = useState('');

    const handleAdd = () => {
        if (!urlInput.trim()) return;
        onUpdate([...arquivos, urlInput.trim()]);
        setUrlInput('');
    };

    const handleDelete = (index: number) => {
        const novos = [...arquivos];
        novos.splice(index, 1);
        onUpdate(novos);
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                    size="small"
                    fullWidth
                    label={tipo === 'fotos' ? "URL da Imagem" : "URL do Datasheet/PDF"}
                    value={urlInput}
                    onChange={e => setUrlInput(e.target.value)}
                    placeholder="https://..."
                />
                <Button variant="contained" onClick={handleAdd} startIcon={<AddIcon />}>
                    Adicionar
                </Button>
            </Box>

            {arquivos.length > 0 ? (
                <List dense sx={{ bgcolor: '#f5f5f5', borderRadius: 1 }}>
                    {arquivos.map((url, idx) => (
                        <ListItem key={idx} divider={idx !== arquivos.length - 1}>
                            <ListItemText
                                primary={<Typography noWrap variant="body2">{url}</Typography>}
                                secondary={tipo === 'fotos' ? (
                                    <Box mt={1}>
                                        <img src={url} alt="Preview" style={{ height: 50, borderRadius: 4 }} onError={(e) => (e.currentTarget.style.display = 'none')} />
                                    </Box>
                                ) : null}
                            />
                            <ListItemSecondaryAction>
                                <IconButton edge="end" size="small" color="error" onClick={() => handleDelete(idx)}>
                                    <DeleteIcon />
                                </IconButton>
                            </ListItemSecondaryAction>
                        </ListItem>
                    ))}
                </List>
            ) : (
                <Typography variant="caption" color="text.secondary">Nenhum arquivo anexado.</Typography>
            )}
        </Box>
    );
}
