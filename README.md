# SIPOC Builder

Een werkende, interactieve SIPOC-tool (Suppliers – Input – Processtap – Output – Customer) in een enkel HTML-bestand. Geen build-stap of dependencies nodig: open `index.html` in een browser.

## Gebruik

- Open `index.html` direct in de browser, of host het bestand (bijv. via GitHub Pages).
- Klik op een vak om de tekst te bewerken. Een leeg vak toont de kolomnaam in lichtgrijs als placeholder.
- Onder de eerste processtap staat een **+** om een volgende processtap toe te voegen; elke processtap heeft een **×** rechtsboven om hem te verwijderen (minimaal één processtap blijft altijd staan).
- Links van een processtap staat een **+** om een input toe te voegen; links van een input verschijnt een **+** om de bijbehorende supplier toe te voegen.
- Rechts van een processtap staat een **+** om een output toe te voegen; rechts van een output verschijnt een **+** om de bijbehorende customer toe te voegen.
- Elk onderdeel (supplier, input, output, customer) heeft een eigen **×** om het te verwijderen.
- Een processtap kan meerdere inputs en outputs hebben; de rechthoek van de processtap centreert zich automatisch over de bijbehorende rijen.

## Techniek

De layout is opgebouwd met CSS Grid: vijf kolommen (Suppliers, Input, Processtap, Output, Customer) met dunne kolommen ertussen voor de pijlen. Bij elke wijziging (toevoegen/verwijderen) wordt de grid opnieuw gerenderd op basis van de state in het geheugen, zodat alle onderdelen automatisch netjes opschuiven. Er zijn bewust nog geen kleurcoderingen toegepast.

Het volledige datamodel, het authenticatie-/autorisatiemodel en de rest van het ontwerp staan uitgeschreven in [SPEC.md](SPEC.md).

## Nieuwe front-end (in ontwikkeling)

In de map [`app/`](app/) wordt een nieuwe, "echte" front-end gebouwd (React + TypeScript + Vite + Tailwind), die uiteindelijk deze losse `index.html` gaat vervangen. Tot die overstap gemaakt is, blijft dit bestand het live product. Zie [`app/README.md`](app/README.md) voor hoe je die lokaal draait.
