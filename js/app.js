/**
 * 退職リスク診断 - Main Application Logic
 * Screen transitions, state management, event handling
 * Universal smartphone support: iOS & Android, all screen sizes
 * Phase 1: Meta-analytic scoring, compound risks, demographics, history
 */

(function () {
  'use strict';

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
      age: null,
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
    strengthsCard: document.getElementById('strengths-card'),
    strengthsContent: document.getElementById('strengths-content'),
    actionPlanCard: document.getElementById('action-plan-card'),
    actionPlanContent: document.getElementById('action-plan-content'),
    correlationCard: document.getElementById('correlation-card'),
    correlationContent: document.getElementById('correlation-content'),
    demographicContext: document.getElementById('demographic-context'),
    whatifSliders: document.getElementById('whatif-sliders'),
    btnShareImage: document.getElementById('btn-share-image'),
    referencesContent: document.getElementById('references-content'),
    dimensionLabel: document.getElementById('dimension-label'),
    stepDots: [
      document.getElementById('step-dot-0'),
      document.getElementById('step-dot-1'),
      document.getElementById('step-dot-2')
    ],
    btnHome: document.getElementById('btn-home'),
    progressPct: document.getElementById('progress-pct')
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

    var latest = history[history.length - 1];
    var score = latest.weighted || latest.overall;
    var risk = Scoring.getRiskLevel(score);
    var d = new Date(latest.date);
    var dateStr = d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';

    var trend = DiagnosticHistory.getTrend();
    var trendHTML = '';
    if (trend && trend.direction !== 'insufficient') {
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
    bar.style.boxShadow = '0 0 20px 6px rgba(99, 102, 241, 0.7)';
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        bar.style.transition = 'box-shadow 1s ease-out';
        bar.style.boxShadow = 'none';
      });
    });

    // Show dimension complete celebration
    var completed = Math.floor(state.currentQuestion / 3);
    var messages = [
      '', // dimension 0→1 transition
      '順調です！',
      'いいペースです！',
      '3分の1完了！',
      'もう少しで半分！',
      '半分クリア！あと半分です',
      '後半に入りました！',
      'あと少しです！',
      'ラストスパート！',
      'もう一息！'
    ];
    var msg = messages[completed] || '';
    if (msg) showMotivationToast(msg, 'milestone');
  }

  function showProgressMilestone(index) {
    var el = els.progressCount;
    el.style.transition = 'none';
    el.style.transform = 'scale(1.3)';
    el.style.color = 'var(--accent-tertiary)';
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        el.style.transition = 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), color 1s ease-out';
        el.style.transform = 'scale(1)';
        el.style.color = '';
      });
    });
  }

  // ---------- Motivation Toast ----------
  function showMotivationToast(message, type) {
    var existing = document.querySelector('.motivation-toast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.className = 'motivation-toast';
    var bgColor = type === 'milestone'
      ? 'linear-gradient(135deg, rgba(99,102,241,0.95), rgba(129,140,248,0.95))'
      : 'rgba(34,197,94,0.9)';
    toast.style.cssText = 'position:fixed;top:' + (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-top')) || 16) + 'px;left:50%;transform:translateX(-50%) translateY(-20px);background:' + bgColor + ';color:#fff;padding:10px 24px;border-radius:999px;font-size:14px;font-weight:700;z-index:2000;opacity:0;transition:all 0.4s cubic-bezier(0.34,1.56,0.64,1);pointer-events:none;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:0 8px 32px rgba(99,102,241,0.3);letter-spacing:0.03em;white-space:nowrap;';
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
      });
    });

    setTimeout(function () {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(-10px)';
      setTimeout(function () { toast.remove(); }, 400);
    }, 1500);
  }

  // ---------- Question Display with Spring Transition ----------
  function showQuestion(index) {
    var q = ALL_QUESTIONS[index];
    if (!q) return;

    checkMilestone(index);

    els.progressCategory.textContent = q.dimensionName;
    els.progressCount.textContent = (index + 1) + ' / ' + TOTAL_QUESTIONS;

    if (els.dimensionLabel) {
      els.dimensionLabel.textContent = '項目 ' + (q.dimensionIndex + 1) + '/10';
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

    var pct = Math.round((index + 1) / TOTAL_QUESTIONS * 100);
    requestAnimationFrame(function () {
      els.progressBar.style.width = pct + '%';
    });
    if (els.progressPct) {
      els.progressPct.textContent = pct + '%';
    }

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
        // Spring scale animation
        btn.style.transition = 'none';
        btn.style.transform = 'scale(0.90)';
        void btn.offsetWidth;
        btn.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
        btn.style.transform = 'scale(1)';

        // Ripple effect
        createRipple(btn);
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
    }, 280);
  }

  // ---------- Ripple Effect ----------
  function createRipple(btn) {
    var ripple = document.createElement('span');
    ripple.className = 'ripple';
    var size = Math.max(btn.offsetWidth, btn.offsetHeight);
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = '50%';
    ripple.style.top = '50%';
    ripple.style.marginLeft = -(size / 2) + 'px';
    ripple.style.marginTop = -(size / 2) + 'px';
    btn.appendChild(ripple);
    setTimeout(function () { ripple.remove(); }, 600);
  }

  // ---------- "Calculating..." Transition ----------
  function showCalculatingTransition() {
    Haptics.complete();

    // Skip animation for reduced motion preference
    var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      showResults();
      return;
    }

    var card = els.questionCard;
    card.style.transition = 'opacity 0.3s ease-out, transform 0.4s ease-out';
    card.style.opacity = '0';
    card.style.transform = 'scale(0.96)';

    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:1000;background:var(--bg-primary);opacity:0;transition:opacity 0.6s ease-in-out;';
    overlay.innerHTML =
      '<div style="text-align:center;">' +
        '<div style="position:relative;width:64px;height:64px;margin:0 auto 24px;">' +
          '<div style="position:absolute;inset:0;border:3px solid rgba(99,102,241,0.08);border-radius:50%;"></div>' +
          '<div class="calculating-spinner" style="position:absolute;inset:0;border:3px solid transparent;border-top-color:#818cf8;border-right-color:rgba(129,140,248,0.3);border-radius:50%;animation:calcSpin 0.8s cubic-bezier(0.4,0,0.2,1) infinite;"></div>' +
          '<div style="position:absolute;inset:6px;border:2px solid transparent;border-bottom-color:rgba(167,139,250,0.5);border-radius:50%;animation:calcSpin 1.2s cubic-bezier(0.4,0,0.2,1) infinite reverse;"></div>' +
        '</div>' +
        '<div style="font-size:17px;font-weight:700;color:var(--text-primary);opacity:0;animation:calcFadeIn 0.4s ease-out 0.2s forwards;letter-spacing:0.02em;">診断結果を分析中...</div>' +
        '<div style="font-size:13px;color:var(--text-muted);margin-top:10px;opacity:0;animation:calcFadeIn 0.4s ease-out 0.5s forwards;">30問の回答から結果を計算しています</div>' +
        '<div style="margin-top:20px;width:120px;height:3px;background:rgba(255,255,255,0.06);border-radius:2px;overflow:hidden;opacity:0;animation:calcFadeIn 0.3s ease-out 0.7s forwards;"><div style="width:0%;height:100%;background:linear-gradient(90deg,#6366f1,#a78bfa);border-radius:2px;animation:calcProgress 1s ease-in-out 0.8s forwards;"></div></div>' +
      '</div>';

    if (!document.getElementById('calc-keyframes')) {
      var style = document.createElement('style');
      style.id = 'calc-keyframes';
      style.textContent = '@keyframes calcSpin{to{transform:rotate(360deg)}}@keyframes calcFadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}@keyframes calcProgress{from{width:0%}to{width:100%}}';
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
      age: ageVal || null,
      tenure: tenureVal || null,
      industry: industryVal || null
    };
  }

  // ---------- Results ----------
  function showResults() {
    var dimensionScores = Scoring.calculateAllScores(state.answers);
    var overallScore = Scoring.calculateOverallScore(dimensionScores);
    var weightedScore = Scoring.calculateWeightedOverallScore(dimensionScores);
    var risk = Scoring.getRiskLevel(weightedScore);
    var advice = Scoring.getAdvice(dimensionScores);
    var compoundRisks = Scoring.detectCompoundRisks(dimensionScores);

    // Apply demographic context
    var demographicContext = Scoring.calculateContextualScore(weightedScore, state.demographic);

    showScreen('result');

    // Demographic context display
    if (els.demographicContext) {
      if (demographicContext.comparison) {
        els.demographicContext.style.display = '';
        els.demographicContext.innerHTML =
          '<div class="demo-context-row">' +
            '<span class="demo-context-label">あなたに合わせた判定</span>' +
            '<span class="demo-context-score" style="color:' + Scoring.getRiskLevel(demographicContext.adjustedScore).color + '">' + demographicContext.adjustedScore + '<small>/100</small></span>' +
          '</div>' +
          '<p class="demo-context-note">' + demographicContext.comparison + '</p>';
      } else {
        els.demographicContext.style.display = 'none';
      }
    }

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
          '<span class="weighted-score-label">基本スコア</span>' +
          '<span class="weighted-score-value" style="color:' + simpleRisk.color + '">' + overallScore + '</span>' +
        '</div>' +
        diffHTML +
        '<div class="weighted-score-item">' +
          '<span class="weighted-score-label">詳しい分析</span>' +
          '<span class="weighted-score-value primary" style="color:' + risk.color + '">' + weightedScore + '</span>' +
        '</div>';
    }

    // Radar chart
    Charts.drawRadar(els.radarSvg, dimensionScores);

    // Strengths
    var strengths = Scoring.getStrengths(dimensionScores);
    if (els.strengthsContent && els.strengthsCard) {
      if (strengths.length > 0) {
        Charts.renderStrengths(els.strengthsContent, strengths);
        els.strengthsCard.style.display = '';
      } else {
        els.strengthsCard.style.display = 'none';
      }
    }

    // Dimension bars (interactive drill-down with question-level detail)
    if (Charts.renderDimensionBarsInteractive) {
      Charts.renderDimensionBarsInteractive(els.dimensionDetails, dimensionScores, state.answers);
    } else {
      Charts.renderDimensionBars(els.dimensionDetails, dimensionScores);
    }

    // Action Plan
    var actionPlan = Scoring.generateActionPlan(dimensionScores, compoundRisks, state.demographic);
    if (els.actionPlanContent) {
      Charts.renderActionPlan(els.actionPlanContent, actionPlan);
    }

    // Correlation Insights
    var correlationInsights = Scoring.getCorrelationInsights(dimensionScores);
    if (els.correlationContent && els.correlationCard) {
      Charts.renderCorrelationInsights(els.correlationContent, correlationInsights);
    }

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
      // Add current result to the end (ascending order) before saving
      var currentEntry = {
        date: new Date().toISOString(),
        overall: overallScore,
        weighted: weightedScore
      };
      chartHistory.push(currentEntry);
      Charts.drawTrendChart(els.trendSvg, chartHistory);
    }

    // Trend summary text
    if (els.trendSummary && history.length > 0) {
      var prevEntry = history[history.length - 1];
      var prevScore = prevEntry.weighted || prevEntry.overall;
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

    // What-If Scenario Simulator
    if (Charts.initWhatIfSimulator) {
      Charts.initWhatIfSimulator(els.whatifSliders, dimensionScores, weightedScore);
    }

    // Risk Velocity Indicator
    var velocity = DiagnosticHistory.getVelocity();
    var velocityContainer = document.getElementById('velocity-badges');
    if (velocityContainer && Charts.renderVelocityBadges) {
      Charts.renderVelocityBadges(velocityContainer, velocity);
    }

    // Dimension Trend Heatmap
    var heatmapContainer = document.getElementById('dimension-heatmap');
    if (heatmapContainer && Charts.drawDimensionHeatmap) {
      // Include current result in heatmap
      var heatmapHistory = history.slice();
      heatmapHistory.push({
        date: new Date().toISOString(),
        overall: overallScore,
        weighted: weightedScore,
        dimensions: dimensionScores
      });
      Charts.drawDimensionHeatmap(heatmapContainer, heatmapHistory);
    }

    // Re-diagnosis Reminder
    initReminder();

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
    state.lastResults = { overallScore: overallScore, weightedScore: weightedScore, dimensionScores: dimensionScores, compoundRisks: compoundRisks };
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
    state.demographic = { age: null, tenure: null, industry: null };

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
      state.demographic = { age: null, tenure: null, industry: null };
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

  // Report button (copy detailed text report to clipboard)
  var btnReport = document.getElementById('btn-report');
  if (btnReport) {
    btnReport.addEventListener('click', function () {
      if (!state.lastResults) return;
      var report = Scoring.generateTextReport(
        state.lastResults.overallScore,
        state.lastResults.weightedScore,
        state.lastResults.dimensionScores,
        state.lastResults.compoundRisks,
        state.demographic,
        state.answers
      );
      navigator.clipboard.writeText(report).then(function () {
        var orig = btnReport.innerHTML;
        btnReport.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> コピーしました';
        setTimeout(function () { btnReport.innerHTML = orig; }, 2000);
      }).catch(function () {
        // Fallback: select textarea for manual copy
        var ta = document.createElement('textarea');
        ta.value = report;
        ta.style.cssText = 'position:fixed;left:-9999px;';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (e) { /* noop */ }
        ta.remove();
        var orig2 = btnReport.innerHTML;
        btnReport.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> コピーしました';
        setTimeout(function () { btnReport.innerHTML = orig2; }, 2000);
      });
    });
  }

  // Risk DNA button
  var btnRiskDNA = document.getElementById('btn-risk-dna');
  if (btnRiskDNA) {
    btnRiskDNA.addEventListener('click', function () {
      if (!state.lastResults || !Charts.generateRiskDNA) return;

      var dataUrl = Charts.generateRiskDNA(state.lastResults.dimensionScores, state.lastResults.weightedScore);
      if (!dataUrl) return;

      var link = document.createElement('a');
      link.download = 'risk-dna.png';
      link.href = dataUrl;

      var isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
      if (isIOS) {
        var win = window.open();
        if (win) {
          win.document.write('<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>リスクDNA</title></head><body style="margin:0;display:flex;justify-content:center;background:#000;"><img src="' + dataUrl + '" style="max-width:100%;height:auto;"></body></html>');
          win.document.close();
        }
      } else {
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      var originalText = btnRiskDNA.innerHTML;
      btnRiskDNA.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> 保存しました';
      setTimeout(function () { btnRiskDNA.innerHTML = originalText; }, 2000);
    });
  }

  // Share image button
  if (els.btnShareImage) {
    els.btnShareImage.addEventListener('click', function () {
      if (!state.lastResults) return;

      var dataUrl = Charts.generateShareCard(state.lastResults);
      if (!dataUrl) return;

      // Try to download or open the image
      var link = document.createElement('a');
      link.download = 'retirement-risk-result.png';
      link.href = dataUrl;

      // iOS Safari doesn't support download attribute; Android/Desktop do
      var isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
      if (isIOS) {
        var win = window.open();
        if (win) {
          win.document.write('<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>退職リスク診断結果</title></head><body style="margin:0;display:flex;justify-content:center;background:#000;"><img src="' + dataUrl + '" style="max-width:100%;height:auto;"></body></html>');
          win.document.close();
        }
      } else {
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      // Visual feedback
      var btn = els.btnShareImage;
      var originalText = btn.innerHTML;
      btn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> 保存しました';
      setTimeout(function () {
        btn.innerHTML = originalText;
      }, 2000);
    });
  }

  // Keyboard support for likert (accessibility)
  var focusedLikertIndex = -1;

  function updateLikertFocus(index) {
    var buttons = els.likertScale.querySelectorAll('.likert-btn');
    buttons.forEach(function (btn) { btn.classList.remove('keyboard-focus'); });
    if (index >= 0 && index < buttons.length) {
      focusedLikertIndex = index;
      buttons[index].classList.add('keyboard-focus');
      buttons[index].focus();
    }
  }

  document.addEventListener('keydown', function (e) {
    if (!screens.question.classList.contains('active')) return;

    // Number keys 1-5: instant answer
    var key = parseInt(e.key);
    if (key >= 1 && key <= 5) {
      handleAnswer(key);
      focusedLikertIndex = -1;
      return;
    }

    // Arrow right/down: move focus to next Likert button
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      var next = Math.min(focusedLikertIndex + 1, 4);
      updateLikertFocus(next);
      return;
    }

    // Arrow left within Likert focus: move to previous button
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      if (focusedLikertIndex > 0) {
        e.preventDefault();
        updateLikertFocus(focusedLikertIndex - 1);
        return;
      }
      // If at first button or no focus, go to previous question
      if (focusedLikertIndex <= 0 && state.currentQuestion > 0) {
        state.direction = 'prev';
        state.currentQuestion--;
        focusedLikertIndex = -1;
        Haptics.navigate();
        showQuestion(state.currentQuestion);
        return;
      }
    }

    // Backspace: go to previous question
    if (e.key === 'Backspace') {
      if (state.currentQuestion > 0) {
        state.direction = 'prev';
        state.currentQuestion--;
        focusedLikertIndex = -1;
        Haptics.navigate();
        showQuestion(state.currentQuestion);
      }
      return;
    }

    // Enter/Space: select focused Likert button
    if ((e.key === 'Enter' || e.key === ' ') && focusedLikertIndex >= 0) {
      e.preventDefault();
      handleAnswer(focusedLikertIndex + 1);
      focusedLikertIndex = -1;
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

      var swipeThreshold = Math.max(60, window.innerWidth * 0.15);
      if (swipeDx > swipeThreshold && !swipeHapticFired) {
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

    var swipeThreshold = Math.max(60, window.innerWidth * 0.15);
    if (dx > swipeThreshold && touchIsHorizontal && state.currentQuestion > 0) {
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

  // ---------- Re-diagnosis Reminder ----------
  var REMINDER_KEY = 'rra_reminder';

  function initReminder() {
    var card = document.getElementById('reminder-card');
    var optionsEl = document.getElementById('reminder-options');
    var statusEl = document.getElementById('reminder-status');
    if (!card || !optionsEl || !statusEl) return;

    // Check existing reminder
    var existing = loadReminder();
    if (existing) {
      showReminderStatus(statusEl, optionsEl, existing);
    }

    optionsEl.addEventListener('click', function (e) {
      var btn = e.target.closest('.reminder-btn');
      if (!btn) return;
      var days = parseInt(btn.dataset.interval);
      if (isNaN(days)) return;

      // Request notification permission if needed
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(function (perm) {
          setReminder(days, statusEl, optionsEl);
        });
      } else {
        setReminder(days, statusEl, optionsEl);
      }
    });
  }

  function setReminder(days, statusEl, optionsEl) {
    var reminderDate = new Date();
    reminderDate.setDate(reminderDate.getDate() + days);
    var reminder = {
      date: reminderDate.toISOString(),
      days: days
    };
    try {
      localStorage.setItem(REMINDER_KEY, JSON.stringify(reminder));
    } catch (e) { /* noop */ }

    showReminderStatus(statusEl, optionsEl, reminder);

    // Schedule notification via setTimeout (works while page is open)
    scheduleNotification(days);
  }

  function loadReminder() {
    try {
      var raw = localStorage.getItem(REMINDER_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }

  function showReminderStatus(statusEl, optionsEl, reminder) {
    var d = new Date(reminder.date);
    var dateStr = d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
    var labelMap = { 14: '2週間後', 30: '1ヶ月後', 90: '3ヶ月後' };
    var label = labelMap[reminder.days] || reminder.days + '日後';

    // Update button states
    var btns = optionsEl.querySelectorAll('.reminder-btn');
    btns.forEach(function (b) {
      b.classList.toggle('active', parseInt(b.dataset.interval) === reminder.days);
    });

    statusEl.style.display = '';
    statusEl.innerHTML =
      '次の診断予定: ' + dateStr + '（' + label + '）' +
      '<br><button class="reminder-cancel" type="button">キャンセル</button>';

    var cancelBtn = statusEl.querySelector('.reminder-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', function () {
        try { localStorage.removeItem(REMINDER_KEY); } catch (e) { /* noop */ }
        statusEl.style.display = 'none';
        btns.forEach(function (b) { b.classList.remove('active'); });
      });
    }
  }

  function scheduleNotification(days) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    // For short intervals (testing), use actual timeout; for long ones, rely on SW
    var ms = days * 24 * 60 * 60 * 1000;
    // Cap at 24 hours for setTimeout (browser limitation); SW handles longer intervals
    var maxTimeout = 24 * 60 * 60 * 1000;
    if (ms <= maxTimeout) {
      setTimeout(function () {
        try {
          new Notification('退職リスク診断', {
            body: 'リマインダー: もう一度診断して、変化を確認しましょう。',
            icon: 'icons/icon-192.png',
            tag: 'rra-reminder'
          });
        } catch (e) { /* noop */ }
      }, ms);
    }

    // Also register with SW for persistent reminders
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SET_REMINDER',
        days: days,
        date: new Date(Date.now() + ms).toISOString()
      });
    }
  }

  // Check reminder on load - show notification if past due
  function checkReminderOnLoad() {
    var reminder = loadReminder();
    if (!reminder) return;
    var now = new Date();
    var reminderDate = new Date(reminder.date);
    if (now >= reminderDate) {
      // Past due - show inline prompt on start screen
      if (els.historySummary) {
        var reminderBanner = document.createElement('div');
        reminderBanner.className = 'history-summary-card';
        reminderBanner.style.cssText = 'margin-top:12px;border-left:3px solid var(--accent-primary);';
        reminderBanner.innerHTML =
          '<div style="flex:1;">' +
            '<span style="font-size:13px;font-weight:700;color:var(--accent-secondary);">再診断の時期です</span>' +
            '<span style="display:block;font-size:12px;color:var(--text-muted);margin-top:2px;">前回の診断から時間が経ちました。もう一度チェックしてみましょう。</span>' +
          '</div>';
        els.historySummary.appendChild(reminderBanner);
        els.historySummary.style.display = '';
      }

      // Send notification if permitted
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification('退職リスク診断', {
            body: '再診断の時期です。もう一度診断して変化を確認しましょう。',
            icon: 'icons/icon-192.png',
            tag: 'rra-reminder-due'
          });
        } catch (e) { /* noop */ }
      }

      // Clear the reminder
      try { localStorage.removeItem(REMINDER_KEY); } catch (e) { /* noop */ }
    }
  }

  // ---------- Collapsible Section Toggles ----------
  function initCollapsibleToggles() {
    var toggles = document.querySelectorAll('.collapsible-toggle, .references-toggle');
    toggles.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var card = btn.closest('[aria-expanded]');
        if (!card) return;
        var isExpanded = card.getAttribute('aria-expanded') === 'true';
        card.setAttribute('aria-expanded', isExpanded ? 'false' : 'true');
        var label = btn.getAttribute('data-collapse-label') || '';
        btn.setAttribute('aria-label', isExpanded ? label + 'を展開する' : label + 'を折りたたむ');
      });
    });
  }
  initCollapsibleToggles();

  // ---------- Data Export/Import ----------
  var btnExport = document.getElementById('btn-export');
  var btnImport = document.getElementById('btn-import');
  var importFile = document.getElementById('import-file');

  if (btnExport) {
    btnExport.addEventListener('click', function () {
      var json = DiagnosticHistory.exportJSON();
      var blob = new Blob([json], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var link = document.createElement('a');
      link.download = 'rra-data-' + new Date().toISOString().slice(0, 10) + '.json';
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      var orig = btnExport.innerHTML;
      btnExport.textContent = '書き出しました';
      setTimeout(function () { btnExport.innerHTML = orig; }, 2000);
    });
  }

  if (btnImport && importFile) {
    btnImport.addEventListener('click', function () {
      importFile.click();
    });

    importFile.addEventListener('change', function () {
      var file = importFile.files[0];
      if (!file) return;

      var reader = new FileReader();
      reader.onload = function (e) {
        var result = DiagnosticHistory.importJSON(e.target.result);
        var orig = btnImport.innerHTML;
        if (result.success) {
          btnImport.textContent = result.message;
          updateHistorySummary();
        } else {
          btnImport.textContent = result.message;
        }
        setTimeout(function () { btnImport.innerHTML = orig; }, 3000);
      };
      reader.readAsText(file);
      importFile.value = ''; // Reset for re-import
    });
  }

  // ---------- Initialize ----------
  updateHistorySummary();
  checkReminderOnLoad();

  // ---------- Service Worker Registration ----------
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {
        // Service Worker registration failed silently
      });
    });
  }
})();
