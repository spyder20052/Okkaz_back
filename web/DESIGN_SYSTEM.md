# OKKAZ — Design System

Référence visuelle du site OKKAZ (Next.js 16, App Router, CSS Modules).
Objectif : design cohérent entre **espace public**, **espace utilisateur (`/vendeur`)** et **back-office admin (`/admin`)**.

---

## 1. Tokens

### Couleurs globales — `src/app/globals.css`

| Token | Valeur | Usage |
|---|---|---|
| `--primary` | `#250C69` | Violet OKKAZ — branding, certains accents |
| `--accent` | `#3B82F6` | Bleu — CTA, liens actifs, badges info |
| `--action` | `#F97316` | Orange — CTA secondaire, avatar, badges urgent |
| `--success` | `#16A34A` | Vert — succès, statuts OK |
| `--secondary` | `#FFD9CF` | Pêche clair — fond doux |
| `--foreground` | `#171717` | Texte principal |
| `--background` | `#ffffff` | Fond pages publiques |
| `--border` | `#e2e8f0` | Lignes neutres |

### Couleurs dashboards — `vendeur.module.css` & `admin.module.css`

| Token | Valeur | Rôle |
|---|---|---|
| `--ink` | `#171624` (vendeur) / `#1d1b2f` (admin) | Texte foncé |
| `--muted` | `rgba(--ink, 0.58)` | Texte secondaire |
| `--line` | `rgba(--ink, 0.08)` | Bordures discrètes |
| `--blue` | `#3b82f6` | Liens, états actifs |
| `--orange` | `#f97316` | Avatar, badges urgents |
| `--green` | `#10b981` (admin) | Statuts OK / catégorie Standard |
| `--violet` | `#8b5cf6` (admin) | Catégorie Premium, audit log |
| `--black` | `#111111` (admin) | Sidebar admin foncée |
| `--bg` | `#f7f8fb` (vendeur) / `#f6f7fb` (admin) | Fond gris clair |

### Typographie

```css
--font-brand: 'Gilroy', sans-serif;          /* titres marketing */
--font-interface: Inter, ui-sans-serif, ...; /* corps & interfaces */
```

| Élément | Taille | Poids | Letter-spacing |
|---|---|---|---|
| H1 page | `clamp(1.65rem, 3vw, 2.5rem)` | 900 | `-0.04em` |
| H1 dashboard | `clamp(1.9rem, 3.4vw, 2.9rem)` | 900 | `-0.055em` |
| H2 card | `0.95–1rem` | 850 | `-0.025em` |
| Body | `0.82–0.86rem` | 650–760 | – |
| Kicker | `0.72rem` | 900 majuscules | `0.14em` |
| Stat strong | `1.75rem` | 900 | `-0.045em` |
| Badge / pill | `0.66–0.7rem` | 900 majuscules | `0.02–0.08em` |

### Espacement

- **Page** : padding `16–28px`, gap `22px` entre sidebar et content
- **Sections** : gap `18–22px`
- **Stat grid** : gap `14–20px`
- **Cards** : padding `22–24px`, gap interne `14–18px`
- **Inputs** : `min-height 44–48px`

### Border-radius

| Élément | Rayon |
|---|---|
| Cards / panels | `18–20px` |
| Sidebar | `22px` |
| Stat cards | `20px` |
| Inputs | `12–14px` |
| Boutons CTA / pills | `999px` (full) |
| Icônes carrées | `8–14px` |
| Avatar | `50%` |

### Ombres

```css
/* Standard */
box-shadow: 0 8px 28px rgba(17, 17, 17, 0.04);
/* Card hover */
box-shadow: 0 18px 40px rgba(17, 17, 17, 0.09);
/* CTA noir */
box-shadow: 0 10px 24px rgba(23, 22, 36, 0.2);
/* CTA bleu */
box-shadow: 0 14px 30px rgba(59, 130, 246, 0.32);
/* Avatar orange */
box-shadow: 0 8px 20px rgba(249, 115, 22, 0.32);
```

### Transitions

```css
transition: transform 0.2s ease, box-shadow 0.25s ease;
transition: background 0.18s ease, color 0.18s ease;
```

---

## 2. Composants

### Boutons CTA (`headerCta`, `btnSave`, `btnCancel`)

- **Primaire** : fond `--ink`, texte blanc, radius `999px`, ombre noire — hover bleu
- **Secondaire** : transparent, bordure `2px solid --line` — hover gris clair
- **Inline pill** (header card) : fond `#f1f3f8` → hover `--ink` blanc

```tsx
<Link href="..." className={styles.headerCta}>
  <svg>...</svg> Publier
</Link>
```

### Back arrow (`backBtn`)

Carré 46×46 px, bordure inset, hover noir avec translate -2 px.
Toujours présent dans `pageHeader` des sous-pages.

### Page header (`pageHeader`)

