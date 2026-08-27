(() => {
  "use strict";
  // R3-FIX1-CROSS-PAGE-RESUME

  const VERSION = "1.1";
  const TUTORIAL_ID = "first10";
  const STORAGE_KEY = "dpro_tutorial_shiho_v1_1_state";
  const MARGIN = 8;
  const INTERACTIVE_SELECTOR = "button,a,input,select,textarea,label,summary,details,[contenteditable],[role=button],[role=link],[role=checkbox],[role=radio],[role=switch],[role=menuitem],[data-tutorial-control]";
  const PROTECTED_OVERLAYS = [
    "#appointment-modal.is-visible",
    "#case-drawer.show",
    "#inquiry-modal.show",
    "#line-modal.show",
    "#sidebar.open",
    "#overlay.show",
  ];

  const STEPS = [
    {id:1,file:"demo-guide.html",title:"公開デモの全体像",persona:"公開デモ",target:"#screenGrid",fallback:"#primaryDemoLink",copy:"依頼者 → 依頼者マイページ → スタッフ → 管理PCの流れを確認します。\n公開デモでは実在する氏名・住所・家族関係・不動産情報・機密書類を使いません。",safety:"業務データの変更はありません。次へ進むと相談受付デモへ移動します。"},
    {id:2,file:"index.html",title:"相談受付の5ステップ",persona:"依頼者",target:"#wizard-progress",copy:"相談内容 → お客様情報 → 詳しい内容 → 相談日時 → 確認・送信の5段階です。\nこのステップでは業務フォームを操作しません。",safety:"最後の「この内容で相談を送信」は実際の相談POSTです。First10は自動送信しません。"},
    {id:3,file:"index.html",title:"相談分野を選ぶ",persona:"依頼者",target:"#category-area",copy:"相談分野を選ぶと、分野に合わせて質問が変わります。架空データでカテゴリを選んでも構いません。\n選ばずに「次へ」または「スキップ」で説明だけ続けることもできます。",safety:"Tutorialはカテゴリを自動クリックせず、相談送信も実行しません。"},
    {id:4,file:"member.html",title:"マイページの「今やること」",persona:"依頼者マイページ",target:".summary-grid",fallback:"#action-list",wait:"#dashboard.is-visible",copy:"依頼後は、進行中の案件・お客様の対応待ち・次回予定を一画面で確認できます。\n事務所が公開した情報だけを見る導線です。",safety:"このステップは閲覧のみです。LINE/デモ認証セッションは既存画面の仕組みを利用します。"},
    {id:5,file:"member.html",title:"必要書類の確認導線",persona:"依頼者マイページ",target:'[data-section-target="documents"]',copy:"「必要書類」タブから、事務所が案内した書類と現在の確認状況を見られます。\n対象タブはご本人がクリック/Enterで開いてください。",safety:"実在する機密書類を公開デモへ入力・提出しないでください。Tutorialはタブを自動クリックしません。"},
    {id:6,file:"staff.html",title:"スタッフデモへログイン",persona:"スタッフ",target:"#login-form",fallback:"#login-button",copy:"スタッフ画面は認証後に担当業務を表示します。demo=1では管理コード1234が自動入力されます。\n「スタッフ画面を開く」はご本人が押してください。",safety:"Tutorialはログインを自動送信せず、認証情報を保存・読取しません。1234はデモ専用です。",loginGate:"#staff-app.show"},
    {id:7,file:"staff.html",title:"今日の担当業務",persona:"スタッフ",target:".metrics",fallback:"#today-appointments",wait:"#staff-app.show",copy:"担当予約・担当相談・担当タスク・期限確認を「今日」画面でまとめて確認できます。\n下部メニューから相談・案件・その他へ移動できます。",safety:"予約確定、来所受付、相談開始、完了、取消などの状態更新ボタンをTutorialは押しません。"},
    {id:8,file:"owner.html",title:"管理PCデモへログイン",persona:"管理者/司法書士",target:"#login-form",fallback:"#login-button",copy:"事務所全体の管理画面は管理者認証後に利用します。demo=1では1234が自動入力されます。\n「管理画面を開く」はご本人が押してください。",safety:"Tutorialはログインを自動送信せず、管理コードや認証トークンを保存しません。",loginGate:"#owner-app.show"},
    {id:9,file:"owner.html",title:"事務所全体のダッシュボード",persona:"管理者/司法書士",target:".metrics",fallback:"#dash-inquiries",wait:"#owner-app.show",copy:"新規相談、予約、書類待ち、期限、補正、タスク、LINE承認待ちを事務所全体で監視できます。\nここでは数値と一覧を読むだけです。",safety:"相談更新・LINE承認・設定保存などの業務変更をTutorialは実行しません。"},
    {id:10,file:"owner.html",title:"system-checkと安全な終了",persona:"管理者/司法書士",target:"#system-check",wait:"#owner-app.show",copy:"営業前のsystem-checkは接続・安全設定を確認する読取中心の検査です。必要ならご本人が手動で実行してください。\n「完了」でFirst10を終了できます。",safety:"隣の「デモデータ再生成」は破壊的操作です。Tutorialはsystem-checkもdemo_prepareも自動クリックしません。"},
  ];

  let root, card, targetRing, launcher, titleEl, copyEl, safetyEl, statusEl, stepEl, handle, nextBtn, backBtn, skipBtn, focusBtn, closeBtn, replayBtn;
  let state = null;
  let lastSafeFocus = null;
  let drag = null;
  let target = null;
  let frame = 0;
  let waitTimer = 0;
  let escBusinessOverlayWasOpen = false;

  function assetBase() {
    const script = [...document.scripts].find((s) => /\/tutorial\.js(?:\?|$)/.test(s.src));
    return script ? new URL("./", script.src) : new URL("./", location.href);
  }
  const BASE = assetBase();

  function routeUrl(file, action) {
    const url = new URL(file, BASE);
    url.searchParams.set("demo", "1");
    if (action) url.searchParams.set("tutorial", action);
    return url.toString();
  }
  function currentFile() {
    const name = location.pathname.split("/").pop();
    return name || "index.html";
  }
  function stepFor(id) { return STEPS[Math.max(0, Math.min(STEPS.length - 1, Number(id || 1) - 1))]; }
  function now() { return new Date().toISOString(); }
  function safeDefault(step = 1, status = "active") {
    return {version:VERSION,tutorialId:TUTORIAL_ID,step,status,expectedPath:stepFor(step).file,card:{xRatio:.5,yRatio:.12},startedAt:now(),updatedAt:now()};
  }
  function readState() {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
      if (!parsed || parsed.version !== VERSION || parsed.tutorialId !== TUTORIAL_ID) return null;
      return {version:VERSION,tutorialId:TUTORIAL_ID,step:Math.max(1,Math.min(10,Number(parsed.step)||1)),status:["active","paused","complete"].includes(parsed.status)?parsed.status:"paused",expectedPath:String(parsed.expectedPath||stepFor(parsed.step).file),card:{xRatio:Number(parsed.card?.xRatio)||.5,yRatio:Number(parsed.card?.yRatio)||.12},startedAt:String(parsed.startedAt||now()),updatedAt:String(parsed.updatedAt||now())};
    } catch { return null; }
  }
  function writeState() {
    if (!state) return;
    state.updatedAt = now();
    state.expectedPath = stepFor(state.step).file;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    refreshLauncher();
  }

  function createUi() {
    if (document.getElementById("dpro-tutorial-root")) return;
    root = document.createElement("div"); root.id = "dpro-tutorial-root";
    targetRing = document.createElement("div"); targetRing.className = "dpro-tutorial-target"; targetRing.setAttribute("aria-hidden", "true");
    card = document.createElement("section"); card.className = "dpro-tutorial-card"; card.setAttribute("role", "dialog"); card.setAttribute("aria-modal", "false"); card.setAttribute("aria-labelledby", "dpro-tutorial-title");
    handle = document.createElement("div"); handle.className = "dpro-tutorial-handle"; handle.setAttribute("data-tutorial-drag-handle", "true"); handle.tabIndex = 0; handle.innerHTML = '<strong>First10 使い方</strong><span>ここだけドラッグできます</span>';
    const body = document.createElement("div"); body.className = "dpro-tutorial-body";
    stepEl = document.createElement("p"); stepEl.className = "dpro-tutorial-kicker";
    titleEl = document.createElement("h2"); titleEl.className = "dpro-tutorial-title"; titleEl.id = "dpro-tutorial-title"; titleEl.tabIndex = -1;
    copyEl = document.createElement("p"); copyEl.className = "dpro-tutorial-copy";
    safetyEl = document.createElement("div"); safetyEl.className = "dpro-tutorial-safety";
    statusEl = document.createElement("p"); statusEl.className = "dpro-tutorial-status"; statusEl.setAttribute("role", "status"); statusEl.setAttribute("aria-live", "polite");
    body.append(stepEl,titleEl,copyEl,safetyEl,statusEl);
    const actions = document.createElement("div"); actions.className = "dpro-tutorial-actions";
    backBtn = button("戻る", "dpro-tutorial-secondary", back);
    focusBtn = button("対象へフォーカス", "dpro-tutorial-quiet", focusTarget);
    skipBtn = button("スキップ", "dpro-tutorial-quiet", skip);
    nextBtn = button("次へ", "dpro-tutorial-primary", next);
    replayBtn = button("最初から", "dpro-tutorial-secondary", () => replay(true));
    closeBtn = button("閉じる", "dpro-tutorial-danger", pause);
    nextBtn.id = "dpro-tutorial-next"; backBtn.id = "dpro-tutorial-back"; skipBtn.id = "dpro-tutorial-skip"; closeBtn.id = "dpro-tutorial-close"; replayBtn.id = "dpro-tutorial-replay"; focusBtn.id = "dpro-tutorial-focus-target";
    actions.append(backBtn,focusBtn,skipBtn,nextBtn,replayBtn,closeBtn);
    card.append(handle,body,actions);
    launcher = document.createElement("div"); launcher.className = "dpro-tutorial-launcher"; launcher.id = "dpro-tutorial-launcher";
    root.append(targetRing,card,launcher); document.body.append(root);
    if (currentFile() === "staff.html") launcher.style.bottom = "84px";
    handle.addEventListener("pointerdown", dragStart);
    handle.addEventListener("pointermove", dragMove);
    handle.addEventListener("pointerup", dragEnd);
    handle.addEventListener("pointercancel", dragEnd);
  }
  function button(text, cls, fn) {
    const b = document.createElement("button"); b.type = "button"; b.textContent = text; b.className = cls; b.dataset.tutorialControl = "1"; b.addEventListener("click", fn); return b;
  }
  function refreshLauncher() {
    if (!launcher) return;
    launcher.replaceChildren();
    const primary = button(!state ? "First10を開始" : state.status === "complete" ? "First10を再生" : "First10を再開", "", () => {
      if (!state) start(); else if (state.status === "complete") replay(true); else resume();
    });
    const guide = document.createElement("a"); guide.href = new URL("guide-center.html", BASE).toString(); guide.textContent = "使い方ガイド"; guide.dataset.tutorialControl = "1";
    launcher.append(primary, guide);
    launcher.hidden = !!(state && state.status === "active" && card?.classList.contains("is-visible"));
  }

  function start() { state = safeDefault(1,"active"); writeState(); goToStateRouteOrRender(true); }
  function resume() {
    state = readState() || safeDefault(1,"active"); state.status = "active"; writeState(); goToStateRouteOrRender(true);
  }
  function replay(confirmUser = false) {
    if (confirmUser && !window.confirm("First10を最初から再生しますか？業務データは変更しません。")) return;
    state = safeDefault(1,"active"); writeState(); goToStateRouteOrRender(true);
  }
  function pause() {
    if (!state) return; state.status = "paused"; rememberCard(); writeState(); hideTutorial(); restoreFocus();
  }
  function complete() {
    state.status = "complete"; state.step = 10; rememberCard(); writeState(); hideTutorial(); restoreFocus();
  }
  function hideTutorial() {
    card?.classList.remove("is-visible"); targetRing?.classList.remove("is-visible"); target = null; clearTimeout(waitTimer); refreshLauncher();
  }
  function goToStateRouteOrRender(userInitiated = false) {
    const step = stepFor(state.step);
    if (currentFile() !== step.file) {
      if (userInitiated) location.assign(routeUrl(step.file, "resume"));
      else { hideTutorial(); refreshLauncher(); }
      return;
    }
    renderStep();
  }
  function advance(isSkip = false) {
    if (!state) return;
    const current = stepFor(state.step);
    if (!isSkip && current.loginGate && !document.querySelector(current.loginGate)) {
      statusEl.textContent = "先に画面のログインボタンを本人操作で押してください。Tutorialは自動ログインしません。";
      return;
    }
    if (state.step >= 10) { complete(); return; }
    rememberCard(); state.step += 1; state.status = "active"; writeState();
    const nextStep = stepFor(state.step);
    if (currentFile() !== nextStep.file) location.assign(routeUrl(nextStep.file, "resume")); else renderStep();
  }
  function next() { advance(false); }
  function skip() { advance(true); }
  function back() {
    if (!state || state.step <= 1) return;
    rememberCard(); state.step -= 1; state.status = "active"; writeState();
    const prev = stepFor(state.step); if (currentFile() !== prev.file) location.assign(routeUrl(prev.file, "resume")); else renderStep();
  }

  function renderStep() {
    clearTimeout(waitTimer); cancelAnimationFrame(frame);
    const s = stepFor(state.step);
    lastSafeFocus = document.activeElement && !document.activeElement.closest?.("#dpro-tutorial-root") ? document.activeElement : lastSafeFocus;
    stepEl.textContent = `${s.persona} / ${s.id} / 10`;
    titleEl.textContent = s.title; copyEl.textContent = s.copy; safetyEl.textContent = s.safety;
    backBtn.disabled = s.id === 1; nextBtn.textContent = s.id === 10 ? "完了" : "次へ";
    statusEl.textContent = "";
    card.classList.add("is-visible"); launcher.hidden = true;
    restoreCardPosition();
    findAndTrackTarget(s);
    requestAnimationFrame(() => titleEl.focus({preventScroll:true}));
  }
  function findAndTrackTarget(s) {
    const waitReady = !s.wait || document.querySelector(s.wait);
    target = waitReady ? (document.querySelector(s.target) || (s.fallback ? document.querySelector(s.fallback) : null)) : null;
    if (!target) {
      targetRing.classList.remove("is-visible");
      statusEl.textContent = s.wait ? "画面の準備またはログインを待っています。本人操作後に自動で続きます。" : "対象表示を待っています。";
      waitTimer = window.setTimeout(() => findAndTrackTarget(s), 350);
      return;
    }
    statusEl.textContent = s.loginGate && document.querySelector(s.loginGate) ? "ログイン済みです。「次へ」で続けます。" : "対象を枠で示しています。枠自体は操作を妨げません。";
    ensureTargetVisible(); trackTarget(); placeOppositeTarget();
  }
  function ensureTargetVisible() {
    if (!target) return; const r = target.getBoundingClientRect(); const v = viewport();
    if (r.bottom < 70 || r.top > v.h - 70) target.scrollIntoView({behavior:"smooth",block:"center",inline:"nearest"});
  }
  function trackTarget() {
    cancelAnimationFrame(frame);
    const draw = () => {
      if (!target || !target.isConnected || !state || state.status !== "active") { targetRing.classList.remove("is-visible"); return; }
      const r = target.getBoundingClientRect(); const v = viewport();
      const left = Math.max(4, r.left - 4), top = Math.max(4, r.top - 4), right = Math.min(v.w - 4, r.right + 4), bottom = Math.min(v.h - 4, r.bottom + 4);
      if (right <= left || bottom <= top || r.bottom < 0 || r.top > v.h) targetRing.classList.remove("is-visible");
      else { targetRing.style.left = `${left}px`; targetRing.style.top = `${top}px`; targetRing.style.width = `${Math.max(0,right-left)}px`; targetRing.style.height = `${Math.max(0,bottom-top)}px`; targetRing.classList.add("is-visible"); }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
  }
  function focusTarget() {
    if (!target) return;
    const candidate = target.matches?.(INTERACTIVE_SELECTOR) ? target : target.querySelector?.("button,a,input,select,textarea,[tabindex]:not([tabindex='-1'])");
    if (candidate && !candidate.hidden && candidate.getClientRects().length) { candidate.focus({preventScroll:false}); statusEl.textContent = "対象へフォーカスしました。クリックはしていません。"; }
    else { target.scrollIntoView({behavior:"smooth",block:"center"}); statusEl.textContent = "対象を画面中央へ移動しました。操作は実行していません。"; }
  }

  function viewport() { const vv = window.visualViewport; return {w:Math.max(1,vv?.width||innerWidth),h:Math.max(1,vv?.height||innerHeight),x:vv?.offsetLeft||0,y:vv?.offsetTop||0}; }
  function safeBottom() { return currentFile() === "staff.html" ? 82 : 8; }
  function clamp(x,y) {
    const v = viewport(); const r = card.getBoundingClientRect(); const maxX = Math.max(MARGIN, v.w - r.width - MARGIN); const maxY = Math.max(MARGIN, v.h - r.height - safeBottom());
    return {x:Math.min(Math.max(MARGIN,x),maxX),y:Math.min(Math.max(MARGIN,y),maxY)};
  }
  function setCardPosition(x,y,save=true) { const p=clamp(x,y); card.style.left=`${p.x}px`; card.style.top=`${p.y}px`; if(save) rememberCard(); }
  function placeOppositeTarget() {
    if (!target || drag) return; const r=target.getBoundingClientRect(); const v=viewport(); const c=card.getBoundingClientRect();
    const y = r.top > v.h/2 ? MARGIN + 8 : v.h - c.height - safeBottom() - 8; const x = v.w - c.width - MARGIN - 4; setCardPosition(x,y,false);
  }
  function rememberCard() {
    if (!state || !card?.classList.contains("is-visible")) return; const v=viewport(); const r=card.getBoundingClientRect(); state.card={xRatio:v.w?Math.max(0,Math.min(1,r.left/v.w)):.5,yRatio:v.h?Math.max(0,Math.min(1,r.top/v.h)):.12};
  }
  function restoreCardPosition() {
    requestAnimationFrame(() => { const v=viewport(); const pos=state?.card||{xRatio:.5,yRatio:.12}; setCardPosition(v.w*pos.xRatio,v.h*pos.yRatio,false); });
  }
  function reclamp() { if (!card?.classList.contains("is-visible")) return; const r=card.getBoundingClientRect(); setCardPosition(r.left,r.top,false); if(target) trackTarget(); }

  function dragStart(e) {
    if (e.currentTarget !== handle || e.button > 0) return;
    if (e.target.closest?.(INTERACTIVE_SELECTOR) && e.target !== handle) return;
    const r=card.getBoundingClientRect(); drag={pointerId:e.pointerId,dx:e.clientX-r.left,dy:e.clientY-r.top};
    try { handle.setPointerCapture(e.pointerId); } catch {}
    e.preventDefault();
  }
  function dragMove(e) { if (!drag || e.pointerId !== drag.pointerId) return; setCardPosition(e.clientX-drag.dx,e.clientY-drag.dy,false); e.preventDefault(); }
  function dragEnd(e) { if (!drag || e.pointerId !== drag.pointerId) return; try{handle.releasePointerCapture(e.pointerId);}catch{} drag=null; rememberCard(); writeState(); }

  function protectedOverlayOpen() { return PROTECTED_OVERLAYS.some((sel) => document.querySelector(sel)); }
  function onKeyCapture(e) { if (e.key === "Escape") escBusinessOverlayWasOpen = protectedOverlayOpen(); }
  function onKeyBubble(e) {
    if (e.key !== "Escape") return;
    const protectedAtStart = escBusinessOverlayWasOpen; queueMicrotask(() => { escBusinessOverlayWasOpen = false; });
    if (protectedAtStart) return;
    if (state?.status === "active" && card?.classList.contains("is-visible")) pause();
  }
  function restoreFocus() { if (lastSafeFocus?.isConnected && !lastSafeFocus.closest?.("#dpro-tutorial-root")) { try{lastSafeFocus.focus({preventScroll:true});}catch{} } }

  function processActionQuery() {
    const action = new URLSearchParams(location.search).get("tutorial");
    if (!action) return false;
    const clean = new URL(location.href); clean.searchParams.delete("tutorial"); history.replaceState(null,"",clean);
    if (action === "start") { start(); return true; }
    if (action === "replay") { state=safeDefault(1,"active"); writeState(); goToStateRouteOrRender(true); return true; }
    if (action === "resume") { resume(); return true; }
    return false;
  }

  function init() {
    createUi(); state = readState(); refreshLauncher();
    document.addEventListener("keydown", onKeyCapture, true); document.addEventListener("keydown", onKeyBubble);
    addEventListener("resize", reclamp); addEventListener("orientationchange", reclamp); addEventListener("scroll", () => target && trackTarget(), {passive:true});
    visualViewport?.addEventListener("resize", reclamp); visualViewport?.addEventListener("scroll", reclamp);
    new MutationObserver(() => { if(state?.status === "active" && currentFile() === stepFor(state.step).file && !target) findAndTrackTarget(stepFor(state.step)); }).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:["class","hidden"]});
    if (processActionQuery()) return;
    if (state?.status === "active" && currentFile() === stepFor(state.step).file) renderStep();
  }

  Object.defineProperty(window,"DPRO_TUTORIAL_SHIHO",{value:Object.freeze({version:VERSION,tutorialId:TUTORIAL_ID,stepCount:STEPS.length,start,resume,replay:()=>replay(true),getState:()=>readState()}),writable:false,configurable:false});
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",init,{once:true}); else init();
})();
