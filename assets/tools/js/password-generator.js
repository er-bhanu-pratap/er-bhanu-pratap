/* ============================================
   PASSWORD GENERATOR — Logic
   ============================================ */

'use strict';

// ── Character Sets ──────────────────────────────────────────────────────────
const CHARS = {
  upper:   'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lower:   'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%&*-_=+[]{}|<>?'
};

// Word list for passphrase mode (300 common, memorable words)
const WORDS = [
  'apple','brave','cloud','dance','eagle','flame','grace','honor','ivory','jolly',
  'karma','lemon','magic','noble','ocean','prism','quest','river','solar','tiger',
  'ultra','vivid','wheat','xenon','yacht','zephyr','amber','bloom','coral','delta',
  'ember','frost','globe','haven','index','jewel','knack','lunar','maple','nexus',
  'orbit','pixel','quill','ridge','stone','storm','swift','torch','unity','vault',
  'waltz','axiom','baron','cedar','depth','epoch','forte','gleam','hyper','inlet',
  'joust','knelt','lance','metro','niche','oasis','prime','quota','realm','scout',
  'table','trove','upper','vista','vigor','width','boxer','crest','drift','easel',
  'fable','glint','hatch','image','joker','knave','latch','mirth','novel','optic',
  'plume','quirk','ruler','slate','trend','twist','ultra','verve','woven','xylem',
  'yield','zebra','azure','blaze','chess','dream','elite','flair','grail','hedge',
  'ideal','jewel','kudos','layer','match','nerve','omega','peace','query','relay',
  'shine','thorn','under','valor','watch','exact','flare','grace','heart','inner',
  'judge','kneel','light','major','night','other','plain','raise','shape','touch',
  'usual','voice','water','extra','field','grand','house','input','juice','known',
  'layer','model','novel','order','power','queen','radio','sight','truth','under',
  'valid','world','xenon','youth','zenith','brave','crisp','dense','event','fixed',
  'giant','happy','ideal','joint','keeps','large','march','north','outer','pilot',
  'quick','royal','small','thank','union','vivid','whole','xerox','young','zonal',
  'about','basic','clean','drive','early','fluid','green','hotel','image','joint',
  'kings','limit','magic','novel','ocean','pause','quiet','rates','sharp','think',
  'urban','vocal','wrist','extra','flint','grail','humor','irony','jumbo','kiosk',
  'lithe','mercy','noted','offer','plaza','quota','robin','sigma','terra','ultra',
  'vocal','whirl','xenon','yours','zippy','abide','berry','charm','dodge','epoch',
  'flame','graze','hinge','irked','joust','knave','lumen','moose','nadir','ozone',
  'perch','quirk','raven','spine','theme','umbra','vivid','waltz','xeric','yearn',
  'zonal','adept','blunt','cloak','debut','elbow','fluke','guise','haste','impel',
  'jaunt','knack','lithe','mirth','nexus','optic','plumb','quaff','rivet','snare',
  'taunt','unfed','venom','whelp','xenon','yawns','zesty'
];

// ── Utilities ────────────────────────────────────────────────────────────────
function randomInt(max) {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return arr[0] % max;
}

function pick(arr) {
  return arr[randomInt(arr.length)];
}

// ── Password Generation ──────────────────────────────────────────────────────
function generatePassword(length, opts) {
  let pool = '';
  const required = [];

  if (opts.upper)   { pool += CHARS.upper;   required.push(pick(CHARS.upper)); }
  if (opts.lower)   { pool += CHARS.lower;   required.push(pick(CHARS.lower)); }
  if (opts.numbers) { pool += CHARS.numbers; required.push(pick(CHARS.numbers)); }
  if (opts.symbols) { pool += CHARS.symbols; required.push(pick(CHARS.symbols)); }

  if (!pool) { pool = CHARS.lower + CHARS.numbers; }

  const remaining = Array.from(
    { length: Math.max(0, length - required.length) },
    () => pick(pool)
  );

  const combined = [...required, ...remaining];

  // Shuffle via Fisher-Yates using crypto
  for (let i = combined.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }

  return combined.join('');
}

// ── Strength Calculation ─────────────────────────────────────────────────────
function calcStrength(pwd) {
  if (!pwd) return { level: 0, label: '—', cls: '' };
  let score = 0;
  if (pwd.length >= 8)  score++;
  if (pwd.length >= 12) score++;
  if (pwd.length >= 20) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  if (score <= 2) return { level: 1, label: 'Weak',   cls: 'weak' };
  if (score <= 4) return { level: 2, label: 'Fair',   cls: 'fair' };
  if (score <= 5) return { level: 3, label: 'Good',   cls: 'good' };
  return           { level: 4, label: 'Strong', cls: 'strong' };
}

// ── Passphrase Generation ────────────────────────────────────────────────────
function generatePassphrase(count, separator, capitalize, addNumber) {
  const words = Array.from({ length: count }, () => {
    const w = pick(WORDS);
    return capitalize ? w.charAt(0).toUpperCase() + w.slice(1) : w;
  });
  let phrase = words.join(separator);
  if (addNumber) phrase += separator + (Math.floor(Math.random() * 900) + 100);
  return phrase;
}

// ── Toast ────────────────────────────────────────────────────────────────────
let toastTimer = null;
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

function copyText(text) {
  navigator.clipboard.writeText(text)
    .then(() => showToast('Copied to clipboard!'))
    .catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('Copied!');
    });
}

// ── Standard Tab ─────────────────────────────────────────────────────────────
const stdLengthSlider = document.getElementById('stdLength');
const stdLengthVal    = document.getElementById('stdLengthVal');
const stdOutput       = document.getElementById('stdOutput');
const stdStrBar       = document.getElementById('stdStrBar');
const stdStrText      = document.getElementById('stdStrText');

