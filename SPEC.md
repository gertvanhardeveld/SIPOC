# SIPOC Builder — specificatie

Een interactieve, browser-gebaseerde tool om SIPOC-diagrammen (Suppliers –
Input – Process – Output – Customer) op te bouwen en te bewerken, per
proces opgeslagen in een Supabase-database. Eén HTML-bestand
(`index.html`), geen build-stap; de enige externe dependency is de
`@supabase/supabase-js`-library (geladen via CDN) om met de database te
praten.

## 1. Doel

Een gebruiker moet meerdere processen kunnen bijhouden, per proces een
SIPOC-diagram opbouwen (processtappen, inputs/suppliers,
outputs/customers), en die processen makkelijk terugvinden en wisselen
via een doorzoekbare, alfabetische lijst. Alles wordt live opgeslagen —
er is geen aparte "opslaan"-knop.

## 2. Schermindeling

```
┌──────────────┬───────────────────────────────────────────────┐
│  Sidebar      │  Procesnaam (bewerkbaar)          Opgeslagen  │
│  - zoekbalk   ├───────────────────────────────────────────────┤
│  + Nieuw      │  Suppliers | Input | Processtap | Output | .. │
│  proces       │                                               │
│  - boom van   │        (het SIPOC-diagram, zie SPEC deel 2    │
│    processen, │         van de vorige versie: grid, pijlen,   │
│    A-Z        │         +/× op elke rechthoek)                │
└──────────────┴───────────────────────────────────────────────┘
```

- **Sidebar** (links, vast): een zoekbalk, een "+ Nieuw proces"-knop, en
  daaronder alle processen die een SIPOC hebben, alfabetisch gegroepeerd
  per beginletter. Klikken op een naam laadt dat proces. Op hover
  verschijnt een `×` om dat hele proces (en zijn SIPOC) te verwijderen.
  Onder de 760px breed schuift de sidebar boven de hoofdinhoud in plaats
  van ernaast.
- **Procesnaam-veld**: bovenaan de hoofdinhoud, boven de kolomkoppen.
  Zelfde bewerk-interactie als de rechthoeken in het diagram: klikken
  maakt hem bewerkbaar, leeg = het label **"Procesnaam"** in lichtgrijs.
- **Sync-status**: rechts van het procesnaam-veld, toont
  "Opgeslagen" / "Bezig met opslaan…" / "Opslaan mislukt — controleer je
  verbinding".
- **Het SIPOC-diagram zelf** (kolommen, grid, lijnen met pijlpunten,
  +/×-knoppen op elke rechthoek) werkt exact zoals eerder gespecificeerd
  — zie de knoppentabel in deel 7 van de vorige versie van dit document
  (ongewijzigd; hieronder niet herhaald).

## 3. Databaseschema (Supabase/Postgres)

Vier tabellen, met echte foreign keys die de relaties tussen de
SIPOC-onderdelen vastleggen (`on delete cascade`, zodat het verwijderen
van een proces of stap automatisch alles daaronder opruimt):

```
processes
  id          uuid primary key
  name        text
  created_at  timestamptz
  updated_at  timestamptz

sipoc_steps
  id          uuid primary key
  process_id  uuid  → processes(id)  on delete cascade
  position    integer      -- volgorde binnen het proces
  label       text

sipoc_inputs
  id              uuid primary key
  step_id         uuid  → sipoc_steps(id)  on delete cascade
  position        integer      -- volgorde binnen de stap
  label           text
  supplier_label  text         -- NULL = geen supplier-vak; ''  = wel
                                -- toegevoegd maar nog leeg; tekst = ingevuld

sipoc_outputs
  id              uuid primary key
  step_id         uuid  → sipoc_steps(id)  on delete cascade
  position        integer
  label           text
  customer_label  text         -- zelfde NULL/''/tekst-logica als supplier
```

Supplier en customer zijn bewust geen eigen tabellen: het zijn 1-op-1
eigenschappen van precies één input, resp. output (zoals in de tool
zelf), dus een kolom op dezelfde rij volstaat en houdt joins simpel.

**RLS (Row Level Security)**: staat aan op alle vier tabellen, met een
policy die de `anon`-rol (dus: iedereen met de link, geen login) volledig
lees- en schrijfrecht geeft. Dat is een bewuste keuze voor een interne
tool zonder authenticatie — zie deel 6 hieronder voor de afweging.

## 4. Hoe de app en de database synchroon lopen

