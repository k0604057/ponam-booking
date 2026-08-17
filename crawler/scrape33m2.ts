// 33m2 호스트 웹(web.33m2.co.kr)에서 계약 목록·상세를 수집한다.
//
// 공개 JSON API 는 없다. 호스트 웹은 Next.js App Router 서버 렌더링이라 예약 데이터가
// HTML 에 실려 오고, 네트워크 XHR 은 Datadog·GA·카카오 픽셀뿐이다. 그래서 DOM 을 읽는다.
//
// 파싱은 innerText 기반이다. 클래스명·DOM 구조보다 화면 텍스트가 덜 바뀌고,
// 순수 함수로 떼어낼 수 있어 브라우저 없이 테스트할 수 있다.

import { chromium, type Browser, type Page } from 'playwright';
import { existsSync } from 'node:fs';
import { env } from './env';

const BASE = 'https://web.33m2.co.kr';
const MAX_PAGES = 20;
const NAV_TIMEOUT = 45_000;

export class SessionExpiredError extends Error {
  constructor(detail: string) {
    super(`33m2 세션이 만료됐습니다 (${detail}). 맥 화면에서 'npx tsx crawler/session.ts' 를 다시 실행하세요.`);
    this.name = 'SessionExpiredError';
  }
}

export type ScrapedContract = {
  externalId: string;
  roomName: string;
  roomAddress: string | null;
  /** properties 의 키. 방 이름은 호스트가 바꾸는 홍보 문구라 키로 불안정하다. */
  jibunAddress: string | null;
  guestName: string | null;
  guestPhone: string | null;
  checkinDate: string; // YYYY-MM-DD
  checkoutDate: string; // YYYY-MM-DD
  status: 'confirmed' | 'cancelled' | 'completed';
  grossAmount: number;
  platformFee: number; // 절댓값
  netAmount: number;
  raw: Record<string, unknown>;
};

// ---------------------------------------------------------------- 상태 매핑

// '결제취소' 가 '취소' 보다 앞에 있어야 한다. 부분일치로 먼저 걸리면 안 되므로 순서가 중요하다.
const STATUS_BADGES: ReadonlyArray<readonly [string, ScrapedContract['status']]> = [
  ['계약대기', 'confirmed'],
  ['입주대기', 'confirmed'],
  ['거주중', 'confirmed'],
  ['퇴실중', 'confirmed'],
  ['계약종료', 'completed'],
  ['결제취소', 'cancelled'],
  ['취소', 'cancelled'],
];

export function findBadge(text: string): { badge: string; status: ScrapedContract['status'] } | null {
  for (const [badge, status] of STATUS_BADGES) {
    if (text.includes(badge)) return { badge, status };
  }
  return null;
}

// ---------------------------------------------------------------- 값 파서

const pad = (n: string) => n.padStart(2, '0');

/** '2026년 08월 15일(토)' → '2026-08-15' */
export function parseKoreanDate(text: string): string | null {
  const m = text.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
  return m ? `${m[1]}-${pad(m[2])}-${pad(m[3])}` : null;
}

/** '350,000원' → 350000, '-11,550원' → -11550 */
export function parseAmount(text: string): number | null {
  const m = text.match(/(-?[\d,]+)\s*원/);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

// ---------------------------------------------------------------- 상세 파서

export type ParsedDetail = {
  roomName: string | null;
  roomAddress: string | null;
  roadAddress: string | null;
  jibunAddress: string | null;
  guestName: string | null;
  guestPhone: string | null;
  checkinDate: string | null;
  checkoutDate: string | null;
  statusBadge: string | null;
  status: ScrapedContract['status'] | null;
  amounts: Record<string, number>;
  rentPeriod: string | null;
  settledAt: string | null;
  settlementStatus: string | null;
};

// 임차인 블록의 끝을 판정할 때 쓴다. 이 라벨을 만나면 섹션이 끝난 것으로 본다.
const SECTION_HEADERS = ['방 정보', '임대인', '임차인', '임대기간', '정산금액'];

function toLines(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

/** 라벨과 같은 줄에 값이 있으면 그것을, 라벨만 있으면 다음 줄을 돌려준다. */
function fieldIn(lines: string[], start: number, end: number, label: string): string | null {
  for (let i = start; i < end; i++) {
    const line = lines[i];
    if (!line.startsWith(label)) continue;
    const rest = line.slice(label.length).trim();
    if (rest) return rest;
    if (i + 1 < end) return lines[i + 1];
  }
  return null;
}

function amountFor(lines: string[], label: string): number | null {
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].startsWith(label)) continue;
    const here = parseAmount(lines[i].slice(label.length));
    if (here !== null) return here;
    if (i + 1 < lines.length) {
      const next = parseAmount(lines[i + 1]);
      if (next !== null) return next;
    }
  }
  return null;
}

function dateFor(lines: string[], label: string): string | null {
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].startsWith(label)) continue;
    const here = parseKoreanDate(lines[i]);
    if (here) return here;
    if (i + 1 < lines.length) {
      const next = parseKoreanDate(lines[i + 1]);
      if (next) return next;
    }
  }
  return null;
}

