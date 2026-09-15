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
  created_by           uuid  → auth.users(id)  on delete set null  -- wie mag bewerken (zie 6b)
  created_at          timestamptz
  updated_at          timestamptz

profiles                        -- spiegelt auth.users, zie 6a
  id          uuid primary key → auth.users(id) on delete cascade
  email       text
  created_at  timestamptz

process_editors                 -- wie mag dit specifieke proces bewerken, naast created_by
  process_id  uuid → processes(id)   on delete cascade
  user_id     uuid → auth.users(id)  on delete cascade
  created_at  timestamptz
  primary key (process_id, user_id)

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

Voor de AO-online-achtige weergave (alleen in de nieuwe React-app,
`index.html` heeft er geen formulierveld voor — die kolom staat er voor
die app dus altijd op de default `false`) is er één losse boolean-kolom
bijgekomen:

```
sipoc_steps.is_decision    -- "Beslissing"-vinkje: rood i.p.v. wit-met-blauwe-rand
```

Input/output krijgen bewust géén eigen "intern"-kolom: die kleur
(blauw i.p.v. lichtgrijs) wordt afgeleid van `supplier_kind`/
`customer_kind` van de bíjbehorende herkomst/bestemming — één keuze
kleurt dus twee blokjes (de herkomst/bestemming zelf én de input/output
ernaast) tegelijk. Een eerdere versie had hier nog een aparte
`is_internal`-kolom op `sipoc_inputs`/`sipoc_outputs`; die is na een dag
alweer verwijderd toen bleek dat 'm apart laten kiezen dubbelop was.

Precies één van de twee referentiekolommen is relevant, afhankelijk van
`*_kind` — bij het wisselen van intern ↔ extern in het formulier wordt de
niet-relevante referentie meteen op NULL gezet, zodat er nooit een
verweesde verwijzing naar de verkeerde stamtabel blijft hangen.

Supplier en customer zijn bewust geen eigen tabellen: het zijn 1-op-1
eigenschappen van precies één input, resp. output (zoals in de tool
zelf), dus een kolom op dezelfde rij volstaat en houdt joins simpel.
`functions` is dat wél, omdat het bewust gedeeld/herbruikbaar moet zijn
over alle processen heen (zie deel 5a).

**RLS (Row Level Security)**: staat aan op alle vijf tabellen. Sinds de
introductie van authenticatie (deel 6) gelden de policies alleen nog
voor de rol `authenticated` (ingelogd); `anon` heeft nergens meer
toegang. Zie deel 6 voor het volledige authenticatie- en
autorisatiemodel.

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

**Alleen in de nieuwe React-app**: bij **Intern** komt er een extra
tussenstap **Soort verwijzing** — **Functie** (het bovenstaande, ongewijzigd)
of **Procesactiviteit**. Bij dat laatste volgen twee extra keuzelijsten:
eerst een **Proces** (alle processen behalve het proces waar dit blokje
zelf in staat — de bedoeling is een verwijzing naar een ándér proces),
dan een **Activiteit** binnen dat gekozen proces (de stappen van dat
proces, opgehaald zodra een proces gekozen is). De rechthoek toont dan de
naam van die activiteit, op dezelfde manier als bij Functie/Externe
partij. Nieuwe kolommen `sipoc_inputs.supplier_internal_type` /
`supplier_step_id` en `sipoc_outputs.customer_internal_type` /
`customer_step_id` (de laatste twee `on delete set null`, dus een
verwijderde activiteit laat het vak niet stuk gaan — het toont alleen de
laatst bekende naam totdat iemand het opnieuw instelt, net als bij een
verwijderde functie/externe partij). `index.html` heeft dit onderscheid
niet — daar blijft Intern altijd gewoon een Functie.

