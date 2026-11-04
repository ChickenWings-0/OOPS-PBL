// charts.js
// Draws charts with Chart.js. Every number and label comes from the C++ server:
// this file only decides how they look. Colours are read from tokens.css, and
// charts are rebuilt when the theme changes.

const Charts = {
  live: [],   // each entry remembers how to rebuild its chart

  // Chart.js loads from a CDN, so it is missing when there is no internet.
  available() {
    return typeof Chart !== "undefined";
  },

  color(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  },

  // Creates a chart and remembers it for theme changes.
  add(canvas, build) {
    const entry = { build, canvas, chart: build(canvas) };
    Charts.live.push(entry);
    return entry;
  },

  // Removes every chart. Called when leaving a page.
  clear() {
    Charts.live.forEach((entry) => entry.chart.destroy());
    Charts.live = [];
  },

  // Rebuilds every chart with the new theme's colours.
  redraw() {
    Charts.live.forEach((entry) => {
      entry.chart.destroy();
      entry.chart = entry.build(entry.canvas);
    });
  },

  // Settings shared by every chart.
  baseOptions(tooltipCallbacks) {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: reducedMotion ? false : { duration: 450 },
      layout: { padding: { top: 8, right: 8 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: Charts.color("--bg-surface"),
          borderColor: Charts.color("--border"),
          borderWidth: 1,
          titleColor: Charts.color("--text-secondary"),
          bodyColor: Charts.color("--text"),
          titleFont: { family: "Inter", size: 12, weight: "500" },
          bodyFont: { family: "Inter", size: 13, weight: "600" },
          padding: 10,
          cornerRadius: 8,
          displayColors: false,
          callbacks: tooltipCallbacks,
        },
      },
    };
  },

  // A percentage axis: always 0 to 100, so charts can never exaggerate a change.
  percentAxis() {
    return {
      min: 0,
      max: 100,
      border: { display: false },
      grid: { color: Charts.color("--chart-grid") },
      ticks: {
        stepSize: 25,
        color: Charts.color("--text-muted"),
        font: { family: "Inter", size: 12 },
        callback: (value) => `${value}%`,
      },
    };
  },

  // The category axis, which needs no grid lines.
  labelAxis() {
    return {
      border: { color: Charts.color("--border") },
      grid: { display: false },
      ticks: {
        color: Charts.color("--text-muted"),
        font: { family: "Inter", size: 12 },
        maxRotation: 0,
        autoSkipPadding: 12,
      },
    };
  },

  // Plugin: a thin line across the chart at the attendance limit, with its label.
  // On horizontal bars the label sits above the line, in the chart's top padding.
  limitLine(limit, horizontalBars) {
    return {
      id: "limitLine",
      afterDatasetsDraw(chart) {
        const { ctx, chartArea, scales } = chart;
        const color = Charts.color("--text-muted");

        ctx.save();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 1;
        ctx.font = "500 11px Inter, sans-serif";
        ctx.beginPath();

        if (horizontalBars) {
          const x = scales.x.getPixelForValue(limit);
          ctx.moveTo(x, chartArea.top);
          ctx.lineTo(x, chartArea.bottom);
          ctx.textAlign = "center";
          ctx.textBaseline = "bottom";
          ctx.fillText(`${limit}% limit`, x, chartArea.top - 4);
        } else {
          const y = scales.y.getPixelForValue(limit);
          ctx.moveTo(chartArea.left, y);
          ctx.lineTo(chartArea.right, y);
          ctx.textBaseline = "top";
          ctx.fillText(`${limit}% limit`, chartArea.left + 6, y + 4);
        }

        ctx.stroke();
        ctx.restore();
      },
    };
  },

  // Plugin: a vertical line that follows the pointer, so readers can aim at a date.
  crosshair: {
    id: "crosshair",
    afterDatasetsDraw(chart) {
      const active = chart.tooltip.getActiveElements();
      if (active.length === 0) {
        return;
      }
      const { ctx, chartArea } = chart;
      ctx.save();
      ctx.strokeStyle = Charts.color("--text-muted");
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(active[0].element.x, chartArea.top);
      ctx.lineTo(active[0].element.x, chartArea.bottom);
      ctx.stroke();
      ctx.restore();
    },
  },

  // Plugin: writes the latest value next to the last point of a line.
  // A narrow chart has no room for it, and the tooltip and table still show it.
  endLabel(text) {
    return {
      id: "endLabel",
      afterDatasetsDraw(chart) {
        const points = chart.getDatasetMeta(0).data;
        if (points.length === 0 || chart.width < 420) {
          return;
        }
        const last = points[points.length - 1];
        const { ctx } = chart;
        ctx.save();
        ctx.fillStyle = Charts.color("--text");
        ctx.font = "600 12px Inter, sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(text, last.x + 6, last.y - 12);
        ctx.restore();
      },
    };
  },

  // Plugin: writes each bar's value just past its tip. The chart keeps room on
  // the right for this, and a patch of background keeps the text clear of the
  // limit line.
  barLabels(texts) {
    return {
      id: "barLabels",
      afterDatasetsDraw(chart) {
        const { ctx } = chart;
        ctx.save();
        ctx.font = "600 12px Inter, sans-serif";
        ctx.textBaseline = "middle";

        chart.getDatasetMeta(0).data.forEach((bar, index) => {
          const width = ctx.measureText(texts[index]).width;
          ctx.fillStyle = Charts.color("--bg-surface");
          ctx.fillRect(bar.x + 3, bar.y - 9, width + 6, 18);
          ctx.fillStyle = Charts.color("--text");
          ctx.fillText(texts[index], bar.x + 6, bar.y);
        });
        ctx.restore();
      },
    };
  },

  // A soft fill under a line: strongest at the top, fading to nothing.
  fadeFill(context) {
    const { ctx, chartArea } = context.chart;
    if (!chartArea) {
      return Charts.color("--chart-wash");
    }
    const fill = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    fill.addColorStop(0, Charts.color("--chart-wash"));
    fill.addColorStop(1, "transparent");
    return fill;
  },

  // Line chart of attendance on each marked day.
  // Server rows have: label, date, percent, percentText, present, total.
  trend(canvas, rows, limit) {
    return Charts.add(canvas, (target) => new Chart(target, {
      type: "line",
      data: {
        labels: rows.map((row) => row.label),
        datasets: [{
          data: rows.map((row) => row.percent),
          borderColor: Charts.color("--chart-1"),
          backgroundColor: Charts.fadeFill,
          borderWidth: 2,
          fill: true,
          tension: 0.25,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointHitRadius: 24,
          pointBackgroundColor: Charts.color("--chart-1"),
          pointBorderColor: Charts.color("--bg-surface"),
          pointBorderWidth: 2,
          pointHoverBackgroundColor: Charts.color("--chart-1"),
          pointHoverBorderColor: Charts.color("--bg-surface"),
          pointHoverBorderWidth: 2,
        }],
      },
      options: {
        ...Charts.baseOptions({
          title: (items) => rows[items[0].dataIndex].date,
          label: (item) => `${rows[item.dataIndex].percentText} present`,
          afterLabel: (item) => `${rows[item.dataIndex].present} of ${rows[item.dataIndex].total} marks`,
        }),
        interaction: { mode: "index", intersect: false },
        scales: { x: Charts.labelAxis(), y: Charts.percentAxis() },
      },
      plugins: [
        Charts.limitLine(limit, false),
        Charts.crosshair,
        Charts.endLabel(rows[rows.length - 1].percentText),
      ],
    }));
  },

  // Horizontal bars of attendance in each subject.
  // Server rows have: code, name, className, percent, percentText, present, total.
  subjects(canvas, rows, limit) {
    return Charts.add(canvas, (target) => new Chart(target, {
      type: "bar",
      data: {
        labels: rows.map((row) => row.code),
        datasets: [{
          data: rows.map((row) => row.percent),
          backgroundColor: Charts.color("--chart-1"),
          hoverBackgroundColor: Charts.color("--accent-hover"),
          maxBarThickness: 24,
          borderRadius: 4,
          borderSkipped: "start",
        }],
      },
      options: {
        ...Charts.baseOptions({
          title: (items) => {
            const row = rows[items[0].dataIndex];
            return `${row.code}, ${row.name} (${row.className})`;
          },
          label: (item) => `${rows[item.dataIndex].percentText} present`,
          afterLabel: (item) => `${rows[item.dataIndex].present} of ${rows[item.dataIndex].total} marks`,
        }),
        indexAxis: "y",
        layout: { padding: { top: 20, right: 56 } },
        scales: { x: Charts.percentAxis(), y: Charts.labelAxis() },
      },
      plugins: [
        Charts.limitLine(limit, true),
        Charts.barLabels(rows.map((row) => row.percentText)),
      ],
    }));
  },
};

window.addEventListener("themechange", () => Charts.redraw());
