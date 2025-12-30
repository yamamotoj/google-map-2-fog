---

description: "Task list for implementing the converter (GAS) and long-running scheduled processing"
---

# Tasks: Googleマップ タイムライン → Fog of World データコンバータ

**Input**: Design documents from `specs/001-timeline-fog-converter/`  
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: この機能は新規/変更の振る舞いを含むため、テスト/検証タスクは原則必須（Spike/PoCではない）。

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- タスク説明には **必ず具体的なファイルパス** と **検証方法** を含める

## Path Conventions（このリポジトリの決定）

- **GAS project**: `gas/`（clasp管理を想定）
- **Source**: `gas/src/**`
- **Local tests (optional but recommended)**: `tests/unit/**`
- **Fixtures**: `tools/fixtures/**`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 [P] [US1] `gas/` ディレクトリを作成し、`appsscript.json` と `gas/src/` 骨格を用意する（検証: リポジトリに構造が追加されている）
- [ ] T002 [P] [US1] clasp の導入方針を決める（README相当が無いので `specs/001-timeline-fog-converter/quickstart.md` に手順追記でも可）（検証: ローカル→GASへpushできる前提が明文化）
- [ ] T003 [P] [US1] `gas/src/state/` に Script Properties キー一覧（定数）を定義する（検証: 参照すべきキーがコードで一元管理される）
- [ ] T004 [P] [US1] `tools/fixtures/` に小さなTakeoutサンプル（匿名化）を置くか、置けない場合は生成手順を `quickstart.md` に追記する（検証: US1の検証用入力が再現可能）

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 [P] [US1] 入出力フォルダの「契約」をコード化する: `gas/src/state/config.ts`（TAKEOUT_FOLDER_ID/OUTPUT_FOLDER_ID 等の取得とバリデーション）（検証: 設定不足で明確なエラーになる）
- [ ] T006 [P] [US1] 実行ログの最小インターフェースを作る: `gas/src/state/runLog.ts`（console or Spreadsheet を抽象化）（検証: 実行サマリが必ず残る）
- [ ] T007 [P] [US3] `JobState` の永続化を実装: `gas/src/state/jobState.ts`（読み/書き、初期化、スキーマversion）（検証: 進捗が保存され次回読み出せる）
- [ ] T008 [P] [US3] 日次予算（経路補完上限）の管理を実装: `gas/src/state/budget.ts`（日付でリセット、消費、上限判定）（検証: 上限到達で補完を止められる）
- [ ] T009 [US1] エントリポイントを用意: `gas/src/main.ts`（手動実行関数 + 日次トリガー用関数を分ける）（検証: GASエディタから実行できる）

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - タイムラインをGPXに変換してDriveに出力 (Priority: P1) 🎯 MVP

**Goal**: Takeout JSON（小さい期間）を読み、正規化した点列を GPX にして Drive 出力する

**Independent Test**: `tools/fixtures/` のサンプル入力を使い、`timeline-YYYY-MM-DD.gpx` が Drive に生成され、Fog of World に取り込める

### Tests for User Story 1 ⚠️

> **NOTE: 可能な限りテスト/検証を先に作る（少なくともサンプル入力での再現可能な手順を確立）**

- [ ] T010 [P] [US1] サンプル入力 → 正規化点列 変換の単体テストを作る: `tests/unit/takeout_normalize.test.ts`（検証: 欠損/重複の扱いが期待通り）
- [ ] T011 [P] [US1] GPX生成の単体テストを作る: `tests/unit/gpx_builder.test.ts`（検証: `trkpt lat/lon` と `time` が含まれる）
- [ ] T012 [US1] 手動E2E手順を `specs/001-timeline-fog-converter/quickstart.md` に追記（Fog of Worldへの取り込みまで）（検証: 第三者が再現できる）

### Implementation for User Story 1

- [ ] T013 [P] [US1] Takeout JSON の探索/読み込み: `gas/src/takeout/discovery.ts`（Driveフォルダ配下から対象JSONを列挙）（検証: 入力フォルダから候補ファイルを列挙できる）
- [ ] T014 [P] [US1] Takeout JSON のパース: `gas/src/takeout/parser.ts`（壊れたJSON/想定外をファイル単位でスキップ）（検証: 異常ファイルがあっても全体は継続）
- [ ] T015 [P] [US1] 正規化（Raw → TimelinePoint）: `gas/src/takeout/normalize.ts`（E7座標→度、timestamp正規化、欠損スキップ、重複排除/間引き）（検証: specのUS1シナリオを満たす）
- [ ] T016 [P] [US1] 日単位の分割（点列→YYYY-MM-DD単位）: `gas/src/takeout/partition.ts`（検証: 出力単位が日ごとになる）
- [ ] T017 [P] [US1] GPXビルダー: `gas/src/gpx/builder.ts`（trk/trkseg/trkpt生成）（検証: `contracts/output-gpx.md` を満たす）
- [ ] T018 [P] [US1] Drive出力: `gas/src/gpx/exportToDrive.ts`（出力フォルダへ `timeline-YYYY-MM-DD.gpx` 作成、既存あればスキップ）（検証: 冪等に動く）
- [ ] T019 [US1] `main.ts` からUS1パイプラインを実行できるよう統合（検証: 1日分の出力が作れる）

