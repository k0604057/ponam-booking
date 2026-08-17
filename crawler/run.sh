#!/bin/zsh
# launchd 용 래퍼.
#
# launchd 는 PATH 가 빈약하므로 node 를 절대경로로 박는다.
# 다만 node 를 업그레이드하거나 homebrew 를 옮기면 그 경로가 사라진다.
# 그때 조용히 실패하면 sync_runs 에 기록조차 안 남으므로,
#   1) 박아둔 절대경로 → 2) PATH 의 node → 3) 명확한 에러와 함께 종료
# 순서로 처리한다.

set -a
source "$HOME/.ponam.env"
set +a

APP_DIR="$HOME/ponam-booking"
cd "$APP_DIR" || { echo "[크롤러] 디렉터리가 없습니다: $APP_DIR" >&2; exit 1; }

NODE_PINNED=/opt/homebrew/bin/node
TSX="$APP_DIR/node_modules/tsx/dist/cli.mjs"

if [[ -x "$NODE_PINNED" ]]; then
  NODE="$NODE_PINNED"
else
  NODE="$(command -v node 2>/dev/null)"
  if [[ -n "$NODE" ]]; then
    echo "[크롤러] 경고: $NODE_PINNED 가 없어 PATH 의 node 로 대체합니다: $NODE" >&2
  else
    echo "[크롤러] 오류: node 를 찾을 수 없습니다." >&2
    echo "         확인한 곳: $NODE_PINNED, 그리고 PATH(=$PATH)" >&2
    echo "         node 경로가 바뀌었다면 crawler/run.sh 의 NODE_PINNED 와" >&2
    echo "         docs/01_프로젝트현황.md 5절을 함께 고치세요." >&2
    exit 1
  fi
fi

if [[ ! -f "$TSX" ]]; then
  echo "[크롤러] 오류: tsx 가 없습니다: $TSX" >&2
  echo "         '$APP_DIR' 에서 npm install 을 실행하세요." >&2
  exit 1
fi

echo "=== $(date '+%Y-%m-%d %H:%M:%S') 크롤러 시작 (node: $NODE) ==="
exec "$NODE" "$TSX" crawler/run.ts
