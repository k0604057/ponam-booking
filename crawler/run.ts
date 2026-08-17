// ~/.ponam.env 로드 → sync_runs 시작 기록 → scrape → upsert → 종료 기록
// 실패 시 sync_runs.status='failed' + error_message 기록 후 exit 1
// 쓰기는 service_role 로 RLS를 우회한다. 예약 1건은 3개 테이블에 나눠 넣는다:
//   reservations (숙소·기간·상태) / reservation_private (게스트·raw) / reservation_finance (금액)
// error_message 에 세션 토큰·비밀번호가 섞이지 않도록 마스킹한 뒤 기록할 것.
//
// 수집 로직은 스펙 #2에서. 여기서는 골격만 둔다.

import { config } from 'dotenv';
import { homedir } from 'node:os';
import { join } from 'node:path';

config({ path: join(homedir(), '.ponam.env') });

async function main() {
  throw new Error('not_implemented: 스펙 #2에서 구현');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
