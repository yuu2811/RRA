/**
 * 退職リスク診断 - スコアリングロジック
 * 逆転項目処理、次元別計算、総合スコア、リスクレベル判定
 * メタ分析加重スコアリング、複合リスクパターン検出、人口統計コンテキスト、履歴管理
 *
 * Dependencies: DIMENSIONS from questions.js (loaded before this file)
 */

// ============================================================
// 0. Normative Benchmarks & Dimension Correlations
// Based on meta-analytic findings and population survey norms
// ============================================================

/**
 * @constant {Object<string, Object>}
 * Normative benchmark data for each dimension.
 * mean: Average score in general working population (0-100 normalized)
 * sd: Standard deviation
 * Source: Derived from meta-analytic effect sizes and large-scale employee surveys
 */
const DIMENSION_NORMS = {
  job_embeddedness:       { mean: 58, sd: 18, highLabel: 'しっかり根付いている', lowLabel: 'つながりが弱い' },
  org_commitment:         { mean: 55, sd: 20, highLabel: '愛着が強い', lowLabel: '愛着が薄い' },
  turnover_intention:     { mean: 62, sd: 22, highLabel: '続けたい', lowLabel: '辞めたい' },
  role_clarity:           { mean: 65, sd: 16, highLabel: 'はっきりしている', lowLabel: 'あいまい' },
  job_satisfaction:       { mean: 60, sd: 19, highLabel: '満足している', lowLabel: '不満がある' },
  po_fit:                 { mean: 57, sd: 20, highLabel: '合っている', lowLabel: '合っていない' },
  career_dev:             { mean: 50, sd: 22, highLabel: '成長できている', lowLabel: '行き詰まっている' },
  work_life_balance:      { mean: 52, sd: 21, highLabel: 'バランスが良い', lowLabel: 'バランスが悪い' },
  leadership:             { mean: 56, sd: 23, highLabel: '頼りになる', lowLabel: '不十分' },
  perceived_alternatives: { mean: 48, sd: 24, highLabel: '今の会社に満足', lowLabel: '他に目が向いている' }
};

/**
 * @constant {Object}
 * Inter-dimension correlation pairs based on meta-analytic findings.
 * Each pair represents a strong empirical relationship between two dimensions.
 * r: Pearson correlation coefficient from meta-analyses
 * interpretation: Japanese description of the relationship
 */
const DIMENSION_CORRELATIONS = [
  { dims: ['job_satisfaction', 'org_commitment'], r: 0.65, interpretation: '仕事に満足している人ほど、会社への愛着も強い傾向があります' },
  { dims: ['org_commitment', 'turnover_intention'], r: 0.58, interpretation: '会社への愛着が薄れると、転職を考え始めやすくなります' },
  { dims: ['leadership', 'job_satisfaction'], r: 0.52, interpretation: '上司との関係は、仕事の満足度に大きく影響します' },
  { dims: ['work_life_balance', 'job_satisfaction'], r: 0.48, interpretation: '仕事と生活のバランスは、仕事の満足度を左右する大きな要素です' },
  { dims: ['role_clarity', 'job_satisfaction'], r: 0.45, interpretation: '自分の仕事がはっきりしている人ほど、満足度が高くなります' },
  { dims: ['po_fit', 'org_commitment'], r: 0.50, interpretation: '会社との相性が良いと、会社への愛着も強くなります' },
  { dims: ['career_dev', 'turnover_intention'], r: 0.42, interpretation: '成長の機会が少ないと、転職を考えやすくなります' },
  { dims: ['job_embeddedness', 'turnover_intention'], r: 0.55, interpretation: '職場とのつながりが強い人ほど、辞めたい気持ちが抑えられます' },
  { dims: ['leadership', 'org_commitment'], r: 0.47, interpretation: '上司の良し悪しは、会社への愛着に影響します' },
  { dims: ['work_life_balance', 'turnover_intention'], r: 0.40, interpretation: '仕事と生活のバランスが崩れると、退職のきっかけになりやすいです' }
];

/**
 * @constant {Object<string, Array>}
 * Prioritized action templates for each dimension.
 * Each action has timeframe (immediate/short/medium), effort level, and specific step.
 */
