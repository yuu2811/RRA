/**
 * 退職リスク診断 - Main Application Logic
 * Screen transitions, state management, event handling
 * Enhanced for iPhone 16 Pro 120Hz ProMotion display
 * Phase 1: Meta-analytic scoring, compound risks, demographics, history
 */

(function () {
  'use strict';

  // ---------- Demographic Value Mapping ----------
  // Maps HTML select values (English) to scoring.js DEMOGRAPHIC_BASELINES keys (Japanese)
  var DEMO_AGE_MAP = {
    '20s': '20代',
    '30s': '30代',
    '40s': '40代',
    '50s': '50代以上'
  };

  var DEMO_TENURE_MAP = {
    '<1year': '1年未満',
    '1-3years': '1-3年',
    '3-5years': '3-5年',
    '5-10years': '5-10年',
    '>10years': '10年以上'
  };

  var DEMO_INDUSTRY_MAP = {
    'it': 'IT・通信',
    'finance': '金融・保険',
    'manufacturing': '製造業',
    'healthcare': '医療・介護',
    'service': 'サービス・飲食',
    'public': '公務員',
    'other': 'その他'
  };

  // ---------- State ----------
  var state = {
    currentQuestion: 0,
    answers: {},       // { questionId: value }
    direction: 'next', // 'next' or 'prev' for animation direction
    lastResults: null,
    isSwiping: false,
    swipeStartX: 0,
    swipeCurrentX: 0,
    lastDimensionIndex: -1,  // Track dimension changes for milestone feedback
    demographic: {           // User demographic context (optional)
      ageGroup: null,
      tenure: null,
      industry: null
    }
  };

  // ---------- DOM Elements ----------
  var screens = {
    start: document.getElementById('screen-start'),
    demographic: document.getElementById('screen-demographic'),
    question: document.getElementById('screen-question'),
    result: document.getElementById('screen-result')
  };

  var els = {
    btnStart: document.getElementById('btn-start'),
    btnStartDiagnosis: document.getElementById('btn-start-diagnosis'),
    btnSkipDemographic: document.getElementById('btn-skip-demographic'),
    btnBack: document.getElementById('btn-back'),
    btnShare: document.getElementById('btn-share'),
    btnRetry: document.getElementById('btn-retry'),
    demoAge: document.getElementById('demo-age'),
    demoTenure: document.getElementById('demo-tenure'),
    demoIndustry: document.getElementById('demo-industry'),
    historySummary: document.getElementById('history-summary'),
    progressCategory: document.getElementById('progress-category'),
    progressCount: document.getElementById('progress-count'),
    progressBar: document.getElementById('progress-bar'),
    questionCard: document.getElementById('question-card'),
    questionNumber: document.getElementById('question-number'),
    questionText: document.getElementById('question-text'),
    likertScale: document.getElementById('likert-scale'),
    gaugeSvg: document.getElementById('gauge-svg'),
    gaugeScore: document.getElementById('gauge-score'),
    riskLevel: document.getElementById('risk-level'),
    riskDescription: document.getElementById('risk-description'),
    weightedComparison: document.getElementById('weighted-comparison'),
    radarSvg: document.getElementById('radar-svg'),
    dimensionDetails: document.getElementById('dimension-details'),
    adviceCard: document.getElementById('advice-card'),
    adviceContent: document.getElementById('advice-content'),
    compoundCard: document.getElementById('compound-card'),
    compoundRisks: document.getElementById('compound-risks'),
    trendCard: document.getElementById('trend-card'),
    trendSvg: document.getElementById('trend-svg'),
    trendSummary: document.getElementById('trend-summary'),
    referencesContent: document.getElementById('references-content'),
    dimensionLabel: document.getElementById('dimension-label'),
    stepDots: [
      document.getElementById('step-dot-0'),
      document.getElementById('step-dot-1'),
      document.getElementById('step-dot-2')
    ],
    btnHome: document.getElementById('btn-home')
  };

  // ---------- 120Hz Spring Animation Utility ----------
  function springInterpolate(t, tension, friction) {
    tension = tension || 300;
    friction = friction || 20;
    var omega = Math.sqrt(tension);
    var zeta = friction / (2 * omega);
    if (zeta < 1) {
      var omegaD = omega * Math.sqrt(1 - zeta * zeta);
      return 1 - Math.exp(-zeta * omega * t) *
        (Math.cos(omegaD * t) + (zeta * omega / omegaD) * Math.sin(omegaD * t));
    }
    return 1 - (1 + omega * t) * Math.exp(-omega * t);
  }

  function animateSpring(callback, duration, tension, friction) {
    duration = duration || 600;
    tension = tension || 300;
    friction = friction || 20;
    var start = performance.now();
    function tick(now) {
      var elapsed = now - start;
      var t = Math.min(elapsed / duration, 1);
      var value = springInterpolate(t, tension, friction);
      callback(value, t);
      if (t < 1) {
        requestAnimationFrame(tick);
      }
    }
    requestAnimationFrame(tick);
  }

  // ---------- Haptic Feedback Patterns ----------
  var Haptics = {
    answerSelect: function () {
      if (navigator.vibrate) navigator.vibrate(8);
    },
    navigate: function () {
      if (navigator.vibrate) navigator.vibrate(12);
    },
    milestone: function () {
      if (navigator.vibrate) navigator.vibrate([15, 50, 15]);
    },
    progress: function () {
      if (navigator.vibrate) navigator.vibrate([10, 40, 10, 40, 10]);
    },
    complete: function () {
      if (navigator.vibrate) navigator.vibrate([20, 60, 15, 60, 25]);
    },
    swipeThreshold: function () {
      if (navigator.vibrate) navigator.vibrate(6);
    }
  };

  // ---------- Smooth Scroll-to-Top ----------
  function smoothScrollToTop(duration) {
    duration = duration || 400;
    var startY = window.scrollY;
    if (startY === 0) return;
    var startTime = performance.now();
    function step(now) {
      var elapsed = now - startTime;
      var t = Math.min(elapsed / duration, 1);
      var eased = 1 - Math.pow(1 - t, 5);
      window.scrollTo(0, startY * (1 - eased));
      if (t < 1) {
        requestAnimationFrame(step);
      }
    }
    requestAnimationFrame(step);
  }

  // ---------- Screen Management ----------
  function showScreen(name) {
    Object.values(screens).forEach(function (s) {
      if (s) s.classList.remove('active');
    });
    if (screens[name]) {
      screens[name].classList.add('active');
    }
    smoothScrollToTop(300);
  }

  // ---------- History Summary on Start Screen ----------
  function updateHistorySummary() {
    if (!els.historySummary) return;

    var history = DiagnosticHistory.getAll();
    if (history.length === 0) {
      els.historySummary.style.display = 'none';
      return;
    }

    var latest = history[0];
    var score = latest.weighted || latest.overall;
    var risk = Scoring.getRiskLevel(score);
    var d = new Date(latest.date);
    var dateStr = d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';

    var trend = DiagnosticHistory.getTrend();
    var trendHTML = '';
    if (trend) {
      var arrow, cls, label;
      if (trend.direction === 'improving') {
        arrow = '↑';
        cls = 'improving';
        label = '+' + Math.abs(trend.change) + 'pt';
      } else if (trend.direction === 'declining') {
        arrow = '↓';
        cls = 'declining';
        label = '-' + Math.abs(trend.change) + 'pt';
      } else {
        arrow = '→';
        cls = 'stable';
        label = '安定';
      }
      trendHTML = '<span class="history-trend-badge ' + cls + '">' + arrow + ' ' + label + '</span>';
    }

    els.historySummary.innerHTML =
      '<div class="history-summary-card">' +
        '<div class="history-summary-left">' +
          '<span class="history-summary-header">前回の診断</span>' +
          '<span class="history-summary-score" style="color:' + risk.color + '">' + score + '<small style="font-size:14px;color:var(--text-muted)"> /100</small></span>' +
          '<span class="history-summary-date">' + dateStr + '</span>' +
        '</div>' +
        '<div class="history-summary-right">' +
          trendHTML +
          '<span class="history-summary-count" style="font-size:11px;color:var(--text-muted)">診断回数: ' + history.length + '回</span>' +
        '</div>' +
      '</div>';
    els.historySummary.style.display = '';
  }

  // ---------- Progress Milestone Detection ----------
  function checkMilestone(index) {
    var q = ALL_QUESTIONS[index];
    if (!q) return;

    if (q.dimensionIndex !== state.lastDimensionIndex && state.lastDimensionIndex >= 0) {
      Haptics.milestone();
      showDimensionCompleteFlash();
    }

    if (index > 0 && index % 10 === 0) {
      Haptics.progress();
      showProgressMilestone(index);
    }

    state.lastDimensionIndex = q.dimensionIndex;
  }

  function showDimensionCompleteFlash() {
    var bar = els.progressBar;
    bar.style.transition = 'none';
    bar.style.boxShadow = '0 0 16px 4px rgba(99, 102, 241, 0.6)';
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        bar.style.transition = 'box-shadow 0.8s ease-out';
        bar.style.boxShadow = 'none';
      });
    });
  }

  function showProgressMilestone(index) {
    var el = els.progressCount;
    el.style.transition = 'none';
    el.style.transform = 'scale(1.25)';
    el.style.color = 'var(--accent-secondary)';
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        el.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), color 0.8s ease-out';
        el.style.transform = 'scale(1)';
        el.style.color = '';
      });
    });
  }

  // ---------- Question Display with Spring Transition ----------
  function showQuestion(index) {
    var q = ALL_QUESTIONS[index];
    if (!q) return;

    checkMilestone(index);

    els.progressCategory.textContent = q.dimensionName;
    els.progressCount.textContent = (index + 1) + ' / ' + TOTAL_QUESTIONS;

    if (els.dimensionLabel) {
      els.dimensionLabel.textContent = '次元 ' + (q.dimensionIndex + 1) + '/10';
    }

    var questionWithinDimension = index % 3;
    els.stepDots.forEach(function (dot, i) {
      if (!dot) return;
      dot.classList.remove('active', 'completed');
      if (i === questionWithinDimension) {
        dot.classList.add('active');
      } else if (i < questionWithinDimension) {
        dot.classList.add('completed');
      }
    });

    requestAnimationFrame(function () {
      els.progressBar.style.width = ((index + 1) / TOTAL_QUESTIONS * 100) + '%';
    });

    var card = els.questionCard;
    var isNext = state.direction === 'next';
    var startX = isNext ? 60 : -60;

    card.classList.remove('slide-in-right', 'slide-in-left');
    card.style.transition = 'none';
    card.style.transform = 'translateX(' + startX + 'px)';
    card.style.opacity = '0';

    els.questionNumber.textContent = 'Q' + (index + 1);
    els.questionText.textContent = q.text;

    var buttons = els.likertScale.querySelectorAll('.likert-btn');
    var currentAnswer = state.answers[q.id];
    buttons.forEach(function (btn) {
      var val = parseInt(btn.dataset.value);
      btn.classList.toggle('selected', val === currentAnswer);
    });

    els.btnBack.classList.toggle('hidden', index === 0);

    void card.offsetWidth;

    animateSpring(function (value, t) {
      var x = startX * (1 - value);
      var opacity = Math.min(t * 3, 1);
      card.style.transform = 'translateX(' + x + 'px)';
      card.style.opacity = String(opacity);
    }, 550, 180, 18);
  }

  // ---------- Answer Handling ----------
  function handleAnswer(value) {
    var q = ALL_QUESTIONS[state.currentQuestion];
    state.answers[q.id] = value;

    Haptics.answerSelect();

    var buttons = els.likertScale.querySelectorAll('.likert-btn');
    buttons.forEach(function (btn) {
      var val = parseInt(btn.dataset.value);
      var isSelected = val === value;
      btn.classList.toggle('selected', isSelected);

      if (isSelected) {
        btn.style.transition = 'none';
        btn.style.transform = 'scale(0.92)';
        void btn.offsetWidth;
        btn.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
        btn.style.transform = 'scale(1)';
      }
    });

    setTimeout(function () {
      if (state.currentQuestion < TOTAL_QUESTIONS - 1) {
        state.direction = 'next';
        state.currentQuestion++;
        Haptics.navigate();
        showQuestion(state.currentQuestion);
      } else {
        showCalculatingTransition();
      }
    }, 300);
  }

  // ---------- "Calculating..." Transition ----------
  function showCalculatingTransition() {
    Haptics.complete();

    var card = els.questionCard;
    card.style.transition = 'opacity 0.3s ease-out, transform 0.4s ease-out';
    card.style.opacity = '0';
    card.style.transform = 'scale(0.96)';

    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:1000;background:var(--bg-primary);opacity:0;transition:opacity 0.4s ease-out;';
    overlay.innerHTML =
      '<div style="text-align:center;">' +
        '<div class="calculating-spinner" style="width:48px;height:48px;border:3px solid rgba(99,102,241,0.15);border-top-color:var(--accent-secondary);border-radius:50%;animation:calcSpin 0.8s linear infinite;margin:0 auto 20px;"></div>' +
        '<div style="font-size:16px;font-weight:700;color:var(--text-primary);opacity:0;animation:calcFadeIn 0.4s ease-out 0.2s forwards;">診断結果を分析中...</div>' +
        '<div style="font-size:13px;color:var(--text-muted);margin-top:8px;opacity:0;animation:calcFadeIn 0.4s ease-out 0.4s forwards;">エビデンス加重スコアを計算しています</div>' +
      '</div>';

    if (!document.getElementById('calc-keyframes')) {
      var style = document.createElement('style');
      style.id = 'calc-keyframes';
      style.textContent = '@keyframes calcSpin{to{transform:rotate(360deg)}}@keyframes calcFadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}';
      document.head.appendChild(style);
    }

    document.body.appendChild(overlay);

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        overlay.style.opacity = '1';
      });
    });

    setTimeout(function () {
      overlay.style.transition = 'opacity 0.3s ease-out';
      overlay.style.opacity = '0';
      setTimeout(function () {
        overlay.remove();
        showResults();
      }, 300);
    }, 1200);
  }

  // ---------- Collect Demographic Data ----------
  function collectDemographic() {
    var ageVal = els.demoAge ? els.demoAge.value : '';
    var tenureVal = els.demoTenure ? els.demoTenure.value : '';
    var industryVal = els.demoIndustry ? els.demoIndustry.value : '';

    state.demographic = {
      ageGroup: ageVal ? (DEMO_AGE_MAP[ageVal] || null) : null,
      tenure: tenureVal ? (DEMO_TENURE_MAP[tenureVal] || null) : null,
      industry: industryVal ? (DEMO_INDUSTRY_MAP[industryVal] || null) : null
    };
  }

  // ---------- Results ----------
  function showResults() {
    var dimensionScores = Scoring.calculateAllScores(state.answers);
    var overallScore = Scoring.calculateOverallScore(dimensionScores);
    var weightedScore = Scoring.calculateWeightedScore(dimensionScores);
    var risk = Scoring.getRiskLevel(weightedScore);
    var advice = Scoring.getAdvice(dimensionScores);
    var compoundRisks = Scoring.detectCompoundRisks(dimensionScores);

    // Apply demographic context
    var demographicContext = Scoring.applyDemographicContext(weightedScore, state.demographic);

    showScreen('result');

    // Overall gauge - use weighted score as primary
    Charts.drawGauge(els.gaugeSvg, weightedScore, risk.color);
    Charts.animateScore(els.gaugeScore, weightedScore);

    // Risk level label
    els.riskLevel.textContent = risk.emoji + ' ' + risk.label;
    els.riskLevel.className = 'risk-level ' + risk.level;

    // Interpretation
    els.riskDescription.textContent = Scoring.getOverallInterpretation(weightedScore);

    // Weighted vs simple score comparison
    if (els.weightedComparison) {
      var simpleRisk = Scoring.getRiskLevel(overallScore);
      var diff = weightedScore - overallScore;
      var diffHTML = '';
      if (Math.abs(diff) > 3) {
        var diffColor = diff > 0 ? '#22c55e' : '#ef4444';
        var diffArrow = diff > 0 ? '↑' : '↓';
        diffHTML = '<div class="weighted-score-diff" style="color:' + diffColor + '">' + diffArrow + ' ' + Math.abs(diff) + 'pt</div>';
      }

      els.weightedComparison.innerHTML =
        '<div class="weighted-score-item">' +
          '<span class="weighted-score-label">単純平均</span>' +
          '<span class="weighted-score-value" style="color:' + simpleRisk.color + '">' + overallScore + '</span>' +
        '</div>' +
        diffHTML +
        '<div class="weighted-score-item">' +
          '<span class="weighted-score-label">エビデンス加重</span>' +
          '<span class="weighted-score-value primary" style="color:' + risk.color + '">' + weightedScore + '</span>' +
        '</div>';
    }

    // Radar chart
    Charts.drawRadar(els.radarSvg, dimensionScores);

    // Dimension bars
    Charts.renderDimensionBars(els.dimensionDetails, dimensionScores);

    // Advice
    Charts.renderAdvice(els.adviceContent, advice);
    if (els.adviceCard) {
      els.adviceCard.style.display = advice.length === 0 ? 'none' : '';
    }

    // Compound risk patterns
    if (els.compoundRisks) {
      Charts.renderCompoundRisks(els.compoundRisks, compoundRisks);
    }

    // Trend chart (history)
    var history = DiagnosticHistory.getAll();
    if (els.trendSvg) {
      // Need to include the current result in the chart
      var chartHistory = history.slice(); // copy
      // Add current result to the beginning (newest first) before saving
      var currentEntry = {
        date: new Date().toISOString(),
        overall: overallScore,
        weighted: weightedScore
      };
      chartHistory.unshift(currentEntry);
      Charts.drawTrendChart(els.trendSvg, chartHistory);
    }

    // Trend summary text
    if (els.trendSummary && history.length > 0) {
      var prevScore = history[0].weighted || history[0].overall;
      var change = weightedScore - prevScore;
      var trendClass, trendText;
      if (change > 3) {
        trendClass = 'improving';
        trendText = '<span class="trend-arrow improving">↑</span> <span class="trend-change" style="color:var(--green)">+' + Math.abs(change) + 'pt 前回より改善</span>';
      } else if (change < -3) {
        trendClass = 'declining';
        trendText = '<span class="trend-arrow declining">↓</span> <span class="trend-change" style="color:var(--red)">-' + Math.abs(change) + 'pt 前回より悪化</span>';
      } else {
        trendClass = 'stable';
        trendText = '<span class="trend-arrow stable">→</span> <span class="trend-change">前回と同水準</span>';
      }
      els.trendSummary.innerHTML = trendText;
    }

    // References
    Charts.renderReferences(els.referencesContent);

    // Save result to history
    DiagnosticHistory.save({
      overall: overallScore,
      weighted: weightedScore,
      dimensions: dimensionScores,
      demographic: state.demographic,
      compoundRisks: compoundRisks.map(function (r) { return { id: r.id, name: r.name, severity: r.severity }; })
    });

    // Store results for sharing
    state.lastResults = { overallScore: overallScore, weightedScore: weightedScore, dimensionScores: dimensionScores };
  }

  // ---------- Share ----------
  function shareResults() {
    if (!state.lastResults) return;

    var shareText = Scoring.generateShareText(state.lastResults.overallScore, state.lastResults.dimensionScores);

    if (navigator.share) {
      navigator.share({
        title: '退職リスク診断結果',
        text: shareText
      }).catch(function (err) {
        if (err.name !== 'AbortError') {
          copyToClipboard(shareText);
        }
      });
    } else {
      copyToClipboard(shareText);
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(function () {
      var btn = els.btnShare;
      var originalText = btn.innerHTML;
      btn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> コピーしました';
      setTimeout(function () {
        btn.innerHTML = originalText;
      }, 2000);
    }).catch(function () {
      // Clipboard API not available
    });
  }

  // ---------- Reset ----------
  function resetApp() {
    state.currentQuestion = 0;
    state.answers = {};
    state.direction = 'next';
    state.lastResults = null;
    state.lastDimensionIndex = -1;

    var card = els.questionCard;
    card.style.transition = '';
    card.style.transform = '';
    card.style.opacity = '';

    // Reset demographic selects
    if (els.demoAge) els.demoAge.value = '';
    if (els.demoTenure) els.demoTenure.value = '';
    if (els.demoIndustry) els.demoIndustry.value = '';
    state.demographic = { ageGroup: null, tenure: null, industry: null };

    // Update history summary on start screen
    updateHistorySummary();

    showScreen('start');
  }

  // ---------- Event Listeners ----------

  // Start button → go to demographic screen
  els.btnStart.addEventListener('click', function () {
    showScreen('demographic');
  });

  // Demographic screen → start diagnosis
  if (els.btnStartDiagnosis) {
    els.btnStartDiagnosis.addEventListener('click', function () {
      collectDemographic();
      showScreen('question');
      showQuestion(0);
    });
  }

  // Skip demographic → start diagnosis directly
  if (els.btnSkipDemographic) {
    els.btnSkipDemographic.addEventListener('click', function () {
      state.demographic = { ageGroup: null, tenure: null, industry: null };
      showScreen('question');
      showQuestion(0);
    });
  }

  // Likert button clicks
  els.likertScale.addEventListener('click', function (e) {
    var btn = e.target.closest('.likert-btn');
    if (!btn) return;
    var value = parseInt(btn.dataset.value);
    if (!isNaN(value)) {
      handleAnswer(value);
    }
  });

  // Back button
  els.btnBack.addEventListener('click', function () {
    if (state.currentQuestion > 0) {
      state.direction = 'prev';
      state.currentQuestion--;
      Haptics.navigate();
      showQuestion(state.currentQuestion);
    }
  });

  // Share button
  els.btnShare.addEventListener('click', shareResults);

  // Retry button
  els.btnRetry.addEventListener('click', resetApp);

  // Home button
  if (els.btnHome) {
    els.btnHome.addEventListener('click', resetApp);
  }

  // Keyboard support for likert (accessibility)
  document.addEventListener('keydown', function (e) {
    if (!screens.question.classList.contains('active')) return;
    var key = parseInt(e.key);
    if (key >= 1 && key <= 5) {
      handleAnswer(key);
    }
    if (e.key === 'ArrowLeft' || e.key === 'Backspace') {
      if (state.currentQuestion > 0) {
        state.direction = 'prev';
        state.currentQuestion--;
        Haptics.navigate();
        showQuestion(state.currentQuestion);
      }
    }
  });

  // ---------- Enhanced Swipe with Visual Feedback ----------
  var touchStartX = 0;
  var touchStartY = 0;
  var touchLocked = false;
  var touchIsHorizontal = false;
  var swipeHapticFired = false;

  document.addEventListener('touchstart', function (e) {
    if (!screens.question.classList.contains('active')) return;

    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchLocked = false;
    touchIsHorizontal = false;
    swipeHapticFired = false;
    state.isSwiping = false;
    state.swipeStartX = touchStartX;
    state.swipeCurrentX = touchStartX;

    els.questionCard.style.transition = 'none';
  }, { passive: true });

  document.addEventListener('touchmove', function (e) {
    if (!screens.question.classList.contains('active')) return;

    var currentX = e.touches[0].clientX;
    var currentY = e.touches[0].clientY;
    var dx = currentX - touchStartX;
    var dy = currentY - touchStartY;

    if (!touchLocked && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
      touchLocked = true;
      touchIsHorizontal = Math.abs(dx) > Math.abs(dy);
    }

    if (!touchLocked || !touchIsHorizontal) return;

    state.isSwiping = true;
    state.swipeCurrentX = currentX;

    var swipeDx = currentX - touchStartX;

    if (swipeDx > 0 && state.currentQuestion > 0) {
      var progress = Math.min(swipeDx / 200, 1);
      var translateX = swipeDx * 0.6;
      var scale = 1 - progress * 0.03;
      var opacity = 1 - progress * 0.3;

      els.questionCard.style.transform = 'translateX(' + translateX + 'px) scale(' + scale + ')';
      els.questionCard.style.opacity = String(opacity);

      if (swipeDx > 80 && !swipeHapticFired) {
        swipeHapticFired = true;
        Haptics.swipeThreshold();
      }
    } else if (swipeDx < 0) {
      var resistance = 0.15;
      var rubberX = swipeDx * resistance;
      els.questionCard.style.transform = 'translateX(' + rubberX + 'px)';
    } else if (swipeDx > 0 && state.currentQuestion === 0) {
      var resistance2 = 0.15;
      var rubberX2 = swipeDx * resistance2;
      els.questionCard.style.transform = 'translateX(' + rubberX2 + 'px)';
    }
  }, { passive: true });

  document.addEventListener('touchend', function (e) {
    if (!screens.question.classList.contains('active')) return;
    if (!state.isSwiping) return;

    var dx = e.changedTouches[0].clientX - touchStartX;
    var card = els.questionCard;

    if (dx > 80 && touchIsHorizontal && state.currentQuestion > 0) {
      card.style.transition = 'transform 0.3s cubic-bezier(0.2, 0, 0, 1), opacity 0.2s ease-out';
      card.style.transform = 'translateX(120%)';
      card.style.opacity = '0';

      setTimeout(function () {
        state.direction = 'prev';
        state.currentQuestion--;
        Haptics.navigate();
        showQuestion(state.currentQuestion);
      }, 200);
    } else {
      animateSpring(function (value) {
        var currentTransform = card.style.transform;
        var match = currentTransform.match(/translateX\(([^)]+)px\)/);
        var currentX = match ? parseFloat(match[1]) : 0;
        var x = currentX * (1 - value);
        card.style.transform = 'translateX(' + x + 'px)';
        card.style.opacity = String(Math.min(0.7 + value * 0.3, 1));
      }, 400, 250, 22);
    }

    state.isSwiping = false;
  }, { passive: true });

  // ---------- Initialize ----------
  updateHistorySummary();

  // ---------- Service Worker Registration ----------
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {
        // Service Worker registration failed silently
      });
    });
  }
})();
