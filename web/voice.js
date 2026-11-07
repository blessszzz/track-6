/* voice.js: voice assistant + language detection for the Diabetes Risk Screen.
 *
 * Install: save next to index.html and add this line right AFTER the main inline <script>:
 *     <script src="voice.js"></script>
 *
 * It reuses your globals (S, lang, T, full, buildForm, update, compute, MODEL, LANGS).
 * Voice languages: English (en-GB) and Francais (fr-FR) only. The page text can stay in any
 * language (e.g. Kreol Morisien): the voice assistant keeps its own language (vlang) and speaks
 * from the English/French strings, while the form on screen stays in the page language.
 *
 * PRIVACY: browser speech recognition (Chrome, Edge, Safari) sends audio to the vendor's speech
 * service. The voice panel says so. Typing remains fully local.
 */
(function () {
  "use strict";

  /* ================= strings ================= */
  const VT = {
    en: {
      btn: "🎤 Start voice assistant", stop: "⏹ Stop voice assistant",
      hint: "Answer out loud. Commands: “skip”, “back”, “stop”.",
      priv: "🎤 Voice input is optional. In most browsers the audio is processed by the browser vendor's speech service (for example Google in Chrome), so it is not fully on-device. Typing stays fully local.",
      listening: "Listening…", speaking: "Speaking…", heard: "Heard",
      hello: "Hello.", langQ: "Which language? English or Français?",
      retry: "Sorry, I did not understand. Please try again.", confirm: "Correct?",
      noSpeech: "I did not hear anything. Voice assistant stopped.",
      denied: "Microphone permission was denied. Allow the microphone in your browser settings and try again.",
      network: "The browser speech service needs an internet connection.",
      unsupported: "Voice input is not supported in this browser. Try Chrome, Edge or Safari.",
      daysHint: "Say a number from 0 to 30.", done: "All questions answered.",
      resultIs: "Estimated risk:", percent: "percent",
      notDx: "This is not a diagnosis. Please confirm with a blood test.",
      q: { age: "How old is the person?", sex: "Sex: female or male?", height: "Height in centimetres?", weight: "Weight in kilograms?" },
      short: { age: "Age", height: "Height", weight: "Weight" },
      unit: { age: "years", height: "centimetres", weight: "kilograms" }
    },
    fr: {
      btn: "🎤 Lancer l'assistant vocal", stop: "⏹ Arrêter l'assistant vocal",
      hint: "Répondez à voix haute. Commandes : « passer », « retour », « stop ».",
      priv: "🎤 La saisie vocale est facultative. Dans la plupart des navigateurs, l'audio est traité par le service vocal de l'éditeur du navigateur (par exemple Google dans Chrome) : il n'est donc pas entièrement traité sur l'appareil. La saisie au clavier reste entièrement locale.",
      listening: "J'écoute…", speaking: "Je parle…", heard: "Entendu",
      hello: "Bonjour.", langQ: "Quelle langue ? English ou Français ?",
      retry: "Désolé, je n'ai pas compris. Veuillez réessayer.", confirm: "C'est correct ?",
      noSpeech: "Je n'ai rien entendu. Assistant vocal arrêté.",
      denied: "L'accès au micro a été refusé. Autorisez le micro dans les paramètres du navigateur puis réessayez.",
      network: "Le service vocal du navigateur nécessite une connexion internet.",
      unsupported: "La saisie vocale n'est pas prise en charge par ce navigateur. Essayez Chrome, Edge ou Safari.",
      daysHint: "Dites un nombre de 0 à 30.", done: "Toutes les questions sont remplies.",
      resultIs: "Risque estimé :", percent: "pour cent",
      notDx: "Ceci n'est pas un diagnostic. Confirmer par une prise de sang.",
      q: { age: "Quel âge a la personne ?", sex: "Sexe : femme ou homme ?", height: "Taille en centimètres ?", weight: "Poids en kilogrammes ?" },
      short: { age: "Âge", height: "Taille", weight: "Poids" },
      unit: { age: "ans", height: "centimètres", weight: "kilogrammes" }
    }
  };
  let vlang = lang === "en" ? "en" : "fr";   // voice language (never Kreol)
  const V = () => VT[vlang];

  const REC = { en: "en-GB", fr: "fr-FR" };
  const STEPS = ["age", "sex", "height", "weight", "HighBP", "HighChol", "Stroke", "HeartDiseaseorAttack",
    "DiffWalk", "GenHlth", "Smoker", "PhysActivity", "HvyAlcoholConsump", "Fruits", "Veggies", "MentHlth", "PhysHlth"];
  const NUM = { age: [18, 100], height: [120, 220], weight: [30, 250] };
  const DAYS = { MentHlth: [0, 30], PhysHlth: [0, 30] };

  /* ================= text parsing (pure functions) ================= */
  const norm = s => String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/(\d)[.,](\d)/g, "$1#$2").replace(/[^a-z0-9#\s]/g, " ").replace(/#/g, ".")
    .replace(/\s+/g, " ").trim();
  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

  const W_COMMON = {
    zero: 0, aucun: 0, aucune: 0, none: 0, nothing: 0, rien: 0,
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
    thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
    twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
    un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, sept: 7, huit: 8, neuf: 9, dix: 10, onze: 11, douze: 12,
    treize: 13, quatorze: 14, quinze: 15, seize: 16, vingt: 20, vingts: 20, trente: 30, quarante: 40, cinquante: 50, soixante: 60
  };
  function wordsToNum(tokens) {
    const D = W_COMMON;
    const H = ["hundred", "cent", "cents"];
    let total = 0, found = false, last = null;
    for (const tk of tokens) {
      if (has(D, tk)) {
        total += ((tk === "vingt" || tk === "vingts") && last === 4) ? 76 : D[tk]; // quatre-vingt = 80
        last = D[tk]; found = true;
      } else if (H.includes(tk)) { total = (total || 1) * 100; last = 100; found = true; }
    }
    return found ? total : null;
  }

  const YES = new Set(["yes", "yeah", "yep", "yup", "sure", "correct", "right", "ok", "okay", "oui", "ouais", "accord"]);
  const NO = new Set(["no", "nope", "non", "pas", "never", "jamais", "none", "aucun"]);
  function firstYN(n) {
    for (const tk of n.split(" ")) { if (YES.has(tk)) return 1; if (NO.has(tk)) return 0; }
    return null;
  }

  function parseNumber(k, txt) {
    const n = norm(txt), ds = n.match(/\d+(?:\.\d+)?/g);
    let v = null;
    if (ds) {
      v = parseFloat(ds[0]);
      if (k === "height" && v < 3) v = ds.length >= 2 ? v * 100 + parseFloat(ds[1]) : v * 100; // "1.72 m" / "1 meter 72"
    } else {
      v = wordsToNum(n.split(" "));
      if (v === null && DAYS[k] && firstYN(n) === 0) v = 0;
    }
    if (v === null || isNaN(v)) return null;
    const r = NUM[k] || DAYS[k];
    if (v < r[0] || v > r[1]) return null;
    return k === "weight" ? Math.round(v * 2) / 2 : Math.round(v);
  }
  function parseSex(txt) {
    const n = norm(txt);
    if (/\b(female|woman|girl|femme|femelle)\b/.test(n)) return 0;
    if (/\b(male|man|boy|homme)\b/.test(n)) return 1;
    return null;
  }
  function parseGen(txt) {
    const n = norm(txt);
    if (/\b(very good|tres bonne?)\b/.test(n)) return 2;
    if (/\b(excellent|excellente)\b/.test(n)) return 1;
    if (/\b(poor|bad|mauvaise?)\b/.test(n)) return 5;
    if (/\b(fair|average|so so|passable|moyenne?)\b/.test(n)) return 4;
    if (/\b(good|bonne?|bon|bien)\b/.test(n)) return 3;
    const d = n.match(/\b[1-5]\b/);
    return d ? +d[0] : null;
  }
  function parseVal(k, txt) {
    if (k === "sex") return parseSex(txt);
    if (k === "GenHlth") return parseGen(txt);
    if (NUM[k] || DAYS[k]) return parseNumber(k, txt);
    return firstYN(norm(txt));
  }
  function command(txt) {
    const n = norm(txt);
    if (n.split(" ").length > 3) return null;
    if (/\b(stop|stope|arrete|arret|termine|fini|quit)\b/.test(n)) return "stop";
    if (/\b(back|previous|retour|retourne|precedent)\b/.test(n)) return "back";
    if (/\b(skip|next|passer|passe|suivant|zappe)\b/.test(n)) return "next";
    return null;
  }

  /* ---------- language detection from a transcript (no AI service, simple word scoring) ---------- */
  const LEX = {
    en: ["i", "am", "is", "are", "the", "my", "years", "old", "hello", "yes", "english", "female", "male", "woman", "man", "height", "weight", "good", "fair", "poor", "not", "have", "has", "days"],
    fr: ["je", "suis", "ai", "oui", "non", "ans", "jours", "bonjour", "francais", "femme", "homme", "taille", "poids", "bonne", "mauvaise", "passable", "pas", "les", "des", "une", "un", "le", "la", "mon", "ma", "est"]
  };
  function detectLang(text, min) {
    const toks = norm(text).split(" "), sc = {};
    for (const l in LEX) sc[l] = toks.filter(t => LEX[l].includes(t)).length;
    const ranked = Object.entries(sc).sort((a, b) => b[1] - a[1]);
    if (ranked[0][1] >= (min || 1) && ranked[0][1] > ranked[1][1]) return ranked[0][0];
    return null;
  }
  function pickLang(alts) {
    for (const a of alts) {
      const n = norm(a);
      if (/\b(francais|french|francaise)\b/.test(n)) return "fr";
      if (/\b(english|anglais|inglish)\b/.test(n)) return "en";
    }
    for (const a of alts) { const d = detectLang(a, 2); if (d) return d; }
    return null;
  }

  window.VoiceParse = { norm, wordsToNum, parseVal, command, detectLang, pickLang };

  /* ================= everything below needs the page ================= */
  if (!document.getElementById("view-s")) return;

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const synth = window.speechSynthesis;
  let running = false, rec = null, fatal = null;

  const el = id => document.getElementById(id);
  const setStatus = m => { el("v-status").textContent = m || ""; };
  const showHeard = m => { el("v-heard").textContent = m ? V().heard + ": “" + m + "”" : ""; };

  /* ---------- panel ---------- */
  const css = document.createElement("style");
  css.textContent =
    ".vhl{outline:3px solid var(--accent);outline-offset:4px;border-radius:8px}" +
    "#voice{margin-bottom:18px}#voice .vrow{display:flex;flex-wrap:wrap;gap:10px 14px;align-items:center}" +
    "#v-heard{font-family:var(--font-mono);margin-top:8px;min-height:1.5em;overflow-wrap:anywhere}" +
    "#v-btn[aria-pressed=\"true\"]{background:var(--high);border-color:var(--high);color:var(--accent-ink)}" +
    "@media(prefers-reduced-motion:no-preference){#v-btn[aria-pressed=\"true\"]{animation:vpulse 1.6s ease-in-out infinite}}" +
    "@keyframes vpulse{50%{opacity:.82}}";
  document.head.appendChild(css);

  const panel = document.createElement("div");
  panel.className = "panel"; panel.id = "voice";
  panel.innerHTML =
    '<div class="vrow"><button type="button" class="btn" id="v-btn" aria-pressed="false"></button>' +
    '<span class="small" id="v-status" role="status" aria-live="polite"></span></div>' +
    '<div id="v-heard" aria-live="polite"></div>' +
    '<div class="small" id="v-hint" style="margin-top:6px"></div>' +
    '<div class="small" id="v-priv" style="margin-top:6px"></div>';
  el("view-s").prepend(panel);
  el("v-btn").addEventListener("click", run);

  function relabel() {
    el("v-btn").textContent = running ? V().stop : V().btn;
    el("v-btn").setAttribute("aria-pressed", String(running));
    el("v-hint").textContent = V().hint;
    el("v-priv").textContent = V().priv;
    if (!SR) { el("v-btn").disabled = true; setStatus(V().unsupported); }
  }
  // keep the panel in the current language whenever the page re-renders
  const _full = window.full;
  window.full = function () {
    _full();
    if (!running && (lang === "en" || lang === "fr")) vlang = lang; // follow the language buttons
    relabel();
  };

  function setSiteLang(l, save) {                 // page language (can be any language in LANGS)
    if (l === lang || !LANGS[l]) return;
    lang = l;
    if (save !== false) { try { localStorage.setItem("dscreen-lang", l); } catch (_) {} }
    full();
  }
  function setVoiceLang(l) {                      // voice language: English or French only
    if (l !== "en" && l !== "fr") return;
    vlang = l;
    if (lang === "en" || lang === "fr") setSiteLang(l); // keep the page in step, but never override Kreol
    else relabel();
  }

  /* ---------- automatic language on first visit (browser setting, not saved) ---------- */
  try {
    if (!localStorage.getItem("dscreen-lang")) {
      const cand = (navigator.languages || [navigator.language || "en"]).map(x => String(x).toLowerCase());
      let l = null;
      for (const c of cand) {
        if (c.startsWith("fr")) { l = "fr"; break; }
        if (c.startsWith("en")) { l = "en"; break; }
      }
      if (l && l !== lang) setSiteLang(l, false);
    }
  } catch (_) {}
  relabel();

  /* ---------- speech out ---------- */
  function pickVoice(code) {
    const vs = synth ? synth.getVoices() : [];
    return vs.find(v => v.lang.toLowerCase().replace("_", "-") === code.toLowerCase()) ||
      vs.find(v => v.lang.slice(0, 2).toLowerCase() === code.slice(0, 2).toLowerCase()) || null;
  }
  function say(text) {
    return new Promise(res => {
      if (!synth || !text) return res();
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = REC[vlang]; u.rate = 0.95;
      const v = pickVoice(u.lang); if (v) u.voice = v;
      let done = false;
      const fin = () => { if (done) return; done = true; clearTimeout(tm); res(); };
      const tm = setTimeout(fin, 3000 + text.length * 90); // some browsers never fire onend
      u.onend = u.onerror = fin;
      setStatus(V().speaking);
      synth.speak(u);
    });
  }

  /* ---------- speech in: resolves to an array of alternatives, or null ---------- */
  function listen() {
    return new Promise(res => {
      const r = new SR(); rec = r;
      r.lang = REC[vlang]; r.interimResults = true; r.maxAlternatives = 3; r.continuous = false;
      let final = null, err = null;
      r.onresult = e => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const R = e.results[i];
          if (R.isFinal) final = Array.from(R).map(a => a.transcript); else interim += R[0].transcript;
        }
        if (interim) showHeard(interim + "…");
      };
      r.onerror = e => { err = e.error; };
      r.onend = () => {
        rec = null;
        if (err === "not-allowed" || err === "service-not-allowed") fatal = V().denied;
        else if (err === "network") fatal = V().network;
        res(final);
      };
      setStatus(V().listening);
      try { r.start(); } catch (_) { res(null); }
    });
  }

  /* ---------- applying answers to the form ---------- */
  function fmt(k, v) {
    const t = I18N[vlang];
    if (k === "sex") return v ? t.male : t.female;
    if (k === "GenHlth") return t.genh_opts[v - 1];
    if (NUM[k] || DAYS[k]) return String(v);
    return v ? t.yes : t.no;
  }
  function highlight(k) {
    const f = document.querySelector('#form [data-k="' + k + '"], #form #' + k);
    const box = f && (f.closest(".q") || f.parentElement);
    if (!box) return;
    box.classList.add("vhl");
    const calm = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    box.scrollIntoView({ block: "center", behavior: calm ? "auto" : "smooth" });
    setTimeout(() => box.classList.remove("vhl"), 2500);
  }
  function apply(k, v) {
    S[k] = v; example = false;
    buildForm(); update(); highlight(k);
  }

  /* ---------- the conversation ---------- */
  function questionText(k) {
    const t = I18N[vlang], v = V();
    let q = v.q[k] || t[k];
    if (k === "GenHlth") q += " " + t.genh_opts.join(", ") + ".";
    if (DAYS[k]) q += " " + v.daysHint;
    return q;
  }

  async function ask(i) {
    const k = STEPS[i];
    let fails = 0;
    while (running) {
      await say(questionText(k));
      if (!running || fatal) return "stop";
      const alts = await listen();
      if (!running || fatal) return "stop";
      if (!alts) { if (++fails >= 2) { fatal = V().noSpeech; return "stop"; } continue; }
      showHeard(alts[0]);
      const c = command(alts[0]); if (c) return c;
      let v = null;
      for (const a of alts) { v = parseVal(k, a); if (v !== null) break; }
      if (v === null) {
        const d = detectLang(alts[0], 2);
        if (d && d !== vlang) setVoiceLang(d);      // the person switched language
        if (++fails >= 3) return "next";
        await say(V().retry); continue;
      }
      if (NUM[k]) {                                  // numbers are the easiest thing to mishear: read back
        await say(V().short[k] + " : " + v + " " + V().unit[k] + ". " + V().confirm);
        if (!running || fatal) return "stop";
        const a2 = await listen();
        if (!running || fatal) return "stop";
        if (!(a2 && a2.some(x => firstYN(norm(x)) === 1))) continue;
      }
      apply(k, v);
      await say(fmt(k, v));
      return "next";
    }
    return "stop";
  }

  function stopAll(msg) {
    running = false;
    try { if (rec) rec.abort(); } catch (_) {}
    if (synth) synth.cancel();
    relabel();
    setStatus(msg || "");
  }

  async function run() {
    if (running) return stopAll();
    if (!SR) return setStatus(V().unsupported);
    running = true; fatal = null; relabel(); showHeard("");

    // 1. choose the language by voice (say the language name; falls back to word scoring)
    await say(V().hello + " " + V().langQ);
    if (running && !fatal) {
      const alts = await listen();
      if (alts) { showHeard(alts[0]); const l = pickLang(alts); if (l) setVoiceLang(l); }
    }

    // 2. go through the questions
    let i = 0;
    while (running && !fatal && i < STEPS.length) {
      const r = await ask(i);
      if (r === "stop") break;
      i = r === "back" ? Math.max(0, i - 1) : i + 1;
    }

    // 3. read the result
    if (running && !fatal && i >= STEPS.length) {
      const t = I18N[vlang], p = compute().p;
      const band = p >= MODEL.threshold_high ? t.band_high : p >= MODEL.threshold_screen ? t.band_mod : t.band_low;
      el("result").scrollIntoView({ block: "start", behavior: "smooth" });
      await say(V().done + " " + V().resultIs + " " + Math.round(p * 100) + " " + V().percent + ". " + band + ". " + V().notDx);
    }
    stopAll(fatal);
  }

  window.addEventListener("beforeunload", () => { if (synth) synth.cancel(); });
})();
