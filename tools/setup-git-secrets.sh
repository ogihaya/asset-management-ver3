#!/usr/bin/env bash
set -euo pipefail

echo "=== git-secrets セットアップ ==="

# git-secrets がインストールされているか確認
if ! command -v git-secrets &> /dev/null; then
  echo "git-secrets がインストールされていません。"
  echo ""
  echo "インストール方法:"
  echo "  macOS:  brew install git-secrets"
  echo "  Linux:  https://github.com/awslabs/git-secrets#installing-git-secrets"
  exit 1
fi

echo "git-secrets を初期化中..."
git secrets --install -f

echo "AWS パターンを登録中..."
git secrets --register-aws

echo "カスタム API キーパターンを追加中..."
# Anthropic API Key
git secrets --add 'sk-ant-api[0-9a-zA-Z-]{95}' 2>/dev/null || true
# OpenAI API Key
git secrets --add 'sk-[a-zA-Z0-9]{48}' 2>/dev/null || true
# OpenAI Service Account Key
git secrets --add 'sk-svcacct-[a-zA-Z0-9-]{100,}' 2>/dev/null || true

echo ""
echo "=== セットアップ完了 ==="
echo ""
echo "現在の設定:"
git secrets --list
echo ""
echo "動作確認コマンド:"
echo "  git secrets --scan          # リポジトリをスキャン"
echo "  git secrets --scan-history  # コミット履歴をスキャン"
