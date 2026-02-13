import React from 'react';
import {
    Box,
    Typography,
    Grid,
    Card,
    CardActionArea,
    CardContent,
    Avatar
} from '@mui/material';
import {
    BarChart,
    People,
    Assessment,
    Engineering
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';


const ReportCard = ({ title, description, icon, path, color }: { title: string, description: string, icon: any, path: string, color: string }) => {
    const navigate = useNavigate();

    return (
        <Card elevation={0} sx={{ height: '100%', border: '1px solid #eee', borderRadius: 4, transition: 'all 0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 8px 20px rgba(0,0,0,0.08)', borderColor: color } }}>
            <CardActionArea onClick={() => navigate(path)} sx={{ height: '100%', p: 2 }}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 2 }}>
                    <Avatar sx={{ width: 64, height: 64, bgcolor: `${color}20`, color: color }}>
                        {icon}
                    </Avatar>
                    <Box>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                            {title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {description}
                        </Typography>
                    </Box>
                </CardContent>
            </CardActionArea>
        </Card>
    );
};

const RelatoriosHub: React.FC = () => {
    const cards = [
        {
            title: 'Relatório Financeiro',
            description: 'DRE, Fluxo de Caixa Detalhado, Contas a Pagar/Receber por Categoria.',
            icon: <BarChart sx={{ fontSize: 32 }} />,
            path: '/dashboard?page=relatorio-financeiro',
            color: '#2e7d32' // Verde
        },
        {
            title: 'Relatório de Clientes',
            description: 'Novos clientes, Inativos, Rank de Faturamento por Cliente.',
            icon: <People sx={{ fontSize: 32 }} />,
            path: '/relatorios/clientes',
            color: '#1976d2' // Azul
        },
        {
            title: 'Relatório de Vendas',
            description: 'Performance comercial, Funil de Vendas e Metas.',
            icon: <Assessment sx={{ fontSize: 32 }} />,
            path: '/relatorios/vendas',
            color: '#ed6c02' // Laranja
        },
        {
            title: 'Relatório Técnico',
            description: 'Chamados atendidos, TMA, Produtividade da equipe.',
            icon: <Engineering sx={{ fontSize: 32 }} />,
            path: '/relatorios/tecnico',
            color: '#0288d1' // Azul Claro
        }
    ];

    return (
        <>
            <Box mb={4}>
                <Typography variant="h4" fontWeight="900" color="primary.main" gutterBottom>
                    Central de Relatórios
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Selecione uma área para visualizar indicadores e exportar dados.
                </Typography>
            </Box>

            <Grid container spacing={3}>
                {cards.map((card, index) => (
                    <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
                        <ReportCard {...card} />
                    </Grid>
                ))}
            </Grid>
        </>
    );
};

export { RelatoriosHub };
