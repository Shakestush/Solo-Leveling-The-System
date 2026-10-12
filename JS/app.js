(function(){
"use strict";

const STORAGE_KEY = "the_system_save_v1";
const RANK_TAGS = ["E","D","C","B","A","S"];
const RANK_XP = {E:10,D:25,C:50,B:100,A:200,S:400};
const DEFAULT_DAILIES = [
  {id:"pushups", name:"Push-ups", target:100, step:10},
  {id:"situps", name:"Sit-ups", target:100, step:10},
  {id:"squats", name:"Squats", target:100, step:10},
  {id:"run", name:"Run", target:10, step:1, unit:"km"},
];
const TITLE_RULES = [
  {id:"awakened", label:"Awakened", check: s => true},
  {id:"novice", label:"Novice Hunter", check: s => s.level >= 10},
  {id:"iron_will", label:"Iron Will", check: s => s.level >= 20},
  {id:"veteran", label:"Veteran Hunter", check: s => s.level >= 35},
  {id:"monarch", label:"Monarch", check: s => s.level >= 50},
  {id:"disciplined", label:"Disciplined", check: s => s.dailyStreak >= 7},
  {id:"unbroken", label:"Unbroken", check: s => s.dailyStreak >= 30},
  {id:"dungeon_breaker", label:"Dungeon Breaker", check: s => s.dungeonsCleared >= 1},
  {id:"gatekeeper", label:"Gatekeeper", check: s => s.dungeonsCleared >= 5},
];

function todayStr(){
  const d = new Date();
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
function xpForLevel(level){ return Math.round(100*Math.pow(level,1.4)); }
function rankForLevel(level){
  if(level>=50) return "S"; if(level>=40) return "A"; if(level>=30) return "B";
  if(level>=20) return "C"; if(level>=10) return "D"; return "E";
}
const RANK_NAMES = {E:"E-Rank Hunter",D:"D-Rank Hunter",C:"C-Rank Hunter",B:"B-Rank Hunter",A:"A-Rank Hunter",S:"S-Rank Hunter"};

function defaultState(){
  return {
    name: "Player",
    level: 1, xp: 0,
    stats: {str:10, vit:10, agi:10, int:10, per:10},
    statPoints: 0,
    equippedTitle: "awakened",
    unlockedTitles: ["awakened"],
    dailyStreak: 0,
    dungeonsCleared: 0,
    lastDailyReset: todayStr(),
    penaltyToday: false,
    dailies: DEFAULT_DAILIES.map(d => ({...d, base:d.target, current:0, done:false})),
    sideQuests: [],
    dungeons: [],
    log: [],
    booted: false,
  };
}

function effectiveTarget(d){
  return Math.ceil((d.base != null ? d.base : d.target) * (state.penaltyToday ? 1.2 : 1));
}

let state = null;

function load(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw) return JSON.parse(raw);
  }catch(e){ console.error("Load failed", e); }
  return null;
}
function save(){
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch(e){ console.error("Save failed", e); }
}

function addLog(text, type){
  state.log.unshift({text, type: type||"info", ts: Date.now()});
  state.log = state.log.slice(0, 60);
}

function checkTitles(){
  TITLE_RULES.forEach(rule=>{
    if(rule.check(state) && !state.unlockedTitles.includes(rule.id)){
      state.unlockedTitles.push(rule.id);
      addLog(`Title unlocked: "${rule.label}"`, "levelup");
    }
  });
}

function gainXP(amount, reason){
  state.xp += amount;
  addLog(`+${amount} XP — ${reason}`, "quest");
  let leveledUp = false, pointsGained = 0;
  while(state.xp >= xpForLevel(state.level)){
    state.xp -= xpForLevel(state.level);
    state.level += 1;
    state.statPoints += 3;
    pointsGained += 3;
    leveledUp = true;
  }
  if(leveledUp){
    checkTitles();
    save();
    render();
    showLevelUp(pointsGained);
  }
  checkTitles();
}

function showLevelUp(points){
  document.getElementById("levelupLevel").textContent = "LEVEL " + state.level;
  document.getElementById("levelupSub").textContent = `+${points} stat points awarded`;
  document.getElementById("levelup-flash").classList.add("show");
}

/* ---------- daily reset / penalty ---------- */
function checkDailyReset(){
  const today = todayStr();
  if(state.lastDailyReset === today) return;

  const allDone = state.dailies.every(d => d.done);
  if(allDone){
    state.dailyStreak += 1;
    addLog(`Daily Quest cleared. Streak: ${state.dailyStreak} days.`, "quest");
  } else {
    state.dailyStreak = 0;
    addLog("Daily Quest incomplete. Penalty applied — today's targets are raised 20%.", "penalty");
  }
  state.penaltyToday = !allDone;
  state.dailies = state.dailies.map(d => ({ ...d, current:0, done:false }));
  state.lastDailyReset = today;
  checkTitles();
  save();
}

/* ============ RENDER ============ */
function render(){
  document.getElementById("hunterName").textContent = state.name;
  document.getElementById("hunterLevel").textContent = "Level " + state.level;
  const rank = rankForLevel(state.level);
  document.getElementById("rankBadge").textContent = rank;
  document.getElementById("rankLabel").textContent = RANK_NAMES[rank];

  const need = xpForLevel(state.level);
  document.getElementById("xpFill").style.width = Math.min(100, (state.xp/need)*100) + "%";
  document.getElementById("xpLabel").textContent = `${state.xp} / ${need} XP`;

  const titleRule = TITLE_RULES.find(t=>t.id===state.equippedTitle);
  document.getElementById("hunterTitle").textContent = titleRule ? "《 " + titleRule.label + " 》" : "";

  document.getElementById("statPointPill").style.display = state.statPoints > 0 ? "block" : "none";

  // penalty banner
  const banner = document.getElementById("penaltyBanner");
  if(state.penaltyToday){
    banner.style.display = "flex";
    banner.className = "penalty-banner";
    banner.textContent = "PENALTY ZONE — yesterday's Daily Quest was incomplete. Today's targets are raised.";
  } else {
    banner.style.display = "none";
  }

  // stats
  const statLabels = {str:"STRENGTH",vit:"VITALITY",agi:"AGILITY",int:"INTELLIGENCE",per:"PERCEPTION"};
  const statsList = document.getElementById("statsList");
  statsList.innerHTML = "";
  Object.keys(statLabels).forEach(key=>{
    const row = document.createElement("div");
    row.className = "stat-row";
    row.innerHTML = `
      <div class="stat-name">${statLabels[key]}</div>
      <div class="stat-val-row">
        <div class="stat-val">${state.stats[key]}</div>
        <button class="stat-plus" data-stat="${key}" ${state.statPoints<=0?"disabled":""}>+</button>
      </div>`;
    statsList.appendChild(row);
  });

  // title select
  const sel = document.getElementById("titleSelect");
  sel.innerHTML = "";
  state.unlockedTitles.forEach(id=>{
    const rule = TITLE_RULES.find(t=>t.id===id);
    if(!rule) return;
    const opt = document.createElement("option");
    opt.value = id; opt.textContent = rule.label;
    if(id === state.equippedTitle) opt.selected = true;
    sel.appendChild(opt);
  });

  // dailies
  const dailyList = document.getElementById("dailyList");
  dailyList.innerHTML = "";
  state.dailies.forEach(d=>{
    const target = effectiveTarget(d);
    const pct = Math.min(100, (d.current/target)*100);
    const row = document.createElement("div");
    row.className = "quest";
    row.innerHTML = `
      <div class="quest-top">
        <div class="quest-name ${d.done?'done':''}">${d.name}</div>
        <div class="quest-xp">${d.done ? "CLEAR" : ""}</div>
      </div>
      <div class="stepper">
        <button data-daily="${d.id}" data-delta="-${d.step}">−</button>
        <div class="stepper-track"><div class="stepper-fill" style="width:${pct}%"></div></div>
        <button data-daily="${d.id}" data-delta="${d.step}">+</button>
        <div class="stepper-count">${d.current}/${target}${d.unit||""}</div>
      </div>`;
    dailyList.appendChild(row);
  });

  // side quests
  const sideList = document.getElementById("sideList");
  sideList.innerHTML = "";
  if(state.sideQuests.length===0){
    sideList.innerHTML = `<div class="empty-note">No side quests yet. Add a task below.</div>`;
  }
  state.sideQuests.slice().reverse().forEach(q=>{
    const row = document.createElement("div");
    row.className = "side-quest";
    row.innerHTML = `
      <div class="check ${q.done?'on':''}" data-side-toggle="${q.id}">${q.done?'✓':''}</div>
      <div class="title ${q.done?'done':''}">${q.title}</div>
      <div class="rank-tag ${q.rank}">${q.rank}</div>
      <button class="del-btn" data-side-del="${q.id}">×</button>`;
    sideList.appendChild(row);
  });

  // dungeons
  const dList = document.getElementById("dungeonList");
  dList.innerHTML = "";
  document.getElementById("dungeonEmpty").style.display = state.dungeons.length?"none":"block";
  state.dungeons.slice().reverse().forEach(dg=>{
    const doneCount = dg.objectives.filter(o=>o.done).length;
    const pct = dg.objectives.length ? (doneCount/dg.objectives.length)*100 : 0;
    const card = document.createElement("div");
    card.className = "dungeon-card " + (dg.status==="cleared"?"cleared":dg.status==="failed"?"failed":"");
    const objHtml = dg.objectives.map(o=>`
      <div class="dungeon-obj ${o.done?'done':''}" data-dungeon-obj="${dg.id}|${o.id}">
        <div class="check ${o.done?'on':''}" style="width:15px;height:15px;">${o.done?'✓':''}</div>
        ${o.text}
      </div>`).join("");
    let statusHtml = "";
    if(dg.status==="cleared") statusHtml = `<div class="dungeon-status cleared">◆ DUNGEON CLEARED</div>`;
    else if(dg.status==="failed") statusHtml = `<div class="dungeon-status failed">◆ DUNGEON BREAK — gate closed</div>`;
    else statusHtml = `<div class="dungeon-status">◆ IN PROGRESS</div>`;
    const canClaim = dg.status==="active" && doneCount===dg.objectives.length && dg.objectives.length>0;
    card.innerHTML = `
      <div class="dungeon-head">
        <div class="dungeon-title">${dg.title}</div>
        <div class="dungeon-deadline">${dg.deadline||"no deadline"}</div>
      </div>
      ${objHtml}
      <div class="dungeon-progress"><div class="dungeon-progress-fill" style="width:${pct}%"></div></div>
      ${statusHtml}
      ${canClaim ? `<button class="claim-btn" data-claim="${dg.id}">CLAIM CLEAR — +300 XP</button>` : ""}
    `;
    dList.appendChild(card);
  });

  // log
  const logList = document.getElementById("logList");
  logList.innerHTML = "";
  if(state.log.length===0){
    logList.innerHTML = `<div class="empty-note">System log is empty.</div>`;
  }
  state.log.slice(0,25).forEach(entry=>{
    const row = document.createElement("div");
    row.className = "log-item";
    const t = new Date(entry.ts);
    const timeStr = t.toLocaleDateString(undefined,{month:"short",day:"numeric"}) + " " +
      t.toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"});
    row.innerHTML = `<div class="log-dot ${entry.type}"></div>
      <div style="flex:1;"><div class="log-text">${entry.text}</div><div class="log-time">${timeStr}</div></div>`;
    logList.appendChild(row);
  });
}

/* ============ EVENT WIRING ============ */
function wireEvents(){
  document.getElementById("statsList").addEventListener("click", e=>{
    const btn = e.target.closest("[data-stat]");
    if(!btn || btn.disabled) return;
    const stat = btn.dataset.stat;
    if(state.statPoints<=0) return;
    state.stats[stat] += 1;
    state.statPoints -= 1;
    save(); render();
  });

  document.getElementById("titleSelect").addEventListener("change", e=>{
    state.equippedTitle = e.target.value;
    save(); render();
  });

  document.getElementById("dailyList").addEventListener("click", e=>{
    const btn = e.target.closest("[data-daily]");
    if(!btn) return;
    const id = btn.dataset.daily, delta = parseInt(btn.dataset.delta,10);
    const d = state.dailies.find(x=>x.id===id);
    if(!d) return;
    const wasDone = d.done;
    const target = effectiveTarget(d);
    d.current = Math.max(0, Math.min(target, d.current+delta));
    d.done = d.current >= target;
    if(d.done && !wasDone){
      gainXP(5, `${d.name} complete`);
    }
    save(); render();
  });

  document.getElementById("sideAdd").addEventListener("click", addSideQuest);
  document.getElementById("sideInput").addEventListener("keydown", e=>{ if(e.key==="Enter") addSideQuest(); });
  function addSideQuest(){
    const input = document.getElementById("sideInput");
    const title = input.value.trim();
    if(!title) return;
    const rank = document.getElementById("sideRank").value;
    state.sideQuests.push({id:uid(), title, rank, xp:RANK_XP[rank], done:false});
    input.value = "";
    save(); render();
  }

  document.getElementById("sideList").addEventListener("click", e=>{
    const toggle = e.target.closest("[data-side-toggle]");
    const del = e.target.closest("[data-side-del]");
    if(toggle){
      const q = state.sideQuests.find(x=>x.id===toggle.dataset.sideToggle);
      if(q && !q.done){
        q.done = true;
        gainXP(q.xp, `"${q.title}" cleared`);
      }
      save(); render();
    } else if(del){
      state.sideQuests = state.sideQuests.filter(x=>x.id!==del.dataset.sideDel);
      save(); render();
    }
  });

  let pendingObjectives = [];
  function renderObjRows(){
    const wrap = document.getElementById("objRows");
    wrap.innerHTML = pendingObjectives.map((o,i)=>`
      <div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:12px;color:var(--ink-soft);">
        <span style="flex:1;">• ${o}</span>
        <button class="del-btn" data-remove-obj="${i}">×</button>
      </div>`).join("");
  }
  document.getElementById("objRows").addEventListener("click", e=>{
    const btn = e.target.closest("[data-remove-obj]");
    if(!btn) return;
    pendingObjectives.splice(parseInt(btn.dataset.removeObj,10),1);
    renderObjRows();
  });
  document.getElementById("objInput").addEventListener("keydown", e=>{
    if(e.key==="Enter"){
      const val = e.target.value.trim();
      if(val){ pendingObjectives.push(val); e.target.value=""; renderObjRows(); }
    }
  });

  document.getElementById("dungeonCreate").addEventListener("click", ()=>{
    const title = document.getElementById("dungeonTitle").value.trim();
    const deadline = document.getElementById("dungeonDeadline").value;
    if(!title || pendingObjectives.length===0){
      alert("Give the dungeon a name and at least one objective.");
      return;
    }
    state.dungeons.push({
      id: uid(), title, deadline, status:"active",
      objectives: pendingObjectives.map(text=>({id:uid(), text, done:false}))
    });
    addLog(`Gate opened: "${title}"`, "info");
    pendingObjectives = [];
    document.getElementById("dungeonTitle").value = "";
    document.getElementById("dungeonDeadline").value = "";
    renderObjRows();
    save(); render();
  });

  document.getElementById("dungeonList").addEventListener("click", e=>{
    const objBtn = e.target.closest("[data-dungeon-obj]");
    const claimBtn = e.target.closest("[data-claim]");
    if(objBtn){
      const [dgId, objId] = objBtn.dataset.dungeonObj.split("|");
      const dg = state.dungeons.find(x=>x.id===dgId);
      const obj = dg && dg.objectives.find(o=>o.id===objId);
      if(obj){ obj.done = !obj.done; save(); render(); }
    } else if(claimBtn){
      const dg = state.dungeons.find(x=>x.id===claimBtn.dataset.claim);
      if(dg){
        dg.status = "cleared";
        state.dungeonsCleared += 1;
        addLog(`Dungeon cleared: "${dg.title}"`, "levelup");
        checkTitles();
        gainXP(300, `"${dg.title}" dungeon cleared`);
        save(); render();
      }
    }
  });

  document.getElementById("levelupClose").addEventListener("click", ()=>{
    document.getElementById("levelup-flash").classList.remove("show");
  });

  document.getElementById("settingsBtn").addEventListener("click", ()=>{
    document.getElementById("settingsOverlay").classList.add("show");
  });
  document.getElementById("settingsClose").addEventListener("click", ()=>{
    document.getElementById("settingsOverlay").classList.remove("show");
  });
  document.getElementById("exportBtn").addEventListener("click", ()=>{
    const blob = new Blob([JSON.stringify(state,null,2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `the-system-save-${state.name.replace(/\s+/g,'_')}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
  document.getElementById("importBtn").addEventListener("click", ()=>{
    document.getElementById("importFile").click();
  });
  document.getElementById("importFile").addEventListener("change", e=>{
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = evt=>{
      try{
        const imported = JSON.parse(evt.target.result);
        if(!imported || typeof imported.level !== "number"){ throw new Error("bad file"); }
        state = imported;
        save(); render();
        document.getElementById("settingsOverlay").classList.remove("show");
        addLog("Save file imported.", "info");
        save();
      }catch(err){
        alert("That doesn't look like a valid System save file.");
      }
    };
    reader.readAsText(file);
  });
  document.getElementById("resetBtn").addEventListener("click", ()=>{
    if(confirm("This deletes all System data in this browser permanently. Continue?")){
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    }
  });
}

/* ============ BOOT SEQUENCE ============ */
function runBoot(onComplete){
  const lines = [
    "...",
    "A new hunter has been detected.",
    "Analyzing potential.",
    "You have qualified to become a Player.",
    "Will you accept?",
  ];
  const container = document.getElementById("bootLines");
  let i = 0;
  function next(){
    if(i < lines.length){
      const p = document.createElement("div");
      p.className = "boot-line";
      p.textContent = lines[i];
      container.appendChild(p);
      requestAnimationFrame(()=>p.classList.add("show"));
      i++;
      setTimeout(next, 900);
    } else {
      showNameEntry();
    }
  }
  function showNameEntry(){
    const wrap = document.createElement("div");
    wrap.className = "boot-name-entry";
    wrap.innerHTML = `
      <input type="text" id="nameInput" placeholder="ENTER YOUR NAME" maxlength="20">
      <div><button class="boot-btn" id="acceptBtn" disabled>ACCEPT</button></div>
    `;
    container.appendChild(wrap);
    requestAnimationFrame(()=>wrap.classList.add("show"));
    const input = document.getElementById("nameInput");
    const btn = document.getElementById("acceptBtn");
    input.addEventListener("input", ()=>{ btn.disabled = input.value.trim().length===0; });
    input.focus();
    const accept = ()=>{
      if(input.value.trim().length===0) return;
      onComplete(input.value.trim());
    };
    btn.addEventListener("click", accept);
    input.addEventListener("keydown", e=>{ if(e.key==="Enter") accept(); });
  }
  next();
}

/* ============ PUBLIC API FOR DASHBOARD MODULES ============ */
window.SYSTEM_API = {
  getState: () => state,
  save: () => save(),
  render: () => render(),
  addLog: (text, type) => { addLog(text, type); save(); render(); },
  replaceState: (nextState) => { state = nextState; save(); render(); },
  defaultState: () => defaultState(),
  today: () => todayStr(),
  xpForLevel: (level) => xpForLevel(level),
  rankForLevel: (level) => rankForLevel(level)
};

/* ============ INIT ============ */
function boot(){
  const loaded = load();
  if(loaded && loaded.booted){
    state = loaded;
    wireEvents();
    checkDailyReset();
    document.getElementById("boot").classList.add("hidden");
    document.getElementById("app").classList.add("show");
    render();
  } else {
    runBoot(name=>{
      state = defaultState();
      state.name = name;
      state.booted = true;
      addLog(`Player "${name}" has been registered.`, "levelup");
      save();
      wireEvents();
      document.getElementById("boot").classList.add("hidden");
      document.getElementById("app").classList.add("show");
      render();
    });
  }
}

boot();
})();
