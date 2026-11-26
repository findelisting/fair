# Finde × fairafric: Demo-Prototyp Spec

Status: Entwurf zur Freigabe. Zweck: schneller, klickbarer Prototyp für das Erstgespräch mit fairafric Marketing. Zusagen nur für Punkte, die als "real" markiert sind.

## 1. Ziel und Kernbotschaft

Pitch-Satz: "Alles, worauf Ihre QR-Codes verweisen, läuft über Finde. Ihre Website-Daten werden eng begrenzt angebunden, und Kundenfeedback fließt in dieselben Daten. Jedes Produkt bekommt einen Agenten, der alles zusammenführt und mit dem Markt vergleicht."

Ziel des Demos: fairafric soll sehen, wie ein Scan auf der Verpackung bis zum Websitebesuch, zum Feedback und zur Entscheidung nachvollziehbar wird. Kein Versprechen zu Verkaufszahlen, Recht oder Zertifizierung.

## 2. Scope

### Real (im Prototyp funktionsfähig)
- **QR-Redirect über Finde:** QR-Code zeigt auf einen Finde-Link. Finde speichert das Scan-Event (SKU, Kampagne, Markt, Zeit, Gerätetyp) und leitet an die Zielseite weiter. Zielseiten können echte Testseiten sein, z. B. eine Demo-Produktseite.
- **Parameter-Weitergabe:** Weiterleitung mit `?sku=...&campaign=...&market=...`.
- **Ein Sammel-Code:** ein Code für eine Kollektion (z. B. vegane Creamy-Reihe), der auf mehrere SKUs verweist.
- **Feedback-Formular je SKU:** drei kurze Fragen (Bewertung, Geschmack, optionaler Freitext), erreichbar über den QR-Code oder die Produktseite. Jede Antwort wird mit SKU, Kampagne und Markt gespeichert, ohne Namen oder Kontaktdaten.
- **Ziel-Typen:** Produktseite, Shop-Link, Feedback-Formular. Videos liegen auf fairafric-Seite und werden nicht von Finde gehostet.

### Mock (sichtbar als Simulation markiert)
- **Website-Connector:** Dashboard zeigt synthetische Daten für Sitzungen, Seitenaufrufe, Video-Plays und Shop-Klicks je SKU, Kampagne und Markt. Im Demo-Screen Hinweis: "Synthetische Daten".
- **Kundenfeedback im Dashboard:** synthetische Antworten mit Bewertung, Themen-Tags (z. B. Bitterkeit, Verpackung, Herkunft) und Häufigkeit je SKU. Ein Freitext-Beispiel pro Thema, anonymisiert.
- **Produkt-Agent:** beantwortet 2–3 vorbereitete Fragen über die Mock-Daten (Scans, Website, Feedback), jede Antwort mit angezeigten Quellen und Zahlen.
- **Wettbewerbsvergleich:** ein bis zwei öffentliche Quellen (Händlerlisting, Preis, Verpackung), mit Quelle und Datum je Angabe. Keine Live-Abfrage im Demo.
- **Verbesserungsvorschläge:** als Hypothesen markiert, z. B. "Test: Herkunftsgeschichte auf der 92%-Verpackung". Keine Automatik.

### Nicht im Prototyp
- Video-Hosting oder Video-Einbettung über Finde.
- Personenbezogene Daten, Login, Kunden-Identifikation, wiederkehrende Nutzer.
- Kundenkonten, Treueprogramm, Gutscheine.
- Echte Anbindung an fairafric-Systeme oder Ads-Konten.
- Echtzeit-Scraping von Wettbewerbern.
- Echtheitsprüfung (Anti-Fälschung mit seriellen Codes).
- EUDR-Due-Diligence oder Compliance-Nachweis.

## 3. Ablauf (Architektur)

1. Nutzer scannt QR-Code auf der Verpackung.
2. Finde-Redirect speichert Scan-Event und leitet weiter mit Parametern.
3. Zielseite (fairafric) öffnet Produktseite; Website-Analytics übernimmt Parameter.
4. Nutzer kann Feedback abgeben; Finde speichert es mit SKU, Kampagne und Markt.
5. Connector (Mock) liefert aggregierte Sitzungs- und Event-Daten je SKU/Kampagne/Markt.
6. Dashboard fasst Scans, Website-Daten und Feedback je Produkt und Kollektion zusammen.
7. Produkt-Agent beantwortet Fragen über alle verbundenen Daten und zeigt Quellen.
8. Vergleichsmodul zeigt öffentliche Wettbewerbsdaten mit Quelle und Datum.
9. Vorschläge werden als Hypothesen mit Begründung und Datenbasis gelistet.

