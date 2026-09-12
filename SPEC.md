# SIPOC Builder — specificatie

Een interactieve, browser-gebaseerde tool om een SIPOC-diagram (Suppliers –
Input – Process – Output – Customer) op te bouwen en te bewerken. Volledig
losstaand: één HTML-bestand (`index.html`), geen dependencies, geen
build-stap, geen server nodig.

## 1. Doel

Een gebruiker moet een SIPOC-procesdiagram kunnen opbouwen door processtappen
en hun bijbehorende inputs/suppliers en outputs/customers toe te voegen,
te benoemen en weer te verwijderen — met een layout die zich automatisch
herschikt, zodat de vijf kolommen altijd netjes uitgelijnd blijven.

## 2. Kolommen

Van links naar rechts, vast en niet-verplaatsbaar:

| # | Kolom       | Rol                                              |
|---|-------------|---------------------------------------------------|
| 1 | Suppliers   | wie levert de input                                |
| 2 | Input       | wat er de processtap binnenkomt                    |
| 3 | Processtap  | de activiteit zelf                                 |
| 4 | Output      | wat de processtap oplevert                         |
| 5 | Customer    | wie de output ontvangt                             |

De kolomkoppen staan vast bovenaan (niet bewerkbaar) en zijn blauw
gestyled. Onder de koppen loopt een dunne stippellijn door de volle
hoogte van het diagram, als vaste kolomscheiding — ook door rijen waar
een kolom leeg is.

## 3. Datamodel

De hele diagramstatus leeft in één in-memory object (`state`), er wordt
niets opgeslagen tussen paginabezoeken:

```js
state = {
  steps: [
    {
      id, label,                  // label: string of null (= leeg/placeholder)
      inputs: [
        { id, label, supplier: { id, label } | null }
      ],
      outputs: [
        { id, label, customer: { id, label } | null }
      ]
    },
    ...
  ]
}
```

- Precies één lijst van `steps`, in volgorde van boven naar beneden.
- Elke stap heeft een eigen lijst `inputs` en een eigen lijst `outputs` —
  onafhankelijk van elkaar in aantal.
- Een `input` heeft altijd hooguit één `supplier`; een `output` altijd
  hooguit één `customer` (1-op-1, geen aparte lijst).
- Bij elke wijziging (toevoegen, verwijderen, tekst aanpassen) wordt het
  hele bord herberekend en opnieuw getekend vanuit `state` — er is geen
  aparte "verplaats"-logica; alles schuift vanzelf mee omdat het gewoon
  opnieuw gerenderd wordt.

## 4. Layout-principe: CSS Grid

- Elke processtap-"blok" is een eigen CSS Grid met **9 kolomtracks**: de 5
  inhoudskolommen (Supplier/Input/Process/Output/Customer) afgewisseld met
  4 smalle "pijl-kolommen" van 30px ertussen. Dezelfde kolombreedtes
  (`--grid-cols`) worden hergebruikt door de kolomkoppen, elk stap-blok en
  de stippellijn-overlay, zodat alles pixel-exact uitlijnt ondanks dat het
  losse grids zijn.
- Een blok heeft zoveel rijen als het maximum van `inputs.length` en
  `outputs.length` (minimaal 1). Zo kan één processtap meerdere inputs
  en/of outputs hebben, elk op hun eigen rij.
- De processtap-rechthoek zelf spant altijd alle rijen van zijn blok
  (`grid-row: 1 / span rowCount`) en centreert daarbinnen verticaal —
  ook als er bijvoorbeeld 3 outputs maar 1 input zijn.
- Stap-blokken worden gewoon na elkaar in de document-flow geplaatst
  (geen positie-berekening nodig); een stippellijn-overlay met exact
  dezelfde kolomtemplate zorgt dat de kolomscheidingen er toch doorlopend
  uitzien over de volle hoogte van het bord.

## 5. Verbindingen (lijnen + pijlpunten)

Alle rechthoeken die daadwerkelijk bestaan zijn met elkaar verbonden via
een dunne lijn met pijlpunt (CSS-getekend, geen tekens/emoji):

