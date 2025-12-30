# Contract: Input (Google Takeout Location History JSON)

**Branch**: `001-timeline-fog-converter`  
**Date**: 2025-12-30

## Scope

この契約は、Google Takeout でエクスポートした位置履歴（タイムライン）データを Drive 上で読み込む際の
前提を定める。Takeoutの実際のフォルダ構造は変動し得るため、実装では「検出 + アダプタ」で吸収する。

## Accepted Inputs

- **Input container**: Drive 上のフォルダ（利用者がTakeout ZIPを解凍して配置）
- **File type**: JSON（テキスト）
- **Segmentation**: 多数ファイルでも良い（ファイルを順次処理する）

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


