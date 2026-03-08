import React from 'react';
import WordCloud from 'react-d3-cloud';
import { WordCloudChartProps } from './WordCloudChart.types';
import * as S from './WordCloudChart.styles';

const WordCloudChart: React.FC<WordCloudChartProps> = ({
  words,
  width = 320,
  height = 320,
}) => {
  const rotate = () => 0;

  const values = words.map(w => w.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  const fontSizeMapper = (word: any) => {
    const ratio =
      maxValue === minValue
        ? 0.5
        : (word.value - minValue) / (maxValue - minValue);
    return 18 + ratio * 30;
  };

  const getColorByFrequency = (value: number): string => {
    if (maxValue === minValue) {
      return 'hsl(210, 80%, 50%)';
    }

    const t = (value - minValue) / (maxValue - minValue);

    const hue = 210;
    const saturation = 70 + (90 - 70) * t;
    const lightness = 85 + (40 - 85) * t;

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  return (
    <S.WordCloudContainer>
      <S.WordCloudWrapper>
        <WordCloud
          data={words}
          width={width}
          height={height}
          font="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans KR', sans-serif"
          fontSize={fontSizeMapper}
          rotate={rotate}
          padding={1}
          fill={(word: any) => getColorByFrequency(word.value)}
        />
      </S.WordCloudWrapper>
    </S.WordCloudContainer>
  );
};

const areWordCloudPropsEqual = (
  prev: WordCloudChartProps,
  next: WordCloudChartProps
) => {
  if (prev.width !== next.width || prev.height !== next.height) return false;
  if (prev.words.length !== next.words.length) return false;

  for (let i = 0; i < prev.words.length; i += 1) {
    const prevWord = prev.words[i];
    const nextWord = next.words[i];
    if (prevWord.text !== nextWord.text || prevWord.value !== nextWord.value) {
      return false;
    }
  }

  return true;
};

export default React.memo(WordCloudChart, areWordCloudPropsEqual);
