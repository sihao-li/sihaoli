---
title: "[FR] Tutoriel : Faire de la classification zero-shot avec des API de LLM en sciences sociales " 
date: 2024-04-02
lastmod: 2024-06-29
url: /a/
author: "Si Hao Li & Emilien Schultz"
description: "Comment exploiter les API de grands modèles de langue (LLM)  pour réaliser de la classification zero‑shot dans les sciences sociales.."
summary: "Comment exploiter les API de grands modèles de langue (LLM)  pour réaliser de la classification zero‑shot dans les sciences sociales." 
showToc: true
disableAnchoredHeadings: false
---

Les modèles génératifs (ChatGPT, Claude, Mistral, …) sont en train de transformer la recherche. Par exemple, dans son article intitulé "*Generative AI for Economic Research: Use Cases and Implications for Economists,*" l'économiste A. Korinek explore comment l'IA générative est amenée à transformer les pratiques en économie : il prévoit des gains de productivité significatifs grâce à l'automatisation de micro-tâches, telles que la génération de code ou la résolution de problèmes d'optimisation. 

Par exemple, une tâche souvent réalisée en sciences sociales est l'annotation de textes. Réalisée manuellement, cette tâche peut être extrêmement longue et devient presque impossible lorsqu'il s'agit de bases de données contenant des milliers d'éléments. Les tâches que le chercheur réalisait autrefois avec un surligneur et des annotations manuscrites[^1] sur feuille ou Excel peuvent désormais être effectuées par une machine à une échelle beaucoup plus large convertissant des données qualitatives en données quantitatives. 

[^1]: Par exemple, considérons la base de données GENIA. Cette base comprend 400 000 mots annotés en microbiologie, un travail colossal qui a mobilisé sept personnes pendant un an et demi (Kim et al., 2008).

Si historiquement les usages reposaient surtout sur l’adaptation de « petits » modèles aux besoins spécifiques des chercheurs sur leurs propres ordinateurs, l’arrivée de modèles plus volumineux et puissant ont amené de nouvelles possibilités et problèmes. 

Ce tutoriel propose spécifiquement de s’intéresser à l’utilisation de ces modèles dans le cadre de la recherche en sciences sociales, notamment quand il n’est plus possible de les installer directement sur son ordinateur mais qu’il faut y accéder par l’exécution de requête sur une interface (API). Ainsi, ce tutoriel est destiné à tous ceux qui souhaitant faire de la recherche en sciences sociales avec des méthodes computationnelles. Il se concentre notamment sur la manière de mettre en œuvre ce type de traitement à partir d’un exemple concret. Nous reviendrons sur cet exemple concret.

Dans cette première partie, nous examinerons la méthode du zero-shot, en détaillant son fonctionnement ainsi que les différents modèles de langage (LLM) associés et les stratégies qui en découlent. Par la suite, dans la deuxième partie, nous présenterons une application concrète à travers l'utilisation de l'API du modèle d'IA générative Mistral.

## 1. Un peu de contexte : du fine-tuniong au zéro-shot

Historiquement, les usages se sont d’abord développés avec l’utilisation de modèles relativement petits, par exemple les modèles comme BERT (Do et al., 2022). BERT (Bidirectional Encoder Representations from Transformers) est conçu pour comprendre le contexte des mots dans une phrase en prenant en compte ceux qui le précèdent et le suivent. Pour avoir des performances de bonne qualité pour les tâches spécifiques de la recherche, cela passait par du fine-tuning des modèles génériques sur les données spécifiques utilisées. Le fine-tuning de BERT, qui consiste à adapter ce modèle pré-entraîné à des tâches spécifiques, est particulièrement bénéfique pour l'annotation en sciences sociales. Il permet de spécialiser BERT pour être plus spécifique aux termes, structures et contextes spécifiques à ce domaine, rendant les annotations aussi précises parfois que celles des experts humains. 

D'autres solutions utilisent les possibilités offertes par les très grands modèles, capables de résoudre des tâches sans pré-entraînement. En effet, les derniers modèles proposés par les principaux acteurs du marché permettent d'automatiser de nombreuses tâches d'interprétation de divers types de données, notamment les textes et les images. Par exemple, l’article "GPT versus Resident Physicians — A Benchmark Based on Official Board Scores" (Katz, Uriel, et al. 2024) démontre la puissance de GPT-4, dont les performances sont comparables à celles des médecins lors des examens officiels de résidence médicale. Le modèle a atteint ou dépassé le taux de réussite officiel dans toutes les spécialités testées, montrant le potentiel immense de ces outils.

