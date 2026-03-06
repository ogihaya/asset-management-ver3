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
| `deploy-auto.yml` | develop/main へのpush | 自動デプロイ（承認なし） |
| `deploy-manual.yml` | develop/main へのpush | 手動承認デプロイ |
| `update-swagger.yml` | main の `backend/app/presentation/**` 変更時 | Swagger自動更新 |

**注意**: `deploy-auto.yml` と `deploy-manual.yml` はどちらか一方のみ有効化すること。

---

## デプロイフロー

```
develop → staging環境
main    → production環境
```

```
detect-changes → deploy-infra → deploy-backend → migrate-database
```

---

## ドキュメント

- **[CI/CDガイド](../../docs/rules/operations/CI_CD_GUIDE.md)** - ワークフロー詳細
- **[CI/CDセットアップ](../../docs/rules/operations/CI_CD_SETUP.md)** - デプロイワークフロー有効化手順

---

**最終更新**: 2025-12-23
