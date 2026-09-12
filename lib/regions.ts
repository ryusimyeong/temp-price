// 당근 공개 페이지의 실제 지역 링크에서 확인한 식별자입니다.
export const REGIONS = [
  { value: "역삼동-6035", label: "서울 강남구 역삼동" },
  { value: "신사동-382", label: "서울 강남구 신사동" },
  { value: "논현1동-383", label: "서울 강남구 논현1동" },
  { value: "논현2동-384", label: "서울 강남구 논현2동" },
  { value: "압구정동-385", label: "서울 강남구 압구정동" },
  { value: "청담동-386", label: "서울 강남구 청담동" },
  { value: "삼성1동-387", label: "서울 강남구 삼성1동" },
] as const;
export const DEFAULT_REGION = REGIONS[0].value;
export function regionLabel(value: string) { return REGIONS.find(r => r.value === value)?.label ?? value; }
