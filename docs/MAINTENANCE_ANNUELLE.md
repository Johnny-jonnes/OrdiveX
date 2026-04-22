# 📋 OrdiveX — Guide de Maintenance Annuelle

> **Document destiné au pharmacien administrateur**
> À exécuter une fois par an (recommandé en janvier)
> Temps estimé : 5 minutes

---

## 🎯 Pourquoi faire une maintenance annuelle ?

Votre application accumule des données chaque jour :
- ~7 000 ventes / an
- ~15 000 lignes de vente / an  
- ~20 000 mouvements de stock / an
- ~30 000 entrées d'audit / an

Après 10-15 ans, cela représente ~1 million d'enregistrements, ce qui peut ralentir l'application sur mobile.
**La maintenance annuelle garde l'application rapide et légère.**

---

## 📝 Procédure en 3 étapes

### Étape 1 : Exporter un backup complet (OBLIGATOIRE)

1. Ouvrir l'application OrdiveX
2. Aller dans **Paramètres** → section **Sauvegarde & Restauration**
3. Cliquer sur **"Exporter la sauvegarde"**
4. Sauvegarder le fichier JSON sur :
   - **Une clé USB** (recommandé)
   - **Un dossier PC** (ex: `C:\Sauvegardes_OrdiveX\`)
   - **Google Drive / Email** (optionnel, en plus)

> ⚠️ **NE PASSEZ JAMAIS À L'ÉTAPE 2 SANS AVOIR FAIT L'ÉTAPE 1 !**
> Le fichier de backup est votre filet de sécurité.

---

### Étape 2 : Vérifier le backup

1. Ouvrir le fichier JSON avec un éditeur de texte (Bloc-notes)
2. Vérifier qu'il contient des données (le fichier doit faire plusieurs MB)
3. Renommer le fichier avec la date : `backup_ordivex_2028-01-15.json`

---

### Étape 3 : Purger les données anciennes

1. Ouvrir l'application OrdiveX dans **Google Chrome** sur PC
2. Appuyer sur **F12** pour ouvrir la console développeur
3. Cliquer sur l'onglet **"Console"**
4. **Copier-coller** le code ci-dessous dans la console :

```javascript
// === PURGE ANNUELLE ORDIVEX ===
// Supprime les ventes, mouvements et logs de plus de 2 ans
// NE TOUCHE PAS aux produits, stock, patients, paramètres

async function purgeAnnuelle() {
  const DEUX_ANS = Date.now() - (2 * 365 * 24 * 60 * 60 * 1000);
  const dateLimit = new Date(DEUX_ANS).toLocaleDateString('fr-FR');
  
  const ok = confirm(
    '⚠️ PURGE ANNUELLE ⚠️\n\n' +
    'Cette opération va supprimer les données AVANT le ' + dateLimit + ' :\n' +
    '• Ventes anciennes\n' +
    '• Lignes de vente anciennes\n' +
    '• Mouvements de stock anciens\n' +
    '• Logs d\'audit anciens\n\n' +
    'Les produits, patients et stock ACTUEL ne sont PAS touchés.\n\n' +
    'AVEZ-VOUS FAIT UN BACKUP COMPLET ? (Étape 1)'
  );
  
  if (!ok) { console.log('❌ Purge annulée.'); return; }

  const stores = [
    { name: 'sales', dateField: 'date' },
    { name: 'saleItems', dateField: 'date' },
    { name: 'movements', dateField: 'date' },
    { name: 'auditLog', dateField: 'timestamp' }
  ];
  
  let totalPurged = 0;
  
  for (const { name, dateField } of stores) {
    const all = await DB.dbGetAll(name);
    const old = all.filter(item => {
      const d = item[dateField] || item._createdAt;
      return d && new Date(d).getTime() < DEUX_ANS;
    });
    
    // Suppression par lots de 100 pour ne pas bloquer
    for (let i = 0; i < old.length; i += 100) {
      const batch = old.slice(i, i + 100);
      for (const item of batch) {
        await DB.dbDelete(name, item.id);
      }
    }
    
    totalPurged += old.length;
    console.log('✅ ' + name + ' : ' + old.length + ' éléments supprimés (avant ' + dateLimit + ')');
  }
  
  console.log('');
  console.log('🎉 PURGE TERMINÉE — ' + totalPurged + ' éléments supprimés au total');
  console.log('💡 Rechargez la page (Ctrl+Shift+R) pour voir la différence.');
}

purgeAnnuelle();
```

5. Appuyer sur **Entrée**
6. Une boîte de dialogue va demander confirmation → Cliquer **OK**
7. Attendre que la console affiche `🎉 PURGE TERMINÉE`
8. Recharger la page avec **Ctrl + Shift + R**

---

## 📊 Ce qui est purgé vs. préservé

| ✅ PRÉSERVÉ (jamais touché) | ❌ PURGÉ (> 2 ans) |
|---|---|
| Catalogue produits | Ventes anciennes |
| Stock actuel | Lignes de vente anciennes |
| Lots actifs | Mouvements de stock anciens |
| Patients | Journal d'audit ancien |
| Fournisseurs | |
| Paramètres | |
| Utilisateurs | |
| Alertes actives | |

---

## ⏰ Calendrier recommandé

| Mois | Action |
|---|---|
| **Janvier** | Purge annuelle + backup |
| **Juillet** | Backup intermédiaire (sans purge) |
| **Chaque mois** | Vérifier que le backup Supabase fonctionne |

---

## 🆘 En cas de problème

Si l'application ne fonctionne plus après une purge :

1. Aller dans **Paramètres** → **Sauvegarde & Restauration**
2. Cliquer sur **"Restaurer depuis un fichier"**
3. Sélectionner le fichier backup JSON de l'Étape 1
4. L'application reviendra à l'état d'avant la purge

---

## 📞 Contact support technique

En cas de doute, contactez le support TrillionX avant de procéder.

---

*Document v1.0 — Créé le 22 avril 2026*
*OrdiveX / TrillionX — Tous droits réservés*
