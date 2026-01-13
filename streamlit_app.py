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
    page_title="Top-5 Economics Journals – Textual Trends",
    layout="wide",
)

DATA_PATH = Path(__file__).parent / "data_top5_without_v3.csv"

# =========================
# DATA LOADING
# =========================

@st.cache_data
def load_data(path: Path) -> pd.DataFrame:
    if not path.exists():
        return pd.DataFrame()
    df = pd.read_csv(path)
    return df


@st.cache_data
def prepare_data(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    for col in ["title", "abstract", "year", "journal"]:
        if col not in df.columns:
            df[col] = ""

    df["year"] = pd.to_numeric(df["year"], errors="coerce")
    df = df.dropna(subset=["year"])
    df["year"] = df["year"].astype(int)

    df["text"] = (
        df["title"].fillna("") + " " + df["abstract"].fillna("")
    ).str.lower()

    df["tokens"] = df["text"].apply(
        lambda x: re.findall(r"\b[a-zàâéèêîôûç]{2,}\b", x)
    )

    return df


# =========================
# QUERY PARSING (Gallicagram-style)
# =========================

def parse_query(query: str):
    query = query.strip().lower()
    if "&" in query:
        return "AND", [q.strip() for q in query.split("&")]
    if "+" in query:
        return "OR", [q.strip() for q in query.split("+")]
    return "SINGLE", [query]


# =========================
# FREQUENCY COMPUTATION
# =========================

def compute_frequency(df: pd.DataFrame, mode: str, terms: list[str]) -> pd.DataFrame:
    rows = []

    for year, g in df.groupby("year"):
        total_words = sum(len(t) for t in g["tokens"])
        if total_words == 0:
            continue

        count = 0

        for tokens in g["tokens"]:
            token_text = " ".join(tokens)

            if mode == "SINGLE":
                count += token_text.count(terms[0])

            elif mode == "AND":
                if all(term in token_text for term in terms):
                    count += 1

            elif mode == "OR":
                if any(term in token_text for term in terms):
                    count += 1

        freq = count / total_words
        rows.append({"year": year, "frequency": freq})

    return pd.DataFrame(rows).sort_values("year")


# =========================
# USER INTERFACE
# =========================

st.title("📈 Textual Trends in Top-5 Economics Journals")

raw_df = load_data(DATA_PATH)

if raw_df.empty:
    st.error("CSV file not found or empty.")
    st.stop()

df = prepare_data(raw_df)

# -------------------------
# SIDEBAR
# -------------------------

st.sidebar.header("Search")

query = st.sidebar.text_input(
    "Word(s)",
    value="theory",
    help="Use '&' for AND, '+' for OR",
)

smooth = st.sidebar.slider(
    "Smoothing window (years)",
    0, 12, 2,
)

year_min = int(df["year"].min())
year_max = int(df["year"].max())

year_range = st.sidebar.slider(
    "Time period",
    year_min,
    year_max,
    (year_min, year_max),
)

journal_options = sorted(df["journal"].dropna().unique())
selected_journals = st.sidebar.multiselect(
    "Journals",
    journal_options,
    default=journal_options,
)

# -------------------------
# FILTER DATA
# -------------------------

df_filt = df[
    (df["year"] >= year_range[0]) &
    (df["year"] <= year_range[1]) &
    (df["journal"].isin(selected_journals))
]

if not query.strip():
    st.info("Please enter a search term.")
    st.stop()

mode, terms = parse_query(query)

freq_df = compute_frequency(df_filt, mode, terms)

if freq_df.empty:
    st.warning("No results found.")
    st.stop()

if smooth > 0:
    freq_df["frequency"] = (
        freq_df["frequency"]
        .rolling(smooth, center=True, min_periods=1)
        .mean()
    )

# =========================
# PLOT
# =========================

fig = px.line(
    freq_df,
    x="year",
    y="frequency",
    title=f"Relative frequency of “{query}” over time",
)

fig.update_layout(
    xaxis_title="Year",
    yaxis_title="Frequency in the corpus",
    height=500,
)

st.plotly_chart(fig, use_container_width=True)

# =========================
# CONTEXT / DOCUMENTS
# =========================

st.subheader("📄 Matching documents")

if mode == "SINGLE":
    mask = df_filt["text"].str.contains(terms[0], regex=False)
elif mode == "AND":
    mask = df_filt["text"].apply(
        lambda x: all(term in x for term in terms)
    )
else:  # OR
    mask = df_filt["text"].apply(
        lambda x: any(term in x for term in terms)
    )

results_df = (
    df_filt.loc[mask, ["title", "year", "journal"]]
    .sort_values("year")
    .reset_index(drop=True)
)

st.dataframe(results_df, use_container_width=True)

st.caption(f"{len(results_df)} matching documents")
