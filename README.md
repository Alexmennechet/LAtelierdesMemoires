# L’Atelier des Mémoires

Catalogue statique de 19 exemplaires avec fiches françaises individuelles, sélection personnelle, 100 photographies des nouveautés, trois descriptions anglaises et trois guides bibliographiques. Les transactions et la prise de contact ont lieu sur Leboncoin.

## Construire et vérifier

Node.js 22 ou ultérieur. Le générateur n’a aucune dépendance de production.

```sh
npm ci
npm run build
npm test
npm start
```

Le serveur local est disponible sur `http://127.0.0.1:4173`. Dans un autre terminal :

```sh
npx playwright install chromium
npm run test:browser
```

Pour Chrome déjà installé, définir `BROWSER_EXECUTABLE`. Pour vérifier un déploiement, définir `TEST_BASE_URL`. Les captures et les contrôles d’accessibilité sont enregistrés dans `test-results/`. Le contrôle navigateur parcourt plusieurs largeurs de 320 à 1440 pixels et teste le clavier, les galeries, la sélection ancienne, le stockage indisponible et le mode sans JavaScript. GitHub Actions exécute les mêmes vérifications.

## Sources du catalogue

- `data/books.json` : source unique des identifiants stables, titres, descriptions, prix, liens, statut et informations bibliographiques. Les prix des 15 nouveautés totalisent 322 €, hors livraison.
- `data/media.json` : ordre des vues, textes alternatifs observés et variantes d’images. Les 100 photographies des nouveautés gardent leurs octets et URL `/PRODUITS/Catalogue-2026-11/` ; les tests comparent leur SHA-256 à la base antérieure.
- `data/en.json` : descriptions anglaises des références 108, 113 et 118. Les prix, identifiants, liens et photos restent ceux de la source française.
- `data/site.json` : marque et renseignements publics autorisés. Paris et le profil Leboncoin sont publiés ; aucune identité personnelle, adresse, immatriculation ou adresse e-mail n’a été déduite d’un compte connecté. Le statut du vendeur reste à préciser avant une évolution de l’activité.
- `data/guides.json` et `content/` : guides éditoriaux et liens vers les exemplaires cités.
- `src/` : modèles, rendu, styles et amélioration progressive JavaScript. `src/seo.mjs` produit les données structurées ; les dates et auteurs incertains ne deviennent pas des faits confirmés.
- `scripts/build.mjs` : génération dans `dist/` ; `scripts/english.mjs` génère le pilote anglais.

Modifier les sources et reconstruire ; ne pas éditer les pages générées. `dist/`, les dépendances et les résultats locaux sont ignorés par Git. Les anciens originaux du dépôt restent conservés ; seuls les médias nécessaires sont copiés dans le site publié.

## Disponibilité et vente

`availability` accepte `unknown`, `available`, `reserved` et `sold`. Le statut initial est `unknown` : un lien valide ne prouve pas le stock. Afficher un état confirmé seulement après vérification réelle. Une date manuscrite de carnet n’est pas utilisée comme date d’impression dans le balisage.

Après une réservation ou une vente :

1. Identifier l’exemplaire par son ID ADM, puis mettre à jour son statut dans `data/books.json` et sa date `updated`.
2. Vérifier le prix et le lien ; `lastChecked` correspond au contrôle du catalogue/lien et ne remplace pas une expertise physique.
3. Reconstruire et tester. Les états réservé et vendu suppriment les liens d’achat et l’ajout à la sélection, y compris dans les sélections anciennes. Les données structurées suivent le statut ; `unknown` n’émet aucun `InStock`.
4. Publier par GitHub et vérifier la fiche réelle. Une fiche vendue reste une archive utile en 200 avec son état visible ; pour un retrait définitif, supprimer sa génération et conserver une vraie 404/410, sans redirection générale vers l’accueil.

Le site n’est pas synchronisé avec les ventes Leboncoin. Les anciennes sélections `atelier_cart`, objets ou identifiants, sont réconciliées avec le catalogue courant ; elles ne peuvent pas réintroduire un ancien prix ou un ancien lien.

## International et contact

Les seules coordonnées publiques retenues sont Paris et les accès Leboncoin existants, selon l’instruction du propriétaire. Les expéditions internationales ne sont pas organisées : le pilote anglais permet de consulter les livres en français et de demander des renseignements, sans promettre un achat ou une livraison à l’étranger. Les pages entièrement traduites possèdent leur canonical et des hreflang réciproques. Les autres pages proposent un lien de langue sans annoncer une équivalence inexistante.

