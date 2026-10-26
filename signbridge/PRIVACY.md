# Confidentialité

## Traitement actuel

La maquette n'utilise ni serveur ni base de données distante. Les messages et sélections sont conservés dans l'état en mémoire du navigateur. Ils ne sont pas enregistrés dans `localStorage`, `sessionStorage`, IndexedDB ou un cookie.

Le rechargement de la page efface automatiquement la session. L'action `End and erase session` permet aussi un effacement immédiat avec confirmation.

## Ce qui n'est pas collecté

- Identité ou compte utilisateur.
- Données patient réelles.
- Mesure d'audience ou télémétrie.
- Cookie de suivi.
- Vidéo de caméra.
- Enregistrement audio par l'application.
- Historique distant.

L'API de reconnaissance vocale est fournie par le navigateur. Son traitement peut varier selon le navigateur et le système. Elle est donc facultative et présentée avec une saisie manuelle de secours.

## Conservation future

Une conservation de six mois n'est pas implémentée. Avant d'envisager une durée, une organisation devrait documenter :

- la finalité précise ;
- la base légale et, si nécessaire, la condition applicable aux données de santé ;
- la nécessité et la proportionnalité ;
- une DPIA ;
- la minimisation, les droits, la sécurité et les accès ;
- une politique de conservation et de suppression approuvée ;
- l'alignement avec les politiques NHS et les responsabilités des acteurs.

La durée ne doit jamais être choisie uniquement parce qu'elle semble pratique.
