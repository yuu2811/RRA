/**
 * 退職リスク診断 - Main Application Logic
 * Screen transitions, state management, event handling
 * Enhanced for iPhone 16 Pro 120Hz ProMotion display
 */

(function () {
  'use strict';

  // ---------- State ----------
  const state = {
    currentQuestion: 0,
    answers: {},       // { questionId: value }
    direction: 'next', // 'next' or 'prev' for animation direction
    lastResults: null,
    isSwiping: false,
    swipeStartX: 0,
    swipeCurrentX: 0,
    lastDimensionIndex: -1  // Track dimension changes for milestone feedback
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
  // Spring physics for ProMotion-optimized animations
  function springInterpolate(t, tension, friction) {
    // Attempt to approximate an underdamped spring for t in [0,1]
    tension = tension || 300;
    friction = friction || 20;
    const omega = Math.sqrt(tension);
    const zeta = friction / (2 * omega);
    if (zeta < 1) {
      // Underdamped
      const omegaD = omega * Math.sqrt(1 - zeta * zeta);
      return 1 - Math.exp(-zeta * omega * t) *
        (Math.cos(omegaD * t) + (zeta * omega / omegaD) * Math.sin(omegaD * t));
    }
    // Critically/overdamped fallback
    return 1 - (1 + omega * t) * Math.exp(-omega * t);
  }

  // Animate a value using requestAnimationFrame with spring physics
  function animateSpring(callback, duration, tension, friction) {
    duration = duration || 600;
    tension = tension || 300;
    friction = friction || 20;
    const start = performance.now();
    function tick(now) {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      const value = springInterpolate(t, tension, friction);
      callback(value, t);
      if (t < 1) {
        requestAnimationFrame(tick);
      }
    }
    requestAnimationFrame(tick);
  }

  // ---------- Haptic Feedback Patterns ----------
  const Haptics = {
    // Light tap for answer selection
    answerSelect() {
      if (navigator.vibrate) {
        navigator.vibrate(8);
      }
    },
    // Slightly stronger for navigation
    navigate() {
      if (navigator.vibrate) {
        navigator.vibrate(12);
      }
    },
    // Double pulse for milestone completion (dimension boundary)
    milestone() {
      if (navigator.vibrate) {
        navigator.vibrate([15, 50, 15]);
      }
    },
    // Triple gentle pulse for every 10 questions
    progress() {
      if (navigator.vibrate) {
        navigator.vibrate([10, 40, 10, 40, 10]);
      }
    },
    // Satisfying pulse for completing all questions
    complete() {
      if (navigator.vibrate) {
        navigator.vibrate([20, 60, 15, 60, 25]);
      }
    },
    // Subtle tap for swipe threshold
    swipeThreshold() {
      if (navigator.vibrate) {
        navigator.vibrate(6);
      }
    }
  };

  // ---------- Smooth Scroll-to-Top ----------
  function smoothScrollToTop(duration) {
    duration = duration || 400;
    const startY = window.scrollY;
    if (startY === 0) return;
    const startTime = performance.now();

    function step(now) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      // Ease out quint for buttery feel at 120Hz
      const eased = 1 - Math.pow(1 - t, 5);
      window.scrollTo(0, startY * (1 - eased));
      if (t < 1) {
        requestAnimationFrame(step);
      }
    }
    requestAnimationFrame(step);
  }

  // ---------- Screen Management ----------
  function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
    // Use smooth scroll for ProMotion displays instead of instant jump
    smoothScrollToTop(300);
  }

  // ---------- Progress Milestone Detection ----------
  function checkMilestone(index) {
    const q = ALL_QUESTIONS[index];
    if (!q) return;

    // Check if we crossed a dimension boundary
    if (q.dimensionIndex !== state.lastDimensionIndex && state.lastDimensionIndex >= 0) {
      Haptics.milestone();
      showDimensionCompleteFlash();
    }

    // Check for every-10-question milestone
    if (index > 0 && index % 10 === 0) {
      Haptics.progress();
      showProgressMilestone(index);
    }

    state.lastDimensionIndex = q.dimensionIndex;
  }

  function showDimensionCompleteFlash() {
    // Brief flash on the progress bar to indicate dimension completion
    const bar = els.progressBar;
    bar.style.transition = 'none';
    bar.style.boxShadow = '0 0 16px 4px rgba(99, 102, 241, 0.6)';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        bar.style.transition = 'box-shadow 0.8s ease-out';
        bar.style.boxShadow = 'none';
      });
    });
  }

  function showProgressMilestone(index) {
    // Brief text pulse on the progress count
    const el = els.progressCount;
    el.style.transition = 'none';
    el.style.transform = 'scale(1.25)';
    el.style.color = 'var(--accent-secondary)';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), color 0.8s ease-out';
        el.style.transform = 'scale(1)';
        el.style.color = '';
      });
    });
  }

  // ---------- Question Display with Spring Transition ----------
  function showQuestion(index) {
    const q = ALL_QUESTIONS[index];
    if (!q) return;

    // Check milestone before updating display
    checkMilestone(index);

    // Update progress
    els.progressCategory.textContent = q.dimensionName;
    els.progressCount.textContent = `${index + 1} / ${TOTAL_QUESTIONS}`;

    // Update dimension indicator (e.g., "次元 3/10")
    if (els.dimensionLabel) {
      els.dimensionLabel.textContent = `次元 ${q.dimensionIndex + 1}/10`;
    }

    // Update step indicator dots (3 questions per dimension)
    const questionWithinDimension = index % 3;
    els.stepDots.forEach((dot, i) => {
      if (!dot) return;
      dot.classList.remove('active', 'completed');
      if (i === questionWithinDimension) {
        dot.classList.add('active');
      } else if (i < questionWithinDimension) {
        dot.classList.add('completed');
      }
    });

    // Animate progress bar with spring-like timing
    requestAnimationFrame(() => {
      els.progressBar.style.width = `${((index + 1) / TOTAL_QUESTIONS) * 100}%`;
    });

    // Spring-based card transition
    const card = els.questionCard;
    const isNext = state.direction === 'next';
    const startX = isNext ? 60 : -60;

    // Reset card for fresh animation
    card.classList.remove('slide-in-right', 'slide-in-left');
    card.style.transition = 'none';
    card.style.transform = `translateX(${startX}px)`;
    card.style.opacity = '0';

    // Update question content while card is off-screen
    els.questionNumber.textContent = `Q${index + 1}`;
    els.questionText.textContent = q.text;

    // Update likert buttons
    const buttons = els.likertScale.querySelectorAll('.likert-btn');
    const currentAnswer = state.answers[q.id];
    buttons.forEach(btn => {
      const val = parseInt(btn.dataset.value);
      btn.classList.toggle('selected', val === currentAnswer);
    });

    // Back button visibility
    els.btnBack.classList.toggle('hidden', index === 0);

    // Spring animate the card in — optimized for 120Hz
    // Force layout to commit the starting position
    void card.offsetWidth;

    animateSpring(function (value, t) {
      const x = startX * (1 - value);
      const opacity = Math.min(t * 3, 1); // Fade in quickly in first third
      card.style.transform = `translateX(${x}px)`;
      card.style.opacity = String(opacity);
    }, 550, 180, 18);
  }

  // ---------- Answer Handling ----------
  function handleAnswer(value) {
    const q = ALL_QUESTIONS[state.currentQuestion];
    state.answers[q.id] = value;

    // Haptic feedback for answer selection
    Haptics.answerSelect();

    // Visual feedback — highlight selected button with spring scale
    const buttons = els.likertScale.querySelectorAll('.likert-btn');
    buttons.forEach(btn => {
      const val = parseInt(btn.dataset.value);
      const isSelected = val === value;
      btn.classList.toggle('selected', isSelected);

      if (isSelected) {
        // Spring pop on selected button
        btn.style.transition = 'none';
        btn.style.transform = 'scale(0.92)';
        void btn.offsetWidth;
        btn.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
        btn.style.transform = 'scale(1)';
      }
    });

    // 300ms delay feels more natural for touch interaction on ProMotion
    setTimeout(() => {
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

    const card = els.questionCard;

    // Fade out the question card
    card.style.transition = 'opacity 0.3s ease-out, transform 0.4s ease-out';
    card.style.opacity = '0';
    card.style.transform = 'scale(0.96)';

    // Create an inline overlay for the "calculating" state
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      background: var(--bg-primary);
      opacity: 0;
      transition: opacity 0.4s ease-out;
    `;
    overlay.innerHTML = `
      <div style="text-align:center;">
        <div class="calculating-spinner" style="
          width: 48px; height: 48px;
          border: 3px solid rgba(99,102,241,0.15);
          border-top-color: var(--accent-secondary);
          border-radius: 50%;
          animation: calcSpin 0.8s linear infinite;
          margin: 0 auto 20px;
        "></div>
        <div style="
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
          opacity: 0;
          animation: calcFadeIn 0.4s ease-out 0.2s forwards;
        ">診断結果を分析中...</div>
        <div style="
          font-size: 13px;
          color: var(--text-muted);
          margin-top: 8px;
          opacity: 0;
          animation: calcFadeIn 0.4s ease-out 0.4s forwards;
        ">10次元のリスクスコアを計算しています</div>
      </div>
    `;

    // Inject keyframes if not already present
    if (!document.getElementById('calc-keyframes')) {
      const style = document.createElement('style');
      style.id = 'calc-keyframes';
      style.textContent = `
        @keyframes calcSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes calcFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(overlay);

    // Fade in overlay
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.style.opacity = '1';
      });
    });

    // After a considered pause, transition to results
    setTimeout(() => {
      overlay.style.transition = 'opacity 0.3s ease-out';
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.remove();
        showResults();
      }, 300);
    }, 1200);
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
    state.lastDimensionIndex = -1;

    // Reset question card styles that spring animation may have left
    const card = els.questionCard;
    card.style.transition = '';
    card.style.transform = '';
    card.style.opacity = '';

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
      Haptics.navigate();
      showQuestion(state.currentQuestion);
    }
  });

  // Share button
  els.btnShare.addEventListener('click', shareResults);

  // Retry button
  els.btnRetry.addEventListener('click', resetApp);

  // Home button (returns to start screen)
  if (els.btnHome) {
    els.btnHome.addEventListener('click', resetApp);
  }

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
        Haptics.navigate();
        showQuestion(state.currentQuestion);
      }
    }
  });

  // ---------- Enhanced Swipe with Visual Feedback ----------
  let touchStartX = 0;
  let touchStartY = 0;
  let touchLocked = false;     // Lock direction once decided
  let touchIsHorizontal = false;
  let swipeHapticFired = false;

  document.addEventListener('touchstart', (e) => {
    if (!screens.question.classList.contains('active')) return;

    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchLocked = false;
    touchIsHorizontal = false;
    swipeHapticFired = false;
    state.isSwiping = false;
    state.swipeStartX = touchStartX;
    state.swipeCurrentX = touchStartX;

    // Disable transition during gesture for real-time tracking at 120Hz
    els.questionCard.style.transition = 'none';
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (!screens.question.classList.contains('active')) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const dx = currentX - touchStartX;
    const dy = currentY - touchStartY;

    // Lock direction after a small movement threshold
    if (!touchLocked && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
      touchLocked = true;
      touchIsHorizontal = Math.abs(dx) > Math.abs(dy);
    }

    if (!touchLocked || !touchIsHorizontal) return;

    state.isSwiping = true;
    state.swipeCurrentX = currentX;

    // Only allow right-swipe (go back) when not on first question
    // and left-swipe resistance (rubber-band effect)
    const swipeDx = currentX - touchStartX;

    if (swipeDx > 0 && state.currentQuestion > 0) {
      // Right swipe (go back) — allow with parallax
      const progress = Math.min(swipeDx / 200, 1);
      const translateX = swipeDx * 0.6; // Parallax: moves less than finger
      const scale = 1 - progress * 0.03;
      const opacity = 1 - progress * 0.3;

      els.questionCard.style.transform = `translateX(${translateX}px) scale(${scale})`;
      els.questionCard.style.opacity = String(opacity);

      // Haptic when crossing the threshold
      if (swipeDx > 80 && !swipeHapticFired) {
        swipeHapticFired = true;
        Haptics.swipeThreshold();
      }
    } else if (swipeDx < 0) {
      // Left swipe — rubber-band resistance (can't go forward by swiping)
      const resistance = 0.15;
      const rubberX = swipeDx * resistance;
      els.questionCard.style.transform = `translateX(${rubberX}px)`;
    } else if (swipeDx > 0 && state.currentQuestion === 0) {
      // Right swipe on first question — rubber-band
      const resistance = 0.15;
      const rubberX = swipeDx * resistance;
      els.questionCard.style.transform = `translateX(${rubberX}px)`;
    }
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    if (!screens.question.classList.contains('active')) return;
    if (!state.isSwiping) return;

    const dx = e.changedTouches[0].clientX - touchStartX;
    const card = els.questionCard;

    // If swipe was strong enough to go back
    if (dx > 80 && touchIsHorizontal && state.currentQuestion > 0) {
      // Continue the swipe off-screen, then show previous question
      card.style.transition = 'transform 0.3s cubic-bezier(0.2, 0, 0, 1), opacity 0.2s ease-out';
      card.style.transform = 'translateX(120%)';
      card.style.opacity = '0';

      setTimeout(() => {
        state.direction = 'prev';
        state.currentQuestion--;
        Haptics.navigate();
        showQuestion(state.currentQuestion);
      }, 200);
    } else {
      // Snap back with spring animation
      animateSpring(function (value) {
        const currentTransform = card.style.transform;
        // Parse current translateX
        const match = currentTransform.match(/translateX\(([^)]+)px\)/);
        const currentX = match ? parseFloat(match[1]) : 0;
        const x = currentX * (1 - value);
        card.style.transform = `translateX(${x}px)`;
        card.style.opacity = String(Math.min(0.7 + value * 0.3, 1));
      }, 400, 250, 22);
    }

    state.isSwiping = false;
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