- Elk onderdeel (proces, stap, input, output) krijgt zijn `id`
  **client-side** als een echte UUID (`crypto.randomUUID()`), op het
  moment dat het in de browser wordt aangemaakt — niet pas bij het
  opslaan. Diezelfde UUID is meteen ook de primary key in de database.
  Daardoor is elke schrijfactie een simpele **upsert** (bestaat de rij
  al? dan update; anders insert) op basis van die ene, al bekende id —
  er is geen aparte "is dit al opgeslagen?"-boekhouding nodig.
- **Tekst bewerken** (klikken → typen → Enter/weg-klikken) doet precies
  één upsert van de rij waar dat veld bij hoort.
- **Toevoegen/verwijderen/tussenvoegen** van een stap, input of output
  werkt in twee stappen: (1) de rechthoeken meteen lokaal bijwerken en
  herrenderen (de gebruiker ziet direct resultaat, zonder op het netwerk
  te wachten), en (2) op de achtergrond alle rijen in die lijst (bv. alle
  stappen van het proces) opnieuw upserten met hun **huidige
  array-positie** als `position`-kolom. Zo hoeft er nooit een aparte
  "verschuif alles op"-berekening gemaakt te worden: de volgorde in de
  database volgt gewoon de volgorde in het lokale geheugen.
- **Supplier/customer toevoegen of verwijderen** is geen aparte rij,
  maar een update van `supplier_label`/`customer_label` op de
  bijbehorende input/output-rij (zie de NULL/''-logica in deel 3).
- Bij het **wisselen van proces** (sidebar-klik, of het proces staat al
  in de link via `?p=<uuid>`) wordt het volledige proces opnieuw
  opgehaald: het proces zelf, al zijn stappen (op volgorde), en al hun
  inputs/outputs — en daaruit wordt de diagramstatus opnieuw opgebouwd.
  De huidige `?p=`-parameter in de adresbalk verandert mee, dus een
  proces is direct te delen via de link.
- Elke schrijfactie loopt door één centrale `trackSave()`-helper die de
  sync-status bijhoudt en fouten afvangt (geen kapotte pagina bij een
  hapering in de verbinding, wel een zichtbare foutmelding).

## 5. Sidebar-boomstructuur

- Alle processen worden eenmalig geladen (`id`, `name`) en client-side
  gefilterd (zoekbalk, deelstring, hoofdletterongevoelig) en gegroepeerd
  per beginletter van de naam (alfabetisch op basis van de
  Nederlandse sorteervolgorde). Naamloze processen (nog geen naam
  ingevuld) komen in een eigen groep "#" terecht, met het label
  "Procesnaam" in cursief-grijs.
- Het actieve proces is gemarkeerd; klikken op een andere naam laadt dat
  proces (zie deel 4).

## 6. Toegang en beveiliging — bewuste afweging

Deze versie heeft **geen inlog**: wie de link naar de pagina heeft, kan
alle processen zien, bewerken en verwijderen. Dat is expliciet gekozen
om snel te kunnen starten. Consequenties om in het achterhoofd te
houden:

- De Supabase-URL en de `publishable`/`anon`-sleutel staan gewoon
  zichtbaar in `index.html` (zoals bij elke client-side Supabase-app
  zonder eigen backend) — dat is op zichzelf geen lek, zólang de
  RLS-policies kloppen, want die sleutel geeft alleen toegang binnen wat
  die policies toestaan.
- Omdat de policies *iedereen* volledig schrijfrecht geven, kan in
  principe iedereen met de link ook alles verwijderen. Voor een grotere
  groep gebruikers of gevoeligere content is simpele Supabase Auth
  (magic link/e-mail) een logische volgende stap — dat vervangt dan de
  `anon`-policies door policies die op een ingelogde gebruiker filteren.

## 7. Bewust (nog) buiten scope

- Geen authenticatie/gebruikersbeheer (zie deel 6).
- Geen export (PNG/PDF/afbeelding) van een SIPOC.
- Geen kleurcodering per kolom of onderdeel.
- Geen drag-and-drop herordenen — herordenen kan wel indirect door
  onderdelen te verwijderen en op de juiste plek opnieuw toe te voegen.
- Geen samenwerkingsfuncties (bv. zien wie er nog meer in hetzelfde
  proces aan het kijken/bewerken is, of conflictafhandeling als twee
  mensen tegelijk hetzelfde proces bewerken) — bij gelijktijdig bewerken
  door meerdere mensen "wint" gewoon de laatste schrijfactie per veld.
