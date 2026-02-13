
// Componente Row definido FORA do componente principal para evitar recriação a cada render
function ContratoRow(props: {
    row: Contrato,
    clientes: Cliente[],
    onEdit: (c: Contrato) => void,
    onDelete: (c: Contrato) => void,
    onViewPdf: (c: Contrato) => void,
    onView: (c: Contrato) => void
}) {
    const { row, clientes, onEdit, onDelete, onViewPdf, onView } = props;
    const [open, setOpen] = useState(false);

    const cliente = clientes.find(c => c.id === row.clienteId);
    const clienteDisplay = cliente?.prefixoNome ? `${cliente.prefixoNome} ${row.clienteNome}` : row.clienteNome;

    return (
        <React.Fragment>
            <TableRow sx={{ '& > *': { borderBottom: 'unset' }, backgroundColor: open ? '#f5f5f5' : 'inherit' }}>
                <TableCell width={50}>
                    <IconButton
                        aria-label="expand row"
                        size="small"
                        onClick={() => setOpen(!open)}
                    >
                        {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                    </IconButton>
                </TableCell>
                <TableCell sx={{ py: 0.25 }}>{row.numero}</TableCell>
                <TableCell sx={{ py: 0.25 }}>{row.data?.toDate().toLocaleDateString('pt-BR')}</TableCell>
                <TableCell sx={{ py: 0.25 }}>{clienteDisplay}</TableCell>
                <TableCell sx={{ py: 0.25 }}>{row.vendedorNome || '-'}</TableCell>
                <TableCell sx={{ py: 0.25 }}>
                    {TIPO_CONTRATO_OPTIONS.find(t => t.value === row.tipoContrato)?.label}
                </TableCell>
                <TableCell sx={{ py: 0.25 }}>R$ {row.valorContrato.toFixed(2)}</TableCell>
                <TableCell sx={{ py: 0.25 }}>
                    <Chip
                        label={STATUS_CONTRATO_OPTIONS.find(s => s.value === row.status)?.label}
                        color={(STATUS_CONTRATO_OPTIONS.find(s => s.value === row.status)?.color || 'default') as any}
                        size="small"
                    />
                </TableCell>
                <TableCell align="right" sx={{ py: 0.25 }}>
                    <IconButton size="small" onClick={() => onView(row)} title="Visualizar" sx={{ color: '#1976d2' }}>
                        <Visibility />
                    </IconButton>
                    <IconButton size="small" onClick={() => onEdit(row)} title="Editar" sx={{ color: '#ff9800' }}>
                        <Edit />
                    </IconButton>
                    <IconButton size="small" onClick={() => onViewPdf(row)} title="Gerar PDF" sx={{ color: '#4caf50' }}>
                        <PictureAsPdf />
                    </IconButton>
                    <IconButton size="small" onClick={() => onDelete(row)} title="Excluir" sx={{ color: '#f44336' }}>
                        <Delete />
                    </IconButton>
                </TableCell>
            </TableRow>
            <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={9}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 1, p: 2, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e0e0e0', boxShadow: 1 }}>
                            <Typography variant="h6" gutterBottom component="div" sx={{ color: '#1976d2', mb: 2 }}>
                                Detalhes do Contrato
                            </Typography>

                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                                <Box>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#2e7d32', mb: 1 }}>
                                        Informações Gerais
                                    </Typography>
                                    <Box sx={{ bgcolor: '#f1f8e9', p: 1.5, borderRadius: 1 }}>
                                        <Typography variant="body2"><strong>Título:</strong> {row.titulo}</Typography>
                                        <Typography variant="body2"><strong>Tipo:</strong> {TIPO_CONTRATO_OPTIONS.find(t => t.value === row.tipoContrato)?.label}</Typography>
                                        <Typography variant="body2"><strong>Valor Mensal:</strong> R$ {row.valorContrato.toFixed(2)}</Typography>
                                        <Typography variant="body2"><strong>Observação:</strong> {row.observacao || 'N/A'}</Typography>
                                    </Box>
                                </Box>

                                <Box>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#1565c0', mb: 1 }}>
                                        Dados do Cliente
                                    </Typography>
                                    <Box sx={{ bgcolor: '#e3f2fd', p: 1.5, borderRadius: 1 }}>
                                        <Typography variant="body2"><strong>Nome:</strong> {row.clienteNome}</Typography>
                                        <Typography variant="body2"><strong>CNPJ/CPF:</strong> {formatCnpjCpf(row.clienteCnpjCpf)}</Typography>
                                        <Typography variant="body2"><strong>Endereço:</strong> {row.clienteEndereco}, {row.clienteNumero}</Typography>
                                        <Typography variant="body2">{row.clienteBairro} - {row.clienteCidade}/{row.clienteUf}</Typography>
                                    </Box>
                                </Box>
                            </Box>

                            {row.equipamentosCobertos && row.equipamentosCobertos.length > 0 && (
                                <Box sx={{ mt: 2 }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#455a64', mb: 1 }}>
                                        Equipamentos Cobertos ({row.equipamentosCobertos.length})
                                    </Typography>
                                    <TableContainer component={Paper} variant="outlined">
                                        <Table size="small">
                                            <TableHead sx={{ bgcolor: '#eceff1' }}>
                                                <TableRow>
                                                    <TableCell sx={{ fontSize: '0.75rem', py: 0.5 }}><strong>Qtd</strong></TableCell>
                                                    <TableCell sx={{ fontSize: '0.75rem', py: 0.5 }}><strong>Equipamento</strong></TableCell>
                                                    <TableCell sx={{ fontSize: '0.75rem', py: 0.5 }}><strong>Fabricante</strong></TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {row.equipamentosCobertos.map((eq, idx) => (
                                                    <TableRow key={idx}>
                                                        <TableCell sx={{ fontSize: '0.8rem', py: 0.5 }}>{eq.quantidade}</TableCell>
                                                        <TableCell sx={{ fontSize: '0.8rem', py: 0.5 }}>{eq.equipamento}</TableCell>
                                                        <TableCell sx={{ fontSize: '0.8rem', py: 0.5 }}>{eq.fabricanteNome}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Box>
                            )}
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </React.Fragment>
    );
}
