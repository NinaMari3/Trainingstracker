// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";

let App;
let suggest;
let effMax;
let reminders;
beforeAll(async () => {
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  window.storage = {
    async get(k) { const v = localStorage.getItem(k); if (v === null) throw new Error("nf"); return { key: k, value: v }; },
    async set(k, v) { localStorage.setItem(k, v); return { key: k, value: v }; },
    async delete(k) { localStorage.removeItem(k); return { key: k, deleted: true }; },
  };
  const mod = await import("../src/App.jsx");
  App = mod.default;
  suggest = mod.nextTargetSuggestion;
  effMax = mod.effectiveMax;
  reminders = mod.maxReminders;
});
beforeEach(() => localStorage.clear());
afterEach(cleanup);

async function openApp() {
  render(<App />);
  await waitFor(() => expect(screen.getByText("Progression Tracker")).toBeTruthy());
}
const savedData = () => JSON.parse(localStorage.getItem("training-data"));

describe("Tracker: Grundfunktionen", () => {
  it("Startdaten, Log, Speichern mit Fokus, Backup-Buttons", async () => {
    await openApp();
    fireEvent.click(screen.getByText("Log"));
    await waitFor(() => expect(screen.getAllByText("Calisthenics A").length).toBe(2));
    fireEvent.click(screen.getByText("Einheit loggen"));
    await waitFor(() => expect(screen.getByText("Vorschlag: Calisthenics A – Muscle-up & Push")).toBeTruthy());
    fireEvent.click(screen.getByText("Alle übernehmen"));
    fireEvent.click(screen.getByText("Einheit speichern"));
    await waitFor(() => {
      expect(savedData().sessions.length).toBe(3);
      expect(savedData().sessions[2].focus).toBe("a");
    });
    fireEvent.click(screen.getByText("Export"));
    await waitFor(() => expect(screen.getByText("Backup speichern")).toBeTruthy());
  });

  it("Calli B loggen hakt nur Calli B ab (Sa zeigt 1/2), Calli A bleibt offen", async () => {
    await openApp();
    fireEvent.click(screen.getByText("Einheit loggen"));
    fireEvent.click(screen.getByText("Calisthenics B (Sa)"));
    await waitFor(() => expect(screen.getByText(/Vorschlag: Calisthenics B/)).toBeTruthy());
    fireEvent.click(screen.getByText("Alle übernehmen"));
    fireEvent.click(screen.getByText("Einheit speichern"));
    await waitFor(() => expect(savedData().sessions[2].focus).toBe("b"));
    await waitFor(() => expect(screen.getByText("1/2")).toBeTruthy());
    expect(screen.getByText("Calli A").parentElement.querySelector("svg.lucide-check")).toBeNull();
  });

  it("Übungen aus früherer Einheit übernehmen, ohne den Fokus zu ändern", async () => {
    await openApp();
    fireEvent.click(screen.getByText("Einheit loggen"));
    fireEvent.click(screen.getByText("Calisthenics B (Sa)"));
    fireEvent.click(await screen.findByText(/Letzte: Calisthenics A/));
    await waitFor(() => expect(screen.getByDisplayValue("Wide Pull-ups")).toBeTruthy());
    expect(screen.getByDisplayValue("Parallette Push-ups")).toBeTruthy();
    fireEvent.click(screen.getByText("Einheit speichern"));
    await waitFor(() => {
      const last = savedData().sessions[2];
      expect(last.focus).toBe("b");
      expect(last.exercises.length).toBeGreaterThan(3);
    });
  });

  it("Beine: Donnerstag ohne Goblet Squat bei 'Alle übernehmen', Samstag mit Bulgarian Split Squat", async () => {
    await openApp();
    fireEvent.click(screen.getByText("Einheit loggen"));
    fireEvent.click(screen.getByText("Beine"));
    fireEvent.click(screen.getByText("Beine Samstag"));
    await waitFor(() => expect(screen.getByText("Vorschlag: Samstag – Beine & Gesäß")).toBeTruthy());
    expect(screen.getByText(/Bulgarian Split Squat/)).toBeTruthy();
    fireEvent.click(screen.getByText("Beintag (Do)"));
    await waitFor(() => expect(screen.getByText("Vorschlag: Beintag – Kraft & Muskelaufbau")).toBeTruthy());
    fireEvent.click(screen.getByText("Alle übernehmen"));
    await waitFor(() => expect(screen.getByDisplayValue("Leg Press")).toBeTruthy());
    expect(screen.queryByDisplayValue("Goblet Squat")).toBeNull();
    expect(screen.getByDisplayValue("Romanian Deadlift")).toBeTruthy();
  });

  it("gelbes Band steht zur Auswahl", async () => {
    await openApp();
    fireEvent.click(screen.getByText("Einheit loggen"));
    fireEvent.click(screen.getByText("Alle übernehmen"));
    await waitFor(() => expect(screen.getAllByRole("option", { name: "Gelbes Band" }).length).toBeGreaterThan(0));
  });

  it("Plan-Tab zeigt Standardplan im Detail", async () => {
    await openApp();
    fireEvent.click(screen.getByText("Plan & Skills"));
    await waitFor(() => expect(screen.getByText("Standardplan im Detail")).toBeTruthy());
    expect(screen.getByText(/Mittwoch: Calisthenics A – Muscle-up & Push/)).toBeTruthy();
    expect(screen.getAllByText("Negative Muscle-ups").length).toBeGreaterThan(0);
  });
});