Grille 3 colonnes : `46px | 1fr | auto`
- Col 1 : `backBtn` (Link vers parent)
- Col 2 : kicker + h1 + description courte
- Col 3 : CTA principal (`headerCta`) ou champ recherche

**Mobile (≤ 760 px)** : grille 2 colonnes, CTA passe en ligne complète sous le titre.

### Stat card (`statCard`)

```
┌─[icône]──[titre h2]──┐
│  [meta gris]          │
│                       │
│  [STRONG valeur]      │
└───────────────────────┘
```

- Min-height 144 px, padding 22 px, radius 20 px
- Icône : badge 44×44 px, fond `rgba(--couleur, 0.12)`
- **Couleurs par index** (`:nth-child`) : orange / bleu / vert / violet
- Hover : `translateY(-3px)` + ombre renforcée
- Cliquable (Link)

### Bandeau de stats

Grille de **3 (vendeur)** ou **4 (admin)** stat cards, hors page principale.
S'utilise en haut des pages pour donner du poids visuel et aligner avec la sidebar.

### Card générique

- Border 1px `--line`, radius `20px`, padding `24px`, fond blanc
- Hover : ombre renforcée
- Header interne (`cardHeader`) : flex space-between, h2 + p + action Link/button pill

### Schedule item (liste d'actions)

```
[Badge temps]  [Titre + sous-titre]  [Statut pill]
```

- Padding 10×12, radius 14, hover background `#f7f8fc` + `translateX(2px)`
- Badge gauche : couleur cyclique par index (orange/bleu/vert/violet)
- Statut droit : pill grise compacte

### Notification (`notifItem`)

```
[dot coloré]  [titre + texte gris]
```

Trois niveaux :
- `notif_alerte` → dot rouge (`#dc2626`)
- `notif_warning` → dot orange
- `notif_info` → dot bleu

### Audit row

Grille `90px | 1.4fr | 2fr | auto` :
- Acteur (pill violet majuscule)
- Action (texte fort)
- Cible (texte gris)
- Temps relatif

Responsive ≤ 760 px : empile en 1 colonne.

### Transaction table (`txTable`)

- Grille `display: grid; gap: 2px;` sur fond `--line` pour créer des séparateurs naturels
- En-tête `.txTableHead` en majuscules grisé, contenu `.txTableRow` interactif
- Pills couleur par service : `pill_blue / pill_green / pill_orange / pill_violet`
- Pills statut : `status_ok (vert) / status_wait (orange) / status_fail (rouge)`
- Mobile (≤ 960 px) : en-tête masqué, chaque ligne en pile

### Form fields (publier / je recherche / profil)

- Label : `display: grid; gap: 8px; font-weight: 700;`
- Input : `min-height 46px, border 2px transparent, background #f8fafc, radius 14px`
- Focus : `border-color --blue` + `box-shadow 0 0 0 4px rgba(blue, 0.1)`
- Hover : bordure bleue claire, fond blanc
- Select : flèche custom en SVG via background-image

### Photo upload (publier)

Grille 4 cadres carrés (`photoGrid`, `photoSlot`) :
- Cadre principal large (1.4fr), badge "PRINCIPALE" bleu
- 3 cadres secondaires (bordure pointillée)
- Icône photo + label "Photo N" + bouton + circulaire
- Mobile : grille 2×2

### Sidebar

#### Public (Navbar)
Barre horizontale avec logo + actions + menu burger.

#### Vendeur (`SellerShell`)
- Largeur 232 px, sticky top, fond noir `#171624`, radius 22 px
- Logo blanc (filter brightness 0 invert 1), 6 items nav
- Note légale en bas
- Item actif : fond bleu + badge icône blanc translucide

#### Admin (`AdminShell`)
- Identique à vendeur en structure
- 9 items menu avec icônes carrées 28×28 + libellé
- **Badges de comptage** orange (Annonces 8, Demandes 5, KYC 12) qui passent en blanc/bleu sur item actif
- **Carte profil en bas** (cliquable → `/admin/profil`) : avatar dégradé orange + nom + rôle + chevron

### Avatars

- **Standard** : 46–48 px, fond dégradé `--orange → #fb923c`, ombre lumineuse, initiales blanches
- **Profil sidebar** : 40 px
- **Profile uploader** : 96 px, bordure pointillée bleue quand vide

### Toggle switch

- Track 52×28 px, knob 22×22 px
- Off : track gris, On : track bleu

---

## 3. Layouts

### Page dashboard (`.page`)

```css
display: grid;
grid-template-columns: 232px minmax(0, 1fr);
gap: 22px;
padding: 16–28px;
```

**Responsive (≤ 1120/1180 px)** : sidebar passe `position: static; height: auto;`, page en 1 colonne. Menu se présente en grille horizontale ou flex column.

### Dashboard grid

```css
.dashboardGrid {
  grid-template-columns: minmax(0, 1fr) minmax(286px, 340px);  /* vendeur */
  grid-template-columns: minmax(0, 1.25fr) minmax(280px, 0.95fr) 300px;  /* admin */
}
```

