import React, { useEffect, useState, useRef } from "react";

export default function TaskManagerApp() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("today");
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [sortDir, setSortDir] = useState("asc");
  const [tasks, setTasks] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [createMode, setCreateMode] = useState(null); // upload | checklist | manual
  const [form, setForm] = useState(getEmptyForm());
  const [editingId, setEditingId] = useState(null);
  const [bannerIndex, setBannerIndex] = useState(0);
  const bannerTimerRef = useRef(null);

  // Upload flow
  const [uploadStep, setUploadStep] = useState(1);
  const [uploadLines, setUploadLines] = useState("");
  const [uploadStartOption, setUploadStartOption] = useState("today");
  const [uploadStartDate, setUploadStartDate] = useState(toISODate(new Date()));
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");

  const [uploadedSchedule, setUploadedSchedule] = useState([]); // {day, title, index}
  const [selectedUploadedDay, setSelectedUploadedDay] = useState(1);

  const dragItemRef = useRef();

  useEffect(() => {
    setLoading(true);
    const saved = localStorage.getItem("tm_tasks_v2");
    if (saved) {
      setTasks(JSON.parse(saved));
      setTimeout(() => setLoading(false), 400);
      return;
    }

    const now = new Date();
    const todayStr = toISODate(now);
    const tomorrowStr = toISODate(new Date(now.getTime() + 24 * 3600 * 1000));

    const seeded = [
      { id: genId(), title: "Buy groceries", date: todayStr, category: "Personal", priority: "High", status: "today", notes: "Milk, eggs, veggies" },
      { id: genId(), title: "Team standup notes", date: todayStr, category: "Work", priority: "Medium", status: "today", notes: "Prepare updates" },
      { id: genId(), title: "Finish report", date: tomorrowStr, category: "Work", priority: "High", status: "upcoming", notes: "Quarterly sales" }
    ];

    setTasks(seeded);
    localStorage.setItem("tm_tasks_v2", JSON.stringify(seeded));
    setTimeout(() => setLoading(false), 800);
  }, []);

  useEffect(() => {
    if (!loading) localStorage.setItem("tm_tasks_v2", JSON.stringify(tasks));
  }, [tasks, loading]);

  useEffect(() => {
    const today = toISODate(new Date());
    let changed = false;
    const updated = tasks.map((t) => {
      if (t.status !== "finished" && t.date < today && t.status !== "incomplete" && t.status !== "pending") {
        changed = true;
        return { ...t, status: "incomplete", reason: t.reason || "" };
      }
      return t;
    });
    if (changed) setTasks(updated);
  }, []);

  useEffect(() => {
    resetBannerTimer();
    return () => clearInterval(bannerTimerRef.current);
  }, [tasks, selectedUploadedDay]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.ctrlKey && e.key === "n") {
        setShowCreate(true);
        setCreateMode(null);
        e.preventDefault();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  function resetBannerTimer() {
    clearInterval(bannerTimerRef.current);
    bannerTimerRef.current = setInterval(() => {
      setBannerIndex((i) => i + 1);
    }, 20000);
  }

  const todayStr = toISODate(new Date());
  const todayTasks = tasks.filter((t) => t.date === todayStr && t.status !== "finished" && t.status !== "incomplete" && t.status !== "pending");
  const pendingTasks = tasks.filter((t) => t.status === "pending");
  const upcomingTasks = tasks.filter((t) => new Date(t.date) > new Date(todayStr) && t.status !== "finished" && t.status !== "incomplete" && t.status !== "pending");
  const finishedTasks = tasks.filter((t) => t.status === "finished");
  const incompleteTasks = tasks.filter((t) => t.status === "incomplete");

  const tabMap = {
    today: todayTasks,
    pending: pendingTasks,
    upcoming: upcomingTasks,
    finished: finishedTasks,
    incomplete: incompleteTasks,
    stats: tasks
  };

  const uniqueCategories = [...new Set(tasks.map((t) => t.category).filter(Boolean))];

  let activeList = (tabMap[activeTab] || []).filter((t) => filterBySearch(t, search));

  if (filterPriority) {
    activeList = activeList.filter((t) => t.priority === filterPriority);
  }
  if (filterCategory) {
    activeList = activeList.filter((t) => t.category === filterCategory);
  }

  const priorityMap = { High: 3, Medium: 2, Low: 1 };
  activeList.sort((a, b) => {
    if (sortBy === "date") {
      const cmp = new Date(a.date) - new Date(b.date);
      return sortDir === "asc" ? cmp : -cmp;
    } else if (sortBy === "priority") {
      const cmp = priorityMap[a.priority] - priorityMap[b.priority];
      return sortDir === "asc" ? cmp : -cmp;
    }
    return 0;
  });

  const bannerItems = uploadedSchedule.length > 0
    ? uploadedSchedule.filter((s) => s.day === selectedUploadedDay).map((s) => ({ id: `u-${s.day}-${s.index}`, title: s.title, date: toISODate(new Date(new Date(uploadStartDate).getTime() + (s.day - 1) * 24 * 3600 * 1000)), notes: s.notes || "" }))
    : todayTasks;

  const bannerItemCount = Math.max(1, bannerItems.length);
  const currentBanner = bannerItems[(bannerIndex % bannerItemCount + bannerItemCount) % bannerItemCount] || null;

  const gradients = [
    "from-yellow-300 via-amber-400 to-red-400",
    "from-yellow-200 via-pink-300 to-red-400",
    "from-yellow-300 via-orange-300 to-red-300",
    "from-yellow-400 via-amber-300 to-red-300"
  ];
  const currentGradient = gradients[bannerIndex % gradients.length];

  function submitForm(e) {
    e && e.preventDefault();
    const payload = { ...form, date: form.date || todayStr };
    if (editingId) {
      setTasks((prev) => prev.map((t) => (t.id === editingId ? { ...t, ...payload } : t)));
      setEditingId(null);
      toast("Task updated");
    } else {
      const newTask = { id: genId(), ...payload, status: new Date(payload.date) > new Date(todayStr) ? "upcoming" : "today" };
      setTasks((p) => [newTask, ...p]);
      toast("Task added");
    }
    setForm(getEmptyForm());
    setShowCreate(false);
    setCreateMode(null);
    setUploadStep(1);
    setUploadLines("");
    setUploadedFileName("");
  }

  function onEdit(task) {
    setEditingId(task.id);
    setForm({ title: task.title, date: task.date, category: task.category, priority: task.priority, status: task.status, notes: task.notes || "", reason: task.reason || "", checklist: task.checklist || false, done: task.done || false, checklistItems: task.checklistItems || [] });
    setShowCreate(true);
    setCreateMode("manual");
  }

  function onDelete(id) {
    if (!confirm("Delete this task?")) return;
    setTasks((p) => p.filter((t) => t.id !== id));
    toast("Task deleted");
  }

  function onDragStart(e, task) {
    dragItemRef.current = task;
    e.dataTransfer.effectAllowed = "move";
  }
  function onDragOver(e) { e.preventDefault(); }
  function onDrop(e, newStatus) {
    e.preventDefault();
    const task = dragItemRef.current;
    if (!task) return;
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)));
    dragItemRef.current = null;
    toast("Task moved");
  }

  function markComplete(taskId) {
    setTasks((p) => p.map((t) => t.id === taskId ? { ...t, status: "finished", finishedAt: new Date().toISOString(), done: true } : t));
    toast("Marked complete");
  }

  function markIncomplete(taskId, reason) {
    setTasks((p) => p.map((t) => t.id === taskId ? { ...t, status: "incomplete", reason } : t));
    toast("Marked not completed");
  }

  function markPending(taskId, reason) {
    setTasks((p) => p.map((t) => t.id === taskId ? { ...t, status: "pending", reason } : t));
    toast("Marked pending");
  }

  function markDone(taskId, done, checklistItems = []) {
    setTasks((p) => p.map((t) => {
      if (t.id === taskId) {
        const allChecked = checklistItems.every(item => item.checked);
        return { 
          ...t, 
          done, 
          checklistItems,
          status: allChecked ? "finished" : "pending",
          finishedAt: allChecked ? new Date().toISOString() : undefined 
        };
      }
      return t;
    }));
    toast(done ? "Marked done" : "Marked undone");
  }

  function parseUpload(text) {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const parsed = [];
    lines.forEach((line, idx) => {
      const m = line.match(/^Day\s*(\d+)\s*-\s*(.+)$/i);
      if (m) parsed.push({ day: Number(m[1]), title: m[2], index: idx + 1 });
      else {
        parsed.push({ day: idx + 1, title: line, index: idx + 1 });
      }
    });
    return parsed;
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (file) {
      setUploadLoading(true);
      setUploadedFileName(file.name);
      const text = await file.text();
      setUploadLines(text);
      setUploadLoading(false);
    }
  }

  function handleUploadConfirm() {
    setUploadLoading(true);
    setTimeout(() => {
      const parsed = parseUpload(uploadLines);
      setUploadedSchedule(parsed);
      setSelectedUploadedDay(1);
      const start = uploadStartOption === "today" ? new Date() : new Date(uploadStartDate);
      const created = parsed.map((p) => {
        const d = new Date(start.getTime() + (p.day - 1) * 24 * 3600 * 1000);
        return { id: genId(), title: p.title, date: toISODate(d), category: "Uploaded", priority: "Medium", status: toISODate(d) === todayStr ? "today" : "upcoming", notes: "From upload" };
      });
      setTasks((t) => [...created, ...t]);
      setShowCreate(false);
      setUploadStep(1);
      setUploadLines("");
      setUploadedFileName("");
      setUploadLoading(false);
      toast("Uploaded schedule created");
    }, 1200);
  }

  function filterBySearch(task, q) {
    if (!q) return true;
    const lc = q.toLowerCase();
    return (task.title || "").toLowerCase().includes(lc) || (task.category || "").toLowerCase().includes(lc) || (task.notes || "").toLowerCase().includes(lc);
  }

  function toast(msg) {
    const el = document.createElement("div");
    el.className = "fixed right-4 bottom-6 bg-black/80 text-white px-4 py-2 rounded shadow-lg z-50";
    el.innerText = msg;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add("fade-away"), 10);
    setTimeout(() => el.remove(), 2200);
  }

  return (
    <div className="min-h-screen bg-white text-slate-800 p-4 sm:p-8">
      {loading && (
        <div className="fixed inset-0 flex items-center justify-center bg-white z-40">
          <div className="animate-pulse text-2xl font-semibold">Loading tasks...</div>
        </div>
      )}

      {/* Logo */}
      <div className="flex items-center justify-center mb-6">
        <h1 className="text-4xl font-bold" style={{ fontFamily: 'Arial Black', background: 'linear-gradient(to right, #FFD86B, #FF6B6B)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>TM</h1>
      </div>

      {/* Banner */}
      <header className="w-full mb-6">
        <div className="w-full h-[300px] rounded-lg overflow-hidden relative shadow">
          <div className={`absolute inset-0 bg-gradient-to-br ${currentGradient} transition-all duration-600 flex`}>
            <div className="flex-1 p-6 flex flex-col justify-center">
              <div className="text-white drop-shadow-lg">
                <h1 className="text-4xl font-extrabold">Welcome secretos 👋</h1>
                <p className="mt-2 opacity-90">Here are your tasks for <strong>{todayStr}</strong></p>

                <div className="mt-6 bg-white/20 rounded p-4 max-w-3xl">
                  {currentBanner ? (
                    <>
                      <div className="text-sm uppercase">Featured</div>
                      <div className="text-2xl font-semibold mt-1">{currentBanner.title}</div>
                      <div className="text-sm mt-1 opacity-90">{currentBanner.notes || currentBanner.date}</div>
                    </>
                  ) : (
                    <div className="text-lg">No tasks for today — add one to get started.</div>
                  )}
                </div>

                {bannerItemCount > 1 && (
                  <div className="mt-3 text-sm italic">You have {bannerItemCount} tasks today — carousel will rotate every 20s</div>
                )}
              </div>
            </div>

            {uploadedSchedule.length > 0 && (
              <div className="w-24 flex flex-col items-center justify-center gap-2 p-3">
                <div className="text-white text-sm">Days</div>
                <div className="flex flex-col gap-2 mt-2">
                  {Array.from({ length: Math.max(...uploadedSchedule.map(s => s.day)) }).map((_, i) => {
                    const day = i + 1;
                    return (
                      <button key={day} onClick={() => { setSelectedUploadedDay(day); setBannerIndex(0); }} className={`w-10 h-10 rounded-md text-sm font-semibold ${selectedUploadedDay === day ? "scale-110 bg-white/30" : "bg-white/10"}`}>
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Search + Filters + Add */}
      <div className="flex flex-col sm:flex-row items-center gap-3 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tasks..."
          className="px-3 py-2 border rounded w-full sm:w-1/3 shadow"
        />
        <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="px-3 py-2 border rounded w-full sm:w-auto">
          <option value="">All priorities</option>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="px-3 py-2 border rounded w-full sm:w-auto">
          <option value="">All categories</option>
          {uniqueCategories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
        </select>
        <select value={`${sortBy}-${sortDir}`} onChange={(e) => {
          const [by, dir] = e.target.value.split("-");
          setSortBy(by);
          setSortDir(dir);
        }} className="px-3 py-2 border rounded w-full sm:w-auto">
          <option value="date-asc">Date asc</option>
          <option value="date-desc">Date desc</option>
          <option value="priority-desc">Priority high first</option>
          <option value="priority-asc">Priority low first</option>
        </select>
        <button
          onClick={() => { setShowCreate(true); setCreateMode(null); }}
          className="px-5 py-2 rounded bg-gradient-to-r from-yellow-300 to-red-400 text-white font-bold shadow w-full sm:w-auto"
        >
          + Add Task
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-white rounded shadow p-2 mb-4">
        {renderTab("today", "Today tasks", todayTasks)}
        {renderTab("pending", "Pending", pendingTasks)}
        {renderTab("upcoming", "Upcoming", upcomingTasks)}
        {renderTab("finished", "Finished", finishedTasks)}
        {renderTab("incomplete", "Incomplete", incompleteTasks)}
        {renderTab("stats", "Stats", [])}
      </div>

      {/* Main layout */}
      <main className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <section className="md:col-span-2">
          <div className="bg-white rounded shadow p-4 min-h-[300px]" onDragOver={onDragOver} onDrop={(e) => onDrop(e, activeTab)}>
            <h2 className="text-lg font-semibold mb-2 capitalize">{labelForTab(activeTab)}</h2>

            {activeTab === "stats" ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded shadow p-4 text-center">
                  <h3 className="font-semibold">Total Tasks</h3>
                  <div className="text-4xl font-bold">{tasks.length}</div>
                </div>
                <div className="bg-white rounded shadow p-4 text-center">
                  <h3 className="font-semibold">Incomplete Tasks</h3>
                  <div className="text-4xl font-bold">{incompleteTasks.length}</div>
                </div>
              </div>
            ) : activeList.length === 0 ? (
              <div className="text-center py-12 text-slate-400">No tasks here</div>
            ) : (
              <div className="space-y-3">
                {activeList.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    activeTab={activeTab}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    markComplete={markComplete}
                    markIncomplete={markIncomplete}
                    markPending={markPending}
                    markDone={markDone}
                    onDragStart={onDragStart}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="bg-white rounded shadow p-4">
            <h3 className="font-semibold">Task Summary</h3>
            <div className="mt-3 grid grid-cols-2 gap-4">
              <div className="bg-white rounded shadow p-4 text-center">
                <h3 className="font-semibold">Completed</h3>
                <div className="text-2xl font-bold">{finishedTasks.length}</div>
              </div>
              <div className="bg-white rounded shadow p-4 text-center">
                <h3 className="font-semibold">Incomplete</h3>
                <div className="text-2xl font-bold">{incompleteTasks.length}</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded shadow p-4">
            <h3 className="font-semibold">Today preview</h3>
            <div className="mt-2 space-y-2">
              {todayTasks.slice(0, 3).map((t) => (
                <div key={t.id} className="p-2 rounded" style={{ background: 'linear-gradient(90deg,#FFD86B, #FF6B6B)' }}>{t.title}</div>
              ))}
              {todayTasks.length === 0 && <div className="text-sm text-slate-400">No tasks today</div>}
            </div>
          </div>
        </aside>
      </main>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white/95 p-6 rounded-lg shadow max-w-2xl w-full relative">
            <button onClick={() => { setShowCreate(false); setCreateMode(null); setUploadStep(1); setUploadLines(""); setUploadedFileName(""); }} className="absolute top-2 right-2 text-xl">✕</button>

            {/* chooser */}
            {!createMode && (
              <div>
                <h3 className="text-xl font-bold mb-4">Add task — choose an option</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button onClick={() => { setCreateMode("upload"); setUploadStep(1); }} className="p-4 bg-gradient-to-r from-blue-400 to-indigo-500 rounded text-white font-semibold">Upload file</button>
                  <button onClick={() => setCreateMode("checklist")} className="p-4 bg-gradient-to-r from-yellow-300 to-red-400 rounded text-white font-semibold">Checklist</button>
                  <button onClick={() => setCreateMode("manual")} className="p-4 bg-gradient-to-r from-yellow-300 to-red-400 rounded text-white font-semibold">Add manual task</button>
                </div>
              </div>
            )}

            {/* upload slides */}
            {createMode === "upload" && (
              <div className="p-4">
                <div className="rounded p-4" style={{ background: 'linear-gradient(90deg,#dbeafe,#bfdbfe)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-semibold">Upload schedule — Step {uploadStep} / 3</div>
                    <div className="text-sm opacity-80">Preview how the file must look</div>
                  </div>

                  {uploadStep === 1 && (
                    <div>
                      <p className="mb-2">Example lines:</p>
                      <pre className="p-3 bg-white rounded">Day1 - Morning standup\nDay1 - Review PR\nDay2 - Prepare slides</pre>
                      <div className="mt-3 flex justify-end gap-2">
                        <button className="px-3 py-2 rounded border" onClick={() => setUploadStep(2)}>Next</button>
                        <button className="px-3 py-2 rounded text-sm" onClick={() => setUploadStep(2)}>Skip</button>
                      </div>
                    </div>
                  )}

                  {uploadStep === 2 && (
                    <div>
                      <p className="mb-2">How data maps to days — you can edit later.</p>
                      <pre className="p-3 bg-white rounded">Day1 - TaskA\nDay2 - TaskB</pre>
                      <div className="mt-3 flex justify-between">
                        <button className="px-3 py-2 rounded border" onClick={() => setUploadStep(1)}>Back</button>
                        <div>
                          <button className="px-3 py-2 rounded border mr-2" onClick={() => setUploadStep(3)}>Next</button>
                          <button className="px-3 py-2 rounded text-sm" onClick={() => setUploadStep(3)}>Skip</button>
                        </div>
                      </div>
                    </div>
                  )}

                  {uploadStep === 3 && (
                    <div>
                      <p className="mb-2">Upload .txt, .csv, .pdf, .doc file or paste content</p>
                      <div className="flex items-center gap-2 mb-2">
                        <button className="px-3 py-2 rounded border" onClick={() => document.getElementById('file-upload').click()}>Choose File</button>
                        <input id="file-upload" type="file" accept=".txt,.csv,.pdf,.doc,.docx" onChange={handleFileUpload} className="hidden" />
                        <span className="text-sm">{uploadedFileName || "No file chosen"}</span>
                      </div>
                      {uploadLoading && <div className="animate-pulse">Loading file...</div>}
                      <textarea value={uploadLines} onChange={(e) => setUploadLines(e.target.value)} className="w-full p-2 rounded border" rows={6} placeholder={'Day1 - Task A\nDay1 - Task B\nDay2 - Task C'} />

                      <div className="mt-3 flex items-center gap-3">
                        <label className="flex items-center gap-2"><input type="radio" checked={uploadStartOption === 'today'} onChange={() => setUploadStartOption('today')} /> Start from today</label>
                        <label className="flex items-center gap-2"><input type="radio" checked={uploadStartOption === 'date'} onChange={() => setUploadStartOption('date')} /> Start from date</label>
                        {uploadStartOption === 'date' && <input type="date" className="border p-1" value={uploadStartDate} onChange={(e) => setUploadStartDate(e.target.value)} />}
                      </div>

                      <div className="mt-4 flex justify-end gap-2">
                        <button className="px-3 py-2 rounded border" onClick={() => setUploadStep(2)}>Back</button>
                        <button className="px-3 py-2 rounded bg-gradient-to-r from-blue-500 to-indigo-600 text-white" onClick={handleUploadConfirm} disabled={uploadLoading}>
                          {uploadLoading ? "Loading..." : "Upload"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* checklist */}
            {createMode === "checklist" && (
              <div>
                <h3 className="font-semibold mb-2">Checklist (each line is a subtask of one task)</h3>
                <Checklist onCreate={(items) => {
                  const newTask = { 
                    id: genId(), 
                    title: "Checklist Task", 
                    date: todayStr, 
                    category: "Checklist", 
                    priority: "Low", 
                    status: "today", 
                    notes: "", 
                    checklist: true, 
                    checklistItems: items.map(item => ({ text: item, checked: false })),
                    done: false 
                  };
                  setTasks((p) => [newTask, ...p]);
                  setShowCreate(false);
                  toast("Checklist task created");
                }} />
              </div>
            )}

            {/* manual */}
            {createMode === "manual" && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xl font-bold">Add manual task</h3>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="border p-1 rounded" />
                </div>
                <form onSubmit={submitForm} className="space-y-3">
                  <input required placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="px-3 py-2 border rounded w-full" />
                  <input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="px-3 py-2 border rounded w-full" />
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="px-3 py-2 border rounded w-full">
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                  <textarea placeholder="Notes / Subtasks" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full p-2 border rounded" rows={4}></textarea>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={form.checklist || false} onChange={(e) => setForm({ ...form, checklist: e.target.checked })} />
                    Is checklist
                  </label>
                  {form.checklist && (
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={form.done || false} onChange={(e) => setForm({ ...form, done: e.target.checked })} />
                      Done
                    </label>
                  )}

                  <div className="flex items-center gap-2 justify-end">
                    <button type="button" onClick={() => { setShowCreate(false); setCreateMode(null); }} className="px-4 py-2 border rounded">Cancel</button>
                    <button type="submit" className="px-4 py-2 rounded bg-gradient-to-r from-yellow-300 to-red-400 text-white">Save</button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      <footer className="mt-8 text-center text-xs text-slate-400">Demo Task Manager — updated UI & behaviors</footer>
    </div>
  );

  function renderTab(key, label, list) {
    return (
      <button key={key} onClick={() => setActiveTab(key)} className={`px-3 py-2 rounded-md ${activeTab === key ? 'bg-slate-100' : 'bg-white'}`}>
        <div className="flex items-center gap-2">
          <div className="text-sm">{label}</div>
          {list.length > 0 && <span className="w-2 h-2 rounded-full bg-red-500" />}
        </div>
      </button>
    );
  }
}

function TaskCard({ task, activeTab, onEdit, onDelete, markComplete, markIncomplete, markPending, markDone, onDragStart }) {
  const [showInput, setShowInput] = useState(false);
  const [reasonType, setReasonType] = useState(task.status);
  const [inputVal, setInputVal] = useState(task.reason || "");
  const [checklistItems, setChecklistItems] = useState(task.checklistItems || []);

  const handleAddReason = () => {
    if (inputVal) {
      if (reasonType === "incomplete") {
        markIncomplete(task.id, inputVal);
      } else if (reasonType === "pending") {
        markPending(task.id, inputVal);
      }
      setInputVal("");
      setShowInput(false);
    }
  };

  const handleChecklistChange = (index, checked) => {
    const updatedItems = checklistItems.map((item, i) => 
      i === index ? { ...item, checked } : item
    );
    setChecklistItems(updatedItems);
    markDone(task.id, updatedItems.every(item => item.checked), updatedItems);
  };

  const isFinished = task.status === "finished";
  const isIncomplete = task.status === "incomplete";
  const bgStyle = isFinished ? { background: 'linear-gradient(90deg, #4ade80, #86efac)' } : isIncomplete ? { background: 'linear-gradient(90deg, #bef264, #d9f99d)' } : { background: 'linear-gradient(90deg, #FFD86B, #FF6B6B)' };

  return (
    <div draggable onDragStart={(e) => onDragStart(e, task)} className={`p-3 rounded-lg shadow flex items-start gap-3 relative`} style={bgStyle}>
      <div className="flex-1">
        <div className="flex items-center justify-between gap-2">
          <div>
            {task.checklist ? (
              <div className="space-y-2">
                <div className="font-semibold">{task.title}</div>
                {checklistItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={item.checked || false} 
                      onChange={(e) => handleChecklistChange(i, e.target.checked)} 
                    />
                    <div className={`text-sm ${item.checked ? 'line-through' : ''}`}>{item.text}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="font-semibold">{task.title}</div>
            )}
            <div className="text-xs opacity-90">{task.category} • {task.date} • {task.priority}</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onEdit(task)} title="Edit" className="p-1 rounded bg-white/30">✎</button>
            {["today", "pending", "upcoming"].includes(activeTab) && <button onClick={() => onDelete(task.id)} title="Delete" className="p-1 rounded bg-white/30">🗑</button>}
          </div>
        </div>

        <div className="mt-2 text-sm">{task.notes}</div>
        {task.reason && <div className="mt-2 text-xs bg-white/30 p-2 rounded">Reason: {task.reason}</div>}

        {!showInput && ["incomplete", "pending"].includes(activeTab) && (
          <div className="mt-2">
            {task.reason ? (
              <button onClick={() => { setInputVal(task.reason); setShowInput(true); }} className="text-xs underline">Edit reason</button>
            ) : (
              <button onClick={() => setShowInput(true)} className="text-xs underline">Add reason</button>
            )}
          </div>
        )}
      </div>

      {activeTab === "today" && !isFinished && !isIncomplete && !task.checklist && (
        <div className="flex flex-col gap-2">
          <button onClick={() => markComplete(task.id)} className="p-2 rounded-full bg-white/70">👍</button>
          <button onClick={() => { setReasonType("incomplete"); setShowInput(true); }} className="p-2 rounded-full bg-white/70">👎</button>
          <button onClick={() => { setReasonType("pending"); setShowInput(true); }} className="p-2 rounded-full bg-white/70">➖</button>
        </div>
      )}

      {isFinished && (
        <div className="absolute bottom-2 right-2 bg-green-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs">✔</div>
      )}

      {showInput && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white/95 p-6 rounded-lg shadow max-w-md w-full">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Add Reason for {reasonType}</h3>
              <button onClick={() => setShowInput(false)} className="text-xl">✕</button>
            </div>
            <input 
              value={inputVal} 
              onChange={(e) => setInputVal(e.target.value)} 
              className="w-full p-2 border rounded mb-3" 
              placeholder="Enter reason..." 
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowInput(false)} className="px-3 py-2 rounded border">Cancel</button>
              <button onClick={handleAddReason} className="px-3 py-2 rounded bg-blue-500 text-white">Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Checklist({ onCreate }) {
  const [items, setItems] = useState([""]);
  return (
    <div>
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input value={it} onChange={(e) => setItems((p) => p.map((x, idx) => (idx === i ? e.target.value : x)))} className="flex-1 px-2 py-1 border rounded" placeholder={`Subtask ${i + 1}`} />
            <button onClick={() => setItems((p) => p.filter((_, idx) => idx !== i))} className="px-2 py-1 border rounded">X</button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2 justify-end">
        <button onClick={() => setItems((p) => [...p, ""])} className="px-3 py-1 rounded border">Add subtask</button>
        <button onClick={() => onCreate(items.filter(Boolean))} className="px-3 py-1 rounded bg-gradient-to-r from-yellow-300 to-red-400 text-white">Create checklist</button>
      </div>
    </div>
  );
}

function getEmptyForm() { 
  return { 
    title: "", 
    date: "", 
    category: "", 
    priority: "Medium", 
    status: "today", 
    notes: "", 
    reason: "", 
    checklist: false, 
    done: false,
    checklistItems: []
  }; 
}
function genId() { return Math.random().toString(36).substring(2, 9); }
function toISODate(d) { return new Date(d).toISOString().split("T")[0]; }
function labelForTab(tab) { return tab.charAt(0).toUpperCase() + tab.slice(1); }
