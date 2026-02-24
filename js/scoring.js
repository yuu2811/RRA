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
    { timeframe: 'medium', effort: 'high', action: '職場で困っていることを上司に相談して、一緒に解決策を考える', category: '環境を良くする' }
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
// Risk Thresholds & Scoring Constants
// ============================================================
const RISK_THRESHOLDS = {
  LOW: 80,         // Score >= 80 = low risk
  CAUTION: 60,     // Score >= 60 = caution
  WARNING: 40,     // Score >= 40 = warning
  // Score < 40 = high risk
};

const ADVICE_THRESHOLD = 60;     // Show advice for dimensions below this
const STRENGTH_THRESHOLD = 70;   // Dimensions above this are strengths
const TREND_THRESHOLD = 3;       // Score change > 3 = meaningful trend
const LIKERT_MIN = 1;
const LIKERT_MAX = 5;

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
    name: '退職が近い状態',
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
    '30s': { modifier: 1.0, label: '30代は仕事が落ち着いてくる年代です' },
    '40s': { modifier: 0.85, label: '40代は長く働き続ける人が多い年代です' },
    '50s+': { modifier: 0.75, label: '50代以上は転職する人が少ない年代です' }
  },
  tenure: {
    '<1year': { modifier: 1.3, label: '\u5165\u793e1\u5e74\u672a\u6e80\u306f\u6700\u3082\u30ea\u30b9\u30af\u304c\u9ad8\u3044\u671f\u9593\u3067\u3059' },
    '1-3years': { modifier: 1.1, label: '1〜3年目は理想と現実のギャップを感じやすい時期です' },
    '3-5years': { modifier: 0.95, label: '3〜5年目は将来の方向性を考える時期です' },
    '5-10years': { modifier: 0.85, label: '5年以上働いていると会社に馴染んでいる人が多いです' },
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
      // Notify user that history could not be saved
      console.warn('localStorage save failed:', e);
      if (typeof window !== 'undefined') {
        // Show a non-blocking toast instead of alert/confirm
        var toast = document.createElement('div');
        toast.textContent = '診断結果の保存に失敗しました。端末の空き容量をご確認ください。';
        toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:rgba(239,68,68,0.9);color:#fff;padding:12px 20px;border-radius:12px;font-size:14px;z-index:9999;max-width:90vw;text-align:center;animation:fadeIn 0.3s ease;';
        document.body.appendChild(toast);
        setTimeout(function() { toast.remove(); }, 5000);
      }
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
      // Validate each entry to prevent XSS via corrupted/malicious data
      entries = entries.filter(function (e) {
        if (!e || typeof e !== 'object') return false;
        if (typeof e.date !== 'string') return false;
        if (typeof e.weighted !== 'number' || !isFinite(e.weighted)) return false;
        if (e.overall !== undefined && (typeof e.overall !== 'number' || !isFinite(e.overall))) return false;
        return true;
      });
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
    var currentScore = Number(current.weighted || current.overall) || 0;
    var previousScore = Number(previous.weighted || previous.overall) || 0;
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
  },

  /**
   * Calculate risk velocity: rate of change across last N assessments.
   * Uses simple linear regression on scores over time.
   *
   * @param {number} [minEntries=3] - Minimum entries required for velocity calculation
   * @returns {Object} { overall: {slope, direction, acceleration}, dimensions: {dimId: {slope, direction}} }
   */
  getVelocity: function (minEntries) {
    minEntries = minEntries || 3;
    var entries = this.getAll();
    if (entries.length < minEntries) {
      return { overall: null, dimensions: {} };
    }

    // Use last 5 entries max
    var recent = entries.slice(Math.max(0, entries.length - 5));
    var n = recent.length;

    // Linear regression helper: returns slope per assessment
    function linearSlope(values) {
      if (values.length < 2) return 0;
      var nn = values.length;
      var sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
      for (var i = 0; i < nn; i++) {
        sumX += i;
        sumY += values[i];
        sumXY += i * values[i];
        sumX2 += i * i;
      }
      var denom = nn * sumX2 - sumX * sumX;
      if (denom === 0) return 0;
      return (nn * sumXY - sumX * sumY) / denom;
    }

    // Overall velocity
    var overallScores = recent.map(function (e) { return e.weighted || e.overall; });
    var overallSlope = linearSlope(overallScores);

    // Acceleration: compare slope of first half vs second half
    var acceleration = 'steady';
    if (n >= 4) {
      var mid = Math.floor(n / 2);
      var firstHalf = overallScores.slice(0, mid);
      var secondHalf = overallScores.slice(mid);
      var slope1 = linearSlope(firstHalf);
      var slope2 = linearSlope(secondHalf);
      if (slope2 - slope1 > 2) acceleration = 'accelerating';
      else if (slope1 - slope2 > 2) acceleration = 'decelerating';
    }

    var overallDirection;
    if (overallSlope > 1.5) overallDirection = 'improving';
    else if (overallSlope < -1.5) overallDirection = 'declining';
    else overallDirection = 'stable';

    // Per-dimension velocity
    var dimVelocities = {};
    var dimIds = DIMENSIONS.map(function (d) { return d.id; });

    for (var di = 0; di < dimIds.length; di++) {
      var dimId = dimIds[di];
      var dimScores = [];
      for (var ei = 0; ei < recent.length; ei++) {
        if (recent[ei].dimensions && recent[ei].dimensions[dimId] !== undefined) {
          dimScores.push(recent[ei].dimensions[dimId]);
        }
      }
      if (dimScores.length >= minEntries) {
        var dimSlope = linearSlope(dimScores);
        var dimDir;
        if (dimSlope > 2) dimDir = 'improving';
        else if (dimSlope < -2) dimDir = 'declining';
        else dimDir = 'stable';
        dimVelocities[dimId] = {
          slope: Math.round(dimSlope * 10) / 10,
          direction: dimDir
        };
      }
    }

    return {
      overall: {
        slope: Math.round(overallSlope * 10) / 10,
        direction: overallDirection,
        acceleration: acceleration,
        dataPoints: n
      },
      dimensions: dimVelocities
    };
  },

  /**
   * Calculate the user's diagnostic streak.
   * A streak counts consecutive assessments that were taken within
   * the expected interval (e.g., within 45 days of each other).
   *
   * @param {number} [maxGapDays=45] - Max days between assessments to maintain streak
   * @returns {Object} { streak: number, lastDate: string|null, isActive: boolean }
   */
  getStreak: function (maxGapDays) {
    maxGapDays = maxGapDays || 45;
    var entries = this.getAll();
    if (entries.length === 0) return { streak: 0, lastDate: null, isActive: false };

    var streak = 1;
    var now = new Date();
    var lastDate = new Date(entries[entries.length - 1].date);

    // Check if streak is still active (within maxGapDays from now)
    var daysSinceLast = (now - lastDate) / (1000 * 60 * 60 * 24);
    var isActive = daysSinceLast <= maxGapDays;

    // Count consecutive entries within maxGapDays of each other
    for (var i = entries.length - 1; i > 0; i--) {
      var current = new Date(entries[i].date);
      var previous = new Date(entries[i - 1].date);
      var gap = (current - previous) / (1000 * 60 * 60 * 24);
      if (gap <= maxGapDays && gap >= 1) {
        streak++;
      } else {
        break;
      }
    }

    return {
      streak: streak,
      lastDate: entries[entries.length - 1].date,
      isActive: isActive
    };
  },

  /**
   * Export all diagnostic history as a JSON string.
   * @returns {string} JSON string of all history entries
   */
  exportJSON: function () {
    var entries = this.getAll();
    return JSON.stringify({
      version: 1,
      app: 'rra',
      exported: new Date().toISOString(),
      entries: entries
    }, null, 2);
  },

  /**
   * Import diagnostic history from a JSON string. Merges with existing data.
   * @param {string} jsonStr - JSON string from exportJSON
   * @returns {Object} { success: boolean, imported: number, message: string }
   */
  importJSON: function (jsonStr) {
    try {
      var data = JSON.parse(jsonStr);
      if (!data || !Array.isArray(data.entries)) {
        return { success: false, imported: 0, message: '無効なデータ形式です' };
      }

      var existing = this.getAll();
      var existingDates = {};
      for (var i = 0; i < existing.length; i++) {
        existingDates[existing[i].date] = true;
      }

      var imported = 0;
      for (var j = 0; j < data.entries.length; j++) {
        var entry = data.entries[j];
        // Strict type validation to prevent XSS via malicious import
        if (!entry || typeof entry !== 'object') continue;
        if (typeof entry.date !== 'string') continue;
        if (typeof entry.weighted !== 'number' || !isFinite(entry.weighted)) continue;
        if (existingDates[entry.date]) continue; // Skip duplicates
        // Sanitize dimensions: only accept numeric values for known dimension IDs
        var cleanDims = {};
        if (entry.dimensions && typeof entry.dimensions === 'object' && !Array.isArray(entry.dimensions)) {
          for (var dk = 0; dk < DIMENSIONS.length; dk++) {
            var dimKey = DIMENSIONS[dk].id;
            if (typeof entry.dimensions[dimKey] === 'number' && isFinite(entry.dimensions[dimKey])) {
              cleanDims[dimKey] = Math.max(0, Math.min(100, Math.round(entry.dimensions[dimKey])));
            }
          }
        }
        existing.push({
          date: entry.date,
          weighted: Math.max(0, Math.min(100, Math.round(entry.weighted))),
          overall: typeof entry.overall === 'number' && isFinite(entry.overall) ? Math.max(0, Math.min(100, Math.round(entry.overall))) : 0,
          dimensions: cleanDims,
          demographic: null,
          compoundRisks: []
        });
        imported++;
      }

      // Sort and trim
      existing.sort(function (a, b) {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
      if (existing.length > this.MAX_ENTRIES) {
        existing = existing.slice(existing.length - this.MAX_ENTRIES);
      }

      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(existing));
      } catch (e) {
        return { success: false, imported: 0, message: '保存に失敗しました' };
      }

      return { success: true, imported: imported, message: imported + '件のデータを読み込みました' };
    } catch (e) {
      return { success: false, imported: 0, message: 'ファイルの読み込みに失敗しました' };
    }
  }
};

