---
title: "Data Visualization"
date: 2026-01-13
draft: false
---

<section class="dataviz-page">
  <div class="dataviz-intro">
    <h2>Interactive visualization of the Top-Five journal dataset</h2>
    <p>
      This page loads the data hosted in the
      <a href="https://github.com/sihao-li/Top-Five-journal-of-economics" target="_blank" rel="noopener">Top-Five journal of economics</a>
      repository and lets you explore it interactively. Choose a dataset, then map variables to the axes to update the chart.
    </p>
  </div>

  <div class="dataviz-controls">
    <label for="datasetSelect">Dataset</label>
    <select id="datasetSelect"></select>

    <label for="xSelect">X axis</label>
    <select id="xSelect"></select>

    <label for="ySelect">Y axis</label>
    <select id="ySelect"></select>

    <label for="colorSelect">Color by (optional)</label>
    <select id="colorSelect"></select>

    <button id="updatePlot" type="button">Update chart</button>
  </div>

  <div id="datavizStatus" class="dataviz-status" aria-live="polite"></div>
  <div id="datavizPlot" class="dataviz-plot"></div>
</section>

<script src="https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js"></script>
<script src="https://cdn.plot.ly/plotly-2.30.0.min.js"></script>
<script>
  const repoOwner = "sihao-li";
  const repoName = "Top-Five-journal-of-economics";
  const repoBranch = "main";

  const datasetSelect = document.getElementById("datasetSelect");
  const xSelect = document.getElementById("xSelect");
  const ySelect = document.getElementById("ySelect");
  const colorSelect = document.getElementById("colorSelect");
  const updateButton = document.getElementById("updatePlot");
  const statusEl = document.getElementById("datavizStatus");
  const plotEl = document.getElementById("datavizPlot");

  let currentData = [];

  const setStatus = (message) => {
    statusEl.textContent = message;
  };

  const optionFor = (value, label = value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    return option;
  };

  const resetSelect = (select, placeholder) => {
    select.innerHTML = "";
    select.appendChild(optionFor("", placeholder));
  };

  const fetchRepoTree = async () => {
    setStatus("Loading repository data...");
    const treeUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/git/trees/${repoBranch}?recursive=1`;
    const response = await fetch(treeUrl);
    if (!response.ok) {
      throw new Error("Unable to reach the GitHub API.");
    }
    const treeData = await response.json();
    return treeData.tree || [];
  };

  const populateDatasets = async () => {
    try {
      const tree = await fetchRepoTree();
      const datasetPaths = tree
        .filter((item) => item.type === "blob")
        .map((item) => item.path)
        .filter((path) => path.match(/\.(csv|tsv)$/i));

      datasetSelect.innerHTML = "";
      datasetSelect.appendChild(optionFor("", "Select a dataset"));

      datasetPaths.forEach((path) => {
        datasetSelect.appendChild(optionFor(path));
      });

      if (datasetPaths.length === 0) {
        setStatus("No CSV/TSV files were found in the repository.");
      } else {
        setStatus("Choose a dataset to begin.");
      }
    } catch (error) {
      setStatus("Unable to load repository data. Please try again later.");
      console.error(error);
    }
  };

  const getNumericColumns = (rows) => {
    if (rows.length === 0) {
      return [];
    }
    const columns = Object.keys(rows[0]);
    return columns.filter((column) =>
      rows.some((row) => typeof row[column] === "number" && !Number.isNaN(row[column]))
    );
  };

  const getCategoricalColumns = (rows) => {
    if (rows.length === 0) {
      return [];
    }
    return Object.keys(rows[0]).filter((column) => typeof rows[0][column] === "string");
  };

  const updateSelectors = (rows) => {
    const numericColumns = getNumericColumns(rows);
    const categoricalColumns = getCategoricalColumns(rows);

    resetSelect(xSelect, "Select X axis");
    resetSelect(ySelect, "Select Y axis");
    resetSelect(colorSelect, "No color grouping");

    numericColumns.forEach((column) => {
      xSelect.appendChild(optionFor(column));
      ySelect.appendChild(optionFor(column));
    });

    categoricalColumns.forEach((column) => {
      colorSelect.appendChild(optionFor(column));
    });

    if (numericColumns.length >= 2) {
      xSelect.value = numericColumns[0];
      ySelect.value = numericColumns[1];
    } else if (numericColumns.length === 1) {
      xSelect.value = numericColumns[0];
    }
  };

  const parseDataset = async (path) => {
    const rawUrl = `https://raw.githubusercontent.com/${repoOwner}/${repoName}/${repoBranch}/${path}`;
    const response = await fetch(rawUrl);
    if (!response.ok) {
      throw new Error("Unable to fetch dataset.");
    }
    const text = await response.text();
    const delimiter = path.toLowerCase().endsWith(".tsv") ? "\t" : ",";
    const parsed = Papa.parse(text, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      delimiter,
    });
    if (parsed.errors.length) {
      console.warn("Parsing warnings:", parsed.errors);
    }
    return parsed.data;
  };

  const buildTraces = (rows, xKey, yKey, colorKey) => {
    if (!colorKey) {
      return [
        {
          x: rows.map((row) => row[xKey]),
          y: rows.map((row) => row[yKey]),
          mode: "markers",
          type: "scatter",
          marker: { color: "#2b6cb0" },
        },
      ];
    }

    const grouped = {};
    rows.forEach((row) => {
      const group = row[colorKey] ?? "(missing)";
      if (!grouped[group]) {
        grouped[group] = { x: [], y: [] };
      }
      grouped[group].x.push(row[xKey]);
      grouped[group].y.push(row[yKey]);
    });

    return Object.entries(grouped).map(([group, values]) => ({
      x: values.x,
      y: values.y,
      mode: "markers",
      type: "scatter",
      name: group,
    }));
  };

  const drawPlot = () => {
    const xKey = xSelect.value;
    const yKey = ySelect.value;
    const colorKey = colorSelect.value;

    if (!xKey || !yKey) {
      setStatus("Select both X and Y axes to render the chart.");
      return;
    }

    const traces = buildTraces(currentData, xKey, yKey, colorKey || null);
    const layout = {
      margin: { t: 30, r: 20, b: 50, l: 60 },
      xaxis: { title: xKey },
      yaxis: { title: yKey },
      legend: { orientation: "h" },
    };

    Plotly.react(plotEl, traces, layout, { responsive: true });
    setStatus(`Displaying ${currentData.length} observations.`);
  };

  datasetSelect.addEventListener("change", async (event) => {
    const path = event.target.value;
    if (!path) {
      return;
    }

    setStatus("Loading dataset...");
    try {
      const rows = await parseDataset(path);
      currentData = rows.filter((row) => Object.keys(row).length > 0);
      if (!currentData.length || Object.keys(currentData[0] || {}).length === 0) {
        setStatus("Dataset is empty or could not be parsed.");
        return;
      }

      updateSelectors(currentData);
      drawPlot();
    } catch (error) {
      setStatus("Unable to load the selected dataset.");
      console.error(error);
    }
  });

  updateButton.addEventListener("click", drawPlot);

  populateDatasets();
</script>

<style>
  .dataviz-page {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .dataviz-controls {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 0.75rem 1rem;
    align-items: center;
  }

  .dataviz-controls label {
    font-weight: 600;
  }

  .dataviz-controls select,
  .dataviz-controls button {
    padding: 0.4rem 0.6rem;
    border-radius: 6px;
    border: 1px solid #d0d7de;
  }

  .dataviz-controls button {
    background: #1f6feb;
    color: #fff;
    font-weight: 600;
    border: none;
    cursor: pointer;
  }

  .dataviz-status {
    font-size: 0.95rem;
    color: #4a5568;
  }

  .dataviz-plot {
    min-height: 420px;
  }
</style>
