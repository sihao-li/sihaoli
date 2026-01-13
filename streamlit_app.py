import html
import importlib.util
import re
from collections import Counter
from pathlib import Path

import numpy as np
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st
from sklearn.decomposition import NMF, PCA
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import normalize

st.set_page_config(page_title="Top-5 Journal NLP Data Viz", layout="wide")

DATA_PATH = Path(__file__).parent / "data_top5_without_v3.csv"

HAS_SENTENCE_TRANSFORMERS = importlib.util.find_spec("sentence_transformers") is not None
HAS_BERTOPIC = importlib.util.find_spec("bertopic") is not None
HAS_UMAP = importlib.util.find_spec("umap") is not None
HAS_NETWORKX = importlib.util.find_spec("networkx") is not None
HAS_PLOTLY_EVENTS = importlib.util.find_spec("streamlit_plotly_events") is not None

if HAS_SENTENCE_TRANSFORMERS:
    from sentence_transformers import SentenceTransformer

if HAS_BERTOPIC:
    from bertopic import BERTopic

if HAS_UMAP:
    import umap

if HAS_NETWORKX:
    import networkx as nx

if HAS_PLOTLY_EVENTS:
    from streamlit_plotly_events import plotly_events


@st.cache_data(show_spinner=False)
def load_data(file_path: Path) -> pd.DataFrame:
    if not file_path.exists():
        return pd.DataFrame()
    data = pd.read_csv(file_path)
    return data


def clean_text(text: str, lowercase: bool) -> str:
    if pd.isna(text):
        return ""
    text = html.unescape(str(text))
    text = re.sub(r"<[^>]+>", " ", text)
    if lowercase:
        text = text.lower()
    text = re.sub(r"\s+", " ", text).strip()
    return text


@st.cache_data(show_spinner=False)
def prepare_dataset(raw_df: pd.DataFrame, lowercase: bool, dedupe: bool) -> pd.DataFrame:
    df = raw_df.copy()
    for col in ["title", "abstract", "year", "journal"]:
        if col not in df.columns:
            df[col] = ""
    df["title"] = df["title"].fillna("")
    df["abstract"] = df["abstract"].fillna("")
    df["journal"] = df["journal"].fillna("Unknown")
    df["year"] = pd.to_numeric(df["year"], errors="coerce")

    df["text"] = (
        df["title"].astype(str).map(lambda t: clean_text(t, lowercase))
        + "\n"
        + df["abstract"].astype(str).map(lambda t: clean_text(t, lowercase))
    )
    df["text"] = df["text"].str.strip()
    df["text_length"] = df["text"].str.split().map(len)

    if dedupe:
        df = df.drop_duplicates(subset=["text"])

    df = df.dropna(subset=["year"])
    df["year"] = df["year"].astype(int)
    return df


@st.cache_resource(show_spinner=False)
def load_sentence_model() -> SentenceTransformer:
    return SentenceTransformer("all-MiniLM-L6-v2")


@st.cache_data(show_spinner=False)
def build_tfidf(texts: list[str]) -> tuple[TfidfVectorizer, np.ndarray]:
    vectorizer = TfidfVectorizer(
        ngram_range=(1, 2),
        min_df=2,
        max_df=0.95,
        stop_words="english",
    )
    matrix = vectorizer.fit_transform(texts)
    return vectorizer, matrix


@st.cache_data(show_spinner=False)
def build_embeddings(texts: list[str]) -> np.ndarray:
    if HAS_SENTENCE_TRANSFORMERS:
        model = load_sentence_model()
        embeddings = model.encode(texts, show_progress_bar=False)
        return embeddings
    vectorizer, matrix = build_tfidf(texts)
    return normalize(matrix).toarray()


@st.cache_data(show_spinner=False)
def reduce_dimensions(embeddings: np.ndarray) -> np.ndarray:
    if HAS_UMAP:
        reducer = umap.UMAP(n_neighbors=15, min_dist=0.1, random_state=42)
        return reducer.fit_transform(embeddings)
    reducer = PCA(n_components=2, random_state=42)
    return reducer.fit_transform(embeddings)


@st.cache_data(show_spinner=False)
def fit_nmf_topics(tfidf_matrix, vectorizer, n_topics: int) -> tuple[NMF, np.ndarray, list[list[str]]]:
    nmf = NMF(n_components=n_topics, random_state=42, init="nndsvda")
    doc_topics = nmf.fit_transform(tfidf_matrix)
    feature_names = np.array(vectorizer.get_feature_names_out())
    topics = []
    for topic_idx, topic in enumerate(nmf.components_):
        top_indices = topic.argsort()[-10:][::-1]
        topics.append(feature_names[top_indices].tolist())
    return nmf, doc_topics, topics


