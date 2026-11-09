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
     so it inherits the node's tint and dims with it when a stage is clear.
     Every glyph is drawn to the same rules so the ring reads evenly:
       - it fills the box from 4 to 20 on both axes, no further and no less
       - it is balanced about x=12, so nothing looks pushed to one side
       - one stroke weight throughout, no per-path overrides
     Break any of those and that one circle looks wrong next to the other eight. */
  function svg(inner) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
           'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + '</svg>';
  }
  var ICONS = [
    /* 1 First Contact - a word spoken */
    svg('<path d="M20 14.8a2.4 2.4 0 0 1-2.4 2.4H9.2L4.4 20.4V6.8a2.4 2.4 0 0 1 2.4-2.4h10.8A2.4 2.4 0 0 1 20 6.8z"/>' +
        '<path d="M8.8 10.4h6.4M8.8 13.6h4"/>'),
    /* 2 Face to Face - two people, turned toward each other */
    svg('<circle cx="8.2" cy="8.8" r="2.7"/><circle cx="15.8" cy="8.8" r="2.7"/>' +
        '<path d="M4.2 18.8c.5-2.6 2-4 4-4s3.5 1.4 4 4"/>' +
        '<path d="M11.8 18.8c.5-2.6 2-4 4-4s3.5 1.4 4 4"/>'),
    /* 3 Follow Up - coming back round */
    svg('<path d="M19.6 12a7.6 7.6 0 1 1-2.5-5.6"/><path d="M20 4.4v4.2h-4.2"/>' +
        '<circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none"/>'),
    /* 4 Meet the Minister - sitting down together over a cup */
    svg('<path d="M5.2 7.6h11.2v6.2a4.6 4.6 0 0 1-4.6 4.6H9.8a4.6 4.6 0 0 1-4.6-4.6z"/>' +
        '<path d="M16.4 9.2h1.4a2.5 2.5 0 0 1 0 5h-1.4"/>' +
        '<path d="M4 20.4h13.6"/>'),
    /* 5 Conversion / Baptism - water and the cross */
    svg('<path d="M12 4c2.5 3.2 3.9 5.4 3.9 7.1a3.9 3.9 0 0 1-7.8 0C8.1 9.4 9.5 7.2 12 4z"/>' +
        '<path d="M12 8.6v5M10 10.6h4"/>' +
        '<path d="M4 18.8c1.6 0 1.6 1.4 3.2 1.4s1.6-1.4 3.2-1.4 1.6 1.4 3.2 1.4 1.6-1.4 3.2-1.4 1.6 1.4 3.2 1.4"/>'),
    /* 6 Integration - brought into the one body */
    svg('<circle cx="9.2" cy="12" r="5"/><circle cx="14.8" cy="12" r="5"/>'),
    /* 7 Church Life - the gathered church */
    svg('<path d="M12 4v3.8M10.3 5.6h3.4"/>' +
        '<path d="M5 20.4v-9l7-4.2 7 4.2v9z"/>' +
        '<path d="M10.2 20.4v-4a1.8 1.8 0 0 1 3.6 0v4"/>'),
    /* 8 Grow & Serve - growing up into him */
    svg('<path d="M12 20.4v-7.8"/>' +
        '<path d="M12 12.6c0-2.8-1.8-4.8-4.7-5.2 0 3 1.8 5 4.7 5.2z"/>' +
        '<path d="M12 12.6c0-2.8 1.8-4.8 4.7-5.2 0 3-1.8 5-4.7 5.2z"/>' +
        '<path d="M7.4 20.4h9.2"/>'),
    /* 9 Send - carried out from here */
    svg('<path d="M20.2 4.4 4 11.2l6.6 2.4 2.4 6.6z"/><path d="M20.2 4.4 10.6 13.6"/>')
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
