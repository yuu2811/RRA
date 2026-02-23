/**
 * 退職リスク診断 - SVG Charts (Radar Chart & Gauge)
 */

const Charts = {
  /**
   * Draw circular gauge for overall score
   */
  drawGauge(svgElement, score, riskColor) {
    const cx = 100, cy = 100, r = 85;
    const circumference = 2 * Math.PI * r;
    const startAngle = -225;
    const totalAngle = 270;
    const scoreAngle = (score / 100) * totalAngle;

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
      </defs>
      <!-- Background arc -->
      <path d="${this._describeArc(cx, cy, r, startAngle, startAngle + totalAngle)}"
            fill="none" stroke="${bgTrackColor}" stroke-width="10" stroke-linecap="round"/>
      <!-- Score arc (animated) -->
      <path id="gauge-arc" d="${this._describeArc(cx, cy, r, startAngle, startAngle + totalAngle)}"
            fill="none" stroke="url(#gaugeGrad)" stroke-width="10" stroke-linecap="round"
            stroke-dasharray="${circumference}" stroke-dashoffset="${circumference}"
            filter="url(#gaugeShadow)"/>
    `;

    // Animate the gauge arc
    requestAnimationFrame(() => {
      const arc = document.getElementById('gauge-arc');
      if (!arc) return;
      const fraction = scoreAngle / 360;
      const dashLen = circumference * (totalAngle / 360);
      const filledLen = dashLen * (score / 100);
      const offset = dashLen - filledLen;

      // Set the correct dasharray for partial arc
      arc.setAttribute('stroke-dasharray', `${dashLen} ${circumference}`);
      arc.style.transition = 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)';
      arc.setAttribute('stroke-dashoffset', String(dashLen));

      requestAnimationFrame(() => {
        arc.setAttribute('stroke-dashoffset', String(offset));
      });
    });
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
   * Animate score counter
   */
  animateScore(element, target, duration = 1500) {
    const start = performance.now();
    const update = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = Math.round(target * eased);
      if (progress < 1) {
        requestAnimationFrame(update);
      }
    };
    requestAnimationFrame(update);
  },

  /**
   * Draw radar/spider chart
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

    // Risk zone colors
    const zoneColors = [
      'rgba(239,68,68,0.06)',   // 0-20 red zone
      'rgba(249,115,22,0.06)',  // 20-40 orange zone
      'rgba(234,179,8,0.06)',   // 40-60 yellow zone
      'rgba(34,197,94,0.04)',   // 60-80 green zone
      'rgba(34,197,94,0.03)'    // 80-100 green zone
    ];

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
      const score = dimensionScores[dim.id];
      const scoreColor = Scoring.getRiskLevel(score).color;

      labelsHTML += `<text x="${lx}" y="${ly}" fill="var(--text-secondary)" font-size="10" font-weight="600" text-anchor="${anchor}" dominant-baseline="middle">${dim.name}</text>`;
    }

    // Draw data polygon
    const dataPoints = [];
    for (let i = 0; i < n; i++) {
      const angle = startAngle + i * angleStep;
      const dim = dims[i];
      const score = dimensionScores[dim.id] || 0;
      const r = (score / 100) * maxR;
      dataPoints.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
    }
    const dataPath = dataPoints.map(p => `${p.x},${p.y}`).join(' ');

    // Score dots
    let dotsHTML = '';
    for (let i = 0; i < n; i++) {
      const dim = dims[i];
      const score = dimensionScores[dim.id] || 0;
      const color = Scoring.getRiskLevel(score).color;
      dotsHTML += `<circle cx="${dataPoints[i].x}" cy="${dataPoints[i].y}" r="4" fill="${color}" stroke="#fff" stroke-width="1" stroke-opacity="0.3"/>`;
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
      <polygon points="${dataPath}" fill="url(#radarGrad)" stroke="#818cf8" stroke-width="2" stroke-linejoin="round" opacity="0" class="radar-data">
        <animate attributeName="opacity" from="0" to="1" dur="0.8s" fill="freeze" begin="0.3s"/>
      </polygon>
      ${dotsHTML}
      ${labelsHTML}
    `;
  },

  /**
   * Render dimension detail bars
   */
  renderDimensionBars(container, dimensionScores) {
    container.innerHTML = '';
    for (const dim of DIMENSIONS) {
      const score = dimensionScores[dim.id];
      const risk = Scoring.getRiskLevel(score);

      const row = document.createElement('div');
      row.className = 'dim-row';
      row.innerHTML = `
        <div class="dim-header">
          <span class="dim-name">${dim.name}</span>
          <span class="dim-score-text" style="color:${risk.color}">${score}<small>/100</small></span>
        </div>
        <div class="dim-bar-track">
          <div class="dim-bar-fill" style="width:0%;background:${risk.color};" data-target="${score}"></div>
        </div>
      `;
      container.appendChild(row);
    }

    // Animate bars
    requestAnimationFrame(() => {
      const bars = container.querySelectorAll('.dim-bar-fill');
      bars.forEach((bar, i) => {
        setTimeout(() => {
          bar.style.width = bar.dataset.target + '%';
        }, i * 80);
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
