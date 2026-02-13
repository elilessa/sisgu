
/**
 * Estilos padrão para tabelas do sistema
 */

import { customColors } from '../theme';

export const TABLE_HEADER_BG_COLOR = customColors.tableHeader; // Verde suave que combina com o tema principal

export const tableHeaderStyles = {
  backgroundColor: TABLE_HEADER_BG_COLOR,
};

export const tableContainerStyles = {
  overflowX: 'auto' as const,
};

export const tableStyles = {
  minWidth: { xs: 600, md: 750 },
};
