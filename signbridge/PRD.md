# PRD : NHS SignBridge

## Problème

Une personne sourde préférant la BSL et un professionnel ne connaissant pas la BSL peuvent rencontrer une barrière de communication dans un contexte de santé. Une interface pourrait soutenir l'échange, à condition de ne jamais remplacer un interprète qualifié ni de masquer son incertitude.

## Vision

Une PWA sur tablette qui facilite des échanges simples, structurés et réversibles. Chaque message peut être relu, corrigé, confirmé, répété ou rejeté. Le recours humain reste immédiatement accessible.

## Utilisateurs

### Patient

- Utilise principalement la BSL ou préfère la BSL à l'anglais écrit.
- Peut avoir besoin de texte large, de contraste ou de légendes.
- Doit contrôler la confirmation de chaque message.

### Professionnel de santé

- Ne connaît pas nécessairement la BSL.
- Peut parler, saisir ou choisir une phrase locale.
- Doit voir les limites, les risques et les recours disponibles.

## Parcours couverts

- `Reception` : accueil, identité, rendez-vous et préférences.
- `Consultation` : symptômes, douleur, antécédents, questions et compréhension.
- `Emergency` : démonstration sous avertissement renforcé, sans remplacement des procédures.

## Périmètre de la maquette

- Onboarding accessible.
- Conversation bidirectionnelle en mémoire.
- Reconnaissance vocale facultative avec correction avant envoi.
- Bibliothèque locale de 40 phrases médicales structurées.
- Parcours symptômes et douleur.
- Trois états d'incertitude.
- Demande simulée d'interprète qualifié.
- Caméra BSL explicitement simulée.
- Effacement manuel et automatique au rechargement.
- PWA installable et fonctionnement hors ligne.

## Non-objectifs

- Reconnaissance ou génération réelle de BSL.
- Traduction médicale validée.
- Diagnostic, triage autonome, consentement ou prescription.
- Dossier patient, authentification, intégration NHS ou conservation.
- Mesure de conformité à un cadre réglementaire.

## Indicateurs de réussite pour une démonstration

- Les trois parcours sont atteignables sans explication externe.
- Le professionnel peut préparer et corriger un message.
- Le patient peut confirmer ou rejeter ce message.
- Les fonctions simulées sont immédiatement identifiables.
- Le bouton interprète reste disponible.
- Un rechargement efface la conversation.
