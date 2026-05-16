# OrdiveX — MANUEL Interne v9.4.1

**Document confidentiel — Usage interne TrillionX uniquement**
Dernière mise Ã  jour : 16 Mai 2026 | Version : 9.4.1

---

# SOMMAIRE GÉNÉRAL

## PARTIE I — PRÉSENTATION & ARCHITECTURE

- [Chapitre 1 — Présentation Générale](#chapitre-1--présentation-générale)
- [Chapitre 2 — Architecture Technique](#chapitre-2--architecture-technique)
- [Chapitre 3 — Installation &amp; Déploiement](#chapitre-3--installation--déploiement)

## PARTIE II — MODULES FONCTIONNELS

- [Chapitre 4 — Authentification &amp; Sécurité](#chapitre-4--authentification--sécurité)
- [Chapitre 5 — Point de Vente (POS)](#chapitre-5--point-de-vente-pos)
- [Chapitre 6 — Double Traçabilité Vendeur/Préparateur](#chapitre-6--double-traçabilité-vendeurpréparateur)
- [Chapitre 7 — Multi-Onglets POS](#chapitre-7--multi-onglets-pos)
- [Chapitre 8 — Catalogue Produits](#chapitre-8--catalogue-produits)
- [Chapitre 9 — Gestion des Stocks &amp; FEFO](#chapitre-9--gestion-des-stocks--fefo)
- [Chapitre 10 — Caisse Journalière &amp; Clôture](#chapitre-10--caisse-journalière--clôture)
- [Chapitre 11 — Ordonnances](#chapitre-11--ordonnances)
- [Chapitre 12 — Dossiers Patients](#chapitre-12--dossiers-patients)
- [Chapitre 13 — Fournisseurs &amp; Bons de Commande](#chapitre-13--fournisseurs--bons-de-commande)
- [Chapitre 14 — Historique des Ventes &amp; Crédits](#chapitre-14--historique-des-ventes--crédits)
- [Chapitre 15 — Retours de Médicaments](#chapitre-15--retours-de-médicaments)
- [Chapitre 16 — Paiements : Espèces, Mobile Money, Assurance, Mixte, Crédit](#chapitre-16--paiements)
- [Chapitre 17 — Interactions Médicamenteuses &amp; Alertes Allergies](#chapitre-17--interactions-médicamenteuses)
- [Chapitre 18 — Déconditionnement (Vente Ã  l&#39;Unité)](#chapitre-18--déconditionnement)
- [Chapitre 19 — Centre d&#39;Impression](#chapitre-19--centre-dimpression)
- [Chapitre 20 — Traçabilité &amp; Pharmacovigilance](#chapitre-20--traçabilité--pharmacovigilance)

## PARTIE III — ANALYTIQUE & INTELLIGENCE

- [Chapitre 21 — Tableau de Bord](#chapitre-21--tableau-de-bord)
- [Chapitre 22 — Métriques Business Intelligence](#chapitre-22--métriques-business-intelligence)
- [Chapitre 23 — Rapports &amp; Analytique Avancée](#chapitre-23--rapports--analytique-avancée)
- [Chapitre 24 — Centre d&#39;Alertes](#chapitre-24--centre-dalertes)

## PARTIE IV — ADMINISTRATION & MAINTENANCE

- [Chapitre 25 — Paramètres &amp; Configuration](#chapitre-25--paramètres--configuration)
- [Chapitre 26 — Gestion des Utilisateurs &amp; Rôles](#chapitre-26--gestion-des-utilisateurs--rôles)
- [Chapitre 27 — Synchronisation Cloud (Supabase)](#chapitre-27--synchronisation-cloud)
- [Chapitre 28 — Sauvegarde &amp; Restauration](#chapitre-28--sauvegarde--restauration)
- [Chapitre 29 — SMS &amp; Notifications](#chapitre-29--sms--notifications)
- [Chapitre 30 — Naomie AI — Assistante Virtuelle](#chapitre-30--naomie-ai)
- [Chapitre 31 — Module de Stabilité &amp; Gestion d&#39;Erreurs](#chapitre-31--module-de-stabilité)
- [Chapitre 32 — Vérification de Version &amp; Mises Ã  Jour](#chapitre-32--vérification-de-version)

## PARTIE V — EXPLOITATION

- [Chapitre 33 — Onboarding Nouvelle Pharmacie](#chapitre-33--onboarding)
- [Chapitre 34 — Procédures de Maintenance](#chapitre-34--procédures-de-maintenance)
- [Chapitre 35 — Résolution de Problèmes (Troubleshooting)](#chapitre-35--troubleshooting)
- [Chapitre 36 — Raccourcis Clavier](#chapitre-36--raccourcis-clavier)
- [Chapitre 37 — Limites Connues &amp; Roadmap](#chapitre-37--limites-connues)
- [Annexe A — Structure des Fichiers](#annexe-a--structure-des-fichiers)
- [Annexe B — Schéma IndexedDB](#annexe-b--schéma-indexeddb)
- [Annexe C — Glossaire](#annexe-c--glossaire)

---

# PARTIE I — PRÉSENTATION & ARCHITECTURE

---

`<a id="chapitre-1--présentation-générale"></a>`

## Chapitre 1 — Présentation Générale

### 1.1 Qu'est-ce qu'OrdiveX ?

OrdiveX est un **ERP (Enterprise Resource Planning) complet** conçu spécifiquement pour la gestion des pharmacies en Afrique. Développé par **TrillionX**, il fonctionne en mode **offline-first** (100% hors-ligne) avec synchronisation cloud optionnelle.

### 1.2 Philosophie de Conception

| Principe                     | Description                                                                                     |
| ---------------------------- | ----------------------------------------------------------------------------------------------- |
| **Offline-First**      | L'app fonctionne Ã  100% sans internet. Les données sont stockées localement dans IndexedDB |
| **PWA**                | Progressive Web App installable sur PC, tablette et smartphone                                  |
| **FEFO**               | First Expired, First Out — gestion automatique des lots par date de péremption                |
| **Sécurité Patient** | 30+ interactions médicamenteuses vérifiées Ã  chaque vente                                 |
| **Multi-devises**      | GNF, XOF, MAD, EUR, USD — configurable par pharmacie                                           |
| **Mobile Money**       | Orange Money & MTN MoMo natifs                                                                  |

### 1.3 Modules Disponibles (17 pages)

| Module                | Fichier                      | Rôles Autorisés           |
| --------------------- | ---------------------------- | --------------------------- |
| Tableau de Bord       | `dashboard.js`             | Admin, Pharmacien, Caissier |
| Point de Vente (POS)  | `pos.js` (140 Ko)          | Admin, Pharmacien, Caissier |
| Caisse Journalière   | `caisse.js`                | Admin, Pharmacien, Caissier |
| Catalogue Produits    | `products.js`              | Admin, Pharmacien           |
| Gestion des Stocks    | `stock.js`                 | Admin, Pharmacien           |
| Réapprovisionnement  | (intégré stock)            | Admin, Pharmacien           |
| Ordonnances           | `prescriptions.js`         | Admin, Pharmacien           |
| Dossiers Patients     | `patients.js`              | Admin, Pharmacien           |
| Fournisseurs          | `suppliers.js`             | Admin, Pharmacien           |
| Bons de Commande      | (intégré suppliers)        | Admin, Pharmacien           |
| Traçabilité         | `traceability.js` (107 Ko) | Admin, Pharmacien           |
| Historique Ventes     | `sales.js`                 | Admin, Pharmacien, Caissier |
| Retours               | `returns.js`               | Admin, Pharmacien           |
| Rapports & Analytique | (intégré sales)            | Admin, Pharmacien           |
| Métriques Business   | `metrics.js`               | Admin, Pharmacien           |
| Centre d'Impression   | `print.js`                 | Admin, Pharmacien           |
| Alertes               | `alerts.js`                | Admin, Pharmacien, Caissier |
| Paramètres           | `settings.js`              | Admin uniquement            |

### 1.4 Stack Technologique

- **Frontend** : HTML5, CSS3, JavaScript ES6+ (Vanilla — aucun framework)
- **Base de données** : IndexedDB (via API native)
- **Cloud** : Supabase (PostgreSQL + Auth + Realtime)
- **Icônes** : Lucide Icons
- **Hébergement** : GitHub Pages
- **Impression** : API `window.print()` avec templates A4 et thermique 80mm

---

`<a id="chapitre-2--architecture-technique"></a>`

## Chapitre 2 — Architecture Technique

### 2.1 Structure des Fichiers

```
pharma_projet_v4/
â”œâ”€â”€ index.html              # Point d'entrée unique (SPA)
â”œâ”€â”€ version.json            # Manifest de version pour auto-update
â”œâ”€â”€ css/
â”‚   â””â”€â”€ main.css            # 10 000+ lignes — design system complet
â”œâ”€â”€ js/
â”‚   â”œâ”€â”€ db.js               # Moteur IndexedDB + Supabase sync (82 Ko)
â”‚   â”œâ”€â”€ auth.js             # Authentification, PIN, verrouillage
â”‚   â”œâ”€â”€ ui.js               # Composants UI (modals, toasts, charts)
â”‚   â”œâ”€â”€ mobile-money.js     # Gateway Orange Money / MTN MoMo
â”‚   â”œâ”€â”€ sms.js              # Service SMS AfricasTalking
â”‚   â”œâ”€â”€ pages/              # 17 modules de pages
â”‚   â”œâ”€â”€ ui/                 # Palette de commandes, feedback
â”‚   â”œâ”€â”€ utils/              # Animations, stabilité
â”‚   â”œâ”€â”€ components/         # Widget Naomie AI
â”‚   â””â”€â”€ vendor/             # Supabase SDK, Lucide
â””â”€â”€ docs/                   # Documentation interne
```

### 2.2 Flux de Données

```
Utilisateur â†’ UI (ui.js) â†’ Page Module (pos.js, etc.)
                                    â†“
                              DB.dbPut/dbAdd (db.js)
                                    â†“
                              IndexedDB (local)
                                    â†“ (si en ligne)
                              Supabase (cloud)
                                    â†“ (broadcast)
                              Autres appareils
```

### 2.3 Stores IndexedDB (OrdiveXDB v2)

| Store              | Clé          | Description                                    |
| ------------------ | ------------- | ---------------------------------------------- |
| `products`       | `id` (auto) | Catalogue médicaments                         |
| `stock`          | `id` (auto) | Entrées de stock par produit                  |
| `sales`          | `id` (auto) | Historique des ventes                          |
| `saleItems`      | `id` (auto) | Lignes de détail de chaque vente              |
| `patients`       | `id` (auto) | Fiches patients                                |
| `prescriptions`  | `id` (auto) | Ordonnances                                    |
| `suppliers`      | `id` (auto) | Fournisseurs                                   |
| `purchaseOrders` | `id` (auto) | Bons de commande                               |
| `movements`      | `id` (auto) | Mouvements de stock (entrée/sortie)           |
| `lots`           | `id` (auto) | Lots avec numéro, DLC, quantité              |
| `cashRegister`   | `id` (auto) | Écritures de caisse (entrée/sortie/clôture) |
| `returns`        | `id` (auto) | Retours de médicaments                        |
| `settings`       | `key`       | Paramètres clé-valeur                        |
| `users`          | `id` (auto) | Utilisateurs et rôles                         |
| `auditLog`       | `id` (auto) | Journal d'audit horodaté                      |
| `syncQueue`      | `id` (auto) | File d'attente de synchronisation              |

### 2.4 LiveSync — Rafraîchissement Automatique

Quand une donnée change dans IndexedDB (ex: nouvelle vente), le système `_notifyUIChange()` dans `db.js` rafraîchit automatiquement la page active si elle dépend du store modifié :

| Page Active   | Stores Écoutés                                                |
| ------------- | --------------------------------------------------------------- |
| `dashboard` | `sales`, `saleItems`, `products`, `stock`               |
| `pos`       | *(jamais rafraîchi automatiquement — trop risqué)*         |
| `products`  | `products`                                                    |
| `stock`     | `stock`, `products`                                         |
| `sales`     | `sales`                                                       |
| `caisse`    | `cashRegister`, `sales`                                     |
| `settings`  | `users` *(pas settings pour éviter les reloads en boucle)* |

---

`<a id="chapitre-3--installation--déploiement"></a>`

## Chapitre 3 — Installation & Déploiement

### 3.1 Prérequis

- Navigateur moderne : Chrome 90+, Edge 90+, Firefox 90+, Safari 15+
- Espace disque : minimum 500 Mo disponible pour IndexedDB
- Résolution écran : minimum 360px (mobile) / recommandé 1280px+ (desktop)

### 3.2 Installation sur PC (PWA)

1. Ouvrir `https://johnnyjonnes78-tech.github.io/Xpharma/` dans Chrome
2. Cliquer sur l'icône âŠ• "Installer" dans la barre d'adresse
3. Confirmer l'installation
4. L'app apparaît comme une application native sur le bureau

### 3.3 Installation sur Mobile

1. Ouvrir l'URL dans Chrome Android / Safari iOS
2. Menu â‰¡ â†’ "Ajouter Ã  l'écran d'accueil"
3. L'app s'installe avec son icône

### 3.4 Déploiement GitHub Pages

```bash
# Depuis le répertoire du projet
git add -A
git commit -m "v9.4.1: description des changements"
git push origin main
```

Le site se met Ã  jour automatiquement en 2-5 minutes via GitHub Actions.

### 3.5 Mise Ã  jour de version

1. Modifier `APP_VERSION` dans `index.html` ligne 22
2. Modifier `version.json` Ã  la racine
3. Incrémenter les `?v=X.X.X` dans les balises `<script>` de `index.html`
4. Push sur `main`
5. Les utilisateurs recevront une notification via Naomie AI

### 3.6 Configuration Supabase (Cloud Sync)

1. Créer un projet sur [supabase.com](https://supabase.com)
2. Exécuter `supabase_schema.sql` dans l'éditeur SQL
3. Dans OrdiveX â†’ Paramètres â†’ Cloud : entrer l'URL et la clé `anon`
4. Cliquer "Tester la connexion"
5. Activer "Push automatique"

---

*Suite dans les parties suivantes...*

# PARTIE II — MODULES FONCTIONNELS

---

`<a id="chapitre-4--authentification--sécurité"></a>`

## Chapitre 4 — Authentification & Sécurité

### 4.1 Système de Connexion

Au lancement, OrdiveX affiche un écran de sélection d'utilisateur. Chaque utilisateur a :

- **Nom d'utilisateur** (login)
- **Mot de passe** (hashé en SHA-256 dans IndexedDB)
- **Code PIN** (4 chiffres, obligatoire)
- **Rôle** (admin, pharmacien, caissier)

### 4.2 Code PIN — Règles

| Règle                | Détail                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------- |
| **Obligatoire** | Chaque utilisateur DOIT définir un PIN Ã  sa première connexion                               |
| **Par défaut** | Les utilisateurs créés avant v9.4.1 n'ont pas de PIN â†’ ils sont forcés d'en créer un     |
| **Format**      | 4 chiffres exactement                                                                             |
| **Usage**       | Verrouillage rapide, validation de vente sensible                                                 |
| **Stockage**    | Champ `pin` dans le store `users` (en clair dans IndexedDB, hashé en production recommandé) |

### 4.3 Verrouillage Automatique

Après **5 minutes d'inactivité** (aucun mouvement souris, clavier, ou touch), l'écran se verrouille :

- L'utilisateur doit saisir son mot de passe pour reprendre
- Option "Changer d'utilisateur" pour revenir Ã  l'écran de login
- **Le panier POS n'est PAS perdu** (conservé en mémoire)

### 4.4 Rôles et Permissions

| Permission                              | Admin | Pharmacien | Caissier |
| --------------------------------------- | :----: | :--------: | :------: |
| Point de Vente                          | âœ… |   âœ…   |  âœ…  |
| Voir le tableau de bord                 | âœ… |   âœ…   |  âœ…  |
| Historique ventes                       | âœ… |   âœ…   |  âœ…  |
| Alertes                                 | âœ… |   âœ…   |  âœ…  |
| Catalogue produits                      | âœ… |   âœ…   |  âŒ  |
| Gestion des stocks                      | âœ… |   âœ…   |  âŒ  |
| Ordonnances                             | âœ… |   âœ…   |  âŒ  |
| Patients                                | âœ… |   âœ…   |  âŒ  |
| Fournisseurs                            | âœ… |   âœ…   |  âŒ  |
| Retours                                 | âœ… |   âœ…   |  âŒ  |
| Métriques                              | âœ… |   âœ…   |  âŒ  |
| Impression                              | âœ… |   âœ…   |  âŒ  |
| Traçabilité                           | âœ… |   âœ…   |  âŒ  |
| **Paramètres**                   | âœ… |   âŒ   |  âŒ  |
| **Créer/supprimer utilisateurs** | âœ… |   âŒ   |  âŒ  |

### 4.5 Journal d'Audit

Chaque action est tracée dans le store `auditLog` :

```json
{
  "id": 1234,
  "timestamp": 1715875200000,
  "userId": "user_001",
  "userName": "Dr. Diallo",
  "action": "SALE_CREATED",
  "details": "Vente #5023 — 3 articles — 125 000 GNF",
  "page": "pos"
}
```

Actions auditées : connexion, déconnexion, vente, annulation, modification produit, changement stock, destruction de lot, création utilisateur, modification paramètres, export données, import CSV.

---

`<a id="chapitre-5--point-de-vente-pos"></a>`

## Chapitre 5 — Point de Vente (POS)

### 5.1 Vue d'Ensemble

Le POS est le **cœur d'OrdiveX** (fichier le plus volumineux : 140 Ko, 2 854 lignes). Il se compose de :

- **Panneau gauche** : Grille de produits avec recherche, catégories, tri
- **Panneau droit** : Panier, patient, ordonnance, paiement, validation

### 5.2 Recherche de Produits

La barre de recherche filtre en temps réel par :

- Nom commercial (ex: "Doliprane")
- DCI / Molécule (ex: "paracétamol")
- Code-barres EAN
- Code CIP
- Code interne

**Sur mobile** : La recherche utilise `DB.dbSearchProducts()` avec limite de 100 résultats pour la performance.
**Sur PC** : Tous les produits sont chargés en mémoire pour un filtrage instantané.

### 5.3 Catégories et Tri

- **Catégories** : Pilules filtrantes en haut (Toutes, Antibiotiques, Antalgiques, etc.)
- **Tri** : Nom Aâ†’Z, Nom Zâ†’A, Prix â†‘, Prix â†“, Stock â†‘, Stock â†“
- Les produits en **rupture** sont toujours affichés en dernier, quelle que soit le tri

### 5.4 Carte Produit

Chaque carte affiche :

- Badge **Rx** (prescription requise) ou **OTC** (vente libre)
- Badge **SC** (substance contrôlée) en rouge si applicable
- Nom, DCI, catégorie
- Prix de vente avec unité (bte, fl, tube...)
- Stock en temps réel avec indicateur couleur (vert/orange/rouge)
- Marge (visible uniquement pour admin/pharmacien)
- Boutons : **Boîte**, **Plaquette** (si déconditionnement), **Unité**, **Notice â„¹ï¸**

### 5.5 Ajout au Panier

Quand on clique sur un produit ou un bouton d'unité :

1. Vérification du stock disponible
2. **Vérification des interactions médicamenteuses** avec les produits déjÃ  dans le panier
3. **Vérification des allergies** si un patient est sélectionné
4. Sélection automatique du lot FEFO (First Expired, First Out)
5. Ajout au panier avec prix calculé selon l'unité choisie
6. Si produit déjÃ  dans le panier â†’ incrémentation de la quantité

### 5.6 Gestion du Panier

Pour chaque article du panier :

- **+/-** : Ajuster la quantité (max = stock disponible)
- **Poubelle** : Retirer du panier
- **Prix modifiable** (remise ponctuelle sur l'article)
- Sous-total par article

En bas du panier :

- **Sous-total** : Somme de tous les articles
- **Remise globale** : Montant en GNF Ã  déduire
- **TOTAL À PAYER** : Sous-total - Remise

### 5.7 Sélection Patient

- Cliquer "Choisir un patient..." â†’ Répertoire avec recherche
- Ou cliquer "+ Nouveau" â†’ Formulaire rapide (nom, téléphone, allergies)
- Le patient sélectionné active :
  - Vérification des allergies Ã  chaque ajout au panier
  - Possibilité de vente Ã  crédit
  - Traçabilité complète sur le reçu

### 5.8 Flux de Validation

```
Panier rempli â†’ Choisir mode de paiement â†’ Valider (F5)
     â†“
Vérification : Panier non vide ?
     â†“
Vérification : Caisse clôturée aujourd'hui ? â†’ Si oui : BLOQUÉ
     â†“
Vérification : Crédit sans patient ? â†’ Si oui : BLOQUÉ
     â†“
Vérification : Montant encaissé suffisant ? (pour espèces)
     â†“
Création de la vente dans IndexedDB (store 'sales')
     â†“
Création des lignes détail (store 'saleItems')
     â†“
Déstockage automatique FEFO (store 'stock')
     â†“
Enregistrement mouvement (store 'movements')
     â†“
Si ordonnance liée â†’ mise Ã  jour statut (store 'prescriptions')
     â†“
Affichage du reçu (modal avec boutons Imprimer / Fermer)
     â†“
Reset du panier
```

---

`<a id="chapitre-6--double-traçabilité-vendeurpréparateur"></a>`

## Chapitre 6 — Double Traçabilité Vendeur/Préparateur

### 6.1 Concept

En pharmacie, il est fréquent que **deux personnes** interviennent dans une vente :

- Le **Préparateur** : prépare le panier, vérifie les stocks, ajoute les produits
- Le **Vendeur/Caissier** : encaisse le paiement et valide la vente

OrdiveX trace les deux rôles séparément.

### 6.2 Scénario Type

```
1. Pharmacien A se connecte â†’ prépare un panier (ordonnance du Dr. Camara)
2. Pharmacien A clique "â¸ Attente" â†’ le panier est sauvegardé avec son ID
3. Pharmacien A se déconnecte (ou le caissier prend le relais)
4. Caissier B se connecte â†’ le panier est automatiquement restauré
5. Caissier B encaisse â†’ la vente est enregistrée avec :
   - sellerName = "Caissier B" (celui qui a cliqué Valider)
   - preparerName = "Pharmacien A" (celui qui a préparé le panier)
```

### 6.3 Implémentation Technique

**Mise en attente** (`mettreEnAttente()` — pos.js ligne 1656) :

```javascript
window._heldCart = {
  items: [...posCart],          // Copie du panier
  patient: posCurrentPatient,   // Patient lié
  rx: posCurrentRx,            // Ordonnance liée
  preparerId: DB.AppState.currentUser?.id,    // ID du préparateur
  preparerName: DB.AppState.currentUser?.name  // Nom du préparateur
};
```

**Restauration** (lors du `renderFullPOSUI()` — pos.js ligne 586) :

```javascript
if (window._heldCart) {
  posCart = window._heldCart.items;
  posCurrentPatient = window._heldCart.patient;
  posCurrentRx = window._heldCart.rx;
  // Si le préparateur est différent du vendeur actuel â†’ sauvegarder
  if (window._heldCart.preparerId !== DB.AppState.currentUser?.id) {
    window._heldCartPreparer = {
      id: window._heldCart.preparerId,
      name: window._heldCart.preparerName
    };
  }
}
```

**Enregistrement de la vente** (pos.js ligne 1887) :

```javascript
const saleData = {
  sellerName: DB.AppState.currentUser?.name,           // Vendeur = celui qui valide
  preparerId: window._heldCartPreparer?.id || currentUser.id,  // Préparateur
  preparerName: window._heldCartPreparer?.name || null,
  // ... reste des données
};
```

### 6.4 Affichage sur le Reçu

Le reçu (A4 et thermique) affiche les deux noms si différents :

```
Vendeur : Caissier B
Préparateur : Pharmacien A    â† affiché UNIQUEMENT si différent du vendeur
```

### 6.5 Cas Particuliers

| Situation                                           | Résultat                                                                |
| --------------------------------------------------- | ------------------------------------------------------------------------ |
| Même personne prépare et vend                     | `preparerName = null` (pas affiché séparément)                      |
| Préparateur met en attente, même personne reprend | Pas de double traçabilité                                              |
| Panier en attente mais personne ne reprend          | Le panier reste en `window._heldCart` jusqu'au rechargement de la page |
| App rechargée avant reprise                        | **Le panier en attente est PERDU** (stocké en RAM uniquement)     |

> âš ï¸ **Limitation connue** : Le panier en attente est stocké en `window._heldCart` (variable JavaScript en RAM). Si l'app est rechargée, le panier disparaît. Pour une persistance, il faudrait le sauvegarder dans IndexedDB.

---

`<a id="chapitre-7--multi-onglets-pos"></a>`

## Chapitre 7 — Multi-Onglets POS

### 7.1 Concept

Depuis la v9.4, le POS supporte **plusieurs ventes simultanées** via un système d'onglets. Chaque onglet a son propre panier, patient et ordonnance.

### 7.2 Utilisation

- **Ajouter un onglet** : Cliquer le bouton "+" dans la barre d'onglets
- **Basculer** : Cliquer sur l'onglet souhaité
- **Fermer** : Cliquer le "Ã—" sur l'onglet (confirmation si panier non vide)
- **Minimum** : 1 onglet (impossible de fermer le dernier)

### 7.3 Données par Onglet

Chaque session `_posSessions[i]` contient :

```javascript
{
  id: 1,              // Identifiant unique
  label: 'Vente 1',   // Nom affiché dans l'onglet
  cart: [],            // Panier (copie indépendante)
  patient: null,       // Patient sélectionné
  rx: null             // Ordonnance liée
}
```

### 7.4 Scénario Multi-Clients

```
Onglet 1 : Client A achète du Doliprane (en attente de la monnaie)
    â†’ Cliquer "+"
Onglet 2 : Client B arrive, urgent, achète de l'Amoxicilline
    â†’ Valider la vente du client B
    â†’ Revenir Ã  l'onglet 1
    â†’ Continuer la vente du client A
```

### 7.5 Règles Importantes

- Le badge numérique sur chaque onglet indique le nombre d'articles dans le panier
- Changer d'onglet **sauvegarde automatiquement** l'onglet actuel
- Les données produits et stocks sont **partagées** entre tous les onglets (un seul pool de données)
- Si Client A achète le dernier stock d'un produit, Client B le verra en rupture

---

*Suite : Chapitres 8-15 dans la partie suivante...*

`<a id="chapitre-8--catalogue-produits"></a>`

## Chapitre 8 — Catalogue Produits

### 8.1 Fiche Produit Complète

Chaque médicament contient les champs suivants :

| Champ                    | Type   | Obligatoire | Description                                             |
| ------------------------ | ------ | :---------: | ------------------------------------------------------- |
| `name`                 | Texte  |   âœ…   | Nom commercial (ex: Doliprane 500mg)                    |
| `dci`                  | Texte  |   âŒ   | Dénomination Commune Internationale (ex: Paracétamol) |
| `brand`                | Texte  |   âŒ   | Laboratoire/Marque                                      |
| `category`             | Texte  |   âŒ   | Catégorie (55+ prédéfinies + saisie libre)           |
| `form`                 | Texte  |   âŒ   | Forme (comprimé, sirop, injectable...)                 |
| `purchasePrice`        | Nombre |   âœ…   | Prix d'achat HT                                         |
| `salePrice`            | Nombre |   âœ…   | Prix de vente                                           |
| `minStock`             | Nombre |   âŒ   | Seuil d'alerte stock bas (défaut: 10)                  |
| `ean`                  | Texte  |   âŒ   | Code-barres EAN-13                                      |
| `cip`                  | Texte  |   âŒ   | Code CIP                                                |
| `requiresPrescription` | Bool   |   âŒ   | Nécessite une ordonnance                               |
| `isControlled`         | Bool   |   âŒ   | Substance contrôlée (tableau)                         |
| `allowUnitSale`        | Bool   |   âŒ   | Autoriser la vente Ã  l'unité                        |
| `subUnitsPerBox`       | Nombre |   âŒ   | Plaquettes par boîte                                   |
| `unitsPerBox`          | Nombre |   âŒ   | Unités par plaquette                                   |
| `unitPrice`            | Nombre |   âŒ   | Prix par unité                                         |
| `subUnitPrice`         | Nombre |   âŒ   | Prix par plaquette                                      |

### 8.2 Import CSV Massif

OrdiveX supporte l'importation de **50 000+ produits** via CSV :

1. Aller dans Catalogue â†’ bouton "Importer CSV"
2. Sélectionner le fichier (colonnes : name, dci, brand, form, buyPrice, sellPrice, minStock...)
3. Le système traite par **lots de 100** pour éviter les blocages
4. Rapport d'import affiché Ã  la fin (succès, doublons, erreurs)

### 8.3 KPIs du Catalogue (Dashboard Inventaire)

| KPI                   | Calcul                                                        |
| --------------------- | ------------------------------------------------------------- |
| Valeur Stock (Achat)  | Î£ (purchasePrice Ã— quantité) pour tous les produits    |
| Valeur Stock (Vente)  | Î£ (salePrice Ã— quantité) pour tous les produits        |
| Bénéfice Potentiel  | Valeur Vente - Valeur Achat                                   |
| Produits en Rupture   | Nombre de produits avec stock = 0                             |
| Produits en Stock Bas | Nombre de produits avec stock < minStock                      |
| Marge Moyenne         | Moyenne de ((salePrice - purchasePrice) / salePrice Ã— 100) |

### 8.4 Notice Médicale

Chaque produit peut avoir une notice avec :

- Posologie, Contre-indications, Effets indésirables
- Précautions d'emploi, Interactions
- Accessible via le bouton â„¹ï¸ dans le POS ou la fiche produit

---

`<a id="chapitre-9--gestion-des-stocks--fefo"></a>`

## Chapitre 9 — Gestion des Stocks & FEFO

### 9.1 Protocole FEFO

**FEFO = First Expired, First Out** — Le lot avec la date d'expiration la plus proche est vendu en premier.

```
Lot A : Expire le 2026-08-15 — 20 unités
Lot B : Expire le 2027-01-10 — 50 unités
Lot C : Expire le 2026-06-01 — 5 unités   â† Vendu en premier !

Vente de 8 unités â†’ 5 du Lot C + 3 du Lot A
```

### 9.2 Mouvements de Stock

Chaque modification de stock crée un mouvement traçable :

| Type            | Déclencheur           | Effet       |
| --------------- | ---------------------- | ----------- |
| `entry`       | Réception fournisseur | +quantité  |
| `sale`        | Vente validée         | -quantité  |
| `return`      | Retour client          | +quantité  |
| `adjustment`  | Inventaire manuel      | ±quantité |
| `destruction` | PV de destruction      | -quantité  |

### 9.3 Inventaire

L'inventaire dans OrdiveX permet de :

1. Voir tous les produits avec stock théorique vs stock physique
2. Corriger les écarts (ajustement + ou -)
3. Générer un rapport imprimable paginé (500 produits/page)

### 9.4 Alertes Stock

| Type      | Condition                 | Couleur         |
| --------- | ------------------------- | --------------- |
| Rupture   | stock = 0                 | ðŸ”´ Rouge  |
| Stock bas | 0 < stock â‰¤ minStock | ðŸŸ¡ Orange |
| Stock OK  | stock > minStock          | ðŸŸ¢ Vert   |

---

`<a id="chapitre-10--caisse-journalière--clôture"></a>`

## Chapitre 10 — Caisse Journalière & Clôture

### 10.1 Vue Caisse

La page Caisse affiche en temps réel :

- **Total des ventes du jour** (CA brut)
- **Répartition par mode de paiement** (Espèces, Orange Money, MTN MoMo, Crédit, Assurance)
- **Graphique Donut** interactif avec tooltip au survol
- **Liste de toutes les ventes** du jour avec détails
- **Mouvements manuels** (entrées/sorties de caisse)

### 10.2 Mouvements Manuels

Un admin/pharmacien peut ajouter des entrées/sorties manuelles :

- **Entrée** : Fond de caisse, encaissement dette, autre revenu
- **Sortie** : Achat fournitures, frais divers, retrait

### 10.3 Clôture de Caisse

**Procédure :**

1. Cliquer "Clôturer la caisse"
2. Saisir le **montant physique compté** (espèces en caisse)
3. Le système calcule l'**écart de caisse** :
   - Écart = Montant compté - Total théorique espèces
   - Écart = 0 â†’ âœ… Caisse juste
   - Écart > 0 â†’ âš ï¸ Excédent
   - Écart < 0 â†’ ðŸ”´ Manquant

**Après clôture :**

- Aucune vente ne peut être enregistrée pour cette journée
- Un rapport de caisse est disponible dans le Centre d'Impression
- L'enregistrement de type `closure` est créé dans `cashRegister`

### 10.4 Règle Critique

> âš ï¸ **Une fois la caisse clôturée, le POS est BLOQUÉ pour le jour.** Toute tentative de vente affiche : "La caisse est clôturée pour aujourd'hui."

---

`<a id="chapitre-11--ordonnances"></a>`

## Chapitre 11 — Ordonnances

### 11.1 Création

Une ordonnance contient :

- **Médecin prescripteur** (nom, spécialité)
- **Patient** (lié depuis les dossiers)
- **Date de prescription**
- **Liste des médicaments** avec posologie et durée
- **Statut** : en attente â†’ validée â†’ dispensée

### 11.2 Liaison au POS

Au POS, activer le toggle "Ordonnance" puis :

1. "Lier une ordonnance" â†’ sélectionner dans la liste
2. Les produits de l'ordonnance sont **automatiquement ajoutés** au panier
3. Les produits en rupture sont signalés
4. Le pharmacien peut valider pharmaceutiquement l'ordonnance

### 11.3 Statuts

| Statut        | Signification                 |
| ------------- | ----------------------------- |
| `pending`   | En attente de dispensation    |
| `validated` | Validée par le pharmacien    |
| `dispensed` | Dispensée (vente effectuée) |
| `cancelled` | Annulée                      |

---

`<a id="chapitre-12--dossiers-patients"></a>`

## Chapitre 12 — Dossiers Patients

### 12.1 Fiche Patient

| Champ             | Description                                         |
| ----------------- | --------------------------------------------------- |
| Nom complet       | Obligatoire                                         |
| Téléphone       | Pour SMS et contact                                 |
| Adresse           | Optionnel                                           |
| Date de naissance | Optionnel                                           |
| Sexe              | Homme / Femme                                       |
| Allergies         | **CRITIQUE** — déclenche les alertes au POS |
| Statut            | Souscripteur principal / Ayant droit                |
| Notes             | Informations libres                                 |

### 12.2 Alertes Allergies

Si un patient a "Pénicilline" dans ses allergies et qu'on ajoute de l'Amoxicilline au panier :

```
ðŸš¨ ALERTE ALLERGIE
Ce patient est allergique Ã  : Pénicilline
L'Amoxicilline contient un dérivé de pénicilline.
Voulez-vous quand même ajouter ce produit ?
[Annuler] [Ajouter malgré tout]
```

### 12.3 Historique Patient

Depuis la fiche patient, on voit :

- Toutes les ventes passées (avec montants et détails)
- Les ordonnances liées
- Les crédits en cours et leur montant

### 12.4 Import CSV Patients

Même logique que pour les produits — import massif avec colonnes : name, phone, address, sex, allergies.

---

`<a id="chapitre-13--fournisseurs--bons-de-commande"></a>`

## Chapitre 13 — Fournisseurs & Bons de Commande

### 13.1 Fiche Fournisseur

- Nom, téléphone, email, adresse
- **Score fournisseur** : évaluation de la fiabilité (livraisons Ã  temps, qualité)
- Historique des commandes

### 13.2 Flux de Commande

```
1. Créer un bon de commande â†’ Statut : "Brouillon"
2. Ajouter les produits et quantités souhaitées
3. Envoyer la commande â†’ Statut : "Envoyée"
4. Réceptionner la livraison :
   - Vérifier les quantités reçues vs commandées
   - Saisir les numéros de lot et dates de péremption
   - Valider â†’ Statut : "Réceptionnée"
5. Le stock est automatiquement mis Ã  jour (+entrées)
6. Les mouvements de stock sont créés
```

### 13.3 Réception Partielle

Si le fournisseur livre 80 boîtes sur 100 commandées :

- Saisir 80 Ã  la réception
- Le bon passe en "Partiellement réceptionné"
- Les 20 restantes apparaissent comme "En attente"

---

`<a id="chapitre-14--historique-des-ventes--crédits"></a>`

## Chapitre 14 — Historique des Ventes & Crédits

### 14.1 Liste des Ventes

Toutes les ventes sont affichées avec :

- Numéro de vente, date, heure
- Patient (si identifié)
- Montant total
- Mode de paiement (badge couleur)
- Statut : âœ… Payée, â³ Crédit en cours, ðŸ”„ Retournée

### 14.2 Détail d'une Vente

En cliquant sur une vente :

- Liste complète des articles (nom, quantité, prix unitaire, sous-total)
- Informations patient
- Vendeur et Préparateur (double traçabilité)
- Ordonnance liée (si applicable)
- Boutons : Imprimer, Retour

### 14.3 Encaissement de Dettes

Pour les ventes Ã  crédit (`status: 'pending'`) :

1. Ouvrir la vente dans l'historique
2. Cliquer "Encaisser la dette"
3. Saisir le mode de paiement
4. La vente passe en `status: 'completed'`

### 14.4 Export CSV

Bouton "Exporter" â†’ télécharge un CSV avec toutes les ventes filtrées, compatible Excel.

---

`<a id="chapitre-15--retours-de-médicaments"></a>`

## Chapitre 15 — Retours de Médicaments

### 15.1 Procédure

1. Aller dans Historique des Ventes â†’ trouver la vente
2. Cliquer "Retour" ðŸ”„
3. Sélectionner les articles Ã  retourner (tout ou partie)
4. Choisir le motif : erreur, péremption, contre-indication, autre
5. Choisir le mode de remboursement : Espèces, Mobile Money, Avoir
6. Valider

### 15.2 Effets Automatiques

- Le stock est **réajusté Ã  la hausse** pour les articles retournés
- Un mouvement de type `return` est créé
- La vente originale est marquée comme "partiellement retournée" ou "retournée"
- Le montant de remboursement est tracé

### 15.3 Conditions

- Seules les ventes **non annulées** peuvent faire l'objet d'un retour
- Un article déjÃ  retourné ne peut pas être retourné une seconde fois
- Le retour est tracé dans le journal d'audit

---

*Suite : Chapitres 16-24 dans la partie suivante...*

`<a id="chapitre-16--paiements"></a>`

## Chapitre 16 — Paiements : Espèces, Mobile Money, Assurance, Mixte, Crédit

### 16.1 Espèces

Le mode par défaut.

- L'utilisateur saisit le **Montant encaissé**.
- Le système calcule et affiche automatiquement la **Monnaie Ã  rendre**.
- Des **raccourcis rapides** (ex: billets de 10 000, 20 000, 50 000, 100 000 GNF) apparaissent pour faciliter la saisie.

### 16.2 Mobile Money (Orange Money & MTN MoMo)

Intégration via le module `mobile-money.js`.

1. Sélectionner O. Money ou MTN MoMo.
2. Saisir le **Numéro de téléphone** du client.
3. Cliquer "Envoyer la demande de paiement".
4. Le client reçoit un **USSD Push** (popup sur son téléphone) pour entrer son code PIN.
5. Le système interroge l'API en boucle (polling) jusqu'Ã  validation ou échec.
6. Si succès â†’ La vente est validée.

### 16.3 Paiement Mixte (Combiné)

Utile quand le client n'a pas assez d'espèces et complète par Mobile Money.

- Permet de diviser le total en **deux montants** et **deux méthodes** (ex: Espèces + Orange Money).
- La somme des deux montants doit être égale (ou supérieure, pour la monnaie) au total.

### 16.4 Assurance & Tiers Payant

Conçu pour les prises en charge entreprises ou assurances privées.

- **Organisme** : Saisir le nom de l'assurance (ex: NSIA).
- **Réf.** : Numéro du bon de prise en charge.
- **Part Entreprise** : Montant couvert par l'assurance (reste en dette / crédit).
- **Part Patient** (Ticket modérateur) : Total - Part Entreprise. Le patient paie ce reste Ã  charge immédiatement (Espèces ou Mobile Money).

### 16.5 Vente Ã  Crédit

- **Patient Obligatoire** : Impossible de faire crédit Ã  un client "Anonyme".
- **Date d'échéance** : A fixer (par défaut +30 jours).
- La vente est enregistrée avec le statut `pending`.
- Le montant s'ajoute Ã  la dette du patient.

---

`<a id="chapitre-17--interactions-médicamenteuses"></a>`

## Chapitre 17 — Interactions Médicamenteuses & Alertes Allergies

### 17.1 Base de Connaissances

OrdiveX intègre une base statique des **30 combinaisons critiques** les plus dangereuses (ex: méthotrexate + triméthoprime, warfarine + aspirine).

- Moteur de détection : `checkDrugInteractions()` dans `pos.js`.
- Se base sur le champ **DCI** des produits. Il est donc crucial de bien renseigner les DCI.

### 17.2 Niveau d'Alertes

| Niveau       | Action                 | Message type                     |
| ------------ | ---------------------- | -------------------------------- |
| `grave`    | ðŸ”´ Alerte Rouge  | "Risque d'hémorragie sévère." |
| `modéré` | ðŸŸ¡ Alerte Orange | "Absorption réduite."           |

### 17.3 Déclenchement

L'alerte se déclenche au moment où l'utilisateur clique sur un produit pour l'ajouter au panier, si ce produit interagit avec un produit **déjÃ  présent** dans le panier.
L'utilisateur doit confirmer ("Ajouter malgré tout") ou annuler.

---

`<a id="chapitre-18--déconditionnement"></a>`

## Chapitre 18 — Déconditionnement (Vente Ã  l'Unité)

### 18.1 Configuration Produit

Pour qu'un produit soit vendu Ã  l'unité, il doit avoir :

- `allowUnitSale: true`
- `unitsPerBox`: Nombre d'unités par plaquette (ex: 10)
- `subUnitsPerBox`: Nombre de plaquettes par boîte (ex: 2)
- `unitPrice`: Prix de vente Ã  l'unité
- `subUnitPrice`: Prix de vente Ã  la plaquette

### 18.2 Impact au POS

Au lieu d'un seul bouton, le POS affiche trois boutons :

- **Boîte**
- **Plaquette**
- **Unité**

### 18.3 Gestion du Stock

Le stock interne (`stock` dans IndexedDB) est géré en **Unités de Base**.

- Si une boîte contient 20 unités, réceptionner 1 boîte ajoute `20` au stock interne.
- Vendre 1 unité soustrait `1`.
- Vendre 1 boîte soustrait `20`.
- L'affichage dans le POS reconvertit les unités en "Boîtes + Unités" (ex: "1 bte + 5u").

---

`<a id="chapitre-19--centre-dimpression"></a>`

## Chapitre 19 — Centre d'Impression

### 19.1 Modèles Disponibles

OrdiveX propose plusieurs modèles d'impression générés dynamiquement en HTML/CSS et imprimés via le navigateur :

- **Ticket de Caisse** (Format Thermique 58mm ou 80mm) : Reçu classique de vente.
- **Facture A4 Pro** : Facture détaillée avec logo, coordonnées, informations du patient, et de l'assurance.
- **Rapport de Caisse (Z)** : Clôture journalière avec ventilation des encaissements.
- **Bordereau de Livraison / Commande** : Pour les fournisseurs.
- **Rapport d'Inventaire** : Liste des produits avec espaces pour cocher.

### 19.2 Configuration Imprimante

- Se gère via les paramètres du système d'exploitation et la fenêtre d'impression du navigateur (Ctrl+P).
- Il est recommandé de désactiver les marges et les en-têtes/pieds de page du navigateur pour les tickets thermiques.

---

`<a id="chapitre-20--traçabilité--pharmacovigilance"></a>`

## Chapitre 20 — Traçabilité & Pharmacovigilance

### 20.1 Mouvements (Audit Trail)

Absolument **tout** est tracé dans la table `movements`.

- Entrées, sorties, ventes, retours, ajustements, destructions.
- Avec Horodatage, Utilisateur, Motif, Quantité avant/après.

### 20.2 Registre des Stupéfiants (Tableau B/C)

Pour les produits marqués `isControlled = true` :

- Un registre séparé est générable pour l'inspection sanitaire.
- Trace l'ordonnance (`prescriptionRef`) et le médecin, informations obligatoires pour la dispensation.

### 20.3 Déclaration ANSS (Pharmacovigilance)

Intégration prévue (module `mobile-money.js` / section ANSS) pour envoyer des rapports d'effets indésirables directement Ã  l'Agence Nationale de Sécurité Sanitaire (Guinée).

---

# PARTIE III — ANALYTIQUE & INTELLIGENCE

---

`<a id="chapitre-21--tableau-de-bord"></a>`

## Chapitre 21 — Tableau de Bord

### 21.1 Vue d'Ensemble

Le `dashboard.js` est l'écran d'accueil. Il agrège les données :

- **KPIs du jour** : Chiffre d'Affaires, Bénéfice Brut, Nombre de ventes, Panier Moyen.
- **Graphiques** : Évolution du CA sur 7/30 jours (via Chart.js ou rendu SVG custom).
- **Raccourcis** : Vente rapide, Nouvel arrivage.

### 21.2 Rafraîchissement

Lié au système de LiveSync (`db.js`), le tableau de bord se met Ã  jour en temps réel Ã  chaque vente validée sur le même appareil, ou reçue du Cloud (Supabase).

---

`<a id="chapitre-22--métriques-business-intelligence"></a>`

## Chapitre 22 — Métriques Business Intelligence

### 22.1 KPIs Avancés

Module `metrics.js` (pour Admin) calculant :

- **Rotation de Stock (Turnover Ratio)** : Vitesse Ã  laquelle le stock est écoulé et renouvelé.
- **Taux de Rupture** : % de produits Ã  0.
- **Santé du Stock** : Valorisation du stock dormant vs stock actif.
- **Marge Globale** : Marge nette moyenne sur la période.

### 22.2 Analyse Comparative

Comparaison des performances :

- Ce mois vs Mois précédent.
- Affichage des pourcentages de croissance (+X% ou -Y%).

---

`<a id="chapitre-23--rapports--analytique-avancée"></a>`

## Chapitre 23 — Rapports & Analytique Avancée

### 23.1 Top Ventes

Dans `sales.js` (onglet Analytique) :

- Classement des médicaments les plus vendus (en volume et en CA).
- Classement des familles thérapeutiques les plus performantes.
- Répartition des modes de paiement.

### 23.2 Export Comptable

Génération de fichiers CSV agrégés par jour/mois pour l'expert-comptable, avec séparation du CA HT / TTC (si TVA applicable) et des dettes assurances.

---

`<a id="chapitre-24--centre-dalertes"></a>`

## Chapitre 24 — Centre d'Alertes

### 24.1 Types d'Alertes

Le moteur (`alerts-engine.js`) scanne la base en arrière-plan et remonte les notifications (`alerts.js`) :

- **Péremptions** : Lots expirant dans les 30, 60, 90 jours.
- **Stock** : Produits sous le seuil critique d'alerte (`minStock`).
- **Anomalies** : Marges négatives (Prix d'achat > Prix de vente).
- **Dettes** : Crédits patients échus.

### 24.2 Actions depuis l'Alerte

- Les alertes sont cliquables.
- Ex: Cliquer sur une alerte de péremption permet de générer directement un PV de retrait du stock.

# PARTIE IV — ADMINISTRATION & MAINTENANCE

---

`<a id="chapitre-25--paramètres--configuration"></a>`

## Chapitre 25 — Paramètres & Configuration

### 25.1 Réglages Généraux

Gérés dans `settings.js`.

- **Informations Pharmacie** : Nom, Adresse, Téléphone, NIF/RCCM (apparaissent sur les factures).
- **Monnaie** : Symbole (GNF, XOF) et formatage (ex: 10 000 GNF).
- **Fuseau Horaire** : Pour l'horodatage des ventes.
- **Politique de Retour** : Autorisation et délai de retour (en jours).

### 25.2 Périphériques

- Configuration de l'imprimante par défaut (A4 vs Thermique).
- Scanners de codes-barres : La plupart des douchettes fonctionnent en mode émulation clavier. Pas de driver spécifique requis, OrdiveX capte la saisie sur le champ de recherche POS.

---

`<a id="chapitre-26--gestion-des-utilisateurs--rôles"></a>`

## Chapitre 26 — Gestion des Utilisateurs & Rôles

### 26.1 Création et Modification

- Uniquement par l'Admin.
- Rôles : `admin`, `pharmacien`, `caissier`.
- PIN obligatoire pour tout nouvel utilisateur (4 chiffres).
- Option de suspension de compte (sans perte de l'historique d'audit lié).

### 26.2 Reset de Mot de Passe / PIN

- Si un utilisateur oublie son PIN, l'Admin peut le réinitialiser depuis les Paramètres.
- Si l'Admin perd son accès... intervention technique directe dans IndexedDB nécessaire.

---

`<a id="chapitre-27--synchronisation-cloud"></a>`

## Chapitre 27 — Synchronisation Cloud (Supabase)

### 27.1 Modèle Offline-First

Toutes les écritures se font d'abord dans IndexedDB.
Le moteur `LiveSync` (`db.js` ligne ~800) écoute les changements locaux et les pousse vers Supabase en arrière-plan.

### 27.2 File d'attente (SyncQueue)

- Si hors-ligne, les modifications s'empilent dans le store `syncQueue`.
- Au retour de la connexion, OrdiveX dépile la queue et l'envoie au serveur par lots (batchs) pour ne pas saturer le réseau.

### 27.3 Realtime (Multi-appareils)

- Supabase Broadcast et PostgreSQL CDC informent les autres appareils des modifications (ex: Vente sur la Caisse 1 â†’ Le stock baisse instantanément sur la Caisse 2).

---

`<a id="chapitre-28--sauvegarde--restauration"></a>`

## Chapitre 28 — Sauvegarde & Restauration

### 28.1 Backup JSON Local

- Fonction vitale (`settings.js` / `db.js`).
- Exporte l'intégralité d'IndexedDB dans un seul fichier JSON (chiffré optionnellement).
- À faire quotidiennement si pas de Cloud activé.

### 28.2 Restauration

- Remplace toutes les données actuelles par celles du backup.
- **Attention** : Action destructive. Protégée par un mot de passe Admin.

---

`<a id="chapitre-29--sms--notifications"></a>`

## Chapitre 29 — SMS & Notifications

### 29.1 Provider

- **AfricasTalking** : Service utilisé.
- Configurable dans Paramètres (Clé API, Username, Sender ID).

### 29.2 Cas d'Usage

- **Client** : Envoi de reçu par SMS, rappel de prise de médicament, souhait d'anniversaire.
- **Admin** : Alerte de clôture de caisse avec le CA du jour envoyé au propriétaire.

---

`<a id="chapitre-30--naomie-ai"></a>`

## Chapitre 30 — Naomie AI — Assistante Virtuelle

### 30.1 Fonctionnalité

Naomie est le chatbot intelligent intégré (`supportWidget.js`).

- Répond aux questions sur l'utilisation du logiciel.
- **Queries dynamiques (v4)** : Sait interroger IndexedDB pour donner :
  - Le CA du jour en direct.
  - Le nombre de patients.
  - Les produits en rupture.
  - La valeur du stock.

### 30.2 Vérification des Mises Ã  jour

- Demander Ã  Naomie : "Y a t-il une mise Ã  jour ?"
- Elle lit le fichier `version.json` distant et compare avec l'actuel.

---

`<a id="chapitre-31--module-de-stabilité"></a>`

## Chapitre 31 — Module de Stabilité & Gestion d'Erreurs

### 31.1 Fichier `stability.js`

Introduit en v9.4.1. Chargé en tout dernier dans `index.html`.
C'est le **bouclier global**.

### 31.2 Protections

1. **Catch global** : `window.addEventListener('error')` et `unhandledrejection` empêchent les crashs et stockent les logs.
2. **Quota DB** : Alerte propre si IndexedDB atteint sa limite (QuotaExceededError).
3. **Async Wrappers** : Les fonctions critiques (`validerVente`, rendu de pages) sont wrappées en try-catch.
4. **SafeMath** : `safeDiv` et `safeNum` préviennent les divisions par zéro et les NaN qui corrompent les données financières.
5. **SafeJSON** : `JSON.parse` est toujours wrappé (évite les crashs si les paramètres corrompus).
6. **Watchdog** : Surveille la consommation RAM et Stockage (`navigator.storage`).

---

`<a id="chapitre-32--vérification-de-version"></a>`

## Chapitre 32 — Vérification de Version & Mises Ã  Jour

- L'app tourne sur le navigateur. Les mises Ã  jour sont déployées sur le web (GitHub Pages).
- Le navigateur met en cache (`ServiceWorker`) pour le fonctionnement hors-ligne.
- `stability.js` poll `version.json` toutes les 4 heures.
- Si mise Ã  jour dispo â†’ Toast non intrusif "Nouvelle version dispo, rechargez avec Ctrl+Shift+R".

---

# PARTIE V — EXPLOITATION

---

`<a id="chapitre-33--onboarding"></a>`

## Chapitre 33 — Onboarding Nouvelle Pharmacie

1. Ouvrir l'URL sur l'appareil.
2. Saisir les infos de la pharmacie.
3. Créer le compte Admin principal (mot de passe + PIN).
4. Importer le catalogue CSV.
5. Configurer la synchronisation Cloud Supabase.
6. L'app est prête au POS.

---

`<a id="chapitre-34--procédures-de-maintenance"></a>`

## Chapitre 34 — Procédures de Maintenance

### 34.1 Nettoyage des Logs

- Les logs d'audit et anciennes ventes (plus de 5 ans) peuvent être purgés via les Paramètres pour libérer du quota IndexedDB.

### 34.2 Diagnostic

- Taper `OrdiveXDiag.errors()` dans la console du navigateur (F12) pour voir les 20 dernières erreurs invisibles.
- `OrdiveXDiag.storage()` pour voir le quota utilisé.

---

`<a id="chapitre-35--troubleshooting"></a>`

## Chapitre 35 — Résolution de Problèmes (Troubleshooting)

| Problème                  | Cause Possible                        | Solution                                                 |
| -------------------------- | ------------------------------------- | -------------------------------------------------------- |
| **Écran Blanc**     | Corruption cache / Erreur JS critique | Maj+F5. Si persistant, vider cache navigateur.           |
| **Stock incorrect**  | Synchro Cloud non passée             | Vérifier le badge Wi-Fi. Faire "Forcer Synchro".        |
| **Vente impossible** | Caisse clôturée ou erreur           | Ouvrir la console (F12), taper `OrdiveXDiag.errors()`. |
| **Lenteur POS**      | Trop de produits en RAM               | Utiliser la recherche, limiter la pagination.            |

---

`<a id="chapitre-36--raccourcis-clavier"></a>`

## Chapitre 36 — Raccourcis Clavier

- **F2** : Lancer le scanner (focus champ recherche)
- **F5** / **Entrée** : Valider la vente
- **Echap** : Vider le panier / Annuler
- **Ctrl+Shift+R** : Recharger l'app (mise Ã  jour cache)
- **Ctrl+K** : Ouvrir la Palette de Commandes Rapides

---

`<a id="chapitre-37--limites-connues"></a>`

## Chapitre 37 — Limites Connues & Roadmap

- **Panier en attente volatile** : Si on rafraîchit la page, le panier mis en attente disparaît (stocké en RAM).
- **Quota de stockage** : Les navigateurs limitent IndexedDB (souvent ~2Go).
- **Multi-onglets** : Risque de conflits si 2 onglets vendent exactement le même dernier article simultanément.

---

`<a id="annexe-a--structure-des-fichiers"></a>`

## Annexe A — Structure des Fichiers

Voir Chapitre 2.1.

---

`<a id="annexe-b--schéma-indexeddb"></a>`

## Annexe B — Schéma IndexedDB

Défini dans `db.js`. Version actuelle du schéma : `3`.
Stores principaux listés au Chapitre 2.3.

---

`<a id="annexe-c--glossaire"></a>`

## Annexe C — Glossaire

- **DCI** : Dénomination Commune Internationale (molécule).
- **FEFO** : First Expired, First Out.
- **PWA** : Progressive Web App.
- **OTC** : Over The Counter (Vente libre).
- **Rx** : Médicament sur ordonnance.
- **IndexedDB** : Base de données locale dans le navigateur.

---

**FIN DU DOCUMENT**
