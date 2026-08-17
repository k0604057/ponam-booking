// 크롤러 진입점.
//   ~/.ponam.env 로드 → sync_runs 시작 기록 → scrape → upsert → 종료 기록
//   실패 시 sync_runs.status='failed' + error_message 기록 후 exit 1
//
// 쓰기는 service_role 로 RLS 를 우회한다.
// error_message 에 세션 토큰·비밀번호가 섞이지 않도록 마스킹한 뒤 기록한다.

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/db';
import { env, forErrorMessage, requireEnv } from './env';
import { scrape } from './scrape33m2';
import { upsertAll } from './upsert';

async function main(): Promise<number> {
  requireEnv();

  const client = createClient<Database>(env.supabaseUrl, env.serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: run, error: runErr } = await client
    .from('sync_runs')
    .insert({ status: 'running' })
    .select('id')
    .single();
  if (runErr) throw new Error(`sync_runs 시작 기록 실패: ${runErr.message}`);
  const runId = run.id;
  console.log(`[run ${runId}] 시작`);

  const problems: string[] = [];
  try {
    const items = await scrape(problems);

    // 안전장치: 결과가 0건이면 DB 를 건드리지 않는다.
    // 로그아웃·마크업 변경으로 데이터가 통째로 이상해지는 걸 막는다.
    if (items.length === 0) {
      throw new Error(
        '수집 결과가 0건입니다. 세션 만료나 마크업 변경일 수 있어 DB 를 건드리지 않고 실패로 남깁니다.' +
          (problems.length ? ` (개별 실패 ${problems.length}건: ${problems.join(' | ')})` : '')
      );
    }

    const { created, updated } = await upsertAll(items, runId, problems);

    const { error: doneErr } = await client
      .from('sync_runs')
      .update({
        status: 'success',
        finished_at: new Date().toISOString(),
        found_count: items.length,
        created_count: created,
        updated_count: updated,
        // 부분 실패·대체가 있었으면 성공이어도 흔적을 남긴다.
        error_message: problems.length ? forErrorMessage(problems.join(' | ')) : null,
      })
      .eq('id', runId);
    if (doneErr) throw new Error(`sync_runs 종료 기록 실패: ${doneErr.message}`);

    console.log(`[run ${runId}] 완료 — 발견 ${items.length} / 신규 ${created} / 갱신 ${updated}`);
    if (problems.length) console.warn(`[run ${runId}] 경고 ${problems.length}건:\n  ${problems.join('\n  ')}`);
    return 0;
  } catch (err) {
    const detail = err instanceof Error ? (err.stack ?? err.message) : String(err);
    const message = forErrorMessage(detail);

    const { error: failErr } = await client
      .from('sync_runs')
      .update({ status: 'failed', finished_at: new Date().toISOString(), error_message: message })
      .eq('id', runId);
    if (failErr) console.error(`sync_runs 실패 기록마저 실패: ${failErr.message}`);

    console.error(`[run ${runId}] 실패\n${message}`);
    return 1;
  }
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    // sync_runs 행조차 못 만든 단계의 실패 (env 누락 등).
    console.error(forErrorMessage(err instanceof Error ? err.message : String(err)));
    process.exit(1);
  });
