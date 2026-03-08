export const MODAL_SIZES = {
  small: {
    width: '480px',
    maxWidth: '90vw',
    maxHeight: '70vh',
  },
  medium: {
    width: '600px', 
    maxWidth: '90vw',
    maxHeight: '80vh',
  },
  large: {
    width: '800px',
    maxWidth: '90vw', 
    maxHeight: '85vh',
  },
  xlarge: {
    width: '1000px',
    maxWidth: '95vw',
    maxHeight: '90vh',
  }
} as const;

export type ModalSize = keyof typeof MODAL_SIZES;
