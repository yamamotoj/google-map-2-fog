# Contract: Input (iPhone Timeline Export JSON)

**Branch**: `001-timeline-fog-converter`  
**Date**: 2025-12-30

## Scope

この契約は、iPhone（Google マップアプリ）の「タイムライン データをエクスポート」で出力したJSONを
Drive 上で読み込む際の前提を定める。エクスポート結果のファイル構成は変動し得るため、実装では
「検出 + アダプタ」で吸収する。

## Accepted Inputs

- **Input container**: Drive 上の単一ファイル `location-history.json`
- **File type**: JSON（テキスト）
- **Segmentation**: 単一ファイル（このプロジェクトの前提）

## Minimum Required Fields (normalized)

入力形式の差異はアダプタで吸収し、最終的に以下を抽出できることが最低条件。

- `lat`: 緯度（-90..90）
- `lng`: 経度（-180..180）
- `time`: タイムスタンプ（UTCへ正規化可能）

## Recommended Fields

- `accuracyMeters`: 精度
- `source`: 取得元/推定手段（あれば）

## Error Handling

- JSONが壊れている/想定外: ファイル単位でスキップし、ログに残す
- レコード単位の欠損: レコード単位でスキップし、処理全体は継続する


