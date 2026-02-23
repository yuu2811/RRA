/**
 * 退職リスク診断 - 質問データ
 * 10次元 × 各3問 = 全30問
 * 5段階リッカート尺度（1=全くそう思わない ～ 5=非常にそう思う）
 */

const DIMENSIONS = [
  {
    id: 'job_embeddedness',
    name: '職務埋め込み',
    nameEn: 'Job Embeddedness',
    description: '職場との結びつきの強さ（人間関係・適合性・離職コスト）',
    reference: 'Mitchell, T.R., Holtom, B.C., Lee, T.W., & Sablynski, C.J. (2001). Why People Stay: Using Job Embeddedness to Predict Voluntary Turnover. Academy of Management Journal, 44(6), 1102-1121.',
    questions: [
      { id: 1, text: '職場には信頼できる同僚や仲間がいる', reversed: false },
      { id: 2, text: '今の仕事は自分のスキルや経験に合っている', reversed: false },
      { id: 3, text: '退職した場合、失うものが大きいと感じる', reversed: false }
    ],
    adviceLow: '職場での人間関係構築やプロジェクトへの参画を通じて、組織との結びつきを強化することが重要です。メンター制度の活用やチーム横断的な活動への参加を検討してください。'
  },
  {
    id: 'org_commitment',
    name: '組織コミットメント',
    nameEn: 'Organizational Commitment',
    description: '組織への感情的愛着・継続意思・規範的義務感',
    reference: 'Allen, N.J. & Meyer, J.P. (1990). The Measurement and Antecedents of Affective, Continuance and Normative Commitment to the Organization. Journal of Occupational Psychology, 63(1), 1-18.',
    questions: [
      { id: 4, text: 'この組織に愛着を感じている', reversed: false },
      { id: 5, text: 'この組織を離れることに抵抗がない', reversed: true },
      { id: 6, text: 'この組織に恩義を感じており、貢献し続けたい', reversed: false }
    ],
    adviceLow: '組織のミッションやビジョンへの理解を深め、自分の貢献がどのように組織目標に繋がっているかを可視化しましょう。経営層との対話機会を設けることも効果的です。'
  },
  {
    id: 'turnover_intention',
    name: '離職意図',
    nameEn: 'Turnover Intention',
    description: '退職・転職を検討している度合い',
    reference: 'Bothma, C.F.C. & Roodt, G. (2013). The Validation of the Turnover Intention Scale. SA Journal of Human Resource Management, 11(1), 1-12.',
    questions: [
      { id: 7, text: '最近、退職や転職を考えることがある', reversed: true },
      { id: 8, text: '来年も今の職場で働いていると思う', reversed: false },
      { id: 9, text: '他の仕事を積極的に探している', reversed: true }
    ],
    adviceLow: '離職意図が高い状態です。現在の不満要因を具体的に整理し、上司やHR部門との面談を通じて改善可能な点を洗い出すことを推奨します。キャリアカウンセリングの活用も検討してください。'
  },
  {
    id: 'role_clarity',
    name: '役割明確性',
    nameEn: 'Role Clarity',
    description: '職務内容・責任範囲・期待値の明確さ',
    reference: 'Tubre, T.C. & Collins, J.M. (2000). Jackson and Schuler (1985) Revisited: A Meta-Analysis of the Relationships Between Role Ambiguity, Role Conflict, and Job Performance. Journal of Management, 26(1), 155-169.',
    questions: [
      { id: 10, text: '自分の職務内容や責任範囲が明確である', reversed: false },
      { id: 11, text: '何を優先すべきかわからないことがよくある', reversed: true },
      { id: 12, text: '上司から期待されていることを理解している', reversed: false }
    ],
    adviceLow: '上司との1on1ミーティングで職務範囲と優先順位を明確化しましょう。職務記述書（ジョブ・ディスクリプション）の整備や、定期的な目標設定面談の実施が有効です。'
  },
  {
    id: 'job_satisfaction',
    name: '職務満足',
    nameEn: 'Job Satisfaction',
    description: '仕事内容・職場環境・やりがいへの満足度',
    reference: 'Griffeth, R.W., Hom, P.W., & Gaertner, S. (2000). A Meta-Analysis of Antecedents and Correlates of Employee Turnover: Update, Moderator Tests, and Research Implications for the Next Millennium. Journal of Management, 26(3), 463-488.',
    questions: [
      { id: 13, text: '現在の仕事内容に満足している', reversed: false },
      { id: 14, text: '職場の環境（設備・雰囲気）は快適である', reversed: false },
      { id: 15, text: '自分の仕事にやりがいを感じている', reversed: false }
    ],
    adviceLow: '職務内容の見直し（ジョブ・クラフティング）を検討しましょう。自分の強みを活かせるタスクの割合を増やしたり、職場環境の改善要望を具体的に伝えることが重要です。'
  },
  {
    id: 'po_fit',
    name: '個人-組織適合性',
    nameEn: 'Person-Organization Fit',
    description: '個人の価値観と組織文化の一致度',
    reference: 'Kristof-Brown, A.L., Zimmerman, R.D., & Johnson, E.C. (2005). Consequences of Individuals\' Fit at Work: A Meta-Analysis of Person-Job, Person-Organization, Person-Group, and Person-Supervisor Fit. Personnel Psychology, 58(2), 281-342.',
    questions: [
      { id: 16, text: '組織の価値観や理念に共感している', reversed: false },
      { id: 17, text: 'この組織の文化は自分に合わないと感じる', reversed: true },
      { id: 18, text: '組織の方向性と自分のキャリア目標は一致している', reversed: false }
    ],
    adviceLow: '組織の理念やカルチャーと自分の価値観のギャップを具体的に分析しましょう。部署異動や新たなプロジェクトへの参加で、より適合性の高い環境を探ることも一つの方法です。'
  },
  {
    id: 'career_dev',
    name: 'キャリア開発',
    nameEn: 'Career Development',
    description: 'キャリアアップ機会・研修・成長支援の充実度',
    reference: 'Ng, T.W.H., Eby, L.T., Sorensen, K.L., & Feldman, D.C. (2005). Predictors of Objective and Subjective Career Success: A Meta-Analysis. Personnel Psychology, 58(2), 367-408.',
    questions: [
      { id: 19, text: '組織内でキャリアアップの機会がある', reversed: false },
      { id: 20, text: 'スキルアップのための研修や支援が充実している', reversed: false },
      { id: 21, text: '将来の昇進やキャリアパスが見えない', reversed: true }
    ],
    adviceLow: 'キャリア開発計画を上司と共同で策定しましょう。社内公募制度、研修プログラム、資格取得支援など、組織が提供するキャリア支援制度を積極的に活用してください。'
  },
  {
    id: 'work_life_balance',
    name: 'ワークライフバランス',
    nameEn: 'Work-Life Balance',
    description: '仕事と私生活のバランス・疲労・ストレス状態',
    reference: 'Hodkinson, A., et al. (2022). Associations of Physician Burnout with Career Engagement and Quality of Patient Care: Systematic Review and Meta-Analysis. BMJ, 378, e070442.',
    questions: [
      { id: 22, text: '仕事とプライベートのバランスが取れている', reversed: false },
      { id: 23, text: '仕事による疲労感やストレスが常にある', reversed: true },
      { id: 24, text: '休暇を十分に取得できている', reversed: false }
    ],
    adviceLow: 'バーンアウト予防が急務です。業務量の適正化、休暇取得の計画的実施、ストレスマネジメント研修の受講を検討してください。必要に応じて産業医やEAP（従業員支援プログラム）の相談も活用しましょう。'
  },
  {
    id: 'leadership',
    name: '上司・リーダーシップ',
    nameEn: 'Leadership Support',
    description: '上司からの成長支援・相談しやすさ・マネジメント品質',
    reference: 'Bycio, P., Hackett, R.D., & Allen, J.S. (1995). Further Assessments of Bass\'s (1985) Conceptualization of Transactional and Transformational Leadership. Journal of Applied Psychology, 80(4), 468-478.',
    questions: [
      { id: 25, text: '上司は自分の成長を支援してくれる', reversed: false },
      { id: 26, text: '困ったときに上司に相談しやすい', reversed: false },
      { id: 27, text: '上司の意思決定やマネジメントに不満がある', reversed: true }
    ],
    adviceLow: '上司との関係改善に取り組みましょう。定期的な1on1の実施、フィードバックの積極的な共有、期待値のすり合わせが重要です。必要に応じて、人事部門を介した調整も検討してください。'
  },
  {
    id: 'perceived_alternatives',
    name: '代替選択肢の認知',
    nameEn: 'Perceived Alternatives',
    description: '転職市場での自身の市場価値・代替機会の認知',
    reference: 'March, J.G. & Simon, H.A. (1958). Organizations. New York: Wiley. / Griffeth, R.W., Hom, P.W., & Gaertner, S. (2000). A Meta-Analysis of Antecedents and Correlates of Employee Turnover. Journal of Management, 26(3), 463-488.',
    questions: [
      { id: 28, text: '転職先はすぐに見つかると思う', reversed: true },
      { id: 29, text: '今の自分のスキルは他社でも通用する', reversed: true },
      { id: 30, text: '今の仕事より良い条件の仕事があると感じる', reversed: true }
    ],
    adviceLow: '従業員が外部に魅力的な代替機会を感じています。現職の競争力（報酬、福利厚生、成長機会）を市場水準と比較し、必要に応じて待遇改善や新たなチャレンジの機会提供を検討してください。'
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
