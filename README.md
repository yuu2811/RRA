# 退職リスク診断 (RRA)

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-6366f1?style=for-the-badge&logo=github)](https://yuu2811.github.io/RRA/)

> **[https://yuu2811.github.io/RRA/](https://yuu2811.github.io/RRA/)**

学術研究に基づく10次元の退職リスク診断Webアプリケーション

## Features

- 10の科学的指標（査読付き論文ベース）で退職リスクを多角的に診断
- 全30問・約5分で完了
- ゲージチャート + レーダーチャートで結果を可視化
- PWA対応（オフライン動作可能）
- iPhone 16 Pro最適化のモバイルファースト設計
- ダークモード / ライトモード自動対応
- データは端末内のみ保存（外部送信なし）

## 10 Dimensions

| # | 次元 | 参考文献 |
|---|------|----------|
| 1 | 職務埋め込み | Mitchell et al. (2001) |
| 2 | 組織コミットメント | Allen & Meyer (1990) |
| 3 | 離職意図 | Bothma & Roodt (2013) |
| 4 | 役割明確性 | Tubre & Collins (2000) |
| 5 | 職務満足 | Griffeth et al. (2000) |
| 6 | 個人-組織適合性 | Kristof-Brown et al. (2005) |
| 7 | キャリア開発 | Ng et al. (2005) |
| 8 | ワークライフバランス | Hodkinson et al. (2022) |
| 9 | 上司・リーダーシップ | Bycio et al. (1995) |
| 10 | 代替選択肢の認知 | March & Simon (1958) |

## Tech Stack

- Vanilla JavaScript (ES6+) — フレームワーク不使用
- SVGチャート（ライブラリ不使用）
- PWA (Service Worker + Web Manifest)
- Mobile-first CSS with glassmorphism
