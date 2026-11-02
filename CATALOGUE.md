# Catalogue — source actuelle

Le catalogue est désormais généré à partir de `data/books.json` et `data/media.json`. Pour modifier un titre, une description, un prix, un lien ou un statut, utiliser ces sources puis reconstruire le site. Les pages de `dist/` ne sont pas éditées à la main. Voir `README.md` et `SUIVI-SEO.md` pour les procédures.

Les 15 prix totalisent toujours 322 €, et les 100 photos des nouveautés sont conservées. Les quatre anciennes fiches ont reçu des descriptions prudentes ; Notre Belle Patrie porte 1911 selon sa page de titre photographiée. La disponibilité reste à confirmer sur Leboncoin.

## Historique de l’intégration du 2 novembre 2026

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

## Ajout du 2 novembre 2026 (soir) : ADM-120 à ADM-122

Trois fiches ajoutées, soit 22 fiches au total. Prix repris du champ « Prix de présentation conseillé » des fiches bibliographiques du 2 novembre 2026 ; annonces Leboncoin publiées le même jour.

| Référence | Livre | Prix | Images | Annonce Leboncoin |
|---|---|---:|---:|---|
| ADM-120 | Contribution à l’histoire de l’Hôpital de Versailles (Munsch, 1933) | 20 € | 7 | https://www.leboncoin.fr/ad/livres/3301253898 |
| ADM-121 | Arsène Lupin contre Herlock Sholmès + Les Confidences d’Arsène Lupin (lot de 2) | 25 € | 5 | https://www.leboncoin.fr/ad/livres/3301255411 |
| ADM-122 | L’Affaire Crainquebille, fac-similé de l’édition Pelletan de 1901 | 15 € | 6 | https://www.leboncoin.fr/ad/livres/3301256237 |

Images : vues choisies par le propriétaire à la racine des trois dossiers (mises en scène retravaillées à partir des photos d’origine, conservées dans `Archive/`). Une vue intérieure de Munsch dont le texte imprimé ne correspondait pas au livre, et le collage Lupin, ont été écartés. WebP 160 / 640 / 1200 px, qualité 90 pour la grande variante. L’état décrit dans les fiches repose sur les photos d’origine. ADM-122 est une réimpression moderne : la date 1901 n’est pas inscrite comme date de publication.

Ces trois références sont contrôlées par le test « references added after the baseline » ; les 19 références d’origine gardent leurs contrôles figés.

## Mise à jour des liens Leboncoin

Les 15 livres sont désormais publiés sur le compte L’Atelier des Mémoires : quatre nouvelles annonces et onze annonces existantes actualisées. Leurs liens et prix ont été vérifiés sur le compte le 2 novembre 2026. Les 15 champs `lb_url` sont renseignés et les anciennes mentions « Annonce Leboncoin à venir » sont retirées des descriptions. Les liens sont accessibles directement dans les fiches et depuis la sélection. Aucune disponibilité en stock n’est déduite de ces liens.

Pour remplacer un lien, modifier le champ `lb_url` de l’objet concerné dans `data/books.json`, avec l’URL HTTPS exacte de Leboncoin. Vérifier son titre, son prix et sa disponibilité sur l’annonce réelle. Le site ne synchronise pas automatiquement les ventes ou les changements de prix de Leboncoin.

| Référence | Annonce Leboncoin |
|---|---|
| ADM-104 | https://www.leboncoin.fr/ad/antiquites/3141274774 |
| ADM-105 | https://www.leboncoin.fr/ad/antiquites/3141283806 |
| ADM-107 | https://www.leboncoin.fr/ad/antiquites/3141299326 |
| ADM-108 | https://www.leboncoin.fr/ad/livres/3300923066 |
| ADM-109 | https://www.leboncoin.fr/ad/livres/3300939975 |
| ADM-110 | https://www.leboncoin.fr/ad/collection/2974849078 |
| ADM-111 | https://www.leboncoin.fr/ad/collection/2974790022 |
| ADM-112 | https://www.leboncoin.fr/ad/collection/2974786236 |
| ADM-113 | https://www.leboncoin.fr/ad/collection/2974781583 |
| ADM-114 | https://www.leboncoin.fr/ad/collection/2975627113 |
| ADM-115 | https://www.leboncoin.fr/ad/collection/2975622199 |
| ADM-116 | https://www.leboncoin.fr/ad/livres/3300943235 |
| ADM-117 | https://www.leboncoin.fr/ad/collection/2974846282 |
| ADM-118 | https://www.leboncoin.fr/ad/antiquites/3146896358 |
| ADM-119 | https://www.leboncoin.fr/ad/livres/3300946167 |

## Images et descriptions

Les 100 images ont été prises exclusivement à la racine des 15 dossiers de livres, sans utiliser leurs sous-dossiers. Les sources locales restent intactes. Les copies web sont dans `PRODUITS/Catalogue-2026-11/`, en WebP aux largeurs maximales 160, 640 et 1200 pixels, sans agrandissement ni recadrage. La grande variante utilise une qualité 90 ; les cartes et vignettes utilisent les variantes légères. Une couverture a été choisie pour chaque fiche, toutes les autres vues restent dans sa galerie.

Les dates certaines sont 1893 (Berthe), 1949 (Nils) et 1934 (Quentin). Les autres dates probables sont présentées comme telles dans les descriptions et ne sont pas inscrites comme dates de publication certaines dans les données structurées. Les états signalés dans les fiches sont conservés ; aucune complétude, signature ou édition originale n’est déduite d’une photographie.

## Vérification

Exécuter `node tests/catalogue.mjs`. Ce contrôle ne nécessite pas de dépendance et vérifie les 19 références, les 15 prix, les 100 images et leurs variantes locales, les liens uniques vers Leboncoin et la validité des scripts.

La branche `codex/ameliorations-site` et la proposition antérieure restent distinctes. Avant de fusionner cette refonte, reprendre les présentes données et galeries dans son format `data/books.json` / `data/media.json` pour conserver ce catalogue.

## Sélections enregistrées et cache

Les liens affichés sont résolus depuis le catalogue courant à partir de l’identifiant du livre, y compris si une ancienne copie du livre subsiste dans une sélection. Les sélections enregistrées sous forme d’identifiants ou d’anciens objets sont rechargées avec les informations actuelles. Le message de secours indique uniquement « Lien de l’annonce indisponible. » si aucun lien valide n’existe dans le catalogue.

Le fichier Netlify `_headers` désactive la conservation de la page HTML pour `/` et `/index.html`. Les images conservent leur politique de cache. Un onglet ouvert avant une publication doit être actualisé une fois pour charger le nouveau code.
