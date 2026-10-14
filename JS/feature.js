
(() => {
  "use strict";
  const STORAGE_KEY = "the_system_save_v1";
  const $ = id => document.getElementById(id);

  function updateClock(){
    const now=new Date();
    const clock=$("liveClock"), date=$("liveDate");
    if(clock) clock.textContent=now.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit",second:"2-digit"});
    if(date) date.textContent=now.toLocaleDateString([], {weekday:"short",month:"short",day:"numeric",year:"numeric"});
  }
  updateClock(); setInterval(updateClock,1000);

  // Keyboard shortcuts improve navigation without touching the core game state.
  document.addEventListener("keydown", e => {
    const tag=(e.target.tagName||"").toLowerCase();
    const typing=["input","textarea","select"].includes(tag);
    if(e.key==="Escape"){
      $("featureOverlay")?.setAttribute("hidden","");
      $("settingsOverlay")?.classList.remove("show");
      $("levelup-flash")?.classList.remove("show");
      return;
    }
    if(typing) return;
    if(e.key==="?") { e.preventDefault(); $("featureOverlay")?.removeAttribute("hidden"); }
    if(e.key==="/") { e.preventDefault(); $("sideInput")?.focus(); }
    if(e.key.toLowerCase()==="f") { document.body.classList.toggle("focus-mode"); }
  });

  $("featureClose")?.addEventListener("click",()=>$("featureOverlay").setAttribute("hidden",""));

  // Search the rendered quests/dungeons with Ctrl/Cmd+K.
  let searchBox;
  function ensureSearch(){
    if(searchBox) return searchBox;
    const wrap=document.createElement("div");
    wrap.className="feature-overlay"; wrap.id="searchOverlay";
    wrap.innerHTML=`<div class="panel feature-modal"><div class="panel-title">SEARCH SYSTEM</div>
      <input id="systemSearchInput" style="width:100%;background:var(--panel-2);border:1px solid var(--line);color:var(--ink);padding:12px" placeholder="Search quests, dungeons or objectives..." autocomplete="off">
      <div id="searchResults" class="empty-note">Start typing to search.</div>
      <button class="modal-close" id="searchClose">CLOSE</button></div>`;
    document.body.appendChild(wrap); searchBox=wrap;
    wrap.querySelector("#searchClose").onclick=()=>wrap.remove();
    const input=wrap.querySelector("#systemSearchInput");
    input.addEventListener("input",()=>runSearch(input.value)); input.focus();
    return wrap;
  }
  function runSearch(q){
    const out=document.querySelector("#searchResults"), term=q.trim().toLowerCase();
    if(!term){out.textContent="Start typing to search.";return;}
    const data=[];
    document.querySelectorAll("#sideList .side-quest, #dungeonList .dungeon-card, #dailyList .quest").forEach(el=>{
      if(el.textContent.toLowerCase().includes(term)) data.push(el.textContent.trim().replace(/\s+/g," ").slice(0,180));
    });
    out.innerHTML=data.length ? data.map(x=>`<div style="border-top:1px solid var(--line);padding:9px 0">${x.replace(/[&<>]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[m]))}</div>`).join("") : "No matching objectives found.";
  }
  function openSearch(){ensureSearch();}
  document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();openSearch()}});
  $("searchBtn")?.addEventListener("click",openSearch);

  // Show a small data summary in the browser tab title.
  setInterval(()=>{
    const level=document.getElementById("hunterLevel")?.textContent||"THE SYSTEM";
    document.title=`THE SYSTEM · ${level}`;
  },2000);
})();
