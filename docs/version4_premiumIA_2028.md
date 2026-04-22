# 🚀 PharmaProjet V4.0 — Roadmap Premium & Innovation

**Document de Spécifications Techniques Exhaustif**
*Dernière mise à jour : Avril 2026*

> Ce document décrit **toutes les fonctionnalités hors normes** envisagées pour faire de PharmaProjet le leader incontesté des ERP pharmaceutiques en Afrique de l'Ouest. Chaque fonctionnalité est détaillée avec sa **description business**, son **guide d'implémentation technique**, sa **complexité** et sa **priorité**.

---

## 📊 État Actuel — Modules V3.x (Déjà Implémentés)

| Module                               | Fichier              | Statut        |
| ------------------------------------ | -------------------- | ------------- |
| Point de Vente (POS)                 | `pos.js`           | ✅ Production |
| Gestion des Stocks & Lots FEFO       | `stock.js`         | ✅ Production |
| Ordonnances & Prescriptions          | `prescriptions.js` | ✅ Production |
| Traçabilité & Audit Réglementaire | `traceability.js`  | ✅ Production |
| Caisse Journalière Multi-canal      | `caisse.js`        | ✅ Production |
| Business Intelligence (KPI)          | `metrics.js`       | ✅ Production |
| Gestion Patients                     | `patients.js`      | ✅ Production |
| Retours & Remboursements             | `returns.js`       | ✅ Production |
| Fournisseurs & Commandes             | `suppliers.js`     | ✅ Production |
| Alertes Intelligentes                | `alerts-engine.js` | ✅ Production |
| Impression & Rapports                | `print.js`         | ✅ Production |
| Synchronisation Cloud Supabase       | `db.js`            | ✅ Production |

---

## 🧠 MODULE 1 — Intelligence Artificielle & Prédiction de Demande

### Description Business

L'IA analyse l'historique des ventes croisé avec les facteurs saisonniers (saison des pluies = paludisme, harmattan = infections respiratoires) pour **prédire les besoins en stock 15 à 30 jours à l'avance**. Le pharmacien reçoit des recommandations de commandes automatiques avant même la rupture.

### Fonctionnalités Détaillées

- **Prédiction saisonnière** : Anticiper les pics de demande par catégorie thérapeutique
- **Score de confiance** : Chaque prédiction accompagnée d'un taux de fiabilité (%)
- **Commande auto-générée** : Un clic pour créer un bon de commande fournisseur basé sur la prédiction
- **Détection d'anomalies** : Identifier les ventes anormalement élevées (possible épidémie locale)
- **Apprentissage continu** : Le modèle se perfectionne avec chaque mois de données

### Guide d'Implémentation

**Complexité** : 🔴 Élevée | **Priorité** : ⭐⭐⭐ Haute | **Délai estimé** : 4-6 semaines

#### Fichier : `js/pages/ai-forecast.js` [NOUVEAU]

```
1. PRÉPARATION DES DONNÉES
   - Extraire toutes les ventes par produit/catégorie sur 6+ mois
   - Structurer en séries temporelles : { date, productId, category, qtySold }
   - Enrichir avec les variables saisonnières (mois → saison Guinéenne)

2. MOTEUR DE PRÉDICTION (côté client, pas de fuite de données de santé)
   - Utiliser TensorFlow.js (librairie IA en JavaScript, tourne dans le navigateur)
   - Modèle LSTM (Long Short-Term Memory) pour les séries temporelles
   - Alternative légère : Régression polynomiale avec moyennes mobiles pondérées
   - Entraîner sur les données locales → modèle stocké en IndexedDB

3. INTERFACE UTILISATEUR
   - Nouvel onglet "IA & Prévisions" dans le menu Analytique
   - Dashboard avec graphiques de prédiction (ligne réelle vs prédite)
   - Tableau : "Dans 15j, Paracétamol +40% (confiance 88%)"
   - Bouton "Générer bon de commande IA"

4. INTÉGRATION AVEC L'EXISTANT
   - Lier à suppliers.js pour la génération automatique de commandes
   - Lier à alerts-engine.js pour les notifications proactives
```

