# Implementation Plan: Googleマップ タイムライン → Fog of World データコンバータ

**Branch**: `001-timeline-fog-converter` | **Date**: 2025-12-30 | **Spec**: `specs/001-timeline-fog-converter/spec.md`  
**Input**: Feature specification from `specs/001-timeline-fog-converter/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. If you use the repo scripts, see `.specify/scripts/bash/setup-plan.sh`.

## Summary

iPhone（Google マップアプリ）からエクスポートしたタイムラインJSONを、Fog of World が読み込める GPX に
変換する。タイムラインの点列を正規化し、必要に応じて Google Maps の経路検索で点間を補完した上で、
日次スケジュールで少しずつ処理していく。

出力先は Google Drive の所定フォルダとし、iPhone 側の自動化（ショートカット等）で iCloud の所定
フォルダへ移送する。無料枠/予算を超えないよう、経路検索は日次の上限（予算）を設定して段階的に進め、
途中失敗しても進捗から再開できるよう状態を保存する。

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: Google Apps Script（V8 runtime / JavaScript。必要に応じてTypeScriptを利用）  
**Primary Dependencies**: Apps Script built-ins（DriveApp/UrlFetchApp/PropertiesService/Triggers）、Google Maps Platform（Routes/Directions系の経路検索）  
**Storage**: Google Drive（入力/出力ファイル）、Apps Script Properties（進捗・設定）、（任意）Spreadsheet（実行ログ）  
**Testing**: （推奨）純粋関数はローカルで単体テスト、E2Eは少量データで手動検証（Fog of World へのインポート含む）  
**Target Platform**: Google Apps Script（時間主導トリガーで日次実行）
**Project Type**: single（GASプロジェクト）  
**Performance Goals**: 1回の実行で「上限内（時間/予算）」の範囲で確実に進捗を進める（途中で止まっても次回再開できる）  
**Constraints**: GASの実行時間制限（目安: 1回あたり数分）、外部APIのクオータ/課金、URLFetchのレート制限、巨大JSONを一括でメモリ展開しない  
**Scale/Scope**: 20年以上の位置履歴（大量の地点/移動を想定）。日単位で分割処理し、出力も分割して管理する

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Gate: Spec-Driven**: `spec.md` と `plan.md` が最新で、判断/仮定が明記されている  
- **Gate: Shippable**: 日次の増分処理で前進でき、冪等（再実行で二重化しない）である  
- **Gate: Test Discipline**: 変換ロジックの検証手段（単体テスト/サンプル入力/受け入れ手順）が用意される  
- **Gate: Security**: Maps APIキー等の秘密情報をリポジトリに置かず、安全な手段で設定する  
- **Gate: Observability**: 実行ごとの処理件数・失敗理由・次回予定が記録され、切り分け可能である

現時点の評価（Phase 0前）:
- Spec-Driven: ✅
- Shippable: ✅（日次処理+進捗保存を設計に含める）
- Test Discipline: ✅（research/designで検証方針を具体化する）
- Security: ✅（キーはScript Propertiesで管理する）
- Observability: ✅（ログ/サマリ出力を要件化する）

## Project Structure

### Documentation (this feature)

```text
specs/001-timeline-fog-converter/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
gas/                       # Apps Script project (clasp-managed)
├── appsscript.json
└── src/
    ├── main.ts            # entrypoint (trigger / manual run)
    ├── takeout/           # Timeline export JSON parsing + normalization（命名は互換のため維持）
    ├── routes/            # route enrichment + caching/budget
    ├── gpx/               # GPX building + file naming
    └── state/             # JobState persistence (Properties)

tools/
└── fixtures/              # small sample Takeout inputs for local tests

tests/
└── unit/                  # pure-function unit tests (optional but recommended)
```

**Structure Decision**: GASを中核とする単一プロジェクト。コードは `gas/` に集約し、長期バッチの進捗は
Propertiesで管理する。入出力は Drive フォルダ境界を「契約」として扱う。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |

## Phase 0 Output (Research)

- `specs/001-timeline-fog-converter/research.md`

## Phase 1 Output (Design)

- `specs/001-timeline-fog-converter/data-model.md`
- `specs/001-timeline-fog-converter/contracts/`
- `specs/001-timeline-fog-converter/quickstart.md`

## Constitution Check (Post-Design)

- Spec-Driven: ✅（spec/plan/research/design artifacts が揃い、判断が明記されている）
- Shippable: ✅（日次分割 + 進捗保存 + 冪等性を設計に含めた）
- Test Discipline: ✅（純粋関数の単体テスト + 小規模E2E手順を quickstart に残す方針）
- Security: ✅（秘密情報は Script Properties 等で管理、ログに出さない）
- Observability: ✅（RunLog の契約を定義し、実行サマリが残る設計）
