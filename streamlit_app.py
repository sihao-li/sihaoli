# app.py
import re
from pathlib import Path

import pandas as pd
import streamlit as st
import plotly.express as px

# =========================
# CONFIGURATION
# =========================

st.set_page_config(
    layout="wide",
    initial_sidebar_state="expanded",
    page_title="Data Viz Top 5",
    page_icon="📊",
)

DATA_PATH = Path(__file__).parent / "data_top5_without_v3.csv"

# =========================
# DATA LOADING
# =========================

@st.cache_data
def load_data(path: Path) -> pd.DataFrame:
    if not path.exists():
        return pd.DataFrame()
    return pd.read_csv(path)


@st.cache_data
def prepare_data(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    for col in ["title", "abstract", "year", "journal"]:
        if col not in df.columns:
            df[col] = ""

    df["year"] = pd.to_numeric(df["year"], errors="coerce")
    df = df.dropna(subset=["year"])
    df["year"] = df["year"].astype(int)

    df["text"] = (df["title"].fillna("") + " " + df["abstract"].fillna("")).str.lower()

    # words (>= 2 letters) – keeps French accents
    df["tokens"] = df["text"].apply(
        lambda x: re.findall(r"\b[a-zàâéèêîôûç]{2,}\b", x)
    )

    return df


# =========================
# QUERY PARSING
# =========================

def parse_query(query: str):
    """
    - "term"            -> SINGLE
    - "a + b + c"       -> OR
    - "a & b & c"       -> PHRASE (sequence) (see compute_frequency)
    """
    q = query.strip().lower()

    if "&" in q:
        terms = [t.strip() for t in q.split("&") if t.strip()]
        return "PHRASE", terms

    if "+" in q:
        terms = [t.strip() for t in q.split("+") if t.strip()]
        return "OR", terms

    return "SINGLE", [q]


# =========================
# FREQUENCY COMPUTATION
# =========================

def count_phrase_occurrences(tokens: list[str], phrase: list[str]) -> int:
    """Count occurrences of a token sequence (phrase) inside a token list."""
    n = len(phrase)
    if n == 0 or len(tokens) < n:
        return 0
    return sum(1 for i in range(len(tokens) - n + 1) if tokens[i:i+n] == phrase)


def compute_frequency(df: pd.DataFrame, mode: str, terms: list[str]) -> pd.DataFrame:
    """
    Returns yearly frequency as:
      occurrences / total_words_in_year

    - SINGLE: counts exact token matches of terms[0]
    - OR: counts tokens that are exactly any of the terms
    - PHRASE (from "&"): counts occurrences of the exact token sequence terms
    """
    rows = []
    term0 = terms[0] if terms else ""
    termset = set(terms)

    for year, g in df.groupby("year"):
        total_words = sum(len(tokens) for tokens in g["tokens"])
        if total_words == 0:
            continue

        count = 0

        if mode == "SINGLE":
            for tokens in g["tokens"]:
                count += sum(1 for t in tokens if t == term0)

        elif mode == "OR":
            for tokens in g["tokens"]:
                count += sum(1 for t in tokens if t in termset)

        else:  # PHRASE
            for tokens in g["tokens"]:
                count += count_phrase_occurrences(tokens, terms)

        freq = count / total_words
        rows.append({"year": int(year), "frequency": freq})

    return pd.DataFrame(rows).sort_values("year")


# =========================
# USER INTERFACE
# =========================

st.markdown(
    """
    <style>
        .app-header {
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
            color: #f8fafc;
            padding: 1.5rem 2rem;
            border-radius: 16px;
            margin-bottom: 1.5rem;
            box-shadow: 0 16px 40px rgba(15, 23, 42, 0.25);
        }
        .app-header h1 {
            font-size: 2.4rem;
            margin: 0;
        }
        .app-header p {
            margin: 0.35rem 0 0;
            color: #e2e8f0;
            font-size: 1.05rem;
        }
        .metric-card {
            background: #ffffff;
            padding: 1rem 1.2rem;
            border-radius: 14px;
            border: 1px solid #e2e8f0;
            box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
        }
        .metric-title {
            font-size: 0.85rem;
            color: #64748b;
            margin-bottom: 0.2rem;
        }
        .metric-value {
            font-size: 1.6rem;
            font-weight: 600;
            color: #0f172a;
        }
        .section-title {
            font-size: 1.2rem;
            font-weight: 600;
            color: #0f172a;
            margin-top: 1rem;
        }
        .stDataFrame {
            border-radius: 12px;
            border: 1px solid #e2e8f0;
            overflow: hidden;
        }
    </style>
    """,
    unsafe_allow_html=True,
)

st.markdown(
    """
    <div class="app-header">
        <h1>📊 Data Viz Top 5</h1>
        <p>Explore how topics evolve in top economics journals with a clean, fast, and focused interface.</p>
    </div>
    """,
    unsafe_allow_html=True,
)

raw_df = load_data(DATA_PATH)
if raw_df.empty:
    st.error("CSV file not found or empty.")
    st.stop()

df = prepare_data(raw_df)

# -------------------------
# SIDEBAR
# -------------------------

st.sidebar.header("Search")
st.sidebar.caption("Find trends in titles and abstracts.")

query = st.sidebar.text_input(
    "Word(s)",
    value="theory",
    help="Use '+' for OR (e.g., labor + market). Use '&' for a phrase (e.g., labor & market).",
)

with st.sidebar.expander("Advanced filters", expanded=True):
    smooth = st.slider("Smoothing window (years)", 0, 12, 2)

    year_min = int(df["year"].min())
    year_max = int(df["year"].max())

    year_range = st.slider("Time period", year_min, year_max, (year_min, year_max))

    journal_options = sorted(df["journal"].dropna().unique())
    selected_journals = st.multiselect("Journals", journal_options, default=journal_options)

# -------------------------
# FILTER DATA
# -------------------------

df_filt = df[
    (df["year"] >= year_range[0])
    & (df["year"] <= year_range[1])
    & (df["journal"].isin(selected_journals))
]

if not query.strip():
    st.info("Please enter a search term.")
    st.stop()

# (Recommended) stop 1-letter queries to avoid misleading stuff
if len(query.strip()) < 2:
    st.warning("Please enter a full word (at least 2 letters).")
    st.stop()

mode, terms = parse_query(query)

freq_df = compute_frequency(df_filt, mode, terms)
if freq_df.empty:
    st.warning("No results found.")
    st.stop()

if smooth > 0:
    freq_df["frequency"] = (
        freq_df["frequency"].rolling(smooth, center=True, min_periods=1).mean()
    )

# =========================
# TOP METRICS
# =========================

summary_cols = st.columns(3)
summary_cols[0].markdown(
    f"""
    <div class="metric-card">
        <div class="metric-title">Articles in dataset</div>
        <div class="metric-value">{len(df):,}</div>
    </div>
    """,
    unsafe_allow_html=True,
)
summary_cols[1].markdown(
    f"""
    <div class="metric-card">
        <div class="metric-title">Years covered</div>
        <div class="metric-value">{year_min} - {year_max}</div>
    </div>
    """,
    unsafe_allow_html=True,
)
summary_cols[2].markdown(
    f"""
    <div class="metric-card">
        <div class="metric-title">Journals tracked</div>
        <div class="metric-value">{len(journal_options)}</div>
    </div>
    """,
    unsafe_allow_html=True,
)

st.markdown("<div class='section-title'>Textual trends</div>", unsafe_allow_html=True)

# =========================
# PLOT
# =========================

if mode == "SINGLE":
    title = f"Share of words equal to “{query}” over time"
elif mode == "OR":
    title = f"Share of words equal to any of: {', '.join([f'“{t}”' for t in terms])}"
else:
    title = f"Share of phrase occurrences: “{' '.join(terms)}” over time"

fig = px.line(
    freq_df,
    x="year",
    y="frequency",
    title=title,
    markers=True,
)

fig.update_layout(
    xaxis_title="Year",
    yaxis_title="Share in the corpus (exact match)",
    height=500,
    template="plotly_white",
)

fig.update_traces(line=dict(color="#2563eb", width=3), marker=dict(size=6))

st.plotly_chart(fig, use_container_width=True)

st.caption(
    "Metric: per year, (number of exact matches in titles+abstracts) / (total number of words in that year)."
)

# =========================
# CONTEXT / DOCUMENTS
# =========================

st.subheader("📄 Matching documents")
st.caption("Sorted chronologically for fast scanning.")

if mode == "SINGLE":
    mask = df_filt["tokens"].apply(lambda toks: terms[0] in toks)
elif mode == "OR":
    tset = set(terms)
    mask = df_filt["tokens"].apply(lambda toks: any(t in tset for t in toks))
else:  # PHRASE
    mask = df_filt["tokens"].apply(lambda toks: count_phrase_occurrences(toks, terms) > 0)

results_df = (
    df_filt.loc[mask, ["title", "year", "journal"]]
    .sort_values("year")
    .reset_index(drop=True)
)

st.dataframe(results_df, use_container_width=True, height=420)
st.caption(f"{len(results_df)} matching documents")