describe("Tracker: neue Funktionen", () => {
  it("Reihenfolge der Übungen lässt sich verschieben", async () => {
    await openApp();
    fireEvent.click(screen.getByText("Einheit loggen"));
    fireEvent.click(screen.getByText("Alle übernehmen"));
    const names = () => screen.getAllByPlaceholderText("Übungsname (z.B. Dips)").map(i => i.value);
    await waitFor(() => expect(names().slice(0, 2)).toEqual(["Handstand", "Explosive High Pulls"]));
    fireEvent.click(screen.getAllByLabelText("Übung nach unten")[0]);
    await waitFor(() => expect(names().slice(0, 2)).toEqual(["Explosive High Pulls", "Handstand"]));
    fireEvent.click(screen.getAllByLabelText("Übung nach oben")[1]);
    await waitFor(() => expect(names().slice(0, 2)).toEqual(["Handstand", "Explosive High Pulls"]));
  });

  it("Satz erledigt startet Pausen-Timer und Stoppuhr; Pause 0 startet keinen Timer", async () => {
    await openApp();
    fireEvent.click(screen.getByText("Einheit loggen"));
    fireEvent.click(screen.getByText("Alle übernehmen"));
    expect(screen.queryByTestId("rest-countdown")).toBeNull();
    fireEvent.click(screen.getAllByLabelText("Satz erledigt")[0]);
    await waitFor(() => expect(screen.getByTestId("rest-countdown")).toBeTruthy());
    expect(screen.getByText(/Satzpause · Explosive High Pulls/)).toBeTruthy();
    expect(screen.getByTestId("rest-countdown").textContent).toMatch(/^2:(29|30)$/);
    expect(screen.getByText("Stopp")).toBeTruthy();
    fireEvent.click(screen.getByText("+15"));
    expect(screen.getByTestId("rest-countdown").textContent).toMatch(/^2:(44|45)$/);
    fireEvent.click(screen.getByLabelText("Pause überspringen"));
    await waitFor(() => expect(screen.queryByTestId("rest-countdown")).toBeNull());
    fireEvent.change(screen.getAllByLabelText("Pause in Sekunden")[1], { target: { value: "0" } });
    fireEvent.click(screen.getAllByLabelText("Satz erledigt")[1]);
    await new Promise(r => setTimeout(r, 60));
    expect(screen.queryByTestId("rest-countdown")).toBeNull();
  });

  it("Notiz, Griff, Satzart, Pause und Dauer werden gespeichert; Notiz/Griff/Pause erscheinen beim nächsten Mal wieder", async () => {
    await openApp();
    fireEvent.click(screen.getByText("Einheit loggen"));
    fireEvent.click(screen.getByText("Alle übernehmen"));
    fireEvent.change(screen.getAllByLabelText("Notiz zur Übung")[1], { target: { value: "Gewicht erhöhen" } });
    fireEvent.change(screen.getAllByLabelText("Griffart")[1], { target: { value: "Monkey Grip" } });
    fireEvent.change(screen.getAllByLabelText("Pause in Sekunden")[1], { target: { value: "100" } });
    fireEvent.change(screen.getAllByPlaceholderText(/Reps \(Ziel 3-5\)/)[0], { target: { value: "5" } });
    fireEvent.change(screen.getAllByLabelText("Satzart")[0], { target: { value: "Aufwärmen" } });
    fireEvent.change(screen.getByText("Dauer (min)").nextElementSibling, { target: { value: "75" } });
    fireEvent.click(screen.getByText("Einheit speichern"));
    await waitFor(() => expect(savedData().sessions.length).toBe(3));
    const s = savedData().sessions[2];
    expect(s.duration).toBe(75);
    const ex = s.exercises.find(e => e.name === "Explosive High Pulls");
    expect(ex.note).toBe("Gewicht erhöhen");
    expect(ex.grip).toBe("Monkey Grip");
    expect(ex.restSec).toBe(100);
    expect(ex.sets[0].setType).toBe("Aufwärmen");
    expect(ex.sets[1].setType).toBe("Normal");

    // Log zeigt Notiz und Griff
    fireEvent.click(screen.getByText("Log"));
    await waitFor(() => expect(screen.getByText(/Notiz: Gewicht erhöhen/)).toBeTruthy());

    // Beim nächsten Mal wieder da
    fireEvent.click(screen.getByText("Dashboard"));
    fireEvent.click(screen.getByText("Einheit loggen"));
    fireEvent.click((await screen.findAllByText(/^Explosive High Pulls/)).find(el => el.closest("button")));
    await waitFor(() => expect(screen.getByDisplayValue("Gewicht erhöhen")).toBeTruthy());
    expect(screen.getByDisplayValue("Monkey Grip")).toBeTruthy();
    expect(screen.getByDisplayValue("100")).toBeTruthy();
  });

  it("Angefangene Einheit wird als Entwurf gesichert und lässt sich fortsetzen oder verwerfen", async () => {
    await openApp();
    fireEvent.click(screen.getByText("Einheit loggen"));
    fireEvent.click(screen.getByText("Alle übernehmen"));
    await waitFor(() => expect(localStorage.getItem("training-draft")).toBeTruthy());
    const title = screen.getByText("Einheit loggen", { selector: "div.sg" });
    fireEvent.click(title.parentElement.querySelector("button"));
    await waitFor(() => expect(screen.getByText("Einheit fortsetzen")).toBeTruthy());
    fireEvent.click(screen.getByText("Einheit fortsetzen"));
    await waitFor(() => expect(screen.getByText("Angefangene Einheit wiederhergestellt.")).toBeTruthy());
    expect(screen.getByDisplayValue("Explosive High Pulls")).toBeTruthy();
    fireEvent.click(screen.getByText("Verwerfen"));
    await waitFor(() => expect(localStorage.getItem("training-draft")).toBeNull());
    expect(screen.queryByDisplayValue("Explosive High Pulls")).toBeNull();
  });

  it("Speichern räumt den Entwurf auf", async () => {
    await openApp();
    fireEvent.click(screen.getByText("Einheit loggen"));
    fireEvent.click(screen.getByText("Alle übernehmen"));
    await waitFor(() => expect(localStorage.getItem("training-draft")).toBeTruthy());
    fireEvent.click(screen.getByText("Einheit speichern"));
    await waitFor(() => expect(savedData().sessions.length).toBe(3));
    await new Promise(r => setTimeout(r, 600));
    expect(localStorage.getItem("training-draft")).toBeNull();
    expect(screen.getByText("Einheit loggen")).toBeTruthy();
  });
});

