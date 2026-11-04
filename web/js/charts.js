// charts.js
// Draws charts with Chart.js. Every number and label comes from the C++ server:
// this file only decides how they look. Colours are read from tokens.css, and
// charts are rebuilt when the theme changes.

const CHART_FONT = "IBM Plex Mono";

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

  // Rebuilds every chart still on the page, in the new theme's colours.
  // A chart can have left the page when its sheet switched to a table.
  redraw() {
    Charts.live = Charts.live.filter((entry) => {
      if (entry.canvas.isConnected) {
        return true;
      }
      entry.chart.destroy();
      return false;
    });
    Charts.live.forEach((entry) => {
      entry.chart.destroy();
      entry.chart = entry.build(entry.canvas);
    });
  },

  // The tooltip style shared by every chart.
  tooltip(callbacks) {
    return {
      backgroundColor: Charts.color("--ink"),
      titleColor: Charts.color("--sheet"),
      bodyColor: Charts.color("--sheet"),
      titleFont: { family: CHART_FONT, size: 11.5, weight: "500" },
      bodyFont: { family: CHART_FONT, size: 13, weight: "600" },
      padding: 10,
      cornerRadius: 0,
      caretSize: 0,
      displayColors: false,
      callbacks,
    };
  },

  // Settings shared by every chart.
  baseOptions(callbacks) {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: reducedMotion ? false : { duration: 350 },
      layout: { padding: { top: 6, right: 6 } },
      plugins: { legend: { display: false }, tooltip: Charts.tooltip(callbacks) },
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
        color: Charts.color("--ink-3"),
        font: { family: CHART_FONT, size: 11.5 },
        callback: (value) => `${value}%`,
      },
    };
  },

  // The category axis, which needs no grid lines.
  labelAxis() {
    return {
      border: { color: Charts.color("--rule-heavy") },
      grid: { display: false },
      ticks: {
        color: Charts.color("--ink-2"),
        font: { family: CHART_FONT, size: 11.5 },
        maxRotation: 0,
        autoSkipPadding: 10,
      },
    };
  },

  // Plugin: marks the minimum attendance in red pen, and tints the area below it.
  limitLine(limit, horizontalBars) {
    return {
      id: "limitLine",
      beforeDatasetsDraw(chart) {
        const { ctx, chartArea, scales } = chart;
        ctx.save();
        ctx.fillStyle = Charts.color("--chart-danger");
        if (horizontalBars) {
          const x = scales.x.getPixelForValue(limit);
          ctx.fillRect(chartArea.left, chartArea.top, x - chartArea.left, chartArea.height);
        } else {
          const y = scales.y.getPixelForValue(limit);
          ctx.fillRect(chartArea.left, y, chartArea.width, chartArea.bottom - y);
        }
        ctx.restore();
      },
      afterDatasetsDraw(chart) {
        const { ctx, chartArea, scales } = chart;
        const color = Charts.color("--bad-text");

        ctx.save();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 1.5;
        ctx.font = `600 11px ${CHART_FONT}`;
        ctx.beginPath();

        if (horizontalBars) {
          const x = scales.x.getPixelForValue(limit);
          ctx.moveTo(x, chartArea.top);
          ctx.lineTo(x, chartArea.bottom);
          ctx.textAlign = "center";
          ctx.textBaseline = "bottom";
          ctx.fillText(`${limit}% min`, x, chartArea.top - 3);
        } else {
          const y = scales.y.getPixelForValue(limit);
          ctx.moveTo(chartArea.left, y);
          ctx.lineTo(chartArea.right, y);
          ctx.textBaseline = "top";
          ctx.fillText(`${limit}% minimum`, chartArea.left + 6, y + 4);
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
      ctx.strokeStyle = Charts.color("--ink-3");
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(active[0].element.x, chartArea.top);
      ctx.lineTo(active[0].element.x, chartArea.bottom);
      ctx.stroke();
      ctx.restore();
    },
  },

  // Plugin: writes the latest value above the last point of a line.
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
        ctx.fillStyle = Charts.color("--ink");
        ctx.font = `600 12px ${CHART_FONT}`;
        ctx.textAlign = "right";
        ctx.fillText(text, last.x + 4, last.y - 11);
        ctx.restore();
      },
    };
  },

  // Plugin: writes each bar's value just past its tip. The chart keeps room on
  // the right for this, and a patch of background keeps the text off the lines.
  barLabels(texts) {
    return {
      id: "barLabels",
      afterDatasetsDraw(chart) {
        const { ctx } = chart;
        ctx.save();
        ctx.font = `600 12px ${CHART_FONT}`;
        ctx.textBaseline = "middle";

        chart.getDatasetMeta(0).data.forEach((bar, index) => {
          const width = ctx.measureText(texts[index]).width;
          ctx.fillStyle = Charts.color("--sheet");
          ctx.fillRect(bar.x + 3, bar.y - 8, width + 6, 16);
          ctx.fillStyle = Charts.color("--ink");
          ctx.fillText(texts[index], bar.x + 6, bar.y);
        });
        ctx.restore();
      },
    };
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
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointHitRadius: 24,
          pointBackgroundColor: Charts.color("--chart-1"),
          pointBorderColor: Charts.color("--sheet"),
          pointBorderWidth: 2,
          pointHoverBackgroundColor: Charts.color("--chart-1"),
          pointHoverBorderColor: Charts.color("--sheet"),
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

  // Horizontal bars, one per row, with the value at the tip.
  // Server rows have percent and percentText. The three functions pick out
  // each row's axis label, tooltip title, and tooltip detail.
  percentBars(canvas, rows, limit, labelOf, titleOf, detailOf) {
    return Charts.add(canvas, (target) => new Chart(target, {
      type: "bar",
      data: {
        labels: rows.map(labelOf),
        datasets: [{
          data: rows.map((row) => row.percent),
          backgroundColor: Charts.color("--chart-1"),
          hoverBackgroundColor: Charts.color("--ink"),
          maxBarThickness: 20,
        }],
      },
      options: {
        ...Charts.baseOptions({
          title: (items) => titleOf(rows[items[0].dataIndex]),
          label: (item) => `${rows[item.dataIndex].percentText} present`,
          afterLabel: (item) => detailOf(rows[item.dataIndex]),
        }),
        indexAxis: "y",
        layout: { padding: { top: 18, right: 58 } },
        scales: { x: Charts.percentAxis(), y: Charts.labelAxis() },
      },
      plugins: [
        Charts.limitLine(limit, true),
        Charts.barLabels(rows.map((row) => row.percentText)),
      ],
    }));
  },

  // Stacked bars of present and absent students in each subject on one day.
  // Server rows have: code, name, className, present, absent.
  daily(canvas, rows) {
    const series = (label, key, color) => ({
      label,
      data: rows.map((row) => row[key]),
      backgroundColor: Charts.color(color),
      borderColor: Charts.color("--sheet"),
      borderWidth: { right: 2 },
      maxBarThickness: 20,
    });

    return Charts.add(canvas, (target) => {
      const options = Charts.baseOptions({
        title: (items) => {
          const row = rows[items[0].dataIndex];
          return `${row.code}, ${row.name} (${row.className})`;
        },
        label: (item) => `${item.dataset.label}: ${item.raw}`,
      });

      options.plugins.legend = {
        display: true,
        position: "top",
        align: "start",
        labels: {
          boxWidth: 12,
          boxHeight: 12,
          color: Charts.color("--ink-2"),
          font: { family: CHART_FONT, size: 12 },
        },
      };
      options.indexAxis = "y";
      options.interaction = { mode: "index", intersect: false, axis: "y" };
      options.scales = {
        x: {
          stacked: true,
          border: { display: false },
          grid: { color: Charts.color("--chart-grid") },
          ticks: { precision: 0, color: Charts.color("--ink-3"), font: { family: CHART_FONT, size: 11.5 } },
        },
        y: { ...Charts.labelAxis(), stacked: true },
      };

      return new Chart(target, {
        type: "bar",
        data: {
          labels: rows.map((row) => row.code),
          datasets: [series("Present", "present", "--chart-1"), series("Absent", "absent", "--chart-2")],
        },
        options,
      });
    });
  },
};

window.addEventListener("themechange", () => Charts.redraw());
