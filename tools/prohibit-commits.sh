#!/usr/bin/env bash
set -euo pipefail

# 特定ブランチへのコミットを禁止する
readonly PROHIBIT_BRANCHES=("master" "main")

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
readonly CURRENT_BRANCH
code=0

if echo "${PROHIBIT_BRANCHES[@]}" | grep -q "$CURRENT_BRANCH"; then
  echo -e "\033[31;22m================================================================"
  echo -e "${CURRENT_BRANCH} ブランチへのコミットは禁止されています。"
  echo -e "別のブランチに切り替えてから再度コミットしてください。"
  echo -e "================================================================\033[0m"
  code=1
fi

exit $code
