/**
 * 退職リスク診断 - SVG Charts (Radar Chart & Gauge)
 * Enhanced for iPhone 16 Pro 120Hz ProMotion display
 * Smoother animations, spring/elastic easing, progressive reveals
 */

const Charts = {

  // ---------- Easing Utilities for 120Hz ----------

  /**
   * Elastic ease-out — slight overshoot and settle
   * Perfect for score counters and emphasis animations
   */
  _elasticOut(t, amplitude, period) {
    amplitude = amplitude || 1.05;
    period = period || 0.4;
    if (t === 0 || t === 1) return t;
    const s = (period / (2 * Math.PI)) * Math.asin(1 / amplitude);
    return amplitude * Math.pow(2, -10 * t) * Math.sin((t - s) * (2 * Math.PI) / period) + 1;
  },

  /**
   * Cubic bezier approximation for dramatic gauge ease
   * Slow start, fast middle, gentle deceleration with slight settle
   */
  _gaugeEase(t) {
    // Custom ease: starts slow, accelerates, then gently overshoots and settles
    if (t < 0.6) {
      // Accelerating phase — ease-in-out cubic
      const p = t / 0.6;
      return 0.85 * (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
    }
    // Settling phase — slight overshoot and return
    const p = (t - 0.6) / 0.4;
    const overshoot = 0.85 + 0.18 * Math.sin(p * Math.PI);
    const settle = 0.85 + 0.15 * p;
    // Blend overshoot into final settle
    return overshoot * (1 - p * 0.4) + settle * (p * 0.4);
  },

  /**
   * Bounce ease-out for dimension bars
   */
  _bounceOut(t) {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  },

  /**
   * Draw circular gauge for overall score
   * Enhanced: longer dramatic animation, glow pulse on complete
   */
  drawGauge(svgElement, score, riskColor) {
    const cx = 100, cy = 100, r = 85;
    const circumference = 2 * Math.PI * r;
    const startAngle = -225;
    const totalAngle = 270;

    // Background track gradient
    const bgTrackColor = 'rgba(255,255,255,0.06)';

    svgElement.innerHTML = `
      <defs>
        <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${riskColor}" stop-opacity="0.8"/>
          <stop offset="100%" stop-color="${riskColor}"/>
        </linearGradient>
        <filter id="gaugeShadow">
          <feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="${riskColor}" flood-opacity="0.4"/>
        </filter>
        <filter id="gaugeGlow">
          <feGaussianBlur stdDeviation="8" result="blur"/>
          <feFlood flood-color="${riskColor}" flood-opacity="0.6" result="color"/>
          <feComposite in="color" in2="blur" operator="in" result="glow"/>
          <feMerge>
            <feMergeNode in="glow"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <!-- Background arc -->
      <path d="${this._describeArc(cx, cy, r, startAngle, startAngle + totalAngle)}"
            fill="none" stroke="${bgTrackColor}" stroke-width="10" stroke-linecap="round"/>
      <!-- Score arc (animated via JS) -->
      <path id="gauge-arc" d="${this._describeArc(cx, cy, r, startAngle, startAngle + totalAngle)}"
            fill="none" stroke="url(#gaugeGrad)" stroke-width="10" stroke-linecap="round"
            filter="url(#gaugeShadow)"/>
      <!-- Endpoint glow dot (hidden initially) -->
      <circle id="gauge-dot" cx="0" cy="0" r="6" fill="${riskColor}" opacity="0" filter="url(#gaugeGlow)"/>
    `;

    const self = this;

    // Animate the gauge arc using custom JS animation for 120Hz smoothness
    requestAnimationFrame(() => {
      const arc = document.getElementById('gauge-arc');
      const dot = document.getElementById('gauge-dot');
      if (!arc) return;

      const dashLen = circumference * (totalAngle / 360);
      const filledTarget = dashLen * (score / 100);
      const offsetTarget = dashLen - filledTarget;

      // Set initial state: fully hidden
      arc.setAttribute('stroke-dasharray', `${dashLen} ${circumference}`);
      arc.setAttribute('stroke-dashoffset', String(dashLen));

      const duration = 2200; // Longer, more dramatic for 120Hz
      const startTime = performance.now();

      function tick(now) {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        const eased = self._gaugeEase(t);

        // Current filled length
        const currentFilled = filledTarget * eased;
        const currentOffset = dashLen - currentFilled;
        arc.setAttribute('stroke-dashoffset', String(currentOffset));

        // Move the endpoint dot along the arc
        if (dot && score > 0) {
          const currentAngle = startAngle + totalAngle * (score / 100) * eased;
          const pos = self._polarToCartesian(cx, cy, r, currentAngle);
          dot.setAttribute('cx', String(pos.x));
          dot.setAttribute('cy', String(pos.y));
          dot.setAttribute('opacity', String(Math.min(t * 4, 0.9)));
        }

        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          // Animation complete — trigger glow pulse
          self._pulseGaugeGlow(arc, dot, riskColor);
        }
      }

      // Small delay before starting for visual staging
      setTimeout(() => requestAnimationFrame(tick), 200);
    });
  },

  /**
   * Subtle glow pulse on the gauge when animation completes
   */
  _pulseGaugeGlow(arc, dot, color) {
    if (!arc) return;

    // Pulse the drop shadow intensity
    const duration = 1200;
    const startTime = performance.now();

    function pulse(now) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      // Sine wave pulse that fades out
      const intensity = Math.sin(t * Math.PI) * (1 - t * 0.5);
      const stdDev = 6 + intensity * 10;
      const opacity = 0.4 + intensity * 0.4;

      // Update the filter
      const shadow = document.getElementById('gaugeShadow');
      if (shadow) {
        const dropShadow = shadow.querySelector('feDropShadow');
        if (dropShadow) {
          dropShadow.setAttribute('stdDeviation', String(stdDev));
          dropShadow.setAttribute('flood-opacity', String(opacity));
        }
      }

      // Pulse the dot
      if (dot) {
        const dotScale = 1 + intensity * 0.5;
        dot.setAttribute('r', String(6 * dotScale));
        dot.setAttribute('opacity', String(0.7 + intensity * 0.3));
      }

      if (t < 1) {
        requestAnimationFrame(pulse);
      } else {
        // Reset to resting state
        if (dot) {
          dot.setAttribute('r', '5');
          dot.setAttribute('opacity', '0.8');
        }
      }
    }
    requestAnimationFrame(pulse);
  },

  /**
   * SVG arc path helper
   */
  _describeArc(cx, cy, r, startAngle, endAngle) {
    const start = this._polarToCartesian(cx, cy, r, endAngle);
    const end = this._polarToCartesian(cx, cy, r, startAngle);
    const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
  },

  _polarToCartesian(cx, cy, r, angleDeg) {
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad)
    };
  },

  /**
   * Animate score counter with elastic overshoot and settle
   * The number briefly overshoots past the target, then settles back
   */
  animateScore(element, target, duration) {
    duration = duration || 2200; // Match gauge duration
    const self = this;
    const start = performance.now();
    let lastDisplayed = -1;

    const update = (now) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);

      // Use elastic ease for overshoot effect
      const eased = self._elasticOut(t, 1.08, 0.45);
      const current = Math.round(target * eased);

      // Only update DOM when value actually changes (reduce repaints)
      if (current !== lastDisplayed) {
        element.textContent = Math.max(0, Math.min(current, 100));
        lastDisplayed = current;
      }

      if (t < 1) {
        requestAnimationFrame(update);
      } else {
        // Ensure exact final value
        element.textContent = target;
      }
    };

    // Delay to match gauge animation start
    setTimeout(() => requestAnimationFrame(update), 200);
  },

  /**
   * Draw radar/spider chart
   * Enhanced: polygon animates progressively from center outward
   */
  drawRadar(svgElement, dimensionScores) {
    const dims = DIMENSIONS;
    const n = dims.length;
    const cx = 175, cy = 175, maxR = 130;
    const angleStep = (2 * Math.PI) / n;
    const startAngle = -Math.PI / 2; // Start from top

    // Grid levels
    const levels = [20, 40, 60, 80, 100];
    let gridHTML = '';
    let labelsHTML = '';
    let axesHTML = '';

    // Draw concentric pentagons for grid
    for (let li = 0; li < levels.length; li++) {
      const level = levels[li];
      const r = (level / 100) * maxR;
      const points = [];
      for (let i = 0; i < n; i++) {
        const angle = startAngle + i * angleStep;
        points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
      }
      gridHTML += `<polygon points="${points.join(' ')}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="0.5"/>`;

      // Level label
      const labelY = cy - r - 4;
      if (level % 40 === 0 || level === 100) {
        gridHTML += `<text x="${cx + 2}" y="${labelY}" fill="rgba(255,255,255,0.2)" font-size="9" text-anchor="start">${level}</text>`;
      }
    }

    // Draw axes and labels
    for (let i = 0; i < n; i++) {
      const angle = startAngle + i * angleStep;
      const x = cx + maxR * Math.cos(angle);
      const y = cy + maxR * Math.sin(angle);
      axesHTML += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="rgba(255,255,255,0.06)" stroke-width="0.5"/>`;

      // Label position (push further out)
      const labelR = maxR + 22;
      const lx = cx + labelR * Math.cos(angle);
      const ly = cy + labelR * Math.sin(angle);

      // Determine text anchor based on position
      let anchor = 'middle';
      if (Math.cos(angle) > 0.3) anchor = 'start';
      else if (Math.cos(angle) < -0.3) anchor = 'end';

      const dim = dims[i];

      labelsHTML += `<text x="${lx}" y="${ly}" fill="var(--text-secondary)" font-size="10" font-weight="600" text-anchor="${anchor}" dominant-baseline="middle">${dim.name}</text>`;
    }

    // Calculate target data points
    const targetPoints = [];
    for (let i = 0; i < n; i++) {
      const angle = startAngle + i * angleStep;
      const dim = dims[i];
      const score = dimensionScores[dim.id] || 0;
      const r = (score / 100) * maxR;
      targetPoints.push({
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
        score: score
      });
    }

    // Create center points (animation start)
    const centerPoints = [];
    for (let i = 0; i < n; i++) {
      centerPoints.push({ x: cx, y: cy });
    }

    // Initial polygon at center
    const centerPath = centerPoints.map(p => `${p.x},${p.y}`).join(' ');

    // Score dots (initially at center, will be animated)
    let dotsHTML = '';
    for (let i = 0; i < n; i++) {
      const dim = dims[i];
      const score = dimensionScores[dim.id] || 0;
      const color = Scoring.getRiskLevel(score).color;
      dotsHTML += `<circle class="radar-dot" data-index="${i}" cx="${cx}" cy="${cy}" r="0" fill="${color}" stroke="#fff" stroke-width="1" stroke-opacity="0.3"/>`;
    }

    svgElement.innerHTML = `
      <defs>
        <linearGradient id="radarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#818cf8" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="#6366f1" stop-opacity="0.1"/>
        </linearGradient>
      </defs>
      ${gridHTML}
      ${axesHTML}
      <polygon id="radar-polygon" points="${centerPath}" fill="url(#radarGrad)" stroke="#818cf8" stroke-width="2" stroke-linejoin="round" opacity="0"/>
      ${dotsHTML}
      ${labelsHTML}
    `;

    // Progressive animation: polygon expands from center outward
    const self = this;
    const duration = 1200;
    const delay = 500; // Wait for screen transition

    setTimeout(() => {
      const polygon = document.getElementById('radar-polygon');
      const dots = svgElement.querySelectorAll('.radar-dot');
      if (!polygon) return;

      polygon.setAttribute('opacity', '1');
      const animStart = performance.now();

      function tick(now) {
        const elapsed = now - animStart;
        const t = Math.min(elapsed / duration, 1);

        // Ease out quart for smooth expansion
        const eased = 1 - Math.pow(1 - t, 4);

        // Interpolate each point from center to target
        const currentPoints = [];
        for (let i = 0; i < n; i++) {
          const tx = cx + (targetPoints[i].x - cx) * eased;
          const ty = cy + (targetPoints[i].y - cy) * eased;
          currentPoints.push(`${tx},${ty}`);
        }
        polygon.setAttribute('points', currentPoints.join(' '));

        // Animate dots outward with slight delay per dot
        dots.forEach((dot, i) => {
          const dotDelay = i * 0.04; // Stagger each dot
          const dotT = Math.max(0, Math.min((t - dotDelay) / (1 - dotDelay), 1));
          const dotEased = self._elasticOut(dotT, 1.1, 0.5);

          const dx = cx + (targetPoints[i].x - cx) * dotEased;
          const dy = cy + (targetPoints[i].y - cy) * dotEased;
          dot.setAttribute('cx', String(dx));
          dot.setAttribute('cy', String(dy));
          dot.setAttribute('r', String(4 * Math.min(dotT * 3, 1)));
        });

        if (t < 1) {
          requestAnimationFrame(tick);
        }
      }
      requestAnimationFrame(tick);
    }, delay);
  },

  /**
   * Render dimension detail bars
   * Enhanced: staggered cascade with bounce easing
   */
  renderDimensionBars(container, dimensionScores) {
    container.innerHTML = '';
    const self = this;

    for (const dim of DIMENSIONS) {
      const score = dimensionScores[dim.id];
      const risk = Scoring.getRiskLevel(score);

      const row = document.createElement('div');
      row.className = 'dim-row';
      row.innerHTML = `
        <div class="dim-header">
          <span class="dim-name">${dim.name}</span>
          <span class="dim-score-text" style="color:${risk.color}"><span class="dim-score-num" data-target="${score}">0</span><small>/100</small></span>
        </div>
        <div class="dim-bar-track">
          <div class="dim-bar-fill" style="width:0%;background:${risk.color};" data-target="${score}"></div>
        </div>
      `;
      container.appendChild(row);
    }

    // Animate bars with staggered cascade and bounce
    requestAnimationFrame(() => {
      const bars = container.querySelectorAll('.dim-bar-fill');
      const nums = container.querySelectorAll('.dim-score-num');

      bars.forEach((bar, i) => {
        const target = parseInt(bar.dataset.target);
        const delay = i * 100; // 100ms stagger between each bar
        const duration = 1000;

        setTimeout(() => {
          const startTime = performance.now();

          function tick(now) {
            const elapsed = now - startTime;
            const t = Math.min(elapsed / duration, 1);
            const eased = self._bounceOut(t);

            bar.style.transition = 'none';
            bar.style.width = (target * eased) + '%';

            // Animate the number counter too
            if (nums[i]) {
              nums[i].textContent = Math.round(target * Math.min(t * 1.2, 1));
            }

            if (t < 1) {
              requestAnimationFrame(tick);
            } else {
              // Ensure final values
              bar.style.width = target + '%';
              if (nums[i]) nums[i].textContent = target;
            }
          }
          requestAnimationFrame(tick);
        }, delay);
      });
    });
  },

  /**
   * Render advice section
   */
  renderAdvice(container, adviceItems) {
    container.innerHTML = '';
    if (adviceItems.length === 0) {
      container.innerHTML = '<p class="no-advice">すべての次元で良好なスコアです。現在の状態を維持してください。</p>';
      return;
    }

    for (const item of adviceItems) {
      const div = document.createElement('div');
      div.className = 'advice-item';
      div.style.borderLeftColor = item.riskLevel.color;
      div.innerHTML = `
        <div class="advice-dim-name" style="color:${item.riskLevel.color}">${item.dimensionName}</div>
        <span class="advice-score-badge" style="background:${item.riskLevel.color}20;color:${item.riskLevel.color}">
          ${item.score}/100 ${item.riskLevel.label}
        </span>
        <p class="advice-text">${item.text}</p>
      `;
      container.appendChild(div);
    }
  },

  /**
   * Render references section
   */
  renderReferences(container) {
    container.innerHTML = '';
    for (const dim of DIMENSIONS) {
      const div = document.createElement('div');
      div.className = 'ref-item';
      div.innerHTML = `<span class="ref-dim">${dim.name}</span>${dim.reference}`;
      container.appendChild(div);
    }
  }
};
