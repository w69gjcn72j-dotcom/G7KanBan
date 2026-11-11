/*! g7-i18n.js - puts the G7 pages' own interface text into Chinese when the shared
   St Paul's language switch (kog-shell.js) is set to 简 or 繁.

   A page loads kog-shell.js first, then this file, then calls once:
     G7I18N.init({ zh: { "English text": "简体中文", ... }, re: [[/^(\d+) days$/, "$1 天"]] });

   How it works
   - Only whole interface phrases that appear in the list are changed (text, placeholder, title,
     aria-label). Names, notes and anything else people type are never in the list, so they stay
     exactly as written, and nothing is ever saved in Chinese by mistake.
   - Chinese is written once, in Simplified. When 繁 is chosen, kog-shell.js converts it in place.
   - Editable areas, form fields, <option>s without a value, and anything marked data-kog-keep
     are left alone.
   - Going back to English puts the original text back exactly. */
(function () {
  "use strict";
  var doc = document, ZH = {}, RE = [], on = false, mo = null;
  var kept = new WeakMap(), keptAttr = new WeakMap();
  var ATTRS = ["placeholder", "title", "aria-label"];

  function barred(el) {
    var t = el.nodeName;
    return t === "SCRIPT" || t === "STYLE" || t === "TEXTAREA" || t === "NOSCRIPT" ||
      (t === "OPTION" && !el.hasAttribute("value")) || el.id === "kog-shell" ||
      el.isContentEditable || el.hasAttribute("data-kog-keep") || el.hasAttribute("data-g7-keep");
  }
  function inBarred(el) {
    for (; el && el.nodeType === 1; el = el.parentNode) if (barred(el)) return true;
    return false;
  }
  function look(s) {
    var k = s.replace(/\s+/g, " ").trim(), i, m;
    if (!k || !/[A-Za-z]/.test(k)) return null;
    if (Object.prototype.hasOwnProperty.call(ZH, k)) return ZH[k];
    for (i = 0; i < RE.length; i++) { m = k.match(RE[i][0]); if (m) return k.replace(RE[i][0], RE[i][1]); }
    return null;
  }
  function swap(s) {
    var z = look(s);
    if (z == null) return null;
    var lead = s.match(/^\s*/)[0], tail = s.match(/\s*$/)[0];
    return lead + z + tail;
  }
  function doText(n) {
    var r = kept.get(n), z;
    if (r) {
      /* still ours, or ours turned into 繁 by kog-shell.js: leave it */
      if (n.data === r.c || (window.KOG && KOG.hant && KOG.hant(r.c) === n.data)) return;
      kept.delete(n);                                   /* the page wrote new text here */
    }
    z = swap(n.data);
    if (z != null && z !== n.data) { kept.set(n, { o: n.data, c: z }); n.data = z; }
  }
  function doAttrs(el) {
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i], v = el.getAttribute(a), r, z;
      if (!v) continue;
      r = keptAttr.get(el) || {};
      if (r[a] && v === r[a].c) continue;
      z = swap(v);
      if (z != null && z !== v) { r[a] = { o: v, c: z }; keptAttr.set(el, r); el.setAttribute(a, z); }
    }
  }
  function walk(root, each) {
    if (root.nodeType === 3) { if (!inBarred(root.parentNode)) each(root); return; }
    if (root.nodeType !== 1 || inBarred(root)) return;
    var w = doc.createTreeWalker(root, 5, { acceptNode: function (n) { return n.nodeType === 1 && barred(n) ? 2 : 1; } }), n = root;
    do { each(n); } while ((n = w.nextNode()));
  }
  function convert(n) { if (n.nodeType === 3) doText(n); else doAttrs(n); }
  function restore(n) {
    var r, a;
    if (n.nodeType === 3) { r = kept.get(n); if (r) { if (n.data === r.c) n.data = r.o; kept.delete(n); } return; }
    r = keptAttr.get(n);
    if (r) { for (a in r) if (n.getAttribute(a) === r[a].c) n.setAttribute(a, r[a].o); keptAttr.delete(n); }
  }
  function titleSwap() {
    var z = look(doc.title);
    if (on && z) { if (!G.titleEn) G.titleEn = doc.title; doc.title = z; }
    else if (!on && G.titleEn) { doc.title = G.titleEn; G.titleEn = null; }
  }
  function apply() {
    var want = !!(window.KOG && KOG.lang !== "en");
    if (want) {
      on = true;
      walk(doc.body, convert);
      if (!mo && window.MutationObserver) {
        mo = new MutationObserver(function (recs) {
          for (var i = 0; i < recs.length; i++) {
            var r = recs[i], j;
            if (r.type === "childList") for (j = 0; j < r.addedNodes.length; j++) walk(r.addedNodes[j], convert);
            else if (r.type === "characterData") { if (!inBarred(r.target.parentNode)) doText(r.target); }
            else if (!inBarred(r.target)) doAttrs(r.target);
          }
        });
        mo.observe(doc.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
      }
      if (KOG.lang !== "zh-Hant") doc.documentElement.lang = "zh-Hans";
    } else if (on) {
      on = false;
      if (mo) { mo.disconnect(); mo = null; }
      walk(doc.body, restore);
      doc.documentElement.lang = "en";
    }
    titleSwap();
  }

  var G = window.G7I18N = {
    /* the Chinese for one interface phrase, or the English if there is none: for text a page builds itself */
    t: function (s) { return window.KOG && KOG.lang !== "en" ? (look(String(s)) || s) : s; },
    zh: function () { return !!(window.KOG && KOG.lang !== "en"); },
    init: function (o) {
      var k;
      for (k in (o.zh || {})) ZH[k.replace(/\s+/g, " ").trim()] = o.zh[k];
      RE = RE.concat(o.re || []);
      if (!window.KOG) return;
      if (!G.wrapped) {                 /* confirm and alert boxes follow the switch too */
        G.wrapped = true;
        ["confirm", "alert", "prompt"].forEach(function (f) {
          var orig = window[f];
          if (typeof orig !== "function") return;
          window[f] = function (m) {
            var a = Array.prototype.slice.call(arguments);
            if (G.zh()) { a[0] = G.t(m); if (KOG.lang === "zh-Hant" && KOG.hant) a[0] = KOG.hant(a[0]); }
            return orig.apply(window, a);
          };
        });
      }
      doc.addEventListener("kog:lang", apply);
      if (doc.body) apply(); else doc.addEventListener("DOMContentLoaded", apply);
    }
  };
})();