---

## 🌐 MODULE 2 — API REST & Interopérabilité

### Description Business

Transformer PharmaProjet en plateforme ouverte connectée à l'écosystème externe : comptabilité (Sage, QuickBooks), applications mobiles patients, systèmes de santé publique, caisses enregistreuses physiques.

### Fonctionnalités Détaillées

- **Export comptable automatique** : Envoi des bilans vers Sage/QuickBooks au format standard
- **API publique sécurisée** : Endpoints REST pour consulter stock/prix depuis une app mobile
- **Click & Collect** : Le patient réserve ses médicaments en ligne, le pharmacien prépare
- **Intégration DHIS2** : Reporting automatisé vers le système de surveillance sanitaire national
- **Webhook temps réel** : Notifier un système externe à chaque vente ou alerte de stock

### Guide d'Implémentation

**Complexité** : 🔴 Élevée | **Priorité** : ⭐⭐ Moyenne | **Délai estimé** : 3-4 semaines

#### Architecture Serveur : Supabase Edge Functions

```
1. CRÉATION DES ENDPOINTS API
   - Fichier: supabase/functions/api-v1/index.ts
   - GET  /api/v1/products       → Liste des produits avec stock
   - GET  /api/v1/stock/:id      → Stock temps réel d'un produit
   - POST /api/v1/reserve        → Réservation Click & Collect
   - POST /api/v1/sales-export   → Export comptable (JSON/CSV)
   - GET  /api/v1/analytics      → KPIs pour app mobile propriétaire

2. SÉCURITÉ (OAuth 2.0 / JWT)
   - Module "Développeurs & API" dans settings.js
   - Génération/révocation de clés API (API_KEY)
   - Rate limiting : 100 requêtes/minute/clé
   - Aucune donnée patient exposée (RGPD/loi santé Guinée)

3. MODULE CLICK & COLLECT (côté PharmaProjet)
   - Nouvelle table Supabase : "reservations"
   - Notification push dans l'app quand une réservation arrive
   - Le pharmacien valide → prépare → patient notifié par SMS

4. EXPORT COMPTABLE AUTOMATISÉ
   - Format OHADA (Plan Comptable Ouest-Africain)
   - Mapping automatique : ventes → compte 701, achats → 601
   - Export PDF/XLSX mensuel programmable
```

---

## 🏢 MODULE 3 — Architecture Multi-Sites (Réseau de Pharmacies)

### Description Business

Un propriétaire de 2, 5 ou 20 pharmacies gère tout depuis un tableau de bord central. Transferts inter-sites, vue consolidée du réseau, comparaison de performance entre succursales.

### Fonctionnalités Détaillées

- **Vue Consolidée** : CA total du réseau, stocks cumulés, alertes globales
- **Vue par Succursale** : Performance individuelle de chaque pharmacie
- **Transferts Inter-sites** : Envoi de stock d'un site A à un site B avec traçabilité
- **Benchmark** : Comparer la performance de chaque site (CA, marge, rotation)
- **Super-Admin** : Nouveau rôle avec accès cross-sites

### Guide d'Implémentation

**Complexité** : 🔴🔴 Très Élevée | **Priorité** : ⭐⭐ Moyenne | **Délai estimé** : 6-8 semaines

