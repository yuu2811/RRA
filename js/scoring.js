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
  job_embeddedness:       { mean: 58, sd: 18, highLabel: '強い帰属', lowLabel: '弱い帰属' },
  org_commitment:         { mean: 55, sd: 20, highLabel: '高い忠誠心', lowLabel: '低い忠誠心' },
  turnover_intention:     { mean: 62, sd: 22, highLabel: '定着傾向', lowLabel: '離職傾向' },
  role_clarity:           { mean: 65, sd: 16, highLabel: '明確', lowLabel: '曖昧' },
  job_satisfaction:       { mean: 60, sd: 19, highLabel: '高い満足', lowLabel: '低い満足' },
  po_fit:                 { mean: 57, sd: 20, highLabel: '高い適合', lowLabel: 'ミスマッチ' },
  career_dev:             { mean: 50, sd: 22, highLabel: '成長実感', lowLabel: '停滞感' },
  work_life_balance:      { mean: 52, sd: 21, highLabel: '良好', lowLabel: '不均衡' },
  leadership:             { mean: 56, sd: 23, highLabel: '支援的', lowLabel: '不十分' },
  perceived_alternatives: { mean: 48, sd: 24, highLabel: '低い認知', lowLabel: '高い認知' }
};

/**
 * @constant {Object}
 * Inter-dimension correlation pairs based on meta-analytic findings.
 * Each pair represents a strong empirical relationship between two dimensions.
 * r: Pearson correlation coefficient from meta-analyses
 * interpretation: Japanese description of the relationship
 */
const DIMENSION_CORRELATIONS = [
  { dims: ['job_satisfaction', 'org_commitment'], r: 0.65, interpretation: '職務満足が高いほど組織コミットメントも高まる傾向があります' },
  { dims: ['org_commitment', 'turnover_intention'], r: 0.58, interpretation: '組織コミットメントが低下すると離職意図が高まります' },
  { dims: ['leadership', 'job_satisfaction'], r: 0.52, interpretation: 'リーダーシップの質は職務満足に強く影響します' },
  { dims: ['work_life_balance', 'job_satisfaction'], r: 0.48, interpretation: 'ワークライフバランスは職務満足の重要な規定要因です' },
  { dims: ['role_clarity', 'job_satisfaction'], r: 0.45, interpretation: '役割が明確なほど職務満足が高まります' },
  { dims: ['po_fit', 'org_commitment'], r: 0.50, interpretation: '組織との価値観適合は帰属意識を強化します' },
  { dims: ['career_dev', 'turnover_intention'], r: 0.42, interpretation: 'キャリア開発機会の不足は離職意図を高めます' },
  { dims: ['job_embeddedness', 'turnover_intention'], r: 0.55, interpretation: '職務埋め込みが強いほど離職意図が抑制されます' },
  { dims: ['leadership', 'org_commitment'], r: 0.47, interpretation: '上司のリーダーシップは組織への愛着に影響します' },
  { dims: ['work_life_balance', 'turnover_intention'], r: 0.40, interpretation: 'ワークライフバランスの崩壊は離職の直接的な引き金になります' }
];

/**
 * @constant {Object<string, Array>}
 * Prioritized action templates for each dimension.
 * Each action has timeframe (immediate/short/medium), effort level, and specific step.
 */
