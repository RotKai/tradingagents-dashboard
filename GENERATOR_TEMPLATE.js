// GENERATOR TEMPLATE — copy to gen_<DATE>.js, fill placeholders, run with node.
// One-shot: loads norms, validates schema, splices new IIFE entry into data.js,
// validates the spliced entry, prints rating-change summary.
//
// Usage:
//   cp GENERATOR_TEMPLATE.js gen_<DATE>.js
//   (edit DATE, PRIOR_DATE, macro/brief content, ticker list)
//   cd <outputs dir> && node gen_<DATE>.js
//
// The generator NEVER edits data.js in place — it replaces everything after
// the PRIOR_DATE IIFE close with a fresh new-date IIFE. This is idempotent.

const fs = require('fs');

// ============ CONFIG (edit per round) ============
const DATE        = '2026-MM-DD';                    // <-- EDIT
const PRIOR_DATE  = '2026-MM-DD';                    // <-- EDIT (most recent prior entry)
const STAMP       = '2026-MM-DD HH:MM ET (...)';     // <-- EDIT (lastRefreshed text)
const DATA        = '/sessions/.../reports/data.js'; // path to data.js
const OUT         = '/sessions/.../outputs/';        // path to ticker norm files
const NORM_SUFFIX = '_norm' + DATE.replace(/-/g,'').slice(4); // e.g. '_norm0601'

// Ticker universe — keep in sync with prior date's tickers
const TICKERS = ['CRCL','ORCL','PLTR','USO','APP','MSTR','BMNR','SNDK','INTC','LULU',
                 'META','AAPL','GOOGL','TSLA','BRKB','IBIT','ETHB','TCEHY','1810','PDD','LITE','NASA',
                 'NOK','VRT'];

// ============ MACRO + MARKET BRIEF CONTENT (edit per round) ============
const macro = {
  en: "EOD <date>...",     // <-- WRITE
  zh: "EOD <日期>...",     // <-- WRITE
};
const marketBrief = {
  refreshedAt: STAMP,
  tagline: { en: "...", zh: "..." },                 // <-- WRITE
  stance:  { en: "...", zh: "..." },                 // <-- WRITE
  body:    { en: "# ... markdown ...", zh: "# ... 中文 ..." }, // <-- WRITE
};

// ============ LOAD AND VALIDATE TICKER NORMS ============
global.window = {};
require(DATA);
if (!window.REPORTS_DATA[PRIOR_DATE]) {
  console.error('PRIOR_DATE entry missing:', PRIOR_DATE);
  process.exit(1);
}

const VALID_RATINGS = new Set(['Buy','Overweight','Hold','Underweight','Sell']);
function cleanRating(r) {
  if (!r) return 'Hold';
  var s = String(r).trim();
  if (/^buy/i.test(s)) return 'Buy';
  if (/overweight/i.test(s)) return 'Overweight';
  if (/underweight/i.test(s)) return 'Underweight';
  if (/^sell/i.test(s)) return 'Sell';
  return 'Hold';
}
function asString(v) {
  if (typeof v === 'string') return v;
  if (v == null) return '';
  // body-as-dict fallback: flatten phase_N_* keys into markdown sections
  if (typeof v === 'object') {
    var keys = Object.keys(v).sort();
    return keys.map(function(k){
      var label = k.replace(/^phase_(\d+)_?/, '## Phase $1 · ').replace(/_/g, ' ');
      return label + '\n\n' + String(v[k]).trim();
    }).join('\n\n');
  }
  return String(v);
}
function asBilingual(o, fallback) {
  if (o && typeof o === 'object' && 'en' in o && 'zh' in o) {
    return { en: asString(o.en), zh: asString(o.zh) };
  }
  if (typeof o === 'string') return { en: o, zh: o };
  return { en: fallback || '', zh: fallback || '' };
}

const meta = {};
const errors = [];
TICKERS.forEach(function (t) {
  var p = OUT + 't_' + t + NORM_SUFFIX + '.json';
  if (!fs.existsSync(p)) { errors.push(t + ' missing norm file: ' + p); return; }
  var raw = fs.readFileSync(p, 'utf8').replace(/\x00/g, '').trim();
  var d;
  try { d = JSON.parse(raw); } catch (e) { errors.push(t + ' JSON parse: ' + e.message); return; }
  var rating = cleanRating(d.rating);
  if (!VALID_RATINGS.has(rating)) { errors.push(t + ' bad rating after clean: ' + d.rating); }
  var body = d.body || {};
  var bodyEn = asString(body.en);
  var bodyZh = asString(body.zh);
  if (!bodyEn || bodyEn.length < 500) errors.push(t + ' body.en too short: ' + bodyEn.length);
  if (!bodyZh || bodyZh.length < 500) errors.push(t + ' body.zh too short: ' + bodyZh.length);
  meta[t] = {
    rating: rating,
    tagline: asBilingual(d.tagline),
    keyRisk: asBilingual(d.keyRisk || d.key_risk),
    horizon: asBilingual(d.horizon),
    body:    { en: bodyEn, zh: bodyZh },
    action:  asBilingual(d.action),
  };
});