```
1. REFONTE DE LA BASE DE DONNÉES
   - Ajouter "site_id" (UUID) à TOUTES les tables existantes :
     sales, saleItems, stock, lots, movements, cashRegister,
     products, patients, prescriptions, auditLog
   - Nouvelle table "branches" : { id, name, address, phone, managerId }
   - Nouvelle table "transfers" : { id, fromSiteId, toSiteId, status, items[] }

2. NOUVEAU RÔLE : SUPER-ADMIN
   - Modifier le RBAC dans db.js/settings.js
   - Le pharmacien local ne voit que son site_id
   - Le super-admin a un sélecteur de site en haut de la navbar
   - Option "Vue Réseau" pour consolider toutes les données

3. MODULE DE TRANSBORDEMENT
   - Fichier: js/pages/transfers.js [NOUVEAU]
   - Pharmacie A crée un "Bon de Transfert" → stock décrémenté, statut "En Transit"
   - Pharmacie B clique "Réceptionner" → stock incrémenté
   - Transaction atomique pour éviter les pertes de stock
   - Historique complet des transferts dans traceability.js

4. DASHBOARD RÉSEAU
   - Modifier dashboard.js pour le mode "Vue Consolidée"
   - Graphique comparatif : barres groupées par site
   - Carte interactive (si géolocalisation des sites)
```

---

## 📱 MODULE 4 — Application Mobile Patient

### Description Business

Une application mobile (PWA ou React Native) que le patient installe pour interagir avec SA pharmacie : voir ses ordonnances, vérifier la disponibilité d'un médicament, recevoir des rappels de traitement, et réserver en ligne.

### Fonctionnalités Détaillées

- **Espace Patient** : Historique d'achats, ordonnances passées, allergies
- **Recherche de disponibilité** : "Mon médicament est-il en stock ?"
- **Rappels de traitement** : Notifications push pour la prise de médicaments
- **Renouvellement simplifié** : Renvoyer une ordonnance pour re-préparer
- **Chat pharmacien** : Messagerie sécurisée pour poser des questions
- **Carte de fidélité digitale** : Points cumulés sur chaque achat

### Guide d'Implémentation

**Complexité** : 🔴 Élevée | **Priorité** : ⭐⭐⭐ Haute | **Délai estimé** : 5-7 semaines

```
1. ARCHITECTURE
   - Option A : PWA (Progressive Web App) — même stack HTML/JS
   - Option B : React Native — app native iOS/Android
   - Recommandation : PWA pour commencer (partage de code avec PharmaProjet)

2. AUTHENTIFICATION PATIENT
   - Login par numéro de téléphone + OTP SMS
   - Lié au patient.id dans la base PharmaProjet
   - Token JWT avec expiration 30 jours

3. FONCTIONNALITÉS CLÉS
   - Écran d'accueil : Prochains rappels, derniers achats
   - Recherche produit : Appel API → stock temps réel
   - Scanner ordonnance : OCR pour numériser une ordonnance papier
   - Rappels : Service Worker + Notification API (Push)
   - Chat : WebSocket via Supabase Realtime

4. INTÉGRATION CÔTÉ PHARMACIE
   - Nouveau panel dans pos.js : "Réservations en attente"
   - Badge notification dans la navbar
   - Réponse aux messages patients depuis l'ERP
```

---

## 💳 MODULE 5 — Paiement Mobile Intégré (SDK Orange Money / MTN MoMo)

### Description Business

Au lieu de simplement enregistrer "paiement par Orange Money", l'app **déclenche réellement le paiement** via les APIs officielles des opérateurs. Le patient reçoit la demande de paiement sur son téléphone, confirme, et la vente est automatiquement validée.

### Fonctionnalités Détaillées

- **Initiation de paiement** : Envoi de la demande USSD au téléphone du client
- **Confirmation temps réel** : Webhook de confirmation → vente auto-validée
- **Reçu SMS automatique** : Envoi du ticket de caisse par SMS
- **Historique des transactions mobile** : Réconciliation automatique
- **QR Code** : Le patient scanne un QR pour payer (sans saisir de numéro)

### Guide d'Implémentation

**Complexité** : 🟡 Moyenne | **Priorité** : ⭐⭐⭐ Haute | **Délai estimé** : 2-3 semaines

