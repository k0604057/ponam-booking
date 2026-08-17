// 수집 결과를 Supabase 에 반영한다.
// service_role 로 접속해 RLS 를 우회한다. 예약 1건은 3개 테이블에 나눠 넣는다:
//   reservations (숙소·기간·상태) / reservation_private (게스트·raw) / reservation_finance (금액)
//
// 숙소(properties)도 크롤러가 만든다. 키는 지번 주소다 — resolvePropertyId 주석 참고.
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
 * 숙소도 크롤러가 만든다. 수동 등록은 없다.
 *
 * 키는 지번 주소다 (properties.external_id = 지번 주소).
 * 방 이름은 호스트가 언제든 바꾸는 홍보 문구라 키로 불안정하다.
 *
 * 주소가 수정되면 숙소가 하나 더 생긴다. 자동 병합은 하지 않는다 —
 * 잘못 합치는 게 중복보다 나쁘다. 설정 화면에서 사람이 확인하고 합친다.
 */
async function resolvePropertyId(
  client: Client,
  item: ScrapedContract,
  warnings: string[]
): Promise<string> {
  const key = item.jibunAddress;
  if (!key) {
    // 도로명 주소로 대신 키를 잡으면 같은 숙소가 다른 키로 하나 더 생긴다. 추측하지 않고 실패시킨다.
    throw new Error(`지번 주소를 찾지 못해 숙소를 특정할 수 없습니다 (방 이름: '${item.roomName}')`);
  }

  const { data: found, error: selErr } = await client
    .from('properties')
    .select('id, name')
    .eq('external_id', key)
    .maybeSingle();
  if (selErr) throw new Error(`properties 조회 실패: ${selErr.message}`);

  if (found) {
    // 이름이 달라졌을 때만 갱신한다.
    if (found.name !== item.roomName) {
      const { error: updErr } = await client
        .from('properties')
        .update({ name: item.roomName })
        .eq('id', found.id);
      if (updErr) throw new Error(`properties 이름 갱신 실패: ${updErr.message}`);
      warnings.push(`숙소 이름 변경 반영: '${found.name}' → '${item.roomName}'`);
    }
    return found.id;
  }

  const { data: created, error: insErr } = await client
    .from('properties')
    .insert({ name: item.roomName, address: key, external_id: key })
    .select('id')
    .single();
  if (insErr) throw new Error(`properties 등록 실패: ${insErr.message}`);
  warnings.push(`숙소 신규 등록: '${item.roomName}' (${key})`);
  return created.id;
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
    const propertyId = await resolvePropertyId(client, item, warnings);

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