Les pages contact, livraison, informations de publication et confidentialité décrivent le fonctionnement actuel. Elles ne constituent pas une certification de conformité juridique pour une future activité professionnelle. Aucune immatriculation, politique de retour professionnelle ou possibilité de paiement direct n’est inventée. Les évaluations restent consultables à leur source sur le profil Leboncoin ; aucune note ni quantité de ventes non vérifiée n’est affichée.

## Mesure

Google Search Console reste la source de suivi organique : pages, requêtes disponibles, impressions, clics, pays et appareils. L’application émet des événements locaux `atelier:interaction` (`view_book`, `view_photo`, `add_selection`, `remove_selection`, `outbound_listing`) avec la référence et la langue. Ils ne sont ni conservés ni transmis à un collecteur ; ils servent de point d’intégration vérifiable pour une mesure ultérieure adaptée. Aucun nouveau traceur publicitaire ou service d’audience n’est activé. Un clic vers Leboncoin n’est jamais compté comme vente.

## Publication et fraîcheur

Netlify construit `dist/` avec `npm run build`. Les ressources essentielles sont locales ; les polices sont accompagnées de leurs licences et la vidéo ne se charge qu’à la demande. Les fichiers JS et CSS portent une version dérivée des sources et des données. Le HTML garde `no-store` ; les images ont leur propre cache. Une ancienne page déjà ouverte doit être actualisée pour charger une publication.

Le build préserve le fichier de validation Google, produit un sitemap avec les images et les vraies dates de modification, déclare les canonicals et génère une vraie page 404. Les routes de sélection et d’erreur sont exclues de l’indexation. Il n’y a pas de réécriture globale des URL inconnues vers l’accueil.

Les en-têtes Netlify limitent les ressources à l’origine du site. Le lien de déploiement immuable permet les tests sans la barre de commentaires injectée dans les Deploy Previews, qui n’appartient pas au site. Pour revenir à une version antérieure, rétablir le commit ou le déploiement connu puis vérifier les URL et les données.

L’avancement des 32 recommandations et les dépendances externes sont détaillés dans `SUIVI-SEO.md`.

## Signaler une modification avec IndexNow

Le build publie le fichier texte de vérification défini dans `data/indexnow.json`. Cette clé propre au protocole est exposée publiquement pour la vérification du site ; elle n'est ni un jeton d'administration GitHub/Netlify ni une clé de compte. Ne pas y placer un identifiant privé d'un autre service.

Après une publication **réellement nouvelle ou modifiée**, nommer uniquement ses chemins canoniques. Par exemple, pour la livraison du guide sur les cartonnages et de l'index des guides :

```sh
npm run build
npm run indexnow -- /guides/ /guides/cartonnages-illustres/
```

Cette simulation n'effectue aucune requête. Une fois le déploiement confirmé, effectuer un envoi explicite :

```sh
npm run indexnow -- --submit /guides/ /guides/cartonnages-illustres/
```

Le script vérifie la clé et le contenu exact de chaque page en production avant **un seul lot** vers l'endpoint global IndexNow. Il refuse les pages hors sitemap, les pages noindex et les chemins non canoniques. Le journal local ignoré `.indexnow/submissions.json` distingue les réceptions HTTP 200, les réceptions 202 avec validation en attente et les erreurs. Une page identique déjà reçue est ignorée lors d'un second lancement. Conserver ce journal sur le poste qui réalise les soumissions ; il n'est pas partagé entre postes et ne suffit pas à détecter tous les envois effectués ailleurs.

Ne pas passer les 35 anciennes URL par défaut ni relancer les mêmes envois en boucle. La détection de changement porte sur les octets de la page, pas sur son sens : l'opérateur doit sélectionner des changements de contenu utiles, pas les seules retouches de présentation. Le sitemap sert à la découverte de l'historique. En cas de 429, le script s'arrête et conserve Retry-After ; aucun contournement, nouvel endpoint ni nouvelle clé ne doit servir à multiplier les demandes. Un envoi reçu n'est pas une page indexée. IndexNow complète le sitemap ; il ne remplace pas le suivi Search Console.

Ce mécanisme ne collecte aucune donnée visiteur et n'ajoute aucun appel réseau dans les pages. Il n'est pas exécuté automatiquement lors du build, des tests, des previews ou sur un calendrier. Sources : [protocole](https://www.indexnow.org/documentation), [bonnes pratiques](https://www.indexnow.org/faq).
