# NHS SignBridge prototype

## Objectif

Construire une maquette PWA accessible qui démontre une conversation bidirectionnelle entre une personne sourde utilisant la BSL et un professionnel de santé. Il s'agit d'un projet étudiant, sans usage clinique.

## Règles de sécurité

- Ne jamais présenter une simulation comme une traduction BSL validée.
- Ne jamais utiliser la maquette pour un diagnostic, un consentement, une décision de médicament, un triage autonome ou un usage clinique.
- Ne pas ajouter de données patient réelles, de télémétrie, de cookie de suivi, de serveur ou de base distante.
- Garder l'action `Request a qualified BSL interpreter` visible sur tous les écrans.
- Conserver les états `Confirmed`, `Needs confirmation` et `Unable to translate safely`.
- Signaler les formulations à haut risque et recommander un interprète humain.
- La caméra BSL doit rester explicitement simulée tant qu'aucun système validé n'existe.

## Conventions

- Interface en anglais britannique et documentation en français.
- React, TypeScript, Vite et CSS natif à variables sémantiques.
- Grandes cibles tactiles, focus visible et navigation clavier.
- Une fonctionnalité dépendante du navigateur doit toujours avoir un secours manuel.
- Les données de session restent dans l'état React et ne sont jamais persistées.
- Toute nouvelle phrase médicale doit déclarer catégorie, risque, confirmation et recommandation d'interprète.

## Tests obligatoires

Avant de livrer une modification :

1. `pnpm test`
2. `pnpm typecheck`
3. `pnpm build`
4. Vérification visuelle à 1024 x 768, en clair et sombre.
5. Vérification du clavier, des focus, du mode hors ligne et de l'effacement de session.

Ne pas désactiver un test ou assouplir TypeScript pour masquer une erreur.