```
1. INTÉGRATION SDK ORANGE MONEY GUINÉE
   - Inscription sur developer.orange.com/guinee
   - Obtenir : merchant_id, api_key, secret_key
   - Endpoint: POST https://api.orange.com/orange-money-webpay/gn/v1/webpayment
   - Callback URL pour la confirmation de paiement

2. INTÉGRATION SDK MTN MOMO
   - Inscription sur momodeveloper.mtn.com
   - API Collection : RequestToPay
   - Polling ou Webhook pour le statut
   
3. MODIFICATION DE pos.js
   - Le bouton "Valider" avec OM/MTN déclenche l'API réelle
   - Loader animé "En attente de confirmation du client..."
   - Timeout 120 secondes → option annuler ou repasser en espèces
   - En cas de succès → vente auto-complétée + reçu SMS

4. GÉNÉRATION QR CODE
   - Librairie : qrcode.js (léger, côté client)
   - QR contient : montant, référence vente, merchant_id
   - Affiché à l'écran du POS → client scanne avec son app OM/MTN
```

---

## 🔬 MODULE 6 — Gestion Avancée des Substances Contrôlées

### Description Business

Conformité totale avec la réglementation DNPM de Guinée pour les stupéfiants, psychotropes et substances contrôlées (Tableau I, II, III). Registre officiel numérique, double signature, et reporting automatique aux autorités.

### Fonctionnalités Détaillées

- **Registre Officiel Numérique** : Remplacement du livre physique obligatoire
- **Double signature** : Le pharmacien ET un témoin doivent valider
- **Alertes réglementaires** : Dépassement de seuils de prescription, patients suspects
- **Rapport DNPM** : Export automatique du registre au format demandé par les inspecteurs
- **Destruction surveillée** : Procès-verbal de destruction des produits périmés contrôlés
- **Traçabilité lot-par-lot** : Chaque unité d'un stupéfiant est suivie individuellement

### Guide d'Implémentation

**Complexité** : 🟡 Moyenne | **Priorité** : ⭐⭐⭐ Haute | **Délai estimé** : 2-3 semaines

```
1. EXTENSION DE LA TABLE PRODUCTS
   - Ajouter : controlledCategory (null | 'tableau_1' | 'tableau_2' | 'tableau_3')
   - Ajouter : requiresDoubleSignature (boolean)
   - Ajouter : maxPrescriptionQty (integer) — quantité max par ordonnance

2. MODULE REGISTRE (dans traceability.js)
   - Extension de l'onglet "Stupéfiants" existant
   - Chaque dispensation d'un contrôlé génère une entrée dans un registre spécial
   - Champs : date, ordonnance, prescripteur, patient, quantité, lot, solde restant
   - Validation par double signature (pharmacien + préparateur)

3. ALERTES SPÉCIFIQUES
   - Patient qui revient trop souvent pour le même contrôlé
   - Quantité prescrite > maximum réglementaire
   - Stock de contrôlé < seuil minimum obligatoire

4. RAPPORT INSPECTEURS
   - Template PDF conforme au format DNPM
   - Export un clic : période → PDF signé numériquement
   - Intégration dans print.js
```

---

## 📊 MODULE 7 — Tableau de Bord Exécutif Avancé (CEO Dashboard)

### Description Business

Un tableau de bord de direction avec des analyses profondes : prévisions de trésorerie, analyse ABC des produits, seuil de rentabilité, analyse de la concurrence locale, et score de santé global de la pharmacie.

### Fonctionnalités Détaillées

- **Analyse ABC** : Classer les produits en A (80% du CA), B (15%), C (5%)
- **Seuil de rentabilité** : "Combien de ventes par jour pour couvrir mes charges ?"
- **Prévision de trésorerie** : Projection des flux sur 30/60/90 jours
- **Indice de performance** : Score global 0-100 de la pharmacie
- **Comparaison temporelle** : Ce mois vs mois dernier vs même mois l'an passé
- **Export PowerPoint** : Présentation automatique pour les réunions de direction

### Guide d'Implémentation

**Complexité** : 🟡 Moyenne | **Priorité** : ⭐⭐ Moyenne | **Délai estimé** : 3-4 semaines

