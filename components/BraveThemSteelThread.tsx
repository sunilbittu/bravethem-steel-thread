"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Task = {
  id: string;
  title: string;
  done: boolean;
  createdAt: number;
  completedAt?: number;
};

type Session = {
  id: string;
  taskId?: string;
  start: number;
  end?: number;
};

type Mood = {
  id: string;
  ts: number;
  score: number;
  note?: string;
};

const LS_KEYS = {
  singleFocus: "bt.singleFocus",
  tasks: "bt.tasks",
  sessions: "bt.sessions",
  moods: "bt.moods",
  timer: "bt.timer",
} as const;

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function isSameDay(a: number, b: number) {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

function todayLabel() {
  const d = new Date();
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export default function BraveThemSteelThread() {
  const [singleFocus, setSingleFocus] = useState<string>(() => load(LS_KEYS.singleFocus, ""));
  const [editingFocus, setEditingFocus] = useState(!singleFocus);
  const [focusDraft, setFocusDraft] = useState(singleFocus);

  const [tasks, setTasks] = useState<Task[]>(() => load(LS_KEYS.tasks, [] as Task[]));
  const [newTask, setNewTask] = useState("");

  const [sessions, setSessions] = useState<Session[]>(() => load(LS_KEYS.sessions, [] as Session[]));
  const [moods, setMoods] = useState<Mood[]>(() => load(LS_KEYS.moods, [] as Mood[]));

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteInput, setPaletteInput] = useState("");

  const DEFAULT_SECS = 25 * 60;
  const [running, setRunning] = useState<boolean>(() => load(LS_KEYS.timer, { running: false }).running || false);
  const [remaining, setRemaining] = useState<number>(() => load(LS_KEYS.timer, { remaining: DEFAULT_SECS }).remaining ?? DEFAULT_SECS);
  const [lastStart, setLastStart] = useState<number>(() => load(LS_KEYS.timer, { lastStart: 0 }).lastStart ?? 0);
  const tickRef = useRef<number | null>(null);

  useEffect(() => save(LS_KEYS.singleFocus, singleFocus), [singleFocus]);
  useEffect(() => save(LS_KEYS.tasks, tasks), [tasks]);
  useEffect(() => save(LS_KEYS.sessions, sessions), [sessions]);
  useEffect(() => save(LS_KEYS.moods, moods), [moods]);
  useEffect(() => save(LS_KEYS.timer, { running, remaining, lastStart }), [running, remaining, lastStart]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isCmdK = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k";
      if (isCmdK) {
        e.preventDefault();
        setPaletteOpen(true);
        setPaletteInput("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (running) {
      const i = window.setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - lastStart) / 1000);
        const next = Math.max(0, DEFAULT_SECS - elapsed);
        setRemaining(next);
        if (next === 0) finishTimer();
      }, 250);
      // @ts-ignore
      tickRef.current = i;
      return () => window.clearInterval(i);
    } else if (tickRef.current) {
      window.clearInterval(tickRef.current as any);
      tickRef.current = null;
    }
  }, [running, lastStart]);

  function startTimer() {
    if (running) return;
    setLastStart(Date.now());
    setRemaining(DEFAULT_SECS);
    setRunning(true);
  }

  function pauseTimer() {
    if (!running) return;
    const now = Date.now();
    const elapsed = Math.floor((now - lastStart) / 1000);
    const next = Math.max(0, DEFAULT_SECS - elapsed);
    setRemaining(next);
    setRunning(false);
  }

  function resetTimer() {
    setRunning(false);
    setRemaining(DEFAULT_SECS);
    setLastStart(0);
  }

  function finishTimer() {
    setRunning(false);
    setRemaining(0);
    const s: Session = { id: crypto.randomUUID(), start: lastStart, end: Date.now() };
    setSessions(prev => [...prev, s]);
    setShowMood(true);
  }

  const [showMood, setShowMood] = useState(false);
  const [moodScore, setMoodScore] = useState(3);
  const [moodNote, setMoodNote] = useState("");

  function submitMood() {
    const m: Mood = { id: crypto.randomUUID(), ts: Date.now(), score: moodScore, note: moodNote };
    setMoods(prev => [...prev, m]);
    setMoodNote("");
    setMoodScore(3);
    setShowMood(false);
    resetTimer();
  }

  const peace = useMemo(() => {
    const now = Date.now();
    const focusMs = sessions
      .filter(s => s.end && isSameDay(s.start, now))
      .reduce((acc, s) => acc + ((s.end ?? now) - s.start), 0);
    const focusMin = focusMs / 60000;
    const focusScore = Math.min(focusMin / 120 * 100, 100) * 0.5;

    const completedToday = tasks.filter(t => t.done && t.completedAt && isSameDay(t.completedAt, now)).length;
    const taskScore = Math.min(completedToday / 3 * 100, 100) * 0.3;

    const todaysMoods = moods.filter(m => isSameDay(m.ts, now)).sort((a, b) => b.ts - a.ts);
    const latestMood = todaysMoods[0]?.score ?? 3;
    const moodScorePct = ((latestMood - 1) / 4) * 100;
    const moodScoreVal = moodScorePct * 0.2;

    return Math.round(focusScore + taskScore + moodScoreVal);
  }, [sessions, tasks, moods]);

  const visibleTasks = useMemo(() => {
    const open = tasks.filter(t => !t.done).sort((a, b) => a.createdAt - b.createdAt);
    return open.slice(0, 3);
  }, [tasks]);

  function addTask(title: string) {
    const trimmed = title.trim();
    if (!trimmed) return;
    const t: Task = { id: crypto.randomUUID(), title: trimmed, done: false, createdAt: Date.now() };
    setTasks(prev => [t, ...prev]);
  }

  function toggleTask(id: string) {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      const done = !t.done;
      return { ...t, done, completedAt: done ? Date.now() : undefined };
    }));
  }

  function removeTask(id: string) {
    setTasks(prev => prev.filter(t => t.id !== id));
  }

  function formatSecs(s: number) {
    const mm = Math.floor(s / 60).toString().padStart(2, "0");
    const ss = Math.floor(s % 60).toString().padStart(2, "0");
    return `${mm}:${ss}`;
  }

  const [resetDone, setResetDone] = useState(false);
  function eveningReset() {
    setResetDone(true);
    setTimeout(() => setResetDone(false), 2500);
  }

  function commitFocus() {
    if (!focusDraft.trim()) return;
    if (singleFocus && singleFocus !== focusDraft.trim()) {
      const ok = window.confirm("Change today’s Single Focus?");
      if (!ok) return;
    }
    setSingleFocus(focusDraft.trim());
    setEditingFocus(false);
  }

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-white">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">BraveThem</h1>
            <p className="text-sm text-neutral-400">{todayLabel()}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-xl border border-white/10 px-3 py-1.5 text-sm text-white/80 hover:bg-white/5"
              onClick={() => setPaletteOpen(true)}
              aria-label="Quick Capture"
            >
              ⌘K Quick Capture
            </button>
          </div>
        </header>

        <main className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <section className="rounded-2xl bg-white/5 p-4 shadow-lg ring-1 ring-white/10">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">Single Focus</h2>
              {!editingFocus && (
                <button
                  className="text-xs text-white/60 hover:text-white"
                  onClick={() => setEditingFocus(true)}
                >
                  Edit
                </button>
              )}
            </div>
            <div className="mt-3">
              {editingFocus ? (
                <div className="flex items-center gap-2">
                  <input
                    className="w-full rounded-xl bg-black/40 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-indigo-500"
                    placeholder="What matters most today?"
                    value={focusDraft}
                    onChange={(e) => setFocusDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitFocus();
                    }}
                  />
                  <button
                    className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium hover:bg-indigo-500"
                    onClick={commitFocus}
                  >
                    Set
                  </button>
                </div>
              ) : (
                <p className="text-lg leading-relaxed text-white/90">{singleFocus || "(not set)"}</p>
              )}
            </div>
          </section>

          <section className="rounded-2xl bg-white/5 p-4 shadow-lg ring-1 ring-white/10">
            <h2 className="text-lg font-medium">Focus Session</h2>
            <div className="mt-4 flex flex-col items-center">
              <div className="rounded-2xl border border-white/10 px-6 py-4 text-5xl tabular-nums">
                {formatSecs(remaining)}
              </div>
              <div className="mt-4 flex gap-2">
                {!running ? (
                  <button
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500"
                    onClick={startTimer}
                  >
                    Start
                  </button>
                ) : (
                  <button
                    className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold hover:bg-amber-500"
                    onClick={pauseTimer}
                  >
                    Pause
                  </button>
                )}
                <button
                  className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20"
                  onClick={resetTimer}
                >
                  Reset
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-white/5 p-4 shadow-lg ring-1 ring-white/10 md:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">Today’s Tasks</h2>
              <span className="text-xs text-white/60">Showing up to 3 active</span>
            </div>
            <div className="mt-3 flex gap-2">
              <input
                className="w-full rounded-xl bg-black/40 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-indigo-500"
                placeholder="Add a task and press Enter"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    addTask(newTask);
                    setNewTask("");
                  }
                }}
              />
              <button
                className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium hover:bg-indigo-500"
                onClick={() => { addTask(newTask); setNewTask(""); }}
              >
                Add
              </button>
            </div>

            <ul className="mt-4 space-y-2">
              {visibleTasks.length === 0 && (
                <li className="text-sm text-white/60">Nothing active. Capture something with ⌘/Ctrl + K.</li>
              )}
              {visibleTasks.map(t => (
                <li key={t.id} className="flex items-center justify-between rounded-xl bg-black/30 px-3 py-2 ring-1 ring-white/10">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-white/20 bg-black/40"
                      checked={t.done}
                      onChange={() => toggleTask(t.id)}
                    />
                    <span className={"text-sm " + (t.done ? "line-through text-white/50" : "text-white")}>{t.title}</span>
                  </label>
                  <button
                    className="text-xs text-white/50 hover:text-white"
                    aria-label="Remove task"
                    onClick={() => removeTask(t.id)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl bg-white/5 p-4 shadow-lg ring-1 ring-white/10">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">Peace Meter</h2>
              <button
                className="text-xs text-white/70 underline-offset-2 hover:underline"
                onClick={eveningReset}
              >
                Evening Reset
              </button>
            </div>
            <div className="mt-4">
              <div className="h-3 w-full rounded-full bg-white/10">
                <div
                  className="h-3 rounded-full bg-indigo-500 transition-all"
                  style={{ width: `${peace}%` }}
                />
              </div>
              <div className="mt-2 text-sm text-white/80">{peace}% calm</div>
              <p className="mt-1 text-xs text-white/60">Built from focus minutes, completed tasks, and your last mood check-in.</p>
            </div>
          </section>
        </main>

        {paletteOpen && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
            <div className="w-full max-w-xl rounded-2xl bg-[#121214] p-4 ring-1 ring-white/10">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-white/80">Quick Capture</h3>
                <button
                  className="text-sm text-white/60 hover:text-white"
                  onClick={() => setPaletteOpen(false)}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              <input
                autoFocus
                className="mt-3 w-full rounded-xl bg-black/40 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-indigo-500"
                placeholder="Type a task and press Enter"
                value={paletteInput}
                onChange={(e) => setPaletteInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    addTask(paletteInput);
                    setPaletteInput("");
                    setPaletteOpen(false);
                  }
                }}
              />
              <p className="mt-2 text-xs text-white/50">Tip: Press ⌘/Ctrl + K anytime</p>
            </div>
          </div>
        )}

        {showMood && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
            <div className="w-full max-w-md rounded-2xl bg-[#121214] p-4 ring-1 ring-white/10">
              <h3 className="text-base font-medium">How did that session feel?</h3>
              <div className="mt-3">
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={moodScore}
                  onChange={(e) => setMoodScore(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="mt-1 text-sm text-white/70">Mood: {moodScore} / 5</div>
              </div>
              <textarea
                className="mt-3 w-full rounded-xl bg-black/40 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-indigo-500"
                rows={3}
                placeholder="One-line note (optional)"
                value={moodNote}
                onChange={(e) => setMoodNote(e.target.value)}
              />
              <div className="mt-3 flex justify-end gap-2">
                <button className="rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/20" onClick={() => setShowMood(false)}>
                  Cancel
                </button>
                <button className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold hover:bg-indigo-500" onClick={submitMood}>
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
