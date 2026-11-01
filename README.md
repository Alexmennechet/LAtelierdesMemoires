# L’Atelier des Mémoires

Site statique de présentation de sept ouvrages anciens. Les transactions et la prise de contact ont lieu sur les annonces Leboncoin. L’identité visuelle, les photographies et l’hébergement Netlify sont conservés.

## Développement

Node.js 22 ou ultérieur. Aucune dépendance n’est nécessaire pour générer ou servir le site ; les dépendances de développement servent aux tests.

```sh
npm ci
npm run build
npm start
```

Ouvrir `http://127.0.0.1:4173`. Le serveur sert uniquement `dist/`, avec les en-têtes de sécurité définis pour Netlify. Le répertoire `dist/` est généré et ignoré par Git. Il remplace l’ancienne page unique à la racine.

## Organisation

- `data/books.json` : titres, auteurs, dates confirmées, descriptions, prix indicatifs et liens des annonces. Les identifiants 101–107 sont stables pour conserver les anciennes sélections.
- `data/site.json` : identité publique du vendeur, contact, profil et textes de publication.
- `data/media.json` : dimensions et variantes des photographies.
- `src/` : JavaScript, fonctions de rendu et styles séparés.
- `scripts/build.mjs` : génération du HTML des 15 pages, métadonnées, données structurées et sitemap. Le contenu du catalogue est présent sans JavaScript.
- `assets/` : médias et polices hébergés localement, sans dépendance aux redirections GitHub.
- `PRODUITS/`, `Logos/`, `Bannières/`, `Vidéos/`, `Images/` : originaux conservés dans Git, exclus du dossier publié.
- `tests/` : régressions fonctionnelles, parcours Chrome, contrôles axe WCAG A/AA et captures.

## Catalogue et publication

Modifier les données dans `data/`, puis relancer la génération. Ne pas modifier les fichiers de `dist/` directement. La recherche accepte les titres, auteurs, catégories et années, avec ou sans accents ; son URL peut être partagée.

Les prix proviennent du catalogue existant et sont explicitement indicatifs. Aucune disponibilité en stock n’est déclarée dans les données structurées : le site n’est pas synchronisé avec Leboncoin. Une annonce doit être contrôlée manuellement avant de modifier le catalogue. Les données structurées décrivent les livres sans inventer d’offre commerciale ni de note client.

Les anciennes citations d’avis et le total de ventes ne sont plus affichés faute de source publique vérifiable. Renseigner `seller.profileUrl` avec le véritable profil Leboncoin pour proposer l’accès aux évaluations à la source.

Les champs d’identité de `data/site.json` sont laissés à `null` tant que le propriétaire ne les a pas fournis. La page de mentions le signale explicitement. **Les mentions et les éventuelles conditions de vente doivent être complétées selon le statut réel du vendeur avant la mise en production.** Le site ne déduit pas ces informations du compte GitHub.

La page « Achat & confidentialité » décrit le fonctionnement effectif du site. Elle ne prétend pas remplacer des CGV adaptées à une activité professionnelle.

## Vérification

```sh
npm run build
npm test
npx playwright install chromium
npm start
# Dans un second terminal :
npm run test:browser
```

Pour utiliser un Chrome existant, définir `BROWSER_EXECUTABLE` avec le chemin de son exécutable. Le contrôle navigateur vérifie cinq largeurs (320 à 1440 px), la recherche, les URL, les galeries, le focus, les fenêtres, les erreurs de stockage, les anciennes sélections, le mode sans JavaScript, les ressources locales et les en-têtes. Les captures et le rapport axe sont dans `test-results/`. Les résultats automatisés ne constituent pas une certification d’accessibilité ; un contrôle manuel avec lecteur d’écran reste utile.

GitHub Actions exécute ces contrôles sur les branches `main`, `codex/**` et les pull requests.

## Médias

Les variantes WebP de 160, 320, 640 et 1200 pixels sont pré-générées et versionnées. Une petite photographie n’est pas agrandie artificiellement. Les vignettes, cartes et galeries utilisent `srcset` et `sizes` ; seuls les formats nécessaires sont chargés. La vidéo est compressée, sans son, et se charge uniquement à la demande explicite. Elle est mise en pause quand l’onglet est masqué ; les animations respectent la réduction des mouvements.

Pour régénérer les images : Python avec Pillow et FFmpeg, puis `python scripts/optimize_media.py`. La photographie d’accueil est extraite de la vidéo d’ambiance existante pour éviter une superposition de textes. Les polices Lato et Playfair Display sont distribuées avec leurs licences OFL ; `scripts/fetch-fonts.py` documente leur téléchargement officiel. Ces étapes ne sont pas nécessaires sur Netlify. `npm run format` met en forme les sources.

## Netlify

`netlify.toml` définit `npm run build` et publie `dist/`. Il configure CSP, protection contre l’intégration en iframe, types MIME, politique de référent et permissions. L’application ne contient ni script exécutable ni style en ligne. Ne pas ajouter une redirection globale vers la page d’accueil : les pages de livres et la vraie page 404 sont statiques.

Après publication, vérifier les pages directes, les en-têtes réellement servis et le sitemap public. Les mesures de terrain et l’état d’indexation exigent les accès Netlify/Search Console ; ils ne sont pas déduits des tests locaux.
