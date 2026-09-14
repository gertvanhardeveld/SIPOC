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

Vijf tabellen, met echte foreign keys die de relaties tussen de
SIPOC-onderdelen vastleggen (`on delete cascade`, zodat het verwijderen
van een proces of stap automatisch alles daaronder opruimt):

```
processes
  id                 uuid primary key
  name               text
  description        text         -- vrije, meerregelige omschrijving
  version             text        -- start standaard op '0.1'
  goal_description    text        -- vrije, meerregelige doelomschrijving
  owner_id             uuid  → process_owners(id)  on delete set null
  created_at          timestamptz
  updated_at          timestamptz

sipoc_steps
  id            uuid primary key
  process_id    uuid  → processes(id)  on delete cascade
  position      integer      -- volgorde binnen het proces
  label         text
  instructions  text         -- werkinstructie: vrije tekst, meerdere regels
  function_id   uuid  → functions(id)  on delete set null

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

functions                      -- "stamtabel": los van één proces, herbruikbaar
  id          uuid primary key
  name        text unique (hoofdletterongevoelig)
  created_at  timestamptz

external_parties               -- "stamtabel" voor externe herkomst/bestemming
  id          uuid primary key
  name        text unique (hoofdletterongevoelig)
  created_at  timestamptz       -- voorgevuld met Klant, Leverancier, Bank, Prospect

communication_types            -- "stamtabel" voor soort communicatie
  id          uuid primary key
  name        text unique (hoofdletterongevoelig)
  created_at  timestamptz       -- voorgevuld met E-mail, Telefoon, Systeem

process_owners                 -- "stamtabel" voor proceseigenaren
  id          uuid primary key
  name        text unique (hoofdletterongevoelig)
  created_at  timestamptz       -- geen vaste startset
```

`sipoc_inputs` en `sipoc_outputs` krijgen daarnaast elk extra kolommen
voor de classificatie van de supplier, resp. customer, én voor de soort
communicatie van de input/output zelf:

```
sipoc_inputs
  ...
  supplier_kind          text  -- 'intern' | 'extern' | NULL
  supplier_function_id   uuid  → functions(id)             on delete set null
  supplier_external_id   uuid  → external_parties(id)      on delete set null
  communication_type_id  uuid  → communication_types(id)   on delete set null

sipoc_outputs
  ...
  customer_kind          text  -- 'intern' | 'extern' | NULL
  customer_function_id   uuid  → functions(id)             on delete set null
  customer_external_id   uuid  → external_parties(id)      on delete set null
  communication_type_id  uuid  → communication_types(id)   on delete set null
```

Precies één van de twee referentiekolommen is relevant, afhankelijk van
`*_kind` — bij het wisselen van intern ↔ extern in het formulier wordt de
niet-relevante referentie meteen op NULL gezet, zodat er nooit een
verweesde verwijzing naar de verkeerde stamtabel blijft hangen.

Supplier en customer zijn bewust geen eigen tabellen: het zijn 1-op-1
eigenschappen van precies één input, resp. output (zoals in de tool
zelf), dus een kolom op dezelfde rij volstaat en houdt joins simpel.
`functions` is dat wél, omdat het bewust gedeeld/herbruikbaar moet zijn
over alle processen heen (zie deel 5a).

**RLS (Row Level Security)**: staat aan op alle vijf tabellen, met een
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

## 5a. Stapdetails: werkinstructie en functie

Dubbelklikken op een processtap-rechthoek (niet: enkel klikken — dat blijft
gewoon de stapnaam hernoemen) opent een formulier met:

- **Werkinstructie**: een vrij, meerregelig tekstveld. Slaat op bij het
  sluiten van het formulier of bij het verlaten van het veld.
- **Functie**: een keuzelijst die put uit de `functions`-stamtabel, plus
  een **···**-knop ernaast om die stamtabel te beheren (functies
  toevoegen/verwijderen) zonder het formulier te hoeven sluiten. Een
  net aangemaakte functie wordt meteen als keuze voor déze stap
  geselecteerd. Wordt een functie uit de stamtabel verwijderd, dan
  verliezen alle stappen die hem gebruikten gewoon hun koppeling (de
  stap zelf blijft bestaan — zie `on delete set null` in deel 3).
- Sluiten kan via het kruisje, de Escape-toets, of door naast het
  formulier te klikken.
- "Later komen hier nog meer velden bij" (opdrachtgever): het formulier
  is bewust simpel gehouden zodat een volgend veld er zonder
  herstructurering bij kan.

