# NHS SignBridge

Maquette étudiante d'une Progressive Web App facilitant une conversation entre une personne sourde utilisant la British Sign Language et un professionnel de santé. Elle montre une intention de produit, pas une traduction médicale validée.

## Lancer le projet

Prérequis : Node.js 20 ou plus récent et pnpm.

```bash
pnpm install
pnpm dev
```

Ouvrir l'adresse affichée par Vite. Pour tester la version compilée :

```bash
pnpm build
pnpm preview
```

## Démonstration conseillée

1. Choisir les préférences de communication.
2. Ouvrir `Reception`, `Consultation` ou `Emergency`.
3. Côté professionnel, choisir une phrase médicale ou saisir un message.
4. Pour une phrase compatible, prévisualiser l'extrait BSL éducatif attribué et borné à la phrase.
5. Corriger la transcription avant de la montrer au patient.
6. Côté patient, confirmer, demander une répétition ou signaler une incompréhension.
7. Ouvrir `Symptoms and pain` pour produire une synthèse visuelle.
8. Ouvrir la caméra BSL simulée et constater son étiquetage explicite.
9. Utiliser `Request a qualified BSL interpreter`.
10. Terminer avec `End and erase session`.

## Commandes

```bash
pnpm dev          # serveur de développement
pnpm test         # tests Vitest et Testing Library
pnpm typecheck    # contrôle TypeScript
pnpm build        # compilation de production et service worker
pnpm preview      # prévisualisation locale du build
```

## Fonctionnement hors ligne

Le service worker généré par `vite-plugin-pwa` met en cache l'interface, les données locales, les icônes et les parcours. La saisie et la bibliothèque restent utilisables hors connexion. Les vidéos externes ne sont pas disponibles hors ligne et l'interface conserve alors le texte et le recours à l'interprète. La reconnaissance vocale dépend du navigateur et peut dépendre du réseau selon son implémentation.

## Données et limites

- Aucun serveur, compte, cookie de suivi, outil d'analyse ou stockage persistant.
- Les échanges vivent uniquement en mémoire et disparaissent au rechargement.
- Des extraits éducatifs externes de l'Université d'Édimbourg sont intégrés sous licence CC BY 4.0. Ils nécessitent le réseau et ne sont pas validés pour un usage clinique.
- Une phrase sans extrait vérifié n'est ni traduite ni rapprochée automatiquement.
- La caméra et la reconnaissance BSL sont simulées.
- La reconnaissance vocale est facultative et doit être relue.
- Aucun usage clinique, diagnostic, triage, consentement ou choix de médicament.
- Aucun lien réel avec le NHS ou un service d'interprétation.

Consulter [SAFETY.md](./SAFETY.md), [PRIVACY.md](./PRIVACY.md) et [RESEARCH.md](./RESEARCH.md) avant toute évolution.

## Intégration SignSlot (26 octobre 2026)

Le bouton `Request a qualified BSL interpreter` ouvre toujours une fenêtre de simulation. Elle explique désormais que la demande serait transmise à SignSlot et propose le lien `Open the SignSlot scheduling demo`.

- SignSlot est une page autonome : `public/signslot.html` (copiée dans `dist/signslot.html` lors du build).
- Elle montre côte à côte l'application patient, l'agent SignSlot, l'application interprète et le portail clinique : appariement d'un interprète certifié, réservation, remplacement automatique en cas d'annulation et journal d'audit.
- Toutes les personnes et la clinique sont fictives. Aucun serveur, aucune donnée réelle.
- Attention : SignSlot utilise un scénario américain (ASL, Chicago, ADA), alors que SignBridge reste en BSL et NHS.

Fichiers modifiés : `src/App.tsx` (fenêtre interprète), `src/styles.css` (lien bouton), `src/App.test.tsx` (nouveau test), `public/signslot.html`.

Le dossier `dist` fourni a été corrigé directement pour inclure le lien et la page SignSlot. Après `pnpm install`, exécuter `pnpm test`, `pnpm typecheck` et `pnpm build` pour régénérer `dist` depuis le code source.
