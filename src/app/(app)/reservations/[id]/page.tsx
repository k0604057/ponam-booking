export default async function ReservationDetailPage({
  params,
}: PageProps<"/reservations/[id]">) {
  const { id } = await params;
  return <h1>예약 상세 — {id}</h1>;
}
