// charts.js
// Draws charts with Chart.js. Every number and label comes from the C++ server:
// this file only decides how they look. Colours are read from tokens.css, and
// charts are rebuilt when the theme changes.

const CHART_FONT = '"DM Sans", system-ui, sans-serif';

const Charts = {
  live: [],   // each entry remembers how to rebuild its chart

  // Chart.js loads from a CDN, so it is missing when there is no internet.
  available() {
    return typeof Chart !== "undefined";
  },

  color(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  },

  // Creates a chart and remembers it for theme changes. A canvas cannot use a
  // web font until it has loaded, so the chart is drawn again when it arrives.
  add(canvas, build) {
    const entry = { build, canvas, chart: build(canvas) };
    Charts.live.push(entry);
    if (!document.fonts.check(`500 12px ${CHART_FONT}`)) {
      document.fonts.load(`500 12px ${CHART_FONT}`).then(() => Charts.redraw()).catch(() => {});
    }
    return entry;
  },

  // Removes every chart. Called when leaving a page.
  clear() {
    Charts.live.forEach((entry) => entry.chart.destroy());
    Charts.live = [];
  },

  // Rebuilds every chart still on the page, in the new theme's colours.
  // A chart can have left the page when its tile switched to a table.
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

  // A left to right gradient across the chart, for lines and bars.
  sweep(chart) {
    const { ctx, chartArea } = chart;
    if (!chartArea) {
      return Charts.color("--chart");
    }
    const gradient = ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
    gradient.addColorStop(0, Charts.color("--glow-a"));
    gradient.addColorStop(0.5, Charts.color("--glow-b"));
    gradient.addColorStop(1, Charts.color("--glow-c"));
    return gradient;
  },

  // A soft wash from the line down to the axis, for area charts.
  wash(chart) {
    const { ctx, chartArea } = chart;
    if (!chartArea) {
      return "transparent";
    }
    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    gradient.addColorStop(0, Charts.color("--chart-wash-top"));
    gradient.addColorStop(1, Charts.color("--chart-wash-end"));
    return gradient;
  },

  // The tooltip style shared by every chart.
  tooltip(callbacks) {
    return {
      backgroundColor: Charts.color("--float-bg"),
      titleColor: Charts.color("--float-ink-2"),
      bodyColor: Charts.color("--float-ink"),
      titleFont: { family: CHART_FONT, size: 12, weight: "500" },
      bodyFont: { family: CHART_FONT, size: 14, weight: "700" },
      padding: 12,
      cornerRadius: 14,
      caretSize: 0,
      displayColors: false,
      callbacks,
    };
  },

  // Settings shared by every chart.
  baseOptions(callbacks) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: UI.wantsMotion() ? { duration: 650, easing: "easeOutQuart" } : false,
      layout: { padding: { top: 20, right: 8 } },
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
        font: { family: CHART_FONT, size: 12 },
        callback: (value) => `${value}%`,
      },
    };
  },

  // The category axis, which needs no grid lines.
  labelAxis() {
    return {
      border: { display: false },
      grid: { display: false },
      ticks: {
        color: Charts.color("--ink-2"),
        font: { family: CHART_FONT, size: 12.5, weight: "500" },
        maxRotation: 0,
        autoSkipPadding: 12,
      },
    };
  },

  // Plugin: a dashed line at the minimum attendance, with its value.
  limitLine(limit, horizontalBars) {
    return {
      id: "limitLine",
      afterDatasetsDraw(chart) {
        const { ctx, chartArea, scales } = chart;
        const color = Charts.color("--bad-text");

        ctx.save();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);
        ctx.font = `600 12px ${CHART_FONT}`;
        ctx.beginPath();

        if (horizontalBars) {
          const x = scales.x.getPixelForValue(limit);
          ctx.moveTo(x, chartArea.top);
          ctx.lineTo(x, chartArea.bottom);
          ctx.textAlign = "center";
          ctx.textBaseline = "bottom";
          ctx.fillText(`${limit}% minimum`, x, chartArea.top - 4);
        } else {
          const y = scales.y.getPixelForValue(limit);
          ctx.moveTo(chartArea.left, y);
          ctx.lineTo(chartArea.right, y);
          ctx.textBaseline = "top";
          ctx.fillText(`${limit}% minimum`, chartArea.left + 6, y + 5);
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
      ctx.strokeStyle = Charts.color("--line-strong");
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(active[0].element.x, chartArea.top);
      ctx.lineTo(active[0].element.x, chartArea.bottom);
      ctx.stroke();
      ctx.restore();
    },
  },

  // Plugin: writes the latest value above the last point of a line.
  endLabel(text) {
    return {
      id: "endLabel",
      afterDatasetsDraw(chart) {
        const points = chart.getDatasetMeta(0).data;
        if (points.length === 0) {
          return;
        }
        const last = points[points.length - 1];
        const { ctx } = chart;
        ctx.save();
        ctx.fillStyle = Charts.color("--ink");
        ctx.font = `700 13px ${CHART_FONT}`;
        ctx.textAlign = "right";
        ctx.fillText(text, last.x + 4, last.y - 12);
        ctx.restore();
      },
    };
  },

  // Plugin: writes each bar's value just past its tip. The chart keeps room on
  // the right for this.
  barLabels(texts) {
    return {
      id: "barLabels",
      afterDatasetsDraw(chart) {
        const { ctx } = chart;
        ctx.save();
        ctx.font = `700 12.5px ${CHART_FONT}`;
        ctx.textBaseline = "middle";
        ctx.fillStyle = Charts.color("--ink");

        chart.getDatasetMeta(0).data.forEach((bar, index) => {
          ctx.fillText(texts[index], bar.x + 8, bar.y);
        });
        ctx.restore();
      },
    };
  },

  // Area chart of attendance on each marked day.
  // Server rows have: label, date, percent, percentText, present, total.
  trend(canvas, rows, limit) {
    const lastIndex = rows.length - 1;

    return Charts.add(canvas, (target) => new Chart(target, {
      type: "line",
      data: {
        labels: rows.map((row) => row.label),
        datasets: [{
          data: rows.map((row) => row.percent),
          borderColor: (context) => Charts.sweep(context.chart),
          backgroundColor: (context) => Charts.wash(context.chart),
          fill: true,
          borderWidth: 3.5,
          cubicInterpolationMode: "monotone",
          borderCapStyle: "round",
          pointRadius: (context) => (context.dataIndex === lastIndex ? 5 : 0),
          pointHoverRadius: 7,
          pointHitRadius: 24,
          pointBackgroundColor: Charts.color("--glow-c"),
          pointBorderColor: Charts.color("--tile"),
          pointBorderWidth: 2.5,
          pointHoverBackgroundColor: Charts.color("--glow-b"),
          pointHoverBorderColor: Charts.color("--tile"),
          pointHoverBorderWidth: 3,
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
        Charts.endLabel(rows[lastIndex].percentText),
      ],
    }));
  },

  // Rounded horizontal bars, one per row, with the value at the tip.
  // Server rows have percent and percentText. The three functions pick out
  // each row's axis label, tooltip title, and tooltip detail.
  percentBars(canvas, rows, limit, labelOf, titleOf, detailOf) {
    return Charts.add(canvas, (target) => new Chart(target, {
      type: "bar",
      data: {
        labels: rows.map(labelOf),
        datasets: [{
          data: rows.map((row) => row.percent),
          backgroundColor: (context) => Charts.sweep(context.chart),
          borderRadius: 9,
          borderSkipped: false,
          maxBarThickness: 18,
        }],
      },
      options: {
        ...Charts.baseOptions({
          title: (items) => titleOf(rows[items[0].dataIndex]),
          label: (item) => `${rows[item.dataIndex].percentText} present`,
          afterLabel: (item) => detailOf(rows[item.dataIndex]),
        }),
        indexAxis: "y",
        layout: { padding: { top: 22, right: 64 } },
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
      borderColor: Charts.color("--tile"),
      borderWidth: 2,
      borderRadius: 9,
      borderSkipped: false,
      maxBarThickness: 24,
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
          boxWidth: 10,
          boxHeight: 10,
          usePointStyle: true,
          pointStyle: "circle",
          color: Charts.color("--ink-2"),
          font: { family: CHART_FONT, size: 13, weight: "500" },
        },
      };
      options.indexAxis = "y";
      options.interaction = { mode: "index", intersect: false, axis: "y" };
      options.scales = {
        x: {
          stacked: true,
          border: { display: false },
          grid: { color: Charts.color("--chart-grid") },
          ticks: { precision: 0, color: Charts.color("--ink-3"), font: { family: CHART_FONT, size: 12 } },
        },
        y: { ...Charts.labelAxis(), stacked: true },
      };

      return new Chart(target, {
        type: "bar",
        data: {
          labels: rows.map((row) => row.code),
          datasets: [series("Present", "present", "--chart"), series("Absent", "absent", "--bad")],
        },
        options,
      });
    });
  },
};

window.addEventListener("themechange", () => Charts.redraw());