## 4. Datenmodell (minimal)

- **SKU:** id, name, Sorte (z. B. 80% Pure Dark), Format (80 g, 1 kg), Kollektion, Status.
- **Kollektion:** id, name, SKU-Liste.
- **Markt:** Land-Code (DE, AT, CH, FR, UK, GH, CZ, SK).
- **Kampagnen-Code:** id, Kanal (Wrapper, Shelf-Talker, Influencer, Messe), Zeitraum.
- **Code (QR):** id, Ziel-Typ, SKU- oder Kollektions-Zuordnung, Status.
- **Scan-Event:** Zeitstempel, Code-ID, Land/Stadt (grob), Gerätetyp, Sprache. Keine Roh-IP speichern.
- **Feedback-Eintrag:** Zeitstempel, SKU, Kampagne, Markt, Bewertung (1–5), Geschmacksangabe, optionaler Freitext, Themen-Tags. Keine Namen, E-Mail-Adressen oder Kennungen.
- **Website-Aggregat (Connector):** Datum, SKU, Kampagne, Markt, Sitzungen, Seitenaufrufe, Video-Plays, Shop-Klicks. Nur Aggregate.
- **Agent-Antwort:** Frage, Antwort, verwendete Quellen, Stand-Datum.

## 5. Demo-Ablauf (ca. 10 Minuten)

1. **Problem (2 min):** Verpackung trägt Herkunft, die Website erzählt mehr; keine Verbindung zwischen Scan, Besuch und Kundenstimme.
2. **Live-Scan (2 min):** Gedruckten Testcode mit Handy scannen. Zeigen: Redirect, Produktseite mit Parametern, Feedback-Formular.
3. **Dashboard (3 min):** Produkt-Ansicht und Kollektions-Ansicht, Filter nach Markt und Kampagne, Feedback-Themen. Hinweis: synthetische Daten.
4. **Agent (2 min):** drei vorbereitete Fragen, z. B. "Welche Verpackung hat in Österreich die meisten Scans?" "Welche Kampagne bringt Besuche auf die Feedback-Seite?" "Welches Thema kommt im Feedback zur 92%-Verpackung am häufigsten vor?" Antworten mit Quellen.
5. **Wettbewerb und Vorschläge (1 min):** ein Vergleich mit Quelle und Datum, zwei Hypothesen.
6. **Nächste Schritte (1 min):** Fragen an fairafric und Pilotvorschlag.

## 6. Abnahmekriterien

- Scan eines Testcodes erzeugt ein Event im Dashboard innerhalb von 10 Sekunden.
- Redirect erreicht die Zielseite mit SKU- und Kampagnen-Parametern.
- Abgegebenes Feedback erscheint mit SKU, Kampagne und Markt im Dashboard.
- Dashboard zeigt Produkt- und Kollektions-Ansicht mit Markt-Filter.
- Jede Agent-Antwort nennt die verwendeten Quellen.
- Jeder Wettbewerbswert nennt Quelle und Datum.
- Alle synthetischen Daten und Hypothesen sind als solche markiert.
- Kein Video wird über Finde gehostet.
- Feedback-Formular speichert keine Namen oder Kontaktdaten.

## 7. Rechtliche und Datenschutz-Punkte (vor Pilot klären)

- **EU/UK-Tracking:** Redirect-Logs und Aggregat-Connector. Vor Pilot prüfen, ob Einwilligung nötig ist (ePrivacy, PECR). Keine Analyse-Cookies auf Finde-Seiten.
- **Kundenfeedback:** Hinweis auf Verwendung der Antworten direkt im Formular. Freitext kann personenbezogene Daten enthalten; Moderation und Löschfristen festlegen. Antworten nur anonym auswerten.
- **Ghana:** Registrierung bei der Data Protection Commission für Finde vor Pilot klären.
- **Grüne Werbeaussagen (EmpCo, ab 27.09.2026):** Auf Demo-Seiten keine Klima-Neutralitäts- oder Ausgleichs-Aussagen verwenden. Zur juristischen Prüfung an fairafric.
- **Wettbewerbsdaten:** nur öffentliche Quellen, Nutzungsbedingungen beachten, kein Scraping gegen Bedingungen.
- **Farmfotos und Personen:** nur mit schriftlicher Einwilligung und Nutzungsrechten.

