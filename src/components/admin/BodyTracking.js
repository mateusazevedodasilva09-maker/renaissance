"use client";

/**
 * Suivi corporel (fiche client, côté coach) :
 *   - BilanCard : questionnaire d'entrée (blessures, feu rouge médical,
 *     disponibilités, matériel, expérience) — rempli une fois à l'inscription,
 *     modifiable ensuite. Les blessures remontent en alerte sur le programme.
 *   - BodyTrackingCard : mensurations (historique daté) et photos de
 *     progression avec comparatif avant / après par angle de vue.
 *
 * Tout est saisi par le coach sur place : rien n'est demandé au client.
 */
import { useMemo, useState } from "react";
import Icon from "@/components/Icon";

async function api(path, method, body) {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Erreur");
  return json.data;
}

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—");

/* --- Bilan initial (questionnaire d'entrée) ---------------------------------------- */

export function BilanCard({ client, onSaved }) {
  const [form, setForm] = useState({
    injuries: client.injuries || "",
    medicalNotes: client.medicalNotes || "",
    availability: client.availability || "",
    experienceNote: client.experienceNote || "",
  });
  const [msg, setMsg] = useState(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function save() {
    try {
      const updated = await api(`/api/clients/${client.id}`, "PATCH", form);
      onSaved(updated);
      setMsg("✓ Bilan enregistré");
      setTimeout(() => setMsg(null), 2000);
    } catch (err) { console.error(err);
      setMsg(err.message);
    }
  }

  return (
    <div className="card">
      <h3><Icon name="clipboard" /> Bilan initial</h3>
      <p className="muted small">Questionnaire d&apos;entrée : à remplir à l&apos;inscription, pour programmer en sécurité.</p>
      <div className="field">
        <label><Icon name="warning" /> Blessures / zones sensibles</label>
        <input className="input" placeholder="Ex. : lombaires fragiles, épaule droite opérée en 2023…" value={form.injuries} onChange={set("injuries")} />
      </div>
      <div className="field">
        <label>Antécédents médicaux / feu rouge</label>
        <input className="input" placeholder="Ex. : hypertension traitée, asthme d'effort…" value={form.medicalNotes} onChange={set("medicalNotes")} />
      </div>
      <div className="field">
        <label>Disponibilités</label>
        <input className="input" placeholder="Ex. : lundi/mercredi soir, samedi matin" value={form.availability} onChange={set("availability")} />
      </div>
      <div className="field">
        <label>Expérience sportive</label>
        <textarea className="input" rows={2} placeholder="Ex. : 2 ans de foot ado, jamais de musculation…" value={form.experienceNote} onChange={set("experienceNote")} />
      </div>
      <div className="flex">
        <button className="btn btn-primary btn-sm" onClick={save}>Enregistrer le bilan</button>
        {msg && <span className="small">{msg}</span>}
      </div>
    </div>
  );
}

/* --- Mensurations + photos ----------------------------------------------------------- */

// Colonnes de mensurations : clé Prisma → libellé court affiché.
const MEASURE_COLUMNS = [
  ["weightKg", "Poids", "kg"],
  ["bodyFatPct", "MG", "%"],
  ["chestCm", "Poitrine", "cm"],
  ["waistCm", "Taille", "cm"],
  ["hipsCm", "Hanches", "cm"],
  ["armCm", "Bras", "cm"],
  ["thighCm", "Cuisse", "cm"],
  ["calfCm", "Mollet", "cm"],
  ["shouldersCm", "Épaules", "cm"],
];

const POSES = [["FRONT", "Face"], ["SIDE", "Profil"], ["BACK", "Dos"]];
const POSE_LABELS = Object.fromEntries(POSES);

export function BodyTrackingCard({ client, onUpdate }) {
  const [tab, setTab] = useState("mensurations");
  const [error, setError] = useState(null);

  return (
    <div className="card">
      <div className="flex-between wrap mb">
        <h3 style={{ margin: 0 }}><Icon name="weight" /> Suivi corporel</h3>
        <div className="flex">
          {[["mensurations", "Mensurations"], ["photos", "Photos avant / après"]].map(([k, l]) => (
            <button key={k} className={`btn btn-sm${tab === k ? " btn-primary" : ""}`} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
      </div>
      {error && <div className="alert alert-error" onClick={() => setError(null)}>{error}</div>}

      {tab === "mensurations" && <MeasurementsTab client={client} onUpdate={onUpdate} onError={setError} />}
      {tab === "photos" && <PhotosTab client={client} onUpdate={onUpdate} onError={setError} />}
    </div>
  );
}

/* --- Onglet mensurations ------------------------------------------------------------- */

function MeasurementsTab({ client, onUpdate, onError }) {
  const empty = Object.fromEntries(MEASURE_COLUMNS.map(([k]) => [k, ""]));
  const [form, setForm] = useState({ date: "", notes: "", ...empty });
  const measurements = client.measurements || [];

  async function submit(e) {
    e.preventDefault();
    try {
      const created = await api(`/api/clients/${client.id}/measurements`, "POST", form);
      onUpdate({ measurements: [...measurements, created].sort((a, b) => new Date(a.date) - new Date(b.date)) });
      setForm({ date: "", notes: "", ...empty });
    } catch (err) { console.error(err);
      onError(err.message);
    }
  }

  async function remove(m) {
    if (!window.confirm("Supprimer cette prise de mensurations ?")) return;
    try {
      await api(`/api/measurements/${m.id}`, "DELETE");
      onUpdate({ measurements: measurements.filter((x) => x.id !== m.id) });
    } catch (err) { console.error(err);
      onError(err.message);
    }
  }

  // Évolution entre la première et la dernière prise (le « vrai ça marche »).
  const diff = useMemo(() => {
    if (measurements.length < 2) return null;
    const first = measurements[0];
    const last = measurements[measurements.length - 1];
    return MEASURE_COLUMNS
      .filter(([k]) => first[k] != null && last[k] != null)
      .map(([k, label, unit]) => ({ label, unit, delta: +(last[k] - first[k]).toFixed(1) }))
      .filter((d) => d.delta !== 0);
  }, [measurements]);

  return (
    <div>
      {/* Saisie rapide : uniquement les champs utiles, le reste peut rester vide. */}
      <form onSubmit={submit} className="mb">
        <div className="flex wrap mb" style={{ gap: 8 }}>
          <input className="input" style={{ width: 140 }} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          {MEASURE_COLUMNS.map(([k, label, unit]) => (
            <input
              key={k}
              className="input"
              style={{ width: 92 }}
              type="number"
              step="0.1"
              placeholder={`${label} (${unit})`}
              value={form[k]}
              onChange={(e) => setForm({ ...form, [k]: e.target.value })}
            />
          ))}
          <input className="input" style={{ flex: 1, minWidth: 120 }} placeholder="Note (optionnel)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <button className="btn btn-primary btn-sm">Enregistrer</button>
        </div>
      </form>

      {diff && diff.length > 0 && (
        <p className="muted small">
          <Icon name="chart" /> Depuis la première prise :{" "}
          {diff.map((d, i) => (
            <span key={d.label}>
              {i > 0 && " · "}
              <strong style={{ color: d.delta < 0 ? "var(--green)" : "var(--accent)" }}>
                {d.label} {d.delta > 0 ? `+${d.delta}` : d.delta} {d.unit}
              </strong>
            </span>
          ))}
        </p>
      )}

      {measurements.length === 0 ? (
        <p className="muted">Aucune mensuration enregistrée. Première prise conseillée lors du bilan initial.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                {MEASURE_COLUMNS.map(([k, label]) => <th key={k}>{label}</th>)}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {[...measurements].reverse().map((m) => (
                <tr key={m.id} title={m.notes || ""}>
                  <td>{fmtDate(m.date)}</td>
                  {MEASURE_COLUMNS.map(([k]) => <td key={k}>{m[k] ?? "—"}</td>)}
                  <td><button type="button" className="btn btn-sm btn-danger" onClick={() => remove(m)}><Icon name="x" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* --- Onglet photos avant / après ------------------------------------------------------ */

function PhotosTab({ client, onUpdate, onError }) {
  const [form, setForm] = useState({ pose: "FRONT", date: "", notes: "" });
  const [file, setFile] = useState(null);
  const [sending, setSending] = useState(false);
  const photos = client.photos || [];

  async function submit(e) {
    e.preventDefault();
    if (!file) return;
    setSending(true);
    try {
      // Envoi multipart : le JSON ne convient pas pour un fichier binaire.
      const data = new FormData();
      data.append("file", file);
      data.append("pose", form.pose);
      if (form.date) data.append("date", form.date);
      if (form.notes) data.append("notes", form.notes);
      const res = await fetch(`/api/clients/${client.id}/photos`, { method: "POST", body: data });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Erreur");
      onUpdate({ photos: [...photos, json.data].sort((a, b) => new Date(a.date) - new Date(b.date)) });
      setFile(null);
      setForm({ pose: "FRONT", date: "", notes: "" });
      e.target.reset();
    } catch (err) { console.error(err);
      onError(err.message);
    } finally {
      setSending(false);
    }
  }

  async function remove(photo) {
    if (!window.confirm("Supprimer cette photo ?")) return;
    try {
      await api(`/api/photos/${photo.id}`, "DELETE");
      onUpdate({ photos: photos.filter((p) => p.id !== photo.id) });
    } catch (err) { console.error(err);
      onError(err.message);
    }
  }

  return (
    <div>
      <form onSubmit={submit} className="flex wrap mb" style={{ gap: 8, alignItems: "center" }}>
        <input className="input" style={{ flex: 1, minWidth: 180 }} type="file" accept="image/*" required onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <select className="input" style={{ width: "auto" }} value={form.pose} onChange={(e) => setForm({ ...form, pose: e.target.value })}>
          {POSES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <input className="input" style={{ width: 140 }} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        <input className="input" style={{ width: 160 }} placeholder="Note (optionnel)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <button className="btn btn-primary btn-sm" disabled={!file || sending}>{sending ? "Envoi…" : "Ajouter la photo"}</button>
      </form>

      {photos.length === 0 ? (
        <p className="muted">Aucune photo. Conseil : même angle, même lumière, même tenue à chaque prise.</p>
      ) : (
        POSES.map(([pose]) => <PoseCompare key={pose} pose={pose} photos={photos.filter((p) => p.pose === pose)} onRemove={remove} />)
      )}
    </div>
  );
}

/**
 * Comparatif avant / après pour un angle donné : première photo à gauche,
 * dernière à droite — c'est le progrès que la balance ne montre pas.
 */
function PoseCompare({ pose, photos, onRemove }) {
  if (photos.length === 0) return null;
  const first = photos[0];
  const last = photos[photos.length - 1];
  const showCompare = photos.length >= 2;

  return (
    <div className="mb">
      <h4 style={{ marginBottom: 8 }}>{POSE_LABELS[pose]} <span className="muted small">({photos.length} photo(s))</span></h4>
      {showCompare ? (
        <div className="grid grid-2" style={{ maxWidth: 560 }}>
          <PhotoFigure photo={first} caption={`Avant — ${fmtDate(first.date)}`} onRemove={onRemove} />
          <PhotoFigure photo={last} caption={`Après — ${fmtDate(last.date)}`} onRemove={onRemove} />
        </div>
      ) : (
        <div style={{ maxWidth: 270 }}>
          <PhotoFigure photo={first} caption={fmtDate(first.date)} onRemove={onRemove} />
        </div>
      )}
      {/* Photos intermédiaires en vignettes cliquables. */}
      {photos.length > 2 && (
        <div className="flex wrap mt" style={{ gap: 6 }}>
          {photos.slice(1, -1).map((p) => (
            <a key={p.id} href={p.url} target="_blank" rel="noreferrer" title={`${fmtDate(p.date)}${p.notes ? ` — ${p.notes}` : ""}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" style={{ width: 54, height: 72, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)" }} />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function PhotoFigure({ photo, caption, onRemove }) {
  return (
    <figure style={{ margin: 0, position: "relative" }}>
      <a href={photo.url} target="_blank" rel="noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.url}
          alt={caption}
          style={{ width: "100%", aspectRatio: "3 / 4", objectFit: "cover", borderRadius: 10, border: "1px solid var(--border)" }}
        />
      </a>
      <button
        type="button"
        className="btn btn-sm btn-danger"
        style={{ position: "absolute", top: 6, right: 6 }}
        title="Supprimer"
        onClick={() => onRemove(photo)}
      >
        <Icon name="x" />
      </button>
      <figcaption className="muted small" style={{ marginTop: 4 }}>{caption}{photo.notes ? ` — ${photo.notes}` : ""}</figcaption>
    </figure>
  );
}
