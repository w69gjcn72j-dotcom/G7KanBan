/* G7 Follow-up: Contacts for the "✉️ Send reminders" window.
   - Adds a Contacts tab to Send reminders: name, other names used in the
     Owner field, email, mobile, WeChat ID, preferred channel, language.
   - Contacts are saved with the board in Supabase (snapshot.contacts), behind
     the same passcode, and cached on this device under "g7_contacts".
   - Send reminders fills each person's address from Contacts, and offers
     WhatsApp, SMS or WeChat when a mobile or WeChat ID is on file.
   - Addresses already typed into Send reminders (the board's emailBook) are
     brought into Contacts, and the two are kept in step.
   - A card for all leaders (owner "All", "All leaders", "All teams" and the
     like) goes to every contact ticked as a G7 leader, all in one email.
   - index.html#followup opens Send reminders; #contacts opens the Contacts tab.
   It adds no button or counter of its own: the ⏰ Follow-ups chip stays the
   only count. Loaded at the end of index.html; remove the two followup lines
   there to switch it off. */

(function () {
  "use strict";

  var CKEY = "g7_contacts";
  var SELF_DEFAULT = { id: "me", name: "David Yung", aliases: "David, Rev David, Rev Yung",
                       email: "dyung@kogarah.church", mobile: "", wechat: "",
                       pref: "email", lang: "en", me: true };

  function h(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  /* ── contacts store (same key and snapshot field as before, so nothing is lost) ── */
  var contacts = [];
  try { contacts = JSON.parse(localStorage.getItem(CKEY) || "[]") || []; } catch (e) { contacts = []; }
  if (!Array.isArray(contacts)) contacts = [];
  ensureSelf();

  function ensureSelf() {
    if (!contacts.some(function (c) { return c.me; })) contacts.unshift(Object.assign({}, SELF_DEFAULT));
  }
  function cacheContacts() { try { localStorage.setItem(CKEY, JSON.stringify(contacts)); } catch (e) {} }
  function sortContacts() {
    contacts.sort(function (a, b) { return (b.me ? 1 : 0) - (a.me ? 1 : 0) || String(a.name).localeCompare(String(b.name)); });
  }

  /* Carry contacts inside the board snapshot so every device shares them. */
  var _snapshot = snapshot;
  snapshot = function () { var s = _snapshot(); s.contacts = contacts; return s; };

  var _apply = applySnapshot;
  applySnapshot = function (s) {
    var r = _apply(s);
    if (s && Array.isArray(s.contacts) && s.contacts.length) {
      contacts = s.contacts;
      ensureSelf();
      cacheContacts();
    } else if (s && s.cards && contacts.length > 1) {
      /* The server copy has no contacts but this device does: send them up. */
      setTimeout(function () { if (typeof schedulePush === "function") schedulePush(); }, 500);
    }
    setTimeout(fromEmailBook, 0);
    if (ctOpen() && !editing) renderContacts();   // never wipe a contact being typed
    return r;
  };

  /* ── owners → people ───────────────────────────────────────────────────── */
  function norm(s) { return String(s || "").toLowerCase().replace(/^rev\.?\s+/, "").replace(/\s+/g, " ").trim(); }
  /* Owners that mean "every G7 leader". */
  var ALL_RE = /^(all|everyone|all teams|all g7|leaders|g7 leaders|all (?:of )?(?:the )?(?:g7 |team |group )?leaders)$/i;
  function isAllToken(t) { return ALL_RE.test(String(t || "").trim()); }
  function hasAll(who) {
    return String(who || "").replace(/\([^)]*\)/g, "").split(/\s*(?:\/|\+|&|,|;)\s*/).some(isAllToken);
  }
  function ownerTokens(owner) {
    return String(owner || "")
      .replace(/\([^)]*\)/g, "")
      .split(/\s*(?:\/|\+|&|,|;|\band\b)\s*/i)
      .map(function (t) { return t.trim(); })
      .filter(function (t) { return t && !/^unassigned$/i.test(t) && !isAllToken(t) && !/^all$/i.test(t); });
  }
  function isLeader(c) { return !c.me && c.leader !== false; }
  function leaders() { return contacts.filter(isLeader); }
  function namesOf(c) { return [c.name].concat(String(c.aliases || "").split(",")).map(norm).filter(Boolean); }
  function findContact(token) {
    var n = norm(token);
    if (!n) return null;
    var hit = contacts.find(function (c) { return namesOf(c).indexOf(n) >= 0; });
    if (hit) return hit;
    var firsts = contacts.filter(function (c) { return norm(c.name).split(" ")[0] === n; });
    return firsts.length === 1 ? firsts[0] : null;
  }
  /* Everyone named in an owner string, e.g. "Range / Jerry". */
  function contactsFor(who) {
    var out = [];
    ownerTokens(who).forEach(function (t) { var c = findContact(t); if (c && out.indexOf(c) < 0) out.push(c); });
    return out;
  }
  function emailFor(who) {
    if (hasAll(who)) {
      var list = [];
      leaders().concat(contactsFor(who)).forEach(function (c) {
        var e = String(c.email || "").trim();
        if (e && !c.me && list.indexOf(e) < 0) list.push(e);
      });
      return list.join(",");
    }
    var cs = contactsFor(who), toks = ownerTokens(who);
    if (cs.length && cs.length === toks.length && cs.every(function (c) { return c.email; })) {
      return cs.map(function (c) { return c.email; }).join(",");
    }
    return (typeof emailBook !== "undefined" && emailBook[who]) || "";
  }

  /* ── keep Contacts and the board's emailBook in step ─────────────────── */
  /* Any address typed into Send reminders becomes (or fills in) a contact. */
  function fromEmailBook() {
    if (typeof emailBook === "undefined" || !emailBook) return;
    var changed = false;
    Object.keys(emailBook).forEach(function (who) {
      var addr = String(emailBook[who] || "").trim();
      if (!addr || addr.indexOf(",") >= 0) return;          // shared addresses stay in emailBook
      if (hasAll(who) || ownerTokens(who).length !== 1) return;   // groups are not one person
      var c = findContact(who);
      if (c) { if (!c.email) { c.email = addr; changed = true; } return; }
      contacts.push({ id: "c" + Date.now() + Math.floor(Math.random() * 1000), name: who.trim(), aliases: "",
                      email: addr, mobile: "", wechat: "", pref: "email", lang: "en" });
      changed = true;
    });
    if (changed) { sortContacts(); cacheContacts(); saveState(); }
  }
  /* A contact's email is written back to emailBook under each of its names that
     appear as an owner, so Send reminders always has it. */
  function toEmailBook(c) {
    if (typeof emailBook === "undefined" || !c) return;
    var names = namesOf(c);
    var owners = {};
    (typeof cards !== "undefined" ? cards : []).forEach(function (k) {
      var w = (k.owner || "").trim();
      if (w && ownerTokens(w).length === 1 && names.indexOf(norm(w)) >= 0) owners[w] = true;
    });
    owners[c.name] = true;
    Object.keys(owners).forEach(function (w) {
      if (c.email) emailBook[w] = c.email; else if (emailBook[w] && !c.me) delete emailBook[w];
    });
  }

  /* ── one email for all-leaders cards ("All", "All leaders", "All teams"…) ── */
  var _group = groupFollowUpsByOwner;
  groupFollowUpsByOwner = function () {
    var out = [], all = null;
    _group().forEach(function (g) {
      if (hasAll(g.who) && !ownerTokens(g.who).length) {
        if (!all) { all = { who: "All leaders", tasks: [] }; out.push(all); }
        all.tasks = all.tasks.concat(g.tasks);
      } else out.push(g);
    });
    return out;
  };

  /* ── greeting for a reminder that goes to all leaders ──────────────── */
  var _text = reminderText, _html = reminderHtml;
  reminderText = function (who, tasks) {
    if (!hasAll(who)) return _text(who, tasks);
    return _text("everyone", tasks).replace(/^Dear everyone,/, "Dear G7 leaders,");
  };
  reminderHtml = function (who, tasks) {
    if (!hasAll(who)) return _html(who, tasks);
    return _html("everyone", tasks).replace("Hi everyone,", "Hi G7 leaders,").replace("everyone您好：", "各位G7同工您好：");
  };

  /* ── other channels ──────────────────────────────────────────────────── */
  function intlMobile(m) {
    var d = String(m || "").replace(/[^\d+]/g, "");
    if (!d) return "";
    if (d.charAt(0) === "+") return d;
    if (/^0\d{9}$/.test(d)) return "+61" + d.slice(1);    // Australian numbers
    return d;
  }
  var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
              (/Macintosh/.test(navigator.userAgent) && "ontouchend" in document);
  function copyPlain(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t).catch(fallback);
    return fallback();
    function fallback() {
      var ta = document.createElement("textarea"); ta.value = t; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } catch (e) {}
      ta.remove(); return Promise.resolve();
    }
  }
  function sendOther(channel, c, text) {
    if (channel === "whatsapp") {
      window.open("https://wa.me/" + intlMobile(c.mobile).replace("+", "") + "?text=" + encodeURIComponent(text), "_blank");
    } else if (channel === "sms") {
      window.location.href = "sms:" + intlMobile(c.mobile) + (isIOS ? "&" : "?") + "body=" + encodeURIComponent(text);
    } else if (channel === "wechat") {
      return copyPlain(text).then(function () {
        setTimeout(function () { window.location.href = "weixin://"; }, 600);
        return "Message copied. Paste it into WeChat" + (c.wechat ? " (" + c.wechat + ")" : "") + ".";
      });
    }
    return Promise.resolve("");
  }

  /* ── tabs inside the Send reminders window ───────────────────────────── */
  var modal = document.querySelector("#remindOverlay .rm-modal");
  if (!modal) return;
  var heading = modal.querySelector("h3");
  var tabs = document.createElement("div");
  tabs.className = "ct-tabs";
  tabs.innerHTML = '<button type="button" class="ct-tab active" data-tab="people">People to remind</button>' +
                   '<button type="button" class="ct-tab" data-tab="contacts">Contacts</button>';
  heading.parentNode.insertBefore(tabs, heading.nextSibling);
  var view = document.createElement("div");
  view.id = "ctView"; view.className = "ct-view";
  document.getElementById("rmList").parentNode.insertBefore(view, document.getElementById("rmList").nextSibling);

  var tab = "people", editing = null;
  function ctOpen() { return tab === "contacts" && document.getElementById("remindOverlay").classList.contains("show"); }
  function showTab(t) {
    tab = t; editing = null;
    tabs.querySelectorAll(".ct-tab").forEach(function (b) { b.classList.toggle("active", b.dataset.tab === t); });
    var people = t === "people";
    document.getElementById("rmSub").style.display = people ? "" : "none";
    document.getElementById("rmList").style.display = people ? "" : "none";
    view.style.display = people ? "none" : "block";
    if (people) openReminders(); else renderContacts();
  }
  tabs.addEventListener("click", function (e) {
    var b = e.target.closest(".ct-tab"); if (b) showTab(b.dataset.tab);
  });

  /* ── People tab: fill addresses from Contacts, add other channels ────── */
  var _openReminders = openReminders;
  openReminders = function () {
    if (tab !== "people") {                       // reopening always lands on People
      tab = "people";
      tabs.querySelectorAll(".ct-tab").forEach(function (b) { b.classList.toggle("active", b.dataset.tab === "people"); });
      document.getElementById("rmSub").style.display = "";
      document.getElementById("rmList").style.display = "";
      view.style.display = "none";
    }
    fromEmailBook();
    /* Let the original window use Contacts addresses where emailBook has none. */
    var groups = groupFollowUpsByOwner();
    var filled = [];
    var kept = {};
    groups.forEach(function (g) {
      if (hasAll(g.who)) {                         // always the current list of leaders
        kept[g.who] = emailBook[g.who];
        var all = emailFor(g.who);
        if (all) emailBook[g.who] = all; else delete emailBook[g.who];
        filled.push(g.who);
      } else if (!emailBook[g.who]) { var a = emailFor(g.who); if (a) { emailBook[g.who] = a; filled.push(g.who); } }
    });
    _openReminders();
    filled.forEach(function (w) {                  // not a real edit; don't save it
      if (kept[w]) emailBook[w] = kept[w]; else delete emailBook[w];
    });

    groups.forEach(function (g, i) {
      var input = document.getElementById("rmEmail" + i);
      if (!input) return;
      var cs = contactsFor(g.who);
      /* Typing a new address here also updates that person's contact. */
      input.addEventListener("change", function () {
        var v = input.value.trim();
        if (cs.length === 1 && v.indexOf(",") < 0) { cs[0].email = v; cacheContacts(); saveState(); }
        else if (!cs.length) fromEmailBook();
      });
      var row = input.closest(".rm-row");
      var person = row && row.parentNode;
      if (!person) return;
      var label = person.querySelector("h4");
      if (hasAll(g.who)) {
        var L = leaders(), noMail = L.filter(function (c) { return !c.email; });
        var info = document.createElement("div");
        info.className = "rm-hint ct-allnote";
        info.innerHTML = L.length
          ? "Goes to all " + L.length + " leader" + (L.length === 1 ? "" : "s") + " in Contacts in one email." +
            (noMail.length ? " <b>No email yet:</b> " + noMail.map(function (c) { return h(c.name); }).join(", ") + "." : "")
          : "No leaders in Contacts yet. Add them in the Contacts tab.";
        var lk = document.createElement("button");
        lk.type = "button"; lk.className = "ct-link"; lk.textContent = "Edit leaders";
        lk.addEventListener("click", function () { showTab("contacts"); });
        info.appendChild(document.createTextNode(" ")); info.appendChild(lk);
        row.parentNode.insertBefore(info, row.nextSibling);
        input.title = "All leaders' addresses. Change who is a leader in Contacts.";
        return;
      }
      if (label && !cs.length && ownerTokens(g.who).length) {
        var add = document.createElement("button");
        add.type = "button"; add.className = "ct-link"; add.textContent = "+ Add to Contacts";
        add.addEventListener("click", function () { showTab("contacts"); startEdit(newContact(ownerTokens(g.who)[0])); });
        label.appendChild(add);
      }
      if (cs.length !== 1) return;
      var c = cs[0];
      var extra = [];
      if (c.mobile) extra.push(["whatsapp", "🟢 WhatsApp"], ["sms", "📱 SMS"]);
      if (c.wechat || c.pref === "wechat") extra.push(["wechat", "💬 WeChat"]);
      if (!extra.length) return;
      var bar = document.createElement("div");
      bar.className = "rm-row ct-channels";
      bar.innerHTML = '<span class="ct-or">or send by</span>' + extra.map(function (x) {
        return '<button type="button" class="rm-copy' + (c.pref === x[0] ? " ct-pref" : "") + '" data-ch="' + x[0] + '">' + x[1] + "</button>";
      }).join("");
      row.parentNode.insertBefore(bar, row.nextSibling);
      var note = document.getElementById("rmNote" + i);
      bar.querySelectorAll("[data-ch]").forEach(function (b) {
        b.addEventListener("click", function () {
          sendOther(b.dataset.ch, c, reminderText(g.who, g.tasks)).then(function (msg) { if (msg && note) note.textContent = msg; });
        });
      });
    });
  };

  /* ── Contacts tab ─────────────────────────────────────────────────────── */
  var PREF = { email: "Email", whatsapp: "WhatsApp", sms: "SMS", wechat: "WeChat" };
  var LANG = { en: "English", zh: "繁體中文", both: "Both" };
  function opt(v, l, cur) { return '<option value="' + v + '"' + (v === cur ? " selected" : "") + ">" + l + "</option>"; }
  function newContact(name) {
    return { id: "c" + Date.now(), name: name || "", aliases: "", email: "", mobile: "", wechat: "", pref: "email", lang: "en", _new: true };
  }
  function startEdit(c) { editing = c; renderContacts(); var f = document.getElementById("ctForm"); if (f) { f.scrollIntoView({ block: "center" }); var n = f.querySelector('[data-f="name"]'); if (n && !n.value) n.focus(); } }

  function missingOwners() {
    var out = [];
    (typeof cards !== "undefined" ? cards : []).forEach(function (k) {
      if (k.col === "done" || k.col === "archive") return;
      ownerTokens(k.owner).forEach(function (t) {
        if (!findContact(t) && out.map(norm).indexOf(norm(t)) < 0) out.push(t);
      });
    });
    return out.sort();
  }

  function renderContacts() {
    var x = '<div class="rm-sub">Saved with the board, behind the passcode, so every device sees them. ' +
            '"Other names" are the names used in a card\'s Owner field, separated by commas. ' +
            "Send reminders uses these addresses, and offers WhatsApp, SMS or WeChat when a mobile or WeChat ID is here. " +
            "A card for all leaders (owner \"All\" or \"All leaders\") is emailed to everyone ticked as a G7 leader.</div>";
    x += '<div class="ct-list">';
    contacts.forEach(function (c) {
      var ways = [c.email ? "✉️ " + h(c.email) : "", c.mobile ? "📱 " + h(c.mobile) : "", c.wechat ? "💬 " + h(c.wechat) : ""].filter(Boolean);
      x += '<div class="ct-row"><div class="ct-main"><b>' + h(c.name) + "</b>" + (c.me ? ' <span class="ct-me">me</span>' : "") +
           (c.aliases ? '<div class="ct-alias">also: ' + h(c.aliases) + "</div>" : "") +
           '<div class="ct-ways">' + (ways.length ? ways.join(" · ") : '<span class="ct-missing">no details yet</span>') + "</div></div>" +
           '<div class="ct-side"><span class="ct-pill">' + (PREF[c.pref] || "Email") + " · " + (LANG[c.lang] || "English") + "</span>" +
           (isLeader(c) ? '<span class="ct-pill ct-leader">G7 leader</span>' : "") +
           '<button type="button" class="ct-link" data-edit="' + h(c.id) + '">Edit</button></div></div>';
    });
    x += "</div>";
    var miss = missingOwners();
    if (miss.length) {
      x += '<div class="rm-hint">Owners on the board with no contact yet. Tap a name to add it:</div><div class="ct-suggest">' +
           miss.map(function (m) { return '<button type="button" data-new="' + h(m) + '">+ ' + h(m) + "</button>"; }).join("") + "</div>";
    }
    x += '<div class="rm-row" style="margin-top:10px"><button type="button" class="rm-send" data-new="">+ New contact</button></div>';
    if (editing) {
      var c = editing;
      x += '<div class="ct-form" id="ctForm">' +
           '<div class="full"><label>Name</label><input data-f="name" value="' + h(c.name) + '"></div>' +
           '<div class="full"><label>Other names used on the board (comma separated)</label><input data-f="aliases" value="' + h(c.aliases) + '" placeholder="e.g. first name, Chinese name, a role"></div>' +
           '<div><label>Email</label><input type="email" data-f="email" value="' + h(c.email) + '"></div>' +
           '<div><label>Mobile (WhatsApp / SMS)</label><input type="tel" data-f="mobile" value="' + h(c.mobile) + '" placeholder="04xx xxx xxx"></div>' +
           '<div><label>WeChat ID</label><input data-f="wechat" value="' + h(c.wechat) + '"></div>' +
           '<div><label>Prefers</label><select data-f="pref">' + opt("email", "Email", c.pref) + opt("whatsapp", "WhatsApp", c.pref) + opt("sms", "SMS", c.pref) + opt("wechat", "WeChat", c.pref) + "</select></div>" +
           '<div><label>Language</label><select data-f="lang">' + opt("en", "English", c.lang) + opt("zh", "繁體中文", c.lang) + opt("both", "English + 繁體中文", c.lang) + "</select></div>" +
           (c.me ? "" : '<div class="full"><label class="ct-check"><input type="checkbox" data-leader' + (c.leader !== false ? " checked" : "") +
             '> G7 leader (included when a card is for all leaders)</label></div>') +
           '<div class="full rm-row"><button type="button" class="rm-send" data-save>Save contact</button>' +
           '<button type="button" class="rm-copy" data-cancel>Cancel</button>' +
           (c._new || c.me ? "" : '<button type="button" class="rm-copy ct-remove" data-remove>Remove</button>') +
           '<span class="rm-sent" id="ctNote"></span></div></div>';
    }
    view.innerHTML = x;

    view.querySelectorAll("[data-edit]").forEach(function (b) {
      b.addEventListener("click", function () {
        startEdit(Object.assign({}, contacts.find(function (k) { return k.id === b.dataset.edit; })));
      });
    });
    view.querySelectorAll("[data-new]").forEach(function (b) {
      b.addEventListener("click", function () { startEdit(newContact(b.dataset.new)); });
    });
    var form = document.getElementById("ctForm");
    if (!form) return;
    form.querySelector("[data-save]").addEventListener("click", function () {
      var c = editing;
      form.querySelectorAll("[data-f]").forEach(function (i) { c[i.dataset.f] = i.value.trim(); });
      var lb = form.querySelector("[data-leader]"); if (lb) c.leader = lb.checked;
      if (!c.name) { document.getElementById("ctNote").textContent = "Please enter a name."; return; }
      delete c._new;
      var idx = contacts.findIndex(function (k) { return k.id === c.id; });
      if (idx >= 0) contacts[idx] = c; else contacts.push(c);
      sortContacts(); toEmailBook(c);
      editing = null; cacheContacts(); saveState(); renderContacts();
    });
    form.querySelector("[data-cancel]").addEventListener("click", function () { editing = null; renderContacts(); });
    var rm = form.querySelector("[data-remove]");
    if (rm) rm.addEventListener("click", function () {
      var gone = editing;
      if (!confirm("Remove " + gone.name + " from Contacts?")) return;
      contacts = contacts.filter(function (k) { return k.id !== gone.id; });
      editing = null; cacheContacts(); saveState(); renderContacts();
    });
  }

  /* ── links: index.html#followup and index.html#contacts ──────────────── */
  function hashOpen() {
    var hs = location.hash.toLowerCase();
    if (hs !== "#followup" && hs !== "#contacts") return;
    /* Wait until the passcode is in and the board has loaded. */
    var tries = 0;
    (function wait() {
      if (typeof g7pass === "undefined" || !g7pass) { if (++tries < 300) setTimeout(wait, 500); return; }
      setTimeout(function () {
        openReminders();
        if (hs === "#contacts") showTab("contacts");
      }, 1200);
    })();
  }
  window.addEventListener("hashchange", hashOpen);

  fromEmailBook();
  hashOpen();
  window.G7Followup = { contacts: function () { return contacts; }, emailFor: emailFor,
                        openContacts: function () { openReminders(); showTab("contacts"); } };
})();
