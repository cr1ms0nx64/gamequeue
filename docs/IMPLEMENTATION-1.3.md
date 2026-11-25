# GameQueue 1.3.0: Umsetzungsbericht

## Phasen und behobene Befunde

| Phase | Umsetzung | Neue Prüfungen |
| --- | --- | --- |
| 1 | Nur fehlgeschlagene Logins zählen. Benutzer/IP-Kombination und höhere Namensgrenze; rechte vertrauenswürdige Proxy-Adresse, Hop-Konfiguration und sichtbare Warnung. | IP-A/IP-B-Trennung, erfolgreicher Reset, rechter XFF-Eintrag, Namensobergrenze und ungültige Proxy-Werte. |
| 2 | Gemeinsamer AppError/toResponse-Pfad, keine internen Datenbankmeldungen, begrenzte Steam-IDs und 404 bei fehlenden Objekten. | Alle öffentlichen Fehlerarten, Zod/PostgreSQL/unerwartete Fehler, Steam-ID-Grenzen, Import-400 und Vote-404. |
| 3 | Gehashte, einmalige 24-Stunden-Reset-Links durch Admins; Notfallskript; Widerruf älterer Links und aller Sitzungen. | Ablauf, Einmaligkeit, ältere Links, Sitzungswiderruf, Nicht-Admin und Steam-only. |
| 4 | Ein Datenbank-Limiter, Aufräumen höchstens einmal pro Minute je Prozess, Kommentar-Löschen und Cursor-Paginierung, transaktionale Votes, gesperrte Nutzer aus Aggregaten, Namensprüfung, maskierte Suche und deterministische Steam-Daten. | Verfasser/Admin/Fremder, identische Kommentar-Zeitstempel mit Mikrosekunden, parallele Votes, gesperrte Votes, Namenskollisionen, Literalsuche, kommende Spiele, deutsche/englische Datumsformate. |
| 5 | Versionierte SQL-Migrationen, unveränderte 1.2.0-Baseline, Fremdschlüssel, live verknüpfte Anzeigenamen und geschützte Archive. Repository-/Auth-/Pool-Module getrennt; kein Request-DDL. | Leere DB im Integrationstest, 1.2.0-Upgrade mit Alt-IDs und Alias-Duplikaten, Erhalt und Archivzählung, gleicher zweiter Start, geänderte Prüfsumme, Cascades und sofortige Namensänderung. |
| 6 | Eigener JSON-Export und Kontolöschung, Schutz des letzten aktiven Admins, Admin-Löschung, CSP-Nonces, HTTPS-HSTS, Docker-/Compose-Healthchecks und Backup-Anleitung. | Export ohne Passwort-Hashes, Origin, Bestätigung/Passwort, letzte-Admin-Sperre, sämtliche referenzierten Daten, verbleibende Spiele und zugeordnete Archive, Nonces auf ausgelieferten Skripten und neue Nonce je Antwort. |
| 7 | ESLint ohne Warnungen, Laufzeit-Audit, Dependabot, feste Action-SHAs, separater Docker-Build, Integration unter node:test und Release-Eintrag 1.3.0. | Alle bisherigen Assertions bleiben im sequenziellen End-to-End-Ablauf erhalten; zusätzliche Lint-/Audit-/Container-Prüfungen. |

Die vorhandenen scrypt-Hashes, gehashten Sitzungs-/Einladungs-Tokens, Origin-Prüfungen, Advisory Locks für Setup und Admin-Aktionen, letzte-Admin-Sperre, Steam-OpenID-Prüfungen und Icon-Validierung bleiben erhalten. Ranking, Entscheidungslogik und Admin-Bewertung wurden nicht verändert.

## Testumfang

Vorher: fünf Unit-Tests und **77 ausgeführte Integrationsprüfungen**. Nachher: **zwölf Unit-Tests und 239 Integrationsprüfungen**, zusätzlich ein eigenständiger Upgrade-Test. Die 239 Prüfungen laufen in einem sequenziellen `node:test`-Test, weil Setup, Einladungen, Sitzungen und Folgeaktionen denselben Zustand der frischen Testinstallation verwenden. Die Assertions wurden nicht durch eine bloße Erfolgsmeldung ersetzt.

