import React from 'react';
import { CircularProgressIndicator } from '@components/common/CircularProgressIndicator';
import { BaseModalProps } from './BaseModal.types';
import * as S from './BaseModal.styles';

const BaseModal: React.FC<BaseModalProps> = ({
  open,
  title,
  onClose,
  children,
  size = 'xlarge',
  loading = false,
  actions,
}) => {
  return (
    <S.StyledDialog 
      open={open} 
      onClose={onClose} 
      size={size}
    >
      <S.StyledDialogTitle>{title}</S.StyledDialogTitle>
      
      <S.StyledDialogContent>
        {loading ? (
          <S.StyledLoadingContainer>
            <CircularProgressIndicator />
          </S.StyledLoadingContainer>
        ) : (
          children
        )}
      </S.StyledDialogContent>

      {actions && (
        <S.StyledDialogActions>
          {actions}
        </S.StyledDialogActions>
      )}
    </S.StyledDialog>
  );
};

export default BaseModal;
