import { describe, expect, it } from "vitest";
import { parsePrice } from "../normalize/price";
import { analyze, quantile } from "./stats";
import type { RawListing } from "../types";
const raw = (prices: (number|string)[]): RawListing[] => prices.map((price,i) => ({
  marketplace: "bunjang", externalId: String(i), title: `아이폰 15 프로 판매 ${i}`, priceText: String(price),
  url: `https://m.bunjang.co.kr/products/${i}`, sellerKey: String(i),
}));
describe("가격 파싱", () => {
  it.each([
    ["650,000원",650000], ["65만원",650000], ["65만",650000], ["65.5만원",655000],
    ["65만5000원",655000], ["가격제안",null], ["가격문의",null], ["나눔",0], ["무료",0],
    ["0원",0], ["1원",1], ["6500000",6500000], ["650000~700000",650000],
    ["65만원~70만원",650000], ["-500원",null], ["",null], ["9999999999999999",null],
  ])("%s → %s", (input, expected) => expect(parsePrice(String(input))).toBe(expected));
});
describe("통계와 표본", () => {
  it("선형보간 사분위수와 IQR 경계를 수작업 값과 대조한다", () => {
    expect(quantile([100,200,300,400],.25)).toBe(175);
    const result = analyze("아이폰 15 프로",raw([100000,110000,120000,130000,140000,150000,900000]));
    expect(result.summary).toMatchObject({ count:7,cleanedCount:6,min:100000,max:900000,q1:115000,q3:145000,median:130000,cleanedAverage:125000,warning:"표본 적음" });
    expect(result.summary!.average).toBeCloseTo(235714.285714);
    expect(result.excludedBreakdown.OUTLIER).toBe(1);
    expect(result.listings).toHaveLength(7);
  });
  it.each([0,1,4])("표본 %s개는 통계를 숨긴다", n => {
    const result = analyze("아이폰",raw(Array(n).fill(500000)));
    expect(result.summary).toBeNull(); expect(result.listings.every(i=>i.diffPercent===null)).toBe(true);
  });
  it("정제 후 5개 미만이면 통계를 숨긴다", () => {
    const result=analyze("아이폰",raw([500000,500000,500000,500000,5000000]));
    expect(result.summary).toBeNull(); expect(result.counts.valid).toBe(4);
  });
  it("가격이 모두 같아 IQR이 0이어도 유효하다",()=>{
    const result=analyze("아이폰",raw(Array(10).fill(500000)));
    expect(result.summary).toMatchObject({q1:500000,q3:500000,cleanedAverage:500000,cleanedCount:10,warning:null});
    expect(result.listings.every(i=>i.diffPercent===0)).toBe(true);
  });
  it("하한·상한과 같은 가격은 보존한다",()=>{
    const result=analyze("아이폰",raw([40000,100000,100000,120000,140000,140000,200000]));
    expect(result.excludedBreakdown.OUTLIER).toBe(0);
  });
  it("저가·무료·가격 미정과 제외 우선순위를 구분한다",()=>{
    const items=raw([0,1,999,"가격제안",500000,510000,520000,530000,540000]);
    items[1].title="아이폰 삽니다";
    const result=analyze("아이폰",items);
    expect(result.counts).toEqual({total:9,valid:5,excluded:3,unpriced:1});
    expect(result.excludedBreakdown).toMatchObject({FREE:1,AD:1,OUTLIER:1});
    expect(result.listings[3].price).toBeNull(); expect(result.listings[3].diffPercent).toBeNull();
  });
  it("마켓별 표본이 부족하면 해당 마켓 숫자를 숨긴다",()=>{
    const items=raw([500000,510000,520000,530000,540000,550000]);items[0].marketplace="daangn";
    const result=analyze("아이폰",items);
    expect(result.marketplaces[0]).toEqual({marketplace:"daangn",count:1,average:null,median:null});
    expect(result.marketplaces[1].average).toBe(530000);
  });
});
