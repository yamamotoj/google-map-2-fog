# Contract: Output (GPX for Fog of World Import)

**Branch**: `001-timeline-fog-converter`  
**Date**: 2025-12-30

## Scope

この契約は、Fog of World に取り込ませるための GPX 出力の最低要件と命名規則を定める。

## File Format

- **Format**: GPX 1.x（標準XML）
- **Primary structure**: `gpx > trk > trkseg > trkpt`
- **trkpt attributes**:
  - `lat`（必須）
  - `lon`（必須）
- **trkpt children**:
  - `time`（推奨: ISO 8601 / UTC）

## Segmentation & Naming

- **Segmentation**: 基本は日単位（`YYYY-MM-DD`）で1ファイル
- **File name (proposal)**: `timeline-YYYY-MM-DD.gpx`
- **Idempotency**: 同日の出力は再生成しない（既に存在する場合はスキップ or 上書き禁止）

## Error Handling

- その日のデータが空: ファイルを作らない（または0件としてスキップ記録のみ）
- 時刻欠損: `time` を省略してもよいが、ログに欠損件数を記録する


