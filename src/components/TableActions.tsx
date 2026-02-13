
import React from 'react';
import { IconButton, Tooltip, IconButtonProps, Chip, ChipProps } from '@mui/material';
import {
    Visibility as ViewIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Print as PrintIcon,
    Cancel as CancelIcon,
    CheckCircle as SuccessIcon,
    ContentCopy as CopyIcon,
    Email as EmailIcon,
    Send as SendIcon,
    WhatsApp as WhatsappIcon,
    PictureAsPdf as PdfIcon,
    History as HistoryIcon,
    Search as SearchIcon,
    VpnKey as KeyIcon,
    Archive as ArchiveIcon,
    Unarchive as UnarchiveIcon
} from '@mui/icons-material';
import { customColors } from '../theme';

interface ActionButtonProps extends Omit<IconButtonProps, 'color'> {
    title: string;
    iconSize?: 'small' | 'inherit' | 'large' | 'medium';
}

/**
 * Standardized Action Buttons for Tables
 * Centralizes tooltips, icons, and colors based on theme.ts
 */

export const ActionView: React.FC<ActionButtonProps> = ({ title, iconSize = 'small', ...props }) => (
    <Tooltip title={title}>
        <IconButton size="small" {...props} sx={{ color: customColors.iconView, ...props.sx }}>
            <ViewIcon fontSize={iconSize} />
        </IconButton>
    </Tooltip>
);

export const ActionEdit: React.FC<ActionButtonProps> = ({ title, iconSize = 'small', ...props }) => (
    <Tooltip title={title}>
        <IconButton size="small" {...props} sx={{ color: customColors.iconEdit, ...props.sx }}>
            <EditIcon fontSize={iconSize} />
        </IconButton>
    </Tooltip>
);

export const ActionDelete: React.FC<ActionButtonProps> = ({ title, iconSize = 'small', ...props }) => (
    <Tooltip title={title}>
        <IconButton size="small" {...props} sx={{ color: customColors.iconDelete, ...props.sx }}>
            <DeleteIcon fontSize={iconSize} />
        </IconButton>
    </Tooltip>
);

export const ActionPrint: React.FC<ActionButtonProps> = ({ title, iconSize = 'small', ...props }) => (
    <Tooltip title={title}>
        <IconButton size="small" {...props} sx={{ color: customColors.iconPrint, ...props.sx }}>
            <PrintIcon fontSize={iconSize} />
        </IconButton>
    </Tooltip>
);

export const ActionCancel: React.FC<ActionButtonProps> = ({ title, iconSize = 'small', ...props }) => (
    <Tooltip title={title}>
        <IconButton size="small" {...props} sx={{ color: customColors.iconCancel, ...props.sx }}>
            <CancelIcon fontSize={iconSize} />
        </IconButton>
    </Tooltip>
);

export const ActionSuccess: React.FC<ActionButtonProps> = ({ title, iconSize = 'small', ...props }) => (
    <Tooltip title={title}>
        <IconButton size="small" {...props} sx={{ color: customColors.iconSuccess, ...props.sx }}>
            <SuccessIcon fontSize={iconSize} />
        </IconButton>
    </Tooltip>
);

export const ActionCopy: React.FC<ActionButtonProps> = ({ title, iconSize = 'small', ...props }) => (
    <Tooltip title={title}>
        <IconButton size="small" {...props} sx={{ color: customColors.iconView, ...props.sx }}>
            <CopyIcon fontSize={iconSize} />
        </IconButton>
    </Tooltip>
);

export const ActionEmail: React.FC<ActionButtonProps> = ({ title, iconSize = 'small', ...props }) => (
    <Tooltip title={title}>
        <IconButton size="small" {...props} sx={{ color: customColors.iconEmail, ...props.sx }}>
            <EmailIcon fontSize={iconSize} />
        </IconButton>
    </Tooltip>
);

export const ActionSend: React.FC<ActionButtonProps> = ({ title, iconSize = 'small', ...props }) => (
    <Tooltip title={title}>
        <IconButton size="small" {...props} sx={{ color: customColors.iconEmail, ...props.sx }}>
            <SendIcon fontSize={iconSize} />
        </IconButton>
    </Tooltip>
);

