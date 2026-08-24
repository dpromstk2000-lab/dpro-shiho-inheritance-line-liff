(() => {
  "use strict";
  const VERSION = "SHIHO-FRONT-PR-R2-20260824";
  const BASE = "https://cbknucemarcpbscirzyv.supabase.co/functions/v1/dpro-shiho-product-ready-v2";
  const MEMBER_BASE = "https://cbknucemarcpbscirzyv.supabase.co/functions/v1/dpro-shiho-member-r2";
  const state = { ownerToken: "" };

  async function call(path, options = {}) {
    const headers = new Headers(options.headers || {});
    headers.set("accept", "application/json");
    if (options.body !== undefined && !headers.has("content-type")) headers.set("content-type", "application/json");
    if (options.token) headers.set(options.sessionHeader || "x-owner-session", options.token);
    const body = options.body === undefined ? undefined : typeof options.body === "string" ? options.body : JSON.stringify(options.body);
    const base = options.base || BASE;
    const res = await fetch(`${base}${path}`, { method: options.method || "GET", headers, body, cache: "no-store" });
    const data = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }));
    if (!res.ok || data.ok === false) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }

  async function ownerLogin(code) {
    const x = await call("/api/owner/session", { method: "POST", body: { code } });
    state.ownerToken = x.session_token;
    return x;
  }
  const ownerCall = (path, options = {}) => call(path, { ...options, token: state.ownerToken, sessionHeader: "x-owner-session" });

  async function memberSessionFromLiff() {
    if (!window.liff || typeof window.liff.getIDToken !== "function") throw new Error("LIFF ID Tokenを取得できません。");
    const idToken = window.liff.getIDToken();
    if (!idToken) throw new Error("LIFF ID Tokenがありません。");
    return call("/api/member/session", { base: MEMBER_BASE, method: "POST", body: { line_id_token: idToken } });
  }
  async function demoMemberSession() {
    return call("/api/member/session", { base: MEMBER_BASE, method: "POST", body: { demo: true, demo_line_user_id: "U_DEMO_SHIHO_001" } });
  }

  window.DPRO_SHIHO_R2 = Object.freeze({
    version: VERSION,
    gateway: BASE,
    memberGateway: MEMBER_BASE,
    health: () => call("/api/product-ready/check"),
    lineCapability: () => call("/api/line/capability"),
    ownerLogin,
    ownerSystemCheck: () => ownerCall("/api/system-check"),
    ownerStorageSelfTest: () => ownerCall("/api/storage/self-test", { method: "POST", body: {} }),
    staffList: () => ownerCall("/api/staff"),
    staffPatch: (id, patch) => ownerCall(`/api/staff/${encodeURIComponent(id)}`, { method: "PATCH", body: patch }),
    staffRevoke: (id) => ownerCall(`/api/staff/${encodeURIComponent(id)}/revoke`, { method: "POST", body: {} }),
    staffSession: (staffCode, pin) => call("/api/staff/session", { method: "POST", body: { staff_code: staffCode, pin } }),
    memberSessionFromLiff,
    demoMemberSession,
    signedUpload: (token, caseId, file) => call("/api/documents/upload-url", { method: "POST", token, sessionHeader: "x-member-session", body: { case_id: caseId, file_name: file.name, mime_type: file.type } }),
  });

  function el(tag, props = {}, text = "") {
    const node = document.createElement(tag);
    Object.entries(props).forEach(([k, v]) => k === "className" ? (node.className = v) : node.setAttribute(k, String(v)));
    if (text) node.textContent = text;
    return node;
  }

  function injectOwnerPanel() {
    if (!/\/owner\.html$/i.test(location.pathname)) return;
    const style = el("style");
    style.textContent = `.pr2-fab{position:fixed;right:14px;bottom:14px;z-index:9998;border:0;border-radius:999px;padding:11px 16px;background:#132238;color:#fff;font-weight:800;box-shadow:0 8px 26px #0003}.pr2-modal{position:fixed;inset:0;z-index:9999;background:#0008;display:grid;place-items:center;padding:18px}.pr2-card{width:min(720px,100%);max-height:88vh;overflow:auto;background:#fff;border-radius:18px;padding:20px;color:#1c2733}.pr2-head{display:flex;justify-content:space-between;gap:12px;align-items:center}.pr2-row{display:grid;grid-template-columns:minmax(120px,1fr) repeat(4,auto) auto;gap:8px;align-items:center;padding:10px 0;border-top:1px solid #e5e7eb}.pr2-row label{font-size:12px;text-align:center}.pr2-card button{min-height:38px}.pr2-code{display:flex;gap:8px;margin:14px 0}.pr2-code input{min-height:44px;flex:1;padding:8px 10px}.pr2-msg{font-size:13px;color:#526071}`;
    document.head.appendChild(style);
    const fab = el("button", { className: "pr2-fab", type: "button" }, "R2 権限管理");
    document.body.appendChild(fab);
    fab.addEventListener("click", () => {
      const modal = el("div", { className: "pr2-modal" });
      const card = el("section", { className: "pr2-card", role: "dialog", "aria-modal": "true" });
      const head = el("div", { className: "pr2-head" });
      head.append(el("strong", {}, "PRODUCT READY R2 / スタッフ権限"));
      const close = el("button", { type: "button" }, "閉じる"); head.append(close); card.append(head);
      const codeBox = el("div", { className: "pr2-code" }), code = el("input", { type: "password", inputmode: "numeric", placeholder: "管理コード" }), login = el("button", { type: "button" }, "認証して表示");
      codeBox.append(code, login); card.append(codeBox);
      const msg = el("p", { className: "pr2-msg" }, "権限変更・無効化・セッション失効はサーバー側で即時反映されます。"), list = el("div"); card.append(msg, list); modal.append(card); document.body.append(modal);
      close.onclick = () => modal.remove(); modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
      login.onclick = async () => {
        try {
          login.disabled = true; msg.textContent = "確認中…";
          await ownerLogin(code.value); const data = await window.DPRO_SHIHO_R2.staffList(); list.replaceChildren();
          data.staff.forEach((s) => {
            const row = el("div", { className: "pr2-row" }); row.append(el("strong", {}, `${s.display_name} (${s.staff_code})`));
            const defs = [["is_active","有効"],["can_view_sensitive_documents","機密"],["can_confirm_legal_deadline","期限"],["can_manage_settings","設定"]];
            defs.forEach(([key, label]) => { const l = el("label"), c = el("input", { type: "checkbox" }); c.checked = !!s[key]; c.onchange = async () => { c.disabled = true; try { await window.DPRO_SHIHO_R2.staffPatch(s.id, { [key]: c.checked }); msg.textContent = `${s.display_name}: ${label}を更新しました。既存Staff Sessionは失効しました。`; } catch (e) { c.checked = !c.checked; msg.textContent = e.message; } finally { c.disabled = false; } }; l.append(c, document.createTextNode(label)); row.append(l); });
            const rv = el("button", { type: "button" }, "Session失効"); rv.onclick = async () => { try { await window.DPRO_SHIHO_R2.staffRevoke(s.id); msg.textContent = `${s.display_name}: Staff Sessionを失効しました。`; } catch (e) { msg.textContent = e.message; } }; row.append(rv); list.append(row);
          });
          msg.textContent = `R2 gateway接続済み / ${data.staff.length}名`;
        } catch (e) { msg.textContent = e.message; } finally { login.disabled = false; }
      };
    });
  }


  function injectStaffPanel() {
    if (!/\/staff\.html$/i.test(location.pathname)) return;
    const fab = el("button", { className: "pr2-fab", type: "button" }, "R2 Staff認証");
    if (!document.querySelector(".pr2-fab")) {
      const style = el("style");
      style.textContent = `.pr2-fab{position:fixed;right:14px;bottom:14px;z-index:9998;border:0;border-radius:999px;padding:11px 16px;background:#132238;color:#fff;font-weight:800;box-shadow:0 8px 26px #0003}.pr2-staff-box{position:fixed;right:14px;bottom:64px;z-index:9999;width:min(360px,calc(100vw - 28px));background:#fff;border:1px solid #dfe5e2;border-radius:16px;padding:14px;box-shadow:0 16px 44px #0003;color:#1c2733}.pr2-staff-box input{width:100%;min-height:44px;margin:5px 0;padding:8px}.pr2-staff-box button{min-height:40px;margin-top:6px}.pr2-staff-box p{font-size:13px}`;
      document.head.appendChild(style);
      document.body.appendChild(fab);
      fab.onclick = () => {
        const old = document.querySelector(".pr2-staff-box"); if (old) { old.remove(); return; }
        const box = el("section", { className: "pr2-staff-box" });
        box.append(el("strong", {}, "PRODUCT READY R2 / 個別Staff Session"));
        const code = el("input", { placeholder: "スタッフコード（例 ST-002）" }), pin = el("input", { type: "password", inputmode: "numeric", placeholder: "個別PIN" }), login = el("button", { type: "button" }, "認証"), msg = el("p", {}, "個別セッション・権限・失効をサーバー側で管理します。");
        box.append(code,pin,login,msg); document.body.appendChild(box);
        login.onclick = async()=>{ try{ login.disabled=true; const x=await window.DPRO_SHIHO_R2.staffSession(code.value,pin.value); sessionStorage.setItem("dpro_shiho_staff_r2_session",x.session_token); msg.textContent=`認証済み: ${x.staff.display_name} / ${x.staff.role} / ${x.capabilities.length}権限`; }catch(e){ msg.textContent=e.message; }finally{ login.disabled=false; } };
      };
    }
  }

  async function injectCheckBadge() {
    if (!/\/system-check\.html$/i.test(location.pathname)) return;
    const badge = el("div", { style: "position:fixed;right:12px;bottom:12px;z-index:9998;padding:9px 12px;border-radius:999px;background:#132238;color:#fff;font-weight:800;font-size:12px" }, "PRODUCT READY R2: checking…");
    document.body.appendChild(badge);
    try { const x = await call("/api/product-ready/check"); badge.textContent = `PRODUCT READY R2: ${x.ok ? "PASS" : "CHECK"}`; } catch { badge.textContent = "PRODUCT READY R2: CHECK"; }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => { injectOwnerPanel(); injectStaffPanel(); injectCheckBadge(); });
  else { injectOwnerPanel(); injectStaffPanel(); injectCheckBadge(); }
})();
