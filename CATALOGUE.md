# Catalogue du 2 novembre 2026

La présentation actuelle du site est conservée. Douze fiches sont ajoutées et trois sont actualisées (ADM-104, ADM-105, ADM-107), soit 19 fiches au total. Les quatre autres fiches et leurs liens sont conservés.

Les prix ci-dessous reprennent le champ « Prix de présentation conseillé » des 15 fichiers `Fiche bibliographique et estimation.txt`, recherches du 1er novembre 2026. Ce sont des prix proposés, hors livraison. Le prix Coppée concerne les deux volumes réunis.

| Référence | Livre | Prix | Images |
|---|---|---:|---:|
| ADM-104 | Contes bleus | 30 € | 8 |
| ADM-105 | Victor Hugo — Années d’enfance | 15 € | 5 |
| ADM-107 | Le Capitaine Fracasse | 25 € | 8 |
| ADM-108 | Berthe ou Le Devoir accompli | 12 € | 7 |
| ADM-109 | Ceux du blocus | 25 € | 5 |
| ADM-110 | Harold, héros d’aventures | 15 € | 7 |
| ADM-111 | Histoire d’un enfant | 20 € | 7 |
| ADM-112 | La Destinée de Silvère | 30 € | 7 |
| ADM-113 | Le Merveilleux Voyage de Nils Holgersson | 35 € | 9 |
| ADM-114 | Le Rouge et le Noir | 15 € | 5 |
| ADM-115 | Les Nuits secrètes de Paris | 8 € | 5 |
| ADM-116 | François Coppée — Théâtre et Prose (2 volumes) | 40 € | 9 |
| ADM-117 | Petites Nouvelles | 12 € | 6 |
| ADM-118 | Quentin Durward | 20 € | 7 |
| ADM-119 | Robinson Crusoé | 20 € | 5 |

Total des 15 prix : **322 €**, pour 16 volumes physiques et 100 images finales. Le lot Coppée est une sélection de deux tomes des Œuvres complètes, pas une collection complète.

## Mise à jour des liens Leboncoin

Les 15 livres ne sont pas encore publiés sur Leboncoin, selon le propriétaire. Leur champ `lb_url` vaut `null`, y compris les trois fiches actualisées dont les anciens liens ne sont pas reconduits. Les cartes, fenêtres et sélection indiquent « Annonce Leboncoin à venir ». Aucun faux lien ni disponibilité en stock n’est généré.

Après création d’une annonce, modifier uniquement le champ `lb_url` de l’objet concerné dans le tableau `books` de `index.html`, avec l’URL HTTPS exacte de Leboncoin. Le lien devient actif dans la sélection. Supprimer ensuite la mention « Annonce Leboncoin à venir » de la description `desc` de cette fiche. Vérifier le prix et la disponibilité sur l’annonce réelle.

## Images et descriptions

Les 100 images ont été prises exclusivement à la racine des 15 dossiers de livres, sans utiliser leurs sous-dossiers. Les sources locales restent intactes. Les copies web sont dans `PRODUITS/Catalogue-2026-11/`, en WebP aux largeurs maximales 160, 640 et 1200 pixels, sans agrandissement ni recadrage. La grande variante utilise une qualité 90 ; les cartes et vignettes utilisent les variantes légères. Une couverture a été choisie pour chaque fiche, toutes les autres vues restent dans sa galerie.

Les dates certaines sont 1893 (Berthe), 1949 (Nils) et 1934 (Quentin). Les autres dates probables sont présentées comme telles dans les descriptions et ne sont pas inscrites comme dates de publication certaines dans les données structurées. Les états signalés dans les fiches sont conservés ; aucune complétude, signature ou édition originale n’est déduite d’une photographie.

## Vérification

Exécuter `node tests/catalogue.mjs`. Ce contrôle ne nécessite pas de dépendance et vérifie les 19 références, les 15 prix, les 100 images et leurs variantes locales, la validité des scripts et l’absence d’offre inventée pour les annonces à venir.

La branche `codex/ameliorations-site` et la proposition antérieure restent distinctes. Avant de fusionner cette refonte, reprendre les présentes données et galeries dans son format `data/books.json` / `data/media.json` pour conserver ce catalogue.
