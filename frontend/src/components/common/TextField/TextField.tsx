import React, { useState, useCallback } from 'react';
import { TextFieldProps } from './TextField.types';
import * as S from './TextField.styles';

export const TextField: React.FC<TextFieldProps> = ({
  variant = 'outlined',
  size = 'medium',
  label,
  placeholder,
  helperText,
  error = false,
  disabled = false,
  leadingIcon,
  trailingIcon,
  fullWidth = false,
  width,
  multiline = false,
  rows = 1,
  value,
  disableAnimation = false,
  border,
  borderRadius,
  onChange,
  onFocus,
  onBlur,
  onKeyPress,
  ...inputProps
}) => {
  const [focused, setFocused] = useState(false);
  const [internalValue, setInternalValue] = useState(value || '');

  const currentValue = value !== undefined ? value : internalValue;
  const hasValue = Boolean(currentValue) || inputProps.type === 'date';

  const handleFocus = useCallback((event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFocused(true);
    onFocus?.(event);
  }, [onFocus]);

  const handleBlur = useCallback((event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFocused(false);
    onBlur?.(event);
  }, [onBlur]);

  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (value === undefined) {
      setInternalValue(event.target.value);
    }
    onChange?.(event);
  }, [value, onChange]);

  const commonProps = {
    value: currentValue,
    placeholder: label ? undefined : placeholder,
    disabled,
    onFocus: handleFocus,
    onBlur: handleBlur,
    onChange: handleChange,
    onKeyPress,
  };

  const inputSpecificProps = {
    ...inputProps,
    ...commonProps,
  };

  const textareaSpecificProps = {
    value: currentValue,
    placeholder: label ? undefined : placeholder,
    disabled,
    onFocus: handleFocus,
    onBlur: handleBlur,
    onChange: handleChange,
  };

  return (
    <S.StyledContainer $fullWidth={fullWidth} $width={width}>
      <S.StyledTextField
        $variant={variant}
        $size={size}
        $error={error}
        $disabled={disabled}
        $focused={focused}
        $hasLeadingIcon={Boolean(leadingIcon)}
        $hasTrailingIcon={Boolean(trailingIcon)}
        $hasValue={hasValue}
        $fullWidth={fullWidth}
        $width={width}
        $disableAnimation={disableAnimation}
        $border={border}
        $borderRadius={borderRadius}
      >
        <S.StyledInputContainer
          $hasLeadingIcon={Boolean(leadingIcon)}
          $hasTrailingIcon={Boolean(trailingIcon)}
          $size={size}
        >
          {leadingIcon && (
            <S.StyledIconContainer>
              {leadingIcon}
            </S.StyledIconContainer>
          )}

          {multiline ? (
            <S.StyledTextArea
              multiline
              minRows={rows}
              maxRows={6}
              variant="outlined"
              $variant={variant}
              $error={error}
              $disabled={disabled}
              $size={size}
              {...textareaSpecificProps}
            />
          ) : (
            <S.StyledInput
              $variant={variant}
              $error={error}
              $disabled={disabled}
              $size={size}
              {...inputSpecificProps}
            />
          )}

          {trailingIcon && (
            <S.StyledIconContainer>
              {trailingIcon}
            </S.StyledIconContainer>
          )}
        </S.StyledInputContainer>

        {label && (
          <S.StyledLabel
            $variant={variant}
            $error={error}
            $disabled={disabled}
            $focused={focused}
            $hasValue={hasValue}
            $disableAnimation={disableAnimation}
          >
            {label}
          </S.StyledLabel>
        )}
      </S.StyledTextField>

      {helperText && (
        <S.StyledHelperText $error={error} $disabled={disabled}>
          {helperText}
        </S.StyledHelperText>
      )}
    </S.StyledContainer>
  );
};
