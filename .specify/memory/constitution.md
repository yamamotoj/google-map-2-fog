<!--
Sync Impact Report
- Version change: unknown (template placeholder) → 0.1.0
- Modified principles:
  - I. Spec-Driven Development (Speckit First)
  - II. Keep It Shippable (Small, Reversible Changes)
  - III. Test Discipline (NON-NEGOTIABLE)
  - IV. Security & Secrets by Default
  - V. Observability & Debuggability
- Added sections:
  - Repository Standards
  - Workflow & Quality Gates
- Removed sections: None
- Templates requiring updates:
  - ✅ updated: .specify/templates/plan-template.md
  - ✅ updated: .specify/templates/tasks-template.md
  - ✅ unchanged: .specify/templates/spec-template.md
  - ✅ unchanged: .specify/templates/checklist-template.md
- Follow-up TODOs:
  - TODO(RATIFICATION_DATE): この憲章を正式に採択した日付（YYYY-MM-DD）を決めて更新してください
-->

# google-map-2-fog Constitution

## Core Principles

### I. Spec-Driven Development (Speckit First)
このリポジトリの作業は、必ず `specs/<###-feature-name>/` のドキュメントを一次情報として進める。

- 変更着手前に、対象機能の `spec.md`（要求）と `plan.md`（構成/判断）を更新または作成する
- 実装は `tasks.md` の粒度で進め、タスクには必ずファイルパスと検証方法を含める
- 「何を作るか」「どう検証するか」が文書化できない変更は、実装より先に文書を直す

### II. Keep It Shippable (Small, Reversible Changes)
常に「小さく・戻せる・レビューできる」単位で進める。

- 1つの変更は、1つの目的に絞る（混ぜない）
- 既存の振る舞い変更は、移行手順とロールバック手順を同時に用意する
- 不確実性が高い場合は、捨てやすいSpike/PoCとして明示し、本番品質のコミットと混在させない

### III. Test Discipline (NON-NEGOTIABLE)
新規または変更した振る舞いには、再現可能なテスト/検証を必ず付ける（例外は明示したSpikeのみ）。

- 仕様（Given/When/Then）に対応する検証が存在しないコード変更はマージしない
- 可能な限り「失敗するテスト → 実装 → パス」の順で進める（TDDを推奨）
- 外部依存（ネットワーク、時刻、乱数、APIキーなど）はテストで固定/モックし、再現性を担保する

### IV. Security & Secrets by Default
秘密情報と利用者データを守る設計をデフォルトにする。

- APIキーやトークン等の秘密情報は、リポジトリにコミットしない
- 設定は環境変数や安全な設定ファイルに寄せ、ドキュメントにはセットアップ手順を残す
- 外部サービス/SDKを扱う場合は、最小権限と失敗時の挙動（フォールバック/リトライ/エラーメッセージ）を設計する

### V. Observability & Debuggability
問題が起きたときに「再現・切り分け・復旧」ができる状態を作る。

- エラーは握りつぶさず、原因特定に必要な情報を出す（秘密情報は出さない）
- 重要な処理には、必要最小限のログ/メトリクス/トレース（可能なら）を付ける
- 期待される失敗（入力不正、権限不足、外部API失敗など）は、利用者に分かる形で返す

## Repository Standards

- `specs/<###-feature-name>/` を設計/意思決定の保管場所とし、コード変更と一緒に更新する
- 自動生成テンプレや `.specify` 配下は、参照パスが壊れないよう整合を維持する
- 依存関係は可能な限り固定（ロック/ピン留め）し、再現可能なビルド/テストを優先する
- ファイル/ディレクトリ命名は一貫性を保ち、意図が伝わらない略語を避ける

## Workflow & Quality Gates

- すべての変更はレビューを通す（セルフマージしない）
- 破壊的変更は、影響範囲・移行手順・バージョニング（SemVer）を必ず文書化する
- マージ前に最低限、対象変更の検証（テスト/手動手順/再現手順）を `specs/...` に残す
- 「憲章に反するが必要」な場合は、`plan.md` の Complexity Tracking に例外理由を記載する

## Governance

- この憲章は、他の慣習/テンプレより優先される
- 変更（Amendment）は、`.specify/memory/constitution.md` の更新として行い、Sync Impact Report を更新する
- バージョニングは SemVer を用いる:
  - MAJOR: 互換性のない原則変更（原則の撤廃/再定義、必須ゲートの削除など）
  - MINOR: 原則/セクションの追加、またはガイダンスの実質的な拡張
  - PATCH: 誤字修正、明確化などの意味的に軽微な変更
- レビュー時は「Constitution Check」を必ず確認し、違反がある場合は例外理由と代替案を残す

**Version**: 0.1.0 | **Ratified**: TODO(RATIFICATION_DATE): 採択日を設定してください | **Last Amended**: 2025-12-30