const toggleIds = ['togUpper', 'togLower', 'togNumbers', 'togSymbols'];

function getStdOpts() {
  return {
    upper:   document.querySelector('#togUpper input').checked,
    lower:   document.querySelector('#togLower input').checked,
    numbers: document.querySelector('#togNumbers input').checked,
    symbols: document.querySelector('#togSymbols input').checked,
  };
}

function refreshStd() {
  const len = parseInt(stdLengthSlider.value, 10);
  stdLengthVal.textContent = len;
  const pwd = generatePassword(len, getStdOpts());
  stdOutput.textContent = pwd;
  const s = calcStrength(pwd);
  stdStrBar.className = 'strength-bar ' + s.cls;
  stdStrText.textContent = s.label;
  stdStrText.style.color = {
    weak: '#ff4d4d', fair: '#ff9f43', good: '#f9ca24', strong: 'var(--accent-3)'
  }[s.cls] || 'var(--muted)';
}

stdLengthSlider.addEventListener('input', refreshStd);

document.getElementById('stdLenDec').addEventListener('click', () => {
  const min = parseInt(stdLengthSlider.min, 10);
  stdLengthSlider.value = Math.max(min, parseInt(stdLengthSlider.value, 10) - 1);
  refreshStd();
});

document.getElementById('stdLenInc').addEventListener('click', () => {
  const max = parseInt(stdLengthSlider.max, 10);
  stdLengthSlider.value = Math.min(max, parseInt(stdLengthSlider.value, 10) + 1);
  refreshStd();
});

toggleIds.forEach(id => {
  const label = document.getElementById(id);
  const checkbox = label.querySelector('input[type="checkbox"]');
  checkbox.addEventListener('change', () => {
    label.classList.toggle('active', checkbox.checked);
    refreshStd();
  });
});

document.getElementById('stdGenBtn').addEventListener('click', refreshStd);
document.getElementById('stdGenBtnBottom').addEventListener('click', refreshStd);

document.getElementById('stdCopyBtn').addEventListener('click', () => {
  const pwd = stdOutput.textContent.trim();
  if (pwd) copyText(pwd);
});

// ── Passphrase Tab ────────────────────────────────────────────────────────────
const phraseOutput = document.getElementById('phraseOutput');

function refreshPhrase() {
  const count     = parseInt(document.getElementById('phraseCount').value, 10);
  const sepVal    = document.getElementById('phraseSep').value;
  const sepCustom = document.getElementById('phraseSepCustom').value;
  const sep       = sepVal === 'custom' ? (sepCustom || '-') : sepVal;
  const cap       = document.getElementById('phraseCapitalize').checked;
  const num       = document.getElementById('phraseNumber').checked;
  const phrase    = generatePassphrase(count, sep, cap, num);
  phraseOutput.textContent = phrase;
}

document.getElementById('phraseSep').addEventListener('change', function () {
  const customRow = document.getElementById('customSepRow');
  customRow.style.display = this.value === 'custom' ? 'flex' : 'none';
  refreshPhrase();
});

document.getElementById('phraseSepCustom').addEventListener('input', refreshPhrase);
document.getElementById('phraseCount').addEventListener('input', refreshPhrase);
document.getElementById('phraseCapitalize').addEventListener('change', refreshPhrase);
document.getElementById('phraseNumber').addEventListener('change', refreshPhrase);
document.getElementById('phraseGenBtn').addEventListener('click', refreshPhrase);

document.getElementById('phraseCopyBtn').addEventListener('click', () => {
  const phrase = phraseOutput.textContent.trim();
  if (phrase) copyText(phrase);
});

// ── Batch Tab ────────────────────────────────────────────────────────────────
const batchList = document.getElementById('batchList');

function renderBatch() {
  const count = parseInt(document.getElementById('batchCount').value, 10);
  const len   = parseInt(document.getElementById('batchLength').value, 10);
  document.getElementById('batchLengthVal').textContent = len;

  const opts = {
    upper:   document.getElementById('batchUpper').checked,
    lower:   document.getElementById('batchLower').checked,
    numbers: document.getElementById('batchNumbers').checked,
    symbols: document.getElementById('batchSymbols').checked,
  };

  batchList.innerHTML = '';

  for (let i = 0; i < count; i++) {
    const pwd  = generatePassword(len, opts);
    const item = document.createElement('div');
    item.className = 'batch-item';
    item.innerHTML = `
      <span class="batch-num">${String(i + 1).padStart(2, '0')}</span>
      <span class="batch-pwd">${pwd}</span>
      <button class="batch-copy" title="Copy">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      </button>
    `;
    item.querySelector('.batch-copy').addEventListener('click', () => {
      copyText(pwd);
    });
    batchList.appendChild(item);
  }
}

document.getElementById('batchLength').addEventListener('input', function () {
  document.getElementById('batchLengthVal').textContent = this.value;
});

document.getElementById('batchGenBtn').addEventListener('click', renderBatch);

document.getElementById('batchCopyAll').addEventListener('click', () => {
  const items = [...batchList.querySelectorAll('.batch-pwd')].map(el => el.textContent);
  if (items.length) copyText(items.join('\n'));
});

// ── Tabs ─────────────────────────────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

// ── Mobile Nav ───────────────────────────────────────────────────────────────
document.getElementById('menuToggle').addEventListener('click', () => {
  document.getElementById('mobileNav').classList.add('active');
});
document.getElementById('closeNav').addEventListener('click', () => {
  document.getElementById('mobileNav').classList.remove('active');
});

// ── Init ──────────────────────────────────────────────────────────────────────
refreshStd();
refreshPhrase();
renderBatch();