Die ersten sechs Phasen wurden jeweils mit `npm test`, `npm run typecheck`, `npm run build` und `npm run test:integration` erfolgreich in GitHub Actions geprüft. Seit Phase 5 wird zusätzlich der Upgrade-Test ausgeführt. Der finale Workflow prüft außerdem Linting ohne Warnungen, `npm audit --omit=dev --audit-level=high` und den separaten Docker-Build ohne Push. Maßgeblich ist der Workflow-Status am Pull Request für dessen aktuellen Commit.

Der Upgrade-Test erstellt nur mit `TEST_DATABASE_DISPOSABLE=1` eine eigene temporäre Datenbank. Er löscht ausschließlich diese eindeutig benannte Testdatenbank. Die Integrationssuite verweigert die Verwendung einer bereits eingerichteten Installation. Es wurden keine produktiven Nutzerdaten verändert. Nach dem Docker-Build prüft die CI im fertigen Image außerdem die nativen TypeScript-CLI-Imports und das Vorhandensein aller Migrationen, ohne eine Netzwerkverbindung aufzubauen.

## Konfiguration und Upgrade

| Variable | Bedeutung |
| --- | --- |
| `TRUST_PROXY` | Standard weiterhin `false`. Hinter einem echten Reverse Proxy zwingend `true`; direkte Zugriffe auf den App-Port sperren. |
| `TRUSTED_PROXY_HOPS` | Neu, Standard `1`. Von rechts gezählte, kontrollierte Proxy-Hops. Ungültige Konfiguration oder Adressen ergeben `unknown`. |
| `STEAM_REFRESH_DELAY_MS` | Neu, Standard `1500`, mindestens `1000`. Gilt ausschließlich für das manuelle/Cron-Skript, nicht für einen Webserver-Hintergrundjob. |
| `TEST_DATABASE_DISPOSABLE` | Bestehend. Explizite Freigabe für Tests; die Upgrade-Testrolle benötigt zusätzlich CREATEDB in der Wegwerf-Umgebung. Produktionsrollen benötigen diese Berechtigung nicht für normale App-Anfragen. |

Vor einem Upgrade von **1.2.0** die alte App anhalten und mit `pg_dump -Fc` sichern. Die bisherige Version darf während der Migration nicht weiterlaufen. Erst danach neuen Quellstand installieren bzw. Image bauen und starten. `scripts/start.mjs` migriert vor dem Standalone-Server; ein Fehler verhindert den Start. `npm run migrate` ist für manuelle Ausführung vorhanden, `npm run dev` migriert ebenfalls vor dem Start.

`0001_baseline.sql` entspricht dem ursprünglichen Schema mit IF NOT EXISTS. `0002_user_references.sql` ordnet nur vorhandene `local:N`-Konten zu. Nicht zuordenbare Votes, Kommentare, Vorschläge und unbekannte Ersteller bleiben vollständig in `legacy_orphans`. Bei mehrfachen Text-IDs für dieselbe lokale Identität bleibt die kanonische Referenz aktiv; weitere Datensätze werden archiviert. Spiele bleiben erhalten. `0003_recovery_metadata_names.sql` ergänzt Reset-Daten, kommende Spiele und eindeutige Anzeigenamen. Bei alten Namenskollisionen wird das bisherige Profil archiviert und ein eindeutiger Ersatz-Anzeigename vergeben; Login-Namen und Anmeldedaten bleiben unverändert.

Archivprüfung:

```sql
SELECT source_table, reason, COUNT(*) FROM legacy_orphans GROUP BY source_table, reason;
SELECT id, source_table, legacy_key, data FROM legacy_orphans ORDER BY id;
```

Archive und Backups enthalten personenbezogene Daten und teilweise alte Passwort-Hashes. Sie sind vertraulich zu behandeln. Unbekannte Hub-IDs werden nicht geraten. Kontoexporte enthalten keine Passwort-Hashes; eine Kontolöschung entfernt auch zugeordnete Alt-Archive. Ausführliche Compose-Befehle für Backup und Restore stehen in README.

## Entscheidungen

