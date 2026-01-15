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
    color: #e2e8f0;
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
  <p>Analysez l’évolution des thèmes dans les revues économiques de référence, avec un accès rapide à la visualisation.</p>
</div>

<div class="dataviz-cards">
  <div class="dataviz-card">
    <h3>📌 Ce que vous pouvez faire</h3>
    <p>Suivre la fréquence d’un terme, comparer des périodes, filtrer par revue.</p>
  </div>
  <div class="dataviz-card">
    <h3>⚡ Navigation rapide</h3>
    <p>Gardez l’iframe ouverte, affinez vos requêtes, visualisez les documents associés.</p>
  </div>
  <div class="dataviz-card">
    <h3>🔎 Exemples de requêtes</h3>
    <p><strong>innovation</strong>, <strong>digital &amp; platform</strong>, <strong>climate + carbon</strong>.</p>
  </div>
</div>

<div class="dataviz-callout">
  <strong>Astuce :</strong> utilisez <code>&amp;</code> pour un filtre <em>AND</em> et <code>+</code> pour un filtre <em>OR</em> directement dans l’application.
</div>

Cette page intègre l'application Streamlit de visualisation NLP. Lancez l'app en local avec :

```bash
streamlit run streamlit_app.py
```

Si l'application tourne déjà, elle s'affiche ci-dessous :

<iframe
  src="http://localhost:8501"
  title="NLP Data Visualization"
  style="width: 100%; height: 900px; border: 1px solid #e2e8f0; border-radius: 8px;"
></iframe>

<p><em>Astuce :</em> pour la production, remplacez l'URL de l'iframe par celle de l'app Streamlit déployée.</p>