export function parseDetailText(text: string): ParsedDetail {
  const lines = toLines(text);
  const after = (label: string): string | null => {
    const i = lines.findIndex((l) => l === label);
    return i >= 0 && i + 1 < lines.length ? lines[i + 1] : null;
  };

  // 임차인 블록의 범위를 먼저 확정한다.
  // 임대인·임차인 양쪽에 '이름/연락처' 가 있어서, 라벨만 보고 첫 매칭을 집으면
  // 호스트 본인 연락처를 게스트 것으로 저장하게 된다. 가장 흔한 파싱 사고다.
  const tenantStart = lines.findIndex((l) => l === '임차인');
  let tenantEnd = lines.length;
  if (tenantStart >= 0) {
    for (let i = tenantStart + 1; i < lines.length; i++) {
      if (SECTION_HEADERS.some((h) => lines[i] === h || lines[i].startsWith(h))) {
        tenantEnd = i;
        break;
      }
    }
  }

  const guestName = tenantStart >= 0 ? fieldIn(lines, tenantStart + 1, tenantEnd, '이름') : null;
  const guestPhone = tenantStart >= 0 ? fieldIn(lines, tenantStart + 1, tenantEnd, '연락처') : null;

  const roadAddress = after('도로명');
  const jibunAddress = after('지번');

  const amounts: Record<string, number> = {};
  for (const [key, label] of [
    ['gross', '이용 금액'],
    ['rent', '임대료'],
    ['maintenance', '관리비'],
    ['cleaning', '청소비'],
    ['fee', '계약 수수료'],
    ['net', '최종 정산 금액'],
  ] as const) {
    const v = amountFor(lines, label);
    if (v !== null) amounts[key] = v;
  }

  // '2026-08-16 정산완료'
  let settledAt: string | null = null;
  let settlementStatus: string | null = null;
  for (const line of lines) {
    const m = line.match(/^(\d{4}-\d{2}-\d{2})\s+(\S+)$/);
    if (m) {
      settledAt = m[1];
      settlementStatus = m[2];
      break;
    }
  }

  const badge = findBadge(text);

  return {
    roomName: after('방 정보'),
    roomAddress: jibunAddress ?? roadAddress,
    roadAddress,
    jibunAddress,
    guestName,
    guestPhone,
    checkinDate: dateFor(lines, '입주일'),
    checkoutDate: dateFor(lines, '퇴실일'),
    statusBadge: badge?.badge ?? null,
    status: badge?.status ?? null,
    amounts,
    rentPeriod: fieldIn(lines, 0, lines.length, '임대기간'),
    settledAt,
    settlementStatus,
  };
}

/** /schedule 페이지의 '거주중 2026.08.15 18:40' 같은 줄들. 실제 시각이라 예정 시각이 아니다. */
export function parseTimeline(text: string): Array<{ label: string; at: string }> {
  const out: Array<{ label: string; at: string }> = [];
  for (const line of toLines(text)) {
    const m = line.match(/^(.+?)\s+(\d{4}\.\d{2}\.\d{2}\s+\d{2}:\d{2})$/);
    if (m) out.push({ label: m[1].trim(), at: m[2] });
  }
  return out;
}

// ---------------------------------------------------------------- 브라우저

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 남의 서버다. 요청 사이에 1~2초 랜덤 대기. */
const politeDelay = () => sleep(1000 + Math.floor(Math.random() * 1000));

