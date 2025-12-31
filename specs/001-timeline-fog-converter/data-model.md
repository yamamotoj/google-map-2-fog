# Data Model: Googleマップ タイムライン → Fog of World データコンバータ

**Branch**: `001-timeline-fog-converter`  
**Date**: 2025-12-30

## Overview

この機能は「入力（Takeout JSON）→ 正規化（点/移動）→（任意）経路補完 → 出力（GPX）→ 進捗保存」
というパイプラインで構成する。外部境界（入力/出力/進捗/補完API）を明確にし、冪等・再開可能性を担保する。

## Entities

### TimelineSource

- **Purpose**: Takeout入力の探索/列挙の単位
- **Fields**:
  - `takeoutFolderId`: Drive上の入力フォルダID
  - `fileId`: 処理対象JSONファイルID
  - `filePathHint`: フォルダ階層/ファイル名（ログ用途）
  - `byteSize`: サイズ（巨大ファイル検知）
  - `modifiedAt`: 最終更新（再処理判定に利用可能）

### RawLocationRecord (from Takeout)

- **Purpose**: Takeout JSONから読み取る生レコード（形式差はアダプタで吸収）
- **Common Fields (expected)**:
  - `latitudeE7` / `longitudeE7`: 1e7スケールの緯度経度
  - `timestampMs` or `timestamp`: 時刻（ms文字列 or ISO）
  - `accuracy`: 精度（m）
  - `source`: 取得元（任意）

### TimelinePoint (Normalized)

- **Purpose**: 変換パイプライン内部で扱う正規化された点
- **Fields**:
  - `lat`: number
  - `lng`: number
  - `time`: ISO 8601 string (UTC)
  - `accuracyMeters?`: number
  - `rawRef?`: `{ fileId, recordIndex }`（トレース用）
- **Validation**:
  - `lat` は \([-90, 90]\)、`lng` は \([-180, 180]\)
  - `time` は有効な日時

### Trip

- **Purpose**: 点列を「移動のまとまり」にグルーピングしたもの（出力単位にも使える）
- **Fields**:
  - `startTime`: ISO string
  - `endTime`: ISO string
  - `points`: `TimelinePoint[]`
  - `mode?`: string（推定移動手段。未推定なら空）
- **Rules (high level)**:
  - 時間間隔/距離が大きい断絶で別Tripに分割
  - 同一点の連続/低精度点は間引き対象

### RouteRequest

- **Purpose**: 経路補完のリクエスト単位（課金/予算/キャッシュキー）
- **Fields**:
  - `origin`: `TimelinePoint`
  - `destination`: `TimelinePoint`
  - `departureTime?`: ISO string（必要なら）
  - `travelMode?`: string（デフォルトは `DRIVE` 相当）
  - `key`: string（丸めた座標+モードで生成するキャッシュキー）

### RouteResult

- **Purpose**: 経路補完の結果（点列へ展開して出力に反映）
- **Fields**:
  - `points`: `TimelinePoint[]`（補完点列）
  - `distanceMeters?`: number
  - `durationSeconds?`: number
  - `provider`: `"google-maps"`
  - `rawResponseRef?`: Drive file id / log key（デバッグ用）

### ExportArtifact

- **Purpose**: 出力ファイル（GPX）のメタ
- **Fields**:
  - `date`: `YYYY-MM-DD`（分割単位）
  - `fileId`: Drive上の出力ファイルID
  - `fileName`: 命名規則に従う
  - `exportedAt`: ISO string
  - `pointCount`: number
  - `routeEnriched`: boolean

### JobState

- **Purpose**: 長期処理の進捗と冪等性を担保する永続状態
- **Storage**: Apps Script Properties（JSON文字列）
- **Fields**:
  - `version`: number（スキーマ移行用）
  - `cursor`:
    - `nextDateToProcess`: `YYYY-MM-DD`
    - `lastRunAt?`: ISO string
  - `budget`:
    - `maxRouteRequestsPerDay`: number
    - `routeRequestsUsedToday`: number
    - `lastBudgetResetDate`: `YYYY-MM-DD`
  - `outputs`:
    - `exportedDates`: string[]（またはBloom/Map等の省メモリ化）
  - `routeCacheIndex`:
    - `keys`: string[]（簡易。実装ではDrive/CacheService等に分離も可）

### RunLogEntry

- **Purpose**: 1回の実行結果を記録し、切り分け可能にする
- **Fields**:
  - `runId`: string
  - `startedAt` / `endedAt`: ISO string
  - `processedDates`: string[]
  - `exportedFiles`: `{ date, fileId }[]`
  - `routeRequestsUsed`: number
  - `errors`: `{ kind, message, context? }[]`


