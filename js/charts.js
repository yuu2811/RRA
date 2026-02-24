/**
 * 退職リスク診断 - SVG Charts (Radar Chart & Gauge)
 * Universal smartphone support with smooth animations
 * Spring/elastic easing, progressive reveals
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
      const arc = svgElement.querySelector('#gauge-arc');
      const dot = svgElement.querySelector('#gauge-dot');
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

    // Find the SVG root element for scoped queries
    var svgRoot = arc.closest('svg');

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
      const shadow = svgRoot ? svgRoot.querySelector('#gaugeShadow') : document.getElementById('gaugeShadow');
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
  drawRadar(svgElement, dimensionScores, previousScores) {
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
      var fillOpacity = li === levels.length - 1 ? 'rgba(255,255,255,0.02)' : 'none';
      gridHTML += `<polygon points="${points.join(' ')}" fill="${fillOpacity}" stroke="rgba(255,255,255,0.12)" stroke-width="0.5"/>`;

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
      axesHTML += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="rgba(255,255,255,0.10)" stroke-width="0.5"/>`;

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

    // Previous assessment overlay (ghost polygon)
    let prevPolygonHTML = '';
    if (previousScores) {
      const prevPoints = [];
      for (let i = 0; i < n; i++) {
        const angle = startAngle + i * angleStep;
        const dim = dims[i];
        const prevScore = previousScores[dim.id] || 0;
        const r = (prevScore / 100) * maxR;
        prevPoints.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
      }
      prevPolygonHTML = `<polygon points="${prevPoints.join(' ')}" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1.5" stroke-dasharray="4,4" stroke-linejoin="round"/>`;
    }

    // Legend (if comparison)
    let legendHTML = '';
    if (previousScores) {
      legendHTML = `<g transform="translate(10,340)">
        <line x1="0" y1="0" x2="16" y2="0" stroke="#818cf8" stroke-width="2"/>
        <text x="20" y="4" fill="var(--text-muted)" font-size="9">今回</text>
        <line x1="60" y1="0" x2="76" y2="0" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" stroke-dasharray="4,4"/>
        <text x="80" y="4" fill="var(--text-muted)" font-size="9">前回</text>
      </g>`;
    }

    svgElement.innerHTML = `
      <defs>
        <linearGradient id="radarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#818cf8" stop-opacity="0.45"/>
          <stop offset="100%" stop-color="#6366f1" stop-opacity="0.2"/>
        </linearGradient>
      </defs>
      ${gridHTML}
      ${axesHTML}
      ${prevPolygonHTML}
      <polygon id="radar-polygon" points="${centerPath}" fill="url(#radarGrad)" stroke="#818cf8" stroke-width="2" stroke-linejoin="round" opacity="0"/>
      ${dotsHTML}
      ${labelsHTML}
      ${legendHTML}
    `;

    // Progressive animation: polygon expands from center outward
    const self = this;
    const duration = 1200;
    const delay = 500; // Wait for screen transition

    setTimeout(() => {
      const polygon = svgElement.querySelector('#radar-polygon');
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
      container.innerHTML = '<p class="no-advice">すべての項目で良好なスコアです。この調子を続けてください。</p>';
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
  },

  // ---------- Trend Chart ----------

  /**
   * Draw an SVG time-series line chart showing diagnostic score history over time.
   * viewBox="0 0 350 200", smooth cubic bezier curve, risk zone backgrounds,
   * gradient stroke, animated left-to-right draw, pulsing glow on last point.
   *
   * @param {SVGElement} svgElement - SVG element with viewBox="0 0 350 200"
   * @param {Array} history - [{date: ISO string, weighted: number}, ...] sorted by date ascending (max 20)
   */
  drawTrendChart(svgElement, history) {
    if (!svgElement) return;

    var self = this;
    svgElement.setAttribute('viewBox', '0 0 350 200');

    // --- Handle 0 or 1 entries: show placeholder message ---
    if (!history || history.length <= 1) {
      svgElement.innerHTML =
        '<text x="175" y="90" fill="var(--text-muted)" font-size="13" text-anchor="middle" dominant-baseline="middle">' +
          '<tspan x="175" dy="0">\u8A3A\u65AD\u30922\u56DE\u4EE5\u4E0A\u5B9F\u65BD\u3059\u308B\u3068</tspan>' +
          '<tspan x="175" dy="22">\u63A8\u79FB\u304C\u8868\u793A\u3055\u308C\u307E\u3059</tspan>' +
        '</text>';
      return;
    }

    // --- Layout constants ---
    var padLeft = 40, padRight = 20, padTop = 20, padBottom = 40;
    var viewW = 350, viewH = 200;
    var chartW = viewW - padLeft - padRight;
    var chartH = viewH - padTop - padBottom;

    // Data is already sorted ascending by date; cap at 20 entries
    var data = history.slice(0, 20);
    var n = data.length;

    // --- Helpers ---
    function xForIndex(i) {
      if (n === 1) return padLeft + chartW / 2;
      return padLeft + (i / (n - 1)) * chartW;
    }

    function yForScore(score) {
      return padTop + chartH - (score / 100) * chartH;
    }

    function formatDate(isoString) {
      var d = new Date(isoString);
      return (d.getMonth() + 1) + '/' + d.getDate();
    }

    // --- Unique IDs to avoid collisions ---
    var uid = 'tc-' + Math.random().toString(36).substr(2, 6);

    // --- Build SVG parts ---
    var defsHTML = '';
    var zonesHTML = '';
    var gridHTML = '';
    var axisHTML = '';
    var lineHTML = '';
    var dotsHTML = '';

    // Defs: gradient for line stroke (accent-primary to accent-secondary)
    defsHTML += '<defs>';
    defsHTML += '<linearGradient id="' + uid + '-lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">';
    defsHTML += '<stop offset="0%" stop-color="var(--accent-primary, #6366f1)"/>';
    defsHTML += '<stop offset="100%" stop-color="var(--accent-secondary, #818cf8)"/>';
    defsHTML += '</linearGradient>';
    // Glow filter for latest point
    defsHTML += '<filter id="' + uid + '-glow">';
    defsHTML += '<feGaussianBlur stdDeviation="4" result="blur"/>';
    defsHTML += '<feFlood flood-color="var(--accent-secondary, #818cf8)" flood-opacity="0.5" result="color"/>';
    defsHTML += '<feComposite in="color" in2="blur" operator="in" result="glow"/>';
    defsHTML += '<feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>';
    defsHTML += '</filter>';
    defsHTML += '</defs>';

    // Risk zone backgrounds (very subtle horizontal bands)
    var zones = [
      { yMin: 0, yMax: 39, fill: 'rgba(239,68,68,0.05)' },    // red - high risk
      { yMin: 40, yMax: 59, fill: 'rgba(249,115,22,0.05)' },   // orange - warning
      { yMin: 60, yMax: 79, fill: 'rgba(234,179,8,0.05)' },    // yellow - caution
      { yMin: 80, yMax: 100, fill: 'rgba(34,197,94,0.05)' }    // green - low risk
    ];

    for (var zi = 0; zi < zones.length; zi++) {
      var zone = zones[zi];
      var zy1 = yForScore(zone.yMax);
      var zy2 = yForScore(zone.yMin);
      zonesHTML += '<rect x="' + padLeft + '" y="' + zy1 + '" width="' + chartW + '" height="' + (zy2 - zy1) + '" fill="' + zone.fill + '"/>';
    }

    // Y-axis gridlines at 20, 40, 60, 80
    var gridLevels = [20, 40, 60, 80];
    for (var gi = 0; gi < gridLevels.length; gi++) {
      var gy = yForScore(gridLevels[gi]);
      gridHTML += '<line x1="' + padLeft + '" y1="' + gy + '" x2="' + (viewW - padRight) + '" y2="' + gy + '" stroke="rgba(255,255,255,0.06)" stroke-width="0.5" stroke-dasharray="4,4"/>';
      gridHTML += '<text x="' + (padLeft - 6) + '" y="' + (gy + 3) + '" fill="var(--text-muted)" font-size="9" text-anchor="end">' + gridLevels[gi] + '</text>';
    }

    // Y-axis 0 and 100 labels
    gridHTML += '<text x="' + (padLeft - 6) + '" y="' + (yForScore(0) + 3) + '" fill="var(--text-muted)" font-size="9" text-anchor="end">0</text>';
    gridHTML += '<text x="' + (padLeft - 6) + '" y="' + (yForScore(100) + 3) + '" fill="var(--text-muted)" font-size="9" text-anchor="end">100</text>';

    // X-axis date labels (max ~6 to avoid crowding)
    var labelStep = Math.max(1, Math.ceil(n / 6));
    for (var xi = 0; xi < n; xi++) {
      if (xi === 0 || xi === n - 1 || xi % labelStep === 0) {
        axisHTML += '<text x="' + xForIndex(xi) + '" y="' + (viewH - 8) + '" fill="var(--text-muted)" font-size="9" text-anchor="middle">' + formatDate(data[xi].date) + '</text>';
      }
    }

    // --- Compute path points ---
    var pathPoints = [];
    for (var pi = 0; pi < n; pi++) {
      pathPoints.push({ x: xForIndex(pi), y: yForScore(data[pi].weighted) });
    }

    // Build SVG path using smooth cubic bezier (Catmull-Rom conversion)
    var pathD = 'M ' + pathPoints[0].x + ' ' + pathPoints[0].y;
    if (n === 2) {
      pathD += ' L ' + pathPoints[1].x + ' ' + pathPoints[1].y;
    } else {
      for (var ci = 0; ci < n - 1; ci++) {
        var p0 = pathPoints[Math.max(0, ci - 1)];
        var p1 = pathPoints[ci];
        var p2 = pathPoints[Math.min(n - 1, ci + 1)];
        var p3 = pathPoints[Math.min(n - 1, ci + 2)];

        var tension = 0.3;
        var cp1x = p1.x + (p2.x - p0.x) * tension;
        var cp1y = p1.y + (p2.y - p0.y) * tension;
        var cp2x = p2.x - (p3.x - p1.x) * tension;
        var cp2y = p2.y - (p3.y - p1.y) * tension;

        pathD += ' C ' + cp1x + ' ' + cp1y + ', ' + cp2x + ' ' + cp2y + ', ' + p2.x + ' ' + p2.y;
      }
    }

    lineHTML += '<path id="' + uid + '-line" d="' + pathD + '" fill="none" stroke="url(#' + uid + '-lineGrad)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>';

    // Data point dots (r=4 normally, r=5 for latest)
    for (var di = 0; di < n; di++) {
      var dx = pathPoints[di].x;
      var dy = pathPoints[di].y;
      var dScore = data[di].weighted;
      var dColor = Scoring.getRiskLevel(dScore).color;
      var isLatest = (di === n - 1);
      var dRadius = 4;
      var filterAttr = isLatest ? ' filter="url(#' + uid + '-glow)"' : '';
      var latestId = isLatest ? ' id="' + uid + '-latest"' : '';

      dotsHTML += '<circle class="' + uid + '-dot"' + latestId + ' cx="' + dx + '" cy="' + dy + '" r="' + dRadius + '" fill="' + dColor + '" stroke="rgba(255,255,255,0.8)" stroke-width="1.5" opacity="0"' + filterAttr + '/>';

      // Score label on latest point
      if (isLatest) {
        dotsHTML += '<text class="' + uid + '-dot-label" x="' + dx + '" y="' + (dy - 12) + '" fill="var(--text-secondary)" font-size="11" font-weight="700" text-anchor="middle" opacity="0">' + dScore + '</text>';
      }
    }

    svgElement.innerHTML = defsHTML + zonesHTML + gridHTML + axisHTML + lineHTML + dotsHTML;

    // --- Animate line draw from left to right over 1200ms with ease-out ---
    requestAnimationFrame(function () {
      var lineEl = document.getElementById(uid + '-line');
      if (!lineEl) return;

      var totalLength = lineEl.getTotalLength();
      lineEl.style.strokeDasharray = totalLength;
      lineEl.style.strokeDashoffset = totalLength;

      var duration = 1200;
      var startTime = performance.now();

      function tickLine(now) {
        var elapsed = now - startTime;
        var t = Math.min(elapsed / duration, 1);
        // Ease out cubic
        var eased = 1 - Math.pow(1 - t, 3);
        lineEl.style.strokeDashoffset = totalLength * (1 - eased);

        // Reveal dots progressively as the line reaches them
        var dots = svgElement.querySelectorAll('.' + uid + '-dot');
        var dotLabels = svgElement.querySelectorAll('.' + uid + '-dot-label');
        for (var ddi = 0; ddi < dots.length; ddi++) {
          var dotThreshold = ddi / (n - 1);
          if (eased >= dotThreshold) {
            var dotProgress = Math.min((eased - dotThreshold) * n, 1);
            var dotEased = self._elasticOut(dotProgress, 1.08, 0.5);
            dots[ddi].setAttribute('opacity', String(Math.min(dotProgress * 2, 1)));
            dots[ddi].setAttribute('r', String(4 * Math.min(dotEased, 1.2)));
          }
        }
        // Reveal score labels
        for (var dli = 0; dli < dotLabels.length; dli++) {
          if (eased >= 0.9) {
            dotLabels[dli].setAttribute('opacity', String(Math.min((eased - 0.9) * 10, 1)));
          }
        }

        if (t < 1) {
          requestAnimationFrame(tickLine);
        } else {
          // Ensure all dots are fully visible
          for (var fi = 0; fi < dots.length; fi++) {
            dots[fi].setAttribute('opacity', '1');
          }
          for (var fli = 0; fli < dotLabels.length; fli++) {
            dotLabels[fli].setAttribute('opacity', '1');
          }
          // Start pulsing glow on the last data point
          self._pulseTrendDot(svgElement, uid);
        }
      }

      // Brief staging delay
      setTimeout(function () { requestAnimationFrame(tickLine); }, 150);
    });
  },

  /**
   * Subtle pulsing glow on the latest data point in a trend chart.
   * Continuous animation loop.
   * @private
   */
  _pulseTrendDot(svgElement, uid) {
    var dot = document.getElementById(uid + '-latest');
    if (!dot) return;

    var cycleDuration = 2000;
    var startTime = performance.now();
    var rafId = null;
    var stopped = false;

    function pulse(now) {
      // If the dot has been removed from DOM or stopped, clean up
      if (stopped || !dot.parentNode) {
        stopped = true;
        rafId = null;
        return;
      }

      var elapsed = (now - startTime) % cycleDuration;
      var t = elapsed / cycleDuration;
      var intensity = (Math.sin(t * 2 * Math.PI - Math.PI / 2) + 1) / 2;

      var r = 4 + intensity * 2.5;
      var opacity = 0.85 + intensity * 0.15;
      dot.setAttribute('r', String(r));
      dot.setAttribute('opacity', String(opacity));

      rafId = requestAnimationFrame(pulse);
    }

    rafId = requestAnimationFrame(pulse);

    // Pause when tab is hidden to save CPU; clean up when dot is removed
    function onVis() {
      if (stopped || !dot.parentNode) {
        document.removeEventListener('visibilitychange', onVis);
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        stopped = true;
        return;
      }
      if (document.hidden) {
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      } else {
        if (!rafId) {
          startTime = performance.now();
          rafId = requestAnimationFrame(pulse);
        }
      }
    }
    document.addEventListener('visibilitychange', onVis);

    // Periodic self-check: if dot is detached, stop and clean up listener
    var checkInterval = setInterval(function () {
      if (!dot.parentNode || stopped) {
        stopped = true;
        clearInterval(checkInterval);
        document.removeEventListener('visibilitychange', onVis);
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      }
    }, 5000);
  },

  // ---------- Compound Risks ----------

  /**
   * Render compound risk pattern cards.
   *
   * @param {HTMLElement} container - DOM element to render into
   * @param {Array} risks - from Scoring.detectCompoundRisks(), each with
   *   {id, name, nameEn, icon, severity, description, dimensions, advice}
   *   severity is 'critical' or 'warning'
   */
  renderCompoundRisks(container, risks) {
    if (!container) return;
    container.innerHTML = '';

    if (!risks || risks.length === 0) {
      var emptyMsg = document.createElement('div');
      emptyMsg.className = 'compound-risk-empty';
      emptyMsg.style.cssText = 'text-align:center;padding:24px 16px;color:var(--text-muted);font-size:14px;';
      emptyMsg.innerHTML =
        '<span style="font-size:24px;display:block;margin-bottom:8px;">\u2705</span>' +
        '特に注意が必要な組み合わせは見つかりませんでした';
      container.appendChild(emptyMsg);
      return;
    }

    for (var ri = 0; ri < risks.length; ri++) {
      var risk = risks[ri];
      var severity = risk.severity || 'warning';

      var card = document.createElement('div');
      card.className = 'compound-risk-item compound-risk-' + severity;

      // Border color based on severity
      var borderColor = severity === 'critical' ? 'rgba(239,68,68,0.6)' : 'rgba(249,115,22,0.6)';
      var bgTint = severity === 'critical' ? 'rgba(239,68,68,0.04)' : 'rgba(249,115,22,0.04)';
      card.style.cssText = 'border-left:3px solid ' + borderColor + ';background:' + bgTint + ';border-radius:8px;padding:16px;margin-bottom:12px;';

      // Header: icon + name + nameEn
      var headerHTML = '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">';
      headerHTML += '<span style="font-size:24px;line-height:1;">' + (risk.icon || '') + '</span>';
      headerHTML += '<div>';
      headerHTML += '<div style="font-weight:700;font-size:15px;color:var(--text-primary,#fff);">' + (risk.name || '') + '</div>';
      if (risk.nameEn) {
        headerHTML += '<div style="font-size:11px;color:var(--text-muted);margin-top:2px;">' + risk.nameEn + '</div>';
      }
      headerHTML += '</div>';
      headerHTML += '</div>';

      // Description
      var descHTML = '<p style="font-size:13px;color:var(--text-secondary);line-height:1.6;margin:0 0 12px 0;">' + (risk.description || '') + '</p>';

      // Affected dimensions list
      var dimsHTML = '';
      var dims = risk.dimensions || risk.matchedDimensions || [];
      if (dims.length > 0) {
        dimsHTML += '<div style="margin-bottom:12px;">';
        dimsHTML += '<div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;font-weight:600;">関係する項目</div>';
        for (var di = 0; di < dims.length; di++) {
          var dim = dims[di];
          var dimName = dim.name || dim;
          var dimScore = dim.score;
          dimsHTML += '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 8px;background:rgba(255,255,255,0.03);border-radius:4px;margin-bottom:3px;font-size:12px;">';
          dimsHTML += '<span style="color:var(--text-secondary);">' + dimName + '</span>';
          if (dimScore !== undefined) {
            var dimColor = Scoring.getRiskLevel(dimScore).color;
            dimsHTML += '<span style="color:' + dimColor + ';font-weight:600;">' + dimScore + '/100</span>';
          }
          dimsHTML += '</div>';
        }
        dimsHTML += '</div>';
      }

      // Advice
      var adviceHTML = '';
      if (risk.advice) {
        adviceHTML += '<div style="background:rgba(255,255,255,0.03);border-radius:6px;padding:10px 12px;">';
        adviceHTML += '<div style="font-size:11px;color:var(--text-muted);font-weight:600;margin-bottom:4px;">こうしてみましょう</div>';
        adviceHTML += '<p style="font-size:13px;color:var(--text-secondary);line-height:1.5;margin:0;">' + risk.advice + '</p>';
        adviceHTML += '</div>';
      }

      card.innerHTML = headerHTML + descHTML + dimsHTML + adviceHTML;
      container.appendChild(card);
    }
  },

  // ---------- Demographic Context ----------

  /**
   * Render demographic context comparison with adjusted score and benchmarks.
   *
   * @param {HTMLElement} container - DOM element to render into
   * @param {Object} context - from Scoring.applyDemographicContext(), with
   *   {adjustedScore, contextNotes, benchmarks}
   */
  renderDemographicContext(container, context) {
    if (!container || !context) return;
    container.innerHTML = '';

    var adjustedScore = context.adjustedScore;
    var contextNotes = context.contextNotes || [];
    var benchmarks = context.benchmarks || [];

    var adjustedColor = Scoring.getRiskLevel(adjustedScore).color;

    // Main wrapper
    var wrapper = document.createElement('div');
    wrapper.className = 'demographic-comparison';

    // Adjusted score row
    var scoreRow = document.createElement('div');
    scoreRow.className = 'demo-score-row';
    scoreRow.innerHTML =
      '<span class="demo-label">あなたに合わせたスコア</span>' +
      '<span class="demo-score" style="color:' + adjustedColor + '">' + adjustedScore + '</span>';
    wrapper.appendChild(scoreRow);

    // Context notes list
    if (contextNotes.length > 0) {
      var notesDiv = document.createElement('div');
      notesDiv.className = 'demo-notes';
      var notesList = document.createElement('ul');
      for (var ni = 0; ni < contextNotes.length; ni++) {
        var li = document.createElement('li');
        li.textContent = contextNotes[ni];
        notesList.appendChild(li);
      }
      notesDiv.appendChild(notesList);
      wrapper.appendChild(notesDiv);
    }

    // Benchmarks with horizontal bar visualization
    if (benchmarks.length > 0) {
      var benchDiv = document.createElement('div');
      benchDiv.className = 'demo-benchmarks';

      for (var bi = 0; bi < benchmarks.length; bi++) {
        var bm = benchmarks[bi];
        var bmItem = document.createElement('div');
        bmItem.className = 'demo-benchmark-item';

        // Normalize turnover rate for bar width (cap at 50% for display)
        var userRate = bm.turnoverRate || 0;
        var avgRate = bm.averageRate || 0;
        var maxRate = Math.max(userRate, avgRate, 30);
        var userBarW = Math.min((userRate / maxRate) * 100, 100);
        var avgBarW = Math.min((avgRate / maxRate) * 100, 100);

        var userBarColor = userRate > avgRate ? '#ef4444' : '#22c55e';

        bmItem.innerHTML =
          '<div class="demo-benchmark-label">' + (bm.label || bm.category || '') + '</div>' +
          '<div class="demo-benchmark-bars">' +
            '<div class="demo-benchmark-bar-row">' +
              '<span class="demo-benchmark-bar-label">該当</span>' +
              '<div class="demo-benchmark-bar-track">' +
                '<div class="demo-benchmark-bar-fill" style="width:' + userBarW + '%;background:' + userBarColor + '"></div>' +
              '</div>' +
              '<span class="demo-benchmark-bar-value">' + userRate + '%</span>' +
            '</div>' +
            '<div class="demo-benchmark-bar-row">' +
              '<span class="demo-benchmark-bar-label">平均</span>' +
              '<div class="demo-benchmark-bar-track">' +
                '<div class="demo-benchmark-bar-fill" style="width:' + avgBarW + '%;background:var(--text-muted)"></div>' +
              '</div>' +
              '<span class="demo-benchmark-bar-value">' + avgRate + '%</span>' +
            '</div>' +
          '</div>';

        benchDiv.appendChild(bmItem);
      }

      wrapper.appendChild(benchDiv);
    }

    container.appendChild(wrapper);
  },

  // ---------- History List ----------

  /**
   * Render a compact history list for the start screen.
   *
   * @param {HTMLElement} container - DOM element to render into
   * @param {Array} history - from DiagnosticHistory.getAll() (newest first, max 5 shown)
   */
  renderHistory(container, history) {
    if (!container) return;
    container.innerHTML = '';

    if (!history || history.length === 0) return;

    // Show at most 5 most recent entries
    var entries = history.slice(0, 5);

    for (var i = 0; i < entries.length; i++) {
      (function (index) {
        var entry = entries[index];
        var row = document.createElement('div');
        row.className = 'history-entry';

        // Format date (e.g., 2024年1月15日)
        var d = new Date(entry.date);
        var dateStr = d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';

        // Score and risk color
        var score = entry.weighted;
        var riskColor = Scoring.getRiskLevel(score).color;

        // Trend: compare to next entry (which is the previous chronologically)
        var trendHTML = '';
        if (index < entries.length - 1) {
          var prevScore = entries[index + 1].weighted;
          var diff = score - prevScore;
          if (Math.abs(diff) >= 3) {
            if (diff > 0) {
              trendHTML = '<span class="history-trend" style="color:#22c55e">\u2191 +' + Math.abs(diff) + '</span>';
            } else {
              trendHTML = '<span class="history-trend" style="color:#ef4444">\u2193 -' + Math.abs(diff) + '</span>';
            }
          } else {
            trendHTML = '<span class="history-trend" style="color:var(--text-muted)">\u2192</span>';
          }
        }

        row.innerHTML =
          '<div class="history-date">' + dateStr + '</div>' +
          '<div class="history-scores">' +
            '<span class="history-score" style="color:' + riskColor + '">' + score + '</span>' +
            trendHTML +
          '</div>';

        // Animated entrance: initially hidden, staggered reveal
        row.style.opacity = '0';
        row.style.transform = 'translateY(10px)';
        row.style.transition = 'opacity 0.4s ease-out, transform 0.4s ease-out';

        container.appendChild(row);

        // Stagger animation: 100ms per row
        setTimeout(function () {
          row.style.opacity = '1';
          row.style.transform = 'translateY(0)';
        }, index * 100 + 50);
      })(i);
    }
  },

  // ---------- History Summary (Start Screen) ----------

  /**
   * Render a compact history summary for the start screen.
   * Shows last score, date, and trend direction.
   *
   * @param {HTMLElement} container - DOM element to render into
   * @param {Array} history - from DiagnosticHistory.getAll() (newest first)
   * @param {Object|null} trend - from DiagnosticHistory.getTrend()
   *   {direction: 'improving'|'declining'|'stable', change: number, ...}
   */
  renderHistorySummary(container, history, trend) {
    if (!container) return;
    container.innerHTML = '';

    // If no history, show nothing
    if (!history || history.length === 0) return;

    var latest = history[0];
    var score = latest.weighted;
    var risk = Scoring.getRiskLevel(score);

    // Format the date
    var d = new Date(latest.date);
    var dateStr = d.getFullYear() + '\u5E74' + (d.getMonth() + 1) + '\u6708' + d.getDate() + '\u65E5';

    // Build the summary wrapper
    var wrapper = document.createElement('div');
    wrapper.className = 'history-summary';
    wrapper.style.cssText = 'padding:14px 16px;border-radius:10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);';

    // Header row: "前回の診断" + date
    var headerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">';
    headerHTML += '<span style="font-size:13px;font-weight:600;color:var(--text-secondary);">\u524D\u56DE\u306E\u8A3A\u65AD</span>';
    headerHTML += '<span style="font-size:11px;color:var(--text-muted);">' + dateStr + '</span>';
    headerHTML += '</div>';

    // Score row with risk color and trend
    var scoreHTML = '<div style="display:flex;align-items:center;gap:12px;">';
    scoreHTML += '<span style="font-size:28px;font-weight:700;color:' + risk.color + ';line-height:1;">' + score + '</span>';
    scoreHTML += '<span style="font-size:12px;color:' + risk.color + ';background:' + risk.color + '15;padding:2px 8px;border-radius:4px;">' + risk.label + '</span>';

    // Trend arrow if available
    if (trend) {
      var trendArrow = '';
      var trendColor = '';
      var changeAbs = Math.abs(trend.change);

      if (trend.direction === 'improving') {
        trendArrow = '\u2191';
        trendColor = '#22c55e';
      } else if (trend.direction === 'declining') {
        trendArrow = '\u2193';
        trendColor = '#ef4444';
      } else {
        trendArrow = '\u2192';
        trendColor = 'var(--text-muted)';
      }

      scoreHTML += '<span style="font-size:14px;font-weight:600;color:' + trendColor + ';margin-left:auto;">';
      scoreHTML += trendArrow;
      if (trend.direction !== 'stable') {
        scoreHTML += ' ' + (trend.change > 0 ? '+' : '') + trend.change;
      }
      scoreHTML += '</span>';
    }

    scoreHTML += '</div>';

    // "履歴を見る" button
    var btnHTML = '<div style="margin-top:12px;text-align:right;">';
    btnHTML += '<button class="btn-view-history" style="background:none;border:none;color:var(--accent-primary, #6366f1);font-size:12px;font-weight:600;cursor:pointer;padding:4px 0;text-decoration:underline;text-underline-offset:2px;">';
    btnHTML += '\u5C65\u6B74\u3092\u898B\u308B';
    btnHTML += '</button>';
    btnHTML += '</div>';

    wrapper.innerHTML = headerHTML + scoreHTML + btnHTML;
    container.appendChild(wrapper);

    // Animated entrance
    wrapper.style.opacity = '0';
    wrapper.style.transform = 'translateY(8px)';
    wrapper.style.transition = 'opacity 0.4s ease-out, transform 0.4s ease-out';
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        wrapper.style.opacity = '1';
        wrapper.style.transform = 'translateY(0)';
      });
    });
  },

  // ---------- Weighted Score Comparison ----------

  /**
   * Render a visual comparison between simple average and evidence-weighted score.
   *
   * @param {HTMLElement} container - DOM element to render into
   * @param {number} overallScore - Simple average score (0-100)
   * @param {number} weightedScore - Meta-analytic weighted score (0-100)
   */
  renderWeightedScoreComparison(container, overallScore, weightedScore) {
    if (!container) return;
    container.innerHTML = '';

    var overallRisk = Scoring.getRiskLevel(overallScore);
    var weightedRisk = Scoring.getRiskLevel(weightedScore);
    var diff = weightedScore - overallScore;
    var showDiff = Math.abs(diff) > 3;

    var wrapper = document.createElement('div');
    wrapper.className = 'weighted-score-comparison';
    wrapper.style.cssText = 'display:flex;align-items:stretch;gap:12px;padding:14px 0;';

    // Simple average card (secondary)
    var simpleCard = document.createElement('div');
    simpleCard.className = 'score-compare-card';
    simpleCard.style.cssText = 'flex:1;text-align:center;padding:14px 10px;border-radius:10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);';
    simpleCard.innerHTML =
      '<div style="font-size:11px;color:var(--text-muted);margin-bottom:8px;font-weight:500;">基本スコア</div>' +
      '<div style="font-size:26px;font-weight:700;color:' + overallRisk.color + ';line-height:1;">' + overallScore + '</div>' +
      '<div style="font-size:10px;color:' + overallRisk.color + ';margin-top:4px;">' + overallRisk.label + '</div>';

    // Weighted score card (primary / highlighted)
    var weightedCard = document.createElement('div');
    weightedCard.className = 'score-compare-card score-compare-primary';
    weightedCard.style.cssText = 'flex:1;text-align:center;padding:14px 10px;border-radius:10px;background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);position:relative;';
    weightedCard.innerHTML =
      '<div style="font-size:11px;color:var(--text-secondary);margin-bottom:8px;font-weight:600;">詳しい分析</div>' +
      '<div style="font-size:30px;font-weight:800;color:' + weightedRisk.color + ';line-height:1;">' + weightedScore + '</div>' +
      '<div style="font-size:10px;color:' + weightedRisk.color + ';margin-top:4px;">' + weightedRisk.label + '</div>';

    wrapper.appendChild(simpleCard);

    // Difference arrow between cards (if they differ by > 3)
    if (showDiff) {
      var arrowDiv = document.createElement('div');
      arrowDiv.className = 'score-compare-arrow';
      arrowDiv.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:36px;';

      var arrowColor = diff > 0 ? '#22c55e' : diff < 0 ? '#ef4444' : 'var(--text-muted)';
      var arrowChar = diff > 0 ? '\u2192' : '\u2192'; // horizontal arrow between the two
      arrowDiv.innerHTML =
        '<span style="font-size:16px;color:' + arrowColor + ';">\u2192</span>' +
        '<span style="font-size:10px;font-weight:700;color:' + arrowColor + ';white-space:nowrap;">' + (diff > 0 ? '+' : '') + diff + '</span>';

      wrapper.appendChild(arrowDiv);
    }

    wrapper.appendChild(weightedCard);
    container.appendChild(wrapper);

    // Animate entrance
    var cards = wrapper.querySelectorAll('.score-compare-card');
    for (var ci = 0; ci < cards.length; ci++) {
      (function (card, index) {
        card.style.opacity = '0';
        card.style.transform = 'scale(0.9)';
        card.style.transition = 'opacity 0.4s ease-out, transform 0.4s ease-out';
        setTimeout(function () {
          requestAnimationFrame(function () {
            card.style.opacity = '1';
            card.style.transform = 'scale(1)';
          });
        }, index * 120 + 50);
      })(cards[ci], ci);
    }

    // Animate difference arrow
    var arrowEl = wrapper.querySelector('.score-compare-arrow');
    if (arrowEl) {
      arrowEl.style.opacity = '0';
      arrowEl.style.transition = 'opacity 0.5s ease-out';
      setTimeout(function () {
        requestAnimationFrame(function () {
          arrowEl.style.opacity = '1';
        });
      }, 250);
    }
  },

  // ============================================================
  // Phase 2: Interactive Dimension Drill-Down
  // ============================================================

  /**
   * Render interactive dimension bars that expand on tap to show question-level detail.
   *
   * @param {HTMLElement} container - DOM container
   * @param {Object<string, number>} dimensionScores - Map of dim ID to score
   * @param {Object<number, number>} answers - Map of question ID to answer value
   */
  renderDimensionBarsInteractive(container, dimensionScores, answers) {
    container.innerHTML = '';
    var self = this;

    for (var di = 0; di < DIMENSIONS.length; di++) {
      (function(dimIndex) {
        var dim = DIMENSIONS[dimIndex];
        var score = dimensionScores[dim.id];
        var risk = Scoring.getRiskLevel(score);
        var percentile = Scoring.getDimensionPercentile(dim.id, score);

        var row = document.createElement('div');
        row.className = 'dim-row dim-row-interactive';
        row.setAttribute('data-dim-id', dim.id);

        // Main bar (always visible)
        var mainHTML = '';
        mainHTML += '<div class="dim-header dim-header-tap">';
        mainHTML += '<div class="dim-header-left">';
        mainHTML += '<span class="dim-name">' + dim.name + '</span>';
        mainHTML += '<span class="dim-percentile" style="color:var(--text-muted);font-size:10px;margin-left:6px;">上位' + (100 - percentile.percentile) + '%</span>';
        mainHTML += '</div>';
        mainHTML += '<div class="dim-header-right">';
        mainHTML += '<span class="dim-score-text" style="color:' + risk.color + '"><span class="dim-score-num" data-target="' + score + '">0</span><small>/100</small></span>';
        mainHTML += '<span class="dim-expand-icon" aria-hidden="true">&#9662;</span>';
        mainHTML += '</div>';
        mainHTML += '</div>';
        mainHTML += '<div class="dim-bar-track">';
        mainHTML += '<div class="dim-bar-fill" style="width:0%;background:' + risk.color + ';" data-target="' + score + '"></div>';
        mainHTML += '</div>';

        // Drill-down panel (hidden by default)
        var drillHTML = '<div class="dim-drill-panel" style="display:none;">';
        
        // Description
        drillHTML += '<p class="dim-drill-desc">' + dim.description + '</p>';

        // Score explanation (why this score?)
        if (Scoring.getDimensionExplanation) {
          var explanation = Scoring.getDimensionExplanation(dim, score, answers);
          if (explanation) {
            drillHTML += '<p class="dim-drill-explanation">' + explanation + '</p>';
          }
        }

        // Percentile bar
        drillHTML += '<div class="dim-drill-percentile-row">';
        drillHTML += '<span class="dim-drill-percentile-label">' + percentile.lowLabel + '</span>';
        drillHTML += '<div class="dim-drill-percentile-track">';
        drillHTML += '<div class="dim-drill-percentile-marker" style="left:' + percentile.percentile + '%;background:' + risk.color + ';"></div>';
        drillHTML += '<div class="dim-drill-percentile-avg" style="left:50%;"></div>';
        drillHTML += '</div>';
        drillHTML += '<span class="dim-drill-percentile-label">' + percentile.highLabel + '</span>';
        drillHTML += '</div>';

        // Individual question scores
        var questionScores = Scoring.getQuestionScores(answers, dim);
        drillHTML += '<div class="dim-drill-questions">';
        for (var qi = 0; qi < questionScores.length; qi++) {
          var qs = questionScores[qi];
          var qRisk = Scoring.getRiskLevel(qs.processedScore);
          drillHTML += '<div class="dim-drill-q">';
          drillHTML += '<div class="dim-drill-q-text">';
          drillHTML += '<span class="dim-drill-q-num">Q' + qs.id + '</span> ' + qs.text;
          if (qs.reversed) drillHTML += ' <span class="dim-drill-q-reversed" title="逆転項目">R</span>';
          drillHTML += '</div>';
          drillHTML += '<div class="dim-drill-q-bar-wrap">';
          drillHTML += '<div class="dim-drill-q-bar" style="width:' + qs.processedScore + '%;background:' + qRisk.color + ';"></div>';
          drillHTML += '</div>';
          drillHTML += '<span class="dim-drill-q-score" style="color:' + qRisk.color + '">' + qs.processedScore + '</span>';
          drillHTML += '</div>';
        }
        drillHTML += '</div>';

        // Deep-dive educational content (if available)
        if (dim.deepDive) {
          var dd = dim.deepDive;
          drillHTML += '<div class="dim-deep-dive">';
          drillHTML += '<div class="dim-deep-dive-toggle" tabindex="0" role="button" aria-label="もっと詳しく知る">もっと詳しく知る ▸</div>';
          drillHTML += '<div class="dim-deep-dive-body" style="display:none;">';
          drillHTML += '<div class="dim-dd-section"><div class="dim-dd-label">この項目について</div><p>' + dd.why + '</p></div>';
          drillHTML += '<div class="dim-dd-section"><div class="dim-dd-label">研究データ</div><p>' + dd.science + '</p></div>';
          drillHTML += '<div class="dim-dd-section"><div class="dim-dd-label">高スコアの例</div><p>' + dd.highExample + '</p></div>';
          drillHTML += '<div class="dim-dd-section"><div class="dim-dd-label">低スコアの例</div><p>' + dd.lowExample + '</p></div>';
          if (dd.actions && dd.actions.length > 0) {
            drillHTML += '<div class="dim-dd-section"><div class="dim-dd-label">具体的なアクション</div><ul class="dim-dd-actions">';
            for (var ai = 0; ai < dd.actions.length; ai++) {
              drillHTML += '<li>' + dd.actions[ai] + '</li>';
            }
            drillHTML += '</ul></div>';
          }
          drillHTML += '</div></div>';
        }

        // Academic reference
        drillHTML += '<div class="dim-drill-ref">' + dim.reference + '</div>';
        drillHTML += '</div>';

        row.innerHTML = mainHTML + drillHTML;
        container.appendChild(row);

        // Tap handler for deep-dive toggle
        var ddToggle = row.querySelector('.dim-deep-dive-toggle');
        if (ddToggle) {
          ddToggle.addEventListener('click', function(evt) {
            evt.stopPropagation();
            var body = this.nextElementSibling;
            if (body.style.display === 'none') {
              body.style.display = 'block';
              this.textContent = 'もっと詳しく知る ▾';
              // Re-measure parent panel max-height
              var parentPanel = this.closest('.dim-drill-panel');
              if (parentPanel) parentPanel.style.maxHeight = 'none';
            } else {
              body.style.display = 'none';
              this.textContent = 'もっと詳しく知る ▸';
            }
          });
        }

        // Tap handler for drill-down
        var header = row.querySelector('.dim-header-tap');
        header.addEventListener('click', function() {
          var panel = row.querySelector('.dim-drill-panel');
          var icon = row.querySelector('.dim-expand-icon');
          var isOpen = panel.style.display !== 'none';
          
          if (isOpen) {
            panel.style.maxHeight = panel.scrollHeight + 'px';
            requestAnimationFrame(function() {
              panel.style.transition = 'max-height 0.3s ease-out, opacity 0.2s ease-out';
              panel.style.maxHeight = '0px';
              panel.style.opacity = '0';
            });
            setTimeout(function() {
              panel.style.display = 'none';
              panel.style.transition = '';
              panel.style.maxHeight = '';
              panel.style.opacity = '';
            }, 300);
            icon.style.transform = 'rotate(0deg)';
            row.classList.remove('dim-row-expanded');
          } else {
            panel.style.display = 'block';
            panel.style.maxHeight = '0px';
            panel.style.opacity = '0';
            panel.style.overflow = 'hidden';
            requestAnimationFrame(function() {
              requestAnimationFrame(function() {
                panel.style.transition = 'max-height 0.4s ease-out, opacity 0.3s ease-out';
                panel.style.maxHeight = panel.scrollHeight + 'px';
                panel.style.opacity = '1';
              });
            });
            setTimeout(function() {
              panel.style.maxHeight = 'none';
              panel.style.overflow = '';
            }, 450);
            icon.style.transform = 'rotate(180deg)';
            row.classList.add('dim-row-expanded');
          }
        });
      })(di);
    }

    // Animate bars with staggered cascade
    requestAnimationFrame(function() {
      var bars = container.querySelectorAll('.dim-bar-fill');
      var nums = container.querySelectorAll('.dim-score-num');

      bars.forEach(function(bar, i) {
        var target = parseInt(bar.dataset.target);
        var delay = i * 100;
        var duration = 1000;

        setTimeout(function() {
          var startTime = performance.now();

          function tick(now) {
            var elapsed = now - startTime;
            var t = Math.min(elapsed / duration, 1);
            var eased = self._bounceOut(t);

            bar.style.transition = 'none';
            bar.style.width = (target * eased) + '%';

            if (nums[i]) {
              nums[i].textContent = Math.round(target * Math.min(t * 1.2, 1));
            }

            if (t < 1) {
              requestAnimationFrame(tick);
            } else {
              bar.style.width = target + '%';
              if (nums[i]) nums[i].textContent = target;
            }
          }
          requestAnimationFrame(tick);
        }, delay);
      });
    });
  },

  // ============================================================
  // Phase 2: Action Plan Rendering
  // ============================================================

  /**
   * Render personalized action plan with priority ordering and visual hierarchy.
   *
   * @param {HTMLElement} container - DOM container
   * @param {Object} actionPlan - From Scoring.generateActionPlan()
   */
  renderActionPlan(container, actionPlan) {
    if (!container) return;
    container.innerHTML = '';

    if (!actionPlan || actionPlan.priorities.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:24px 16px;color:var(--green);font-size:14px;">' +
        '<span style="font-size:24px;display:block;margin-bottom:8px;">\u2728</span>' +
        '全体的に良い状態です。今のまま続けていきましょう。' +
        '</div>';
      return;
    }

    // Urgency badge
    var urgencyColors = { critical: '#ef4444', high: '#f97316', moderate: '#eab308', low: '#22c55e' };
    var urgencyLabels = { critical: '\u7dca\u6025', high: '\u91cd\u8981', moderate: '\u901a\u5e38', low: '\u826f\u597d' };
    var uColor = urgencyColors[actionPlan.urgency] || '#eab308';
    var uLabel = urgencyLabels[actionPlan.urgency] || '\u901a\u5e38';

    var headerHTML = '<div class="action-plan-header">';
    headerHTML += '<span class="action-plan-urgency-badge" style="background:' + uColor + '20;color:' + uColor + ';">' + uLabel + '</span>';
    headerHTML += '<p class="action-plan-summary">' + actionPlan.summary + '</p>';
    headerHTML += '</div>';
    container.insertAdjacentHTML('beforeend', headerHTML);

    // Action items
    for (var i = 0; i < actionPlan.priorities.length; i++) {
      var item = actionPlan.priorities[i];
      var card = document.createElement('div');
      
      if (item.type === 'compound') {
        card.className = 'action-plan-item action-plan-compound';
        card.innerHTML =
          '<div class="action-plan-item-header">' +
            '<span class="action-plan-num" style="background:' + urgencyColors.critical + '20;color:' + urgencyColors.critical + ';">' + (i + 1) + '</span>' +
            '<span class="action-plan-item-icon">' + (item.icon || '\u26A0\uFE0F') + '</span>' +
            '<span class="action-plan-item-title">' + item.title + '</span>' +
          '</div>' +
          '<p class="action-plan-item-desc">' + item.description + '</p>';
      } else {
        var pColor = item.priority === 'high' ? urgencyColors.high : item.priority === 'medium' ? urgencyColors.moderate : '#6366f1';
        var timeframeLabel = item.timeframe === 'immediate' ? '\u4eca\u3059\u3050' : item.timeframe === 'short' ? '1-2\u9031\u9593' : '1-3\u30f6\u6708';
        var effortLabel = item.effort === 'low' ? '\u4f4e' : item.effort === 'medium' ? '\u4e2d' : '\u9ad8';
        
        card.className = 'action-plan-item';
        card.innerHTML =
          '<div class="action-plan-item-header">' +
            '<span class="action-plan-num" style="background:' + pColor + '20;color:' + pColor + ';">' + (i + 1) + '</span>' +
            '<div class="action-plan-item-title-group">' +
              '<span class="action-plan-item-title">' + item.title + '</span>' +
              (item.score !== undefined ? '<span class="action-plan-item-score" style="color:' + Scoring.getRiskLevel(item.score).color + ';">' + item.score + '/100</span>' : '') +
            '</div>' +
          '</div>' +
          '<p class="action-plan-item-desc">' + item.description + '</p>' +
          '<div class="action-plan-meta">' +
            '<span class="action-plan-tag">\u26F3 ' + timeframeLabel + '</span>' +
            '<span class="action-plan-tag">\u2699\uFE0F 手間:' + effortLabel + '</span>' +
            (item.category ? '<span class="action-plan-tag">' + item.category + '</span>' : '') +
          '</div>';
      }

      // Staggered entrance animation
      card.style.opacity = '0';
      card.style.transform = 'translateY(8px)';
      card.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
      container.appendChild(card);
      
      (function(el, delay) {
        setTimeout(function() {
          requestAnimationFrame(function() {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
          });
        }, delay);
      })(card, i * 80 + 100);
    }
  },

  // ============================================================
  // Phase 2: Correlation Insights Rendering
  // ============================================================

  /**
   * Render correlation-based insights between dimensions.
   *
   * @param {HTMLElement} container - DOM container
   * @param {Array} insights - From Scoring.getCorrelationInsights()
   */
  renderCorrelationInsights(container, insights) {
    if (!container) return;
    container.innerHTML = '';

    if (!insights || insights.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:16px;color:var(--text-muted);font-size:13px;">' +
        '特に気になる項目どうしの関連は見つかりませんでした' +
        '</div>';
      return;
    }

    for (var i = 0; i < insights.length; i++) {
      var ins = insights[i];
      var risk1 = Scoring.getRiskLevel(ins.score1);
      var risk2 = Scoring.getRiskLevel(ins.score2);
      
      var typeIcon, typeBg;
      if (ins.type === 'synergy_negative') {
        typeIcon = '\u26A0\uFE0F';
        typeBg = 'rgba(239,68,68,0.06)';
      } else if (ins.type === 'synergy_positive') {
        typeIcon = '\u2705';
        typeBg = 'rgba(34,197,94,0.06)';
      } else {
        typeIcon = '\uD83D\uDD0D';
        typeBg = 'rgba(99,102,241,0.06)';
      }

      var card = document.createElement('div');
      card.className = 'correlation-insight-card';
      card.style.background = typeBg;
      
      card.innerHTML =
        '<div class="correlation-insight-header">' +
          '<span class="correlation-insight-icon">' + typeIcon + '</span>' +
          '<div class="correlation-insight-dims">' +
            '<span class="correlation-dim-badge" style="color:' + risk1.color + '">' + ins.dim1Name + ' <small>' + ins.score1 + '</small></span>' +
            '<span class="correlation-arrow">\u2194</span>' +
            '<span class="correlation-dim-badge" style="color:' + risk2.color + '">' + ins.dim2Name + ' <small>' + ins.score2 + '</small></span>' +
          '</div>' +
        '</div>' +
        '<p class="correlation-insight-text">' + ins.interpretation + '</p>' +
        '<div class="correlation-strength">関連の強さ: ' + (ins.correlation >= 0.5 ? '強い' : ins.correlation >= 0.4 ? 'やや強い' : '中程度') + '</div>';

      container.appendChild(card);
    }
  },

  // ============================================================
  // Phase 2: Strengths Display
  // ============================================================

  /**
   * Render strengths section showing high-scoring dimensions.
   *
   * @param {HTMLElement} container - DOM container
   * @param {Array} strengths - From Scoring.getStrengths()
   */
  renderStrengths(container, strengths) {
    if (!container) return;
    container.innerHTML = '';

    if (!strengths || strengths.length === 0) return;

    var html = '<div class="strengths-grid">';
    for (var i = 0; i < strengths.length; i++) {
      var s = strengths[i];
      var risk = Scoring.getRiskLevel(s.score);
      html += '<div class="strength-badge">';
      html += '<span class="strength-score" style="color:' + risk.color + '">' + s.score + '</span>';
      html += '<span class="strength-name">' + s.dimName + '</span>';
      html += '<span class="strength-label">' + s.label + '</span>';
      html += '</div>';
    }
    html += '</div>';
    container.innerHTML = html;
  },

  // ============================================================
  // Dimension Trend Heatmap
  // ============================================================

  /**
   * Draw a heatmap grid showing per-dimension scores across historical assessments.
   * Rows = dimensions, Columns = assessment dates, Color = score.
   *
   * @param {HTMLElement} container - Container element
   * @param {Array} history - From DiagnosticHistory.getAll() (ascending by date)
   */
  drawDimensionHeatmap(container, history) {
    if (!container) return;
    container.innerHTML = '';

    if (!history || history.length < 2) {
      container.innerHTML = '<div style="text-align:center;padding:16px;color:var(--text-muted);font-size:13px;">診断を2回以上実施すると推移が表示されます</div>';
      return;
    }

    // Use last 10 entries max
    var entries = history.slice(Math.max(0, history.length - 10));
    var n = entries.length;
    var dims = DIMENSIONS;

    // Build table
    var table = document.createElement('div');
    table.className = 'heatmap-grid';
    table.style.cssText = 'overflow-x:auto;-webkit-overflow-scrolling:touch;';

    var html = '<table class="heatmap-table" style="width:100%;border-collapse:collapse;font-size:11px;">';

    // Header row: dates
    html += '<tr><th class="heatmap-corner"></th>';
    for (var ci = 0; ci < n; ci++) {
      var d = new Date(entries[ci].date);
      var label = (d.getMonth() + 1) + '/' + d.getDate();
      html += '<th class="heatmap-date">' + label + '</th>';
    }
    html += '</tr>';

    // Data rows: one per dimension
    for (var di = 0; di < dims.length; di++) {
      var dim = dims[di];
      html += '<tr>';
      html += '<td class="heatmap-dim-name">' + dim.name + '</td>';
      for (var ei = 0; ei < n; ei++) {
        var score = Number((entries[ei].dimensions && entries[ei].dimensions[dim.id]) || 0) || 0;
        var cellColor = this._heatmapColor(score);
        var textColor = score > 60 ? 'rgba(0,0,0,0.7)' : '#fff';
        html += '<td class="heatmap-cell" style="background:' + cellColor + ';color:' + textColor + ';">' + score + '</td>';
      }
      html += '</tr>';
    }

    html += '</table>';
    table.innerHTML = html;
    container.appendChild(table);
  },

  /**
   * Map score (0-100) to a color for heatmap cells.
   * @private
   */
  _heatmapColor(score) {
    if (score >= 80) return 'rgba(34,197,94,0.85)';  // green
    if (score >= 70) return 'rgba(34,197,94,0.5)';
    if (score >= 60) return 'rgba(234,179,8,0.5)';   // yellow
    if (score >= 50) return 'rgba(234,179,8,0.35)';
    if (score >= 40) return 'rgba(249,115,22,0.5)';   // orange
    if (score >= 30) return 'rgba(249,115,22,0.35)';
    return 'rgba(239,68,68,0.6)';                      // red
  },

  // ============================================================
  // Risk Velocity Badges
  // ============================================================

  /**
   * Render velocity indicators next to dimension bars and overall score.
   *
   * @param {HTMLElement} container - Container for velocity badges
   * @param {Object} velocity - From DiagnosticHistory.getVelocity()
   */
  renderVelocityBadges(container, velocity) {
    if (!container || !velocity || !velocity.overall) return;
    container.innerHTML = '';

    var overall = velocity.overall;

    // Overall velocity summary
    var overallHTML = '<div class="velocity-overall">';
    var arrow, color, text;
    if (overall.direction === 'improving') {
      arrow = '↗'; color = '#22c55e';
      text = '改善傾向（' + overall.slope + 'pt/回）';
    } else if (overall.direction === 'declining') {
      arrow = '↘'; color = '#ef4444';
      text = '悪化傾向（' + overall.slope + 'pt/回）';
    } else {
      arrow = '→'; color = 'var(--text-muted)';
      text = '安定（変化なし）';
    }

    // Acceleration indicator
    var accelHTML = '';
    if (overall.acceleration === 'accelerating') {
      accelHTML = '<span class="velocity-accel" style="color:#22c55e;">加速中</span>';
    } else if (overall.acceleration === 'decelerating') {
      accelHTML = '<span class="velocity-accel" style="color:#f97316;">減速中</span>';
    }

    overallHTML += '<span class="velocity-arrow" style="color:' + color + '">' + arrow + '</span>';
    overallHTML += '<span class="velocity-text">' + text + '</span>';
    overallHTML += accelHTML;
    overallHTML += '<span class="velocity-data-points">（過去' + overall.dataPoints + '回の診断から算出）</span>';
    overallHTML += '</div>';

    // Per-dimension velocities
    var dimHTML = '';
    var dims = velocity.dimensions;
    var hasDimData = false;

    for (var i = 0; i < DIMENSIONS.length; i++) {
      var dim = DIMENSIONS[i];
      var dv = dims[dim.id];
      if (!dv) continue;
      hasDimData = true;

      var dArrow, dColor;
      if (dv.direction === 'improving') { dArrow = '↗'; dColor = '#22c55e'; }
      else if (dv.direction === 'declining') { dArrow = '↘'; dColor = '#ef4444'; }
      else { dArrow = '→'; dColor = 'var(--text-muted)'; }

      dimHTML += '<div class="velocity-dim-row">';
      dimHTML += '<span class="velocity-dim-name">' + dim.name + '</span>';
      dimHTML += '<span class="velocity-dim-arrow" style="color:' + dColor + '">' + dArrow + ' ' + dv.slope + 'pt/回</span>';
      dimHTML += '</div>';
    }

    if (hasDimData) {
      dimHTML = '<div class="velocity-dimensions">' + dimHTML + '</div>';
    }

    container.innerHTML = overallHTML + dimHTML;
  },

  // ============================================================
  // Benchmark Bell Curves (Normative Percentile Visualization)
  // ============================================================

  /**
   * Render mini bell curves showing where the user's score falls
   * in the population distribution for each dimension.
   *
   * @param {HTMLElement} container
   * @param {Object<string, number>} dimensionScores
   */
  renderBenchmarkCurves(container, dimensionScores) {
    if (!container) return;
    container.innerHTML = '';

    var html = '<div class="benchmark-grid">';

    for (var i = 0; i < DIMENSIONS.length; i++) {
      var dim = DIMENSIONS[i];
      var score = dimensionScores[dim.id] || 0;
      var perc = Scoring.getDimensionPercentile(dim.id, score);
      var risk = Scoring.getRiskLevel(score);

      // Generate SVG bell curve
      var w = 140, h = 60;
      var svgParts = [];
      svgParts.push('<svg viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" class="benchmark-svg">');

      // Draw the bell curve path
      var curvePoints = [];
      for (var x = 0; x <= w; x += 2) {
        // Map x to z-score range (-3 to +3)
        var z = (x / w) * 6 - 3;
        // Normal distribution PDF
        var y = Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
        var py = h - 6 - y * (h - 12) * 2.5;
        curvePoints.push(x + ',' + py);
      }

      // Fill area under curve up to user's percentile
      var userX = Math.round((perc.percentile / 100) * w);

      // Shaded area (from left to user's position)
      var areaPath = 'M0,' + (h - 6);
      for (var ax = 0; ax <= userX; ax += 2) {
        var az = (ax / w) * 6 - 3;
        var ay = Math.exp(-0.5 * az * az) / Math.sqrt(2 * Math.PI);
        var apy = h - 6 - ay * (h - 12) * 2.5;
        areaPath += ' L' + ax + ',' + apy;
      }
      areaPath += ' L' + userX + ',' + (h - 6) + ' Z';
      svgParts.push('<path d="' + areaPath + '" fill="' + risk.color + '" opacity="0.25"/>');

      // Bell curve line
      svgParts.push('<polyline points="' + curvePoints.join(' ') + '" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>');

      // User position marker
      var markerZ = (userX / w) * 6 - 3;
      var markerY = Math.exp(-0.5 * markerZ * markerZ) / Math.sqrt(2 * Math.PI);
      var markerPy = h - 6 - markerY * (h - 12) * 2.5;
      svgParts.push('<line x1="' + userX + '" y1="' + markerPy + '" x2="' + userX + '" y2="' + (h - 6) + '" stroke="' + risk.color + '" stroke-width="2"/>');
      svgParts.push('<circle cx="' + userX + '" cy="' + markerPy + '" r="3" fill="' + risk.color + '"/>');

      svgParts.push('</svg>');

      html += '<div class="benchmark-item">';
      html += '<div class="benchmark-dim">' + dim.name + '</div>';
      html += svgParts.join('');
      html += '<div class="benchmark-meta">';
      html += '<span class="benchmark-percentile" style="color:' + risk.color + '">上位 ' + (100 - perc.percentile) + '%</span>';
      html += '<span class="benchmark-label">' + perc.label + '</span>';
      html += '</div>';
      html += '</div>';
    }

    html += '</div>';
    container.innerHTML = html;
  },

  // ============================================================
  // Risk DNA Shareable Visual Profile
  // ============================================================

  /**
   * Generate a unique "Risk DNA" radial visualization.
   * Creates an abstract, beautiful pattern encoding dimension scores.
   *
   * @param {Object<string, number>} dimensionScores - Dimension scores
   * @param {number} weightedScore - Overall weighted score
   * @returns {string|null} Data URL of the generated PNG
   */
  generateRiskDNA(dimensionScores, weightedScore) {
    var canvas = document.createElement('canvas');
    var size = 600;
    canvas.width = size;
    canvas.height = size;
    var ctx = canvas.getContext('2d');
    if (!ctx) return null;

    var cx = size / 2, cy = size / 2;
    var risk = Scoring.getRiskLevel(weightedScore);

    // Background - dark gradient
    var bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size / 2);
    bgGrad.addColorStop(0, '#0e0e24');
    bgGrad.addColorStop(1, '#07071a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, size, size);

    // Draw concentric rings for each dimension
    var dims = DIMENSIONS;
    var maxRadius = 220;
    var minRadius = 60;
    var ringWidth = (maxRadius - minRadius) / dims.length;

    // Color palette based on overall score
    var baseHue = weightedScore * 1.2; // 0=red(0), 100=green(120)

    for (var i = 0; i < dims.length; i++) {
      var dim = dims[i];
      var score = dimensionScores[dim.id] || 0;
      var radius = minRadius + i * ringWidth + ringWidth / 2;
      var dimRisk = Scoring.getRiskLevel(score);

      // Each dimension is a "petal" in the radial pattern
      var angleStep = (2 * Math.PI) / 60; // 60 segments per ring
      var amplitude = (score / 100) * ringWidth * 0.8;

      ctx.beginPath();
      for (var a = 0; a <= 360; a++) {
        var angle = (a * Math.PI) / 180;
        // Modulate radius based on score + dimension-specific pattern
        var noise = Math.sin(angle * (i + 3)) * 0.3 + Math.cos(angle * (i * 2 + 1)) * 0.2;
        var r = radius + amplitude * (0.5 + 0.5 * Math.sin(angle * (i + 2) + i)) + noise * (score / 100) * 8;
        var x = cx + r * Math.cos(angle);
        var y = cy + r * Math.sin(angle);
        if (a === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      // Ring fill with dim-specific color
      var hue = (baseHue + i * 25) % 360;
      var saturation = 50 + (score / 100) * 30;
      var lightness = 20 + (score / 100) * 30;
      var alpha = 0.15 + (score / 100) * 0.2;
      ctx.fillStyle = 'hsla(' + hue + ',' + saturation + '%,' + lightness + '%,' + alpha + ')';
      ctx.fill();

      // Ring stroke
      ctx.strokeStyle = 'hsla(' + hue + ',' + (saturation + 20) + '%,' + (lightness + 20) + '%,' + (alpha + 0.1) + ')';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    // Center circle with overall score
    ctx.beginPath();
    ctx.arc(cx, cy, minRadius - 10, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(10,10,26,0.9)';
    ctx.fill();
    ctx.strokeStyle = risk.color + '80';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Score number
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = risk.color;
    ctx.font = 'bold 36px -apple-system, sans-serif';
    ctx.fillText(String(weightedScore), cx, cy - 8);

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '12px -apple-system, sans-serif';
    ctx.fillText('/100', cx, cy + 18);

    // Title at top
    ctx.fillStyle = 'rgba(165,180,252,0.8)';
    ctx.font = 'bold 14px -apple-system, sans-serif';
    ctx.fillText('\u9000\u8077\u30EA\u30B9\u30AF DNA', cx, 30);

    // Risk label at bottom
    ctx.fillStyle = risk.color;
    ctx.font = 'bold 16px -apple-system, sans-serif';
    ctx.fillText(risk.label, cx, size - 30);

    // Dimension labels around the perimeter
    ctx.font = '10px -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    for (var li = 0; li < dims.length; li++) {
      var labelAngle = -Math.PI / 2 + (li / dims.length) * 2 * Math.PI;
      var labelR = maxRadius + 25;
      var lx = cx + labelR * Math.cos(labelAngle);
      var ly = cy + labelR * Math.sin(labelAngle);
      var lScore = dimensionScores[dims[li].id] || 0;
      ctx.fillStyle = Scoring.getRiskLevel(lScore).color + '99';
      ctx.fillText(dims[li].name, lx, ly);
    }

    try {
      return canvas.toDataURL('image/png');
    } catch (e) {
      return null;
    }
  },

  // ============================================================
  // Phase 2: Share Card Image Generation
  // ============================================================

  /**
   * Generate a shareable result card image using Canvas API.
   *
   * @param {Object} results - { overallScore, weightedScore, dimensionScores, compoundRisks }
   * @returns {string|null} Data URL of the generated PNG, or null if canvas unavailable
   */
  generateShareCard(results) {
    if (!results) return null;

    var canvas = document.createElement('canvas');
    var w = 600, h = 800;
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Compute risk BEFORE any usage (fix: was declared after first reference)
    var risk = Scoring.getRiskLevel(results.weightedScore);

    // Background
    var bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, '#07071a');
    bgGrad.addColorStop(0.5, '#0e0e24');
    bgGrad.addColorStop(1, '#07071a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Decorative orbs with multiple layers
    ctx.globalAlpha = 0.1;
    var orbGrad = ctx.createRadialGradient(80, 80, 0, 80, 80, 220);
    orbGrad.addColorStop(0, '#818cf8');
    orbGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = orbGrad;
    ctx.fillRect(0, 0, 300, 300);

    var orbGrad2 = ctx.createRadialGradient(520, 720, 0, 520, 720, 200);
    orbGrad2.addColorStop(0, '#7c3aed');
    orbGrad2.addColorStop(1, 'transparent');
    ctx.fillStyle = orbGrad2;
    ctx.fillRect(300, 520, 300, 280);

    var orbGrad3 = ctx.createRadialGradient(w / 2, 200, 0, w / 2, 200, 120);
    orbGrad3.addColorStop(0, risk.color);
    orbGrad3.addColorStop(1, 'transparent');
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = orbGrad3;
    ctx.fillRect(w / 2 - 120, 80, 240, 240);
    ctx.globalAlpha = 1;

    // Subtle grid pattern
    ctx.strokeStyle = 'rgba(99,102,241,0.03)';
    ctx.lineWidth = 0.5;
    for (var gx = 0; gx < w; gx += 40) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke();
    }
    for (var gy = 0; gy < h; gy += 40) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
    }

    // Title
    ctx.textAlign = 'center';
    ctx.fillStyle = '#a5b4fc';
    ctx.font = 'bold 14px -apple-system, sans-serif';
    ctx.fillText('はたらく環境診断', w / 2, 50);

    ctx.fillStyle = '#f0f0f5';
    ctx.font = 'bold 28px -apple-system, sans-serif';
    ctx.fillText('はたらく環境診断結果', w / 2, 90);

    // Gauge circle
    var cx = w / 2, cy = 200, gaugeR = 70;
    
    // Background arc
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, gaugeR, Math.PI * 0.75, Math.PI * 2.25);
    ctx.stroke();

    // Score arc with glow
    var scoreAngle = Math.PI * 0.75 + (Math.PI * 1.5) * (results.weightedScore / 100);

    // Glow layer
    ctx.save();
    ctx.shadowColor = risk.color;
    ctx.shadowBlur = 16;
    ctx.strokeStyle = risk.color;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, gaugeR, Math.PI * 0.75, scoreAngle);
    ctx.stroke();
    ctx.restore();

    // Sharp layer on top
    ctx.strokeStyle = risk.color;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, gaugeR, Math.PI * 0.75, scoreAngle);
    ctx.stroke();

    // Score number with subtle glow
    ctx.save();
    ctx.shadowColor = risk.color;
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#f0f0f5';
    ctx.font = 'bold 52px -apple-system, sans-serif';
    ctx.fillText(String(results.weightedScore), cx, cy + 12);
    ctx.restore();

    ctx.fillStyle = '#6b6b80';
    ctx.font = '14px -apple-system, sans-serif';
    ctx.fillText('/100', cx, cy + 34);

    // Risk label with emphasis
    ctx.fillStyle = risk.color;
    ctx.font = 'bold 20px -apple-system, sans-serif';
    ctx.fillText(risk.label, cx, cy + 68);

    // Dimension bars
    var barStartY = 310;
    var barLeft = 60;
    var barWidth = w - 120;
    
    ctx.textAlign = 'left';
    ctx.font = '12px -apple-system, sans-serif';
    ctx.fillStyle = '#a0a0b8';
    ctx.fillText('\u9805\u76EE\u5225\u30B9\u30B3\u30A2', barLeft, barStartY - 10);

    for (var di = 0; di < DIMENSIONS.length; di++) {
      var dim = DIMENSIONS[di];
      var score = results.dimensionScores[dim.id] || 0;
      var dimRisk = Scoring.getRiskLevel(score);
      var y = barStartY + di * 38;

      // Name
      ctx.textAlign = 'left';
      ctx.fillStyle = '#f0f0f5';
      ctx.font = '13px -apple-system, sans-serif';
      ctx.fillText(dim.name, barLeft, y + 12);

      // Score
      ctx.textAlign = 'right';
      ctx.fillStyle = dimRisk.color;
      ctx.font = 'bold 14px -apple-system, sans-serif';
      ctx.fillText(String(score), barLeft + barWidth, y + 12);

      // Bar track
      var barY = y + 18;
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      roundRect(ctx, barLeft, barY, barWidth, 4, 2);
      ctx.fill();

      // Bar fill
      ctx.fillStyle = dimRisk.color;
      var fillW = Math.max(2, barWidth * score / 100);
      roundRect(ctx, barLeft, barY, fillW, 4, 2);
      ctx.fill();
    }

    // Compound risks (if any)
    if (results.compoundRisks && results.compoundRisks.length > 0) {
      var crY = barStartY + DIMENSIONS.length * 38 + 20;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 12px -apple-system, sans-serif';
      ctx.fillText('\u26A0\uFE0F 注意: ' + results.compoundRisks.map(function(r) { return r.name; }).join(', '), barLeft, crY);
    }

    // Footer
    ctx.textAlign = 'center';
    ctx.fillStyle = '#6b6b80';
    ctx.font = '11px -apple-system, sans-serif';
    ctx.fillText('\u9000\u8077\u30EA\u30B9\u30AF\u8A3A\u65AD v3.1', w / 2, h - 30);

    // Rounded rect helper
    function roundRect(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }

    try {
      return canvas.toDataURL('image/png');
    } catch(e) {
      return null;
    }
  }

};
