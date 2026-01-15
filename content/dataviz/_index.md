---
title: "NLP Data Visualization"
date: 2026-01-14
draft: false
---

<style>
  .dataviz-hero {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #334155 100%);
    color: #f8fafc;
    padding: 2rem 2.5rem;
    border-radius: 18px;
    box-shadow: 0 18px 40px rgba(15, 23, 42, 0.25);
    margin-bottom: 1.5rem;
  }
  .dataviz-hero h1 {
    margin: 0;
    font-size: 2.2rem;
  }
  .dataviz-hero p {
    margin: 0.5rem 0 0;
    color: #cbd5e1;
  }
  .dataviz-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
    margin: 1.5rem 0;
  }
  .dataviz-card {
    background: #ffffff;
    border-radius: 14px;
    border: 1px solid #e2e8f0;
    padding: 1rem 1.2rem;
    box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
  }
  .dataviz-card h3 {
    margin: 0 0 0.4rem;
    font-size: 1.05rem;
  }
  .dataviz-card p {
    margin: 0;
    color: #475569;
    font-size: 0.95rem;
  }
  .dataviz-callout {
    background: #f8fafc;
    border-left: 4px solid #2563eb;
    padding: 0.9rem 1.2rem;
    border-radius: 12px;
    margin: 1.2rem 0 1.6rem;
  }
</style>

<div class="dataviz-hero">
  <h1>Data Viz • Top 5 Econ</h1>
  <p>Analyze the evolution of topics in leading economic journals, with quick access to visualization.</p>
</div>

<div class="dataviz-cards">
  <div class="dataviz-card">
    <h3>📌 What you can do</h3>
    <p>Track the frequency of a term, compare periods, filter by journal.</p>
  </div>
  <div class="dataviz-card">
    <h3>⚡ Quick navigation</h3>
    <p>Keep the iframe open, refine your queries, view related documents.</p>
  </div>
  <div class="dataviz-card">
    <h3>🔎 Examples of queries</h3>
    <p><strong>innovation</strong>, <strong>digital &amp; platform</strong>, <strong>climate + carbon</strong>.</p>
  </div>
</div>

<div class="dataviz-callout">
  <strong>Tip :</strong> use <code>&amp;</code> for a filter <em>AND</em> and <code>+</code> for a filter <em>OR</em> directly in the application.
</div>

This interactive tool visualizes the relative frequency of terms in article
titles and abstracts published in top-five economics journals over time.

<iframe
  src="https://sihaoli-8h8yz7qxbb3bnj2x2nwhne.streamlit.app/?embed=true"
  title="NLP Data Visualization"
  style="width: 100%; height: 900px; border: 1px solid #e2e8f0; border-radius: 8px;"
></iframe>