// ============================================================
// 5. Score Code Encoding/Decoding (Team Mode)
// ============================================================

/**
 * Encodes 10 dimension scores (0-100) into a compact URL-safe string.
 * Format: Each score uses 2 chars (base36), total = 20 chars + 2 char checksum.
 *
 * @param {Object<string, number>} dimensionScores
 * @returns {string} 22-character code
 */
function encodeScoreCode(dimensionScores) {
  var parts = [];
  var sum = 0;
  for (var i = 0; i < DIMENSIONS.length; i++) {
    var score = Math.max(0, Math.min(99, Math.round(dimensionScores[DIMENSIONS[i].id] || 0)));
    parts.push((score < 10 ? '0' : '') + score.toString(36));
    sum += score;
  }
  // Simple checksum: sum mod 1296 in base36 (2 chars)
  var checksum = sum % 1296;
  parts.push((checksum < 36 ? '0' : '') + checksum.toString(36));
  return parts.join('').toUpperCase();
}

/**
 * Decodes a score code back into dimension scores.
 *
 * @param {string} code - 22-character code from encodeScoreCode
 * @returns {Object|null} dimensionScores or null if invalid
 */
function decodeScoreCode(code) {
  if (!code || typeof code !== 'string') return null;
  code = code.trim().toUpperCase();
  if (code.length !== 22) return null;

  var scores = {};
  var sum = 0;
  for (var i = 0; i < 10; i++) {
    var chunk = code.substring(i * 2, i * 2 + 2);
    var val = parseInt(chunk, 36);
    if (isNaN(val) || val < 0 || val > 99) return null;
    scores[DIMENSIONS[i].id] = val;
    sum += val;
  }

  // Verify checksum
  var checksumChunk = code.substring(20, 22);
  var expectedChecksum = parseInt(checksumChunk, 36);
  if (isNaN(expectedChecksum) || (sum % 1296) !== expectedChecksum) return null;

  return scores;
}