describe("Steigerungs-Vorschläge (doppelte Progression)", () => {
  const mk = (date, name, sets, extra = {}) => ({ date, type: "legs", focus: "do", exercises: [{ name, ...extra, sets }] });
  const rep = (n, reps, weight, rir, more = {}) => Array.from({ length: n }, () => ({ reps, weight, rir, ...more }));

  it("oberes Ende erreicht: Gewicht erhöhen, wieder unten im Bereich starten", () => {
    const sessions = [mk("2026-10-01", "Hip Thrust", rep(4, 10, 110, 2), { target: "8-10" })];
    expect(suggest(sessions, "Hip Thrust", "do")).toMatch(/115 kg erhöhen und wieder 8 Wdh/);
  });
  it("im Bereich: gleiches Gewicht, eine Wiederholung mehr auf dem schwächsten Satz", () => {
    const sets = [{ reps: 9, weight: 110, rir: 2 }, { reps: 8, weight: 110, rir: 2 }, { reps: 8, weight: 110, rir: 2 }, { reps: 8, weight: 110, rir: 1 }];
    const sessions = [mk("2026-10-01", "Hip Thrust", sets, { target: "8-10" })];
    expect(suggest(sessions, "Hip Thrust", "do")).toMatch(/110 kg halten, 9 Wdh/);
  });
  it("Aufwärmsätze und Dropsets zählen nicht", () => {
    const sets = [{ reps: 12, weight: 40, rir: 5, setType: "Aufwärmen" }, ...rep(3, 10, 110, 2), { reps: 20, weight: 60, rir: 0, setType: "Dropset" }];
    const sessions = [mk("2026-10-01", "Hip Thrust", sets, { target: "8-10" })];
    expect(suggest(sessions, "Hip Thrust", "do")).toMatch(/115 kg erhöhen/);
  });
  it("zu leicht (viele Wiederholungen übrig): Gewicht rauf", () => {
    const sessions = [mk("2026-10-01", "Bulgarian Split Squat", rep(3, 9, 20, 4), { target: "8-12" })];
    expect(suggest(sessions, "Bulgarian Split Squat", "do")).toMatch(/zu leicht.*22,5 kg/);
  });
  it("unter dem Bereich: erst den Bereich füllen", () => {
    const sessions = [mk("2026-10-01", "Hip Thrust", rep(3, 5, 110, 0), { target: "8-10" })];
    expect(suggest(sessions, "Hip Thrust", "do")).toMatch(/mindestens 8 Wdh bringen \(zuletzt 5\)/);
  });
  it("Band: bei oberem Ende zum nächst leichteren Band wechseln", () => {
    const sets = [8, 8, 7, 6].map(r => ({ reps: r, weight: 0, rir: 2, assist: "Schwarzes Band" }));
    const sessions = [mk("2026-10-01", "Explosive High Pulls", sets)];
    expect(suggest(sessions, "Explosive High Pulls", "do")).toMatch(/dem roten Band versuchen und wieder 3 Wdh/);
  });
  it("Körpergewicht am oberen Ende: Zusatzgewicht oder schwerere Variante", () => {
    const sessions = [mk("2026-10-01", "Toes-to-Bar", rep(3, 10, 0, 2))];
    expect(suggest(sessions, "Toes-to-Bar", "do")).toMatch(/Zusatzgewicht .* schwerere Variante und starte wieder bei 8/);
  });
  it("Maschinen-Unterstützung: weniger kg ist besser", () => {
    const sets = [{ reps: 8, weight: 10, rir: 2, weightMode: "assist" }, { reps: 8, weight: 10, rir: 2, weightMode: "assist" }, { reps: 6, weight: 5, rir: 1, weightMode: "assist" }, { reps: 5, weight: 5, rir: 1, weightMode: "assist" }];
    const sessions = [mk("2026-10-01", "Dips", sets)];
    expect(suggest(sessions, "Dips", "do")).toMatch(/5 kg Unterstützung halten.*mindestens 8 Wdh bringen \(zuletzt 5\)/);
    const top = [mk("2026-10-02", "Dips", rep(3, 12, 10, 2, { weightMode: "assist" }))];
    expect(suggest(top, "Dips", "do")).toMatch(/nur 5 kg Unterstützung/);
  });
  it("Halten: ca. +10 %", () => {
    const sessions = [{ date: "2026-10-01", type: "calisthenics", focus: "a", exercises: [{ name: "Handstand", holdSeconds: 20, sets: [] }] }];
    expect(suggest(sessions, "Handstand", "a")).toMatch(/22 s halten/);
  });
  it("drei Einheiten ohne Fortschritt: Hinweis auf Erholung und Deload", () => {
    const sessions = ["2026-09-10", "2026-09-17", "2026-09-24"].map(d => mk(d, "Hip Thrust", rep(3, 8, 100, 2), { target: "8-12" }));
    expect(suggest(sessions, "Hip Thrust", "do")).toMatch(/kein Fortschritt.*Deload/);
  });
});