## 8. Offene Fragen an fairafric

- Welche Website-Analytics nutzen Sie, und haben Sie Zugriff für einen begrenzten Connector?
- Welche Märkte und Händler sind für den Pilot am wichtigsten?
- Gibt es einen geplanten Verpackungsdruck, und wann ist die Vorlaufzeit?
- Welche Feedback-Kanäle nutzen Sie heute, und wie werden diese Antworten derzeit ausgewertet?
- Wer prüft Werbeaussagen intern?
- Welche Herkunfts- und Farmdaten dürfen öffentlich gezeigt werden?

## 9. Pilotvorschlag (nach Demo)

- Ein SKU, ein Markt, 90 Tage.
- Getrennte Codes für Wrapper und Shelf-Talker.
- Erfolg: Scan-Rate, Klicks auf Shop/Feedback, Anzahl und Qualität der Feedback-Antworten. Ziele gemeinsam mit fairafric festlegen.

## 10. Aufwand-Grobschätzung (Prototyp)

- Redirect und Scan-Log: real, Kern des Prototyps.
- Feedback-Formular je SKU: real, drei Fragen, einfache Speicherung.
- Dashboard mit Mock-Daten: real im Layout, Daten synthetisch.
- Produkt-Agent mit 2–3 Fragen über Mock-Daten: einfache Vorlage mit Quellenanzeige.
- Vergleichsmodul mit zwei öffentlichen Quellen: manuell gepflegt.
- Connector-Mock: Datenfeld im Dashboard, keine echte Anbindung.

## 11. Technischer Ansatz (Prototyp)

Details stehen in [APPROACH.md](APPROACH.md) (Englisch). Kurzfassung der Entscheidungen:

- **Stack:** wie bei Finde: Next.js 16, Tailwind, Vercel und ein eigenes Demo-Projekt in Supabase (EU-Region). Nie das Finde-Produktivsystem. Kein externes LLM, keine Analyse-Cookies, keine Tracker von Dritten.
- **Ausfallsicherheit:** Fällt die Datenbank aus, leitet der QR-Link trotzdem weiter. Das Dashboard ist mit einem Demo-Passwort geschützt, das fairafric von uns erhält. Die Demo läuft unter einer Subdomain von thefindeapp.com, mit eigener Datenbank, getrennt vom Finde-Produktivsystem. Alle Seiten sind für Suchmaschinen gesperrt (`noindex`).
- **Code-Modell:** Jeder QR-Code trägt Kampagne und Markt. Der Markt kommt aus dem Code, nicht aus einer Standortabfrage.
- **Redirect:** 302-Weiterleitung mit `?sku=&campaign=&market=`. Vorschau-Bots (z. B. WhatsApp, iMessage) werden markiert und nicht gezählt.
- **Sammel-Code:** Er führt auf eine Kollektionsseite mit `collection=`, `campaign=` und `market=`. Diese Seite listet die SKUs mit Links samt Parametern.
- **Seitenaufrufe:** Finde zählt Aufrufe von Produkt-, Kollektions- und Feedback-Seiten serverseitig, ohne Cookies. Diese Zahlen beantworten die Agent-Frage zur Feedback-Seite.
- **Feedback:** Jeder Eintrag ist als echt (live) oder synthetisch markiert. Die Geschmacksangabe ist eine feste Auswahl, und jede Auswahl gehört zu einem Thema (z. B. Bitterkeit, Verpackung, Herkunft).
- **Kennzeichnung:** Jedes Dashboard-Feld zeigt „Live" oder „Synthetische Daten".
- **Agent:** Antworten kommen aus festen Abfragen und zeigen Quellen, Fallzahlen und Stand-Datum.
- **Reset:** `npm run reset` löscht alle Daten und lädt die Seed-Daten neu. Vor jeder Demo ausführen.