@st.cache_data(show_spinner=False)
def fit_bertopic(texts: list[str]):
    if not HAS_BERTOPIC:
        return None
    model = BERTopic(verbose=False)
    topics, probs = model.fit_transform(texts)
    return model, topics, probs


def apply_filters(df: pd.DataFrame, years: tuple[int, int], journals: list[str], length_range: tuple[int, int]) -> pd.DataFrame:
    filtered = df[(df["year"] >= years[0]) & (df["year"] <= years[1])]
    if journals:
        filtered = filtered[filtered["journal"].isin(journals)]
    filtered = filtered[(filtered["text_length"] >= length_range[0]) & (filtered["text_length"] <= length_range[1])]
    return filtered


def compute_keyword_trends(df: pd.DataFrame, keyword: str, regex_mode: bool) -> pd.DataFrame:
    if not keyword:
        return pd.DataFrame()
    if regex_mode:
        pattern = re.compile(keyword, flags=re.IGNORECASE)
        mask = df["text"].str.contains(pattern, na=False)
    else:
        mask = df["text"].str.contains(keyword, case=False, na=False)
    return df[mask].copy()


def build_cooccurrence(texts: list[str], top_n: int) -> tuple[list[str], list[tuple[str, str, int]]]:
    tokens_list = []
    for text in texts:
        tokens = re.findall(r"[a-zA-Z]{2,}", text.lower())
        tokens_list.append(tokens)
    counts = Counter()
    for tokens in tokens_list:
        bigrams = zip(tokens, tokens[1:])
        trigrams = zip(tokens, tokens[1:], tokens[2:])
        for a, b in bigrams:
            counts[(a, b)] += 1
        for a, b, c in trigrams:
            counts[(a, b)] += 1
            counts[(b, c)] += 1
    edges = counts.most_common(top_n)
    nodes = sorted({token for edge, _ in edges for token in edge})
    edge_list = [(edge[0], edge[1], weight) for edge, weight in edges]
    return nodes, edge_list


def plot_cooccurrence(nodes: list[str], edges: list[tuple[str, str, int]]) -> go.Figure:
    if HAS_NETWORKX:
        graph = nx.Graph()
        for node in nodes:
            graph.add_node(node)
        for src, dst, weight in edges:
            graph.add_edge(src, dst, weight=weight)
        pos = nx.spring_layout(graph, seed=42, k=0.6)
        node_x = [pos[node][0] for node in graph.nodes]
        node_y = [pos[node][1] for node in graph.nodes]
        edge_x = []
        edge_y = []
        for src, dst, weight in graph.edges(data="weight"):
            edge_x.extend([pos[src][0], pos[dst][0], None])
            edge_y.extend([pos[src][1], pos[dst][1], None])
        edge_trace = go.Scatter(
            x=edge_x,
            y=edge_y,
            line=dict(width=0.5, color="#999"),
            hoverinfo="none",
            mode="lines",
        )
        node_trace = go.Scatter(
            x=node_x,
            y=node_y,
            mode="markers+text",
            text=list(graph.nodes),
            textposition="top center",
            marker=dict(size=12, color="#1f77b4"),
        )
        fig = go.Figure(data=[edge_trace, node_trace])
    else:
        angles = np.linspace(0, 2 * np.pi, len(nodes), endpoint=False)
        positions = {node: (np.cos(angle), np.sin(angle)) for node, angle in zip(nodes, angles)}
        edge_x = []
        edge_y = []
        for src, dst, _ in edges:
            edge_x.extend([positions[src][0], positions[dst][0], None])
            edge_y.extend([positions[src][1], positions[dst][1], None])
        node_x = [positions[node][0] for node in nodes]
        node_y = [positions[node][1] for node in nodes]
        fig = go.Figure(
            data=[
                go.Scatter(x=edge_x, y=edge_y, mode="lines", line=dict(width=0.5, color="#999")),
                go.Scatter(x=node_x, y=node_y, mode="markers+text", text=nodes, textposition="top center"),
            ]
        )
    fig.update_layout(showlegend=False, margin=dict(l=20, r=20, t=20, b=20))
    return fig


