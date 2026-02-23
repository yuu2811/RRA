/**
 * 退職リスク診断 - スコアリングロジック
 * 逆転項目処理、次元別計算、総合スコア、リスクレベル判定
 */

const Scoring = {
  /**
   * 回答値を処理（逆転項目は反転）
   */
  processAnswer(value, reversed) {
    return reversed ? 6 - value : value;
  },

  /**
   * 次元別スコアを計算（0-100正規化）
   */
  calculateDimensionScore(answers, dimension) {
    let total = 0;
    let count = 0;
    for (const q of dimension.questions) {
      const answer = answers[q.id];
      if (answer !== undefined) {
        total += this.processAnswer(answer, q.reversed);
        count++;
      }
    }
    if (count === 0) return 0;
    // Normalize: (sum - min) / (max - min) * 100
    // min = count * 1, max = count * 5
    return ((total - count) / (count * 4)) * 100;
  },

  /**
   * 全次元のスコアを計算
   */
  calculateAllScores(answers) {
    const dimensionScores = {};
    for (const dim of DIMENSIONS) {
      dimensionScores[dim.id] = Math.round(this.calculateDimensionScore(answers, dim));
    }
    return dimensionScores;
  },

  /**
   * 総合スコアを計算（全次元の平均）
   */
  calculateOverallScore(dimensionScores) {
    const scores = Object.values(dimensionScores);
    if (scores.length === 0) return 0;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  },

  /**
   * リスクレベルを判定
   */
  getRiskLevel(score) {
    if (score >= 80) return { level: 'low', label: '低リスク', color: '#22c55e', emoji: '\u{1F7E2}' };
    if (score >= 60) return { level: 'caution', label: 'やや注意', color: '#eab308', emoji: '\u{1F7E1}' };
    if (score >= 40) return { level: 'warning', label: '要注意', color: '#f97316', emoji: '\u{1F7E0}' };
    return { level: 'high', label: '高リスク', color: '#ef4444', emoji: '\u{1F534}' };
  },

  /**
   * 総合判定の解釈テキスト
   */
  getOverallInterpretation(score) {
    if (score >= 80) {
      return '現在の職場への定着度は非常に高い状態です。組織との適合性が高く、安定した就業が見込まれます。現在の良好な状態を維持するために、引き続き職場環境の質を保つことが重要です。';
    }
    if (score >= 60) {
      return '概ね安定していますが、一部の領域に改善の余地があります。特にスコアの低い次元に注目し、早期の対応により、さらなる定着が期待できます。';
    }
    if (score >= 40) {
      return '複数の領域でリスク要因が確認されています。特にスコアの低い領域について、具体的な改善策の検討を推奨します。組織として早急に対応を開始することが望ましい状態です。';
    }
    return '退職リスクが高い状態です。早急に要因分析と対策の実施が必要です。特に低スコアの領域を優先的に改善し、従業員との対話を通じて具体的なアクションプランを策定してください。';
  },

  /**
   * 低スコア次元の改善アドバイスを取得
   */
  getAdvice(dimensionScores) {
    const advice = [];
    for (const dim of DIMENSIONS) {
      const score = dimensionScores[dim.id];
      if (score < 60) {
        advice.push({
          dimensionName: dim.name,
          score: score,
          riskLevel: this.getRiskLevel(score),
          text: dim.adviceLow
        });
      }
    }
    // Sort by score ascending (worst first)
    advice.sort((a, b) => a.score - b.score);
    return advice;
  },

  /**
   * 結果共有用テキストを生成
   */
  generateShareText(overallScore, dimensionScores) {
    const risk = this.getRiskLevel(overallScore);
    let text = `退職リスク診断結果\n`;
    text += `総合スコア: ${overallScore}/100 (${risk.label})\n\n`;
    text += `【次元別スコア】\n`;
    for (const dim of DIMENSIONS) {
      const score = dimensionScores[dim.id];
      const bar = this.getRiskLevel(score).emoji;
      text += `${bar} ${dim.name}: ${score}/100\n`;
    }
    text += `\n学術研究に基づく退職リスク診断ツール`;
    return text;
  }
};
