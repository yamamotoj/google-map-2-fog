# Research: Googleマップ タイムライン → Fog of World データコンバータ

**Branch**: `001-timeline-fog-converter`  
**Date**: 2025-12-30  
**Goal**: 長期（20年以上）の位置履歴を、安全に・無料枠を超えずに・再開可能な形で GPX に変換する設計判断を確定する

## Decisions

### Decision 1: 入力は iPhone（Google マップアプリ）の「タイムライン データをエクスポート」JSON

- **Chosen**: iPhone（Google マップアプリ）から「タイムライン データをエクスポート」で出力したJSONを、Google Driveに配置して入力とする
- **Rationale**: 暗号化バックアップ（E2EE）はTakeout等から復号せずに扱えない。端末からのエクスポートJSONを扱う方が確実なため
- **Alternatives considered**:
  - 直接取得（未確定要素が大きく、実装・運用ともに重くなる）

**Implementation notes (high level)**:
- エクスポート結果が複数ファイルになる可能性があるため、Drive上で「複数JSONを順次処理」できる設計を基本とする
- 入力フォルダ配下を走査し、対象JSONを順次処理できる設計（巨大ファイル一括ロードを避ける）

### Decision 2: Fog of World への出力は GPX（trk/trkseg/trkpt）

- **Chosen**: GPXの「track」を生成し、時間情報（`<time>`）を可能なら含める
- **Rationale**: 経路補完（点列）との相性が良く、データ互換性も高い
- **Alternatives considered**:
  - CSV点列（経路の表現が弱くなる）
  - 独自形式（互換性/保守性が落ちる）

### Decision 3: iCloud への格納は「Drive出力 → iPhone自動化」で実現する

- **Chosen**: GASはGoogle DriveにGPXを書き出し、iPhone側（ショートカット等）で iCloud の所定フォルダへ移送する
- **Rationale**: GASからiCloudへ直接書き込む手段は一般に扱いづらく、運用が不安定になりやすい
- **Alternatives considered**:
  - 手動移動（最短だが運用負担が高い）
  - 直接iCloud（実現性/認証/安定性の調査が重い）

### Decision 4: 経路補完は「日次予算 + キャッシュ + フェイルセーフ」で運用する

- **Chosen**: 点間補完は外部経路検索（Google Maps Platform）を使うが、必ず日次の上限（予算）を持たせる
- **Rationale**: 20年分だと総リクエスト数が膨大になり、無料枠超過のリスクが高い。段階処理が必須
- **Alternatives considered**:
  - 常に補完（高コストで破綻しやすい）
  - 補完しない（Fogの連続性が落ちる）

**Budgeting approach**:
- `MAX_ROUTE_REQUESTS_PER_DAY`（日次上限）を設定し、超えたら補完を止めて「点列のみ」で出力する
- 近距離・同一点・同一OD（origin/destination）に対しては補完をスキップ or キャッシュヒットで節約する
- 失敗時は「点列のみで継続」し、失敗理由を記録する

### Decision 5: 日次スケジュールは「時間制限を前提に、進捗を永続化して再開」する

- **Chosen**: 時間主導トリガーで毎日（または複数回/日）実行し、各実行は時間/予算の上限で停止する
- **Rationale**: GASは1回の実行時間に上限があるため、長期処理は分割・再開設計が必須
- **Alternatives considered**:
  - 一括実行（タイムアウト/制限超過で失敗しやすい）

**State strategy**:
- `JobState`（最終処理日、処理済み入力、出力済み範囲、キャッシュキーなど）を Apps Script Properties に保持
- 冪等性: 既に出力済みの期間は再生成しない（ファイル名/メタで判定）

## Constraints & References (high signal)

- GAS にはサービス/実行に関するクオータがある（実行時間、各種サービス呼び出しなど）  
  - Reference: `https://developers.google.com/apps-script/guides/services/quotas`
- 時間主導トリガーで日次実行が可能  
  - Reference: `https://developers.google.com/apps-script/guides/triggers/installable`

## Open Questions (resolved for this phase)

- 入力元: iPhoneエクスポートJSON ✅
- 出力形式: GPX ✅
- iCloud格納: Drive → iPhone自動化 ✅


