# GitHub Actions Workflows

## ワークフロー一覧

### CI

| ファイル | トリガー | 内容 |
|---------|---------|------|
| `backend-ci.yml` | `backend/**` 変更時 | Lint, アーキテクチャチェック, Docker, pytest |
| `frontend-ci.yml` | `frontend/**` 変更時 | ビルド, Jest |
| `infra-ci.yml` | `infra/**` 変更時 | ビルド, Jest, CDK synth |

### CD

| ファイル | トリガー | 内容 |
|---------|---------|------|
| `deploy-manual.yml` | `workflow_dispatch` | 手動実行 + 手動承認デプロイ |
| `update-swagger.yml` | main の `backend/app/presentation/**` 変更時 | Swagger自動更新 |

`deploy-auto.yml` は自動デプロイ停止のため `.github/workflows-disabled/deploy-auto.yml` へ退避済みです。
現在の active なデプロイ workflow は `deploy-manual.yml` のみです。

---

## デプロイフロー

`workflow_dispatch` 実行時に `environment` 入力で `stg` / `prod` を選択します。

```
detect-changes → deploy-infra → deploy-backend → migrate-database
```

---

## ドキュメント

- **[CI/CDガイド](../../docs/rules/operations/CI_CD_GUIDE.md)** - ワークフロー詳細
- **[CI/CDセットアップ](../../docs/rules/operations/CI_CD_SETUP.md)** - デプロイワークフロー有効化手順

---

**最終更新**: 2025-12-23
