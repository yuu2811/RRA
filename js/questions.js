/**
 * 退職リスク診断 - 質問データ
 * 10次元 × 各3問 = 全30問
 * 5段階リッカート尺度（1=全くそう思わない ～ 5=非常にそう思う）
 */

const DIMENSIONS = [
  {
    id: 'job_embeddedness',
    name: '職場とのつながり',
    nameEn: 'Job Embeddedness',
    description: '職場の人間関係や居心地の良さ',
    reference: 'Mitchell, T.R., Holtom, B.C., Lee, T.W., & Sablynski, C.J. (2001). Why People Stay: Using Job Embeddedness to Predict Voluntary Turnover. Academy of Management Journal, 44(6), 1102-1121.',
    questions: [
      { id: 1, text: '職場には信頼できる同僚や仲間がいる', reversed: false },
      { id: 2, text: '今の仕事は自分のスキルや経験に合っている', reversed: false },
      { id: 3, text: '退職した場合、失うものが大きいと感じる', reversed: false }
    ],
    adviceLow: '職場での人間関係づくりが大切です。まずは身近な同僚との会話を増やしたり、チームの活動に積極的に関わることから始めてみましょう。頼れる仲間がいると、仕事の悩みも相談しやすくなります。'
  },
  {
    id: 'org_commitment',
    name: '会社への愛着',
    nameEn: 'Organizational Commitment',
    description: '今の会社への思い入れや、ここで働き続けたい気持ち',
    reference: 'Allen, N.J. & Meyer, J.P. (1990). The Measurement and Antecedents of Affective, Continuance and Normative Commitment to the Organization. Journal of Occupational Psychology, 63(1), 1-18.',
    questions: [
      { id: 4, text: 'この会社に愛着を感じている', reversed: false },
      { id: 5, text: 'この会社を離れることに抵抗がない', reversed: true },
      { id: 6, text: 'この会社に恩義を感じており、貢献し続けたい', reversed: false }
    ],
    adviceLow: '会社の目標や大切にしていることを改めて確認してみましょう。自分の仕事がどう役立っているかを知ると、やりがいにつながります。上司や経営者と話す機会があれば、会社の方向性について聞いてみるのも効果的です。'
  },
  {
    id: 'turnover_intention',
    name: '今の仕事を続ける気持ち',
    nameEn: 'Turnover Intention',
    description: '今の職場で働き続けたいと思っているかどうか',
    reference: 'Bothma, C.F.C. & Roodt, G. (2013). The Validation of the Turnover Intention Scale. SA Journal of Human Resource Management, 11(1), 1-12.',
    questions: [
      { id: 7, text: '最近、退職や転職を考えることがある', reversed: true },
      { id: 8, text: '来年も今の職場で働いていると思う', reversed: false },
      { id: 9, text: '他の仕事を積極的に探している', reversed: true }
    ],
    adviceLow: '今の仕事を続けたい気持ちが弱くなっている状態です。まず何が不満なのか紙に書き出してみましょう。次に、上司や人事の担当者に相談して、改善できることがないか話し合ってみてください。一人で抱え込まないことが大切です。'
  },
  {
    id: 'role_clarity',
    name: '仕事の分かりやすさ',
    nameEn: 'Role Clarity',
    description: '自分が何をすべきか、何を求められているかが分かっているか',
    reference: 'Tubre, T.C. & Collins, J.M. (2000). Jackson and Schuler (1985) Revisited: A Meta-Analysis of the Relationships Between Role Ambiguity, Role Conflict, and Job Performance. Journal of Management, 26(1), 155-169.',
    questions: [
      { id: 10, text: '自分の仕事の内容や責任の範囲がはっきりしている', reversed: false },
      { id: 11, text: '何を優先すべきかわからないことがよくある', reversed: true },
      { id: 12, text: '上司から期待されていることを理解している', reversed: false }
    ],
    adviceLow: '自分の仕事の範囲や優先順位がはっきりしていない状態です。上司と話す時間を作り、「今いちばん大事な仕事は何か」を確認しましょう。仕事の内容や目標を書き出して共有するのも効果的です。'
  },
  {
    id: 'job_satisfaction',
    name: '仕事の満足度',
    nameEn: 'Job Satisfaction',
    description: '仕事の内容・職場の環境・やりがいにどれくらい満足しているか',
    reference: 'Griffeth, R.W., Hom, P.W., & Gaertner, S. (2000). A Meta-Analysis of Antecedents and Correlates of Employee Turnover: Update, Moderator Tests, and Research Implications for the Next Millennium. Journal of Management, 26(3), 463-488.',
    questions: [
      { id: 13, text: '現在の仕事内容に満足している', reversed: false },
      { id: 14, text: '職場の環境（設備・雰囲気）は快適である', reversed: false },
      { id: 15, text: '自分の仕事にやりがいを感じている', reversed: false }
    ],
    adviceLow: '仕事への満足感が低い状態です。まず、自分が「楽しい」「得意だ」と感じる仕事を整理してみましょう。その上で、そうした仕事を増やせないか上司に相談したり、職場の困りごとを具体的に伝えてみてください。'
  },
  {
    id: 'po_fit',
    name: '会社との相性',
    nameEn: 'Person-Organization Fit',
    description: '自分の考え方と会社の方針や雰囲気が合っているか',
    reference: 'Kristof-Brown, A.L., Zimmerman, R.D., & Johnson, E.C. (2005). Consequences of Individuals\' Fit at Work: A Meta-Analysis of Person-Job, Person-Organization, Person-Group, and Person-Supervisor Fit. Personnel Psychology, 58(2), 281-342.',
    questions: [
      { id: 16, text: '会社の考え方や方針に共感している', reversed: false },
      { id: 17, text: 'この会社の雰囲気は自分に合わないと感じる', reversed: true },
      { id: 18, text: '会社の目指す方向と自分の将来の希望が合っている', reversed: false }
    ],
    adviceLow: '会社の方針と自分の考え方にずれを感じている状態です。具体的にどこが合わないのかを整理してみましょう。部署の異動や別のチームへの参加で、自分に合う環境が見つかることもあります。'
  },
  {
    id: 'career_dev',
    name: '成長の機会',
    nameEn: 'Career Development',
    description: 'スキルアップや昇進のチャンスがあるか',
    reference: 'Ng, T.W.H., Eby, L.T., Sorensen, K.L., & Feldman, D.C. (2005). Predictors of Objective and Subjective Career Success: A Meta-Analysis. Personnel Psychology, 58(2), 367-408.',
    questions: [
      { id: 19, text: '今の会社でステップアップの機会がある', reversed: false },
      { id: 20, text: '仕事の腕を磨くための研修や支援がしっかりある', reversed: false },
      { id: 21, text: '将来の昇進や自分の進む道が見えない', reversed: true }
    ],
    adviceLow: '成長やステップアップの機会が足りないと感じている状態です。上司と将来について話し合い、研修や資格取得の支援が使えないか確認してみましょう。新しい仕事や役割に挑戦するのも成長につながります。'
  },
  {
    id: 'work_life_balance',
    name: '仕事と生活のバランス',
    nameEn: 'Work-Life Balance',
    description: '仕事と私生活のバランスが取れているか、疲れやストレスはないか',
    reference: 'Hodkinson, A., et al. (2022). Associations of Physician Burnout with Career Engagement and Quality of Patient Care: Systematic Review and Meta-Analysis. BMJ, 378, e070442.',
    questions: [
      { id: 22, text: '仕事とプライベートのバランスが取れている', reversed: false },
      { id: 23, text: '仕事による疲れやストレスが常にある', reversed: true },
      { id: 24, text: '休みを十分に取れている', reversed: false }
    ],
    adviceLow: '心と体の疲れがたまっている状態です。まず仕事の量を見直し、無理な仕事は断ることも大切です。休みを計画的に取り、しっかり休養しましょう。つらい時は、会社の相談窓口や産業医に相談してください。'
  },
  {
    id: 'leadership',
    name: '上司との関係',
    nameEn: 'Leadership Support',
    description: '上司が頼りになるか、相談しやすいか',
    reference: 'Bycio, P., Hackett, R.D., & Allen, J.S. (1995). Further Assessments of Bass\'s (1985) Conceptualization of Transactional and Transformational Leadership. Journal of Applied Psychology, 80(4), 468-478.',
    questions: [
      { id: 25, text: '上司は自分の成長を応援してくれる', reversed: false },
      { id: 26, text: '困ったときに上司に相談しやすい', reversed: false },
      { id: 27, text: '上司の判断や仕事の進め方に不満がある', reversed: true }
    ],
    adviceLow: '上司との関係に課題がある状態です。まず、話し合いの機会を作り、自分が困っていることを率直に伝えてみましょう。お互いの期待を確認し合うことが大切です。改善が難しい場合は、人事の担当者に相談するのも一つの方法です。'
  },
  {
    id: 'perceived_alternatives',
    name: '他の仕事への関心',
    nameEn: 'Perceived Alternatives',
    description: '今より良い条件の仕事が他にあると感じているかどうか',
    reference: 'March, J.G. & Simon, H.A. (1958). Organizations. New York: Wiley. / Griffeth, R.W., Hom, P.W., & Gaertner, S. (2000). A Meta-Analysis of Antecedents and Correlates of Employee Turnover. Journal of Management, 26(3), 463-488.',
    questions: [
      { id: 28, text: '転職先はすぐに見つかると思う', reversed: true },
      { id: 29, text: '今の自分のスキルは他の会社でも通用する', reversed: true },
      { id: 30, text: '今の仕事より良い条件の仕事があると感じる', reversed: true }
    ],
    adviceLow: '他に良い仕事があると強く感じている状態です。今の会社の良いところ（給料、福利厚生、人間関係、学べること）を改めて見直してみましょう。もし待遇に不満があれば、上司に相談してみることも大切です。'
  }
];

// Flatten all questions for sequential access
const ALL_QUESTIONS = DIMENSIONS.flatMap((dim, dimIndex) =>
  dim.questions.map(q => ({
    ...q,
    dimensionId: dim.id,
    dimensionName: dim.name,
    dimensionIndex: dimIndex
  }))
);

const TOTAL_QUESTIONS = ALL_QUESTIONS.length;