const ACTION_TEMPLATES = {
  job_embeddedness: [
    { timeframe: 'immediate', effort: 'low', action: '同僚と週に1回でもランチや雑談の時間を作ってみる', category: '人間関係' },
    { timeframe: 'short', effort: 'medium', action: '他の部署やチームの仕事にも関わってみる', category: '交流を広げる' },
    { timeframe: 'medium', effort: 'high', action: '後輩の面倒を見たり、頼られる存在になる', category: '居場所づくり' }
  ],
  org_commitment: [
    { timeframe: 'immediate', effort: 'low', action: '会社の目標や大切にしていることを改めて確認する', category: '会社を知る' },
    { timeframe: 'short', effort: 'medium', action: '経営者や他の部署の人と話す機会を作る', category: '会社を知る' },
    { timeframe: 'medium', effort: 'medium', action: '自分の仕事が会社全体にどう役立っているか整理してみる', category: 'やりがい' }
  ],
  turnover_intention: [
    { timeframe: 'immediate', effort: 'low', action: '今の不満を紙に書き出して、変えられるものを見つける', category: '整理する' },
    { timeframe: 'short', effort: 'medium', action: '上司や人事の担当者に、今の悩みを率直に伝えてみる', category: '話し合う' },
    { timeframe: 'medium', effort: 'high', action: '部署の異動や役割の変更ができないか探ってみる', category: '環境を変える' }
  ],
  role_clarity: [
    { timeframe: 'immediate', effort: 'low', action: '上司に15分でも時間をもらい、今一番大事な仕事を確認する', category: '確認する' },
    { timeframe: 'short', effort: 'medium', action: '自分の仕事の範囲と期待されていることを上司と書き出して共有する', category: '明確にする' },
    { timeframe: 'medium', effort: 'medium', action: '定期的に目標の確認と振り返りの場を設ける', category: '仕組みにする' }
  ],
  job_satisfaction: [
    { timeframe: 'immediate', effort: 'low', action: '毎日の仕事で「やりがいを感じる瞬間」をメモしてみる', category: '気づく' },
    { timeframe: 'short', effort: 'medium', action: '自分の得意なことを活かせる仕事を増やせないか上司に相談する', category: '仕事を見直す' },
    { timeframe: 'medium', effort: 'high', action: '職場で困っていることを具体的にまとめて、改善を提案する', category: '環境を良くする' }
  ],
  po_fit: [
    { timeframe: 'immediate', effort: 'low', action: '会社の方針と自分の考えが合うところ・合わないところを書き出す', category: '整理する' },
    { timeframe: 'short', effort: 'medium', action: '社内の他のチームや部署の雰囲気を見てみる', category: '探してみる' },
    { timeframe: 'medium', effort: 'high', action: '自分に合う配置や役割がないか、上司や人事に相談する', category: '相談する' }
  ],
  career_dev: [
    { timeframe: 'immediate', effort: 'low', action: '3年後にどうなっていたいかを書き出してみる', category: '将来を考える' },
    { timeframe: 'short', effort: 'medium', action: '会社の研修や資格取得の支援が使えないか調べて申し込む', category: 'スキルを磨く' },
    { timeframe: 'medium', effort: 'high', action: '新しい仕事やプロジェクトに手を挙げて挑戦してみる', category: '挑戦する' }
  ],
  work_life_balance: [
    { timeframe: 'immediate', effort: 'low', action: '今週の仕事を「急ぎ」「大事」「後でいい」に分けて、無理なものは断る', category: '仕事を整理する' },
    { timeframe: 'short', effort: 'medium', action: '休みの予定を立てて上司に伝え、しっかり休める体制を作る', category: '休みを取る' },
    { timeframe: 'medium', effort: 'high', action: '体やメンタルがつらい時は、産業医や会社の相談窓口を利用する', category: '専門家に相談' }
  ],
  leadership: [
    { timeframe: 'immediate', effort: 'low', action: '上司と定期的に話す時間を作ってもらうよう提案する', category: '話す機会を作る' },
    { timeframe: 'short', effort: 'medium', action: '自分がどうしたいか、何に困っているかを上司に伝えてみる', category: '伝えてみる' },
    { timeframe: 'medium', effort: 'high', action: '改善が難しければ、人事の担当者や他の管理者に相談する', category: '相談先を広げる' }
  ],
  perceived_alternatives: [
    { timeframe: 'immediate', effort: 'low', action: '今の会社の良いところ（待遇・人間関係・学べること）を改めて確認する', category: '良さを見直す' },
    { timeframe: 'short', effort: 'medium', action: '自分の強みや得意なことを上司や同僚に聞いてみる', category: '自分を知る' },
    { timeframe: 'medium', effort: 'medium', action: '今の会社で新しいことに挑戦できないか探してみる', category: 'やる気を取り戻す' }
  ]
};

// ============================================================
// 1. Meta-Analytic Weighted Scoring
// Effect sizes from Griffeth et al. (2000) & Rubenstein et al. (2018)
// ============================================================

/**
 * @constant {Object<string, number>}
 * Maps dimension IDs to meta-analytic effect sizes for turnover prediction.
 * Higher values indicate stronger empirical relationship with actual turnover.
 */
const META_WEIGHTS = {
  turnover_intention: 0.35,
  org_commitment: 0.23,
  job_satisfaction: 0.19,
  job_embeddedness: 0.18,
  work_life_balance: 0.16,
  career_dev: 0.15,
  po_fit: 0.15,
  leadership: 0.14,
  role_clarity: 0.13,
  perceived_alternatives: 0.12
};

// ============================================================
// 2. Compound Risk Patterns
// ============================================================

/**
 * @typedef {Object} CompoundRiskPattern
 * @property {string}   id          - Unique identifier
 * @property {string}   name        - Japanese display name
 * @property {string}   nameEn      - English display name
 * @property {string}   icon        - Emoji icon
 * @property {string}   description - Detailed description of the risk pattern
 * @property {string}   severity    - 'critical' or 'warning'
 * @property {string[]} dimensions  - Array of dimension IDs that must all be below threshold
 * @property {number}   threshold   - Score below which a dimension triggers (exclusive)
 * @property {string}   advice      - Actionable advice for mitigation
 */
