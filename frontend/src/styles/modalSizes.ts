export const MODAL_SIZES = {
  small: {
    width: '480px',
    maxWidth: 'calc(100vw - 24px)',
    maxHeight: '70vh',
  },
  medium: {
    width: '600px', 
    maxWidth: 'calc(100vw - 24px)',
    maxHeight: '80vh',
  },
  large: {
    width: '800px',
    maxWidth: 'calc(100vw - 24px)', 
    maxHeight: '85vh',
  },
  xlarge: {
    width: '1000px',
    maxWidth: 'calc(100vw - 16px)',
    maxHeight: '90vh',
  }
} as const;

export type ModalSize = keyof typeof MODAL_SIZES;
