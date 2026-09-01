import { Box } from '@mui/material';

export const LOGO_SRC = '/study-manager-logo.png';

const AppLogo = ({ size = 40, sx = {} }) => (
  <Box
    component="img"
    src={LOGO_SRC}
    alt="Study Manager"
    sx={{
      width: size,
      height: size,
      objectFit: 'contain',
      display: 'block',
      flexShrink: 0,
      ...sx,
    }}
  />
);

export default AppLogo;