## 2. Quel modèle ? Quel prix ? Quelle performance ?

Ainsi, un modèle de langage open source, tel que LLaMA, est un modèle dont le code source est librement accessible au public. Cela permet aux utilisateurs de télécharger, modifier et déployer le modèle sur leurs propres serveurs ou machines, offrant une grande flexibilité et personnalisation. Cependant, cette liberté s'accompagne de la nécessité de disposer des ressources nécessaires pour l’utilisation ou l’entrainement modèle. En revanche, un modèle payant accessible via une API, comme GPT-4o, est un service fourni par une entreprise où les utilisateurs accèdent au modèle en envoyant des requêtes à un serveur distant via une interface de programmation (API). Ce type de modèle simplifie l'intégration et l'utilisation, car toute l'infrastructure est gérée par le fournisseur du service. Toutefois, il offre moins de contrôle et de possibilités de personnalisation par rapport aux modèles open source. Lors du choix entre ces deux options, il est essentiel de considérer vos priorités en termes de coûts, de flexibilité, et de hardware. Le graphique suivant illustre de manière concrète les différentes stratégies d'annotation de texte. En fonction de cela, nous vous invitons à consulter ce tutoriel ou celui déjà présent sur le site CSS concernant la façon de fine-tuner BERT pour effectuer de la classification. Nous rappelons que nous nous concentrons sur la classification zero-shot, une méthode qui ne nécessite pas de fine-tuning. Pour autant, il est indissociable du « prompt », une instruction ou une requête donnée à un modèle de langage pour générer une réponse ou accomplir une tâche spécifique.

Précisons tout de même que l’utilisation des API présente des avantages techniques, mais elle est également soumise à des contraintes économiques. Prenons un exemple : nous souhaitons classifier 200 résumés d’article scientifiques de différentes disciplines avec une moyenne de 150 mots par abstracts. Nous utilisons l’API GPT4 qui peut jusqu’à 4096 tokens. Un texte de 150 mots correspond généralement à environ 200 à 300 tokens Le tarif pour GPT-4 est plus élevé, avec des prix typiques autour de 0,03 $ pour 1000 tokens en entrée et 0,06 $ pour 1000 tokens en sortie. Pour 200 textes de 150 mots, si on estime environ 250 tokens par texte, cela représente 50 000 tokens (200 * 250). Ainsi le coût d’entrée pour 50 000 tokens serait : 50 000/1000 * 0.3 = 1,5 USD. Si chaque réponse générée (par exemple, une classification "économie", "maths", etc.) utilise environ 10 tokens, pour 200 réponses, on a 2000 tokens en sortie. : 2000/1000 ∗ 0 ,06 = 0,12USD. Ainsi, nous avons un coût total de 1,62 USD. Nous tenons à préciser que cette mesure est perfectible et que nous vous recommandons d’aller directement sur le site de l’API pour faire votre propre tarification.

Nous nous sommes concentrés sur les modèles les plus connus, tels que ceux de Mistral, Meta, OpenAI et Google. Ces modèles sont fréquemment mentionnés dans les articles de recherche en sciences sociales (G. Mens et A. Gallego, 2024 ; F. Gilardi et al. 2023). Le tableau illustre ces modèles, leur type, si c’est un modèle ou non, les contraintes techniques et économiques.

| LLM                | Type de LLM | API et/ou Open Source | Contraintes techniques                       | Contraintes économiques                                            | Prix |
|--------------------|-------------|-----------------------|----------------------------------------------|--------------------------------------------------------------------|------|
| Llama 3 8B         | Small       | Open Source           | Modérée                                      | Gratuit mais nécessite des ressources techniques                   | N/A  |
| Llama 3 70B        | Large       | Open Source           | Très forte                                   | Gratuit mais nécessite des ressources techniques                   | N/A  |
| Mistral 7B         | Small       | API & Open Source     | Faible (API) / Modérée (Open Source)         | Gratuit mais nécessite des ressources techniques / API payante     | Entrée : $1 / 1 M tokens<br>Sortie : $3 / 1 M tokens |
| Mistral 8×7B       | Medium      | API & Open Source     | Faible (API) / Forte (Open Source)           | Gratuit mais nécessite des ressources techniques / API payante     | Entrée : $2.7 / 1 M tokens<br>Sortie : $8.1 / 1 M tokens |
| Mistral 8×22       | Large       | API & Open Source     | Faible (API) / Très forte (Open Source)      | Gratuit mais nécessite des ressources techniques / API payante     | Entrée : $4 / 1 M tokens<br>Sortie : $12 / 1 M tokens |
| GPT‑4o             | Large       | API                  | Faible                                       | API payante                                                        | Entrée : $5 / 1 M tokens<br>Sortie : $15 / 1 M tokens |
| Gemini 1.5 flash   | Large       | API                  | Faible                                       | API payante                                                        | Entrée : $0,35 / 1 M tokens<br>Sortie : $1 / 1 M tokens |


