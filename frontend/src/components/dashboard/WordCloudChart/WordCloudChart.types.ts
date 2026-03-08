export interface WordData {
  text: string;
  value: number;
}

export interface WordCloudChartProps {
  words: WordData[];
  width?: number;
  height?: number;
}