```
1. ANALYSE ABC (dans metrics.js)
   - Trier les produits par CA décroissant
   - Catégorie A : cumulé ≤ 80% du CA total
   - Catégorie B : cumulé entre 80% et 95%
   - Catégorie C : le reste (5%)
   - Afficher avec un graphique Pareto (barres + courbe cumulative)

2. SEUIL DE RENTABILITÉ
   - Paramètre dans settings.js : charges fixes mensuelles (loyer, salaires, etc.)
   - Calcul : Seuil = Charges fixes / Marge moyenne
   - Affichage : "Il vous faut X FG/jour pour être rentable"
   - Indicateur visuel : vert si dépassé, rouge si en dessous

3. PRÉVISION DE TRÉSORERIE
   - Basé sur la moyenne mobile des 30 derniers jours
   - Projection linéaire : recettes prévues - charges fixes
   - Graphique avec zone verte (excédent) et zone rouge (déficit)
   - Intégrer les créances à recouvrer dans les prévisions

4. SCORE DE SANTÉ PHARMACIE (0-100)
   - Marge brute > 25% → +20 pts
   - Aucune rupture de stock → +20 pts
   - Taux recouvrement > 90% → +20 pts
   - Rotation stock > 2x → +20 pts
   - Utilisation app > 80% jours → +20 pts
```

---

## 🔔 MODULE 8 — Notifications Push & SMS Automatisés

### Description Business

Un système de communication automatisé avec les patients et le personnel : rappels de médicaments périmables, relances de dettes, alertes de stock par SMS, et notifications push temps réel.

### Fonctionnalités Détaillées

- **Rappel patient** : "Votre traitement de 7 jours se termine demain, pensez au renouvellement"
- **Relance dette** : SMS automatique aux patients ayant un crédit impayé > X jours
- **Alerte stock** : SMS au pharmacien quand un produit critique est en rupture
- **Notification équipe** : Push navigateur pour les événements importants
- **Campagne promotionnelle** : SMS groupé pour informer d'une promotion ou arrivage

### Guide d'Implémentation

**Complexité** : 🟡 Moyenne | **Priorité** : ⭐⭐⭐ Haute | **Délai estimé** : 2-3 semaines

```
1. SERVICE SMS (Provider recommandé : Twilio ou AfricasTalking)
   - Inscription : africastalking.com (supporte la Guinée)
   - API : POST /version1/messaging — { to: "+224...", message: "..." }
   - Coût : ~2-5 GNF par SMS

2. NOTIFICATIONS PUSH (Service Worker existant : sw.js)
   - Utiliser l'API Notification + Push API du navigateur
   - Demander la permission au premier login
   - Envoyer via Supabase Realtime ou Web Push Protocol

3. MOTEUR DE RÈGLES (alerts-engine.js étendu)
   - Règle 1 : Patient avec crédit > 7 jours → SMS relance
   - Règle 2 : Ordonnance dispensée il y a X jours → rappel renouvellement
   - Règle 3 : Stock critique → SMS pharmacien
   - Règle 4 : Clôture caisse oubliée → notification push à 22h
   - Planificateur : setInterval toutes les heures (ou Supabase Cron)

4. INTERFACE DE GESTION
   - Nouvel onglet dans settings.js : "Notifications & SMS"
   - Activer/désactiver chaque type de notification
   - Modèles de messages personnalisables
   - Historique des SMS envoyés avec statut (livré/échoué)
```

---

## 🖨️ MODULE 9 — Intégration Matériel (Imprimante Thermique, Lecteur Code-Barres, Balance)

### Description Business

Connecter PharmaProjet aux périphériques physiques de la pharmacie : impression directe sur imprimante thermique 80mm, lecture de codes-barres pour la recherche rapide de produits, et pesée pour les préparations magistrales.

### Fonctionnalités Détaillées

