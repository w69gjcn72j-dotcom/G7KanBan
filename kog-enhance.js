/* KOGCycle enhancement — stage dropdowns, per-stage completed trays,
   stage icons, and a phone layout that keeps the cycle visible.
   Loaded from cycle.html. Delete the two lines in cycle.html to switch it off. */

(function () {
  "use strict";

  var STAGE_NAMES = ["First Contact", "Face to Face", "Follow Up", "Meet the Minister",
                     "Conversion/Baptism", "Integration", "Church Life", "Grow & Serve", "Send"];

  var TEAM_TINT = {
    glorify:"#E4573D", grow:"#5BA85A", go:"#1E6E68", giftedness:"#C9A227",
    governance:"#123A63", glue:"#2C5583", gregarious:"#8A7A5E"
  };

  /* One glyph per stage, drawn on a 24x24 grid, stroked in the current colour
     so it inherits the teal and dims with the node when a stage is clear. */
  function svg(inner) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
           'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + '</svg>';
  }
  var ICONS = [
    /* 1 First Contact - a voice going out */
    svg('<circle cx="8" cy="12" r="2.4" fill="currentColor" stroke="none"/>' +
        '<path d="M13 8.2a5.4 5.4 0 0 1 0 7.6"/><path d="M16.2 5a9.6 9.6 0 0 1 0 14"/>'),
    /* 2 Face to Face - two people, turned toward each other */
    svg('<circle cx="7.6" cy="8.4" r="2.6"/><circle cx="16.4" cy="8.4" r="2.6"/>' +
        '<path d="M3.4 18.6c.5-2.6 2.2-4 4.2-4s3.7 1.4 4.2 4"/>' +
        '<path d="M12.2 18.6c.5-2.6 2.2-4 4.2-4s3.7 1.4 4.2 4"/>'),
    /* 3 Follow Up - coming back round */
    svg('<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20.4 4.2v4.4h-4.4"/>' +
        '<circle cx="12" cy="12" r="1.9" fill="currentColor" stroke="none"/>'),
    /* 4 Meet the Minister - a handshake */
    svg('<path d="M3 10.6l3.4-3.1 3.6 1.4 2 1.9-1.7 1.6-2.2-1.5"/>' +
        '<path d="M21 10.6l-3.4-3.1-3.2 1.2"/>' +
        '<path d="M10.3 12.4l2.4 2.2M12.6 11l2.6 2.4M15 9.9l2.7 2.5"/>'),
    /* 5 Conversion / Baptism - water and the cross */
    svg('<path d="M12 3.2c2.6 3.3 4 5.6 4 7.3a4 4 0 0 1-8 0c0-1.7 1.4-4 4-7.3z"/>' +
        '<path d="M12 8.1v5.6M9.8 10.2h4.4" stroke-width="1.5"/>' +
        '<path d="M3.2 18.4c1.6 0 1.6 1.5 3.2 1.5s1.6-1.5 3.2-1.5 1.6 1.5 3.2 1.5 1.6-1.5 3.2-1.5 1.6 1.5 3.2 1.5"/>'),
    /* 6 Integration - brought into the body */
    svg('<circle cx="8.6" cy="12" r="4.6"/><circle cx="15.4" cy="12" r="4.6"/>' +
        '<path d="M12 8.2a4.6 4.6 0 0 0 0 7.6" stroke-width="1.4"/>'),
    /* 7 Church Life - the gathered church */
    svg('<path d="M12 2.6v4M10.2 4.2h3.6" stroke-width="1.5"/>' +
        '<path d="M5 20.4V11l7-4.4 7 4.4v9.4z"/>' +
        '<path d="M10.2 20.4v-4.2a1.8 1.8 0 0 1 3.6 0v4.2"/>'),
    /* 8 Grow & Serve - growing up into him */
    svg('<path d="M12 20.4v-7.8"/>' +
        '<path d="M12 12.6c0-2.6-1.7-4.6-4.4-5 0 2.8 1.6 4.7 4.4 5z"/>' +
        '<path d="M12 12.6c0-3.1 1.9-5.4 5-5.8 0 3.3-1.9 5.5-5 5.8z"/>' +
        '<path d="M7.6 20.4h8.8" stroke-width="1.5"/>'),
    /* 9 Send - out from the circle */
    svg('<path d="M12.6 3.4a8.6 8.6 0 1 0 8 8"/>' +
        '<path d="M11.4 12.6L20.6 3.4"/><path d="M15.4 3.4h5.2v5.2"/>')
  ];

  var lastCards = null;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c];
    });
  }

  function doneItemHTML(c) {
    var team = String(c.team || "").toLowerCase();
    var tint = TEAM_TINT[team] || "#ccc";
    return '<div class="item done" style="border-left-color:' + tint + '">' +
             '<div class="item-t">' + esc(c.title) + '</div>' +
             (team ? '<div class="item-m"><span class="tag">#' + esc(team) + '</span></div>' : '') +
           '</div>';
  }

  /* Put an icon on each circle of the ring. Done once; the nodes are static markup. */
  function paintRing() {
    for (var i = 0; i < STAGE_NAMES.length; i++) {
      var node = document.getElementById("node" + i);
      if (!node || node.querySelector(".node-ico")) continue;
      var ico = document.createElement("span");
      ico.className = "node-ico";
      ico.innerHTML = ICONS[i];
      node.insertBefore(ico, node.firstChild);
    }
  }

  /* The hint only ever shows on a narrow screen; CSS decides when. */
  function addRotateHint() {
    var ring = document.querySelector(".ring");
    if (!ring || document.querySelector(".rotate-hint")) return;
    var hint = document.createElement("div");
    hint.className = "rotate-hint";
    hint.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<rect x="6" y="2.6" width="12" height="18.8" rx="2.2"/>' +
      '<path d="M2.6 15.4a9.4 9.4 0 0 0 2.6 4.4M2.2 12.2v3.2h3.2"/></svg>' +
      '<span>Turn your phone sideways for the full cycle</span>';
    ring.parentNode.insertBefore(hint, ring);
  }

  /* Make a side box fold. */
  function foldSideBox(boxId, startOpen) {
    var box = document.getElementById(boxId);
    if (!box) return;
    var h3 = box.querySelector("h3");
    if (!h3 || h3.classList.contains("fold-head")) return;

    var body = document.createElement("div");
    body.className = "fold-body";
    while (h3.nextSibling) body.appendChild(h3.nextSibling);
    box.appendChild(body);

    h3.classList.add("fold-head");
    h3.setAttribute("role", "button");
    h3.setAttribute("tabindex", "0");
    var chev = document.createElement("span");
    chev.className = "chev";
    chev.setAttribute("aria-hidden", "true");
    h3.appendChild(chev);

    box.setAttribute("data-open", startOpen ? "1" : "0");
    h3.setAttribute("aria-expanded", startOpen ? "true" : "false");
  }

  function enhance(cards) {
    var gridEl = document.getElementById("stageGrid");
    if (!gridEl) return;

    for (var i = 0; i < STAGE_NAMES.length; i++) {
      var card = document.getElementById("stage" + i);
      if (!card) continue;
      var head = card.querySelector("h4");
      if (!head) continue;

      if (!card.querySelector(":scope > .stage-body")) {
        var body = document.createElement("div");
        body.className = "stage-body";
        while (head.nextSibling) body.appendChild(head.nextSibling);
        card.appendChild(body);
      }

      if (!head.classList.contains("stage-head")) {
        head.classList.add("stage-head");
        head.setAttribute("role", "button");
        head.setAttribute("tabindex", "0");
        var ico = document.createElement("span");
        ico.className = "stage-ico";
        ico.innerHTML = ICONS[i];
        head.insertBefore(ico, head.firstChild);
        var chev = document.createElement("span");
        chev.className = "chev";
        chev.setAttribute("aria-hidden", "true");
        head.appendChild(chev);
      }

      var liveCount = card.querySelectorAll(".stage-body > .item:not(.done)").length;
      card.setAttribute("data-clear", liveCount ? "0" : "1");
      card.setAttribute("data-open", liveCount ? "1" : "0");
      head.setAttribute("aria-expanded", liveCount ? "true" : "false");

      if (cards && cards.length) {
        var stage = STAGE_NAMES[i];
        var fin = cards.filter(function (c) {
          return c && c.col === "done" && String(c.kog || "") === stage;
        });
        if (fin.length) {
          var tray = document.createElement("details");
          tray.className = "done-tray";
          tray.innerHTML = '<summary>Completed (' + fin.length + ')</summary>' +
                           fin.map(doneItemHTML).join("");
          card.querySelector(":scope > .stage-body").appendChild(tray);
        }
      }
    }

    paintRing();
    addRotateHint();
    /* Completed starts shut - it is history. Not-on-the-cycle opens itself when
       something is sitting in it, because that is work nobody has placed yet. */
    foldSideBox("doneBox", false);
    var un = document.getElementById("unmapList");
    var unHas = un && un.querySelector(".item");
    foldSideBox("unmappedBox", !!unHas);
  }

  document.addEventListener("click", function (e) {
    if (!e.target.closest) return;
    var head = e.target.closest("h4.stage-head");
    if (head) {
      var card = head.parentElement;
      var open = card.getAttribute("data-open") === "1";
      card.setAttribute("data-open", open ? "0" : "1");
      head.setAttribute("aria-expanded", open ? "false" : "true");
      return;
    }
    var fh = e.target.closest("h3.fold-head");
    if (fh) {
      var box = fh.parentElement;
      var o = box.getAttribute("data-open") === "1";
      box.setAttribute("data-open", o ? "0" : "1");
      fh.setAttribute("aria-expanded", o ? "false" : "true");
    }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    if (!e.target.closest) return;
    var t = e.target.closest("h4.stage-head, h3.fold-head");
    if (!t) return;
    e.preventDefault();
    t.click();
  });

  var prePrint = [];
  window.addEventListener("beforeprint", function () {
    prePrint = [];
    document.querySelectorAll('#stageGrid .card, .side[data-open]').forEach(function (c) {
      prePrint.push([c, c.getAttribute("data-open")]);
      c.setAttribute("data-open", "1");
    });
    document.querySelectorAll("details.done-tray").forEach(function (d) {
      prePrint.push([d, d.open ? "open" : ""]);
      d.open = true;
    });
  });
  window.addEventListener("afterprint", function () {
    prePrint.forEach(function (pair) {
      if (pair[0].tagName === "DETAILS") pair[0].open = pair[1] === "open";
      else pair[0].setAttribute("data-open", pair[1]);
    });
    prePrint = [];
  });

  function install() {
    if (typeof window.draw !== "function" || window.draw.__kogWrapped) return false;
    var original = window.draw;
    var wrapped = function (cards) {
      var out = original.apply(this, arguments);
      lastCards = cards;
      try { enhance(cards); } catch (err) {}
      return out;
    };
    wrapped.__kogWrapped = true;
    window.draw = wrapped;
    return true;
  }

  try {
    install();
    paintRing();
    addRotateHint();
    if (document.querySelector("#stageGrid .card")) {
      try { enhance(lastCards); } catch (err) {}
    }
    var grid = document.getElementById("stageGrid");
    if (grid && window.MutationObserver) {
      new MutationObserver(function () {
        if (!window.draw || !window.draw.__kogWrapped) install();
        if (!document.querySelector("#stageGrid .stage-body")) {
          try { enhance(lastCards); } catch (err) {}
        }
      }).observe(grid, { childList: true });
    }
  } catch (err) {}
})();
