"use client";

/**
 * Agenda v2 : calendrier mensuel filtrable (tâches, appels prospects,
 * prochaines actions CRM — filtres par type de contenu et par assigné),
 * demandes d'appel à planifier et gestion des tâches (type normale ou
 * progressive, catégorie, priorité, assignation, échéance).
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import { PRIORITIES } from "./ProspectFile";

const TASK_STATUS = { TODO: "À faire", IN_PROGRESS: "En cours", DONE: "Fait" };
const TASK_COLORS = { TODO: "var(--amber)", IN_PROGRESS: "var(--blue)", DONE: "var(--green)" };

const TYPES = {
  coaching: { label: "Coachings", color: "var(--green)" },
  task: { label: "Tâches", color: "var(--blue)" },
  appointment: { label: "Appels", color: "var(--violet)" },
  prospect: { label: "Actions CRM", color: "var(--accent)" },
};

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
// Jour de la semaine (enum Prisma) à partir d'une date JS : (getDay()+6)%7 → 0 = lundi.
const WEEKDAY_ENUM = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

function fmt(dt) {
  return dt ? new Date(dt).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
}
const dayKey = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
};

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

export default function AgendaBoard({ initialTasks, initialAppointments, nextActions = [], staff = [], sessionUserId, role = "ADMIN", coachSlots = [] }) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [appointments, setAppointments] = useState(initialAppointments);
  const [scheduling, setScheduling] = useState(null);
  const [scheduleAt, setScheduleAt] = useState("");
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [error, setError] = useState(null);

  // --- Filtres du calendrier ---
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return { y: now.getFullYear(), m: now.getMonth() };
  });
  const [typeFilter, setTypeFilter] = useState({ coaching: true, task: true, appointment: true, prospect: true });
  const [assigneeFilter, setAssigneeFilter] = useState("");

  const requested = appointments.filter((a) => a.status === "REQUESTED");
  const scheduled = appointments
    .filter((a) => a.status === "SCHEDULED")
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));

  // --- Événements du calendrier -------------------------------------------------
  const events = useMemo(() => {
    const list = [];
    if (typeFilter.task) {
      tasks
        .filter((t) => t.dueAt)
        .filter((t) => !assigneeFilter || t.assigneeId === assigneeFilter)
        .forEach((t) =>
          list.push({
            id: `t-${t.id}`,
            date: t.dueAt,
            type: "task",
            label: t.title,
            done: t.status === "DONE",
            onClick: () => setEditingTask(t),
          })
        );
    }
    if (typeFilter.appointment && !assigneeFilter) {
      scheduled.forEach((a) =>
        list.push({
          id: `a-${a.id}`,
          date: a.scheduledAt,
          type: "appointment",
          label: a.prospect ? `Appel · ${a.prospect.firstName} ${a.prospect.lastName}` : "Appel",
          href: a.prospect ? `/admin/crm/${a.prospect.id}` : undefined,
        })
      );
    }
    if (typeFilter.prospect) {
      nextActions
        .filter((p) => !assigneeFilter || p.assignedToId === assigneeFilter)
        .forEach((p) =>
          list.push({
            id: `p-${p.id}`,
            date: p.nextActionAt,
            type: "prospect",
            label: `${p.nextActionLabel || "Action"} · ${p.firstName} ${p.lastName}`,
            href: `/admin/crm/${p.id}`,
          })
        );
    }
    return list;
  }, [tasks, scheduled, nextActions, typeFilter, assigneeFilter]);

  // Grille : semaines du mois affiché (lundi → dimanche).
  const weeks = useMemo(() => {
    const first = new Date(month.y, month.m, 1);
    const start = new Date(first);
    start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
    const out = [];
    const cursor = new Date(start);
    do {
      const week = [];
      for (let i = 0; i < 7; i++) {
        week.push(new Date(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
      out.push(week);
    } while (cursor.getMonth() === month.m);
    return out;
  }, [month]);

  // Occurrences de coaching : les créneaux hebdomadaires (récurrents par jour de
  // la semaine) projetés sur chaque date visible de la grille — passé, présent
  // et futur, au fil de la navigation entre les mois.
  const coachingEvents = useMemo(() => {
    if (!typeFilter.coaching || coachSlots.length === 0) return [];
    const out = [];
    weeks.forEach((week) =>
      week.forEach((day) => {
        const wd = WEEKDAY_ENUM[(day.getDay() + 6) % 7];
        coachSlots
          .filter((s) => s.weekday === wd && s.isActive !== false)
          .forEach((s) => {
            const [hh, mm] = (s.startTime || "00:00").split(":");
            const date = new Date(day);
            date.setHours(Number(hh) || 0, Number(mm) || 0, 0, 0);
            out.push({
              id: `c-${s.id}-${dayKey(day)}`,
              date,
              type: "coaching",
              color: s.sessionType?.color,
              label: `${s.startTime} · ${s.sessionType?.name || "Séance"}${s.group ? ` — ${s.group.name}` : ""}`,
            });
          });
      })
    );
    return out;
  }, [coachSlots, weeks, typeFilter.coaching]);

  const byDay = useMemo(() => {
    const map = {};
    [...events, ...coachingEvents].forEach((e) => {
      const k = dayKey(e.date);
      (map[k] = map[k] || []).push(e);
    });
    Object.values(map).forEach((l) => l.sort((a, b) => new Date(a.date) - new Date(b.date)));
    return map;
  }, [events, coachingEvents]);

  const todayKey = dayKey(new Date());

  // --- Actions ------------------------------------------------------------------
  async function saveTask(form, task) {
    try {
      if (task) {
        const updated = await api(`/api/tasks/${task.id}`, "PATCH", form);
        setTasks(tasks.map((t) => (t.id === task.id ? { ...t, ...updated } : t)));
        setEditingTask(null);
      } else {
        const created = await api("/api/tasks", "POST", form);
        setTasks([...tasks, created]);
        setShowTaskModal(false);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeTask(task) {
    await api(`/api/tasks/${task.id}`, "DELETE");
    setTasks(tasks.filter((t) => t.id !== task.id));
    setEditingTask(null);
  }

  async function planAppointment(e) {
    e.preventDefault();
    try {
      const updated = await api(`/api/appointments/${scheduling.id}`, "PATCH", { scheduledAt: scheduleAt });
      setAppointments(appointments.map((a) => (a.id === scheduling.id ? updated : a)));
      setScheduling(null);
      setScheduleAt("");
      router.refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function closeAppointment(a, status) {
    const updated = await api(`/api/appointments/${a.id}`, "PATCH", { status });
    setAppointments(appointments.map((x) => (x.id === a.id ? updated : x)));
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Agenda & tâches</h1>
          <div className="subtitle">Calendrier des coachings, tâches, appels et actions CRM — passé, présent et futur.</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowTaskModal(true)}>+ Nouvelle tâche</button>
      </div>
      {error && <div className="alert alert-error" onClick={() => setError(null)}>{error}</div>}

      {/* --- Calendrier --------------------------------------------------------- */}
      <div className="card mb">
        <div className="flex-between wrap mb">
          <div className="flex">
            <button className="btn btn-sm" onClick={() => setMonth((m) => (m.m === 0 ? { y: m.y - 1, m: 11 } : { ...m, m: m.m - 1 }))}><Icon name="arrow-left" /></button>
            <h3 style={{ margin: 0, minWidth: 170, textAlign: "center" }}>{MONTHS[month.m]} {month.y}</h3>
            <button className="btn btn-sm" onClick={() => setMonth((m) => (m.m === 11 ? { y: m.y + 1, m: 0 } : { ...m, m: m.m + 1 }))}><Icon name="arrow-left" style={{ transform: "rotate(180deg)" }} /></button>
          </div>
          <div className="flex wrap">
            {Object.entries(TYPES).map(([k, t]) => (
              <label key={k} className="badge" style={{ cursor: "pointer", borderColor: typeFilter[k] ? t.color : "var(--border)", opacity: typeFilter[k] ? 1 : 0.5 }}>
                <input type="checkbox" checked={typeFilter[k]} onChange={() => setTypeFilter({ ...typeFilter, [k]: !typeFilter[k] })} style={{ display: "none" }} />
                {t.label}
              </label>
            ))}
            {role === "ADMIN" && (
              <select className="input" style={{ width: "auto", padding: "5px 8px", fontSize: 13 }} value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
                <option value="">Tous les assignés</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="cal-grid cal-head">
          {DAYS.map((d) => <div key={d} className="cal-day-name">{d}</div>)}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} className="cal-grid">
            {week.map((day) => {
              const k = dayKey(day);
              const inMonth = day.getMonth() === month.m;
              const dayEvents = byDay[k] || [];
              return (
                <div key={k} className={`cal-cell${inMonth ? "" : " cal-out"}${k === todayKey ? " cal-today" : ""}`}>
                  <div className="cal-num">{day.getDate()}</div>
                  {dayEvents.slice(0, 4).map((e) => {
                    const style = {
                      borderLeft: `3px solid ${e.color || TYPES[e.type].color}`,
                      textDecoration: e.done ? "line-through" : "none",
                    };
                    return e.href ? (
                      <Link key={e.id} href={e.href} className="cal-event" style={style}>{e.label}</Link>
                    ) : (
                      <div key={e.id} className="cal-event" style={{ ...style, cursor: e.onClick ? "pointer" : "default" }} onClick={e.onClick}>
                        {e.label}
                      </div>
                    );
                  })}
                  {dayEvents.length > 4 && <div className="muted small">+ {dayEvents.length - 4} autre(s)</div>}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="grid grid-2">
        {/* --- Appels ------------------------------------------------------ */}
        <div>
          <div className="card mb">
            <h3><Icon name="phone" /> Demandes d&apos;appel à planifier ({requested.length})</h3>
            {requested.length === 0 && <p className="muted">Rien à planifier.</p>}
            {requested.map((a) => (
              <div key={a.id} className="flex-between" style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                <div>
                  <Link href={`/admin/crm/${a.prospect?.id}`} style={{ fontWeight: 600 }}>
                    {a.prospect ? `${a.prospect.firstName} ${a.prospect.lastName}` : "Prospect supprimé"}
                  </Link>
                  <div className="muted small">
                    {a.prospect?.phone} · reçue le {fmt(a.createdAt)}
                  </div>
                </div>
                <button className="btn btn-sm btn-primary" onClick={() => setScheduling(a)}>Planifier</button>
              </div>
            ))}
          </div>

          <div className="card">
            <h3><Icon name="calendar" /> Appels planifiés ({scheduled.length})</h3>
            {scheduled.length === 0 && <p className="muted">Aucun appel planifié.</p>}
            {scheduled.map((a) => (
              <div key={a.id} className="flex-between" style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                <div>
                  <Link href={`/admin/crm/${a.prospect?.id}`} style={{ fontWeight: 600 }}>
                    {a.prospect ? `${a.prospect.firstName} ${a.prospect.lastName}` : "—"}
                  </Link>
                  <div className="muted small">{fmt(a.scheduledAt)} · {a.durationMin} min</div>
                </div>
                <div className="flex">
                  <button className="btn btn-sm" onClick={() => closeAppointment(a, "COMPLETED")}><Icon name="check" /> Fait</button>
                  <button className="btn btn-sm btn-danger" onClick={() => closeAppointment(a, "CANCELLED")}>Annuler</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* --- Tâches ------------------------------------------------------- */}
        <div className="card">
          <div className="flex-between mb">
            <h3 style={{ margin: 0 }}><Icon name="check" /> Tâches</h3>
            <button className="btn btn-sm btn-primary" onClick={() => setShowTaskModal(true)}>+ Ajouter</button>
          </div>
          {tasks.length === 0 && <p className="muted">Aucune tâche pour le moment.</p>}
          {tasks.map((t) => (
            <div key={t.id} className="flex-between" style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
              <div style={{ minWidth: 0 }}>
                <span
                  style={{ textDecoration: t.status === "DONE" ? "line-through" : "none", fontWeight: 600, cursor: "pointer" }}
                  onClick={() => setEditingTask(t)}
                >
                  {t.title}
                </span>
                <div className="muted small">
                  {t.category && <>{t.category} · </>}
                  {PRIORITIES[t.priority] && t.priority !== "NORMAL" && (
                    <span style={{ color: PRIORITIES[t.priority].color }}>{PRIORITIES[t.priority].label} · </span>
                  )}
                  {t.dueAt ? `Échéance : ${fmt(t.dueAt)}` : "Sans échéance"}
                  {t.assignee && sessionUserId !== t.assigneeId && <> · <Icon name="user" /> {t.assignee.firstName} {t.assignee.lastName}</>}
                </div>
                {t.progress !== null && t.progress !== undefined && (
                  <div style={{ marginTop: 4, height: 6, borderRadius: 3, background: "var(--panel-2)", overflow: "hidden", maxWidth: 220 }}>
                    <div style={{ width: `${t.progress}%`, height: "100%", background: "var(--accent)" }} />
                  </div>
                )}
              </div>
              <div className="flex">
                <select
                  className="input"
                  style={{ width: "auto", padding: "5px 8px", color: TASK_COLORS[t.status] }}
                  value={t.status}
                  onChange={(e) => saveTask({ status: e.target.value }, t)}
                >
                  {Object.entries(TASK_STATUS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                <button className="btn btn-sm btn-danger" onClick={() => removeTask(t)}><Icon name="x" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- Modale de planification d'appel --------------------------------- */}
      {scheduling && (
        <div className="modal-backdrop" onClick={() => setScheduling(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>
              Planifier l&apos;appel — {scheduling.prospect?.firstName} {scheduling.prospect?.lastName}
            </h3>
            <form onSubmit={planAppointment}>
              <div className="field">
                <label>Date et heure</label>
                <input
                  className="input"
                  type="datetime-local"
                  required
                  value={scheduleAt}
                  onChange={(e) => setScheduleAt(e.target.value)}
                />
              </div>
              <div className="flex">
                <button type="button" className="btn" onClick={() => setScheduling(null)}>Annuler</button>
                <button className="btn btn-primary">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Modale tâche (création / édition) -------------------------------- */}
      {(showTaskModal || editingTask) && (
        <TaskModal
          task={editingTask}
          staff={staff}
          role={role}
          onClose={() => { setShowTaskModal(false); setEditingTask(null); }}
          onSave={saveTask}
          onDelete={editingTask ? () => removeTask(editingTask) : undefined}
        />
      )}
    </div>
  );
}

/* --- Formulaire tâche (type normale / progressive) ------------------------------ */

function TaskModal({ task, staff, role, onClose, onSave, onDelete }) {
  const toLocal = (d) => {
    if (!d) return "";
    const date = new Date(d);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
  };
  const [form, setForm] = useState({
    title: task?.title || "",
    description: task?.description || "",
    category: task?.category || "",
    assigneeId: task?.assigneeId || "",
    status: task?.status || "TODO",
    priority: task?.priority || "NORMAL",
    dueAt: toLocal(task?.dueAt),
    progressive: task?.progress !== null && task?.progress !== undefined,
    progress: task?.progress ?? 0,
  });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  function submit(e) {
    e.preventDefault();
    onSave(
      {
        title: form.title,
        description: form.description,
        category: form.category,
        assigneeId: form.assigneeId || undefined,
        status: form.status,
        priority: form.priority,
        dueAt: form.dueAt || null,
        progress: form.progressive ? Number(form.progress) : null,
      },
      task
    );
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{task ? "Modifier la tâche" : "Nouvelle tâche"}</h3>
        <form onSubmit={submit}>
          <div className="field">
            <label>Type de tâche</label>
            <div className="flex">
              <label className="badge" style={{ cursor: "pointer", borderColor: !form.progressive ? "var(--accent)" : "var(--border)" }}>
                <input type="radio" checked={!form.progressive} onChange={() => setForm({ ...form, progressive: false })} style={{ marginRight: 6 }} />
                Normale
              </label>
              <label className="badge" style={{ cursor: "pointer", borderColor: form.progressive ? "var(--accent)" : "var(--border)" }}>
                <input type="radio" checked={form.progressive} onChange={() => setForm({ ...form, progressive: true })} style={{ marginRight: 6 }} />
                Progressive (avec % d&apos;avancement)
              </label>
            </div>
          </div>
          {form.progressive && (
            <div className="field">
              <label>Progression : {form.progress} %</label>
              <input type="range" min={0} max={100} step={5} value={form.progress} onChange={set("progress")} style={{ width: "100%" }} />
            </div>
          )}
          <div className="field"><label>Titre *</label><input className="input" required value={form.title} onChange={set("title")} /></div>
          <div className="form-row">
            <div className="field"><label>Catégorie</label><input className="input" placeholder="Ex. : Prospection, Admin…" value={form.category} onChange={set("category")} /></div>
            <div className="field">
              <label>Assigné à</label>
              <select className="input" value={form.assigneeId} onChange={set("assigneeId")} disabled={role !== "ADMIN"}>
                <option value="">Moi</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label>Statut</label>
              <select className="input" value={form.status} onChange={set("status")}>
                {Object.entries(TASK_STATUS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Priorité</label>
              <select className="input" value={form.priority} onChange={set("priority")}>
                {Object.entries(PRIORITIES).map(([v, p]) => (
                  <option key={v} value={v}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className="field"><label>Échéance</label><input className="input" type="datetime-local" value={form.dueAt} onChange={set("dueAt")} /></div>
          </div>
          <div className="field"><label>Description</label><textarea className="input" value={form.description} onChange={set("description")} /></div>
          <div className="flex-between">
            <div className="flex">
              <button type="button" className="btn" onClick={onClose}>Annuler</button>
              <button className="btn btn-primary">{task ? "Enregistrer" : "Créer"}</button>
            </div>
            {onDelete && <button type="button" className="btn btn-danger btn-sm" onClick={onDelete}>Supprimer</button>}
          </div>
        </form>
      </div>
    </div>
  );
}
