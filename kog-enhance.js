/* KOGCycle enhancement — stage dropdowns, per-stage completed trays,
   phone pathway. Loaded from cycle.html. Delete the two lines in
   cycle.html to switch it off. */

(function () {
  "use strict";

  var STAGE_NAMES = ["First Contact", "Face to Face", "Follow Up", "Meet the Minister",
                     "Conversion/Baptism", "Integration", "Church Life", "Grow & Serve", "Send"];
  var TEAM_TINT = {
    glorify:"#E4573D", grow:"#5BA85A", go:"#1E6E68", giftedness:"#C9A227",
    governance:"#123A63", glue:"#2C5583", gregarious:"#8A7A5E"
  };
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

    var box = document.getElementById("doneBox");
    if (box && cards && cards.length && !box.dataset.folded) {
      box.dataset.folded = "1";
      box.classList.add("folded");
      var h3 = box.querySelector("h3");
      if (h3) {
        var note = document.createElement("span");
        note.className = "foldnote";
        note.textContent = "\u2014 shown under each stage; tap to list them all";
        h3.appendChild(note);
        h3.addEventListener("click", function () { box.classList.toggle("folded"); });
      }
    }
  }

  document.addEventListener("click", function (e) {
    var head = e.target.closest ? e.target.closest("h4.stage-head") : null;
    if (!head) return;
    var card = head.parentElement;
    var open = card.getAttribute("data-open") === "1";
    card.setAttribute("data-open", open ? "0" : "1");
    head.setAttribute("aria-expanded", open ? "false" : "true");
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    var head = e.target.closest ? e.target.closest("h4.stage-head") : null;
    if (!head) return;
    e.preventDefault();
    head.click();
  });

  var prePrint = [];
  window.addEventListener("beforeprint", function () {
    prePrint = [];
    document.querySelectorAll('#stageGrid .card').forEach(function (c) {
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
