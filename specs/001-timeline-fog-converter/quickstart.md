# Quickstart: Googleマップ タイムライン → Fog of World（GPX）コンバータ

**Branch**: `001-timeline-fog-converter`  
**Date**: 2025-12-30

## 0. 前提

- iPhone（Google マップアプリ）から「**タイムライン データをエクスポート**」で **JSON** を出力できること  
  - 手順: [Google マップ タイムラインを管理する](https://support.google.com/maps/answer/6258979?hl=ja&co=GENIE.Platform%3DiOS)
- Google Drive を利用できること（入力/出力の保管場所）
- iPhone 側で「Drive上の出力ファイルを iCloud の所定フォルダへ移送」できる自動化（ショートカット等）を作れること

## 1. タイムラインの準備（入力）

1. iPhone（Google マップアプリ）でタイムラインを開き、「タイムライン データをエクスポート」を実行してJSONを出力
2. 出力したJSONを Google Drive にアップロード（ファイル名は `location-history.json` を推奨）
3. Drive上で `location-history.json` を開き、URLの `.../d/<FILE_ID>/...` の **`FILE_ID`** を控える

## 2. 出力先（Drive）を用意

1. Driveに「出力用フォルダ」を作成
2. 「出力フォルダID」を控える

## 3. Apps Script（GAS）プロジェクトを用意

- GASプロジェクトを作成し、スクリプトに必要な権限（Drive読み書き、外部通信など）を許可する
- ローカルでコード管理する場合は clasp を使う（推奨）
  - 例: `npm i -g @google/clasp` / `clasp login` / `clasp create` / `clasp push`
  - **注意**: `.clasp.json` は秘密情報を含み得るためコミットしない（本リポジトリの `.gitignore` で除外済み）

## 4. Google Maps の経路補完を使う場合の準備

- Google Maps Platform を利用する場合は APIキー等の準備が必要になる
- **秘密情報（APIキー）はリポジトリに置かず**、Script Properties 等で管理する

## 5. 設定（Script Properties の想定）

最低限、以下の設定を持たせる想定（名前は実装で確定）:

- `LOCATION_HISTORY_FILE_ID`: Drive上の `location-history.json` のファイルID
- `OUTPUT_FOLDER_ID`: 出力フォルダID
- `OUTPUT_MODE`: 出力モード（未設定は `daily`。`single` にすると1つのGPXに追記）
- `OUTPUT_FILE_NAME`: `OUTPUT_MODE=single` のときの出力ファイル名（未設定は `timeline-all.gpx`）
- `MAX_ROUTE_REQUESTS_PER_DAY`: 経路補完の日次上限（無料枠/予算に合わせる）
- `START_DATE`: 初回に処理を開始する日付（`YYYY-MM-DD`、JST基準。US3のカーソル初期化に必須）

任意:

- `LOG_SHEET_ID`: 実行ログのSpreadsheet
- `END_DATE`: 処理を終了する日付（`YYYY-MM-DD`、JST基準。指定するとその日を超えたら停止）

### 経路補完（US2）を有効化する場合

経路補完は **Google Directions API** を呼び出します（外部通信）。コスト/クオータ管理のため、デフォルトでは無効です。

- `ENABLE_ROUTE_ENRICHMENT`: `1` で有効化（未設定/それ以外は無効）
- `MAPS_API_KEY`: Google Maps Platform のAPIキー（Directions API を有効化したプロジェクトのもの）
- `ROUTE_TRAVEL_MODE`: `driving` / `walking` / `bicycling` / `transit`（未設定は `driving`）
- `ROUTE_MIN_DISTANCE_METERS`: 補完対象とする最小距離（未設定は `200`）
- `MAX_ROUTE_REQUESTS_PER_DAY`: 日次の最大リクエスト数（予算/無料枠に合わせる）

### モード自動推定（US2オプション）

iPhoneのエクスポートJSONに「移動手段」が明示されていない前提で、**地点間の距離と経過時間（速度）から** `walking/bicycling/driving` を推定します。

- `ENABLE_ROUTE_MODE_AUTO`: `1` で有効化
- `ROUTE_MODE_AUTO_FALLBACK`: 推定不能時のフォールバック（未設定は `driving`）

注意:

- 推定はヒューリスティックです（誤判定し得ます）。まずは短期間で結果を見て閾値調整するのが安全です。
- `ENABLE_ROUTE_MODE_AUTO=1` の場合、`transit`（電車/公共交通）も推定候補に含みます。区間によっては結果が取れない/遠回りになる場合があります（その場合はフェイルセーフで点のみ出力します）。

## 6. 初回実行（小さい範囲で）

1. 1日分など小さい範囲で変換を実行
2. Driveに `timeline-YYYY-MM-DD.gpx` が生成されることを確認
3. Fog of World にインポートできることを確認

## 6.1 Apps Script上でのセルフテスト（推奨）

Nodeのユニットテストとは別に、Apps Script上で **Drive入出力まで含めて**動作確認できます。

1. `clasp push` で最新コードを反映
2. Apps Script エディタで `runSelfTest()` を実行
3. 実行ログに `SelfTest OK` が出ればOK（テスト用の一時フォルダ/ファイルは最後にゴミ箱へ移動します）

## 7. 日次スケジュール

1. 時間主導トリガーで毎日実行するよう設定
2. 1回の実行は **時間/予算の上限**で停止する（停止しても次回再開できる）

### トリガー設定（コードから）

Apps Script エディタから以下を実行してトリガーを設定できます:

- `installDailyTrigger(3)` : 毎日 3:00 に `scheduledRun` を実行
- `uninstallDailyTrigger()` : `scheduledRun` のトリガーを削除

### 再開/停止

- 進捗（次に処理する日付）は Script Properties の `JOB_STATE` に保存されます
- 途中で止めたいときはトリガーを削除し、再開したいときは再度トリガーを作成してください

## 8. iCloudへの移送（iPhone自動化）

1. Driveの出力フォルダを対象に「新規GPXを検知」する運用を作る
2. 検知したGPXを iCloud の所定フォルダへ移動/コピーする
3. Fog of World 側の取り込みフローに合わせて運用する