**Een activiteit-verwijzing is een tweerichtingskoppeling.** Een output
die naar activiteit X wijst, ís voor X een input — dus wordt bij X
automatisch een input aangemaakt (of bijgewerkt) met dezelfde naam als de
output, en een herkomst die terugwijst naar de stap waar de output
vandaan komt (en symmetrisch: een input die naar activiteit Y wijst,
maakt bij Y een output aan die terugwijst). Verplaats je de verwijzing
naar een andere activiteit, dan verhuist de andere kant mee (de oude
spiegel wordt opgeruimd, een nieuwe aangemaakt); verwijder je de
verwijzing helemaal, dan verdwijnt de spiegel ook. Dit gebeurt via
`syncReciprocalInput`/`syncReciprocalOutput`/`removeReciprocalInput`/
`removeReciprocalOutput` (`lib/board.ts`), aangeroepen vanuit
`savePartyDetails` in `ProcessPage.tsx` — rechtstreekse Supabase-writes
op het ándere proces, buiten het hier geladen bord om (dat proces hoeft
niet open te staan). Herkenning van "is dit dezelfde spiegel als
vorige keer, of een nieuwe" gaat op `(*_kind, *_internal_type,
*_step_id)` van de eerste match op positie — bij twee onafhankelijke
koppelingen tussen exact dezelfde twee activiteiten kan dat de verkeerde
raken; die situatie is nu bewust niet verder ondervangen. Deze
koppeling vereist wél bewerkrechten op het ándere proces
(`can_edit_process`) — ontbreken die (proces van een andere,
niet-vertrouwde gebruiker), dan faalt alleen de spiegel-kant stil (zie
`sync-status`-melding), de eigen kant is al wel opgeslagen.

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

## 6. Toegang en beveiliging

### 6a. Authenticatie: magic link

Inloggen gaat via een **magic link** (Supabase Auth, passwordless):
e-mailadres invullen → Supabase stuurt een inloglink → klikken logt in.
Geen wachtwoorden, dus ook geen "wachtwoord vergeten"-flow nodig.
Registratie staat open: iedereen met een e-mailadres kan zelf inloggen —
er is (nog) geen uitnodig- of domeinbeperking.

- `index.html` toont een inlogscherm (`#login-screen`) totdat er een
  sessie is; de rest van de app (`#app`) blijft tot dan verborgen.
- `sb.auth.onAuthStateChange(...)` bepaalt welk scherm zichtbaar is en
  start de eigenlijke app (`init()`) pas zodra er een sessie is — dat
  gebeurt maar één keer per sessie (`appInitialized`-vlag), en wordt
  weer teruggezet bij uitloggen zodat een volgende inlog (evt. als
  andere gebruiker, op hetzelfde toestel) alles opnieuw ophaalt.
- Bij het klikken op de magic link in de e-mail parseert supabase-js
  automatisch het token uit de URL (`detectSessionInUrl`, standaard aan)
  — daar hoefde geen aparte callback-pagina/route voor gebouwd te worden.
- **`profiles`**-tabel: spiegelt `auth.users` (die de client nooit
  rechtstreeks mag bevragen) met alleen `id` en `email`, automatisch
  gevuld via een trigger (`handle_new_user`) bij het aanmaken van een
  account. Nodig om iemand op e-mailadres te kunnen opzoeken (bv. als
  bewerker toevoegen) zonder `auth.users` bloot te leggen.

### 6b. Autorisatie: wie mag wat

Simpel model, bewust gekozen als eerste stap (zie ook eerdere sectie
"Toegang en beveiliging"): **iedereen die ingelogd is mag alle processen
zien**; bewerken mag alleen de **eigenaar** (`processes.created_by`,
gezet bij het aanmaken) of iemand op de **bewerkerslijst**
(`process_editors`).

- De eigenaar beheert die bewerkerslijst zelf, in het procesformulier
  (deel 5d) — door een e-mailadres in te typen. Dat moet horen bij een
  account dat al minstens één keer heeft ingelogd (anders staat er geen
  rij in `profiles` om op te zoeken); zo niet, dan volgt een duidelijke
  melding.
