# 🧱 Stack Technique & Conventions de Code

> À mettre à jour à chaque décision technique importante prise en session.

---

## 🛠️ Stack principale

```
Frontend  : [À définir — ex: Next.js 14, React, Vue]
Backend   : [À définir — ex: Node.js, FastAPI, Supabase Functions]
Base de données : [À définir — ex: Supabase (PostgreSQL)]
Auth      : [À définir — ex: Supabase Auth, NextAuth]
Hébergement : [À définir — ex: Vercel, Railway, Render]
Styling   : [À définir — ex: Tailwind CSS, shadcn/ui]
```

> 📝 Remplir ces champs dès le début du projet.

---

## 📐 Conventions de code

### Nommage
- **Composants** : PascalCase → `UserCard.tsx`
- **Fonctions / variables** : camelCase → `getUserById()`
- **Constantes** : UPPER_SNAKE_CASE → `MAX_RETRY_COUNT`
- **Fichiers non-composants** : kebab-case → `auth-helpers.ts`
- **Tables DB** : snake_case → `user_profiles`

### Structure des fichiers
```
src/
├── components/       # Composants réutilisables
├── pages/            # Pages / routes
├── lib/              # Fonctions utilitaires, helpers
├── hooks/            # Custom hooks React
├── types/            # Types TypeScript
├── styles/           # CSS global
└── constants/        # Constantes de l'app
```

### TypeScript
- Toujours typer les props des composants
- Éviter `any` — utiliser `unknown` si le type est incertain
- Préférer les interfaces pour les objets, les types pour les unions

```ts
// ✅ Correct
interface UserProps {
  id: string
  name: string
  role: 'admin' | 'user'
}

// ❌ Éviter
const user: any = getData()
```

---

## 🔁 Patterns recommandés

### Fetch de données (côté serveur)
```ts
// Toujours gérer les erreurs
const { data, error } = await supabase
  .from('table')
  .select('*')
  .eq('user_id', userId)

if (error) throw new Error(error.message)
```

### Variables d'environnement
```ts
// ✅ Accès sécurisé avec vérification
const apiUrl = process.env.NEXT_PUBLIC_API_URL
if (!apiUrl) throw new Error('NEXT_PUBLIC_API_URL manquante')
```

### Composants
- 1 composant = 1 fichier
- Max ~150 lignes par composant — extraire si plus long
- Props explicites, pas de spread aveugle (`{...props}`)

---

## 🚫 À ne jamais faire

- `console.log()` en production (utiliser un logger structuré)
- Commits avec `any` en TypeScript sans justification
- Logique métier dans les composants UI (séparer dans `lib/` ou `hooks/`)
- Appels API directement dans les composants (passer par des hooks ou services)

---

## 📦 Packages validés

> Tenir cette liste à jour avec chaque package ajouté.

| Package | Version | Usage | Validé le |
|---------|---------|-------|-----------|
| *(à remplir)* | | | |

---

## 🔄 Décisions techniques prises

> Historique des choix importants faits en session avec l'IA.

| Date | Décision | Raison |
|------|----------|--------|
| 2026-04-17 | Ajout de `dbBulkPut()` dans db.js | IndexedDB crashait avec 50k+ transactions individuelles. Une seule transaction par lot de 5000 règle le problème. |
| 2026-04-17 | Architecture import en 4 phases (load, parse, bulk, result) | Séparer le parsing JS pur (rapide) de l'écriture DB (lourde) évite le freeze navigateur |
| 2026-04-17 | Dédoublonnage par Map() en mémoire | Évite 50k requêtes `dbGetAll` individuelles pour vérifier les doublons |
| 2026-04-21 | Pagination universelle à 100 éléments | Toutes les pages (POS, Produits, Stock, Patients, Ventes, Ordonnances, Fournisseurs) paginées à 100 éléments par page |
| 2026-04-21 | Lazy-loading des lots dans le POS | Les lots FEFO ne sont plus chargés au démarrage mais uniquement lors de la validation d'une vente |
| 2026-04-21 | Debounce 250ms sur la recherche POS | Évite de filtrer 100k produits à chaque frappe de touche |
| 2026-04-21 | `restoreFromBackup` via `dbBulkPut` par chunks de 10k | Remplace l'ancien import unitaire qui crashait à 9303 éléments |
| 2026-04-25 | Connection Resilience Engine (debounce 5s + backoff exponentiel) | Empêche les boucles online/offline et les reconnexions WebSocket en rafale |
| 2026-04-25 | Cooldown 30s sur le WebSocket realtime | Évite les tentatives de reconnexion en boucle qui saturent les logs |
| 2026-04-25 | Pagination impression stock (500 items/page) | L'ancien rapport chargeait 100k lignes HTML d'un coup, crash navigateur |
| 2026-04-25 | Sanitisation XSS dans le chatbot Naomie | `innerHTML` avec contenu utilisateur → échappement HTML systématique |
