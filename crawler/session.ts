// 33m2 로그인 세션 1회 캡처. 사람이 맥 화면 앞에서 직접 실행한다.
//   npx tsx crawler/session.ts
// 헤드리스로는 로그인을 못 뚫으므로 headless:false 로 띄우고, 로그인을 마친 뒤
// 터미널에서 Enter 를 누르면 storageState 를 저장한다.
//
// 세션은 언젠가 만료된다. sync_runs 에 failed 가 쌓이면 이걸 다시 돌리면 된다.

import { chromium } from 'playwright';
import { chmodSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { env } from './env';

const START_URL = 'https://web.33m2.co.kr/host/main';

async function main() {
  if (!env.sessionPath) {
    throw new Error('~/.ponam.env 에 M33_SESSION_PATH 가 없습니다');
  }

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
  });
  const page = await context.newPage();
  await page.goto(START_URL, { waitUntil: 'domcontentloaded' });

  const rl = createInterface({ input: stdin, output: stdout });
  await rl.question('\n브라우저에서 로그인을 마친 뒤 이 터미널에서 Enter\n');
  rl.close();

  mkdirSync(dirname(env.sessionPath), { recursive: true });
  await context.storageState({ path: env.sessionPath });
  chmodSync(env.sessionPath, 0o600);

  await browser.close();
  console.log(`세션 저장 완료: ${env.sessionPath} (chmod 600)`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