- **Imprimante thermique** : Impression directe sans boîte de dialogue (Web Serial API)
- **Lecteur code-barres USB** : Scan → produit ajouté au panier instantanément
- **Tiroir-caisse** : Ouverture automatique à chaque vente en espèces
- **Balance connectée** : Pour les préparations magistrales
- **Étiqueteuse** : Impression d'étiquettes prix/code-barres

### Guide d'Implémentation

**Complexité** : 🟡 Moyenne | **Priorité** : ⭐⭐⭐ Haute | **Délai estimé** : 2-3 semaines

```
1. IMPRIMANTE THERMIQUE (ESC/POS via Web Serial API)
   - API : navigator.serial.requestPort() → connexion USB directe
   - Protocole ESC/POS (standard universel des thermiques)
   - Formater le ticket en commandes ESC/POS binaires
   - Compatibilité : Epson TM-T20, Xprinter XP-58, Star TSP143

2. LECTEUR CODE-BARRES USB (déjà partiellement implémenté dans pos.js)
   - Les lecteurs USB HID émulent un clavier
   - Intercepter l'input rapide (< 50ms entre caractères)
   - Chercher le produit par code EAN-13, CIP, ou code interne
   - Ajouter au panier automatiquement

3. TIROIR-CAISSE
   - Envoi de la commande ESC/POS d'ouverture tiroir après paiement espèces
   - Commande : [0x1B, 0x70, 0x00, 0x19, 0xFA] (standard)

4. ÉTIQUETEUSE
   - Format ZPL (Zebra) ou ESC/POS selon le modèle
   - Contenu : Nom produit, prix, code-barres, date expiration
   - Bouton "Imprimer étiquette" dans products.js
```

---

## 🌍 MODULE 10 — Mode Hors-Ligne Avancé & Sync Conflict Resolution

### Description Business

En Guinée, les coupures internet sont fréquentes. PharmaProjet doit fonctionner **100% hors-ligne** pendant des jours, puis synchroniser intelligemment quand la connexion revient, en résolvant automatiquement les conflits.

### Fonctionnalités Détaillées

- **File de synchronisation** : Toutes les actions hors-ligne sont mises en queue
- **Résolution de conflits** : Stratégie "Last Write Wins" avec journal de conflits
- **Indicateur de sync** : Badge visuel montrant le nombre d'actions en attente
- **Compression des données** : Réduire la bande passante de sync
- **Sync sélective** : Ne synchroniser que les données modifiées (delta sync)

### Guide d'Implémentation

**Complexité** : 🔴 Élevée | **Priorité** : ⭐⭐⭐ Critique | **Délai estimé** : 3-4 semaines

```
1. FILE D'ATTENTE DE SYNC (Extension de db.js)
   - Table IndexedDB : "syncQueue" {id, table, operation, data, timestamp, status}
   - À chaque écriture hors-ligne → ajout dans syncQueue
   - Quand online → traitement FIFO de la queue
   - Retry automatique avec backoff exponentiel

2. RÉSOLUTION DE CONFLITS
   - Stratégie par défaut : "Last Write Wins" (timestamp)
   - Pour les tables critiques (stock) : résolution additive
     Ex: Site A vend 5, Site B vend 3 → résultat = stock_initial - 5 - 3
   - Table "conflictLog" pour l'historique des résolutions

3. INDICATEUR VISUEL
   - Badge dans la navbar : "⬆ 23 en attente de sync"
   - Couleur : vert (synced), orange (en attente), rouge (erreurs)
   - Panneau détaillé accessible au clic

4. OPTIMISATION BANDE PASSANTE
   - Delta sync : ne transmettre que les champs modifiés
   - Compression gzip des payloads JSON
   - Batch sync : regrouper les opérations par table
```

---

## 🛡️ MODULE 11 — Sécurité Avancée & Conformité RGPD

### Description Business

Protection maximale des données de santé : chiffrement de bout en bout, authentification 2FA, audit trail immuable, et conformité avec les réglementations de protection des données.

### Fonctionnalités Détaillées

