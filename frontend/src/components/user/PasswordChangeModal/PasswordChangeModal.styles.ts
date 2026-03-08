import { styled } from '@mui/material/styles';
import { Box, Typography } from '@mui/material';

export const StyledContainer = styled(Box)(({ theme }) => ({
    display: 'flex',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: theme.custom.spacing.md,
    padding: theme.custom.spacing.lg,
}));

export const StyledWarningTitle = styled(Typography)(({ theme }) => ({
    fontSize: theme.custom.typography.body1.fontSize,
    fontWeight: theme.custom.typography.body1.fontWeight,
    lineHeight: theme.custom.typography.body1.lineHeight,
    color: theme.custom.colors.on.info,
    backgroundColor: theme.custom.colors.info,
    padding: theme.custom.spacing.md,
    display: 'flex',
    justifyContent: 'center',
    borderRadius: theme.custom.borderRadius,
}));

export const StyledSubTitle = styled(Typography)(({ theme }) => ({
    fontSize: theme.custom.typography.body2.fontSize,
    fontWeight: theme.custom.typography.body2.fontWeight,
    lineHeight: theme.custom.typography.body2.lineHeight,
    color: theme.custom.colors.text.medium,
}));

export const StyledErrorTitle = styled(Typography)(({ theme }) => ({
    fontSize: theme.custom.typography.body2.fontSize,
    fontWeight: theme.custom.typography.body2.fontWeight,
    lineHeight: theme.custom.typography.body2.lineHeight,
    color: theme.custom.colors.on.error,
}));

export const PasswordRulesWrapper = styled(Box)(({ theme }) => ({
    marginTop: theme.custom.spacing.sm,
    marginBottom: theme.custom.spacing.xs,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.custom.spacing.xs,
}));

interface PasswordRuleItemProps {
    $valid: boolean;
}

export const PasswordRuleItem = styled(Box)<PasswordRuleItemProps>(
    ({ theme, $valid }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: theme.custom.spacing.xs,
        fontSize: theme.custom.typography.caption.fontSize,
        color: $valid ? theme.palette.success.main : theme.palette.error.main,

        '& span:first-of-type': {
            width: 16,
            textAlign: 'center',
            fontWeight: 700,
        },
    }),
);

export const SuccessMessageContainer = styled('div')(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `${theme.custom.spacing.xxl} ${theme.custom.spacing.lg}`,
    textAlign: 'center',
    minHeight: '150px',
    gap: theme.custom.spacing.sm,

    '& p': {
        margin: 0,
        fontSize: theme.custom.typography.body1.fontSize,
        color: theme.custom.colors.text.medium,
    }
}));

export const ErrorMessage = styled('p')(({ theme }) => ({
    color: theme.custom.colors.on.error,
    marginTop: theme.custom.spacing.sm,
    fontSize: theme.custom.typography.caption.fontSize,
    minHeight: '1.2em', // 에러 메시지가 없을 때도 공간을 차지하도록 설정
}));