**Checkpoint**: User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - 経路補完（Routes）で点間を補完 (Priority: P2)

**Goal**: 点と点の間を経路検索で補完し、Fogの途切れを減らす

**Independent Test**: 2点入力で補完点列が出力GPXに含まれ、失敗時は点列のみで継続する

### Tests for User Story 2

- [ ] T020 [P] [US2] 経路補完の「予算上限」「キャッシュヒット」「失敗時フォールバック」の単体テスト: `tests/unit/routes_budget_cache.test.ts`（検証: 上限でAPI呼び出しが止まる）
- [ ] T021 [P] [US2] 経路補完を無効化した場合の回帰テスト（US1が壊れない）: `tests/unit/us1_regression.test.ts`（検証: 出力が従来通り）

### Implementation for User Story 2

- [ ] T022 [P] [US2] Routesリクエスト生成（丸め/キャッシュキー）: `gas/src/routes/request.ts`（検証: 同一ODでキーが安定する）
- [ ] T023 [P] [US2] Routes呼び出し（UrlFetch）: `gas/src/routes/client.ts`（検証: 1回のリクエストで結果を取得できる／失敗を分類できる）
- [ ] T024 [P] [US2] 結果の点列化（RouteResult → TimelinePoint[]）: `gas/src/routes/expand.ts`（検証: GPXに載せられる点列になる）
- [ ] T025 [P] [US2] キャッシュ層（Properties/Drive/CacheServiceのいずれか）: `gas/src/routes/cache.ts`（検証: 同一キーで呼び出しが抑制される）
- [ ] T026 [US2] パイプライン統合: `gas/src/main.ts`（US1の分割後に、必要な区間だけ補完を試みる）（検証: US2受け入れシナリオを満たす）
- [ ] T027 [US2] 失敗理由の記録を `runLog` に統合（検証: 何が失敗したか追える）

**Checkpoint**: User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - 日次スケジュールで20年以上を分割処理 (Priority: P3)

**Goal**: 1回あたりの時間/予算上限の中で進捗を進め、再開可能・二重出力なしで全期間を完走する

**Independent Test**: 期間を複数日に分け、複数回実行して最終的に全日分が出力され、途中失敗後も再開できる

### Tests for User Story 3

- [ ] T028 [P] [US3] JobStateの進捗更新/再開の単体テスト: `tests/unit/jobstate_resume.test.ts`（検証: 再実行で二重出力しない）
- [ ] T029 [P] [US3] 日次予算のリセット/消費の単体テスト: `tests/unit/budget_reset.test.ts`（検証: 日付跨ぎでリセットされる）

### Implementation for User Story 3

- [ ] T030 [P] [US3] 日次カーソル（次に処理する日）を決める: `gas/src/state/cursor.ts`（検証: 未処理日が前進する）
- [ ] T031 [US3] 1回の実行での停止条件を実装: `gas/src/main.ts`（時間制限手前/予算到達/件数上限）（検証: 上限で停止しつつ進捗が保存される）
- [ ] T032 [US3] トリガー作成/削除ユーティリティを実装: `gas/src/state/triggers.ts`（検証: 日次トリガーを設定できる）
- [ ] T033 [US3] 例外時でも runLog と JobState を確実に更新（finally）する（検証: 失敗しても次回再開できる）
- [ ] T034 [US3] 運用ガイド追記: `specs/001-timeline-fog-converter/quickstart.md`（日次運用、停止/再開、予算調整）（検証: 運用手順が明確）

**Checkpoint**: All user stories should now be independently functional

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T035 [P] [US1] 入力欠損/低精度の扱いの明文化（スキップ基準、間引き基準）を `spec.md` または `contracts/` に反映（検証: 仕様が曖昧でない）
- [ ] T036 [P] [US2] 経路補完のモード選択（徒歩/車など）を設定化し、既定値を決める（検証: 予想外の補完にならない）
- [ ] T037 [P] [US3] 進捗の省メモリ化（exportedDates の保持方式）を設計し直す（検証: 20年分でも状態が肥大化しない）
- [ ] T038 [P] [US3] セキュリティ確認（秘密情報がログに出ない、Propertiesに保存される）をチェック（検証: 秘密情報が露出しない）
- [ ] T039 [US1] quickstart.md の手順で実際に通し実行し、手順の穴を埋める（検証: 実行できる）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after User Story 1 has a stable output pipeline（GPX出力があること）
- **User Story 3 (P3)**: Can start after User Story 1 has per-day export + idempotency. User Story 2 は任意（補完が無くても完走はできる）


