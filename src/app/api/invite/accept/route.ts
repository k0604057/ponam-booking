import { NextResponse } from "next/server";

// invites 테이블은 owner만 읽을 수 있게 RLS로 막혀 있어 클라이언트에서 직접 조회할 수 없다.
// 초대 수락은 반드시 service_role(supabaseAdmin)을 쓰는 이 서버 라우트에서 처리한다.
// 구현은 스펙 #2에서. 지금은 골격만 둔다.
export async function POST() {
  return NextResponse.json({ error: "not_implemented" }, { status: 501 });
}
