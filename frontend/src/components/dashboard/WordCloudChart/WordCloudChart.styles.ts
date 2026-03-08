import styled from 'styled-components';

export const WordCloudContainer = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
`;

export const WordCloudWrapper = styled.div`
  position: relative;
  width: 320px;
  aspect-ratio: 1 / 1;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;

  svg {
    width: 100%;
    height: 100%;
    display: block;
  }
`;