describe("Runde 3: Vorbelegung, Fokus, Max", () => {
  it("Vorbelegte Werte bleiben erhalten, Aufwärmsatz füllt nichts, 'Letztes Mal' bleibt sichtbar", async () => {
    await openApp();
    fireEvent.click(screen.getByText("Einheit loggen"));
    fireEvent.click(screen.getByText("Alle übernehmen"));
    const reps = () => screen.getAllByPlaceholderText(/^Reps/).map(i => i.value);
    const kgs = () => screen.getAllByPlaceholderText("kg").map(i => i.value);
    await waitFor(() => expect(reps().slice(0, 4)).toEqual(["8", "8", "7", "6"]));
    expect(screen.getAllByText(/Letztes Mal: 8 \(2 RIR\) \[Schwarzes Band\]/).length).toBe(2);

    // Aufwärmsatz bei Explosive High Pulls (2. Übung) einfügen und ausfüllen
    fireEvent.click(screen.getAllByText("+ Aufwärmsatz")[1]);
    await waitFor(() => expect(reps().slice(0, 5)).toEqual(["", "8", "8", "7", "6"]));
    fireEvent.change(screen.getAllByPlaceholderText(/^Reps/)[0], { target: { value: "5" } });
    fireEvent.change(screen.getAllByPlaceholderText("kg")[0], { target: { value: "40" } });
    expect(reps().slice(0, 5)).toEqual(["5", "8", "8", "7", "6"]);
    expect(kgs().slice(0, 5)).toEqual(["40", "", "", "", ""]);

    // Auch ein Arbeitssatz überschreibt die vorbelegten Folgesätze nicht
    fireEvent.change(screen.getAllByPlaceholderText(/^Reps/)[1], { target: { value: "9" } });
    expect(reps().slice(0, 5)).toEqual(["5", "9", "8", "7", "6"]);
    // 'Letztes Mal' passt weiter zu den Arbeitssätzen (Aufwärmsatz hat keine Vorlage)
    expect(screen.getAllByText(/Letztes Mal: 8 \(2 RIR\) \[Schwarzes Band\]/).length).toBe(2);
  });

  it("neue Übung ohne Historie: Werte laufen weiter nach unten, bis man einen Satz selbst ändert", async () => {
    await openApp();
    fireEvent.click(screen.getByText("Einheit loggen"));
    fireEvent.click(screen.getByText("+ Übung hinzufügen"));
    fireEvent.change(screen.getByPlaceholderText("Übungsname (z.B. Dips)"), { target: { value: "Testübung XY" } });
    fireEvent.click(screen.getByText("+ Satz"));
    fireEvent.click(screen.getByText("+ Satz"));
    const reps = () => screen.getAllByPlaceholderText("Reps").map(i => i.value);
    fireEvent.change(screen.getAllByPlaceholderText("Reps")[0], { target: { value: "10" } });
    expect(reps()).toEqual(["10", "10", "10"]);
    fireEvent.change(screen.getAllByPlaceholderText("Reps")[1], { target: { value: "12" } });
    expect(reps()).toEqual(["10", "12", "12"]);
  });

  it("Übungen aus dem anderen Plan hinzufügen ändert den Fokus nicht", async () => {
    await openApp();
    fireEvent.click(screen.getByText("Einheit loggen"));
    fireEvent.click(screen.getByText("Calisthenics B (Sa)"));
    fireEvent.click(screen.getByText("Alle übernehmen"));
    fireEvent.click(screen.getByText(/Übungen aus „Calisthenics A/));
    fireEvent.click(await screen.findByText(/^Negative Muscle-ups/));
    await waitFor(() => expect(screen.getByDisplayValue("Negative Muscle-ups")).toBeTruthy());
    expect(screen.getByText("Calisthenics B", { selector: "b" })).toBeTruthy();
    fireEvent.click(screen.getByText("Einheit speichern"));
    await waitFor(() => {
      const last = savedData().sessions[2];
      expect(last.focus).toBe("b");
      expect(last.exercises.some(e => e.name === "Negative Muscle-ups")).toBe(true);
    });
  });

  it("Max pro Übung: speichern, im Dashboard zeigen, beim nächsten Mal wieder anzeigen", async () => {
    await openApp();
    fireEvent.click(screen.getByText("Einheit loggen"));
    fireEvent.click(screen.getByText("Alle übernehmen"));
    fireEvent.change(screen.getAllByLabelText("Maximum dieser Übung")[1], { target: { value: "35 Wdh" } });
    fireEvent.click(screen.getByText("Einheit speichern"));
    await waitFor(() => expect(savedData().sessions.length).toBe(3));
    expect(savedData().sessions[2].exercises.find(e => e.name === "Explosive High Pulls").max).toBe("35 Wdh");
    await waitFor(() => expect(screen.getByText("Meine Maxima")).toBeTruthy());
    expect(screen.getByText("35 Wdh")).toBeTruthy();
    fireEvent.click(screen.getByText("Einheit loggen"));
    const chip = (await screen.findAllByText(/^Explosive High Pulls/)).find(el => el.closest("button"));
    fireEvent.click(chip);
    await waitFor(() => expect(screen.getByDisplayValue("35 Wdh")).toBeTruthy());
  });
});

