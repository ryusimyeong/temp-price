import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseDaangn } from "./daangn";
import { parseBunjang, parseBunjangHtml } from "./bunjang";
import { assertAccess } from "./fetch";

const daangn = readFileSync(new URL("../../fixtures/daangn-search.html",import.meta.url),"utf8");
const bunjang = JSON.parse(readFileSync(new URL("../../fixtures/bunjang-search.json",import.meta.url),"utf8"));
describe("실제 목록 응답 파서",()=>{
  it("당근 fixture에서 제목·가격·원본·이미지·표시 시간을 추출한다",()=>{
    const result=parseDaangn(daangn);
    expect(result).toHaveLength(8);
    expect(result[0]).toMatchObject({marketplace:"daangn",title:"아이폰15프로 256GB 내츄럴티타늄",priceText:"600,000원",location:"역삼동"});
    expect(result[0].url).toMatch(/^https:\/\/www.daangn.com\/kr\/buy-sell\/.+\/$/);
    expect(result[0].imageUrl).toMatch(/^https:\/\//);
    // 초기 HTML에는 게시 시간이 없을 수 있습니다. 렌더링된 HTML은 별도로 검증합니다.
    expect(parseDaangn(daangn.replace('</a>', '<time>3일 전</time></a>'))[0].postedText).toBe("3일 전");
  });
  it("번개장터 fixture에서 필수 데이터와 이미지 크기를 추출한다",()=>{
    const result=parseBunjang(bunjang);
    expect(result.listings).toHaveLength(8);expect(result.cursor).toBeNull();
    expect(result.listings[0]).toMatchObject({marketplace:"bunjang",title:"중고폰매입 파손폰매입 아이폰매입 고장폰 파손폰 아이폰15프로 17프로",priceText:"486000"});
    expect(result.listings[0].url).toMatch(/^https:\/\/m.bunjang.co.kr\/products\/\d+$/);
    expect(result.listings[0].imageUrl).toContain("w640");
  });
  it("외부 광고 블록은 매물로 해석하지 않는다",()=>{
    expect(parseBunjang({data:{data:[{type:"EXT_AD"}],nextCursor:null}}).listings).toEqual([]);
  });
  it("다음 페이지의 커서를 그대로 유지한다",()=>{
    const result=parseBunjang({data:{data:[],nextCursor:"next-page"}});expect(result.cursor).toBe("next-page");
  });
  it("구조 변경을 정상 0건으로 숨기지 않는다",()=>{
    expect(()=>parseDaangn("<html><body>일시적인 오류</body></html>")).toThrow("PARSER_CHANGED");
    expect(()=>parseBunjang({data:{unknown:[]}})).toThrow("PARSER_CHANGED");
    expect(()=>parseBunjang({data:{data:[{pid:123}]}})).toThrow("PARSER_CHANGED");
  });
  it("정상 빈 결과는 허용한다",()=>{
    expect(parseDaangn("<p>검색 결과가 없어요</p>")).toEqual([]);
    expect(parseBunjang({data:{data:[],nextCursor:null}}).listings).toEqual([]);
  });
  it("번개장터 DOM fallback도 가격과 원본을 추출한다",()=>{
    const html='<a href="/products/123?tracking=unused"><img src="https://media.bunjang.co.kr/a.jpg"><p>650,000원</p><p>아이폰 15 프로</p></a>';
    expect(parseBunjangHtml(html)[0]).toMatchObject({externalId:"123",priceText:"650,000원",title:"아이폰 15 프로",url:"https://m.bunjang.co.kr/products/123"});
  });
  it("차단 응답과 캡차를 감지한다",()=>{
    expect(()=>assertAccess(403)).toThrow("HTTP_403");expect(()=>assertAccess(429)).toThrow("HTTP_429");
    expect(()=>assertAccess(200,"<title>Just a moment</title>")).toThrow("CAPTCHA");
  });
});
