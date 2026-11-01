# Améliorations et vérification — 1er novembre 2026

## Réalisé

- Navigation avec liens natifs et en-tête sur deux rangées aux petites largeurs, sans superposition.
- Sept fiches de livres avec URL propre, contenu HTML initial, titre, description, canonical, aperçu social et données structurées Book.
- Recherche partageable par titre, auteur, catégorie et année ; catégories réelles et message sans résultat.
- Aperçu et sélection dans des dialogues nommés, fermeture par Échap, boucle de focus, retour au déclencheur, galerie utilisable au clavier et annonces des modifications.
- Sélection sans doublons, reprise des anciens identifiants et objets, élimination des références inconnues, récupération après JSON corrompu et fonctionnement sur la page quand le stockage est bloqué.
- Correction de Notre Belle Patrie : J. Monnier, septième édition, **1911**, visible sur la page de titre. Correction de Victor Hugo — Années d’enfance : **Gustave Simon**, auteur visible sur la page de titre et sur le dos. Les dates non confirmées ne sont plus affirmées.
- Suppression des estimations, garanties absolues, disponibilités en stock et avis prétendument vérifiés dépourvus de source vérifiable.
- Couleurs de texte et boutons ajustées, cibles tactiles et focus visibles, animations réduites selon les préférences du navigateur.
- Photographies WebP responsives, petites icônes, polices locales avec leurs licences, vidéo uniquement à la demande, suppression de l’écran de chargement bloquant.
- Sources séparées, génération statique sans dépendance d’exécution, configuration Netlify, vraie 404, sitemap des pages indexables, tests et intégration continue.

## Mesures de fichiers

| Ressource | Avant | Après |
| --- | ---: | ---: |
| 35 photographies produit utilisées | 74 164 454 octets d’originaux | 7 095 590 octets pour **toutes** les variantes WebP cumulées |
| Logo utilisé dans l’en-tête | 2 311 948 octets | 14 406 octets |
| Image d’accueil | 2 848 844 octets | 50 982 octets pour la variante 1280 px |
| Vidéo | 8 357 485 octets | 2 625 085 octets ; zéro téléchargement automatique |

Les totaux de variantes ne sont pas le poids d’une visite : le navigateur choisit les tailles nécessaires et les images différées se chargent au défilement. Les originaux sont conservés dans le dépôt et exclus du dossier publié.

## Contrôles locaux réussis

- Génération des 15 pages.
- Quatre tests de régression couvrant migration de sélection, recherche, validation des liens externes et intégrité du HTML généré : titres uniques, canonical, un H1, liens locaux existants, sitemap et absence de stock inventé.
- Chrome installé sur Windows, avec Playwright : 40 vérifications de pages à 320, 390, 768, 1280 et 1440 px ; aucun débordement horizontal.
- 20 analyses axe sur pages et dialogues, règles WCAG 2 A/AA et 2.1 AA : aucune violation détectée dans ces scénarios.
- Recherche, rechargement des URL filtrées, sélection persistante, suppression, galerie et flèches clavier, boucle de focus, Échap et retour du focus.
- JSON de stockage invalide, migration d’anciens objets et identifiants, stockage indisponible et catalogue sans JavaScript.
- Vidéo lue puis mise en pause à la demande, ressources initiales exclusivement locales, absence d’erreurs JavaScript ou de violation CSP, vraie réponse 404 et en-têtes du serveur local.
- Inspection visuelle des captures desktop, mobile, tablette, fiche, aperçu et sélection.

Les tests et captures peuvent être reproduits avec les commandes du README. Une analyse axe ne remplace pas un audit humain complet avec lecteur d’écran. Aucun score Lighthouse ni aucune mesure de terrain Core Web Vitals ne sont revendiqués.

## Informations encore nécessaires au propriétaire

Les champs correspondants sont centralisés dans `data/site.json` : statut de vendeur, identité publique, contact et mentions adaptées à ce statut, ainsi que véritable profil Leboncoin pour l’accès aux évaluations. Aucune donnée personnelle n’a été déduite du compte GitHub. Les pages d’information signalent les éléments manquants ; elles ne prétendent pas constituer des mentions ou CGV finalisées.

Les annonces Leboncoin ont opposé un refus d’accès automatisé pendant l’audit : les sept URL existantes sont conservées, mais leurs prix et disponibilités restent à confirmer auprès du vendeur. Le catalogue n’est pas synchronisé avec Leboncoin.

Les en-têtes, les redirections et le sitemap doivent être vérifiés sur le déploiement Netlify effectif après publication. Les accès Netlify et Search Console ne sont pas disponibles dans cette session.
