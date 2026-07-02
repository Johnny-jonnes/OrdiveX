# Amélioration du suivi des Périmés (Pharmacovigilance)

Le but est de faciliter la visualisation des médicaments périmés (ou proches de l'être) en les regroupant par médicament et date de péremption, plutôt que par numéro de lot, tout en affichant l'impact financier (perte sèche).

## User Review Required

> [!IMPORTANT]
> **Regroupement par Produit + Date** : Actuellement, le système affiche chaque "Lot" individuellement. Si un médicament a plusieurs lots qui périment à la même date, ils seront désormais **fusionnés en une seule ligne**. Es-tu d'accord avec ce comportement ?
> **Actions groupées** : Le bouton "Détruire" détruira désormais **toutes les quantités** de ce médicament périmant à cette date (même s'il y avait techniquement plusieurs petits lots en base de données).

## Open Questions

Aucune question bloquante, mais n'hésite pas à me dire si le mode de calcul de la perte te convient : Quantité périmée × Prix d'Achat.

## Proposed Changes

### Composant: Traçabilité & Pharmacovigilance

#### [MODIFY] js/pages/traceability.js
- Ajouter un calcul de regroupement (educe) pour fusionner les lots ayant le même productId et la même expiryDate.
- Calculer la perte financière : quantité totale × prix d'achat du produit.
- Ajouter un KPI global dans la barre du haut affichant la perte financière totale due aux médicaments déjà expirés.
- Extraire la table dans une nouvelle fonction enderExpiryTable(data, sortBy) pour permettre un tri dynamique.
- Ajouter un menu déroulant pour trier par : Date d'expiration (défaut), Perte financière (les plus grosses pertes en premier), ou par Ordre Alphabétique.
- Modifier la fonction initDestroyLot pour qu'elle puisse accepter un tableau de lots (les lots fusionnés) afin de les détruire d'un seul coup.

## Verification Plan

### Manual Verification
- Ouvrir l'onglet Pharmacovigilance.
- Vérifier que les médicaments périmés apparaissent clairement (sans afficher de numéros de lots inutiles).
- Vérifier que la colonne "Perte financière" s'affiche correctement (ex: 5 boîtes à 10 000 = 50 000 GNF).
- Tester le tri par Perte Financière pour s'assurer que les plus grosses pertes remontent en haut.