st.title("Top-5 Journal NLP Data Visualization")

raw_df = load_data(DATA_PATH)
if raw_df.empty:
    st.error(
        "Le fichier data_top5_without_v3.csv est introuvable. "
        "Placez-le à la racine du projet pour activer l'application."
    )
    st.stop()

st.sidebar.header("Filtres")
use_lowercase = st.sidebar.checkbox("Lowercase", value=True)
dedupe_text = st.sidebar.checkbox("Dédoublonner les textes", value=True)

prepared_df = prepare_dataset(raw_df, use_lowercase, dedupe_text)

min_year = int(prepared_df["year"].min())
max_year = int(prepared_df["year"].max())

year_range = st.sidebar.slider("Années", min_year, max_year, (min_year, max_year))
journal_options = sorted(prepared_df["journal"].dropna().unique().tolist())
selected_journals = st.sidebar.multiselect("Journaux", journal_options, default=journal_options)

min_len = int(prepared_df["text_length"].min())
max_len = int(prepared_df["text_length"].max())
length_range = st.sidebar.slider("Longueur du texte", min_len, max_len, (min_len, max_len))

search_query = st.sidebar.text_input("Recherche")
search_mode = st.sidebar.radio("Mode de recherche", ["plein texte", "sémantique"], index=0)
semantic_threshold = st.sidebar.slider("Seuil similarité", 0.0, 1.0, 0.3)

filtered_df = apply_filters(prepared_df, year_range, selected_journals, length_range)

st.sidebar.markdown("---")
color_mode = st.sidebar.selectbox("Colorer par", ["journal", "year"], index=0)

if filtered_df.empty:
    st.warning("Aucun article ne correspond aux filtres actuels.")
    st.stop()

similarities = None
if search_query:
    if search_mode == "plein texte":
        mask = filtered_df["text"].str.contains(search_query, case=False, na=False)
        filtered_df = filtered_df[mask]
    else:
        vectorizer, tfidf_matrix = build_tfidf(filtered_df["text"].tolist())
        if HAS_SENTENCE_TRANSFORMERS:
            query_embedding = load_sentence_model().encode([search_query])
        else:
            query_vec = vectorizer.transform([search_query])
            query_embedding = normalize(query_vec).toarray()
        embeddings = build_embeddings(filtered_df["text"].tolist())
        similarities = cosine_similarity(query_embedding, embeddings).flatten()
        filtered_df = filtered_df.assign(similarity=similarities)
        filtered_df = filtered_df[filtered_df["similarity"] >= semantic_threshold]

if filtered_df.empty:
    st.warning("Aucun article ne correspond à la recherche.")
    st.stop()

texts = filtered_df["text"].tolist()
vectorizer, tfidf_matrix = build_tfidf(texts)
embeddings = build_embeddings(texts)
embedding_2d = reduce_dimensions(embeddings)

st.markdown("---")

umap_tab, topics_tab, keyword_tab, cooccurrence_tab, table_tab = st.tabs(
    ["UMAP", "Topics", "Keyword trends", "Co-occurrence", "Articles"]
)

with umap_tab:
    st.subheader("UMAP des embeddings")
    plot_df = filtered_df.copy()
    plot_df["umap_x"] = embedding_2d[:, 0][: len(plot_df)]
    plot_df["umap_y"] = embedding_2d[:, 1][: len(plot_df)]
    hover_data = {"title": True, "journal": True, "year": True}
    fig = px.scatter(
        plot_df,
        x="umap_x",
        y="umap_y",
        color=color_mode,
        hover_data=hover_data,
        title="Projection des articles",
    )
    fig.update_layout(height=550)

    selected_index = None
    if HAS_PLOTLY_EVENTS:
        selected_points = plotly_events(fig, click_event=True, hover_event=False)
        if selected_points:
            selected_index = selected_points[0]["pointIndex"]
    else:
        st.info("Cliquez sur un article via le tableau ci-dessous (plugin plotly_events non disponible).")
        st.plotly_chart(fig, use_container_width=True)

    if selected_index is not None:
        selected_row = plot_df.iloc[selected_index]
        st.markdown("### Détails")
        st.write(f"**{selected_row['title']}**")
        st.write(f"*{selected_row['journal']}* — {selected_row['year']}")
        st.write(selected_row["abstract"])