Les modèles de langage small et large se distinguent principalement par le nombre de paramètres qu'ils possèdent, leur capacité de traitement, leur performance, leur consommation de ressources et leurs applications. Par exemple LLaMA 3 8B, avec ses 7 milliards de paramètres, est plus rapide et moins complexe, ce qui le rend adapté à des tâches simples et spécifiques, tout en étant accessible en termes de ressources informatiques[^2]. En revanche, Mistral 8x2B, possédant plusieurs centaines de milliards de paramètres, offre une capacité de traitement et une performance nettement supérieure, notamment pour des tâches complexes.

[^2]: Une contrainte technique élevée signifie que le modèle nécessite des ressources matérielles importantes, telles que des CPU, GPU et RAM

## Annoter des textes avec l’API de Mistral[^3]

[^3]:Pour ce tutoriel, l'utilisation du langage Python est indispensable. Nous vous suggérons d'installer Python en utilisant la distribution Anaconda, puis de lancer un Notebook Jupyter. Une alternative possible est l'utilisation de Google Colab, mais il convient de vérifier que les données manipulées ne sont pas confidentielles

Dans cette section, nous nous proposons d'illustrer la procédure d'annotation d'un corpus textuel avec l’API de Mistral AI. L'objectif est d'identifier et de catégoriser les discours misogynes afin de mieux comprendre et quantifier la présence de ce type de contenu sur les réseaux sociaux. Pour ce faire, nous avons opté pour un corpus de tweets caractérisés par leur contenu potentiellement misogyne, récupérés sur GitHub (@aollagnier). Nous appliquons la méthode de prompt décrite en annexe de l'article de F. Gilardi et al. (2023), car elle offre une approche systématique et reproductible pour l'annotation des textes. 

Il est important de comprendre les différents niveaux d'utilisation possibles pour ce type de tâche comme nous l’avons rapidement évoqué précédemment : 
-	Usage local : Exécution sur votre propre machine (ex: Ollama), avec avantages de confidentialité et contrôle total
-	API locale : Déploiement sur un serveur interne avec une API locale, offrant sécurité et scalabilité
-	Service tier : Utilisation d'API cloud 

Pour commencer, nous installons le package essentiel pour l'utilisation de l'API de Mistral. Cela facilite l'interaction avec l'API, en offrant des fonctionnalités prêtes à l'emploi pour envoyer des requêtes, et traiter les réponses. Dans certains cas, les entreprises développent des bibliothèques spécialisées, communément appelées "wrappers", dans le but de faciliter l'interaction avec leurs services via des requêtes. C'est notamment le cas de Mistral.

```python
!pip install mistralai
```

On charge ensuite les différentes bibliothèques que nous avons besoin pour utiliser le client Mistral : 

```python
import os
import csv
from mistralai.client import MistralClient
from mistralai.models.chat_completion import ChatMessage
```

Il sera nécessaire de vous inscrire sur le site de Mistral et d'obtenir une clé API. En s'inscrivant et en obtenant une clé API, vous acceptez les conditions d'utilisation et les politiques de Mistral. Il est également important de rappeler que l'utilisation de l'API est soumise à des frais, dont les tarifs sont présentés dans le tableau 1. Une fois la clé API obtenue, il vous faudra choisir le modèle le plus adapté à votre tâche. Dans notre cas, nous opterons pour le modèle le plus étendu, bien qu'il soit aussi le plus coûteux en termes de facturation par million de tokens (= unité de texte). Nous nous référons à l'article de F. Gilardi et al. (2023) pour élaborer notre prompt que vous trouvez dans le code suivant. Vous avez la possibilité de l'adapter à votre propre tâche ou d'en créer un nouveau. Pratiquer l'art du prompt avec modération est essentiel, car cela peut parfois s'avérer être une tâche particulièrement ingrate (en termes de résultat), nous vous recommandons de vous référer à la littérature existante.