describe("Runde 4: Einklappen und eigene Pläne", () => {
  it("Übung klappt ein, wenn alle Sätze erledigt sind, und lässt sich auch von Hand ein- und ausklappen", async () => {
    await openApp();
    fireEvent.click(screen.getByText("Einheit loggen"));
    fireEvent.click(screen.getByText("Alle übernehmen"));
    expect(screen.queryAllByLabelText("Übung aufklappen").length).toBe(0);
    for (let i = 0; i < 4; i++) fireEvent.click(screen.getAllByLabelText("Satz erledigt")[0 + i]);
    await waitFor(() => expect(screen.getAllByLabelText("Übung aufklappen").length).toBe(1));
    expect(screen.queryByDisplayValue("Explosive High Pulls")).toBeNull();
    expect(screen.getByText(/4\/4 Sätze/)).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Übung aufklappen"));
    await waitFor(() => expect(screen.getByDisplayValue("Explosive High Pulls")).toBeTruthy());
    // von Hand einklappen (Handstand)
    fireEvent.click(screen.getAllByLabelText("Übung einklappen")[0]);
    await waitFor(() => expect(screen.getAllByLabelText("Übung aufklappen").length).toBe(1));
    expect(screen.queryByDisplayValue("Handstand")).toBeNull();
  });

  it("Plan-Editor: Standardplan kopieren (ohne Alternativen) und Fehlermeldungen", async () => {
    await openApp();
    fireEvent.click(screen.getByText("Plan & Skills"));
    fireEvent.click(await screen.findByText("Neuen Plan erstellen"));
    fireEvent.click(screen.getByText("Plan speichern"));
    await waitFor(() => expect(screen.getByText("Gib dem Plan einen Namen.")).toBeTruthy());
    fireEvent.change(screen.getByLabelText("Planname"), { target: { value: "Nur Name" } });
    fireEvent.click(screen.getByText("Plan speichern"));
    await waitFor(() => expect(screen.getByText("Füge mindestens eine Übung hinzu.")).toBeTruthy());
    fireEvent.click(screen.getAllByText("Beintag").find(el => el.closest("button")));
    await waitFor(() => expect(screen.getByDisplayValue("Leg Press")).toBeTruthy());
    expect(screen.queryByDisplayValue("Goblet Squat")).toBeNull();
    expect(screen.getByDisplayValue("Hip Thrust")).toBeTruthy();
  });

  it("Eigenen Plan erstellen, starten (Werte werden übernommen), speichern, im Formular wieder wählen, löschen", async () => {
    window.confirm = () => true;
    await openApp();
    fireEvent.click(screen.getByText("Plan & Skills"));
    fireEvent.click(await screen.findByText("Neuen Plan erstellen"));
    fireEvent.change(screen.getByLabelText("Planname"), { target: { value: "Oberkörper Test" } });
    fireEvent.change(screen.getByLabelText("Art des Plans"), { target: { value: "strength" } });
    fireEvent.click(screen.getByText("+ Übung hinzufügen"));
    fireEvent.change(screen.getAllByPlaceholderText("Übungsname")[0], { target: { value: "Wide Pull-ups" } });
    fireEvent.click(screen.getByText("+ Übung hinzufügen"));
    fireEvent.change(screen.getAllByPlaceholderText("Übungsname")[1], { target: { value: "Neue Übung XY" } });
    fireEvent.change(screen.getAllByLabelText("Ziel-Wiederholungen im Plan")[1], { target: { value: "8-12" } });
    fireEvent.click(screen.getByText("Plan speichern"));
    await waitFor(() => expect(savedData().plans.length).toBe(1));
    expect(savedData().plans[0].type).toBe("strength");
    expect(savedData().plans[0].exercises.map(e => e.name)).toEqual(["Wide Pull-ups", "Neue Übung XY"]);

    fireEvent.click(await screen.findByText("Training starten"));
    await waitFor(() => expect(screen.getByDisplayValue("Wide Pull-ups")).toBeTruthy());
    const reps = () => screen.getAllByPlaceholderText(/^Reps/).map(i => i.value);
    expect(reps().slice(0, 4)).toEqual(["6", "5", "5", "5"]); // aktuelle Werte aus der letzten Einheit
    expect(screen.getByDisplayValue("Neue Übung XY")).toBeTruthy();
    expect(screen.getByText("Oberkörper Test", { selector: "b" })).toBeTruthy();
    fireEvent.click(screen.getByText("Einheit speichern"));
    await waitFor(() => expect(savedData().sessions.length).toBe(3));
    const last = savedData().sessions[2];
    expect(last.type).toBe("strength");
    expect(last.planName).toBe("Oberkörper Test");
    expect(last.focus).toBe("plan:" + savedData().plans[0].id);

    // Log zeigt den Plan-Namen
    fireEvent.click(screen.getByText("Log"));
    await waitFor(() => expect(screen.getAllByText("Oberkörper Test").length).toBeGreaterThan(0));

    // Im Formular über die Plan-Chips wählen
    fireEvent.click(screen.getByText("Dashboard"));
    fireEvent.click(screen.getByText("Einheit loggen"));
    fireEvent.click(await screen.findByText("Oberkörper Test", { selector: "button" }));
    await waitFor(() => expect(screen.getByDisplayValue("Wide Pull-ups")).toBeTruthy());
    expect(reps().slice(0, 4)).toEqual(["6", "5", "5", "5"]);
    expect(screen.queryByText("Calisthenics A (Mi)")).toBeNull(); // Fokus-Umschalter ist bei Plan weg
    const title = screen.getByText("Einheit loggen", { selector: "div.sg" });
    fireEvent.click(title.parentElement.querySelector("button"));

    // Plan löschen
    fireEvent.click(screen.getByText("Plan & Skills"));
    fireEvent.click(await screen.findByText("Löschen"));
    await waitFor(() => expect(savedData().plans.length).toBe(0));
    expect(savedData().sessions.length).toBe(3);
  });

  it("Plan starten verwirft auf Nachfrage einen angefangenen Entwurf", async () => {
    window.confirm = () => true;
    await openApp();
    fireEvent.click(screen.getByText("Plan & Skills"));
    fireEvent.click(await screen.findByText("Neuen Plan erstellen"));
    fireEvent.change(screen.getByLabelText("Planname"), { target: { value: "Mini" } });
    fireEvent.click(screen.getByText("Calisthenics B"));
    fireEvent.click(screen.getByText("Plan speichern"));
    await waitFor(() => expect(savedData().plans.length).toBe(1));
    // Entwurf anlegen
    fireEvent.click(screen.getByText("Einheit loggen"));
    fireEvent.click(screen.getByText("Alle übernehmen"));
    await waitFor(() => expect(localStorage.getItem("training-draft")).toBeTruthy());
    const title = screen.getByText("Einheit loggen", { selector: "div.sg" });
    fireEvent.click(title.parentElement.querySelector("button"));
    await waitFor(() => expect(screen.getByText("Einheit fortsetzen")).toBeTruthy());
    fireEvent.click(screen.getByText("Training starten"));
    await waitFor(() => expect(screen.getByDisplayValue("Pull-ups")).toBeTruthy());
    expect(screen.queryByText("Angefangene Einheit wiederhergestellt.")).toBeNull();
    expect(screen.getByText("Mini", { selector: "b" })).toBeTruthy();
  });
});