- **Bestaande processen van vóór er accounts waren** (`created_by is
  null`) blijven bewerkbaar voor iedereen die ingelogd is, tot iemand ze
  "claimt" — een bewuste overgangsregel om niemand buiten te sluiten van
  eigen, al bestaand werk.
- De front-end **respecteert dit ook zichtbaar**, niet alleen
  server-side: kan een ingelogde gebruiker een proces niet bewerken, dan
  toont het bord een "Alleen-lezen"-label, verdwijnen alle +/×-knoppen,
  en doet klikken op een rechthoek niets (in plaats van een wijziging te
  laten "lukken" die de database vervolgens alsnog weigert). Dat wordt
  bepaald door `canEditCurrentProcess`, berekend bij het laden van een
  proces (`checkCanEdit`).
- Herbruikbare RLS-check: `public.can_edit_process(pid)` (`security
  definer`, gebruikt eigenaar/bewerkerslijst/`created_by is null`) —
  hergebruikt in de policies van `processes`, `sipoc_steps`,
  `sipoc_inputs` en `sipoc_outputs` (die laatste twee via een join op de
  bijbehorende stap). De stamtabellen (functies, externe partijen,
  communicatiesoorten, proceseigenaren) blijven gedeeld vocabulaire voor
  iedereen die ingelogd is — geen per-proces afscherming daarop.
- **Verwijderen van een proces is bewust ruimer dan bewerken:** elke
  ingelogde gebruiker mag elk proces verwijderen, ongeacht eigenaar/
  bewerkerslijst (policy "verwijderen: alle ingelogde gebruikers",
  `using (true)`, alleen voor de rol `authenticated`) — dus niet via
  `can_edit_process`. Dit is een bewuste versoepeling t.o.v. de eerdere
  eigenaar/legacy-only-regel: met één echte gebruiker die tijdens het
  testen tussen twee eigen e-mailadressen wisselt, ontstonden anders
  "eigen" testprocessen die niet meer op te ruimen waren omdat ze onder
  het andere adres waren aangemaakt. Bewerken blijft wel beperkt tot
  eigenaar/bewerker/legacy — alleen verwijderen is opengezet. Zodra er
  echte, elkaar niet vertrouwende gebruikers bijkomen is dit het eerste
  wat weer aangescherpt moet worden (zie deel 7).

### 6c. Overige beveiligingskeuzes

- De Supabase-URL en de `publishable`-sleutel staan gewoon zichtbaar in
  `index.html` (normaal voor een client-side Supabase-app) — dat is op
  zichzelf geen lek zolang de RLS-policies kloppen, want die sleutel
  geeft alleen toegang binnen wat die policies toestaan.
- De `anon`-rol (niet ingelogd) heeft nu **nergens meer** lees- of
  schrijftoegang toe — voorheen (vóór authenticatie) was dat bewust wel
  zo; zie de git-historie voor die eerdere afweging.