- **Main column** : stats + chart + cards principales
- **Side rail** : top catégories, notifications, profil étendu

### Two columns (`.twoColumns`)
Pour activité + actions rapides côte à côte (~1.08fr / 0.92fr).

---

## 4. Animations

### Hover cards
- Lift `translateY(-3px)`
- Ombre renforcée
- Durée 0.2–0.25s ease

### Active card (tap mobile)
- Scale `0.985` ou `0.992`
- Opacity 0.96

### Chart bars (admin)
- Dégradé `--blue → #6366f1`
- Hover : `translateY(-3px) + brightness(1.08)`
- Dernière barre orange `--orange → #f59e0b`

### Loop animations mobile (page d'accueil)
- Cards galerie : reproduisent l'effet hover desktop sur tap/intersection (one-shot via IntersectionObserver)
- Cards OwnerSection : filter brightness + box-shadow pulse 5.6s
- Toujours respecter `@media (prefers-reduced-motion: reduce) { animation: none !important; }`

### GSAP scroll (home)
- StackedCards : pin + scrub 1.5 + snap labels (desktop), même config mobile
- AwsmdInspiredSection : stagger fade in scroll-triggered
- OwnerSection : scrub timeline rotation + scale
- Tous gateables via `gsap.matchMedia("(min-width: 0px)")` pour activer partout

---

## 5. Conventions

### Responsive breakpoints
| Breakpoint | Usage |
|---|---|
| ≤ 1180 px | Sidebar admin passe en bandeau horizontal |
| ≤ 1120 px | Sidebar vendeur passe en bandeau |
| ≤ 960 px | Tables compactes |
| ≤ 768 px | Galerie home, animations CSS |
| ≤ 760 px | Page header en 2 colonnes, CTA pleine largeur |
| ≤ 520 px | Ultra mobile, ajustements finaux |

### Accessibilité
- `aria-label` sur tous les icon-only buttons (back arrow, search)
- `aria-hidden` sur les chevrons / SVG décoratifs
- `prefers-reduced-motion` respecté sur toutes les animations en boucle
- Focus visible : box-shadow `0 0 0 4px rgba(blue, 0.12)` sur inputs

### Patterns Next.js
- **Image** : toujours `next/image` avec dimensions intrinsèques + `priority` pour above-the-fold
- **Link** : interne au site uniquement
- **CSS Modules** : 1 fichier `.module.css` par espace logique
- **"use client"** : uniquement quand vraiment nécessaire (state, useEffect, refs)

### Naming
- `camelCase` pour les classes CSS Modules (`statCard`, `headerCta`, `pageHeader`)
- `kebab-case` pour les routes (`/vendeur/recherches/nouvelle`)
- Préfixes par espace : `seller* / admin* / public` quand ambigu

---

## 6. Spécificités OKKAZ

### Mascot
Personnage bleu utilisé sur le dashboard vendeur — supprimé du dashboard final mais récupérable via `19.png` en backup.

### Logo
`/okazz-logo-final.png` (PNG 6250×6250 transparent).
- Public : couleur d'origine
- Sidebar foncée : `filter: brightness(0) invert(1)` pour passer en blanc

### FCFA
Affichage des montants : `value.toLocaleString("fr-FR") + " FCFA"`
Tarifs clés :
- 1 500 FCFA — mise en contact
- 2 500 FCFA — publication "Je recherche" Standard
- 5 000 FCFA + 3 % — publication "Je recherche" Express
- 3 000 FCFA / sem — Abonnement Premium hebdo
- 10 000 FCFA / mois — Abonnement Premium mensuel
- 1 000 FCFA / mois — Compte bénéficiaire Premium

### Modèle économique
**Tous les paiements vont à OKKAZ**, jamais au vendeur.
Le vendeur **ne génère pas de revenus** via la plateforme — les transactions de location se font directement hors plateforme après mise en contact.

---

## 7. Fichiers de référence

| Fichier | Contenu |
|---|---|
| [src/app/globals.css](src/app/globals.css) | Tokens globaux, reset CSS, body font |
| [src/app/admin/admin.module.css](src/app/admin/admin.module.css) | Tous les styles back-office |
| [src/app/vendeur/vendeur.module.css](src/app/vendeur/vendeur.module.css) | Tous les styles espace utilisateur |
| [src/app/page.module.css](src/app/page.module.css) | Home page (hero, sections, galerie) |
| [src/components/](src/components/) | Composants partagés (Navbar, HeroSection, StackedCards, etc.) |

### Shells (layouts d'espace)
- [src/app/admin/AdminShell.tsx](src/app/admin/AdminShell.tsx)
- [src/app/vendeur/SellerShell.tsx](src/app/vendeur/SellerShell.tsx)
- [src/components/layout/Navbar.tsx](src/components/layout/Navbar.tsx)
- [src/components/layout/Footer.tsx](src/components/layout/Footer.tsx)
