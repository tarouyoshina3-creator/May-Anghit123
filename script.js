const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwaGbiwXbVHBFXp0e896lD84V_BM0_K_v26LYYWyol3YKjqd7d5Snc2CLjXO4zOBhez/exec";

const AGE_BRACKETS = [
  ["18-20", 18, 20],
  ["21-25", 21, 25],
  ["26-30", 26, 30],
  ["31-35", 31, 35],
  ["36-40", 36, 40],
  ["41-45", 41, 45],
  ["46-50", 46, 50],
  ["51-55", 51, 55],
  ["56-60", 56, 60],
  ["61+", 61, Infinity]
];

let allRecords = [];

const els = {
  grid: document.getElementById("resultsGrid"),
  count: document.getElementById("resultCount"),
  age: document.getElementById("ageFilter"),
  prof: document.getElementById("professionFilter"),
  gender: document.getElementById("genderFilter"),
  reset: document.getElementById("resetBtn")
};

function clean(value) {
  return String(value == null ? "" : value).replace(/[ \s]+/g, " ").trim();
}

function normalize(raw) {
  const ageNum = parseInt(clean(raw.age), 10);
  return {
    name: clean(raw.name),
    age: isNaN(ageNum) ? null : ageNum,
    profession: clean(raw.profession),
    gender: clean(raw.gender)
  };
}

function extractRows(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.record)) return data.record;
  if (data && Array.isArray(data.records)) return data.records;
  if (data && data.ok === false) throw new Error(data.error || "The Apps Script returned an error.");
  throw new Error("Unexpected response format from the Apps Script.");
}

async function loadData() {
  const response = await fetch(APPS_SCRIPT_URL, { method: "GET", redirect: "follow", cache: "no-store" });
  if (!response.ok) throw new Error("Request failed with status " + response.status);

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error("The response was not JSON. Deploy the web app with access set to \"Anyone\" and use the /exec URL.");
  }

  return extractRows(data).map(normalize).filter(r => r.name !== "");
}

async function init() {
  try {
    allRecords = await loadData();
    populateDropdowns();
    applyFilters();
  } catch (err) {
    console.error(err);
    els.count.textContent = "";
    els.grid.innerHTML = `<div class="empty-state error">Could not load data.<small>${escapeHtml(err.message)}</small></div>`;
  }
}

function fillSelect(select, values) {
  [...new Set(values.filter(Boolean))]
    .sort((a, b) => a.localeCompare(b))
    .forEach(v => select.add(new Option(v, v)));
}

function populateDropdowns() {
  fillSelect(els.prof, allRecords.map(r => r.profession));
  fillSelect(els.gender, allRecords.map(r => r.gender));
}

function getAgeBracket(age) {
  if (age === null) return null;
  const hit = AGE_BRACKETS.find(([, min, max]) => age >= min && age <= max);
  return hit ? hit[0] : null;
}

function applyFilters() {
  const ageVal = els.age.value;
  const profVal = els.prof.value;
  const genderVal = els.gender.value;

  const filtered = allRecords.filter(r =>
    (ageVal === "all" || getAgeBracket(r.age) === ageVal) &&
    (profVal === "all" || r.profession === profVal) &&
    (genderVal === "all" || r.gender === genderVal)
  );

  renderGrid(filtered);
}

function initials(name) {
  return name.split(" ").filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join("");
}

function renderGrid(records) {
  els.count.textContent = records.length + (records.length === 1 ? " record" : " records") + " of " + allRecords.length;

  if (records.length === 0) {
    els.grid.innerHTML = `<div class="empty-state">No records match the selected filters.</div>`;
    return;
  }

  els.grid.innerHTML = records.map(r => `
    <article class="card">
      <div class="avatar" aria-hidden="true">${escapeHtml(initials(r.name))}</div>
      <div class="info">
        <h3>${escapeHtml(r.name)}</h3>
        <p class="profession">${escapeHtml(r.profession || "—")}</p>
        <div class="tags">
          <span class="tag">${r.age === null ? "Age n/a" : escapeHtml(r.age) + " yrs"}</span>
          <span class="tag">${escapeHtml(r.gender || "—")}</span>
        </div>
      </div>
    </article>
  `).join("");
}

function escapeHtml(str) {
  return String(str == null ? "" : str).replace(/[&<>'"]/g,
    ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[ch])
  );
}

[els.age, els.prof, els.gender].forEach(el => el.addEventListener("change", applyFilters));

els.reset.addEventListener("click", () => {
  els.age.value = "all";
  els.prof.value = "all";
  els.gender.value = "all";
  applyFilters();
});

init();