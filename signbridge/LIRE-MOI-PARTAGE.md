# Ouvrir NHS SignBridge

Cette archive contient le prototype étudiant, son code source et une version déjà compilée.

## Accès rapide à l'application

1. Décompresser entièrement l'archive ZIP.
2. Installer [Node.js 20 ou plus récent](https://nodejs.org/) si nécessaire.
3. Sous Windows, double-cliquer sur `START-SIGNBRIDGE.bat`.
4. Le navigateur ouvre automatiquement `http://127.0.0.1:4174/`.
5. Garder la fenêtre du lanceur ouverte pendant l'utilisation. `Ctrl+C` arrête le site.

Sur macOS ou Linux, ouvrir un terminal dans le dossier décompressé et exécuter :

```bash
node tools/serve-dist.mjs
```

Le lancement de la version compilée ne nécessite ni `pnpm install` ni le dossier `node_modules`.

## Modifier le projet

Pour travailler sur le code source, installer Node.js 20 et pnpm, puis exécuter :

```bash
pnpm install
pnpm dev
```

Après une modification, reconstruire la version partageable avec :

```bash
pnpm test
pnpm typecheck
pnpm build
```

## Limites importantes

- Maquette étudiante, sans usage clinique.
- Ne pas utiliser pour un diagnostic, un consentement, une décision de médicament ou une urgence réelle.
- Les extraits BSL sont des ressources pédagogiques attribuées, non validées comme traductions cliniques.
- Les vidéos nécessitent une connexion Internet.
- Aucun serveur patient, compte, suivi ou stockage persistant n'est inclus.
- Utiliser un interprète BSL qualifié pour toute communication réelle ou à haut risque.


## Démo SignSlot

Dans SignBridge, cliquer sur `Request a qualified BSL interpreter`, puis sur `Open the SignSlot scheduling demo`. La page s'ouvre aussi directement à l'adresse `http://127.0.0.1:4174/signslot.html`.
