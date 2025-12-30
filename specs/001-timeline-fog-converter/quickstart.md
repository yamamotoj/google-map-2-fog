# Quickstart: Googleマップ タイムライン → Fog of World（GPX）コンバータ

**Branch**: `001-timeline-fog-converter`  
**Date**: 2025-12-30

## 0. 前提

- Google Takeout で「位置履歴（タイムライン）」を **JSON** でエクスポートできること
- Google Drive を利用できること（入力/出力の保管場所）
- iPhone 側で「Drive上の出力ファイルを iCloud の所定フォルダへ移送」できる自動化（ショートカット等）を作れること

## 1. Takeoutの準備（入力）

1. Google Takeout で位置履歴をエクスポート（JSON）
2. ZIPを解凍
3. 解凍したフォルダ（または必要なサブフォルダ）を Google Drive にアップロード
4. Drive上で「入力フォルダID」を控える

## 2. 出力先（Drive）を用意

1. Driveに「出力用フォルダ」を作成
2. 「出力フォルダID」を控える

## 3. Apps Script（GAS）プロジェクトを用意

- GASプロジェクトを作成し、スクリプトに必要な権限（Drive読み書き、外部通信など）を許可する

## 4. Google Maps の経路補完を使う場合の準備

- Google Maps Platform を利用する場合は APIキー等の準備が必要になる
- **秘密情報（APIキー）はリポジトリに置かず**、Script Properties 等で管理する

## 5. 設定（Script Properties の想定）

最低限、以下の設定を持たせる想定（名前は実装で確定）:

- `TAKEOUT_FOLDER_ID`: 入力フォルダID
- `OUTPUT_FOLDER_ID`: 出力フォルダID
- `MAX_ROUTE_REQUESTS_PER_DAY`: 経路補完の日次上限（無料枠/予算に合わせる）

任意:

- `LOG_SHEET_ID`: 実行ログのSpreadsheet
- `START_DATE` / `END_DATE`: 初回の処理範囲（空なら自動で範囲推定）

## 6. 初回実行（小さい範囲で）

1. 1日分など小さい範囲で変換を実行
2. Driveに `timeline-YYYY-MM-DD.gpx` が生成されることを確認
3. Fog of World にインポートできることを確認

## 7. 日次スケジュール

1. 時間主導トリガーで毎日実行するよう設定
2. 1回の実行は **時間/予算の上限**で停止する（停止しても次回再開できる）

## 8. iCloudへの移送（iPhone自動化）

1. Driveの出力フォルダを対象に「新規GPXを検知」する運用を作る
2. 検知したGPXを iCloud の所定フォルダへ移動/コピーする
3. Fog of World 側の取り込みフローに合わせて運用する


