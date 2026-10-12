(() => {
  "use strict";

  const PROFILE_KEY = "the_system_profiles_v1";
  let charts = {};
  let currentView = "overview";

  const $ = id => document.getElementById(id);
  const api = () => window.SYSTEM_API;
  const clone = obj => JSON.parse(JSON.stringify(obj));
  const esc = value => String(value ?? "").replace(/[&<>\"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;", "'":"&#039;"}[c]));

  function getState() {
    return api()?.getState?.() || null;
  }

  function ensureProfile(state) {
    if (!state) return;
    if (!state.profile) {
      state.profile = {
        role: "Hunter",
        bio: "Building discipline, skills and consistency one quest at a time.",
        goal: "Complete the next major objective.",
        createdAt: Date.now()
      };
    }
  }

  function localProfiles() {
    try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || "[]"); }
    catch { return []; }
  }
  function saveLocalProfiles(list) {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(list));
  }

  function dayKey(ts) {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }
  function dayLabel(date) {
    return date.toLocaleDateString(undefined, {weekday:"short"});
  }
  function last7Days() {
    const days = [];
    const now = new Date();
    now.setHours(0,0,0,0);
    for (let i=6;i>=0;i--) {
      const d = new Date(now);
      d.setDate(now.getDate()-i);
      days.push({key:dayKey(d.getTime()), label:dayLabel(d), date:d});
    }
    return days;
  }

  function analytics(state) {
    const days = last7Days();
    const map = Object.fromEntries(days.map(d => [d.key, {xp:0, quests:0, events:0}]));
    let totalXp = 0, questClears = 0;

    (state.log || []).forEach(entry => {
      const key = dayKey(entry.ts);
      const text = String(entry.text || "");
      const xpMatch = text.match(/\+(\d+) XP/);
      const xp = xpMatch ? Number(xpMatch[1]) : 0;
      totalXp += xp;
      if (map[key]) {
        map[key].xp += xp;
        map[key].events += 1;
        if (/complete|cleared|Daily Quest cleared/i.test(text)) map[key].quests += 1;
      }
      if (/complete|cleared|Daily Quest cleared/i.test(text)) questClears++;
    });

    const dungeons = state.dungeons || [];
    const clearedDungeons = dungeons.filter(d => d.status === "cleared").length;
    const allSide = state.sideQuests || [];
    const sideDone = allSide.filter(q => q.done).length;
    const dailyDone = (state.dailies || []).filter(d => d.done).length;

    return {
      days,
      rows: days.map(d => ({...d, ...map[d.key]})),
      totalXp,
      questClears: Math.max(questClears, sideDone + dailyDone),
      sideDone,
      dailyDone,
      dungeonTotal:dungeons.length,
      clearedDungeons,
      dungeonRate:dungeons.length ? Math.round(clearedDungeons/dungeons.length*100) : 0
    };
  }

  const achievementRules = [
    ["first_blood","First Blood","Clear your first side quest.",s => (s.sideQuests||[]).some(q=>q.done)],
    ["daily_7","Disciplined","Reach a 7-day daily streak.",s => (s.dailyStreak||0)>=7],
    ["daily_30","Unbroken","Reach a 30-day daily streak.",s => (s.dailyStreak||0)>=30],
    ["level_10","Awakened Power","Reach Level 10.",s => (s.level||0)>=10],
    ["level_25","Elite Hunter","Reach Level 25.",s => (s.level||0)>=25],
    ["rank_a","A-Rank Threat","Reach A-Rank.",s => ["A","S"].includes(api().rankForLevel(s.level))],
    ["rank_s","National Level","Reach S-Rank.",s => api().rankForLevel(s.level)==="S"],
    ["dungeon_1","Gatebreaker","Clear your first dungeon.",s => (s.dungeonsCleared||0)>=1],
    ["dungeon_5","Dungeon Slayer","Clear five dungeons.",s => (s.dungeonsCleared||0)>=5],
    ["quests_10","Quest Hunter","Clear at least 10 tracked quests.",s => analytics(s).questClears>=10],
    ["xp_1000","XP Hoarder","Log at least 1,000 XP.",s => analytics(s).totalXp>=1000],
    ["stats_75","Stat Monster","Reach 75 total stat points.",s => Object.values(s.stats||{}).reduce((a,b)=>a+Number(b||0),0)>=75]
  ];

  function renderOverview(state) {
    const a = analytics(state);
    const rank = api().rankForLevel(state.level);
    $("metricLevel").textContent = state.level;
    $("metricRank").textContent = `${rank}-RANK HUNTER`;
    $("metricXp").textContent = a.totalXp.toLocaleString();
    $("metricQuests").textContent = a.questClears;
    $("metricDungeons").textContent = a.clearedDungeons;
    $("metricDungeonRate").textContent = `${a.dungeonRate}% CLEAR RATE`;
    $("metricStreak").textContent = state.dailyStreak || 0;
    $("metricAchievements").textContent = achievementRules.filter(x=>x[3](state)).length;

    drawXPChart(a);
    drawQuestChart(a);
  }

  function destroyChart(key) {
    if (charts[key]) { charts[key].destroy(); delete charts[key]; }
  }
  function makeChart(id, config) {
    if (!window.Chart) return;
    const canvas = $(id);
    if (!canvas) return;
    const key = id;
    destroyChart(key);
    charts[key] = new Chart(canvas.getContext("2d"), config);
  }

  function baseChartOptions(yTitle) {
    return {
      responsive:true,
      maintainAspectRatio:false,
      plugins:{legend:{display:false}},
      scales:{
        x:{grid:{color:"rgba(42,69,104,.25)"},ticks:{color:"#7C93B5"}},
        y:{beginAtZero:true,grid:{color:"rgba(42,69,104,.25)"},ticks:{color:"#7C93B5"},title:{display:true,text:yTitle,color:"#7C93B5"}}
      }
    };
  }
  function drawXPChart(a) {
    makeChart("xpChart", {type:"line", data:{labels:a.rows.map(r=>r.label),datasets:[{label:"XP",data:a.rows.map(r=>r.xp),borderColor:"#3DDCFF",backgroundColor:"rgba(61,220,255,.12)",fill:true,tension:.35,pointRadius:3}]}, options:baseChartOptions("XP")});
  }
  function drawQuestChart(a) {
    makeChart("questChart", {type:"bar", data:{labels:a.rows.map(r=>r.label),datasets:[{label:"Completed",data:a.rows.map(r=>r.quests),backgroundColor:"#FFC93D",borderWidth:0}]}, options:baseChartOptions("Quests")});
  }

  function renderWeekly(state) {
    const a = analytics(state);
    const total = a.rows.reduce((sum,r)=>sum+r.xp,0);
    const quests = a.rows.reduce((sum,r)=>sum+r.quests,0);
    const best = a.rows.reduce((x,r)=>r.xp>x.xp?r:x,a.rows[0]);
    $("weeklyTable").innerHTML = `
      <div class="weekly-kpis"><div><span>7-DAY XP</span><strong>${total.toLocaleString()}</strong></div><div><span>QUESTS</span><strong>${quests}</strong></div><div><span>BEST DAY</span><strong>${best?.label || "—"}</strong></div></div>
      <div class="weekly-rows">${a.rows.map(r=>`<div class="weekly-row"><span>${esc(r.label)}</span><div class="weekly-track"><i style="width:${total?Math.min(100,r.xp/Math.max(...a.rows.map(x=>x.xp),1)*100):0}%"></i></div><b>${r.xp} XP</b><em>${r.quests} quest${r.quests===1?"":"s"}</em></div>`).join("")}</div>`;

    const stats = state.stats || {};
    makeChart("statChart", {type:"bar", data:{labels:["STR","VIT","AGI","INT","PER"],datasets:[{label:"Stat",data:[stats.str,stats.vit,stats.agi,stats.int,stats.per],backgroundColor:"#3DDCFF"}]}, options:baseChartOptions("Points")});
  }

  function renderAchievements(state) {
    const unlocked = achievementRules.filter(x=>x[3](state));
    $("achievementSummary").innerHTML = `<strong>${unlocked.length}/${achievementRules.length}</strong><span>ACHIEVEMENTS UNLOCKED</span>`;
    $("achievementGrid").innerHTML = achievementRules.map(([id,title,desc,check])=>{
      const on=check(state);
      return `<article class="achievement ${on?"unlocked":"locked"}"><div class="achievement-icon">${on?"◆":"◇"}</div><div><h4>${esc(title)}</h4><p>${esc(desc)}</p><small>${on?"UNLOCKED":"LOCKED"}</small></div></article>`;
    }).join("");
  }

  function renderProfile(state) {
    ensureProfile(state);
    const p=state.profile;
    $("profileName").value=state.name||"Player";
    $("profileRole").value=p.role||"";
    $("profileBio").value=p.bio||"";
    $("profileGoal").value=p.goal||"";
    const initials=(state.name||"P").split(/\s+/).map(x=>x[0]).join("").slice(0,2).toUpperCase();
    $("profileAvatar").textContent=initials;

    const profiles=localProfiles();
    const current=profiles.find(p=>p.id===state.profileId);
    $("profileList").innerHTML=profiles.length?profiles.map(p=>`<div class="profile-row ${p.id===state.profileId?"current":""}"><div class="profile-mini-avatar">${esc((p.name||"P").slice(0,2).toUpperCase())}</div><div class="profile-row-main"><strong>${esc(p.name)}</strong><small>Level ${p.level||1}</small></div><button class="profile-switch" data-profile-switch="${esc(p.id)}">${p.id===state.profileId?"ACTIVE":"LOAD"}</button><button class="profile-delete" data-profile-delete="${esc(p.id)}">×</button></div>`).join(""):`<div class="empty-note">No saved local profiles yet. Save this profile to create one.</div>`;
  }

  function snapshotCurrent(state) {
    const copy=clone(state); copy.profile=clone(state.profile||{}); return copy;
  }
  function saveCurrentProfile() {
    const state=getState(); if(!state)return;
    ensureProfile(state);
    state.name=$("profileName").value.trim()||"Player";
    state.profile.role=$("profileRole").value.trim();
    state.profile.bio=$("profileBio").value.trim();
    state.profile.goal=$("profileGoal").value.trim();
    if(!state.profileId) state.profileId=`profile-${Date.now().toString(36)}`;
    const profiles=localProfiles();
    const i=profiles.findIndex(p=>p.id===state.profileId);
    const snap=snapshotCurrent(state); snap.id=state.profileId;
    if(i>=0) profiles[i]=snap; else profiles.push(snap);
    saveLocalProfiles(profiles);
    api().save(); api().render(); renderAll();
    showToast("Profile saved.");
  }
  function createProfile(name) {
    const base=api().defaultState();
    base.booted=true;base.name=name;base.profileId=`profile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`;
    base.profile={role:"Hunter",bio:"New System profile.",goal:"Set your first objective.",createdAt:Date.now()};
    const profiles=localProfiles();profiles.push(clone(base));saveLocalProfiles(profiles);
    api().replaceState(base);renderAll();showToast(`Profile ${name} created.`);
  }
  function switchProfile(id) {
    const found=localProfiles().find(p=>p.id===id); if(!found)return;
    api().replaceState(found);renderAll();showToast(`Loaded ${found.name}.`);
  }
  function deleteProfile(id) {
    const state=getState();
    if(id===state?.profileId){showToast("Save or switch profiles before deleting the active profile.");return;}
    const profiles=localProfiles().filter(p=>p.id!==id);saveLocalProfiles(profiles);renderProfile(state);
  }

  function showToast(msg){
    const t=$("toast"); if(!t){return;}
    t.textContent=msg;t.classList.add("show");clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>t.classList.remove("show"),2200);
  }

  function setView(view) {
    currentView=view;
    document.querySelectorAll(".dashboard-tab").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
    document.querySelectorAll(".dashboard-view").forEach(v=>v.classList.toggle("active",v.id===`view-${view}`));
    const s=getState(); if(!s)return;
    if(view==="overview") renderOverview(s);
    if(view==="weekly") renderWeekly(s);
    if(view==="achievements") renderAchievements(s);
    if(view==="profile") renderProfile(s);
  }

  function renderAll(){
    const state=getState(); if(!state)return;
    ensureProfile(state);
    renderOverview(state);renderWeekly(state);renderAchievements(state);renderProfile(state);
  }

  function wire() {
    document.querySelectorAll(".dashboard-tab").forEach(b=>b.addEventListener("click",()=>setView(b.dataset.view)));
    $("profileSave")?.addEventListener("click",saveCurrentProfile);
    $("newProfileForm")?.addEventListener("submit",e=>{e.preventDefault();const name=$("newProfileName").value.trim();if(name){createProfile(name);e.target.reset();}});
    $("profileList")?.addEventListener("click",e=>{
      const sw=e.target.closest("[data-profile-switch]"),del=e.target.closest("[data-profile-delete]");
      if(sw && sw.dataset.profileSwitch!==getState()?.profileId) switchProfile(sw.dataset.profileSwitch);
      if(del && confirm("Delete this saved local profile?")) deleteProfile(del.dataset.profileDelete);
    });
  }

  function init() {
    if(!api()) { setTimeout(init,100); return; }
    const state=getState();
    if(!state) { setTimeout(init,200); return; }
    ensureProfile(state); api().save();
    wire();renderAll();
    setInterval(()=>{const s=getState();if(s) renderAll();},5000);
  }

  init();
})();
