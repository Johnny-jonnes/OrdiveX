# 🚀 OrdiveX / PharmaProjet — Améliorations Futures (Horizon 2028)

> Ce document recense les évolutions techniques majeures à planifier pour faire évoluer
> l'architecture d'OrdiveX au-delà de ses limites actuelles.

---

## 1. 🗄️ Pagination Côté Serveur (Server-Side Pagination)

### Contexte
Actuellement, l'application charge **toutes les données** en local via IndexedDB (architecture offline-first).
Avec 330 000+ produits (~107 MB), on atteint la limite haute de ce que peut supporter un smartphone.

### Limites actuelles
| Métrique | Valeur actuelle | Limite critique |
|---|---|---|
| Produits en local | 330 000 | 500 000 max recommandé |
| RAM utilisée | ~100 MB | Smartphones 2 GB → risque de crash |
| Temps de pull initial | 3-4 min | Acceptable mais fragile |
| Taille IndexedDB | 107 MB | Safari iOS limité à ~1 GB |

### Architecture cible 2028

```
┌──────────────┐      ┌──────────────────┐      ┌──────────────┐
│   Client     │ ←──→ │  Supabase Edge   │ ←──→ │  PostgreSQL  │
│  (PWA)       │      │  Functions       │      │  (500k+)     │
│              │      │                  │      │              │
│  Cache local │      │  • Pagination    │      │  • Full-text │
│  (5000 items │      │  • Search API    │      │    search    │
│   récents)   │      │  • Filters API   │      │  • Indexes   │
└──────────────┘      └──────────────────┘      └──────────────┘
```

#### Principes
1. **Ne stocker en local que les données récentes** (dernières ventes, derniers mouvements, produits fréquents)
2. **Recherche côté serveur** : l'utilisateur tape un nom → requête Supabase avec `ilike` → résultats paginés
3. **Cache intelligent** : les 5 000 produits les plus vendus restent en local pour le POS offline
4. **Sync sélective** : ne synchroniser que les delta (changements depuis le dernier pull)

#### Implémentation suggérée
- `dbGetAll('products')` → Remplacé par `searchProducts(query, page, limit)`
- Supabase Edge Function pour la recherche full-text PostgreSQL
- IndexedDB réduit à un cache de travail (~5 000 items)
- Mode dégradé offline : accès uniquement aux produits en cache local

#### Impact estimé
| Métrique | Avant | Après |
|---|---|---|
| RAM client | ~100 MB | ~5-10 MB |
| Pull initial | 3-4 min | <5 secondes |
| IndexedDB | 107 MB | ~5 MB |
| Capacité totale | 500k max | **Illimitée** |

---

## 2. 🔄 Sync Delta (Synchronisation Incrémentale)

### Problème actuel
Le pull télécharge **toutes les données** à chaque cycle (330k items × 15s = gaspillage de bande passante).

### Solution 2028
- Ajouter une colonne `updated_at` indexée sur chaque table Supabase
- Stocker le `lastPullTimestamp` en local
- Pull uniquement : `WHERE updated_at > lastPullTimestamp`
- Résultat : pull de quelques dizaines d'items au lieu de 330k

### Gain estimé
- Bande passante : **-99%** par cycle de pull
- Temps de pull : **3-4 min → < 1 seconde**
- Batterie mobile : réduction significative

---

## 3. 📱 Web Workers pour le Traitement de Données

### Problème actuel
Le traitement de 330k items (filtrage, calculs stock) bloque le thread UI pendant ~500ms.

### Solution 2028
- Déplacer `dbGetAll` + traitements lourds dans un **Web Worker**
- Le UI reste fluide pendant les calculs
- Communication via `postMessage` / `SharedArrayBuffer`

---

## 4. 🔐 Chiffrement End-to-End des Données Patient

### Contexte réglementaire
Avec l'évolution des normes ANSS, le chiffrement des données patient pourrait devenir obligatoire.

### Solution
- Chiffrement AES-256 côté client avant stockage IndexedDB
- Clé de chiffrement dérivée du mot de passe pharmacien (PBKDF2)
- Données chiffrées transitent vers Supabase → Supabase ne voit jamais les données en clair

---

## 5. 📊 Analytics & BI Avancés

### Améliorations prévues
- **Prédiction de rupture de stock** via ML (TensorFlow.js)
- **Analyse de saisonnalité** des ventes
- **Tableau de bord multi-pharmacies** pour les groupements
- **Export automatique** vers les systèmes comptables (OHADA)

---

## 6. 🌍 Multi-Pharmacies / Multi-Sites

### Architecture
- Un compte Supabase central
- Row-Level Security (RLS) par `pharmacy_id`
- Dashboard consolidé pour le propriétaire de plusieurs officines
- Transfert inter-pharmacies avec traçabilité

---

## 📅 Planning estimatif

| Trimestre | Chantier | Priorité |
|---|---|---|
| Q1 2028 | Sync Delta (incrémentale) | 🔴 Critique |
| Q1 2028 | Pagination serveur (recherche) | 🔴 Critique |
| Q2 2028 | Web Workers | 🟡 Important |
| Q3 2028 | Chiffrement E2E | 🟡 Important |
| Q3 2028 | Multi-pharmacies | 🟢 Optionnel |
| Q4 2028 | Analytics ML | 🟢 Optionnel |

---

*Document créé le 22 avril 2026 — OrdiveX / TrillionX*