const COMPOUND_RISK_PATTERNS = [
  {
    id: 'burnout',
    name: '燃え尽き型',
    nameEn: 'Burnout',
    icon: '\uD83D\uDD25',
    description: '仕事の負担が続いて、心と体が疲れ切っている状態です。仕事と生活のバランス・仕事の満足度・上司との関係のすべてが低く、このままでは退職につながりやすい状態です。',
    severity: 'critical',
    dimensions: ['work_life_balance', 'job_satisfaction', 'leadership'],
    threshold: 40,
    advice: '仕事の量を見直すことが最優先です。上司と話し合い、やらなくてよい仕事を減らしましょう。体やメンタルがつらい時は、産業医や会社の相談窓口に頼ってください。まず休むことが大切です。'
  },
  {
    id: 'flight_risk',
    name: '転職間近型',
    nameEn: 'Flight Risk',
    icon: '\uD83D\uDEAA',
    description: '他に良い仕事があると感じていて、転職したい気持ちが強く、会社への愛着も薄い状態です。退職が最も近い状態です。',
    severity: 'critical',
    dimensions: ['perceived_alternatives', 'turnover_intention', 'org_commitment'],
    threshold: 40,
    advice: 'すぐに上司や人事と話し合いの場を作りましょう。何が不満なのかを具体的に伝え、給与・仕事内容・配置の見直しなど、短期間でできる改善策を一緒に考えることが大切です。'
  },
  {
    id: 'misfit',
    name: '合わない型',
    nameEn: 'Misfit',
    icon: '\uD83D\uDD00',
    description: '会社の考え方と自分の考え方にずれがあり、上司との関係や仕事の進め方にも問題を感じている状態です。根本的に「合わない」と感じることが退職につながりやすいです。',
    severity: 'warning',
    dimensions: ['po_fit', 'leadership', 'role_clarity'],
    threshold: 40,
    advice: '部署の異動やチームの変更を考えてみましょう。今の配置が自分の得意なことや考え方と合っているか、上司や人事に相談してみてください。'
  },
  {
    id: 'stagnation',
    name: '行き詰まり型',
    nameEn: 'Stagnation',
    icon: '\u23F8\uFE0F',
    description: '成長している実感がなく、やりがいや職場とのつながりも薄れている状態です。じわじわと退職に向かいやすいパターンです。',
    severity: 'warning',
    dimensions: ['career_dev', 'job_satisfaction', 'job_embeddedness'],
    threshold: 40,
    advice: '将来どうなりたいかを考え、上司に相談してみましょう。新しい仕事への挑戦、研修や資格取得の支援、先輩からのアドバイスなど、成長の機会を探すことが効果的です。'
  },
  {
    id: 'disengaged',
    name: '心が離れている型',
    nameEn: 'Disengaged',
    icon: '\uD83D\uDCA4',
    description: '会社への愛着・職場とのつながり・働き続ける意欲のすべてが低い状態です。静かに気持ちが離れていっています。',
    severity: 'warning',
    dimensions: ['org_commitment', 'job_embeddedness', 'turnover_intention'],
    threshold: 40,
    advice: 'まず、話を聞いてもらえる場を作ることが大切です。チームの活動に参加したり、自分の仕事が役立っていることを実感できると、気持ちが変わるきっかけになります。'
  }
];

// ============================================================
// 3. Demographic Baselines
// ============================================================

/**
 * @constant {Object}
 * Demographic baseline data for contextual risk adjustment.
 * Modifiers > 1.0 indicate higher base turnover risk for that group.
 * Modifiers < 1.0 indicate lower base turnover risk.
 */
const DEMOGRAPHIC_BASELINES = {
  age: {
    '20s': { modifier: 1.15, label: '20\u4ee3\u306f\u8ee2\u8077\u7387\u304c\u6700\u3082\u9ad8\u3044\u5e74\u4ee3\u3067\u3059' },
    '30s': { modifier: 1.0, label: '30\u4ee3\u306f\u30ad\u30e3\u30ea\u30a2\u5b89\u5b9a\u671f\u306b\u5165\u308b\u5e74\u4ee3\u3067\u3059' },
    '40s': { modifier: 0.85, label: '40\u4ee3\u306f\u5b9a\u7740\u7387\u304c\u9ad8\u307e\u308b\u5e74\u4ee3\u3067\u3059' },
    '50s+': { modifier: 0.75, label: '50\u4ee3\u4ee5\u4e0a\u306f\u9000\u8077\u30ea\u30b9\u30af\u304c\u7d71\u8a08\u7684\u306b\u4f4e\u3044\u5e74\u4ee3\u3067\u3059' }
  },
  tenure: {
    '<1year': { modifier: 1.3, label: '\u5165\u793e1\u5e74\u672a\u6e80\u306f\u6700\u3082\u30ea\u30b9\u30af\u304c\u9ad8\u3044\u671f\u9593\u3067\u3059' },
    '1-3years': { modifier: 1.1, label: '1〜3年目は理想と現実のギャップを感じやすい時期です' },
    '3-5years': { modifier: 0.95, label: '3〜5年目は将来の方向性を考える時期です' },
    '5-10years': { modifier: 0.85, label: '5\u5e74\u4ee5\u4e0a\u5728\u7c4d\u3067\u5b9a\u7740\u50be\u5411\u304c\u5f37\u307e\u308a\u307e\u3059' },
    '>10years': { modifier: 0.75, label: '10年以上のベテランは会社への愛着が強い傾向です' }
  },
  industry: {
    'it': { modifier: 1.15, label: 'IT\u696d\u754c' },
    'finance': { modifier: 0.95, label: '\u91d1\u878d\u696d\u754c' },
    'manufacturing': { modifier: 0.90, label: '\u88fd\u9020\u696d' },
    'healthcare': { modifier: 1.10, label: '\u533b\u7642\u30fb\u4ecb\u8b77\u696d\u754c' },
    'service': { modifier: 1.20, label: '\u30b5\u30fc\u30d3\u30b9\u696d' },
    'public': { modifier: 0.80, label: '\u516c\u52d9\u54e1\u30fb\u516c\u5171\u6a5f\u95a2' },
    'other': { modifier: 1.0, label: '\u305d\u306e\u4ed6' }
  }
};