- `public.can_edit_process` en de trigger-functie `handle_new_user` zijn
  `security definer` — Supabase's linter meldt beide standaard als
  "rechtstreeks aanroepbaar via de publieke API". `handle_new_user` is
  daarom volledig afgesloten (triggers hebben geen eigen execute-recht
  nodig om te vuren). `can_edit_process` moet wél uitvoerbaar blijven
  voor de rol `authenticated`, omdat de RLS-policies 'm intern aanroepen
  met de rechten van de aanroepende rol — alleen `anon` is daar
  afgesloten. De resterende linter-melding ("authenticated kan de
  functie rechtstreeks aanroepen") is een bewust geaccepteerde,
  onvermijdelijke afweging: de functie geeft toch nooit meer prijs dan
  een ja/nee op "mag ik dit proces bewerken", over data die al open
  leesbaar is.
- **Openstaand punt: e-mailverzending loopt nu via Supabase's ingebouwde
  mailer**, die uitdrukkelijk bedoeld is om te testen en daarom een zeer
  laag rate-limit heeft (een paar e-mails per uur, projectbreed, gedeeld
  over signup/magic-link/password-recovery samen). Geconstateerd op
  2026-09-14: na een paar achtereenvolgende inlogpogingen (oude en
  nieuwe front-end kort na elkaar getest) sloeg de OTP-aanvraag om naar
  `429 over_email_send_rate_limit` — te zien in de auth-logs
  (`error_code: over_email_send_rate_limit`, pad `/otp`). Dit is geen
  bug in de app, maar een hard limiet dat met echte (meerdere)
  gebruikers gegarandeerd opnieuw geraakt wordt. **Vereist vóór
  productie-/multi-user-gebruik:** een eigen SMTP-provider koppelen via
  Supabase-dashboard → Project Settings → Authentication → SMTP
  Settings (bijv. Resend of Postmark, beide met een gratis tier die ruim
  voldoende is voor dit schaalniveau). Dit is een dashboard-instelling,
  niet iets dat via migraties/code geregeld wordt.
- **Bug gevonden en gefixt op 2026-09-14: `upsert()` op `processes` werd
  altijd geweigerd door RLS, ook voor de eigenaar zelf.** `processes`
  heeft een aparte INSERT-policy (`with_check: created_by = auth.uid()`)
  naast de UPDATE-policy (`can_edit_process(id)`). Een `upsert()` compileert
  naar `INSERT ... ON CONFLICT (id) DO UPDATE` — en Postgres past de
  INSERT-policy's `WITH CHECK` altíjd toe op de voorgestelde rij, óók als
  de conflict/update-kant uiteindelijk wordt genomen. Omdat het opslaan
  van een proces (`syncProcess()` in `index.html`, `saveProcess()` in de
  nieuwe app) `created_by` nooit meesteurde, werd die kolom impliciet
  `null` in de voorgestelde rij — en `null = auth.uid()` is nooit waar,
  dus elke procesnaam-wijziging/omschrijving-wijziging werd geweigerd
  (`42501: new row violates row-level security policy`), voor iedereen,
  inclusief de eigenaar. Bevestigd door de exacte upsert te simuleren via
  `set local role authenticated` + een JWT-claim. Fix: een gewone
  `update().eq("id", id)` in plaats van `upsert()` — dat proces bestaat
  altijd al op dit punt (aanmaken gaat via een aparte `insert()` mét
  `created_by`), dus er is nooit een insert-pad nodig. Toegepast in beide
  apps. **Les voor vervolg:** `upsert()` op een tabel met een striktere
  INSERT- dan UPDATE-policy is een terugkerende valkuil — gebruik 'm
  alleen als de payload alle kolommen bevat die de INSERT-policy nodig
  heeft, of vermijd 'm zodra de rij al gegarandeerd bestaat.

## 7. Bewust (nog) buiten scope

- Geen fijnmaziger rollenmodel dan eigenaar/bewerker/lezer (zie deel 6b)
  — geen teams/organisaties, geen aparte "viewer expliciet uitnodigen".
- Geen domein- of uitnodigingsbeperking op wie een account mag maken.
- Geen export (PNG/PDF/afbeelding) van een SIPOC.
- Geen kleurcodering per kolom of onderdeel.
- Geen drag-and-drop herordenen — herordenen kan wel indirect door
  onderdelen te verwijderen en op de juiste plek opnieuw toe te voegen.
- Geen samenwerkingsfuncties (bv. zien wie er nog meer in hetzelfde
  proces aan het kijken/bewerken is, of conflictafhandeling als twee
  mensen tegelijk hetzelfde proces bewerken) — bij gelijktijdig bewerken
  door meerdere mensen "wint" gewoon de laatste schrijfactie per veld.