```python
model = "mistral-large-latest"

client = MistralClient(api_key="OUR KEY API")

#Nous adaptons ici le prompt propose par F. Gilardi et al. (2023)

prompt = """Pour cette tâche, il vous sera demandé d'annoter des tweets provenant du site web Twitter. Avant de décrire la tâche, jetons un coup d'œil rapide à l'environnement de Twitter. Twitter est une plateforme de réseau social où les utilisateurs publient des messages courts appelés tweets, couvrant divers sujets. Pour cette tâche spécifique, vous devrez identifier et annoter les tweets qui présentent des éléments potentiellement misogynes. Pour chaque tweet, suivez les instructions suivantes : Lisez attentivement le texte du tweet, en prêtant attention aux détails et au contexte. Attention, les insultes ne signifient pas toujours que ça soit misogyne. Classez chaque tweet en 0, 1 ou 2 : 
Les phrases doivent être codées comme 0 lorsque les tweets ne présentent pas de caractère misogyne, n'utilisent pas de langage abusif. 
Les phrases doivent être codées comme 1 lorsqu'elles véhiculent des stéréotypes, essaient de montrer une supériorité masculine, contiennent des menaces violentes ou du harcèlement sexuel, manquent de respect aux femmes de manière générale, ou rejettent la responsabilité des hommes.
Pour chaque tweet, répondez en un seul mot avec l'une des deux annotations (0, 1) que vous devez faire."""
```
Nous définissons une fonction annotate_sentence qui envoie chaque tweet à l'API de Mistral et retourne l’annotation. 

```python
def annotate_sentence(sentence):
    full_prompt = prompt + sentence
    chat_response = client.chat(
        model=model,
        messages=[ChatMessage(role="user", content=full_prompt)]
    )
    return chat_response.choices[0].message.content
```

Exemple : 

Si prompt = "S’il est heureux annote 1, annote 0 le cas contraire: " et sentence = "Je suis très heureux aujourd'hui.", alors full_prompt devient " S’il est heureux annote 1, annote 0 le cas contraire : Je suis très heureux aujourd'hui."  

Chat_reponse nous permet d’interagir avee le model qui nous retourne la réponse de notre prompt.

Nous commençons par ouvrir notre fichier CSV, lequel comprend une sélection aléatoire de 100 éléments tirés du dataset mentionné en introduction. Ce dataset contient des annotations humaines ainsi que les tweets correspondants, en mode lecture. Ensuite, nous créons un nouveau fichier CSV, en mode écriture. Ce fichier sera utilisé pour enregistrer les tweets annotés par le LLM. Nous lisons chaque tweet du fichier et pour chaque tweet, nous envoyons son contenu à l'API de Mistral, qui nous renvoie une annotation en format JSON. L'API de Mistral renvoie des résultats sous forme de messages encapsulés dans des objets ChatMessage . Nous avons besoin du cntenu qui est dans un sous élément :  chat_response.choices[0].message.content. Nous nettoyons ensuite le résultat avec .strip() pour éviter les espaces indésirables. À la fin du processus, nous avons un fichier contenant tous les tweets annotés, et nous affichons un message confirmant que les annotations ont été sauvegardées avec succès.

```python
input_csv = "tweet.csv"
output_csv = "tweet2.csv"

with open(input_csv, mode='r', newline='', encoding='utf-8') as infile, \
     open(output_csv, mode='w', newline='', encoding='utf-8') as outfile:

    reader = csv.DictReader(infile)
    fieldnames = reader.fieldnames + ['Annotation']
    writer = csv.DictWriter(outfile, fieldnames=fieldnames)

    writer.writeheader()

    for row in reader:
        sentence = row['Tweet']
        annotation = annotate_sentence(sentence)
        row['Annotation'] = annotation
        writer.writerow(row)

print(f"Annotation finito : {output_csv}.")

Une requête prend en moyenne une à dix seconde, mais nous vous recommandons d’utiliser la bibliothèque time sur Python qui vous donnera le temps exact. Il se peut que le modèle de langage (LLM) rencontre des difficultés à annoter correctement certaines phrases. Toutefois, ces cas demeurent rares. Dans ces situations, nous vous suggérons de vérifier manuellement les annotations en utilisant la version gratuite du chat.
```

## Évaluer la qualité de l'annotation

La question fondamentale après l’annotation est de questionner si elles sont correctes en mesurant la fiabilité de cette annotation. Nous rappelons que ces annotations relèvent de la quantification qui suppose des conventions d’équivalences préalables (Desrosières, 2008). Un consensus scientifique émerge autour de l'idée que l'évaluation de la fiabilité des annotations est essentielle, car elle conditionne la validité même du processus d'annotation. Cela implique, entre autres, une comparaison systématique entre les annotations produites par des humains et celles générées par la machine.

