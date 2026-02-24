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
    adviceLow: '職場での人間関係づくりが大切です。まずは身近な同僚との会話を増やしたり、チームの活動に積極的に関わることから始めてみましょう。頼れる仲間がいると、仕事の悩みも相談しやすくなります。',
    deepDive: {
      why: '「職場とのつながり（Job Embeddedness）」は2001年にMitchellらが提唱した概念で、退職行動を最も正確に予測する因子の一つです。従来の「不満だから辞める」という単純なモデルとは異なり、「つながりが弱いから離れやすい」という視点を提供しました。',
      science: 'メタ分析の結果、職場埋め込みと実際の離職の相関は r = -.35と非常に強く、仕事満足度（r = -.19）よりも予測力が高いことが分かっています。つまり「不満」よりも「つながりの弱さ」の方が退職を予測します。',
      highExample: '高スコアの人は、職場に信頼できる仲間がおり、自分のスキルが活かされていると感じています。退職を考えても「失うものが大きい」と感じるため踏みとどまりやすい状態です。',
      lowExample: '低スコアの人は、職場での人間関係が希薄で、自分の居場所を見つけられていない可能性があります。転職のハードルが低く感じられ、きっかけがあればすぐに行動に移しやすい状態です。',
      actions: ['週に1回、普段話さない同僚とランチに行く', '社内サークルや横断プロジェクトに参加する', 'メンター制度があれば活用する', '自分のスキルが活かせる業務を上司に提案する']
    }
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
    adviceLow: '会社の目標や大切にしていることを改めて確認してみましょう。自分の仕事がどう役立っているかを知ると、やりがいにつながります。上司や経営者と話す機会があれば、会社の方向性について聞いてみるのも効果的です。',
    deepDive: {
      why: '「組織コミットメント」はAllen & Meyer（1990）による三因子モデルが有名です。感情的コミットメント（愛着）、継続的コミットメント（辞めるコスト）、規範的コミットメント（義務感）の3つの側面があります。',
      science: '感情的コミットメントが最も離職と強い負の相関（r = -.33）を示します。単に「辞めると損」と思っているだけ（継続的コミットメント）では、パフォーマンスも低くなりがちです。',
      highExample: '高スコアの人は会社に愛着を持ち、会社の成功を自分のことのように感じています。困難な時期でも踏みとどまり、チームに貢献しようとする傾向があります。',
      lowExample: '低スコアの人は「ここにいる意味」を見失っている可能性があります。心理的に会社から距離を置いており、良いオファーがあれば迷わず転職する状態かもしれません。',
      actions: ['会社のビジョンや創業ストーリーを改めて知る', '自分の仕事が会社にどう貢献しているか整理する', '経営者や幹部と直接話す機会を作る', '同僚と「この会社の良いところ」について話し合う']
    }
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
    adviceLow: '今の仕事を続けたい気持ちが弱くなっている状態です。まず何が不満なのか紙に書き出してみましょう。次に、上司や人事の担当者に相談して、改善できることがないか話し合ってみてください。一人で抱え込まないことが大切です。',
    deepDive: {
      why: '「離職意図」は実際の退職行動を最も直接的に予測する心理指標です。Bothma & Roodt（2013）による尺度が広く使われ、「考えている→探している→行動する」という段階を捉えます。',
      science: '離職意図と実際の離職の相関は r = .35〜.45と非常に強いことがメタ分析で確認されています。他のどの態度変数よりも直接的な予測因子です。ただし「考える」と「実際に辞める」の間には心理的なハードルがあり、全員が行動に移すわけではありません。',
      highExample: '高スコアの人は「来年もここにいる」と自然に思えている状態です。転職情報を見ても「自分には関係ない」と感じるレベルです。',
      lowExample: '低スコアの人は既に転職サイトに登録していたり、知人に転職の相談をしている段階かもしれません。心はすでに次の場所に向いています。',
      actions: ['「何が変われば残りたいか」をリストアップする', '信頼できる人に本音を相談する', '今の会社でのキャリアパスを上司と確認する', '転職を考えるきっかけとなった出来事を振り返る']
    }
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
    adviceLow: '自分の仕事の範囲や優先順位がはっきりしていない状態です。上司と話す時間を作り、「今いちばん大事な仕事は何か」を確認しましょう。仕事の内容や目標を書き出して共有するのも効果的です。',
    deepDive: {
      why: '「役割の明確さ」はTubre & Collins（2000）のメタ分析で、職務パフォーマンスとストレスの両方に強い影響を持つことが確認されています。何をすべきか分からない状態は、慢性的なストレスの原因になります。',
      science: '役割曖昧性とパフォーマンスの相関は r = -.31で、役割が不明確だと成果も出にくくなります。また職務満足度との相関も r = -.46と非常に強く、「何をすれば良いか分からない」ことは不満の大きな源泉です。',
      highExample: '高スコアの人は自分の責任範囲、優先順位、成功の基準を明確に理解しています。迷いなく仕事に集中でき、成果も上がりやすい状態です。',
      lowExample: '低スコアの人は「何を期待されているか分からない」「優先順位が曖昧」という状態です。毎日手探りで仕事をしている感覚があり、疲弊しやすくなります。',
      actions: ['上司と週1回の1on1で優先順位を確認する', '自分の業務内容と責任範囲を文書化する', '不明確な指示はその場で確認する習慣をつける', 'チーム内で役割分担表を作成する']
    }
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
    adviceLow: '仕事への満足感が低い状態です。まず、自分が「楽しい」「得意だ」と感じる仕事を整理してみましょう。その上で、そうした仕事を増やせないか上司に相談したり、職場の困りごとを具体的に伝えてみてください。',
    deepDive: {
      why: '「仕事満足度」は産業心理学で最も長く研究されてきた変数の一つです。Griffeth, Hom & Gaertner（2000）の大規模メタ分析では、離職との関係が体系的に整理されています。',
      science: '仕事満足度と離職の相関は r = -.19と、一般に思われているほど強くはありません。これは「不満でも辞めない人」「満足でも辞める人」が多いためです。ただし他の要因（転職先の有無、家庭環境など）と組み合わさると予測力が大幅に上がります。',
      highExample: '高スコアの人は仕事の内容、環境、やりがいの全てにおいてバランスが取れています。多少の困難があっても「この仕事が好き」という気持ちで乗り越えられる状態です。',
      lowExample: '低スコアの人は日曜の夜に憂鬱になったり、仕事に行くのが辛いと感じているかもしれません。不満が特定の要素（給与、人間関係、仕事内容）に集中している場合もあります。',
      actions: ['「不満の原因」を具体的に書き出す（漠然とした不満を分解する）', 'ジョブ・クラフティングで仕事の取り組み方を工夫する', '仕事の中で「小さな達成感」を意識的に見つける', '職場環境の改善を具体的に提案する']
    }
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
    adviceLow: '会社の方針と自分の考え方にずれを感じている状態です。具体的にどこが合わないのかを整理してみましょう。部署の異動や別のチームへの参加で、自分に合う環境が見つかることもあります。',
    deepDive: {
      why: '「個人-組織適合（P-O Fit）」はKristof-Brown（2005）の包括的メタ分析で体系化されました。個人の価値観と組織の文化・方針がどの程度合致しているかを測定します。',
      science: 'P-O Fitと離職意図の相関は r = -.35と非常に強く、組織コミットメントとの相関は r = .51です。つまり「価値観の一致」は「この会社で働き続けたい」という気持ちに最も直結する要素です。',
      highExample: '高スコアの人は会社の文化や方針に自然と共感でき、「自分らしくいられる」と感じています。会社の成功が自分の喜びにつながる状態です。',
      lowExample: '低スコアの人は「自分の価値観と会社が合わない」と感じています。例えば、成果主義の会社にいるチームワーク重視の人、革新を求める人が保守的な組織にいるケースなどです。',
      actions: ['自分の大切にしている価値観を5つ書き出す', '会社の行動指針やバリューと比較してみる', 'ミスマッチの原因が「部署」なのか「会社全体」なのか見極める', '社内で価値観の合うコミュニティを探す']
    }
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
    adviceLow: '成長やステップアップの機会が足りないと感じている状態です。上司と将来について話し合い、研修や資格取得の支援が使えないか確認してみましょう。新しい仕事や役割に挑戦するのも成長につながります。',
    deepDive: {
      why: '「キャリア発達」はNgら（2005）のメタ分析で、客観的成功（昇進・給与）と主観的成功（満足感）の両面から研究されています。特に若手〜中堅層で離職に最も影響する要素の一つです。',
      science: '成長機会の欠如は、特に20〜30代の離職理由の第1位です。Ngらの研究では、メンタリング支援を受けた人は昇進確率が約2倍、キャリア満足度も有意に高いことが分かっています。',
      highExample: '高スコアの人は「この会社にいれば成長できる」と感じています。明確なキャリアパスが見えており、研修や挑戦の機会が用意されている状態です。',
      lowExample: '低スコアの人は「ここにいても成長できない」「キャリアが停滞している」と感じています。この感覚は特に意欲の高い優秀な人材ほど強く、放置すると真っ先に辞めてしまいます。',
      actions: ['3年後・5年後の具体的なキャリア目標を書く', '上司とキャリア面談を申し込む', '社外の勉強会やコミュニティに参加する', '今の業務の中で新しいスキルを磨く機会を見つける']
    }
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
    adviceLow: '心と体の疲れがたまっている状態です。まず仕事の量を見直し、無理な仕事は断ることも大切です。休みを計画的に取り、しっかり休養しましょう。つらい時は、会社の相談窓口や産業医に相談してください。',
    deepDive: {
      why: '「ワークライフバランス」は燃え尽き症候群（バーンアウト）と密接に関連します。Hodkinsonら（2022）のBMJ掲載メタ分析では、医療従事者のバーンアウトがキャリア離脱意向と強く関連することが示されました。',
      science: 'バーンアウトと離職意図の相関は r = .40〜.52と非常に強いです。特に「情緒的消耗」（感情的に疲れ果てた状態）が最も強い予測因子です。また慢性的な長時間労働は認知機能の低下、判断力の低下をもたらし、悪循環を生みます。',
      highExample: '高スコアの人は仕事と私生活のメリハリがつけられており、十分な休息が取れています。ストレスがあっても回復する時間と方法を持っている状態です。',
      lowExample: '低スコアの人は慢性的な疲労やストレスを抱えており、休日も仕事のことが頭から離れないかもしれません。放置すると身体的・精神的な健康問題につながる危険があります。',
      actions: ['残業時間を週単位で記録し見える化する', '「休むための予定」を先にカレンダーに入れる', '上司に業務量の調整を具体的に相談する', '産業医やEAP（従業員支援プログラム）を利用する']
    }
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
    adviceLow: '上司との関係に課題がある状態です。まず、話し合いの機会を作り、自分が困っていることを率直に伝えてみましょう。お互いの期待を確認し合うことが大切です。改善が難しい場合は、人事の担当者に相談するのも一つの方法です。',
    deepDive: {
      why: '「リーダーシップ」はBycio, Hackett & Allen（1995）の研究に基づき、変革型リーダーシップ（部下を鼓舞し成長させる）と交流型リーダーシップ（報酬と管理）の両面から測定されます。',
      science: '上司の変革型リーダーシップと部下の離職意図の相関は r = -.32です。特にインスピレーション（ビジョンの共有）と個別配慮（部下一人一人への関心）が最も影響力があります。「人は会社を辞めるのではなく、上司を辞める」という有名な言葉を裏付けるデータです。',
      highExample: '高スコアの人は上司を信頼でき、困った時に相談できる関係が築けています。上司が自分の成長を支援してくれていると感じられる状態です。',
      lowExample: '低スコアの人は上司との関係にストレスを感じています。コミュニケーション不足、不公平な評価、パワハラなど、原因は様々ですが、放置すると急速に離職意図が高まります。',
      actions: ['上司との定期的な1on1を提案する', '期待されていることを具体的に確認する', '上司以外にも相談できるメンターを見つける', '改善が難しい場合は人事部門に相談する']
    }
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
    adviceLow: '他に良い仕事があると強く感じている状態です。今の会社の良いところ（給料、福利厚生、人間関係、学べること）を改めて見直してみましょう。もし待遇に不満があれば、上司に相談してみることも大切です。',
    deepDive: {
      why: '「知覚された代替選択肢」はMarch & Simon（1958）の組織均衡理論にさかのぼる古典的概念です。「辞めたい気持ち」と「辞められる状況」が揃った時に実際の離職が起きるという理論です。',
      science: 'Griffethらのメタ分析では、代替選択肢の知覚と離職の相関は r = .12と、単独では弱い予測因子です。しかし他の不満要因と組み合わさると爆発的に作用します。つまり「不満 × 選択肢」の掛け算で離職確率が決まります。',
      highExample: '高スコアの人は「他にも行ける」と思いつつも、現在の職場に魅力を感じて留まっています。市場価値が高いことは自信にもつながっています。',
      lowExample: '低スコアの人は転職市場での自分の価値を高く評価しており、今の会社より良い条件の仕事があると確信しています。不満が少しでもあると即座に行動に移す可能性があります。',
      actions: ['今の会社の「見えにくいメリット」を書き出す（福利厚生、人間関係、通勤）', '転職で「失うもの」も冷静にリストアップする', '待遇面の不満は具体的な数字で上司に相談する', '市場価値を高めるスキルを今の会社で磨く']
    }
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
