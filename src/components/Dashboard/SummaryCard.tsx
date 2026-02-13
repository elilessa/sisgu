import React from 'react';
import { Paper, Box, Typography, Chip } from '@mui/material';

interface SummaryCardProps {
    title: string;
    value: string | number;
    subvalue?: string;
    icon: React.ReactNode;
    color: string;
    onClick?: () => void;
    percent?: number;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, subvalue, icon, color, onClick, percent }) => (
    <Paper
        elevation={2}
        sx={{
            p: 2,
            height: '100%',
            cursor: onClick ? 'pointer' : 'default',
            bgcolor: 'white',
            transitions: 'transform 0.2s',
            '&:hover': onClick ? { transform: 'translateY(-2px)', boxShadow: 3 } : {},
            borderLeft: `4px solid ${color}`
        }}
        onClick={onClick}
    >
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
            <Box>
                <Typography variant="body2" color="text.secondary" fontWeight="bold" sx={{ textTransform: 'uppercase', fontSize: '0.75rem' }}>
                    {title}
                </Typography>
                <Typography variant="h5" color="text.primary" fontWeight="bold">
                    {value}
                </Typography>
            </Box>
            <Box sx={{ bgcolor: `${color}20`, p: 1, borderRadius: 2 }}>
                {icon}
            </Box>
        </Box>

        <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
            {subvalue && (
                <Typography variant="caption" color="text.secondary">
                    {subvalue}
                </Typography>
            )}
            {percent !== undefined && (
                <Chip
                    label={`${percent}%`}
                    size="small"
                    sx={{
                        height: 20,
                        fontSize: '0.7rem',
                        bgcolor: `${color}10`,
                        color: color,
                        fontWeight: 'bold'
                    }}
                />
            )}
        </Box>
    </Paper>
);