Pour évaluer l’efficacité et la qualité de l’annotation, la pratique est d’utiliser des scores, notamment le score F1 et notre Kappa de Fleiss (> 2 annoteurs) ou Kappa de Cohen (2 annoteurs) pondéré par le taux d'erreur d'annotation. Ce taux peut varier de manière significative en fonction du prompt utilisé. Le F1 score est une mesure de la précision d'un modèle de classification. Il est la moyenne harmonique de la précision qui mesure la qualité des annotations et du rappel qui mesure la quantité d’annotations trouvées.

**Précision**

$$
\text{Précision} \;=\; \frac{\text{Vrai Positif}}{\text{Vrai Positif} + \text{Faux Positif}}
$$

**Rappel**

$$
\text{Rappel} \;=\; \frac{\text{Vrai Positif}}{\text{Vrai Positif} + \text{Faux Négatif}}
$$

**F‑score (F1)**

$$
F_{1} \;=\; 2 \times \frac{\text{Précision} \times \text{Rappel}}
                      {\text{Précision} + \text{Rappel}}
$$


> Les LLM peuvent annoter de façon divergente ou commettre des erreurs de syntaxe,  
> ce qui réduit la précision. Nous tenons donc compte d’un **taux d’erreur d’annotation (TER)** :

$$
\text{TER} \;=\; \frac{\text{Erreur d’annotation}}
                      {\text{Vrai Positif} + \text{Faux Positif}}
$$

Accord inter‑annotateurs : kappa de Fleiss

Avec $P_{0}$ la proportion d’accords observés et $P_{e}$ celle attendue par hasard :

$$
P_{0} \;=\; \frac{1}{N\,n\,(n-1)}
            \sum_{i=1}^{N}\sum_{j=1}^{k} n_{ij}\,\bigl(n_{ij}-1\bigr)
$$

$$
P_{e} \;=\; \sum_{j=1}^{k} p_{j}^{2}
$$

**Kappa de Fleiss**

$$
k \;=\; \frac{P_{0} - P_{e}}{1 - P_{e}}
$$


Pour pondérer ce kappa par la qualité des annotations :

$$
E_{k} \;=\; k \times \bigl(1 - \text{TER}\bigr)
$$


### Interprétation des valeurs de $k$

| Niveau | Seuil |
|--------|-------|
| Faible | $k \le 0.20$ |
| Moyen  | $0.21 \le k \le 0.60$ |
| Forte  | $k > 0.60$ |

Ces tests sont implémentés dans des bibliothèques. Il suffit donc de les utiliser sur les données annotées.

```python
from sklearn.metrics import classification_report, cohen_kappa_score

our_label = df_tweet2["Category"].tolist()
model_label = df_tweet2["Annotation"].tolist()
kappa = cohen_kappa_score(df_tweet2['Category'], df2['Annotation'])

report = classification_report(our_label, model_label)
print(report)
print("Kappa de Cohen:", kappa)
```
|                | precision | recall | f1‑score | support |
|--------------: |:---------:|:------:|:--------:|--------:|
| **Classe 0**   |   0.84    |  0.70  |   0.77   |     61  |
| **Classe 1**   |   0.63    |  0.79  |   0.70   |     39  |
| **Accuracy**   |           |        | **0.74** | **100** |
| **Macro avg**  |   0.74    |  0.75  |   0.74   |    100  |
| **Weighted avg**|  0.76    |  0.74  |   0.74   |    100  |

**Kappa de Cohen :** `0.5952`

Comme en témoignent les métriques, l'annotation est globalement satisfaisante avec un Kappa près de 0,6, bien qu'elle présente encore un nombre considérable d'erreurs. Les résultats peuvent varier considérablement en fonction du prompt ou du dataset utilisé. Par exemple, pour une tâche consistant à déterminer si des tweets politiques sont démocrates ou républicains, la machine obtient de bons scores moyen de l'ordre de 0.9. En revanche, pour une tâche plus complexe, comme dans notre cas, les scores sont plus faibles en raison de la difficulté du modèle à comprendre ces textes. L'annotation de ces 100 phrases m'a pris environ 10 à 15 minutes, alors que Mistral a accompli la même tâche en 30 secondes. Cela représente un gain de temps significatif, mais il convient de noter que cela implique un coût économique supplémentaire.