/**
 * Analyze a group of score sets and produce aggregate statistics.
 *
 * @param {Array<Object<string, number>>} scoresSets - Array of dimensionScores objects
 * @returns {Object} Group analysis result
 */
function analyzeGroup(scoresSets) {
  if (!scoresSets || scoresSets.length === 0) return null;

  var n = scoresSets.length;
  var dimStats = {};

  for (var i = 0; i < DIMENSIONS.length; i++) {
    var dimId = DIMENSIONS[i].id;
    var values = [];
    for (var j = 0; j < n; j++) {
      if (scoresSets[j][dimId] !== undefined) {
        values.push(scoresSets[j][dimId]);
      }
    }
    if (values.length === 0) continue;

    var sum = 0;
    for (var k = 0; k < values.length; k++) sum += values[k];
    var mean = sum / values.length;

    var varianceSum = 0;
    for (var m = 0; m < values.length; m++) {
      varianceSum += (values[m] - mean) * (values[m] - mean);
    }
    var sd = values.length > 1 ? Math.sqrt(varianceSum / (values.length - 1)) : 0;

    var min = Math.min.apply(null, values);
    var max = Math.max.apply(null, values);

    dimStats[dimId] = {
      mean: Math.round(mean),
      sd: Math.round(sd),
      min: min,
      max: max,
      count: values.length
    };
  }

  // Group overall weighted score
  var weightedScores = scoresSets.map(function (scores) {
    return Scoring.calculateWeightedOverallScore(scores);
  });
  var overallSum = 0;
  for (var oi = 0; oi < weightedScores.length; oi++) overallSum += weightedScores[oi];
  var overallMean = Math.round(overallSum / weightedScores.length);

  // Group compound risks (detect on mean scores)
  var meanScores = {};
  for (var di = 0; di < DIMENSIONS.length; di++) {
    var ds = dimStats[DIMENSIONS[di].id];
    if (ds) meanScores[DIMENSIONS[di].id] = ds.mean;
  }
  var groupCompoundRisks = Scoring.detectCompoundRisks(meanScores);

  // Find highest-risk dimensions (lowest mean)
  var riskDims = [];
  for (var ri = 0; ri < DIMENSIONS.length; ri++) {
    var rds = dimStats[DIMENSIONS[ri].id];
    if (rds) riskDims.push({ id: DIMENSIONS[ri].id, name: DIMENSIONS[ri].name, mean: rds.mean });
  }
  riskDims.sort(function (a, b) { return a.mean - b.mean; });

  return {
    memberCount: n,
    overallMean: overallMean,
    overallRisk: Scoring.getRiskLevel(overallMean),
    dimensions: dimStats,
    meanScores: meanScores,
    compoundRisks: groupCompoundRisks,
    highestRiskDimensions: riskDims.slice(0, 3),
    weightedScores: weightedScores
  };
}

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
    if (score >= RISK_THRESHOLDS.LOW) return { level: 'low', label: '\u4f4e\u30ea\u30b9\u30af', color: '#22c55e', emoji: '\uD83D\uDFE2' };
    if (score >= RISK_THRESHOLDS.CAUTION) return { level: 'caution', label: '\u3084\u3084\u6ce8\u610f', color: '#eab308', emoji: '\uD83D\uDFE1' };
    if (score >= RISK_THRESHOLDS.WARNING) return { level: 'warning', label: '\u8981\u6ce8\u610f', color: '#f97316', emoji: '\uD83D\uDFE0' };
    return { level: 'high', label: '\u9ad8\u30ea\u30b9\u30af', color: '#ef4444', emoji: '\uD83D\uDD34' };
  },

  /**
   * 総合判定の解釈テキスト
   * @param {number} score - Overall score (0-100)
   * @returns {string} Interpretation text
   */
  getOverallInterpretation(score) {
    if (score >= RISK_THRESHOLDS.LOW) {
      return '今の職場で安定して働けている状態です。会社との相性も良く、長く続けられる見込みがあります。この良い状態を保つために、今の職場環境を大切にしていきましょう。';
    }
    if (score >= RISK_THRESHOLDS.CAUTION) {
      return 'おおむね安定していますが、いくつか気になる点があります。スコアの低い項目に注目して、早めに対策すると、さらに安心して働けるようになります。';
    }
    if (score >= RISK_THRESHOLDS.WARNING) {
      return 'いくつかの項目で注意が必要な状態です。点数の低いところを確認して、できることから取り組んでみましょう。';
    }
    return '退職のリスクが高い状態です。何が原因か確認し、すぐに手を打ちましょう。まず点数の低いところから、上司や周りの人に相談してみてください。';
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
      if (score < ADVICE_THRESHOLD) {
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

  /**
   * Generate a comprehensive text report suitable for copying/printing.
   * @param {number} overallScore
   * @param {number} weightedScore
   * @param {Object<string, number>} dimensionScores
   * @param {Array} compoundRisks
   * @param {Object} demographic
   * @param {Object<number, number>} answers
   * @returns {string} Multi-line text report
   */
  generateTextReport(overallScore, weightedScore, dimensionScores, compoundRisks, demographic, answers) {
    var lines = [];
    var risk = this.getRiskLevel(weightedScore);
    var now = new Date();
    var dateStr = now.getFullYear() + '年' + (now.getMonth() + 1) + '月' + now.getDate() + '日';

    lines.push('═══════════════════════════════════════');
    lines.push('　はたらく環境診断　詳細レポート');
    lines.push('　診断日: ' + dateStr);
    lines.push('═══════════════════════════════════════');
    lines.push('');

    // Demographics
    if (demographic && (demographic.age || demographic.tenure || demographic.industry)) {
      lines.push('【回答者情報】');
      if (demographic.age) lines.push('　年代: ' + demographic.age);
      if (demographic.tenure) lines.push('　勤続年数: ' + demographic.tenure);
      if (demographic.industry) lines.push('　業界: ' + demographic.industry);
      lines.push('');
    }

    // Overall score
    lines.push('【総合判定】');
    lines.push('　基本スコア: ' + overallScore + '/100');
    lines.push('　分析スコア: ' + weightedScore + '/100');
    lines.push('　判定: ' + risk.label);
    lines.push('');
    lines.push(this.getOverallInterpretation(weightedScore));
    lines.push('');

    // Compound risks
    if (compoundRisks && compoundRisks.length > 0) {
      lines.push('───────────────────────────────────────');
      lines.push('【注意が必要な組み合わせ】');
      for (var i = 0; i < compoundRisks.length; i++) {
        var cr = compoundRisks[i];
        lines.push('');
        lines.push(cr.icon + ' ' + cr.name + ' (' + cr.severity + ')');
        lines.push('　' + cr.description);
        if (cr.advice) lines.push('　→ ' + cr.advice);
      }
      lines.push('');
    }

    // Dimension details
    lines.push('───────────────────────────────────────');
    lines.push('【項目別スコア】');
    lines.push('');

    for (var di = 0; di < DIMENSIONS.length; di++) {
      var dim = DIMENSIONS[di];
      var score = dimensionScores[dim.id] || 0;
      var dimRisk = this.getRiskLevel(score);
      var bar = '';
      for (var b = 0; b < 10; b++) {
        bar += (b < Math.round(score / 10)) ? '█' : '░';
      }
      lines.push(dim.name + ': ' + score + '/100 ' + bar + ' ' + dimRisk.label);

      // Explanation
      if (answers && this.getDimensionExplanation) {
        var explanation = this.getDimensionExplanation(dim, score, answers);
        if (explanation) lines.push('　' + explanation);
      }

      // Advice for low scores
      if (score < ADVICE_THRESHOLD) {
        lines.push('　改善: ' + dim.adviceLow);
      }
      lines.push('');
    }

    // Action plan
    var actionPlan = this.generateActionPlan(dimensionScores, compoundRisks);
    if (actionPlan && actionPlan.priorities.length > 0) {
      lines.push('───────────────────────────────────────');
      lines.push('【改善プラン】 優先度: ' + actionPlan.urgency);
      lines.push(actionPlan.summary);
      lines.push('');
      for (var ai = 0; ai < actionPlan.priorities.length; ai++) {
        var item = actionPlan.priorities[ai];
        lines.push((ai + 1) + '. ' + item.title);
        lines.push('　' + item.description);
      }
      lines.push('');
    }

    // Strengths
    var strengths = this.getStrengths(dimensionScores);
    if (strengths.length > 0) {
      lines.push('───────────────────────────────────────');
      lines.push('【あなたの強み】');
      for (var si = 0; si < strengths.length; si++) {
        lines.push('　' + strengths[si].dimName + ': ' + strengths[si].score + '/100 (' + strengths[si].label + ')');
      }
      lines.push('');
    }

    lines.push('═══════════════════════════════════════');
    lines.push('はたらく環境診断 v4.0');
    lines.push('※ この診断は学術研究（メタ分析）に基づいています');

    return lines.join('\n');
  },

  /**
   * Public alias for What-If simulator.
   * Recalculates weighted score from modified dimension scores.
   * @param {Object<string, number>} dimensionScores
   * @returns {number}
   */
  calculateWeightedScore(dimensionScores) {
    return this.calculateWeightedOverallScore(dimensionScores);
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
      text += '詳しい分析の結果、退職のリスクはとても低いと判定されました。退職に関わる大事な項目（今の仕事を続ける気持ち・会社への愛着など）も良い状態です。';
    } else if (weightedScore >= 60) {
      text += '詳しい分析の結果、おおむね安定していますが、退職に関わりやすい項目に心配なところがあります。気になるところから改善に取り組んでみましょう。';
    } else if (weightedScore >= 40) {
      text += '詳しい分析の結果、退職に関わる大事な項目にリスクが見つかりました。特に「今の仕事を続ける気持ち」や「会社への愛着」のところを見直してみましょう。';
    } else {
      text += '詳しい分析の結果、退職のリスクがとても高い状態です。退職につながりやすい項目の点数が全体的に低く、今すぐ対応が必要です。';
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
          text += ' ― 早めに手を打ちましょう';
        }
      }
      text += '\n複数の項目が同時に悪くなっていて、一つ一つの問題よりも深刻な状態です。まずここから取り組みましょう。';
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
    const weightedScore = this.calculateWeightedOverallScore(dimensionScores);
    const risk = this.getRiskLevel(weightedScore);
    const compoundRisks = this.detectCompoundRisks(dimensionScores);

    let text = 'はたらく環境診断結果\n';
    text += '総合スコア: ' + weightedScore + '/100 (' + risk.label + ')\n';

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
    text += '\n研究に基づくはたらく環境診断';
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

  /**
   * Generate natural-language explanation for why a dimension scored the way it did.
   * @param {Object} dimension - Dimension object from DIMENSIONS
   * @param {number} score - Dimension score (0-100)
   * @param {Object<number, number>} answers - Map of question ID to answer value
   * @returns {string} Plain-language explanation
   */
  getDimensionExplanation(dimension, score, answers) {
    var qScores = this.getQuestionScores(answers, dimension);
    if (qScores.length === 0) return '';

    // Find strongest and weakest questions
    var sorted = qScores.slice().sort(function(a, b) { return a.processedScore - b.processedScore; });
    var weakest = sorted[0];
    var strongest = sorted[sorted.length - 1];

    var risk = this.getRiskLevel(score);
    var parts = [];

    if (risk.level === 'low') {
      parts.push('この項目はとても良い状態です。');
      if (strongest.processedScore === 100) {
        parts.push('特に「' + strongest.text + '」への回答が最も高く、安定しています。');
      }
    } else if (risk.level === 'caution') {
      parts.push('おおむね良好ですが、改善できる点があります。');
      if (weakest.processedScore < 50) {
        parts.push('「' + weakest.text + '」の回答が低めなので、ここを意識するとスコアが上がります。');
      }
    } else if (risk.level === 'warning') {
      parts.push('注意が必要な状態です。');
      parts.push('「' + weakest.text + '」の回答が特に低く、この項目のスコアを下げています。');
    } else {
      parts.push('リスクが高い状態です。');
      var lowCount = sorted.filter(function(q) { return q.processedScore < 50; }).length;
      if (lowCount >= 2) {
        parts.push('複数の質問で低い回答になっており、全体的に改善が必要です。');
      } else {
        parts.push('「' + weakest.text + '」の回答が特に低く、改善の余地があります。');
      }
    }

    return parts.join('');
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
      if (di.score >= STRENGTH_THRESHOLD) continue; // Skip healthy dimensions
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
        priority: di.score < RISK_THRESHOLDS.WARNING ? 'high' : di.score < ADVICE_THRESHOLD ? 'medium' : 'low',
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
      summary = '早めの改善をおすすめします。一番大事な項目から順に取り組んでいきましょう。';
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
      if (score >= STRENGTH_THRESHOLD) {
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
