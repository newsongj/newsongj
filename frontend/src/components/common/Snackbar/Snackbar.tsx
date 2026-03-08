import React from 'react';
import { SnackbarProps } from './Snackbar.types';
import * as S from './Snackbar.styles';

const Snackbar: React.FC<SnackbarProps> = ({
  open,
  message,
  severity = 'info',
  onClose,
  autoHideDuration = 6000,
}) => {
  return (
    <S.StyledSnackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      <S.StyledAlert onClose={onClose} severity={severity}>
        {message}
      </S.StyledAlert>
    </S.StyledSnackbar>
  );
};

export default Snackbar;