describe("Runde 5: automatisches Max und Max-Erinnerung", () => {
  const iso = (daysAgo) => { const d = new Date(); d.setDate(d.getDate() - daysAgo); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  const S = (daysAgo, name, sets, extra = {}) => ({ id: `s${daysAgo}${name}`, date: iso(daysAgo), type: "calisthenics", focus: "a", exercises: [{ name, ...extra, sets }] });
  const set = (reps, weight = 0, more = {}) => ({ reps, weight, rir: 2, assist: "Kein Band", ...more });
  const seed = (sessions) => localStorage.setItem("training-data", JSON.stringify({ sessions, baseline: {}, milestoneStages: { muscleup: 0, handstand: 0, lsit: 0 }, prs: [], plans: [] }));

  it("Max je nach Übungsformat: Gewicht, Wiederholungen, Band, Hold, Unterstützung", () => {
    const m = (sessions, name) => effMax(sessions, name, null, {}).text;
    expect(m([S(5, "Hip Thrust", [set(8, 100), set(10, 110), set(6, 110), set(15, 40, { setType: "Aufwärmen" })])], "Hip Thrust")).toBe("110 kg × 10");
    expect(m([S(5, "Liegestütze", [set(30), set(35), set(60, 0, { setType: "Aufwärmen" })])], "Liegestütze")).toBe("35 Wdh");
    expect(m([S(5, "Chin-ups", [set(12, 0, { assist: "Rotes Band" }), set(3)])], "Chin-ups")).toBe("3 Wdh");
    expect(m([S(5, "Pull-ups", [set(12, 0, { assist: "Rotes Band" }), set(15, 0, { assist: "Schwarzes Band" })])], "Pull-ups")).toBe("12 Wdh (Rotes Band)");
    expect(m([{ id: "h", date: iso(3), type: "calisthenics", exercises: [{ name: "Handstand", holdSeconds: 10, sets: [] }] }, { id: "h2", date: iso(1), type: "calisthenics", exercises: [{ name: "Handstand", holdSeconds: 25, sets: [] }] }], "Handstand")).toBe("25 s");
    expect(m([S(5, "Dips", [set(8, 10, { weightMode: "assist" }), set(5, 5, { weightMode: "assist" })])], "Dips")).toBe("5 kg Unterst. × 5");
  });

  it("Selbst eingetragener Wert gilt, bis ein späterer besserer Log ihn überholt", () => {
    const manual = S(20, "Liegestütze", [set(30)], { max: "35 Wdh", maxManual: true });
    expect(effMax([manual], "Liegestütze", null, {}).text).toBe("35 Wdh");
    expect(effMax([manual, S(5, "Liegestütze", [set(32)], { max: "35 Wdh", maxManual: true, maxAt: iso(20) })], "Liegestütze", null, {}).text).toBe("35 Wdh");
    const better = [manual, S(5, "Liegestütze", [set(40)], { max: "35 Wdh", maxManual: true, maxAt: iso(20) })];
    expect(effMax(better, "Liegestütze", null, {}).text).toBe("40 Wdh");
    const reset = [manual, S(5, "Liegestütze", [set(32)], { max: "", maxManual: false })];
    expect(effMax(reset, "Liegestütze", null, {}).text).toBe("32 Wdh");
  });

  it("Erinnerung ab 6 Wochen, aber nur bei aktiv trainierten Übungen; Max-Test setzt die Uhr zurück", () => {
    const today = iso(0);
    const old = [S(49, "Liegestütze", [set(35)]), S(14, "Liegestütze", [set(30)])];
    const r = reminders(old, today);
    expect(r.length).toBe(1);
    expect(r[0].weeks).toBe(7);
    expect(r[0].text).toBe("35 Wdh");
    expect(reminders([S(30, "Liegestütze", [set(35)]), S(10, "Liegestütze", [set(30)])], today).length).toBe(0); // erst 4 Wochen
    expect(reminders([S(100, "Liegestütze", [set(35)])], today).length).toBe(0); // lange nicht trainiert
    expect(reminders([...old, S(3, "Liegestütze", [set(28, 0, { setType: "Max-Test" })])], today).length).toBe(0); // gerade getestet
  });

  it("Dashboard zeigt Erinnerung und Maxima, Export enthält die Maxima", async () => {
    seed([S(49, "Liegestütze", [set(35)]), S(14, "Liegestütze", [set(30)])]);
    await openApp();
    await waitFor(() => expect(screen.getByText(/Dein Max bei Liegestütze \(35 Wdh\) ist 7 Wochen alt, Zeit zum Testen\./)).toBeTruthy());
    expect(screen.getByText("Meine Maxima")).toBeTruthy();
    expect(screen.getByText("35 Wdh")).toBeTruthy();
    expect(screen.getByText(/vor 7 Wochen, Test fällig/)).toBeTruthy();
    fireEvent.click(screen.getByText("Export"));
    await waitFor(() => expect(screen.getByDisplayValue(/MAXIMA \(automatisch aus den Logs\)/)).toBeTruthy());
  });

  it("Max-Test-Satz setzt die Erinnerung zurück, Dashboard zeigt keine mehr", async () => {
    seed([S(49, "Liegestütze", [set(35)]), S(14, "Liegestütze", [set(30)]), S(3, "Liegestütze", [set(28, 0, { setType: "Max-Test" })])]);
    await openApp();
    await waitFor(() => expect(screen.getByText("Meine Maxima")).toBeTruthy());
    expect(screen.queryByText(/Zeit zum Testen/)).toBeNull();
  });

  it("Im Formular: Hinweis bei altem Max, Max-Feld füllt sich automatisch und aktualisiert sich live", async () => {
    seed([S(49, "Liegestütze", [set(35)]), S(14, "Liegestütze", [set(30)])]);
    await openApp();
    fireEvent.click(screen.getByText("Einheit loggen"));
    fireEvent.click(await screen.findByText("Liegestütze", { selector: "button" }));
    await waitFor(() => expect(screen.getByText(/Dein Max ist 7 Wochen alt \(35 Wdh\)/)).toBeTruthy());
    const field = () => screen.getByLabelText("Maximum dieser Übung");
    expect(field().value).toBe("35 Wdh");
    expect(screen.getByText("(auto)")).toBeTruthy();
    // heute mehr schaffen: Max zieht automatisch nach
    fireEvent.change(screen.getAllByPlaceholderText(/^Reps/)[0], { target: { value: "38" } });
    await waitFor(() => expect(field().value).toBe("38 Wdh"));
    // Satzart Max-Test auswählbar
    expect(screen.getAllByRole("option", { name: "Max-Test" }).length).toBeGreaterThan(0);
    // von Hand überschreiben und wieder auf automatisch stellen
    fireEvent.change(field(), { target: { value: "5" } });
    expect(field().value).toBe("5"); // Eingabe springt beim Tippen nicht zurück
    fireEvent.change(field(), { target: { value: "41 Wdh" } });
    await waitFor(() => expect(field().value).toBe("41 Wdh"));
    fireEvent.click(screen.getByLabelText("Max wieder automatisch berechnen"));
    await waitFor(() => expect(field().value).toBe("38 Wdh"));
  });

  it("Max-Test-Sätze zählen nicht für die Steigerungsvorschläge", () => {
    const sets = [set(8, 100), set(8, 100), set(8, 100), set(3, 100, { setType: "Max-Test" })];
    const sessions = [{ date: iso(2), type: "legs", focus: "do", exercises: [{ name: "Hip Thrust", target: "8-12", sets }] }];
    expect(suggest(sessions, "Hip Thrust", "do")).toMatch(/100 kg halten, 9 Wdh/);
  });
});
