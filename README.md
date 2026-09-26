<div align="center">
  <img src="public/logo.png" alt="Logo OmegaRoleGameEditor" width="92" />

  # OmegaRoleGameEditor

  **Créez vos scènes de jeu de rôle, dirigez la partie et partagez une vue dédiée aux joueurs.**

  Éditeur de terrain · Table virtuelle · Session en temps réel
</div>

---

## Aperçu

| Éditeur MJ | Vue joueur |
| :---: | :---: |
| <img src="docs/screenshots/editor.png" alt="Éditeur MJ : hiérarchie, carte et inspecteur" width="600" /> | <img src="docs/screenshots/player.png" alt="Vue joueur épurée sur la même scène" width="600" /> |

Les captures utilisent [une carte de démonstration](docs/demo/observatory-map.svg) créée pour ce dépôt.

## Ce que vous pouvez faire

| Composer | Diriger | Partager |
| --- | --- | --- |
| Importer images et pions, organiser les calques et la hiérarchie, déplacer et transformer les éléments. | Préparer notes, effets, sons, dés et autres outils de partie dans l’espace MJ. | Ouvrir une salle avec le serveur Express/WebSocket et diffuser la scène visible aux joueurs. |

L’éditeur et la vue joueur sont séparés. Les éléments masqués et les informations propres à l’édition ne sont pas envoyés aux joueurs.

## Démarrer

**Prérequis :** Node.js et npm. Google Chrome est recommandé pour les fonctions de fichiers et certaines interactions avec la scène.

```bash
npm ci
npm run dev:full
```

Ouvrez **http://localhost:5173**. Le serveur de session écoute par défaut sur **http://localhost:8787**. Les ports peuvent être modifiés dans [`config.json`](config.json).

1. Passez en mode **MJ** et créez votre terrain.
2. Ajoutez des images, des pions et des calques, puis ajustez leurs propriétés dans l’inspecteur.
3. Utilisez **Sauvegarder sous…** pour exporter la scène.
4. Ouvrez le mode **Host** et communiquez le code de salle aux joueurs.
5. Les joueurs passent en vue **Joueur** pour rejoindre la session.

## Sauvegardes portables

Un terrain s’exporte dans **un seul fichier `.terrain.json`**. Les images sont embarquées sous forme de Data URL : la scène reste transportable sans dossier d’assets séparé. Les anciens fichiers JSON restent lisibles lors des évolutions du format.

## Stack et scripts

**Client :** Vite, React, TypeScript, Material UI. **Session :** Express et WebSocket.

| Commande | Usage |
| --- | --- |
| `npm run dev:full` | Lance le client et le serveur de session. |
| `npm run dev` | Lance uniquement le client. |
| `npm run dev:server` | Lance uniquement le serveur. |
| `npm run build` | Vérifie TypeScript et crée le client de production. |
| `npm test` | Lance les tests de logique métier. |
| `npm run lint` | Analyse le code avec ESLint. |

Le code client se trouve dans [`src/`](src), le serveur dans [`server/`](server) et les ressources publiques dans [`public/`](public). Les campagnes personnelles ne sont pas incluses dans ce dépôt.
