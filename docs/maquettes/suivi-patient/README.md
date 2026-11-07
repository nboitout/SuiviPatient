# Maquettes Suivi Patient

Ces deux propositions sont accessibles sur le site via `/proposition` :

- `/propositions/patient.html` : accueil, consentement, questionnaire initial sur ordinateur et suivi à 48 h sur mobile.
- `/propositions/praticien.html` : patients du praticien, dossier individuel et statistiques du réseau.

Les fichiers `patient.fragment.html` et `praticien.fragment.html` sont les sources
éditables des maquettes présentées dans la discussion. Les documents complets
dans `public/propositions/` sont leurs exports autonomes, avec les styles et le
comportement du sélecteur de vues intégrés. Ils peuvent être ouverts directement
dans un navigateur et sont servis tels quels par Next.js.

Les exports ont été générés avec `scripts/render.py` du skill Visualize, puis
leur enveloppe a été adaptée au site : langue française et lien de retour à
`/proposition`. Pour régénérer avec le skill installé :

```text
python <visualize-skill>/scripts/render.py docs/maquettes/suivi-patient/patient.fragment.html public/propositions/patient.html --title "Proposition patient — Suivi ROP" --force
python <visualize-skill>/scripts/render.py docs/maquettes/suivi-patient/praticien.fragment.html public/propositions/praticien.html --title "Proposition praticien — Suivi ROP" --force
```

Réappliquer le lien de retour, la langue de l’enveloppe et les liens d’icônes
(`/favicon.ico`, tailles 16/32/48, et `/apple-icon.png`, taille 180) si ces commandes
sont utilisées. La directive `img-src` de l’enveloppe autorise `'self'` pour ces
icônes. L’image source est `Favicon Suivi-Patient.png` à la racine du dépôt ;
`app/icon.png` fournit également une icône PNG 64 × 64 aux pages de l’application.
Aucun nouveau paquet npm ni service n’est nécessaire pour consulter
les exports déjà présents dans le dépôt.

Toutes les réponses et statistiques sont fictives. Les réponses aux questionnaires
restent en mémoire. L’enveloppe peut mémoriser des préférences de présentation ;
elle n’enregistre pas les réponses patient. Ces maquettes n’implémentent ni
authentification de production, ni accès aux données réelles, ni anonymisation.
Les exigences correspondantes sont détaillées dans
[la proposition](../../proposition-design-suivi-patient.md).
