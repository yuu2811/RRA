# 退職リスク診断 (Retirement Risk Assessment)

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-6366f1?style=for-the-badge&logo=github)](https://yuu2811.github.io/RRA/)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-22c55e?style=for-the-badge&logo=pwa)]()
[![No Dependencies](https://img.shields.io/badge/Dependencies-Zero-818cf8?style=for-the-badge)]()

> **[https://yuu2811.github.io/RRA/](https://yuu2811.github.io/RRA/)**

学術研究（メタ分析含む）に基づく10次元の退職リスク診断Webアプリケーション。従業員の退職リスクを早期に可視化し、科学的根拠に基づいた改善アドバイスを提供します。

---

## 概要

- **全30問**の質問に5段階で回答（所要時間: 約3-5分）
- **10の科学的指標**で退職リスクを多角的に診断
- メタ分析に基づく**エビデンス加重スコアリング**
- **複合リスクパターン検出**で見落としがちな危険な組み合わせを警告
- 完全クライアントサイド動作（**データ送信なし**、プライバシー完全保護）

---

## 主な機能

### 診断・分析

| 機能 | 説明 |
|------|------|
| 10次元スコアリング | 学術文献の効果量に基づくエビデンス加重 |
| 複合リスク検出 | 「燃え尽き＋低満足」等7パターンの危険な組み合わせを自動検出 |
| 属性別コンテキスト | 年代・勤続年数・業種・役職に応じた調整スコア |
| 相関分析 | 次元間の相関（Griffeth et al.のメタ分析ベース）から洞察を提示 |
| What-Ifシミュレータ | 「この項目を改善したら全体スコアはどう変わる？」をリアルタイム試算 |
| スコア解説 | 各次元の「なぜこのスコアか」を回答内容に基づいて自然言語で説明 |
| 優先改善アクションプラン | 重要度・手間・期間を考慮した改善ステップを自動生成 |

### 可視化

| 機能 | 説明 |
|------|------|
| 円形ゲージ | 120Hz対応のカスタムイージング付きアニメーション |
| レーダーチャート | 10次元を一目で把握（SVG、ライブラリ不使用） |
| 推移グラフ | 過去の診断結果との比較（Catmull-Romスプライン） |
| インタラクティブ棒グラフ | タップで展開し質問レベルの詳細を表示 |
| シェアカード生成 | Canvas APIで結果画像を自動生成 |

### UX

| 機能 | 説明 |
|------|------|
| PWA対応 | ホーム画面追加・オフライン動作 |
| ユニバーサル対応 | iPhone / Android / タブレット / PC 全対応 |
| アクセシビリティ | キーボード操作、ARIA属性、ハイコントラスト対応 |
| 再診断リマインダー | Notification APIで定期的な再診断を促進 |
| 診断履歴 | localStorageに最大20件保存、推移を追跡 |
| テキストレポート | 詳細な分析結果をクリップボードにコピー |
| ゲーミフィケーション | 進捗シマー、リップルエフェクト、モチベーションメッセージ |

---

## 10の診断次元

| # | 表示名 | 学術名 | 参考文献 |
|---|--------|--------|----------|
| 1 | 職場とのつながり | Job Embeddedness | Mitchell, T.R. et al. (2001). *Academy of Management Journal*, 44(6) |
| 2 | 会社への愛着 | Organizational Commitment | Allen, N.J. & Meyer, J.P. (1990). *Journal of Occupational Psychology*, 63(1) |
| 3 | 今の仕事を続ける気持ち | Turnover Intention | Bothma, C.F.C. & Roodt, G. (2013). *SA Journal of Human Resource Management*, 11(1) |
| 4 | 仕事の分かりやすさ | Role Clarity | Tubre, T.C. & Collins, J.M. (2000). *Journal of Management*, 26(1) |
| 5 | 仕事の満足度 | Job Satisfaction | Griffeth, R.W. et al. (2000). *Journal of Management*, 26(3) |
| 6 | 会社との相性 | Person-Organization Fit | Kristof-Brown, A.L. et al. (2005). *Personnel Psychology*, 58(2) |
| 7 | 成長の機会 | Career Development | Ng, T.W.H. et al. (2005). *Personnel Psychology*, 58(2) |
| 8 | 仕事と生活のバランス | Work-Life Balance / Burnout | Hodkinson, A. et al. (2022). *BMJ*, 378 |
| 9 | 上司との関係 | Leadership Support | Bycio, P. et al. (1995). *Journal of Applied Psychology*, 80(4) |
| 10 | 他の仕事への関心 | Perceived Alternatives | March, J.G. & Simon, H.A. (1958); Griffeth et al. (2000) |

---

## スコアリング方法

### 基本

- **5段階リッカート尺度**: 1（全くそう思わない）〜 5（非常にそう思う）
- **逆転項目**: `6 - 回答値` で自動反転
- **次元スコア**: 3問の合計を0-100に正規化 `((合計 - 3) / 12) × 100`
- **スコアが高い = 定着傾向が高い（退職リスクが低い）**

### エビデンス加重

メタ分析で報告された効果量（相関係数）に基づき、各次元に重みを付与:

| 次元 | 重み | 根拠 |
|------|------|------|
| 今の仕事を続ける気持ち | 0.29 | 直接的な離職予測因子（Bothma & Roodt, 2013） |
| 仕事の満足度 | 0.19 | メタ分析で一貫した中程度の効果（Griffeth et al., 2000） |
| 職場とのつながり | 0.18 | 離職の最強予測因子の一つ（Mitchell et al., 2001） |
| 会社への愛着 | 0.12 | 感情的コミットメントの効果（Allen & Meyer, 1990） |
| 他の仕事への関心 | 0.06 | 労働市場認知の影響（March & Simon, 1958） |
| その他 | 各0.04 | 間接的だが有意な影響 |

### リスクレベル判定

| スコア | レベル | 意味 |
|--------|--------|------|
| 80-100 | 低リスク | 安定した定着状態 |
| 60-79 | やや注意 | 一部に改善余地あり |
| 40-59 | 要注意 | 複数領域にリスク要因 |
| 0-39 | 高リスク | 早急な対策が必要 |

---

## 技術スタック

```
HTML5 + CSS3 + Vanilla JavaScript（ES6+）
```

- **フレームワーク**: なし（Vanilla JS）
- **UIライブラリ**: なし（自作SVGチャート、自作CSSコンポーネント）
- **ビルドツール**: なし（ブラウザで直接動作）
- **外部依存**: なし（ゼロ依存）
- **デザイン**: グラスモーフィズム + ダーク基調、モバイルファースト
- **PWA**: Service Worker（Cache-first戦略）+ Web App Manifest
- **アニメーション**: `requestAnimationFrame` による120Hz対応カスタムイージング

---

## ファイル構成

```
RRA/
├── index.html          # メインHTML（SPA）
├── manifest.json       # PWAマニフェスト
├── sw.js               # Service Worker（オフライン対応 + 通知）
├── css/
│   ├── style.css       # メインスタイル（モバイルファースト）
│   └── components.css  # UIコンポーネントスタイル
├── js/
│   ├── app.js          # アプリロジック（画面遷移、状態管理、イベント）
│   ├── questions.js    # 質問データ定義（10次元 × 各3問）
│   ├── scoring.js      # スコアリングエンジン（加重計算、複合リスク、解釈）
│   └── charts.js       # SVG可視化（レーダー、ゲージ、推移、What-If）
├── icons/
│   ├── icon-192.png    # PWAアイコン 192×192
│   └── icon-512.png    # PWAアイコン 512×512
└── README.md           # このファイル
```

---

## ローカルでの動作確認

```bash
# 方法1: Python簡易サーバー
python3 -m http.server 8000
# ブラウザで http://localhost:8000 を開く

# 方法2: Node.jsの場合
npx serve .

# 方法3: index.htmlを直接ブラウザで開く（PWA機能は制限）
open index.html
```

---

## プライバシー

- すべてのデータは**ブラウザのlocalStorageにのみ保存**
- 外部サーバーへのデータ送信は一切なし
- 診断履歴は端末内に最大20件まで保持
- ブラウザのデータ消去でいつでも完全削除可能

---

## 学術的基盤

本ツールの診断フレームワークは、以下の査読付き学術論文・メタ分析に基づいています:

1. Mitchell, T.R., Holtom, B.C., Lee, T.W., & Sablynski, C.J. (2001). Why People Stay: Using Job Embeddedness to Predict Voluntary Turnover. *Academy of Management Journal*, 44(6), 1102-1121.
2. Allen, N.J. & Meyer, J.P. (1990). The Measurement and Antecedents of Affective, Continuance and Normative Commitment to the Organization. *Journal of Occupational Psychology*, 63(1), 1-18.
3. Bothma, C.F.C. & Roodt, G. (2013). The Validation of the Turnover Intention Scale. *SA Journal of Human Resource Management*, 11(1), 1-12.
4. Tubre, T.C. & Collins, J.M. (2000). Jackson and Schuler (1985) Revisited: A Meta-Analysis of the Relationships Between Role Ambiguity, Role Conflict, and Job Performance. *Journal of Management*, 26(1), 155-169.
5. Griffeth, R.W., Hom, P.W., & Gaertner, S. (2000). A Meta-Analysis of Antecedents and Correlates of Employee Turnover. *Journal of Management*, 26(3), 463-488.
6. Kristof-Brown, A.L., Zimmerman, R.D., & Johnson, E.C. (2005). Consequences of Individuals' Fit at Work: A Meta-Analysis. *Personnel Psychology*, 58(2), 281-342.
7. Ng, T.W.H., Eby, L.T., Sorensen, K.L., & Feldman, D.C. (2005). Predictors of Objective and Subjective Career Success: A Meta-Analysis. *Personnel Psychology*, 58(2), 367-408.
8. Hodkinson, A., et al. (2022). Associations of Physician Burnout with Career Engagement and Quality of Patient Care. *BMJ*, 378, e070442.
9. Bycio, P., Hackett, R.D., & Allen, J.S. (1995). Further Assessments of Bass's (1985) Conceptualization of Transactional and Transformational Leadership. *Journal of Applied Psychology*, 80(4), 468-478.
10. March, J.G. & Simon, H.A. (1958). *Organizations*. New York: Wiley.

---

## ライセンス

MIT