- **Authentification 2FA** : Code SMS ou TOTP (Google Authenticator)
- **Chiffrement local** : Les données patient sont chiffrées en IndexedDB
- **Verrouillage par inactivité** : Écran de verrouillage après X minutes
- **Journalisation immuable** : Audit log en base de données non modifiable
- **Droit à l'oubli** : Anonymisation des données patient sur demande
- **Sauvegarde chiffrée** : Export/import de la base avec mot de passe

### Guide d'Implémentation

**Complexité** : 🟡 Moyenne | **Priorité** : ⭐⭐⭐ Haute | **Délai estimé** : 2-3 semaines

```
1. AUTHENTIFICATION 2FA
   - Option A : SMS OTP via AfricasTalking
   - Option B : TOTP avec QR Code (compatible Google Authenticator)
   - Librairie JS : otplib (génération/vérification TOTP)
   - Activé par défaut pour les rôles admin/pharmacien

2. CHIFFREMENT DES DONNÉES PATIENT
   - Web Crypto API (natif au navigateur)
   - AES-256-GCM pour le chiffrement symétrique
   - Clé dérivée du mot de passe utilisateur (PBKDF2)
   - Tables chiffrées : patients, prescriptions

3. VERROUILLAGE PAR INACTIVITÉ
   - Timer dans app.js : réinitialisation à chaque interaction
   - Après 10min → écran de verrouillage (PIN rapide, pas mot de passe complet)
   - Configurable dans settings.js

4. SAUVEGARDE CHIFFRÉE
   - Export : sérialiser toutes les tables IndexedDB → JSON → chiffrer → .pharma.bak
   - Import : déchiffrer → valider intégrité → restaurer
   - Bouton dans settings.js : "Sauvegarder / Restaurer les données"
```

---

## 📋 MODULE 12 — Préparations Magistrales & Dossier Pharmaceutique

### Description Business

Module spécialisé pour les pharmacies qui réalisent des préparations magistrales (crèmes, gélules, solutions). Suivi des formules, calcul des quantités, coût de revient, et traçabilité complète.

### Fonctionnalités Détaillées

- **Formulaire de préparation** : Saisie de la formule avec ingrédients et quantités
- **Calcul automatique** : Quantités, coût de revient, prix de vente suggéré
- **Traçabilité** : Numéro de lot, date de fabrication, date de péremption
- **Fiche de fabrication** : Document imprimable conforme aux normes BPF
- **Dossier Pharmaceutique Patient** : Historique complet des traitements

### Guide d'Implémentation

**Complexité** : 🟡 Moyenne | **Priorité** : ⭐ Basse | **Délai estimé** : 3-4 semaines

```
1. NOUVELLE TABLE : "preparations"
   - { id, formulaName, prescriptionId, patientId, ingredients[], 
     lotNumber, prepDate, expiryDate, preparedBy, verifiedBy,
     totalCost, sellingPrice, status }

2. INTERFACE
   - Fichier: js/pages/preparations.js [NOUVEAU]
   - Formulaire de saisie avec les ingrédients (autocomplete depuis products)
   - Calcul automatique du coût de revient (somme des prix d'achat)
   - Impression de la fiche de fabrication (print.js)

3. DOSSIER PHARMACEUTIQUE
   - Extension de patients.js
   - Onglet "Historique Traitements" dans la fiche patient
   - Timeline : ordonnances, dispensations, retours, préparations
   - Alertes croisées : interactions médicamenteuses basiques
```

---

## 📈 MODULE 13 — Marketplace B2B (Grossiste ↔ Pharmacie)

### Description Business

Plateforme de commande en ligne entre pharmacies et grossistes. Le pharmacien commande ses produits directement depuis l'ERP, le grossiste reçoit la commande et livre. Comparaison de prix entre fournisseurs.

### Fonctionnalités Détaillées