- **Horizontaal** (`.arrow-h`): tussen supplier→input, input→processtap,
  processtap→output, output→customer. Verschijnt alleen als beide kanten
  van de verbinding een rechthoek hebben; anders blijft die cel leeg.
- **Verticaal** (`.arrow-v`): tussen de processtap-rechthoek van stap *n*
  en die van stap *n+1*, in het midden van de Processtap-kolom.

## 6. Bewerken van tekst

- Elke rechthoek toont, zolang hij leeg is, de naam van zijn kolom
  (bv. "Input", "Supplier") in lichtgrijs als placeholder.
- Klikken op een rechthoek maakt hem `contenteditable`; bij een placeholder
  wordt de tekst eerst geleegd. Enter of Escape (of ergens anders klikken)
  rondt het bewerken af.
- Bij het opslaan wordt whitespace getrimd; een leeg resultaat zet het veld
  terug naar `null` (= weer placeholder).

## 7. Toevoegen / verwijderen — knoppenlogica

Elke knop is een rond `+`- of `×`-icoontje dat vast op de rand van een
rechthoek "kleeft" (CSS `position: absolute`, geen losse knoppenbalk).

| Knop | Positie | Werking |
|---|---|---|
| **+ processtap** | onderrand van de processtap-rechthoek, net rechts van het midden | voegt een nieuwe (lege) processtap in **direct na** deze stap — werkt op elke stap, niet alleen de laatste, dus ook tussenvoegen kan |
| **× processtap** | rechterbovenhoek van de processtap-rechthoek | verwijdert deze stap; blijft er nog maar één over, dan wordt die geleegd in plaats van verwijderd (er is altijd minstens 1 processtap) |
| **+ input** | linkerrand van de processtap-rechthoek, verticaal gecentreerd | voegt een nieuwe (lege) input-rij toe aan deze stap |
| **+ output** | rechterrand van de processtap-rechthoek, verticaal gecentreerd | voegt een nieuwe (lege) output-rij toe aan deze stap |
| **+ supplier** | linkerrand van een input-rechthoek | verschijnt alleen als die input nog geen supplier heeft; voegt de supplier toe |
| **+ customer** | rechterrand van een output-rechthoek | verschijnt alleen als die output nog geen customer heeft; voegt de customer toe |
| **× input / output / supplier / customer** | rechterbovenhoek van de betreffende rechthoek | verwijdert dat ene onderdeel (bij input/output verdwijnt ook de bijbehorende supplier/customer mee) |

## 8. Technische opzet

- Eén bestand, geen dependencies: HTML + inline `<style>` + inline
  `<script>` (IIFE, vanilla JS, geen frameworks).
- Render-strategie: elke state-wijziging roept één centrale `render()`
  aan die het hele bord (`#board`) opnieuw opbouwt als HTML-string en in
  de DOM zet. Er is bewust geen diffing/virtual DOM — de tool is klein
  genoeg dat dit simpel en snel genoeg is.
- Events lopen via **event delegation** op het bord-element: één
  click-listener leest `data-action`/`data-step`/`data-input`/
  `data-output`-attributen van de aangeklikte knop, en één
  `focusout`-listener rondt tekstbewerking af.
- Geen backend, geen opslag: de status leeft alleen in het geheugen van
  het browsertabblad en gaat verloren bij een refresh.
- Bewust nog geen kleurcodering toegepast (grijze rechthoeken voor
  supplier/input/output/customer, witte met zwarte rand voor de
  processtap) — dat was expliciet nog niet gevraagd.

## 9. Responsief gedrag

Het bord staat in een container met `overflow-x: auto` en een minimale
breedte (760px), zodat het diagram op een smal scherm horizontaal
scrollt in plaats van kapot te vouwen. Verder is de tool primair bedoeld
voor gebruik op een breder (desktop/tablet) scherm, passend bij het
soort werk (procesdiagram opbouwen).

## 10. Bewust buiten scope (nu)

- Geen opslaan/laden van een diagram (geen backend, geen `localStorage`).
- Geen export (PNG/PDF/afbeelding).
- Geen kleurcodering per kolom of per onderdeel.
- Geen drag-and-drop herordenen van stappen (herordenen kan wel indirect
  door stappen te verwijderen en op de juiste plek opnieuw toe te voegen).
