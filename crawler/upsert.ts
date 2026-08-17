// 수집 결과를 Supabase 에 반영한다.
// service_role 로 접속해 RLS 를 우회한다. 예약 1건은 3개 테이블에 나눠 넣는다:
//   reservations (숙소·기간·상태) / reservation_private (게스트·raw) / reservation_finance (금액)
//
// 삭제는 하지 않는다. 목록에서 사라진 계약도 그대로 둔다.
// 청소 일정도 만들지 않는다 — reservations 를 쓰면 DB 트리거가 알아서 처리한다.

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/db';
import type { ScrapedContract } from './scrape33m2';
import { env } from './env';

export type UpsertResult = { created: number; updated: number };

function db() {
  return createClient<Database>(env.supabaseUrl, env.serviceRoleKey, {
    auth: { persistSession: false },
  });
}

type Client = ReturnType<typeof db>;

/**
 * 상세 페이지의 방 이름으로 properties.external_id 를 찾는다.
 * 못 찾았는데 활성 숙소가 정확히 하나뿐이면 그걸 쓰고 경고를 남긴다.
 * 활성 숙소가 둘 이상인데 못 찾으면 그 계약은 건너뛴다.
 */
async function resolvePropertyId(
  client: Client,
  roomName: string,
  warnings: string[]
): Promise<string> {
  const { data: exact, error: e1 } = await client
    .from('properties')
    .select('id')
    .eq('external_id', roomName)
    .maybeSingle();
  if (e1) throw new Error(`properties 조회 실패: ${e1.message}`);
  if (exact) return exact.id;

  const { data: actives, error: e2 } = await client
    .from('properties')
    .select('id, name')
    .eq('is_active', true);
  if (e2) throw new Error(`properties 조회 실패: ${e2.message}`);

  if (actives && actives.length === 1) {
    warnings.push(`숙소 '${roomName}' 를 external_id 로 못 찾아 유일한 활성 숙소('${actives[0].name}')로 대체했습니다`);
    return actives[0].id;
  }
  throw new Error(
    `숙소 '${roomName}' 를 찾지 못했습니다 (활성 숙소 ${actives?.length ?? 0}개 — 유일하지 않아 대체 불가)`
  );
}

/** 기존 예약과 비교해 바뀐 필드마다 reservation_changes 에 한 줄씩 남긴다. */
async function recordChanges(
  client: Client,
  reservationId: string,
  before: { checkin_date: string; checkout_date: string; status: string },
  after: { checkin_date: string; checkout_date: string; status: string }
): Promise<void> {
  const rows = (['checkin_date', 'checkout_date', 'status'] as const)
    .filter((f) => before[f] !== after[f])
    .map((f) => ({
      reservation_id: reservationId,
      field: f,
      old_value: String(before[f]),
      new_value: String(after[f]),
    }));
  if (!rows.length) return;

  const { error } = await client.from('reservation_changes').insert(rows);
  if (error) throw new Error(`reservation_changes 기록 실패: ${error.message}`);
}

export async function upsertAll(
  items: ScrapedContract[],
  runId: number,
  warnings: string[] = []
): Promise<UpsertResult> {
  const client = db();
  let created = 0;
  let updated = 0;

  for (const item of items) {
    const propertyId = await resolvePropertyId(client, item.roomName, warnings);

    const { data: existing, error: exErr } = await client
      .from('reservations')
      .select('id, checkin_date, checkout_date, status')
      .eq('property_id', propertyId)
      .eq('external_id', item.externalId)
      .maybeSingle();
    if (exErr) throw new Error(`reservations 조회 실패 (${item.externalId}): ${exErr.message}`);

    // nights 는 generated 컬럼이라 넣지 않는다.
    // first_seen_at 도 넣지 않는다 — upsert 는 넘긴 컬럼만 SET 하므로 최초값이 보존된다.
    const payload = {
      property_id: propertyId,
      external_id: item.externalId,
      status: item.status,
      checkin_date: item.checkinDate,
      checkout_date: item.checkoutDate,
      last_synced_at: new Date().toISOString(),
    };

    const { data: saved, error: upErr } = await client
      .from('reservations')
      .upsert(payload, { onConflict: 'property_id,external_id' })
      .select('id')
      .single();
    if (upErr) throw new Error(`reservations upsert 실패 (${item.externalId}): ${upErr.message}`);

    if (existing) {
      updated++;
      await recordChanges(client, saved.id, existing, payload);
    } else {
      created++;
    }

    const { error: pvErr } = await client.from('reservation_private').upsert(
      {
        reservation_id: saved.id,
        guest_name: item.guestName,
        guest_phone: item.guestPhone,
        raw: item.raw as never,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'reservation_id' }
    );
    if (pvErr) throw new Error(`reservation_private upsert 실패 (${item.externalId}): ${pvErr.message}`);

    const { error: fiErr } = await client.from('reservation_finance').upsert(
      {
        reservation_id: saved.id,
        gross_amount: item.grossAmount,
        platform_fee: item.platformFee,
        net_amount: item.netAmount,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'reservation_id' }
    );
    if (fiErr) throw new Error(`reservation_finance upsert 실패 (${item.externalId}): ${fiErr.message}`);
  }

  console.log(`[run ${runId}] 신규 ${created}건 / 갱신 ${updated}건`);
  return { created, updated };
}
