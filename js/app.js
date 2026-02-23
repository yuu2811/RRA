/**
 * 退職リスク診断 - Main Application Logic
 * Screen transitions, state management, event handling
 */

(function () {
  'use strict';

  // ---------- State ----------
  const state = {
    currentQuestion: 0,
    answers: {},       // { questionId: value }
    direction: 'next'  // 'next' or 'prev' for animation direction
  };

  // ---------- DOM Elements ----------
  const screens = {
    start: document.getElementById('screen-start'),
    question: document.getElementById('screen-question'),
    result: document.getElementById('screen-result')
  };

  const els = {
    btnStart: document.getElementById('btn-start'),
    btnBack: document.getElementById('btn-back'),
    btnShare: document.getElementById('btn-share'),
    btnRetry: document.getElementById('btn-retry'),
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
    radarSvg: document.getElementById('radar-svg'),
    dimensionDetails: document.getElementById('dimension-details'),
    adviceCard: document.getElementById('advice-card'),
    adviceContent: document.getElementById('advice-content'),
    referencesContent: document.getElementById('references-content')
  };

  // ---------- Screen Management ----------
  function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  // ---------- Question Display ----------
  function showQuestion(index) {
    const q = ALL_QUESTIONS[index];
    if (!q) return;

    // Update progress
    els.progressCategory.textContent = q.dimensionName;
    els.progressCount.textContent = `${index + 1} / ${TOTAL_QUESTIONS}`;
    els.progressBar.style.width = `${((index + 1) / TOTAL_QUESTIONS) * 100}%`;

    // Update question content
    els.questionNumber.textContent = `Q${index + 1}`;
    els.questionText.textContent = q.text;

    // Animate card
    els.questionCard.classList.remove('slide-in-right', 'slide-in-left');
    void els.questionCard.offsetWidth; // force reflow
    els.questionCard.classList.add(state.direction === 'next' ? 'slide-in-right' : 'slide-in-left');

    // Update likert buttons
    const buttons = els.likertScale.querySelectorAll('.likert-btn');
    const currentAnswer = state.answers[q.id];
    buttons.forEach(btn => {
      const val = parseInt(btn.dataset.value);
      btn.classList.toggle('selected', val === currentAnswer);
    });

    // Back button visibility
    els.btnBack.classList.toggle('hidden', index === 0);
  }

  // ---------- Answer Handling ----------
  function handleAnswer(value) {
    const q = ALL_QUESTIONS[state.currentQuestion];
    state.answers[q.id] = value;

    // Haptic feedback (if available)
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }

    // Brief delay for visual feedback before advancing
    const buttons = els.likertScale.querySelectorAll('.likert-btn');
    buttons.forEach(btn => {
      btn.classList.toggle('selected', parseInt(btn.dataset.value) === value);
    });

    setTimeout(() => {
      if (state.currentQuestion < TOTAL_QUESTIONS - 1) {
        state.direction = 'next';
        state.currentQuestion++;
        showQuestion(state.currentQuestion);
      } else {
        showResults();
      }
    }, 250);
  }

  // ---------- Results ----------
  function showResults() {
    const dimensionScores = Scoring.calculateAllScores(state.answers);
    const overallScore = Scoring.calculateOverallScore(dimensionScores);
    const risk = Scoring.getRiskLevel(overallScore);
    const advice = Scoring.getAdvice(dimensionScores);

    showScreen('result');

    // Overall gauge
    Charts.drawGauge(els.gaugeSvg, overallScore, risk.color);
    Charts.animateScore(els.gaugeScore, overallScore);

    // Risk level label
    els.riskLevel.textContent = `${risk.emoji} ${risk.label}`;
    els.riskLevel.className = `risk-level ${risk.level}`;

    // Interpretation
    els.riskDescription.textContent = Scoring.getOverallInterpretation(overallScore);

    // Radar chart
    Charts.drawRadar(els.radarSvg, dimensionScores);

    // Dimension bars
    Charts.renderDimensionBars(els.dimensionDetails, dimensionScores);

    // Advice
    Charts.renderAdvice(els.adviceContent, advice);

    // Hide advice card if no advice needed
    if (advice.length === 0) {
      els.adviceCard.style.display = 'none';
    } else {
      els.adviceCard.style.display = '';
    }

    // References
    Charts.renderReferences(els.referencesContent);

    // Store results for sharing
    state.lastResults = { overallScore, dimensionScores };
  }

  // ---------- Share ----------
  async function shareResults() {
    if (!state.lastResults) return;

    const { overallScore, dimensionScores } = state.lastResults;
    const shareText = Scoring.generateShareText(overallScore, dimensionScores);

    if (navigator.share) {
      try {
        await navigator.share({
          title: '退職リスク診断結果',
          text: shareText
        });
      } catch (err) {
        // User cancelled or share failed — fallback to clipboard
        if (err.name !== 'AbortError') {
          copyToClipboard(shareText);
        }
      }
    } else {
      copyToClipboard(shareText);
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      const btn = els.btnShare;
      const originalText = btn.innerHTML;
      btn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> コピーしました';
      setTimeout(() => {
        btn.innerHTML = originalText;
      }, 2000);
    }).catch(() => {
      // Clipboard API not available
    });
  }

  // ---------- Reset ----------
  function resetApp() {
    state.currentQuestion = 0;
    state.answers = {};
    state.direction = 'next';
    state.lastResults = null;
    showScreen('start');
  }

  // ---------- Event Listeners ----------
  els.btnStart.addEventListener('click', () => {
    showScreen('question');
    showQuestion(0);
  });

  // Likert button clicks
  els.likertScale.addEventListener('click', (e) => {
    const btn = e.target.closest('.likert-btn');
    if (!btn) return;
    const value = parseInt(btn.dataset.value);
    if (!isNaN(value)) {
      handleAnswer(value);
    }
  });

  // Back button
  els.btnBack.addEventListener('click', () => {
    if (state.currentQuestion > 0) {
      state.direction = 'prev';
      state.currentQuestion--;
      showQuestion(state.currentQuestion);
    }
  });

  // Share button
  els.btnShare.addEventListener('click', shareResults);

  // Retry button
  els.btnRetry.addEventListener('click', resetApp);

  // Keyboard support for likert (accessibility)
  document.addEventListener('keydown', (e) => {
    if (!screens.question.classList.contains('active')) return;
    const key = parseInt(e.key);
    if (key >= 1 && key <= 5) {
      handleAnswer(key);
    }
    if (e.key === 'ArrowLeft' || e.key === 'Backspace') {
      if (state.currentQuestion > 0) {
        state.direction = 'prev';
        state.currentQuestion--;
        showQuestion(state.currentQuestion);
      }
    }
  });

  // Swipe support for going back
  let touchStartX = 0;
  let touchStartY = 0;

  document.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    if (!screens.question.classList.contains('active')) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    // Only trigger if horizontal swipe is dominant
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 2) {
      if (dx > 0 && state.currentQuestion > 0) {
        // Swipe right = go back
        state.direction = 'prev';
        state.currentQuestion--;
        showQuestion(state.currentQuestion);
      }
    }
  }, { passive: true });

  // ---------- Service Worker Registration ----------
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {
        // Service Worker registration failed silently
      });
    });
  }
})();