const ACTION_TEMPLATES = {
  job_embeddedness: [
    { timeframe: 'immediate', effort: 'low', action: 'チーム内の同僚と週1回のランチや雑談の時間を設ける', category: '人間関係' },
    { timeframe: 'short', effort: 'medium', action: '部署横断プロジェクトやタスクフォースへの参加を申し出る', category: 'ネットワーク' },
    { timeframe: 'medium', effort: 'high', action: 'メンター・メンティー関係を構築し、組織内での存在価値を高める', category: '帰属意識' }
  ],
  org_commitment: [
    { timeframe: 'immediate', effort: 'low', action: '組織のミッション・ビジョンを再確認し、自分の仕事との接点を整理する', category: '理念理解' },
    { timeframe: 'short', effort: 'medium', action: '経営層や他部署とのタウンホールミーティングに参加する', category: '組織理解' },
    { timeframe: 'medium', effort: 'medium', action: '自分の貢献が組織全体にどう影響するかを可視化するレポートを作成する', category: '貢献実感' }
  ],
  turnover_intention: [
    { timeframe: 'immediate', effort: 'low', action: '現在の不満要因を具体的にリストアップし、改善可能なものを特定する', category: '課題整理' },
    { timeframe: 'short', effort: 'medium', action: '上司またはHR担当者とキャリア面談を設定し、懸念を率直に共有する', category: '対話' },
    { timeframe: 'medium', effort: 'high', action: '社内異動や役割変更の可能性を探り、新鮮な挑戦の機会を見つける', category: '環境改善' }
  ],
  role_clarity: [
    { timeframe: 'immediate', effort: 'low', action: '上司と15分の1on1で、今月の最優先事項トップ3を確認する', category: '優先順位' },
    { timeframe: 'short', effort: 'medium', action: 'ジョブ・ディスクリプションを上司と共に見直し、期待値を明文化する', category: '職務定義' },
    { timeframe: 'medium', effort: 'medium', action: '四半期ごとの目標設定・レビューサイクルを導入提案する', category: '制度化' }
  ],
  job_satisfaction: [
    { timeframe: 'immediate', effort: 'low', action: '日々の業務で「やりがいを感じる瞬間」を記録し、パターンを把握する', category: '自己分析' },
    { timeframe: 'short', effort: 'medium', action: 'ジョブ・クラフティング：自分の強みを活かせるタスクの割合を増やす交渉をする', category: '業務改善' },
    { timeframe: 'medium', effort: 'high', action: '職場環境改善の提案書を作成し、具体的な改善アクションを実行する', category: '環境改善' }
  ],
  po_fit: [
    { timeframe: 'immediate', effort: 'low', action: '自分の価値観と組織の理念の一致点・不一致点を書き出して整理する', category: '価値観分析' },
    { timeframe: 'short', effort: 'medium', action: '社内の異なるチームや部署の文化を知るための情報収集を行う', category: '探索' },
    { timeframe: 'medium', effort: 'high', action: 'キャリアカウンセリングを受け、最適な組織内配置を検討する', category: '適合改善' }
  ],
  career_dev: [
    { timeframe: 'immediate', effort: 'low', action: '3年後のキャリアビジョンを書き出し、現在の業務との関連を整理する', category: 'ビジョン策定' },
    { timeframe: 'short', effort: 'medium', action: '社内研修・資格取得支援・メンター制度など利用可能な制度を調査・申請する', category: 'スキルアップ' },
    { timeframe: 'medium', effort: 'high', action: '新規プロジェクトのリードや越境的な役割に挑戦し、成長の機会を創出する', category: '挑戦' }
  ],
  work_life_balance: [
    { timeframe: 'immediate', effort: 'low', action: '今週のタスクを緊急度と重要度でマトリクス分類し、不要なものを断る', category: '業務整理' },
    { timeframe: 'short', effort: 'medium', action: '有給休暇を計画的に取得するスケジュールを立て、上司と共有する', category: '休息確保' },
    { timeframe: 'medium', effort: 'high', action: '産業医・EAPカウンセラーとの面談を通じて、組織的な支援策を得る', category: '専門支援' }
  ],
  leadership: [
    { timeframe: 'immediate', effort: 'low', action: '上司との定期的な1on1ミーティングを提案し、コミュニケーション頻度を高める', category: 'コミュニケーション' },
    { timeframe: 'short', effort: 'medium', action: '具体的なフィードバックを上司に求め、成長支援の方向性をすり合わせる', category: 'フィードバック' },
    { timeframe: 'medium', effort: 'high', action: '必要に応じてHR部門を介した調整や、別のマネージャーへの相談を検討する', category: '関係改善' }
  ],
  perceived_alternatives: [
    { timeframe: 'immediate', effort: 'low', action: '現職の隠れたメリット（福利厚生、人間関係、学習機会）を棚卸しする', category: '再評価' },
    { timeframe: 'short', effort: 'medium', action: '市場価値を正しく把握するため、社内でのスキル評価やフィードバックを受ける', category: '自己理解' },
    { timeframe: 'medium', effort: 'medium', action: '現職での新たな挑戦や成長機会を見つけ、エンゲージメントを高める', category: 'エンゲージメント' }
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
    name: '\u71c3\u3048\u5c3d\u304d\u578b',
    nameEn: 'Burnout',
    icon: '\uD83D\uDD25',
    description: '\u6162\u6027\u7684\u306a\u904e\u8ca0\u8377\u3068\u30b9\u30c8\u30ec\u30b9\u306b\u3088\u308a\u3001\u5fc3\u8eab\u306e\u6d88\u8017\u304c\u9032\u884c\u3057\u3066\u3044\u308b\u72b6\u614b\u3067\u3059\u3002\u30ef\u30fc\u30af\u30e9\u30a4\u30d5\u30d0\u30e9\u30f3\u30b9\u3001\u8077\u52d9\u6e80\u8db3\u3001\u30ea\u30fc\u30c0\u30fc\u30b7\u30c3\u30d7\u306e\u3059\u3079\u3066\u304c\u4f4e\u8ff7\u3057\u3066\u304a\u308a\u3001\u30d0\u30fc\u30f3\u30a2\u30a6\u30c8\u306f\u96e2\u8077\u306e\u6700\u3082\u5f37\u529b\u306a\u524d\u99c6\u75c7\u72b6\u306e\u4e00\u3064\u3067\u3059\u3002',
    severity: 'critical',
    dimensions: ['work_life_balance', 'job_satisfaction', 'leadership'],
    threshold: 40,
    advice: '\u696d\u52d9\u91cf\u306e\u9069\u6b63\u5316\u304c\u6025\u52d9\u3067\u3059\u3002\u4e0a\u53f8\u3068\u306e\u9762\u8ac7\u3067\u512a\u5148\u9806\u4f4d\u3092\u898b\u76f4\u3057\u3001\u4e0d\u8981\u306a\u696d\u52d9\u306e\u524a\u6e1b\u3092\u691c\u8a0e\u3057\u3066\u304f\u3060\u3055\u3044\u3002\u7523\u696d\u533b\u3084EAP\u306e\u5229\u7528\u3082\u63a8\u5968\u3057\u307e\u3059\u3002\u5fc3\u8eab\u306e\u56de\u5fa9\u306a\u304f\u3057\u3066\u6301\u7d9a\u7684\u306a\u5c31\u696d\u306f\u56f0\u96e3\u3067\u3059\u3002'
  },
  {
    id: 'flight_risk',
    name: '\u9003\u907f\u578b',
    nameEn: 'Flight Risk',
    icon: '\uD83D\uDEAA',
    description: '\u4ee3\u66ff\u9078\u629e\u80a2\u306e\u8a8d\u77e5\u304c\u9ad8\u304f\uff08\u30b9\u30b3\u30a2\u304c\u4f4e\u3044\uff09\u3001\u96e2\u8077\u610f\u56f3\u304c\u5f37\u304f\uff08\u30b9\u30b3\u30a2\u304c\u4f4e\u3044\uff09\u3001\u7d44\u7e54\u30b3\u30df\u30c3\u30c8\u30e1\u30f3\u30c8\u3082\u4f4e\u3044\u72b6\u614b\u3067\u3059\u3002\u96e2\u8077\u304c\u6700\u3082\u5207\u8feb\u3057\u3066\u3044\u308b\u30d1\u30bf\u30fc\u30f3\u3067\u3059\u3002',
    severity: 'critical',
    dimensions: ['perceived_alternatives', 'turnover_intention', 'org_commitment'],
    threshold: 40,
    advice: '\u7dca\u6025\u306e\u30ea\u30c6\u30f3\u30b7\u30e7\u30f3\u9762\u8ac7\u3092\u63a8\u5968\u3057\u307e\u3059\u3002\u5177\u4f53\u7684\u306a\u4e0d\u6e80\u8981\u56e0\u306e\u7279\u5b9a\u3068\u3001\u77ed\u671f\u7684\u306a\u6539\u5584\u7b56\uff08\u5831\u916c\u898b\u76f4\u3057\u3001\u5f79\u5272\u5909\u66f4\u3001\u30d7\u30ed\u30b8\u30a7\u30af\u30c8\u7570\u52d5\u7b49\uff09\u306e\u63d0\u793a\u304c\u5fc5\u8981\u3067\u3059\u3002'
  },
  {
    id: 'misfit',
    name: '\u4e0d\u9069\u5408\u578b',
    nameEn: 'Misfit',
    icon: '\uD83D\uDD00',
    description: '\u500b\u4eba\u306e\u4fa1\u5024\u89b3\u3068\u7d44\u7e54\u6587\u5316\u306e\u4e56\u96e2\u304c\u5927\u304d\u304f\u3001\u4e0a\u53f8\u3068\u306e\u95a2\u4fc2\u3084\u5f79\u5272\u8a8d\u8b58\u306b\u3082\u8ab2\u984c\u304c\u3042\u308b\u72b6\u614b\u3067\u3059\u3002\u6839\u672c\u7684\u306a\u30df\u30b9\u30de\u30c3\u30c1\u304c\u96e2\u8077\u3092\u5f15\u304d\u8d77\u3053\u3059\u30d1\u30bf\u30fc\u30f3\u3067\u3059\u3002',
    severity: 'warning',
    dimensions: ['po_fit', 'leadership', 'role_clarity'],
    threshold: 40,
    advice: '\u90e8\u7f72\u7570\u52d5\u3084\u30c1\u30fc\u30e0\u5909\u66f4\u3092\u691c\u8a0e\u3057\u3066\u304f\u3060\u3055\u3044\u3002\u73fe\u5728\u306e\u914d\u7f6e\u304c\u672c\u4eba\u306e\u5f37\u307f\u3084\u4fa1\u5024\u89b3\u3068\u5408\u81f4\u3057\u3066\u3044\u308b\u304b\u3001\u30ad\u30e3\u30ea\u30a2\u30ab\u30a6\u30f3\u30bb\u30ea\u30f3\u30b0\u3092\u901a\u3058\u305f\u518d\u8a55\u4fa1\u304c\u6709\u52b9\u3067\u3059\u3002'
  },
  {
    id: 'stagnation',
    name: '\u505c\u6ede\u578b',
    nameEn: 'Stagnation',
    icon: '\u23F8\uFE0F',
    description: '\u30ad\u30e3\u30ea\u30a2\u306e\u6210\u9577\u5b9f\u611f\u304c\u4e4f\u3057\u304f\u3001\u3084\u308a\u304c\u3044\u3084\u7d44\u7e54\u3068\u306e\u7d50\u3073\u3064\u304d\u3082\u4f4e\u4e0b\u3057\u3066\u3044\u308b\u72b6\u614b\u3067\u3059\u3002\u7de9\u3084\u304b\u3060\u304c\u78ba\u5b9f\u306b\u96e2\u8077\u306b\u5411\u304b\u3046\u30d1\u30bf\u30fc\u30f3\u3067\u3059\u3002',
    severity: 'warning',
    dimensions: ['career_dev', 'job_satisfaction', 'job_embeddedness'],
    threshold: 40,
    advice: '\u30ad\u30e3\u30ea\u30a2\u958b\u767a\u8a08\u753b\u306e\u7b56\u5b9a\u304c\u5fc5\u8981\u3067\u3059\u3002\u65b0\u898f\u30d7\u30ed\u30b8\u30a7\u30af\u30c8\u3078\u306e\u30a2\u30b5\u30a4\u30f3\u3001\u30b9\u30ad\u30eb\u30a2\u30c3\u30d7\u7814\u4fee\u3001\u30e1\u30f3\u30bf\u30fc\u5236\u5ea6\u306e\u5c0e\u5165\u306a\u3069\u3001\u6210\u9577\u6a5f\u4f1a\u306e\u63d0\u4f9b\u304c\u52b9\u679c\u7684\u3067\u3059\u3002'
  },
  {
    id: 'disengaged',
    name: '\u96e2\u8131\u578b',
    nameEn: 'Disengaged',
    icon: '\uD83D\uDCA4',
    description: '\u7d44\u7e54\u30b3\u30df\u30c3\u30c8\u30e1\u30f3\u30c8\u3001\u8077\u52d9\u57cb\u3081\u8fbc\u307f\u3001\u96e2\u8077\u610f\u56f3\u306e\u3059\u3079\u3066\u304c\u4f4e\u8ff7\u3057\u3066\u304a\u308a\u3001\u7d44\u7e54\u3068\u306e\u5fc3\u7406\u7684\u3064\u306a\u304c\u308a\u304c\u5e0c\u8584\u306a\u72b6\u614b\u3067\u3059\u3002\u9759\u304b\u306b\u96e2\u8131\u304c\u9032\u884c\u3057\u3066\u3044\u307e\u3059\u3002',
    severity: 'warning',
    dimensions: ['org_commitment', 'job_embeddedness', 'turnover_intention'],
    threshold: 40,
    advice: '\u5f93\u696d\u54e1\u3068\u306e\u5bfe\u8a71\u3092\u901a\u3058\u3066\u3001\u7d44\u7e54\u3078\u306e\u5e30\u5c5e\u610f\u8b58\u3092\u518d\u69cb\u7bc9\u3059\u308b\u5fc5\u8981\u304c\u3042\u308a\u307e\u3059\u3002\u30c1\u30fc\u30e0\u6d3b\u52d5\u3078\u306e\u53c2\u753b\u3001\u8ca2\u732e\u306e\u53ef\u8996\u5316\u3001\u7d44\u7e54\u30d3\u30b8\u30e7\u30f3\u3078\u306e\u5171\u611f\u5f62\u6210\u304c\u91cd\u8981\u3067\u3059\u3002'
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
    '1-3years': { modifier: 1.1, label: '1-3\u5e74\u76ee\u306f\u30ea\u30a2\u30ea\u30c6\u30a3\u30b7\u30e7\u30c3\u30af\u304c\u8d77\u304d\u3084\u3059\u3044\u6642\u671f\u3067\u3059' },
    '3-5years': { modifier: 0.95, label: '3-5\u5e74\u76ee\u306f\u30ad\u30e3\u30ea\u30a2\u306e\u8ee2\u63db\u70b9\u3067\u3059' },
    '5-10years': { modifier: 0.85, label: '5\u5e74\u4ee5\u4e0a\u5728\u7c4d\u3067\u5b9a\u7740\u50be\u5411\u304c\u5f37\u307e\u308a\u307e\u3059' },
    '>10years': { modifier: 0.75, label: '10\u5e74\u4ee5\u4e0a\u306f\u9ad8\u3044\u7d44\u7e54\u30b3\u30df\u30c3\u30c8\u30e1\u30f3\u30c8\u3092\u793a\u3057\u307e\u3059' }
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
      return '\u73fe\u5728\u306e\u8077\u5834\u3078\u306e\u5b9a\u7740\u5ea6\u306f\u975e\u5e38\u306b\u9ad8\u3044\u72b6\u614b\u3067\u3059\u3002\u7d44\u7e54\u3068\u306e\u9069\u5408\u6027\u304c\u9ad8\u304f\u3001\u5b89\u5b9a\u3057\u305f\u5c31\u696d\u304c\u898b\u8fbc\u307e\u308c\u307e\u3059\u3002\u73fe\u5728\u306e\u826f\u597d\u306a\u72b6\u614b\u3092\u7dad\u6301\u3059\u308b\u305f\u3081\u306b\u3001\u5f15\u304d\u7d9a\u304d\u8077\u5834\u74b0\u5883\u306e\u8cea\u3092\u4fdd\u3064\u3053\u3068\u304c\u91cd\u8981\u3067\u3059\u3002';
    }
    if (score >= 60) {
      return '\u6982\u306d\u5b89\u5b9a\u3057\u3066\u3044\u307e\u3059\u304c\u3001\u4e00\u90e8\u306e\u9818\u57df\u306b\u6539\u5584\u306e\u4f59\u5730\u304c\u3042\u308a\u307e\u3059\u3002\u7279\u306b\u30b9\u30b3\u30a2\u306e\u4f4e\u3044\u6b21\u5143\u306b\u6ce8\u76ee\u3057\u3001\u65e9\u671f\u306e\u5bfe\u5fdc\u306b\u3088\u308a\u3001\u3055\u3089\u306a\u308b\u5b9a\u7740\u304c\u671f\u5f85\u3067\u304d\u307e\u3059\u3002';
    }
    if (score >= 40) {
      return '\u8907\u6570\u306e\u9818\u57df\u3067\u30ea\u30b9\u30af\u8981\u56e0\u304c\u78ba\u8a8d\u3055\u308c\u3066\u3044\u307e\u3059\u3002\u7279\u306b\u30b9\u30b3\u30a2\u306e\u4f4e\u3044\u9818\u57df\u306b\u3064\u3044\u3066\u3001\u5177\u4f53\u7684\u306a\u6539\u5584\u7b56\u306e\u691c\u8a0e\u3092\u63a8\u5968\u3057\u307e\u3059\u3002\u7d44\u7e54\u3068\u3057\u3066\u65e9\u6025\u306b\u5bfe\u5fdc\u3092\u958b\u59cb\u3059\u308b\u3053\u3068\u304c\u671b\u307e\u3057\u3044\u72b6\u614b\u3067\u3059\u3002';
    }
    return '\u9000\u8077\u30ea\u30b9\u30af\u304c\u9ad8\u3044\u72b6\u614b\u3067\u3059\u3002\u65e9\u6025\u306b\u8981\u56e0\u5206\u6790\u3068\u5bfe\u7b56\u306e\u5b9f\u65bd\u304c\u5fc5\u8981\u3067\u3059\u3002\u7279\u306b\u4f4e\u30b9\u30b3\u30a2\u306e\u9818\u57df\u3092\u512a\u5148\u7684\u306b\u6539\u5584\u3057\u3001\u5f93\u696d\u54e1\u3068\u306e\u5bfe\u8a71\u3092\u901a\u3058\u3066\u5177\u4f53\u7684\u306a\u30a2\u30af\u30b7\u30e7\u30f3\u30d7\u30e9\u30f3\u3092\u7b56\u5b9a\u3057\u3066\u304f\u3060\u3055\u3044\u3002';
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
      comparison = '\u540c\u5e74\u4ee3\u30fb\u540c\u696d\u754c\u3068\u6bd4\u8f03\u3057\u3066\u3084\u3084\u826f\u597d\u306a\u72b6\u614b\u3067\u3059\uff08\u5f53\u8a72\u5c64\u306f\u57fa\u790e\u30ea\u30b9\u30af\u304c\u9ad8\u3044\u305f\u3081\uff09';
    } else if (modifier < 0.95) {
      comparison = '\u540c\u5e74\u4ee3\u30fb\u540c\u696d\u754c\u3068\u6bd4\u8f03\u3057\u3066\u6ce8\u610f\u304c\u5fc5\u8981\u306a\u72b6\u614b\u3067\u3059\uff08\u5f53\u8a72\u5c64\u306f\u57fa\u790e\u30ea\u30b9\u30af\u304c\u4f4e\u3044\u305f\u3081\uff09';
    } else {
      comparison = '\u540c\u5e74\u4ee3\u30fb\u540c\u696d\u754c\u3068\u6bd4\u8f03\u3057\u3066\u6a19\u6e96\u7684\u306a\u72b6\u614b\u3067\u3059';
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
      text += '\u30a8\u30d3\u30c7\u30f3\u30b9\u52a0\u91cd\u5206\u6790\u306e\u7d50\u679c\u3001\u9000\u8077\u30ea\u30b9\u30af\u306f\u975e\u5e38\u306b\u4f4e\u3044\u3068\u5224\u5b9a\u3055\u308c\u307e\u3057\u305f\u3002\u30e1\u30bf\u5206\u6790\u3067\u5b9f\u969b\u306e\u96e2\u8077\u3068\u306e\u95a2\u9023\u304c\u5f37\u3044\u3068\u3055\u308c\u308b\u6b21\u5143\uff08\u96e2\u8077\u610f\u56f3\u30fb\u7d44\u7e54\u30b3\u30df\u30c3\u30c8\u30e1\u30f3\u30c8\u7b49\uff09\u3082\u826f\u597d\u306a\u72b6\u614b\u3067\u3059\u3002';
    } else if (weightedScore >= 60) {
      text += '\u30a8\u30d3\u30c7\u30f3\u30b9\u52a0\u91cd\u5206\u6790\u306e\u7d50\u679c\u3001\u6982\u306d\u5b89\u5b9a\u3057\u3066\u3044\u307e\u3059\u304c\u3001\u7814\u7a76\u4e0a\u96e2\u8077\u3068\u306e\u95a2\u9023\u304c\u5f37\u3044\u6b21\u5143\u306b\u4e00\u90e8\u8ab2\u984c\u304c\u898b\u3089\u308c\u307e\u3059\u3002\u91cd\u70b9\u7684\u306a\u6539\u5584\u304c\u63a8\u5968\u3055\u308c\u307e\u3059\u3002';
    } else if (weightedScore >= 40) {
      text += '\u30a8\u30d3\u30c7\u30f3\u30b9\u52a0\u91cd\u5206\u6790\u306e\u7d50\u679c\u3001\u8907\u6570\u306e\u91cd\u8981\u306a\u6b21\u5143\u3067\u30ea\u30b9\u30af\u304c\u78ba\u8a8d\u3055\u308c\u307e\u3057\u305f\u3002\u7279\u306b\u96e2\u8077\u4e88\u6e2c\u529b\u306e\u9ad8\u3044\u6b21\u5143\uff08\u96e2\u8077\u610f\u56f3\u30fb\u7d44\u7e54\u30b3\u30df\u30c3\u30c8\u30e1\u30f3\u30c8\uff09\u306e\u6539\u5584\u304c\u6025\u52d9\u3067\u3059\u3002';
    } else {
      text += '\u30a8\u30d3\u30c7\u30f3\u30b9\u52a0\u91cd\u5206\u6790\u306e\u7d50\u679c\u3001\u9000\u8077\u30ea\u30b9\u30af\u304c\u6975\u3081\u3066\u9ad8\u3044\u72b6\u614b\u3067\u3059\u3002\u30e1\u30bf\u5206\u6790\u3067\u96e2\u8077\u3068\u306e\u95a2\u9023\u304c\u5f37\u3044\u3068\u3055\u308c\u308b\u6b21\u5143\u304c\u8edf\u4e26\u307f\u4f4e\u30b9\u30b3\u30a2\u3067\u3042\u308a\u3001\u7dca\u6025\u306e\u4ecb\u5165\u304c\u5fc5\u8981\u3067\u3059\u3002';
    }

    // --- Compound risk patterns ---
    if (compoundRisks && compoundRisks.length > 0) {
      text += '\n\n';
      text += '\u307e\u305f\u3001\u4ee5\u4e0b\u306e\u8907\u5408\u30ea\u30b9\u30af\u30d1\u30bf\u30fc\u30f3\u304c\u691c\u51fa\u3055\u308c\u307e\u3057\u305f\uff1a';
      for (let i = 0; i < compoundRisks.length; i++) {
        const cr = compoundRisks[i];
        text += '\n' + cr.icon + ' ' + cr.name + '\uff08' + cr.nameEn + '\uff09';
        if (cr.severity === 'critical') {
          text += ' - \u7dca\u6025\u5ea6\uff1a\u9ad8';
        } else {
          text += ' - \u7dca\u6025\u5ea6\uff1a\u4e2d';
        }
      }
      text += '\n\u8907\u5408\u30ea\u30b9\u30af\u306f\u5358\u72ec\u306e\u6b21\u5143\u3088\u308a\u3082\u6df1\u523b\u306a\u72b6\u614b\u3092\u793a\u3057\u3066\u304a\u308a\u3001\u512a\u5148\u7684\u306a\u5bfe\u5fdc\u304c\u5fc5\u8981\u3067\u3059\u3002';
    }

    // --- Trend information ---
    if (trend && trend.direction !== 'insufficient') {
      text += '\n\n';
      if (trend.direction === 'improving') {
        text += '\u524d\u56de\u306e\u8a3a\u65ad\u3068\u6bd4\u8f03\u3057\u3066\u30b9\u30b3\u30a2\u304c' + Math.abs(trend.change) + '\u30dd\u30a4\u30f3\u30c8\u6539\u5584\u3057\u3066\u3044\u307e\u3059\u3002\u826f\u3044\u50be\u5411\u3067\u3059\u306e\u3067\u3001\u73fe\u5728\u306e\u53d6\u308a\u7d44\u307f\u3092\u7d99\u7d9a\u3057\u3066\u304f\u3060\u3055\u3044\u3002';
      } else if (trend.direction === 'declining') {
        text += '\u524d\u56de\u306e\u8a3a\u65ad\u3068\u6bd4\u8f03\u3057\u3066\u30b9\u30b3\u30a2\u304c' + Math.abs(trend.change) + '\u30dd\u30a4\u30f3\u30c8\u4f4e\u4e0b\u3057\u3066\u3044\u307e\u3059\u3002\u72b6\u6cc1\u304c\u60aa\u5316\u3057\u3066\u304a\u308a\u3001\u65e9\u6025\u306a\u5bfe\u5fdc\u304c\u6c42\u3081\u3089\u308c\u307e\u3059\u3002';
      } else {
        text += '\u524d\u56de\u306e\u8a3a\u65ad\u3068\u6bd4\u8f03\u3057\u3066\u3001\u30b9\u30b3\u30a2\u306f\u307b\u307c\u6a2a\u3070\u3044\u3067\u3059\u3002\u5b89\u5b9a\u3057\u3066\u3044\u307e\u3059\u304c\u3001\u4f4e\u30b9\u30b3\u30a2\u306e\u9818\u57df\u304c\u3042\u308c\u3070\u6539\u5584\u306b\u53d6\u308a\u7d44\u307f\u307e\u3057\u3087\u3046\u3002';
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

    let text = '\u9000\u8077\u30ea\u30b9\u30af\u8a3a\u65ad\u7d50\u679c\n';
    text += '\u7dcf\u5408\u30b9\u30b3\u30a2: ' + overallScore + '/100 (' + risk.label + ')\n';
    text += '\u79d1\u5b66\u7684\u52a0\u91cd\u30b9\u30b3\u30a2: ' + weightedScore + '/100\n';

    if (compoundRisks.length > 0) {
      text += '\n\u26A0\uFE0F \u691c\u51fa\u3055\u308c\u305f\u30ea\u30b9\u30af\u30d1\u30bf\u30fc\u30f3:\n';
      for (let i = 0; i < compoundRisks.length; i++) {
        const cr = compoundRisks[i];
        text += cr.icon + ' ' + cr.name + '\uff08' + cr.nameEn + '\uff09\n';
      }
    }

    text += '\n\u3010\u6b21\u5143\u5225\u30b9\u30b3\u30a2\u3011\n';
    for (const dim of DIMENSIONS) {
      const score = dimensionScores[dim.id];
      const bar = this.getRiskLevel(score).emoji;
      text += bar + ' ' + dim.name + ': ' + score + '/100\n';
    }
    text += '\n\u5b66\u8853\u7814\u7a76\u306b\u57fa\u3065\u304f\u9000\u8077\u30ea\u30b9\u30af\u8a3a\u65ad\u30c4\u30fc\u30eb';
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
      summary = '緊急の対応が必要です。特に上位のアクションから優先的に取り組んでください。';
    } else if (urgency === 'high') {
      summary = '早期の改善が推奨されます。最も影響力の大きい次元から取り組むことで効率的な改善が見込めます。';
    } else if (urgency === 'moderate') {
      summary = 'いくつかの改善点があります。重点領域を絞って継続的に取り組みましょう。';
    } else {
      summary = '全体的に良好な状態です。さらなる向上のために、以下のポイントに注目してください。';
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