// ============================================================
// 4. Diagnostic History (localStorage)
// ============================================================

/**
 * Manages diagnostic result history using localStorage.
 * Stores up to MAX_ENTRIES results with timestamps for trend analysis.
 * @global
 */
const DiagnosticHistory = {
  STORAGE_KEY: 'rra_history',
  MAX_ENTRIES: 20,

  /**
   * Save a diagnostic result to history.
   * Prepends to the list and trims to MAX_ENTRIES (FIFO).
   *
   * @param {Object} result
   * @param {number}              result.overall        - Overall unweighted score (0-100)
   * @param {number}              result.weighted       - Meta-analytic weighted score (0-100)
   * @param {number|null}         [result.contextual]   - Contextual adjusted score (0-100)
   * @param {Object<string,number>} result.dimensions   - Dimension ID to score mapping
   * @param {Object|null}         [result.demographic]  - Demographic context {age, tenure, industry}
   * @param {Array}               [result.compoundRisks]- Detected compound risk patterns
   * @param {string}              [result.date]         - ISO timestamp (auto-generated if omitted)
   */
  save: function (result) {
    var entries = this.getAll();
    var entry = {
      date: result.date || new Date().toISOString(),
      overall: result.overall,
      weighted: result.weighted,
      contextual: result.contextual != null ? result.contextual : null,
      dimensions: result.dimensions,
      demographic: result.demographic || null,
      compoundRisks: result.compoundRisks || []
    };
    entries.push(entry);
    // Sort ascending by date so newest is last
    entries.sort(function (a, b) {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
    // Keep only the most recent MAX_ENTRIES
    if (entries.length > this.MAX_ENTRIES) {
      entries = entries.slice(entries.length - this.MAX_ENTRIES);
    }
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(entries));
    } catch (e) {
      // localStorage may be unavailable or full; silently fail
    }
  },

  /**
   * Retrieve all saved diagnostic results, sorted by date ascending (oldest first).
   * @returns {Array<Object>} Array of entries sorted by date ascending
   */
  getAll: function () {
    try {
      var raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return [];
      var entries = JSON.parse(raw);
      if (!Array.isArray(entries)) return [];
      entries.sort(function (a, b) {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
      return entries;
    } catch (e) {
      return [];
    }
  },

  /**
   * Retrieve the most recent diagnostic result.
   * @returns {Object|null} The most recent entry, or null if no history exists
   */
  getLatest: function () {
    var entries = this.getAll();
    return entries.length > 0 ? entries[entries.length - 1] : null;
  },

  /**
   * Calculate the trend between the two most recent diagnostic results.
   * Uses the weighted score for comparison.
   *
   * @returns {Object} Trend analysis result
   * @returns {string} return.direction      - 'improving', 'declining', 'stable', or 'insufficient'
   * @returns {number} return.change          - Numeric difference (current - previous); 0 if insufficient
   * @returns {number} return.previousScore   - Weighted score of the previous entry; 0 if insufficient
   * @returns {number} return.currentScore    - Weighted score of the current entry; 0 if insufficient
   */
  getTrend: function () {
    var entries = this.getAll();
    if (entries.length < 2) {
      return {
        direction: 'insufficient',
        change: 0,
        previousScore: 0,
        currentScore: 0
      };
    }
    var current = entries[entries.length - 1];
    var previous = entries[entries.length - 2];
    var currentScore = current.weighted;
    var previousScore = previous.weighted;
    var change = currentScore - previousScore;
    var direction;
    if (change > 3) {
      direction = 'improving';
    } else if (change < -3) {
      direction = 'declining';
    } else {
      direction = 'stable';
    }
    return {
      direction: direction,
      change: change,
      previousScore: previousScore,
      currentScore: currentScore
    };
  },

  /**
   * Clear all diagnostic history from localStorage.
   */
  clear: function () {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (e) {
      // silently fail
    }
  }
};

// ============================================================
// Scoring Object
// ============================================================

const Scoring = {

  // ----------------------------------------------------------
  // Original methods (preserved)
  // ----------------------------------------------------------

  /**
   * 回答値を処理（逆転項目は反転）
   * @param {number} value - Raw answer value (1-5)
   * @param {boolean} reversed - Whether this is a reverse-scored item
   * @returns {number} Processed value
   */
  processAnswer(value, reversed) {
    return reversed ? 6 - value : value;
  },

  /**
   * 次元別スコアを計算（0-100正規化）
   * @param {Object<number, number>} answers - Map of question ID to answer value
   * @param {Object} dimension - Dimension object from DIMENSIONS
   * @returns {number} Normalized score (0-100)
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
   * @param {Object<number, number>} answers - Map of question ID to answer value
   * @returns {Object<string, number>} Map of dimension ID to rounded score
   */
  calculateAllScores(answers) {
    const dimensionScores = {};
    for (const dim of DIMENSIONS) {
      dimensionScores[dim.id] = Math.round(this.calculateDimensionScore(answers, dim));
    }
    return dimensionScores;
  },

  /**
   * 総合スコアを計算（全次元の単純平均）
   * Kept as-is for backward compatibility.
   * @param {Object<string, number>} dimensionScores - Map of dimension ID to score
   * @returns {number} Simple average score (0-100), rounded
   */
  calculateOverallScore(dimensionScores) {
    const scores = Object.values(dimensionScores);
    if (scores.length === 0) return 0;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  },

  /**
   * リスクレベルを判定
   * @param {number} score - Score value (0-100)
   * @returns {Object} Risk level with label, color, and emoji
   */
  getRiskLevel(score) {
    if (score >= 80) return { level: 'low', label: '\u4f4e\u30ea\u30b9\u30af', color: '#22c55e', emoji: '\uD83D\uDFE2' };
    if (score >= 60) return { level: 'caution', label: '\u3084\u3084\u6ce8\u610f', color: '#eab308', emoji: '\uD83D\uDFE1' };
    if (score >= 40) return { level: 'warning', label: '\u8981\u6ce8\u610f', color: '#f97316', emoji: '\uD83D\uDFE0' };
    return { level: 'high', label: '\u9ad8\u30ea\u30b9\u30af', color: '#ef4444', emoji: '\uD83D\uDD34' };
  },

  /**
   * 総合判定の解釈テキスト
   * @param {number} score - Overall score (0-100)
   * @returns {string} Interpretation text
   */
  getOverallInterpretation(score) {
    if (score >= 80) {
      return '今の職場で安定して働けている状態です。会社との相性も良く、長く続けられる見込みがあります。この良い状態を保つために、今の職場環境を大切にしていきましょう。';
    }
    if (score >= 60) {
      return 'おおむね安定していますが、いくつか気になる点があります。スコアの低い項目に注目して、早めに対策すると、さらに安心して働けるようになります。';
    }
    if (score >= 40) {
      return 'いくつかの項目で注意が必要な状態です。スコアの低い項目について、具体的な改善を考えてみましょう。早めの対応が大切です。';
    }
    return '退職のリスクが高い状態です。何が原因か確認し、すぐに対策を考えることが必要です。スコアの低い項目から優先的に改善し、上司や人事と話し合いましょう。';
  },

  /**
   * 低スコア次元の改善アドバイスを取得
   * @param {Object<string, number>} dimensionScores - Map of dimension ID to score
   * @returns {Array<Object>} Sorted array of advice objects for dimensions scoring below 60
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

  // ----------------------------------------------------------
  // New: Meta-Analytic Weighted Scoring
  // ----------------------------------------------------------

  /**
   * メタ分析に基づく加重総合スコアを計算
   * Uses effect sizes from Griffeth et al. (2000) & Rubenstein et al. (2018)
   * to weight dimensions by their empirical predictive power for turnover.
   * Dimensions with stronger meta-analytic relationships to actual turnover
   * receive proportionally more influence on the final score.
   *
   * @param {Object<string, number>} dimensionScores - Map of dimension ID to score (0-100)
   * @returns {number} Weighted score (0-100), rounded
   */
  calculateWeightedOverallScore(dimensionScores) {
    let weightedSum = 0;
    let totalWeight = 0;

    for (const dimId in META_WEIGHTS) {
      if (META_WEIGHTS.hasOwnProperty(dimId) && dimensionScores[dimId] !== undefined) {
        const weight = META_WEIGHTS[dimId];
        weightedSum += dimensionScores[dimId] * weight;
        totalWeight += weight;
      }
    }

    if (totalWeight === 0) return 0;
    return Math.round(weightedSum / totalWeight);
  },

  // ----------------------------------------------------------
  // New: Compound Risk Pattern Detection
  // ----------------------------------------------------------

  /**
   * 複合リスクパターンを検出
   * A pattern is detected when ALL of its required dimensions score
   * below the pattern's threshold.
   *
   * @param {Object<string, number>} dimensionScores - Map of dimension ID to score (0-100)
   * @returns {Array<Object>} Array of detected patterns (empty array if none match)
   */
  detectCompoundRisks(dimensionScores) {
    const results = [];

    for (let i = 0; i < COMPOUND_RISK_PATTERNS.length; i++) {
      const pattern = COMPOUND_RISK_PATTERNS[i];
      let allBelowThreshold = true;

      // Check that ALL required dimensions are below the threshold
      for (let j = 0; j < pattern.dimensions.length; j++) {
        const dimId = pattern.dimensions[j];
        const score = dimensionScores[dimId];

        // If the dimension score is missing or at/above threshold, pattern does not match
        if (score === undefined || score >= pattern.threshold) {
          allBelowThreshold = false;
          break;
        }
      }

      if (allBelowThreshold) {
        results.push({
          id: pattern.id,
          name: pattern.name,
          nameEn: pattern.nameEn,
          icon: pattern.icon,
          description: pattern.description,
          severity: pattern.severity,
          dimensions: pattern.dimensions.slice(),
          threshold: pattern.threshold,
          advice: pattern.advice
        });
      }
    }

    return results;
  },

  // ----------------------------------------------------------
  // New: Demographic Context
  // ----------------------------------------------------------

  /**
   * 人口統計コンテキストを適用してスコアを調整
   * Adjusts the weighted score based on demographic risk modifiers.
   * The modifier is the product of all applicable demographic modifiers.
   * A higher modifier means the demographic group has higher base turnover,
   * so the adjusted score is divided by the modifier (higher base risk
   * means the raw score is less alarming relative to peers).
   *
   * @param {number} weightedScore - Meta-analytic weighted score (0-100)
   * @param {Object}  [demographic]          - Demographic information (all fields optional)
   * @param {string}  [demographic.age]      - Age group key (e.g., '20s', '30s', '40s', '50s+')
   * @param {string}  [demographic.tenure]   - Tenure key (e.g., '<1year', '1-3years')
   * @param {string}  [demographic.industry] - Industry key (e.g., 'it', 'finance')
   * @returns {Object} Adjusted result
   * @returns {number} return.adjustedScore - Score adjusted by demographic modifiers (0-100)
   * @returns {number} return.modifier      - Combined risk modifier
   * @returns {string} return.comparison    - Contextual comparison text in Japanese
   */
  calculateContextualScore(weightedScore, demographic) {
    // If no demographic info at all, return score unchanged
    if (!demographic) {
      return {
        adjustedScore: weightedScore,
        modifier: 1.0,
        comparison: ''
      };
    }

    const age = demographic.age;
    const tenure = demographic.tenure;
    const industry = demographic.industry;

    // Check if all fields are null/undefined
    const hasAge = age != null && DEMOGRAPHIC_BASELINES.age[age] != null;
    const hasTenure = tenure != null && DEMOGRAPHIC_BASELINES.tenure[tenure] != null;
    const hasIndustry = industry != null && DEMOGRAPHIC_BASELINES.industry[industry] != null;

    if (!hasAge && !hasTenure && !hasIndustry) {
      return {
        adjustedScore: weightedScore,
        modifier: 1.0,
        comparison: ''
      };
    }

    // Calculate combined modifier as product of applicable modifiers
    let modifier = 1.0;
    const contextParts = [];

    if (hasAge) {
      const baseline = DEMOGRAPHIC_BASELINES.age[age];
      modifier *= baseline.modifier;
      contextParts.push(baseline.label);
    }

    if (hasTenure) {
      const baseline = DEMOGRAPHIC_BASELINES.tenure[tenure];
      modifier *= baseline.modifier;
      contextParts.push(baseline.label);
    }

    if (hasIndustry) {
      const baseline = DEMOGRAPHIC_BASELINES.industry[industry];
      modifier *= baseline.modifier;
      contextParts.push(baseline.label);
    }

    // Adjust score: divide by modifier, cap to 0-100
    const adjustedScore = Math.round(Math.min(100, Math.max(0, weightedScore / modifier)));

    // Build comparison text
    let comparison = '';
    if (modifier > 1.05) {
      comparison = '同じ年代・業界の人と比べると、やや良い状態です';
    } else if (modifier < 0.95) {
      comparison = '同じ年代・業界の人と比べると、注意が必要な状態です';
    } else {
      comparison = '同じ年代・業界の人と比べると、標準的な状態です';
    }

    return {
      adjustedScore: adjustedScore,
      modifier: modifier,
      comparison: comparison
    };
  },

  // ----------------------------------------------------------
  // New: Enhanced Interpretation (weighted + compound + trend)
  // ----------------------------------------------------------

  /**
   * エビデンス加重スコアに基づく豊富な解釈テキストを生成
   * Includes the weighted score interpretation, detected compound risks,
   * and historical trend information.
   *
   * @param {number}      weightedScore  - Meta-analytic weighted score (0-100)
   * @param {Array}       compoundRisks  - Array of detected compound risk patterns from detectCompoundRisks()
   * @param {Object|null} trend          - Trend object from DiagnosticHistory.getTrend(), or null
   * @returns {string} Rich interpretation text
   */
  getWeightedInterpretation(weightedScore, compoundRisks, trend) {
    let text = '';

    // --- Weighted score interpretation ---
    if (weightedScore >= 80) {
      text += '科学的な分析の結果、退職のリスクは非常に低いと判定されました。退職に関わる重要な項目（転職への気持ち・会社への愛着など）も良好な状態です。';
    } else if (weightedScore >= 60) {
      text += '科学的な分析の結果、おおむね安定していますが、退職に関わりやすい項目に一部課題が見られます。重点的な改善をおすすめします。';
    } else if (weightedScore >= 40) {
      text += '科学的な分析の結果、退職に関わる重要な項目にリスクが見つかりました。特に「転職への気持ち」や「会社への愛着」の改善が急がれます。';
    } else {
      text += '科学的な分析の結果、退職のリスクが非常に高い状態です。退職に直結しやすい項目が全体的に低スコアであり、早急な対応が必要です。';
    }

    // --- Compound risk patterns ---
    if (compoundRisks && compoundRisks.length > 0) {
      text += '\n\n';
      text += 'また、以下の注意パターンが見つかりました：';
      for (let i = 0; i < compoundRisks.length; i++) {
        const cr = compoundRisks[i];
        text += '\n' + cr.icon + ' ' + cr.name;
        if (cr.severity === 'critical') {
          text += ' ― すぐに対応が必要';
        } else {
          text += ' ― 早めの対応を推奨';
        }
      }
      text += '\n複数の項目が同時に悪化しており、個別の問題よりも深刻な状態です。優先的に対応しましょう。';
    }

    // --- Trend information ---
    if (trend && trend.direction !== 'insufficient') {
      text += '\n\n';
      if (trend.direction === 'improving') {
        text += '前回の診断よりスコアが' + Math.abs(trend.change) + 'ポイント良くなっています。良い傾向ですので、今の取り組みを続けてください。';
      } else if (trend.direction === 'declining') {
        text += '前回の診断よりスコアが' + Math.abs(trend.change) + 'ポイント下がっています。状況が悪化しているため、早めの対応が必要です。';
      } else {
        text += '前回の診断とほぼ同じスコアです。安定していますが、低い項目があれば改善に取り組みましょう。';
      }
    }

    return text;
  },

  // ----------------------------------------------------------
  // Enhanced: Share Text (includes weighted score + compound risks)
  // ----------------------------------------------------------

  /**
   * 結果共有用テキストを生成
   * Enhanced to include weighted score and compound risk patterns.
   * @param {number} overallScore - Simple average overall score (0-100)
   * @param {Object<string, number>} dimensionScores - Map of dimension ID to score
   * @returns {string} Formatted text for sharing
   */
  generateShareText(overallScore, dimensionScores) {
    const risk = this.getRiskLevel(overallScore);
    const weightedScore = this.calculateWeightedOverallScore(dimensionScores);
    const compoundRisks = this.detectCompoundRisks(dimensionScores);

    let text = '退職リスク診断結果\n';
    text += '総合スコア: ' + overallScore + '/100 (' + risk.label + ')\n';
    text += '科学的分析スコア: ' + weightedScore + '/100\n';

    if (compoundRisks.length > 0) {
      text += '\n⚠️ 注意パターン:\n';
      for (let i = 0; i < compoundRisks.length; i++) {
        const cr = compoundRisks[i];
        text += cr.icon + ' ' + cr.name + '\n';
      }
    }

    text += '\n【項目別スコア】\n';
    for (const dim of DIMENSIONS) {
      const score = dimensionScores[dim.id];
      const bar = this.getRiskLevel(score).emoji;
      text += bar + ' ' + dim.name + ': ' + score + '/100\n';
    }
    text += '\n学術研究に基づく退職リスク診断';
    return text;
  },

  // ----------------------------------------------------------
  // Phase 2: Question-level Score Retrieval
  // ----------------------------------------------------------

  /**
   * 各質問のスコアを取得（正規化0-100）
   * Returns individual question scores within a dimension for drill-down display.
   *
   * @param {Object<number, number>} answers - Map of question ID to answer value (1-5)
   * @param {Object} dimension - Dimension object from DIMENSIONS
   * @returns {Array<Object>} Array of {id, text, reversed, rawAnswer, processedScore}
   */
  getQuestionScores(answers, dimension) {
    const results = [];
    for (const q of dimension.questions) {
      const rawAnswer = answers[q.id];
      if (rawAnswer !== undefined) {
        const processed = this.processAnswer(rawAnswer, q.reversed);
        // Normalize single question: (processed - 1) / (5 - 1) * 100
        const score = Math.round(((processed - 1) / 4) * 100);
        results.push({
          id: q.id,
          text: q.text,
          reversed: q.reversed,
          rawAnswer: rawAnswer,
          processedScore: score
        });
      }
    }
    return results;
  },

  // ----------------------------------------------------------
  // Phase 2: Normative Percentile Comparison
  // ----------------------------------------------------------

  /**
   * 次元スコアのパーセンタイルを算出
   * Calculates how the score compares to population norms using z-score.
   *
   * @param {string} dimId - Dimension ID
   * @param {number} score - Dimension score (0-100)
   * @returns {Object} { percentile, deviation, label }
   */
  getDimensionPercentile(dimId, score) {
    const norm = DIMENSION_NORMS[dimId];
    if (!norm) return { percentile: 50, deviation: 0, label: '平均的' };

    // z-score
    const z = (score - norm.mean) / norm.sd;

    // Approximate percentile from z-score using logistic approximation
    // P(Z <= z) ≈ 1 / (1 + e^(-1.7 * z))
    const percentile = Math.round(100 / (1 + Math.exp(-1.7 * z)));

    let label;
    if (percentile >= 85) label = '非常に高い';
    else if (percentile >= 70) label = '高い';
    else if (percentile >= 40) label = '平均的';
    else if (percentile >= 15) label = '低い';
    else label = '非常に低い';

    return {
      percentile: Math.max(1, Math.min(99, percentile)),
      deviation: Math.round(z * 10) / 10,
      label: label,
      highLabel: norm.highLabel,
      lowLabel: norm.lowLabel
    };
  },

  // ----------------------------------------------------------
  // Phase 2: Correlation-Based Insights
  // ----------------------------------------------------------

  /**
   * 次元間の相関に基づくインサイトを生成
   * Identifies relevant dimension correlations where both dimensions
   * have notable scores (either both low or diverging).
   *
   * @param {Object<string, number>} dimensionScores - Map of dimension ID to score
   * @returns {Array<Object>} Sorted array of relevant correlation insights
   */
  getCorrelationInsights(dimensionScores) {
    const insights = [];

    for (const corr of DIMENSION_CORRELATIONS) {
      const dim1 = corr.dims[0];
      const dim2 = corr.dims[1];
      const score1 = dimensionScores[dim1];
      const score2 = dimensionScores[dim2];

      if (score1 === undefined || score2 === undefined) continue;

      const dim1Name = DIMENSIONS.find(d => d.id === dim1);
      const dim2Name = DIMENSIONS.find(d => d.id === dim2);
      if (!dim1Name || !dim2Name) continue;

      // Calculate relevance: both low = very relevant, diverging = interesting
      let relevance = 0;
      let type = '';

      if (score1 < 50 && score2 < 50) {
        // Both low - strong negative synergy
        relevance = (100 - score1 + 100 - score2) * corr.r;
        type = 'synergy_negative';
      } else if (score1 >= 70 && score2 >= 70) {
        // Both high - positive reinforcement
        relevance = (score1 + score2 - 100) * corr.r * 0.5;
        type = 'synergy_positive';
      } else if (Math.abs(score1 - score2) > 25) {
        // Diverging - unexpected pattern
        relevance = Math.abs(score1 - score2) * corr.r * 0.7;
        type = 'diverging';
      }

      if (relevance > 15) {
        insights.push({
          dim1Id: dim1,
          dim2Id: dim2,
          dim1Name: dim1Name.name,
          dim2Name: dim2Name.name,
          score1: score1,
          score2: score2,
          correlation: corr.r,
          interpretation: corr.interpretation,
          type: type,
          relevance: relevance
        });
      }
    }

    // Sort by relevance descending, take top 5
    insights.sort((a, b) => b.relevance - a.relevance);
    return insights.slice(0, 5);
  },

  // ----------------------------------------------------------
  // Phase 2: Personalized Action Plan Generation
  // ----------------------------------------------------------

  /**
   * パーソナライズドアクションプランを生成
   * Generates a prioritized list of concrete improvement actions based on:
   * 1. Compound risk patterns (highest priority)
   * 2. Meta-analytic weight × score gap (impact potential)
   * 3. Demographic context
   *
   * @param {Object<string, number>} dimensionScores - Map of dimension ID to score
   * @param {Array} compoundRisks - Detected compound risk patterns
   * @param {Object|null} demographic - Demographic context
   * @returns {Object} { priorities: Array, summary: string, urgency: string }
   */
  generateActionPlan(dimensionScores, compoundRisks, demographic) {
    const priorities = [];

    // Score all dimensions by impact potential:
    // impactScore = META_WEIGHT * (100 - score) / 100
    const dimImpacts = [];
    for (const dim of DIMENSIONS) {
      const score = dimensionScores[dim.id] || 0;
      const weight = META_WEIGHTS[dim.id] || 0.1;
      const gap = 100 - score;
      const impact = weight * gap;
      dimImpacts.push({ dimId: dim.id, dimName: dim.name, score: score, weight: weight, gap: gap, impact: impact });
    }

    // Sort by impact descending
    dimImpacts.sort((a, b) => b.impact - a.impact);

    // Add compound risk actions first (highest priority)
    const handledDims = new Set();
    if (compoundRisks && compoundRisks.length > 0) {
      for (const risk of compoundRisks) {
        priorities.push({
          type: 'compound',
          priority: 'critical',
          title: risk.name + 'パターンへの対応',
          description: risk.advice,
          icon: risk.icon,
          dimensions: risk.dimensions.slice(),
          timeframe: 'immediate'
        });
        for (const dimId of risk.dimensions) {
          handledDims.add(dimId);
        }
      }
    }

    // Add dimension-specific actions for top impact dimensions
    for (const di of dimImpacts) {
      if (di.score >= 70) continue; // Skip healthy dimensions
      if (priorities.length >= 8) break; // Cap total actions

      const templates = ACTION_TEMPLATES[di.dimId];
      if (!templates) continue;

      // Select the most appropriate template based on score severity
      let templateIndex;
      if (di.score < 30) templateIndex = 0; // Immediate action needed
      else if (di.score < 50) templateIndex = 0;
      else templateIndex = 1; // Short-term improvement

      const template = templates[Math.min(templateIndex, templates.length - 1)];
      const isCompoundHandled = handledDims.has(di.dimId);

      priorities.push({
        type: 'dimension',
        priority: di.score < 40 ? 'high' : di.score < 60 ? 'medium' : 'low',
        title: di.dimName + 'の改善',
        description: template.action,
        category: template.category,
        timeframe: template.timeframe,
        effort: template.effort,
        dimId: di.dimId,
        score: di.score,
        impact: Math.round(di.impact * 100) / 100,
        isCompoundRelated: isCompoundHandled,
        allActions: templates
      });
    }

    // Determine overall urgency
    let urgency;
    const weightedScore = this.calculateWeightedOverallScore(dimensionScores);
    if (weightedScore < 40 || (compoundRisks && compoundRisks.some(r => r.severity === 'critical'))) {
      urgency = 'critical';
    } else if (weightedScore < 60) {
      urgency = 'high';
    } else if (weightedScore < 75) {
      urgency = 'moderate';
    } else {
      urgency = 'low';
    }

    // Generate summary
    let summary;
    if (urgency === 'critical') {
      summary = 'すぐに対応が必要です。上から順に、できることから取り組んでください。';
    } else if (urgency === 'high') {
      summary = '早めの改善をおすすめします。効果の大きい項目から取り組むと効率的です。';
    } else if (urgency === 'moderate') {
      summary = 'いくつか改善できるところがあります。気になる項目から取り組んでみましょう。';
    } else {
      summary = '全体的に良い状態です。さらに良くするために、以下のポイントも参考にしてください。';
    }

    return {
      priorities: priorities,
      summary: summary,
      urgency: urgency,
      totalActions: priorities.length
    };
  },

  // ----------------------------------------------------------
  // Phase 2: Strength Analysis
  // ----------------------------------------------------------

  /**
   * 強みの次元を特定
   * @param {Object<string, number>} dimensionScores
   * @returns {Array<Object>} Array of strength dimensions sorted by score desc
   */
  getStrengths(dimensionScores) {
    const strengths = [];
    for (const dim of DIMENSIONS) {
      const score = dimensionScores[dim.id];
      if (score >= 70) {
        const percentile = this.getDimensionPercentile(dim.id, score);
        strengths.push({
          dimId: dim.id,
          dimName: dim.name,
          dimNameEn: dim.nameEn,
          score: score,
          percentile: percentile.percentile,
          label: percentile.highLabel
        });
      }
    }
    strengths.sort((a, b) => b.score - a.score);
    return strengths;
  }
};