**Technische kanttekening (klik- vs. dubbelklikgedrag):** een enkele klik
opent meteen bewerken (zoals overal in de tool); een `dblclick` op
dezelfde rechthoek ontstaat dus na twee van die enkele klikken. Om de
gewone enkele klik niet te vertragen (geen kunstmatige wachttijd om een
eventuele tweede klik af te wachten) grijpt de `dblclick`-handler simpelweg
in: hij rondt de net-gestarte inline-bewerking netjes af (`blur()`) en
opent daarna het formulier. Een aparte bug die dit blootlegde — een
naamwijziging van het proces bovenaan de pagina herbouwde per ongeluk ook
het hele bord, wat een gelijktijdige klik op een processtap kon laten
verdwijnen — is opgelost door die twee volledig los van elkaar te
renderen.

## 5b. Herkomst en bestemming: intern of extern

Een ingevulde **supplier**- (herkomst) en **customer**-rechthoek
(bestemming) tonen niet langer een handmatig getypt label: een **enkele
klik** opent meteen het formulier (geen los tekstveld meer, dus geen
klik/dubbelklik-onderscheid nodig zoals bij een processtap). Het
formulier vraagt:

- **Type**: Intern of Extern.
- Bij **Intern**: een keuzelijst **Functie**, die dezelfde `functions`-
  stamtabel gebruikt als het stapformulier (deel 5a) — inclusief dezelfde
  **···**-beheerknop.
- Bij **Extern**: een keuzelijst **Externe partij**, uit de nieuwe
  `external_parties`-stamtabel (voorgevuld met Klant, Leverancier, Bank,
  Prospect), eveneens met een **···**-beheerknop om zelf waarden toe te
  voegen of te verwijderen.

**Wat de rechthoek toont** (`partyResolvedLabel`): de naam van de gekozen
functie of externe partij wint zodra die gekozen is — dat is nu de enige
manier om de tekst op het vak te bepalen. Zolang er nog geen Type/waarde
gekozen is, valt de weergave terug op het onderliggende `label`-veld: dat
vangt zowel oudere, al bestaande SIPOC's op (met een destijds handmatig
getypt label, van vóór dit formulier bestond) als de overgangsfase
"Type gekozen, waarde nog niet" — zonder dat een vak tijdelijk leeg
oogt. Zodra een Functie/Externe partij gekozen wordt, overschrijft de
resolved naam dat veld alsnog, dus na één keer door het formulier is de
weergave weer volledig consistent.

De twee beheerdialogen (Functies / Externe partijen) delen dezelfde
generieke modal-code (`openMasterListModal`) — enige verschil is welke
stamtabel, labels en placeholder-tekst ze gebruiken. Een net aangemaakte
waarde wordt, net als bij het stapformulier, meteen geselecteerd voor het
vak waar je mee bezig was.

## 5c. Input en output: omschrijving en soort communicatie

Dubbelklikken op een input- of output-rechthoek (net als bij een
processtap: een enkele klik blijft gewoon rechtstreeks op de rechthoek
hernoemen) opent een formulier met:

- **Omschrijving**: hetzelfde label als de rechthoek zelf, nu ook
  bewerkbaar via een tekstveld in het formulier — bewerken via de
  rechthoek zelf (enkele klik) of via dit veld komt op precies hetzelfde
  neer, ze delen hetzelfde onderliggende veld.
- **Soort communicatie**: een keuzelijst uit een nieuwe
  `communication_types`-stamtabel (voorgevuld met E-mail, Telefoon,
  Systeem), met dezelfde **···**-beheerknop als bij Functie/Externe
  partij om zelf waarden toe te voegen of te verwijderen.

In tegenstelling tot supplier/customer (deel 5b) blijft de rechthoek hier
gewoon het (vrije) label tonen — de soort communicatie is aanvullende
informatie, geen vervanging van wat er op het vak staat.

## 5d. Het proces zelf: omschrijving, versie, doel en eigenaar

Dubbelklikken op de procesnaam-rechthoek bovenaan (een enkele klik blijft
gewoon rechtstreeks de naam hernoemen, zoals nu al het geval was) opent
een formulier met, in deze volgorde:

1. **Omschrijving** — vrije, meerregelige tekst over het proces.
2. **Versienummer** — vrij tekstveld; een nieuw proces start standaard op
   **"0.1"**.
3. **Doelomschrijving** — vrije, meerregelige tekst over het doel van het
   proces.
4. **Proceseigenaar** — een keuzelijst uit een nieuwe `process_owners`-
   stamtabel, met dezelfde **···**-beheerknop om zelf eigenaren toe te
   voegen of te verwijderen (hier geen vaste startset, in tegenstelling
   tot Externe partijen/Communicatiesoorten).

Deze vier velden leven direct op de `processes`-rij zelf (`description`,
`version`, `goal_description`, `owner_id` → `process_owners(id)`
`on delete set null`) en worden, net als de procesnaam, in één upsert
(`syncProcess`) samen opgeslagen.

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
