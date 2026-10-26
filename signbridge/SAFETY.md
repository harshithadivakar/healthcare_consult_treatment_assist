# Sécurité et limites cliniques

## Statut

Ce projet est une maquette étudiante. Il n'est ni validé, ni certifié, ni approuvé pour un usage clinique. Il ne doit pas être utilisé pour un diagnostic, un triage autonome, un consentement, une décision de médicament ou une situation réelle.

## Risques principaux

| Risque | Exemple | Réduction dans la maquette |
| --- | --- | --- |
| Mauvaise transcription vocale | Un mot médical est transcrit de travers | Texte éditable avant envoi et saisie manuelle permanente |
| Fausse confiance dans la BSL | Un extrait éducatif est pris pour une traduction clinique validée | Extraits attribués et bornés, phrase anglaise affichée, avertissement explicite, confirmation et recours à un interprète |
| Perte de nuance | Une phrase simple masque un contexte complexe | Confirmation, correction, répétition, rejet et recours humain |
| Usage hors périmètre | La maquette sert à un consentement | Avertissements persistants et marquage des phrases à haut risque |
| Retard de soins | L'outil remplace une procédure urgente | Avertissement Emergency et rappel de poursuivre les procédures normales |
| Divulgation de données | Un utilisateur saisit de vraies informations | Aucune persistance, aucun serveur et consigne de ne pas utiliser de données réelles |
| Barrière d'accessibilité | Une personne ne peut pas actionner une commande | Grandes cibles, clavier, focus, contraste et texte réglable |

## Mesures de réduction

- Afficher le niveau d'incertitude avec du texte et une icône, jamais uniquement une couleur.
- Ne transmettre aucun message sans possibilité de relecture.
- Conserver un recours visible vers un interprète BSL qualifié.
- Marquer les sujets de consentement, allergie, médicament et urgence comme haut risque.
- Préférer une formulation d'échec claire à une traduction risquée.
- Ne lier une phrase qu'à un extrait documenté ; ne jamais déduire un signe pour une formulation libre ou non appariée.
- Garder les fonctions manuelles disponibles hors ligne.

## Travaux nécessaires avant un produit réel

Les sujets suivants doivent être étudiés avec des spécialistes. Cette liste ne constitue pas une déclaration de conformité :

- NHS Accessible Information Standard ;
- Digital Technology Assessment Criteria, DTAC ;
- normes de gestion du risque clinique DCB0129 et DCB0160 ;
- UK GDPR et Data Protection Act 2018 ;
- Data Protection Impact Assessment, DPIA ;
- WCAG 2.2 niveau AA ;
- éventuelle qualification comme dispositif médical ;
- sécurité, authentification, journalisation et continuité de service ;
- validation linguistique et clinique de chaque contenu BSL ;
- procédures locales d'urgence et d'interprétation.

Un Clinical Safety Officer, un Data Protection Officer, des responsables accessibilité, des personnes sourdes utilisant la BSL, des interprètes et des professionnels de santé devraient participer aux décisions.
