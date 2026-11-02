# Mise en œuvre du plan SEO — 2 novembre 2026

Les 32 recommandations ont été acceptées. Ce lot traite le socle technique et prépare les étapes suivantes. Les états ci-dessous décrivent le contenu du lot ; la publication et ses contrôles doivent être consignés à la fin après déploiement.

| Réf. | État dans ce lot | Résultat ou dépendance |
|---|---|---|
| A01 | Implémenté | Navigation et sélection mobiles avec liens et boîtes de dialogue natives ; clic réel et clavier testés |
| A02 | Implémenté | Catalogue et fiches dans le HTML initial ; aucune attente window.onload ou préchargement bloquant |
| A03 | Implémenté | 22 URL françaises individuelles |
| A04 | Implémenté | Liens HTML, navigation clavier et amélioration progressive |
| A05 | Implémenté | Notre Belle Patrie : 1911, J. Monnier, septième édition ; inscription décrite sans authentification d’autographe |
| A06 | Implémenté, procédure manuelle | Source unique et quatre statuts ; pas de synchronisation automatique Leboncoin |
| A07 | Condition commerciale non remplie | L’utilisateur confirme que les expéditions internationales ne sont pas organisées |
| A08 | Implémenté | Canonicals propres et règle permanente pour /index.html ; vérifier Netlify après déploiement |
| A09 | Implémenté | Sitemap des pages canoniques avec photographies et dates de modification |
| A10 | Après déploiement | Contrôler le site dans Search Console et demander la réexploration des pages prioritaires |
| A11 | Implémenté | Titres et descriptions spécifiques ; positionnement livres anciens et illustrés ; réserves préservées |
| A12 | Implémenté | Product + Book + Offer et fil d’Ariane dans les fiches ; prix EUR, absence de stock inventé |
| A13 | Implémenté | Polices, logos, couverture, vidéo et photographies essentielles à la même origine |
| A14 | Implémenté | Variantes WebP, srcset, dimensions et chargement différé ; vidéo sur demande |
| A15 | Implémenté sur les vues observées | Légendes et alternatives issues de l’examen des 119 vues ; aucune image régénérée |
| A16 | Implémenté et testé | Contrastes, main, H1, clavier, focus et dialogues ; les tests automatisés ne valent pas certification |
| A17 | Informations actuelles publiables | Paris et profil existant uniquement ; identité/statut à compléter quand le propriétaire le décidera |
| A18 | Implémenté | Suppression des notes et volumes non sourcés ; accès aux évaluations Leboncoin à la source |
| A19 | Implémenté | Sélection distincte de la transaction, destination Leboncoin explicite |
| A20 | Instrumentation préparée | Événements locaux testables ; aucun collecteur centralisé ni traceur activé ; attribution de vente non disponible |
| A21 | Base de suivi établie | Point de départ Search Console relevé dans le dossier d’audit privé ; comparer les périodes après publication |
| A22 | Implémenté | États vendu/réservé et procédure d’archive ; vraies 404 conservées |
| A23 | Décision de conservation provisoire | Domaine Netlify conservé ; aucun domaine fourni, acheté ou réservé |
| A24 | Implémenté | Pilote anglais des références 108, 113 et 118 ; contact et livraison explicités |
| A25 | Implémenté | Canonicals et hreflang fr/en des trois traductions complètes |
| A26 | Implémenté | Sélecteur par liens, sans redirection IP |
| A27 | Propriété Bing vérifiée ; IndexNow ciblé ajouté | Fichier de vérification et commande avec simulation, vérification de production et protection contre les répétitions ; réception et indexation à distinguer. Le formulaire Bing du sitemap reste en erreur serveur au dernier contrôle |
| A28 | Implémenté | Trois guides sur les dates, l’état et les cartonnages illustrés, avec exemples et sources patrimoniales |
| A29 | Préparé, travail éditorial externe restant | Aucun message à un tiers envoyé ; développer des liens pertinents exige des démarches réelles |
| A30 | Pilote chinois conditionnel | Traduction relue, demande, accès depuis les réseaux chinois et vente internationale à valider |
| A31 | À configurer lors du pilote chinois | Compte propriétaire Baidu et diagnostic local requis ; aucune soumission ou indexation garantie |
| A32 | Projet commercial conditionnel | Statut, paiement direct, livraison et retours à définir ; modèle actuel conservé sur Leboncoin |

Les dépendances commerciales ne sont pas marquées comme réalisées. L’augmentation du trafic ou des ventes et le délai d’indexation ne sont pas garantis. Aucun budget publicitaire, achat de domaine, service payant ou envoi de message à un tiers n’a été engagé.

Validation locale avant publication : 9 tests unitaires réussis, parcours à 320/390/768/1280/1440 pixels et 34 contrôles Axe sans violation détectée. Les 100 photographies des nouveautés sont comparées par SHA-256. Le résultat de production et les démarches Search Console seront consignés dans le journal d’audit du propriétaire.