export const ActionWhatsapp: React.FC<ActionButtonProps> = ({ title, iconSize = 'small', ...props }) => (
    <Tooltip title={title}>
        <IconButton size="small" {...props} sx={{ color: customColors.iconWhatsapp, ...props.sx }}>
            <WhatsappIcon fontSize={iconSize} />
        </IconButton>
    </Tooltip>
);

export const ActionPdf: React.FC<ActionButtonProps> = ({ title, iconSize = 'small', ...props }) => (
    <Tooltip title={title}>
        <IconButton size="small" {...props} sx={{ color: customColors.iconPdf, ...props.sx }}>
            <PdfIcon fontSize={iconSize} />
        </IconButton>
    </Tooltip>
);

export const ActionHistory: React.FC<ActionButtonProps> = ({ title, iconSize = 'small', ...props }) => (
    <Tooltip title={title}>
        <IconButton size="small" {...props} sx={{ color: customColors.iconHistory || '#9c27b0', ...props.sx }}>
            <HistoryIcon fontSize={iconSize} />
        </IconButton>
    </Tooltip>
);

export const ActionSearch: React.FC<ActionButtonProps> = ({ title, iconSize = 'small', ...props }) => (
    <Tooltip title={title}>
        <IconButton size="small" {...props} sx={{ color: customColors.iconView, ...props.sx }}>
            <SearchIcon fontSize={iconSize} />
        </IconButton>
    </Tooltip>
);

export const ActionKey: React.FC<ActionButtonProps> = ({ title, iconSize = 'small', ...props }) => (
    <Tooltip title={title}>
        <IconButton size="small" {...props} sx={{ color: customColors.iconKey || '#00ae91', ...props.sx }}>
            <KeyIcon fontSize={iconSize} />
        </IconButton>
    </Tooltip>
);

export const ActionArchive: React.FC<ActionButtonProps> = ({ title, iconSize = 'small', ...props }) => (
    <Tooltip title={title}>
        <IconButton size="small" {...props} sx={{ color: customColors.iconArchive || '#757575', ...props.sx }}>
            <ArchiveIcon fontSize={iconSize} />
        </IconButton>
    </Tooltip>
);

export const ActionUnarchive: React.FC<ActionButtonProps> = ({ title, iconSize = 'small', ...props }) => (
    <Tooltip title={title}>
        <IconButton size="small" {...props} sx={{ color: customColors.iconUnarchive || '#4caf50', ...props.sx }}>
            <UnarchiveIcon fontSize={iconSize} />
        </IconButton>
    </Tooltip>
);

/**
 * Standardized Status Chips
 */
interface StatusChipProps extends Omit<ChipProps, 'color'> {
    status: string;
}

export const StatusChip: React.FC<StatusChipProps> = ({ status, label, ...props }) => {
    const s = status?.toLowerCase();
    let color: 'success' | 'error' | 'warning' | 'info' | 'default' = 'default';

    if (['aprovado', 'pago', 'ativo', 'ativa', 'concluido', 'faturado', 'orcamento_aprovado', 'atendido'].includes(s)) color = 'success';
    if (['reprovado', 'rejeitado', 'cancelado', 'atrasado', 'vencido', 'em_atraso', 'aguardando_devolucao', 'orcamento_reprovado', 'inativo', 'inativa'].includes(s)) color = 'error';
    if (['pendente', 'em_elaboracao', 'aguardando', 'em_aberto', 'pendencia_tecnica', 'pendencia_financeira', 'orcamento_em_construcao'].includes(s)) color = 'warning';
    if (['enviado', 'em_andamento', 'processando', 'aberto', 'orcamento_enviado', 'carregando'].includes(s)) color = 'info';
    if (['expirado', 'arquivado', 'baixado', 'default'].includes(s)) color = 'default';

    return <Chip label={label || status} color={color} size="small" sx={{ fontWeight: 'bold', ...props.sx }} {...props} />;
};