with topics_tab:
    st.subheader("Topics")
    topic_count = st.slider("Nombre de topics", 3, 15, 8)

    if HAS_BERTOPIC:
        bertopic_result = fit_bertopic(texts)
        if bertopic_result:
            model, topic_labels, _ = bertopic_result
            topic_info = model.get_topic_info()
            st.dataframe(topic_info)
            topic_names = {
                topic_id: ", ".join([word for word, _ in model.get_topic(topic_id)[:5]])
                for topic_id in topic_info["Topic"].tolist()
                if topic_id != -1
            }
            topic_series = pd.Series(topic_labels, index=filtered_df.index)
        else:
            st.warning("BERTopic n'est pas disponible.")
            topic_series = None
            topic_names = {}
    else:
        nmf_model, doc_topics, topics = fit_nmf_topics(tfidf_matrix, vectorizer, topic_count)
        topic_names = {idx: ", ".join(words[:6]) for idx, words in enumerate(topics)}
        topic_series = pd.Series(doc_topics.argmax(axis=1), index=filtered_df.index)
        st.markdown("#### Top mots par topic")
        for idx, words in enumerate(topics):
            st.write(f"**Topic {idx + 1}**: {', '.join(words)}")

    if topic_series is not None:
        topic_timeline = (
            filtered_df.assign(topic=topic_series)
            .groupby(["year", "topic"]).size().reset_index(name="count")
        )
        topic_timeline["topic_label"] = topic_timeline["topic"].map(topic_names)
        timeline_fig = px.area(
            topic_timeline,
            x="year",
            y="count",
            color="topic_label",
            title="Répartition des topics par année",
        )
        st.plotly_chart(timeline_fig, use_container_width=True)

with keyword_tab:
    st.subheader("Keyword trends")
    keyword = st.text_input("Mot-clé")
    regex_mode = st.checkbox("Regex", value=False)
    keyword_df = compute_keyword_trends(filtered_df, keyword, regex_mode)

    if keyword_df.empty:
        st.info("Entrez un mot-clé pour afficher les tendances.")
    else:
        year_counts = keyword_df.groupby("year").size().reset_index(name="count")
        journal_counts = keyword_df.groupby("journal").size().reset_index(name="count")
        line_fig = px.line(year_counts, x="year", y="count", title="Fréquence dans le temps")
        bar_fig = px.bar(journal_counts, x="journal", y="count", title="Fréquence par journal")
        st.plotly_chart(line_fig, use_container_width=True)
        st.plotly_chart(bar_fig, use_container_width=True)

with cooccurrence_tab:
    st.subheader("Réseau de co-occurrence")
    top_n = st.slider("Top N bigrams/trigrams", 10, 100, 40)
    nodes, edges = build_cooccurrence(texts, top_n)
    if not nodes:
        st.info("Pas assez de données pour générer le réseau.")
    else:
        cooc_fig = plot_cooccurrence(nodes, edges)
        st.plotly_chart(cooc_fig, use_container_width=True)

with table_tab:
    st.subheader("Articles filtrés")
    display_df = filtered_df[["title", "year", "journal"]].reset_index(drop=True)
    st.dataframe(display_df, use_container_width=True)

    option_labels = [
        f"{idx + 1}. {row['title']} ({row['year']}, {row['journal']})"
        for idx, row in display_df.iterrows()
    ]
    selected_option = st.selectbox("Choisir un article", option_labels)
    selected_index = option_labels.index(selected_option)
    selected_row = filtered_df.iloc[selected_index]

    st.markdown("### Détails de l'article")
    st.write(f"**{selected_row['title']}**")
    st.write(f"*{selected_row['journal']}* — {selected_row['year']}")
    st.write(selected_row["abstract"])

    doc_index = filtered_df.index.get_loc(selected_row.name)
    doc_vector = tfidf_matrix[doc_index]
    top_terms_idx = np.argsort(doc_vector.toarray()[0])[-10:][::-1]
    top_terms = [vectorizer.get_feature_names_out()[i] for i in top_terms_idx if doc_vector.toarray()[0][i] > 0]
    st.markdown("**Top termes TF-IDF**")
    st.write(", ".join(top_terms) if top_terms else "Aucun terme significatif.")

    if embeddings is not None:
        sim_scores = cosine_similarity([embeddings[doc_index]], embeddings).flatten()
        similar_idx = sim_scores.argsort()[-6:][::-1]
        similar_articles = filtered_df.iloc[similar_idx][["title", "journal", "year"]]
        st.markdown("**Articles similaires**")
        st.dataframe(similar_articles, use_container_width=True)
