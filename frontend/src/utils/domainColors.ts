// 도메인 색상 관리 유틸리티

export interface DomainColor {
  bg: string;
  text: string;
}

export const PASTEL_COLORS: DomainColor[] = [
  { bg: '#E0F2FE', text: '#0369A1' }, // sky
  { bg: '#DBEAFE', text: '#1E40AF' }, // blue
  { bg: '#E0E7FF', text: '#4338CA' }, // indigo
  { bg: '#EDE9FE', text: '#6B21A8' }, // purple
  { bg: '#FCE7F3', text: '#BE185D' }, // pink
  { bg: '#FEE2E2', text: '#B91C1C' }, // red
  { bg: '#FFEDD5', text: '#C2410C' }, // orange
  { bg: '#FEF3C7', text: '#A16207' }, // amber
  { bg: '#FEF9C3', text: '#A16207' }, // yellow
  { bg: '#DCFCE7', text: '#15803D' }, // green
  { bg: '#D1FAE5', text: '#047857' }, // emerald
  { bg: '#CCFBF1', text: '#0F766E' }, // teal
  { bg: '#F3E8FF', text: '#7C3AED' }, // violet
  { bg: '#FEE7EF', text: '#DB2777' }, // rose
  { bg: '#E0F2F1', text: '#00897B' }, // cyan
  { bg: '#FFF4E6', text: '#E65100' }, // deep orange
  { bg: '#F1F8E9', text: '#558B2F' }, // light green
  { bg: '#FCE4EC', text: '#C2185B' }, // light pink
];

const STORAGE_KEY = 'term_domain_colors';

// 도메인 색상 매핑 가져오기
export const getDomainColorMap = (): Record<string, DomainColor> => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : {};
};

// 도메인 색상 매핑 저장
export const saveDomainColorMap = (map: Record<string, DomainColor>) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
};

// 도메인 색상 가져오기 (없으면 해시 기반 자동 할당)
export const getDomainColor = (domain: string): DomainColor => {
  const colorMap = getDomainColorMap();
  
  if (colorMap[domain]) {
    return colorMap[domain];
  }
  
  // 해시 기반 색상 할당
  let hash = 0;
  for (let i = 0; i < domain.length; i++) {
    hash = domain.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = PASTEL_COLORS[Math.abs(hash) % PASTEL_COLORS.length];
  
  // 저장
  colorMap[domain] = color;
  saveDomainColorMap(colorMap);
  
  return color;
};

// 도메인 색상 설정
export const setDomainColor = (domain: string, color: DomainColor) => {
  const colorMap = getDomainColorMap();
  colorMap[domain] = color;
  saveDomainColorMap(colorMap);
};
