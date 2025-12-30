# Contract: Run Log Entry

**Branch**: `001-timeline-fog-converter`  
**Date**: 2025-12-30

## Goal

1回の実行で「何がどこまで進んだか」「なぜ失敗したか」「次はどう動くか」を追える最小ログ契約を定める。
ログ先は Spreadsheet または Drive 上のJSON/テキストを想定する（実装で選ぶ）。

## Minimum Fields

- `runId`: 実行ID（UUID相当）
- `startedAt`: ISO日時
- `endedAt`: ISO日時
- `processedDates`: `YYYY-MM-DD[]`
- `exportedFiles`: `{ date: YYYY-MM-DD, fileId: string }[]`
- `routeRequestsUsed`: number
- `errors`: `{ kind: string, message: string, context?: object }[]`

## Notes

- エラーは秘密情報（APIキー等）を含めない
- 失敗時も「途中までの進捗」と「次回再開位置」が追える情報を残す


