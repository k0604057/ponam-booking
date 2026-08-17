#!/bin/zsh
# launchd 용 래퍼. launchd 는 PATH 가 빈약하므로 node 를 절대경로로 박는다.
# node 위치가 바뀌면(homebrew 재설치·nvm 전환) 아래 NODE 를 다시 맞춰야 한다.
set -a
source "$HOME/.ponam.env"
set +a

cd "$HOME/ponam-booking" || exit 1

NODE=/opt/homebrew/bin/node
TSX="$HOME/ponam-booking/node_modules/tsx/dist/cli.mjs"

if [[ ! -x "$NODE" ]]; then
  echo "node 를 찾을 수 없습니다: $NODE" >&2
  exit 1
fi

echo "=== $(date '+%Y-%m-%d %H:%M:%S') 크롤러 시작 ==="
exec "$NODE" "$TSX" crawler/run.ts