async function assertSession(page: Page): Promise<void> {
  await page.goto(`${BASE}/host/main`, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
  await page.waitForLoadState('networkidle').catch(() => {});

  const url = page.url();
  if (/\/(login|signin|auth)\b/i.test(url)) throw new SessionExpiredError(`로그인 페이지로 리다이렉트됨: ${url}`);
  if (await page.locator('input[type="password"]').count()) {
    throw new SessionExpiredError('로그인 폼이 보임');
  }
}

type ListEntry = { id: string; cardText: string };

async function collectOnPage(page: Page): Promise<ListEntry[]> {
  return page.evaluate(() => {
    const out: Array<{ id: string; cardText: string }> = [];
    const seen = new Set<string>();
    document.querySelectorAll('a[href]').forEach((a) => {
      const href = a.getAttribute('href') ?? '';
      const m = href.match(/^\/host\/contract\/(\d+)$/); // .../schedule 은 제외된다
      if (!m || seen.has(m[1])) return;
      seen.add(m[1]);
      const card =
        a.closest('li, article, tr') ??
        a.parentElement?.parentElement ??
        a.parentElement ??
        a;
      out.push({ id: m[1], cardText: (card as HTMLElement).innerText ?? '' });
    });
    return out;
  });
}

/** n 페이지로 이동. 이동했으면 true. */
async function gotoListPage(page: Page, n: number): Promise<boolean> {
  const containers = 'nav, [class*="pagination" i], [class*="paging" i], [class*="Pagination"]';
  const numbered = page.locator(`${containers} a, ${containers} button`).filter({
    hasText: new RegExp(`^\\s*${n}\\s*$`),
  });
  if (await numbered.count()) {
    await numbered.first().click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await sleep(500);
    return true;
  }
  const next = page.locator(`${containers} a, ${containers} button`).filter({ hasText: /^(다음|next|›|>)$/i });
  if (await next.count()) {
    const el = next.first();
    if (await el.isEnabled().catch(() => false)) {
      await el.click();
      await page.waitForLoadState('networkidle').catch(() => {});
      await sleep(500);
      return true;
    }
  }
  return false;
}

async function scrapeDetail(page: Page, id: string): Promise<ScrapedContract> {
  await page.goto(`${BASE}/host/contract/${id}`, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
  await page.waitForLoadState('networkidle').catch(() => {});
  const text = await page.locator('body').innerText();
  const d = parseDetailText(text);

  if (!d.roomName) throw new Error('방 이름을 찾지 못했습니다');
  if (!d.checkinDate) throw new Error('입주일을 찾지 못했습니다');
  if (!d.checkoutDate) throw new Error('퇴실일을 찾지 못했습니다');

  await politeDelay();
  let timeline: Array<{ label: string; at: string }> = [];
  let scheduleText = '';
  try {
    await page.goto(`${BASE}/host/contract/${id}/schedule`, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
    await page.waitForLoadState('networkidle').catch(() => {});
    scheduleText = await page.locator('body').innerText();
    timeline = parseTimeline(scheduleText);
  } catch {
    // 일정 페이지는 부가 정보다. 실패해도 계약 자체는 살린다.
  }

  return {
    externalId: id,
    roomName: d.roomName,
    roomAddress: d.roomAddress,
    jibunAddress: d.jibunAddress,
    guestName: d.guestName,
    guestPhone: d.guestPhone,
    checkinDate: d.checkinDate,
    checkoutDate: d.checkoutDate,
    status: d.status ?? 'confirmed',
    grossAmount: d.amounts.gross ?? 0,
    platformFee: Math.abs(d.amounts.fee ?? 0),
    netAmount: d.amounts.net ?? 0,
    raw: {
      detailText: text,
      scheduleText: scheduleText || undefined,
      parsed: d,
      timeline,
      scrapedAt: new Date().toISOString(),
    },
  };
}

/**
 * 계약 목록을 훑어 상세를 수집한다.
 * 개별 계약이 깨져도 전체를 죽이지 않고 errors 에 모아 계속 진행한다.
 */
export async function scrape(errors: string[] = []): Promise<ScrapedContract[]> {
  if (!env.sessionPath) throw new Error('~/.ponam.env 에 M33_SESSION_PATH 가 없습니다');
  if (!existsSync(env.sessionPath)) {
    throw new SessionExpiredError(`세션 파일이 없습니다: ${env.sessionPath}`);
  }

  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      storageState: env.sessionPath,
      locale: 'ko-KR',
      timezoneId: 'Asia/Seoul',
    });
    const page = await context.newPage();
    page.setDefaultTimeout(NAV_TIMEOUT);

    await assertSession(page);
    await politeDelay();

    await page.goto(`${BASE}/host/contract`, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page
      .waitForSelector('a[href^="/host/contract/"]', { timeout: 20_000 })
      .catch(() => console.warn('경고: 계약 링크를 찾지 못했습니다 (계약이 없거나 마크업이 바뀌었습니다)'));

    // 목록 카드의 뱃지를 상태의 1순위로 쓴다.
    const cardTextById = new Map<string, string>();
    let pageNo = 1;
    for (; pageNo <= MAX_PAGES; pageNo++) {
      for (const e of await collectOnPage(page)) {
        if (!cardTextById.has(e.id)) cardTextById.set(e.id, e.cardText);
      }
      if (!(await gotoListPage(page, pageNo + 1))) break;
    }
    if (pageNo > MAX_PAGES) {
      console.warn(`경고: 페이지가 ${MAX_PAGES}개를 넘었습니다. ${MAX_PAGES}페이지에서 중단합니다.`);
    }

    const ids = [...cardTextById.keys()];
    console.log(`계약 ${ids.length}건 발견 (${Math.min(pageNo, MAX_PAGES)}페이지)`);

    const out: ScrapedContract[] = [];
    for (const id of ids) {
      await politeDelay();
      try {
        const contract = await scrapeDetail(page, id);

        // 카드 텍스트가 지나치게 길면 카드 경계를 잘못 잡은 것이다. 그럴 땐 상세 값을 쓴다.
        const cardText = cardTextById.get(id) ?? '';
        if (cardText && cardText.length <= 600) {
          const fromCard = findBadge(cardText);
          if (fromCard) {
            contract.status = fromCard.status;
            (contract.raw as Record<string, unknown>).listBadge = fromCard.badge;
          }
        }
        out.push(contract);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`계약 ${id}: ${msg}`);
        console.warn(`건너뜀 — 계약 ${id}: ${msg}`);
      }
    }
    return out;
  } finally {
    await browser?.close();
  }
}