- Login: 10 Fehler je Name/IP, 50 je Name, 60 je IP in 15 Minuten. Die höhere Namensgrenze ist der ausdrücklich verlangte Schutz gegen verteilte Angriffe; sie ersetzt nicht die IP-Trennung.
- Ohne vertrauenswürdigen Proxy stellt ein Fetch-Request keine gesicherte Socket-IP bereit. Deshalb bleibt dort ein gemeinsamer Client-Schlüssel; Header werden nicht ungeprüft vertraut. Warnung und Admin-Hinweis machen diese Betriebskonfiguration sichtbar.
- Migrationen laufen über ein Startskript statt Next-Instrumentation. Dadurch benötigt `next build` keine Datenbank, und Docker sowie `npm start` verwenden denselben klaren Startweg. SQL, CLI-Skripte und die benötigten kleinen TypeScript-Quellen werden im Standalone-Paket mitgeliefert. Native Node-24-Typentfernung und ein begrenzter Alias-Resolver vermeiden neue Laufzeitpakete. Die reine AppError-Logik liegt getrennt von NextResponse in `app-error.ts`, damit die CLI-Skripte keine im Standalone-Image nicht benötigten HTTP-Framework-Dateien laden.
- Der Migrationsrunner verwendet eine eigene Session-Sperre; jede Migration hat eine eigene Transaktion und eine SHA-256-Prüfsumme. Die bestehende transaktionale Auth-/Admin-Sperre bleibt getrennt erhalten.
- Kommentar-Cursor enthalten den PostgreSQL-Zeitpunkt mit Mikrosekunden und die ID. Das vermeidet Auslassungen bei gleichen Zeitstempeln und beim Konvertieren in JavaScript-Date-Werte.
- `coming_soon` stammt bei neuen/aktualisierten Imports vom Steam-Flag. Historische Werte werden aus den bekannten Ankündigungstexten abgeleitet. Unvollständige Datumsangaben wie Quartale oder reine Jahreszahlen werden nicht als konkrete Tage geraten.
- CSP verwendet die Next-16-Konvention `src/proxy.ts`. Das App-Router-Layout rendert bereits dynamisch. Die Nonce wird in Request- und Response-CSP gesetzt; produktive Skripte benötigen kein `unsafe-inline`. Styles behalten zur Wahrung des Designs ihre bisherige Inline-Freigabe. HSTS wird im Proxy anhand der Laufzeit-PUBLIC_ORIGIN gesetzt, auch für API-Antworten. Dadurch funktioniert es ebenfalls bei einem ohne Produktions-.env gebauten Docker-Image. Ein eigener Unit-Test prüft die Laufzeitentscheidung und unverändertes API-Icon-Caching.
- Die zusammengeführten CSS-Dateien behalten ihre Reihenfolge. Next Image läuft für die vorhandenen Bilder `unoptimized`, damit keine neue Bildproxy-/Domain-Konfiguration und keine andere Bildquelle entsteht. Mobiles Menü und Fokus-Rückgabe wurden für die aktiven React-Lintregeln korrigiert; Regeln wurden nicht pauschal deaktiviert.

Referenzen für die Framework-Konvention: [Next CSP](https://nextjs.org/docs/app/guides/content-security-policy), [Next Proxy](https://nextjs.org/docs/app/api-reference/file-conventions/proxy). Der installierte Next-Stand im Projekt ist 16.4.5; Build und HTML-Integration prüfen die tatsächliche Implementierung.

## Manuelle Abnahme und Grenzen

- Steam-Anmeldung mit echtem Konto, echter HTTPS-Origin, Browser-State und Provider-Rückkehr.
- Betrieb hinter dem tatsächlich eingesetzten Reverse Proxy mit `TRUST_PROXY=true`, korrekt gesetztem X-Forwarded-For und gesperrtem Direktzugriff. Mehrstufige Ketten ausdrücklich prüfen.
- Upgrade einer echten 1.2.0-Sicherung in einer getrennten Umgebung, Archivprüfung sowie Backup-/Restore-Probe vor Produktivumstellung.
- Docker-Compose-Start auf dem Zielsystem mit echtem Volume und Healthcheck. Der automatisierte Docker-Build allein beweist noch keinen erfolgreichen Produktionsbetrieb.
- Browser-Bedienung unter CSP: Anmeldung/Logout, mobile Navigation und Fokus, Bilder, Kommentar-Nachladen und Löschbestätigungen. Die automatischen HTML-Prüfungen beweisen passende Skript-Nonces, ersetzen aber keinen vollständigen visuellen Browser-Test.
- Sichere Weitergabe und Verwendung eines Reset-Links sowie das Notfallskript am eigenen Admin-Konto.

Es gibt weiterhin keine E-Mail-Wiederherstellung und keine lokale MFA; beides war nicht Teil dieses Auftrags. Es wurden keine neuen Laufzeit-Abhängigkeiten eingeführt. Unbekannte Hub-Konten werden geschützt archiviert und erfordern eine manuelle, geprüfte Zuordnung statt einer automatischen Verknüpfung.