if (errors.length) {
  console.error('VALIDATION ERRORS:');
  errors.forEach(function(e){ console.error('  -', e); });
  console.error('ABORT. Fix the listed ticker norms and re-run.');
  process.exit(1);
}
console.log('Validated ' + Object.keys(meta).length + ' tickers');

// ============ SPLICE INTO data.js ============
let src = fs.readFileSync(DATA, 'utf8');
const iPrior = src.indexOf('window.REPORTS_DATA["' + PRIOR_DATE + '"]');
const closePrior = src.indexOf('\n})();', iPrior);
if (iPrior < 0 || closePrior < 0) {
  console.error('Cannot locate PRIOR_DATE IIFE close');
  process.exit(1);
}
const head = src.slice(0, closePrior + '\n})();'.length);

const J = JSON.stringify;
const entry = '\n\n' +
  '// ============================================================================\n' +
  '// ' + DATE + ' — auto-generated via GENERATOR_TEMPLATE.js\n' +
  '// SCOPE FLAG (WORKFLOW Hard Rule #9): 22/22 full multi-agent under tier-aware\n' +
  '// dispatch (TIGHT default, STANDARD/FULL for material tickers).\n' +
  '// ============================================================================\n' +
  'window.REPORTS_DATA["' + DATE + '"] = (function () {\n' +
  '  var base = JSON.parse(JSON.stringify(window.REPORTS_DATA["' + PRIOR_DATE + '"]));\n' +
  '\n' +
  '  base.lastRefreshed = ' + J(STAMP) + ';\n' +
  '  base.macro = ' + J(macro) + ';\n' +
  '  base.marketBrief = ' + J(marketBrief) + ';\n' +
  '\n' +
  '  var meta = ' + J(meta) + ';\n' +
  '\n' +
  '  Object.keys(base.tickers).forEach(function (t) {\n' +
  '    base.tickers[t].refreshedAt = ' + J(STAMP) + ';\n' +
  '  });\n' +
  '  Object.keys(meta).forEach(function (t) {\n' +
  '    if (!base.tickers[t]) return;\n' +
  '    var m = meta[t];\n' +
  '    base.tickers[t].rating = m.rating;\n' +
  '    base.tickers[t].tagline = m.tagline;\n' +
  '    base.tickers[t].keyRisk = m.keyRisk;\n' +
  '    base.tickers[t].horizon = m.horizon;\n' +
  '    base.tickers[t].body = m.body;\n' +
  '    base.tickers[t].action = m.action;\n' +
  '  });\n' +
  '\n' +
  '  return base;\n' +
  '})();\n';

fs.writeFileSync(DATA, head + entry, 'utf8');

// ============ POST-SPLICE VALIDATION ============
delete require.cache[require.resolve(DATA)];
global.window = {};
require(DATA);

const d = window.REPORTS_DATA[DATE];
if (!d) { console.error('SPLICE FAILED: new date not loadable'); process.exit(1); }

const postErrors = [];
Object.keys(d.tickers).forEach(function (k) {
  var t = d.tickers[k];
  if (!VALID_RATINGS.has(t.rating)) postErrors.push(k + ' bad rating: ' + t.rating);
  if (typeof (t.body && t.body.en) !== 'string') postErrors.push(k + ' body.en not string');
  if (typeof (t.body && t.body.zh) !== 'string') postErrors.push(k + ' body.zh not string');
  if (!t.action || !t.action.en) postErrors.push(k + ' missing action.en');
});
if (postErrors.length) {
  console.error('POST-SPLICE VALIDATION FAIL:');
  postErrors.forEach(function(e){ console.error('  -', e); });
  process.exit(1);
}

// ============ RATING-CHANGE SUMMARY ============
const prior = window.REPORTS_DATA[PRIOR_DATE];
const changes = [];
Object.keys(d.tickers).forEach(function (k) {
  var p = prior.tickers[k] && prior.tickers[k].rating;
  var n = d.tickers[k].rating;
  if (p && n && p !== n) changes.push(k + ': ' + p + ' → ' + n);
});

const ratings = {};
Object.keys(d.tickers).forEach(function (k) {
  ratings[d.tickers[k].rating] = (ratings[d.tickers[k].rating] || 0) + 1;
});

console.log('=========================================');
console.log('Wrote ' + DATE + ' entry, ' + Object.keys(meta).length + ' tickers');
console.log('data.js size: ' + fs.readFileSync(DATA, 'utf8').length + ' bytes');
console.log('Ratings: ' + JSON.stringify(ratings));
console.log('Rating changes vs ' + PRIOR_DATE + ': ' + changes.length);
changes.forEach(function (c) { console.log('  ' + c); });
console.log('=========================================');
