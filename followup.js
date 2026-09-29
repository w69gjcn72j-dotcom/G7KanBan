/* G7 Follow-up: turns the Kanban's open actions into follow-up messages.
   - Each card gains a due date and a "last followed up" record.
   - A contacts list (email, mobile, WeChat ID, language) is kept with the board
     in Supabase, behind the same passcode.
   - The Follow-up panel groups open actions by owner and writes a ready-to-send
     message in English, Traditional Chinese or both, sent by Email (Outlook),
     WhatsApp, SMS, or copied for WeChat.
   Loaded from index.html. Remove the two followup lines there to switch it off. */

(function () {
  "use strict";

  var OPEN_COLS = ["backlog", "awaiting", "progress"];
  var STALE_DAYS = 7;          // follow up again after a week
  var SOON_DAYS = 3;           // due within 3 days counts as "due soon"
  var CKEY = "g7_contacts";
  var SELF_DEFAULT = { id: "me", name: "David Yung", aliases: "David, Rev David, Rev Yung",
                       email: "dyung@kogarah.church", mobile: "", wechat: "",
                       pref: "email", lang: "en", me: true };

  /* ── contacts store ─────────────────────────────────────────────────────── */
  var contacts = [];
  try { contacts = JSON.parse(localStorage.getItem(CKEY) || "[]") || []; } catch (e) { contacts = []; }
  if (!contacts.some(function (c) { return c.me; })) contacts.unshift(Object.assign({}, SELF_DEFAULT));

  function cacheContacts() { try { localStorage.setItem(CKEY, JSON.stringify(contacts)); } catch (e) {} }

  /* Carry contacts inside the board snapshot so every device shares them. */
  var _snapshot = snapshot;
  snapshot = function () { var s = _snapshot(); s.contacts = contacts; return s; };

  var _apply = applySnapshot;
  applySnapshot = function (s) {
    var r = _apply(s);
    if (s && Array.isArray(s.contacts) && s.contacts.length) {
      contacts = s.contacts;
      cacheContacts();
    } else if (s && s.cards && contacts.length > 1) {
      /* An older copy of the board saved without contacts: put them back. */
      setTimeout(function () { if (typeof schedulePush === "function") schedulePush(); }, 500);
    }
    refreshCount();
    if (panelOpen()) renderPanel();
    return r;
  };

  /* ── dates ──────────────────────────────────────────────────────────────── */
  function today() { var d = new Date(); return iso(d); }
  function iso(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function parse(s) { if (!s) return null; var p = String(s).split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function daysFrom(s) { var d = parse(s); if (!d) return null; var t = parse(today()); return Math.round((d - t) / 86400000); }
  var MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  var DOW = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  function nice(s) { var d = parse(s); return d ? DOW[d.getDay()] + " " + d.getDate() + " " + MON[d.getMonth()] : ""; }
  function niceZh(s) { var d = parse(s); return d ? (d.getMonth() + 1) + "月" + d.getDate() + "日" : ""; }

  /* ── owners → people ───────────────────────────────────────────────────── */
  function norm(s) { return String(s || "").toLowerCase().replace(/^rev\.?\s+/, "").replace(/\s+/g, " ").trim(); }
  function ownerTokens(owner) {
    return String(owner || "")
      .replace(/\([^)]*\)/g, "")
      .split(/\s*(?:\/|\+|&|,|;|\band\b)\s*/i)
      .map(function (t) { return t.trim(); })
      .filter(function (t) { return t && !/^all$/i.test(t); });
  }
  function namesOf(c) {
    return [c.name].concat(String(c.aliases || "").split(",")).map(norm).filter(Boolean);
  }
  function findContact(token) {
    var n = norm(token);
    var hit = contacts.find(function (c) { return namesOf(c).indexOf(n) >= 0; });
    if (hit) return hit;
    /* first name only, e.g. "Lucy" for "Lucy Zhao" */
    var firsts = contacts.filter(function (c) { return norm(c.name).split(" ")[0] === n; });
    return firsts.length === 1 ? firsts[0] : null;
  }
  function firstName(c) { return String(c.name || "").trim().split(/\s+/)[0]; }

  /* ── follow-up state per card ─────────────────────────────────────────── */
  function isOpen(card) { return OPEN_COLS.indexOf(card.col) >= 0; }
  /* Due-date reminders: one week, three days and one day before.
     stage() says which reminder a card has reached; card.rem records the ones sent. */
  var STAGES = [7, 3, 1];
  function stage(card) {
    if (!card.due || !isOpen(card)) return null;
    var d = daysFrom(card.due);
    if (d < 0) return null;                 // overdue is handled by the normal rules
    for (var i = STAGES.length - 1; i >= 0; i--) if (d <= STAGES[i]) return STAGES[i];
    return null;
  }
  function reminderDue(card) {
    var st = stage(card);
    return st !== null && !(card.rem && card.rem[st]);
  }
  function cardNeeds(card) {
    if (!isOpen(card)) return false;
    if (reminderDue(card)) return true;
    var since = card.fu ? -daysFrom(card.fu.d) : null;
    var due = card.due ? daysFrom(card.due) : null;
    if (since === null) return true;
    if (since >= STALE_DAYS) return true;
    if (due !== null && due < 0 && since >= 2) return true;
    return false;
  }

  function groups() {
    var map = {}, order = [], unassigned = [];
    cards.forEach(function (card) {
      if (!isOpen(card)) return;
      var toks = ownerTokens(card.owner);
      if (!toks.length) { if (!/^all$/i.test(String(card.owner || "").trim())) unassigned.push(card); return; }
      toks.forEach(function (t) {
        var c = findContact(t);
        var key = c ? "c:" + c.id : "t:" + norm(t);
        if (!map[key]) { map[key] = { key: key, contact: c, label: c ? c.name : t, cards: [] }; order.push(key); }
        if (map[key].cards.indexOf(card) < 0) map[key].cards.push(card);
      });
    });
    var list = order.map(function (k) { return map[k]; });
    list.forEach(function (g) { g.needs = g.cards.some(cardNeeds); g.me = !!(g.contact && g.contact.me); });
    list.sort(function (a, b) { return (a.me - b.me) || (b.needs - a.needs) || a.label.localeCompare(b.label); });
    return { list: list, unassigned: unassigned };
  }

  function countNeeding() {
    return groups().list.filter(function (g) { return g.needs && !g.me; }).length;
  }

  /* ── messages (David's voice: no em dashes, warm, short) ──────────────── */
  function itemLine(card, lang) {
    var d = card.due ? daysFrom(card.due) : null;
    if (lang === "zh") {
      var z = !card.due ? "" : d < 0 ? "（原定" + niceZh(card.due) + "完成）"
            : d === 0 ? "（今天到期）" : d === 1 ? "（明天到期，" + niceZh(card.due) + "）"
            : d <= 7 ? "（" + d + "天後到期，" + niceZh(card.due) + "）" : "（" + niceZh(card.due) + "前）";
      return "• " + card.title + z;
    }
    var e = !card.due ? "" : d < 0 ? " (was due " + nice(card.due) + ")"
          : d === 0 ? " (due today)" : d === 1 ? " (due tomorrow, " + nice(card.due) + ")"
          : d === 7 ? " (due in one week, " + nice(card.due) + ")"
          : d <= 7 ? " (due in " + d + " days, " + nice(card.due) + ")" : " (by " + nice(card.due) + ")";
    return "• " + card.title + e;
  }

  function buildMessage(g, picked, lang, style) {
    var name = g.contact ? firstName(g.contact) : g.label;
    var en = picked.map(function (c) { return itemLine(c, "en"); }).join("\n");
    var zh = picked.map(function (c) { return itemLine(c, "zh"); }).join("\n");
    var E, Z;
    if (style === "short") {
      E = "Hi " + name + ", David here. Just checking in on your G7 items:\n" + en +
          "\nHow are these going? Anything I can help with? Thanks for serving.\nGrace and peace, David";
      Z = name + "您好，我是翁牧師。想跟您跟進一下由您負責的G7事項：\n" + zh +
          "\n請問進展如何？有需要我幫忙的地方嗎？感謝您的事奉！\n主內 翁沛偉牧師";
    } else {
      E = "Hi " + name + ",\n\nI hope your week is going well. I'm just checking in on the items we have on the G7 board for you:\n\n" +
          en + "\n\nCould you let me know where each one is up to? If anything is stuck, or you need help or resources, please tell me and we can work it out together.\n\n" +
          "Thank you for serving the Lord Jesus with us at St Paul's.\n\nGrace and peace,\nDavid";
      Z = name + "您好：\n\n願您這星期一切安好。想跟您跟進一下G7事工板上由您負責的事項：\n\n" +
          zh + "\n\n請問各項目前的進展如何？如有任何困難，或需要幫忙和資源，請隨時告訴我，我們一起商量。\n\n" +
          "感謝您與我們一同在聖保羅堂事奉主耶穌。\n\n主內\n翁沛偉牧師";
    }
    if (lang === "zh") return Z;
    if (lang === "both") return E + "\n\n- - - - - - - -\n\n" + Z;
    return E;
  }
  function subjectFor(g, n, lang) {
    var name = g.contact ? firstName(g.contact) : g.label;
    var en = "G7 follow-up: " + n + " item" + (n === 1 ? "" : "s") + " for " + name;
    if (lang === "zh") return "G7事項跟進（" + n + "項）";
    if (lang === "both") return en + " | G7事項跟進";
    return en;
  }

  /* ── channels ─────────────────────────────────────────────────────────── */
  function intlMobile(m) {
    var d = String(m || "").replace(/[^\d+]/g, "");
    if (!d) return "";
    if (d.charAt(0) === "+") return d;
    if (/^04\d{8}$/.test(d)) return "+61" + d.slice(1);   // Australian mobile
    if (/^0\d{9}$/.test(d)) return "+61" + d.slice(1);
    return d;
  }
  var isIOS = /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent) && "ontouchend" in document;

  var openUrl = function (u) { window.location.href = u; };
  function copyText(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t);
    var ta = document.createElement("textarea"); ta.value = t; document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    ta.remove(); return Promise.resolve();
  }

  function send(channel, g, picked, msg, subj) {
    var c = g.contact || {};
    /* Record the follow-up and push it to the server before leaving the page. */
    if (channel !== "copy") markDone(picked, channel);
    var go = openUrl;
    openUrl = function (u) { setTimeout(function () { go(u); }, 400); };
    if (channel === "email") {
      openUrl("mailto:" + encodeURIComponent(c.email || "") + "?subject=" + encodeURIComponent(subj) + "&body=" + encodeURIComponent(msg));
    } else if (channel === "whatsapp") {
      openUrl("https://wa.me/" + intlMobile(c.mobile).replace("+", "") + "?text=" + encodeURIComponent(msg));
    } else if (channel === "sms") {
      openUrl("sms:" + intlMobile(c.mobile) + (isIOS ? "&" : "?") + "body=" + encodeURIComponent(msg));
    } else if (channel === "wechat") {
      copyText(msg).then(function () {
        toast("Message copied. Paste it into your WeChat chat with " + (c.wechat ? c.name + " (" + c.wechat + ")" : g.label) + ".");
        setTimeout(function () { openUrl("weixin://"); }, 700);
      });
    } else if (channel === "copy") {
      copyText(msg).then(function () { toast("Message copied."); });
    }
    openUrl = go;
  }

  function markDone(picked, via) {
    var d = today();
    picked.forEach(function (card) {
      card.fu = { d: d, via: via };
      var st = stage(card);
      if (st !== null) { card.rem = card.rem || {}; STAGES.forEach(function (x) { if (x >= st) card.rem[x] = d; }); }
      card.fuN = (card.fuN || 0) + 1;
    });
    render(); saveState(); refreshCount();
    if (typeof pushNow === "function" && typeof pushTimer !== "undefined") { clearTimeout(pushTimer); pushNow(); }
    setTimeout(renderPanel, 50);
  }

  /* ── card chips ───────────────────────────────────────────────────────── */
  var VIA = { email: "email", whatsapp: "WhatsApp", sms: "SMS", wechat: "WeChat", person: "in person" };
  var _cardHTML = cardHTML;
  cardHTML = function (c) {
    var html = _cardHTML(c);
    var chips = [];
    if (c.due && c.col !== "archive") {
      var d = daysFrom(c.due);
      var cls = c.col === "done" ? "" : d < 0 ? "overdue" : d <= SOON_DAYS ? "due-soon" : "";
      chips.push('<span class="fu-chip ' + cls + '">📅 ' + (d < 0 && c.col !== "done" ? "Overdue " : "Due ") + nice(c.due) + "</span>");
    }
    if (c.fu && isOpen(c)) {
      var s = -daysFrom(c.fu.d);
      chips.push('<span class="fu-chip ' + (s >= STALE_DAYS ? "fu-stale" : "fu-ok") + '">📨 ' +
                 (s === 0 ? "today" : s + "d ago") + " · " + (VIA[c.fu.via] || c.fu.via) + "</span>");
    }
    if (!chips.length) return html;
    var i = html.lastIndexOf("</div>");
    return html.slice(0, i) + '<div class="card-fu">' + chips.join("") + "</div>" + html.slice(i);
  };

  /* ── calendar reminders (.ics with alarms 7, 3 and 1 day before) ──────── */
  var BOARD_URL = "https://w69gjcn72j-dotcom.github.io/G7KanBan/#followup";
  function icsEsc(t) { return String(t || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n"); }
  function calendarFile(card) {
    if (!card.due) { toast("Set a due date first."); return; }
    var ymd = card.due.replace(/-/g, ""), now = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
    var alarm = function (tr, label) {
      return ["BEGIN:VALARM", "ACTION:DISPLAY", "TRIGGER:" + tr, "DESCRIPTION:" + icsEsc(label + ": " + card.title), "END:VALARM"];
    };
    var lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//St Pauls Kogarah//G7 Kanban//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
      "BEGIN:VTIMEZONE", "TZID:Australia/Sydney",
      "BEGIN:STANDARD", "DTSTART:19700405T030000", "RRULE:FREQ=YEARLY;BYMONTH=4;BYDAY=1SU", "TZOFFSETFROM:+1100", "TZOFFSETTO:+1000", "TZNAME:AEST", "END:STANDARD",
      "BEGIN:DAYLIGHT", "DTSTART:19701004T020000", "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=1SU", "TZOFFSETFROM:+1000", "TZOFFSETTO:+1100", "TZNAME:AEDT", "END:DAYLIGHT",
      "END:VTIMEZONE",
      "BEGIN:VEVENT", "UID:g7-" + card.id + "-" + ymd + "@kogarah.church", "DTSTAMP:" + now,
      "DTSTART;TZID=Australia/Sydney:" + ymd + "T090000", "DTEND;TZID=Australia/Sydney:" + ymd + "T093000",
      "SUMMARY:" + icsEsc("G7 due: " + card.title + (card.owner ? " (" + card.owner + ")" : "")),
      "DESCRIPTION:" + icsEsc("Owner: " + (card.owner || "not set") + "\nFollow up from the board: " + BOARD_URL),
      "URL:" + BOARD_URL]
      .concat(alarm("-P7D", "Due in one week"), alarm("-P3D", "Due in 3 days"), alarm("-P1D", "Due tomorrow"))
      .concat(["END:VEVENT", "END:VCALENDAR"]);
    var blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "G7-due-" + card.id + ".ics";
    document.body.appendChild(a); a.click(); a.remove();
    toast("Open the file to add it to your Outlook calendar. It will remind you 7, 3 and 1 day before.");
  }

  /* ── due date in the edit modal ───────────────────────────────────────── */
  (function addDueField() {
    var notes = document.getElementById("mNotes");
    if (!notes) return;
    var fg = document.createElement("div");
    fg.className = "fg";
    fg.innerHTML = '<label>Due date (reminders 7, 3 and 1 day before)</label><input type="date" id="mDue">';
    notes.closest(".fg").parentNode.insertBefore(fg, notes.closest(".fg"));
    notes.closest(".fg").querySelector("label").textContent = "Notes";

    var dl = document.createElement("datalist"); dl.id = "fuOwnerList"; document.body.appendChild(dl);
    document.getElementById("mOwner").setAttribute("list", "fuOwnerList");

    var _open = openModal;
    openModal = function (defaultCol, editId) {
      _open(defaultCol, editId);
      var c = editId ? cards.find(function (x) { return x.id === editId; }) : null;
      document.getElementById("mDue").value = (c && c.due) || "";
      dl.innerHTML = contacts.map(function (k) { return '<option value="' + esc(k.name) + '">'; }).join("");
    };

    var pending = null;
    var btn = document.getElementById("saveBtn");
    btn.addEventListener("click", function () {
      pending = { editId: editingId, nextBefore: nextId, due: document.getElementById("mDue").value || "" };
    }, true);
    btn.addEventListener("click", function () {
      if (!pending) return;
      var id = pending.editId || (nextId > pending.nextBefore ? nextId - 1 : null);
      var c = id ? cards.find(function (x) { return x.id === id; }) : null;
      if (c && (c.due || "") !== pending.due) {
        if (pending.due) c.due = pending.due; else delete c.due;
        delete c.rem;
        render(); saveState();
      }
      pending = null; refreshCount();
    });
  })();

  /* ── panel ────────────────────────────────────────────────────────────── */
  var tab = "people", showAll = false, editingContact = null, openKeys = {};
  var ov = document.createElement("div");
  ov.className = "fu-overlay"; ov.id = "fuOverlay";
  ov.innerHTML = '<div class="fu-panel" role="dialog" aria-label="Follow-up">' +
    '<div class="fu-head"><h3>📨 Follow-up</h3><button class="fu-close" aria-label="Close">✕</button></div>' +
    '<div class="fu-tabs"><button class="fu-tab" data-tab="people">People to follow up</button>' +
    '<button class="fu-tab" data-tab="contacts">Contacts</button></div>' +
    '<div class="fu-body" id="fuBody"></div></div>';
  document.body.appendChild(ov);
  var toastEl = document.createElement("div"); toastEl.className = "fu-toast"; document.body.appendChild(toastEl);
  var toastT;
  function toast(t) { toastEl.textContent = t; toastEl.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove("show"); }, 3200); }

  ov.addEventListener("click", function (e) { if (e.target === ov || e.target.closest(".fu-close")) closePanel(); });
  ov.querySelectorAll(".fu-tab").forEach(function (b) {
    b.addEventListener("click", function () { tab = b.dataset.tab; editingContact = null; renderPanel(); });
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && panelOpen()) closePanel(); });

  function panelOpen() { return ov.classList.contains("show"); }
  function openPanel(t) { tab = t || "people"; ov.classList.add("show"); renderPanel(); }
  function closePanel() { ov.classList.remove("show"); editingContact = null; }

  function renderPanel() {
    ov.querySelectorAll(".fu-tab").forEach(function (b) { b.classList.toggle("active", b.dataset.tab === tab); });
    var body = document.getElementById("fuBody");
    body.innerHTML = tab === "contacts" ? contactsHTML() : peopleHTML();
    if (tab === "contacts") bindContacts(body); else bindPeople(body);
  }

  function channelsOf(c) {
    if (!c) return "";
    return [c.email ? "✉️" : "", c.mobile ? "📱" : "", c.wechat ? "💬" : ""].join("");
  }

  function peopleHTML() {
    var G = groups();
    var list = G.list.filter(function (g) { return showAll || g.needs || g.me; });
    var h = '<div class="fu-help">Open actions (Backlog, Waiting, In Progress) grouped by owner. ' +
            "Someone is flagged when an item is one week, three days or one day from its due date, when it has never been followed up, when it has been " + STALE_DAYS +
            " days, or when it is overdue. Tap a name, check the message, then choose how to send it. " +
            "Sending marks those items as followed up today.</div>" +
            '<div class="fu-filter"><label><input type="checkbox" id="fuShowAll"' + (showAll ? " checked" : "") +
            "> Show everyone with open items, not only those due</label></div>";
    if (!list.length) h += '<div class="fu-help">Nobody needs a follow-up right now. Thank God for faithful workers!</div>';
    list.forEach(function (g) {
      var needN = g.cards.filter(cardNeeds).length;
      var flag = g.me ? '<span class="fu-flag ok">My own list</span>'
               : g.needs ? '<span class="fu-flag">' + needN + " to follow up</span>"
               : '<span class="fu-flag ok">Up to date</span>';
      h += '<details class="fu-person' + (g.needs && !g.me ? " needs" : "") + '" data-key="' + esc(g.key) + '"' + (openKeys[g.key] ? " open" : "") + ">" +
           '<summary><span class="fu-name">' + esc(g.label) + "</span>" +
           '<span class="fu-meta">' + g.cards.length + " open " + channelsOf(g.contact) + "</span>" + flag + "</summary>" +
           '<div class="fu-inner"></div></details>';
    });
    if (G.unassigned.length) {
      h += '<div class="fu-help" style="margin-top:14px"><b>No owner yet (' + G.unassigned.length + "):</b> " +
           G.unassigned.map(function (c) { return esc(c.title); }).join(" · ") +
           ". Give these an owner on the board so they can be followed up.</div>";
    }
    return h;
  }

  function personInner(g) {
    var c = g.contact;
    var lang = (c && c.lang) || "en";
    var style = (c && c.pref && c.pref !== "email") ? "short" : "full";
    var h = "";
    if (!c) h += '<div class="fu-nocontact">No contact details for ' + esc(g.label) +
                 '. <button class="fu-linkbtn" data-addc="' + esc(g.label) + '">Add contact</button></div>';
    h += '<div class="fu-items">' + g.cards.map(function (card) {
      var bits = [];
      if (card.due) {
        var d = daysFrom(card.due), st = stage(card);
        bits.push((d < 0 ? "Overdue, was due " : "Due ") + nice(card.due));
        if (st !== null) bits.push(reminderDue(card) ? (st === 7 ? "One-week" : st === 3 ? "Three-day" : "One-day") + " reminder due" : "Reminder sent");
      }
      bits.push(card.fu ? "Last followed up " + nice(card.fu.d) + " by " + (VIA[card.fu.via] || card.fu.via) : "Not followed up yet");
      bits.push(({ backlog: "Backlog", awaiting: "Waiting", progress: "In Progress" })[card.col]);
      return '<label class="fu-item"><input type="checkbox" data-cid="' + card.id + '"' + (cardNeeds(card) || !g.needs ? " checked" : "") + ">" +
             "<span>" + esc(card.title) + "<small>" + esc(bits.join(" · ")) +
             (card.due ? ' <button class="fu-linkbtn" data-ics="' + card.id + '">📅 Add reminders to my calendar</button>' : "") +
             "</small></span></label>";
    }).join("") + "</div>";
    h += '<div class="fu-opts"><select data-opt="lang">' +
         opt("en", "English", lang) + opt("zh", "繁體中文", lang) + opt("both", "English + 繁體中文", lang) + "</select>" +
         '<select data-opt="style">' + opt("full", "Email style (full)", style) + opt("short", "Message style (short)", style) + "</select>" +
         '<button class="fu-linkbtn" data-regen>Rewrite message</button></div>' +
         '<textarea class="fu-msg"></textarea>' +
         '<div class="fu-send">' +
         btnH("email", "✉️ Email", c && c.email, c && c.pref === "email") +
         btnH("whatsapp", "🟢 WhatsApp", c && c.mobile, c && c.pref === "whatsapp") +
         btnH("sms", "📱 SMS", c && c.mobile, c && c.pref === "sms") +
         btnH("wechat", "💬 WeChat", true, c && c.pref === "wechat") +
         btnH("copy", "📋 Copy", true, false) +
         '<button class="fu-mark" data-send="person">✓ Followed up in person</button>' +
         "</div>";
    return h;
  }
  function opt(v, l, cur) { return '<option value="' + v + '"' + (v === cur ? " selected" : "") + ">" + l + "</option>"; }
  function btnH(ch, label, ok, primary) {
    return '<button data-send="' + ch + '"' + (primary ? ' class="primary"' : "") + (ok ? "" : " disabled") + ">" + label + "</button>";
  }

  function bindPeople(body) {
    var sa = body.querySelector("#fuShowAll");
    if (sa) sa.addEventListener("change", function () { showAll = sa.checked; renderPanel(); });
    var G = groups();
    body.querySelectorAll(".fu-person").forEach(function (det) {
      var g = G.list.find(function (x) { return x.key === det.dataset.key; });
      if (!g) return;
      var inner = det.querySelector(".fu-inner");
      function fill() {
        inner.innerHTML = personInner(g);
        var ta = inner.querySelector(".fu-msg");
        function picked() {
          return Array.prototype.filter.call(inner.querySelectorAll("[data-cid]"), function (x) { return x.checked; })
            .map(function (x) { return cards.find(function (k) { return k.id === +x.dataset.cid; }); }).filter(Boolean);
        }
        function lang() { return inner.querySelector('[data-opt="lang"]').value; }
        function regen() {
          var p = picked();
          ta.value = p.length ? buildMessage(g, p, lang(), inner.querySelector('[data-opt="style"]').value) : "";
        }
        regen();
        inner.querySelectorAll("[data-cid],[data-opt]").forEach(function (x) { x.addEventListener("change", regen); });
        inner.querySelector("[data-regen]").addEventListener("click", regen);
        inner.querySelectorAll("[data-ics]").forEach(function (b) {
          b.addEventListener("click", function (e) {
            e.preventDefault(); e.stopPropagation();
            calendarFile(cards.find(function (k) { return k.id === +b.dataset.ics; }));
          });
        });
        inner.querySelectorAll("[data-send]").forEach(function (b) {
          b.addEventListener("click", function () {
            var p = picked();
            if (!p.length) { toast("Tick at least one item first."); return; }
            if (b.dataset.send === "person") { markDone(p, "person"); toast("Marked as followed up."); return; }
            send(b.dataset.send, g, p, ta.value, subjectFor(g, p.length, lang()));
          });
        });
        var add = inner.querySelector("[data-addc]");
        if (add) add.addEventListener("click", function () {
          editingContact = { id: "c" + Date.now(), name: add.dataset.addc, aliases: "", email: "", mobile: "", wechat: "", pref: "email", lang: "en", _new: true };
          tab = "contacts"; renderPanel();
        });
      }
      if (det.open) fill();
      det.addEventListener("toggle", function () {
        openKeys[g.key] = det.open;
        if (det.open && !inner.innerHTML) fill();
      });
    });
  }

  /* ── contacts tab ─────────────────────────────────────────────────────── */
  function contactsHTML() {
    var PREF = { email: "Email", whatsapp: "WhatsApp", sms: "SMS", wechat: "WeChat" };
    var LANG = { en: "English", zh: "繁體", both: "Both" };
    var h = '<div class="fu-help">Contact details are saved with the board (behind the passcode) so every device sees them. ' +
            "Aliases are other names used in the Owner field, separated by commas. Preferred channel and language set the default message.</div>";
    h += '<table class="fu-ctable"><thead><tr><th>Name</th><th class="hide-sm">Email</th><th class="hide-sm">Mobile</th><th class="hide-sm">WeChat</th><th>Prefers</th><th></th></tr></thead><tbody>';
    contacts.forEach(function (c) {
      h += "<tr><td><b>" + esc(c.name) + "</b>" + (c.me ? " (me)" : "") + (c.aliases ? '<br><small style="color:var(--muted)">' + esc(c.aliases) + "</small>" : "") + "</td>" +
           '<td class="hide-sm">' + esc(c.email || "") + '</td><td class="hide-sm">' + esc(c.mobile || "") + '</td><td class="hide-sm">' + esc(c.wechat || "") + "</td>" +
           "<td>" + (PREF[c.pref] || "") + " · " + (LANG[c.lang] || "") + "</td>" +
           '<td><button class="fu-linkbtn" data-edit-c="' + esc(c.id) + '">Edit</button></td></tr>';
    });
    h += "</tbody></table>";

    var missing = [];
    cards.forEach(function (card) {
      if (!isOpen(card)) return;
      ownerTokens(card.owner).forEach(function (t) {
        if (!findContact(t) && missing.map(norm).indexOf(norm(t)) < 0) missing.push(t);
      });
    });
    if (missing.length) {
      h += '<div class="fu-help" style="margin-top:12px">Owners on the board without contact details. Tap to add:</div><div class="fu-suggest">' +
           missing.map(function (m) { return '<button data-new-c="' + esc(m) + '">+ ' + esc(m) + "</button>"; }).join("") + "</div>";
    }
    h += '<div class="fu-send" style="margin-top:8px"><button class="primary" data-new-c="">+ New contact</button></div>';

    if (editingContact) {
      var c = editingContact;
      h += '<div class="fu-cform" id="fuCForm">' +
           '<div class="full"><label>Name (as you would greet them)</label><input data-f="name" value="' + esc(c.name || "") + '"></div>' +
           '<div class="full"><label>Other names used on the board (comma separated)</label><input data-f="aliases" value="' + esc(c.aliases || "") + '" placeholder="e.g. Rangi, Rangi Zhu, Wardens"></div>' +
           '<div><label>Email</label><input type="email" data-f="email" value="' + esc(c.email || "") + '"></div>' +
           '<div><label>Mobile (for WhatsApp / SMS)</label><input type="tel" data-f="mobile" value="' + esc(c.mobile || "") + '" placeholder="04xx xxx xxx"></div>' +
           '<div><label>WeChat ID (for reference)</label><input data-f="wechat" value="' + esc(c.wechat || "") + '"></div>' +
           '<div><label>Prefers</label><select data-f="pref">' + opt("email", "Email", c.pref) + opt("whatsapp", "WhatsApp", c.pref) + opt("sms", "SMS", c.pref) + opt("wechat", "WeChat", c.pref) + "</select></div>" +
           '<div><label>Language</label><select data-f="lang">' + opt("en", "English", c.lang) + opt("zh", "繁體中文", c.lang) + opt("both", "English + 繁體中文", c.lang) + "</select></div>" +
           '<div class="fu-send"><button class="primary" data-csave>Save contact</button><button class="fu-mark" data-ccancel>Cancel</button>' +
           (c._new || c.me ? "" : '<button class="fu-mark" data-cdel>Remove</button>') + "</div></div>";
    }
    return h;
  }

  function bindContacts(body) {
    body.querySelectorAll("[data-edit-c]").forEach(function (b) {
      b.addEventListener("click", function () {
        var c = contacts.find(function (x) { return x.id === b.dataset.editC; });
        editingContact = Object.assign({}, c); renderPanel(); scrollForm();
      });
    });
    body.querySelectorAll("[data-new-c]").forEach(function (b) {
      b.addEventListener("click", function () {
        editingContact = { id: "c" + Date.now(), name: b.dataset.newC, aliases: "", email: "", mobile: "", wechat: "", pref: "email", lang: "en", _new: true };
        renderPanel(); scrollForm();
      });
    });
    var form = body.querySelector("#fuCForm");
    if (!form) return;
    form.querySelector("[data-csave]").addEventListener("click", function () {
      var c = editingContact;
      form.querySelectorAll("[data-f]").forEach(function (i) { c[i.dataset.f] = i.value.trim(); });
      if (!c.name) { toast("Please enter a name."); return; }
      var wasNew = c._new; delete c._new;
      var idx = contacts.findIndex(function (x) { return x.id === c.id; });
      if (idx >= 0) contacts[idx] = c; else contacts.push(c);
      contacts.sort(function (a, b) { return (b.me ? 1 : 0) - (a.me ? 1 : 0) || a.name.localeCompare(b.name); });
      editingContact = null; cacheContacts(); saveState(); refreshCount(); renderPanel();
      toast(wasNew ? "Contact added." : "Contact saved.");
    });
    form.querySelector("[data-ccancel]").addEventListener("click", function () { editingContact = null; renderPanel(); });
    var del = form.querySelector("[data-cdel]");
    if (del) del.addEventListener("click", function () {
      contacts = contacts.filter(function (x) { return x.id !== editingContact.id; });
      editingContact = null; cacheContacts(); saveState(); refreshCount(); renderPanel();
    });
  }
  function scrollForm() { var f = document.getElementById("fuCForm"); if (f) f.scrollIntoView({ behavior: "smooth", block: "center" }); }

  /* ── header button ────────────────────────────────────────────────────── */
  var btn = document.createElement("button");
  btn.className = "lock-btn fu-open-btn"; btn.type = "button";
  btn.title = "Follow up open actions by email, WhatsApp, SMS or WeChat";
  btn.innerHTML = '📨 Follow-up<span class="fu-count" id="fuCount">0</span>';
  btn.addEventListener("click", function () { openPanel("people"); });
  var lockB = document.querySelector('.info-bar .lock-btn[onclick="lockBoard()"]');
  if (lockB) lockB.parentNode.insertBefore(btn, lockB); else document.querySelector(".info-bar").appendChild(btn);

  function refreshCount() {
    var n = countNeeding(), el = document.getElementById("fuCount");
    if (!el) return;
    el.textContent = n; el.classList.toggle("zero", n === 0);
  }

  /* Open straight to the panel from a link such as index.html#followup
     (used by the Monday reminder). */
  function hashOpen() { if (/followup/i.test(location.hash)) setTimeout(function () { openPanel("people"); }, 300); }
  window.addEventListener("hashchange", hashOpen);

  render();
  refreshCount();
  hashOpen();
  window.G7Followup = { open: openPanel, contacts: function () { return contacts; }, groups: groups };
})();