- **Catalogue grossiste en ligne** : Prix, stock, délais de livraison
- **Comparaison de prix** : "Paracétamol : LABOREX 25.000 GNF vs COPHARMA 23.500 GNF"
- **Commande en un clic** : Directement depuis l'alerte de rupture
- **Suivi de livraison** : Statut temps réel de la commande
- **Historique d'achats** : Négociation de remises volume

### Guide d'Implémentation

**Complexité** : 🔴🔴 Très Élevée | **Priorité** : ⭐ Basse | **Délai estimé** : 8-12 semaines

```
1. PLATEFORME CENTRALE (Backend séparé)
   - App web dédiée pour les grossistes (inscription, gestion catalogue)
   - API centralisée : PharmaProjet → Marketplace → Grossiste
   - Base de données commune : produits, prix, stock grossiste

2. INTÉGRATION CÔTÉ PHARMACIE
   - Extension de suppliers.js
   - Onglet "Marketplace" : recherche, comparaison, commande
   - Bouton dans alerts-engine.js : "Rupture de Paracétamol → Commander"

3. FACTURATION & PAIEMENT
   - Génération de bons de commande numériques
   - Paiement par virement ou mobile money
   - Rapprochement facture fournisseur automatique
```

---

## 🎯 PRIORITÉS DE DÉVELOPPEMENT RECOMMANDÉES

### Phase 1 — Court Terme (1-3 mois)

| # | Module                          | Impact Business | Effort   |
| - | ------------------------------- | --------------- | -------- |
| 5 | Paiement Mobile Intégré       | 🔥🔥🔥          | 🟡 Moyen |
| 8 | Notifications Push & SMS        | 🔥🔥🔥          | 🟡 Moyen |
| 9 | Intégration Matériel          | 🔥🔥🔥          | 🟡 Moyen |
| 6 | Substances Contrôlées Avancé | 🔥🔥🔥          | 🟡 Moyen |

### Phase 2 — Moyen Terme (3-6 mois)

| #  | Module                   | Impact Business | Effort     |
| -- | ------------------------ | --------------- | ---------- |
| 1  | IA & Prédiction         | 🔥🔥            | 🔴 Élevé |
| 7  | CEO Dashboard Avancé    | 🔥🔥            | 🟡 Moyen   |
| 10 | Sync Hors-Ligne Avancée | 🔥🔥🔥          | 🔴 Élevé |
| 11 | Sécurité & RGPD        | 🔥🔥🔥          | 🟡 Moyen   |

### Phase 3 — Long Terme (6-12 mois)

| #  | Module                        | Impact Business | Effort             |
| -- | ----------------------------- | --------------- | ------------------ |
| 4  | App Mobile Patient            | 🔥🔥            | 🔴 Élevé         |
| 2  | API REST & Interopérabilité | 🔥🔥            | 🔴 Élevé         |
| 3  | Architecture Multi-Sites      | 🔥🔥🔥          | 🔴🔴 Très Élevé |
| 12 | Préparations Magistrales     | 🔥              | 🟡 Moyen           |
| 13 | Marketplace B2B               | 🔥🔥            | 🔴🔴 Très Élevé |

---

## 💡 PRINCIPES D'ARCHITECTURE POUR LA V4

> [!IMPORTANT]
> **Règles d'or pour toute nouvelle fonctionnalité**

1. **Offline-First** : Tout doit fonctionner sans internet. IndexedDB d'abord, sync Supabase ensuite.
2. **Modulaire** : Chaque feature = 1 fichier JS. Pas de dépendances croisées complexes.
3. **Données sensibles** : Zéro donnée patient envoyée à des services tiers non certifiés santé.
4. **Performance** : La page ne doit jamais freezer. Utiliser `requestAnimationFrame`, `Web Workers` pour les calculs lourds.
5. **Rétro-compatible** : Les pharmacies existantes en V3 doivent migrer sans perte de données.

---

*Document rédigé en Avril 2026 — PharmaProjet V3.x → V4.0*
*Le code actuel est architecturé pour recevoir ces évolutions sans réécriture majeure.*
