/* =========================================================
   Job Listings with Filtering
   1. load data.json
   2. build one card per job (once)
   3. clicking a tag adds a filter; cards that don't match are hidden
   ========================================================= */

const jobsList = document.getElementById("jobs");
const filtersBar = document.getElementById("filters");
const filterList = document.getElementById("filterList");
const clearBtn = document.getElementById("clearBtn");
const statusEl = document.getElementById("status");

let cards = [];          // [{ el: <li>, tags: ["Frontend", ...] }]
let activeFilters = [];  // e.g. ["Frontend", "CSS"]

/* ---------- 1. Load the JSON ---------- */
async function loadJobs() {
  try {
    const response = await fetch("data.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    // fetch() is blocked when a page is opened straight from the file system,
    // so fall back to the copy in data.js (if it is there).
    if (Array.isArray(window.JOBS_FALLBACK)) return window.JOBS_FALLBACK;
    throw error;
  }
}

/* ---------- 2. Build the cards ---------- */

// small helper: create an element with a class and optional text
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// every filterable category of a job, in the order the design shows them
function getTags(job) {
  return [job.role, job.level, ...job.languages, ...job.tools];
}

function createCard(job) {
  const card = el("li", "job");
  if (job.featured) card.classList.add("job--featured");

  // logo
  const logo = el("img", "job__logo");
  logo.src = job.logo;
  logo.alt = "";

  // company + badges
  const head = el("div", "job__head");
  head.append(el("span", "job__company", job.company));
  if (job.new) head.append(el("span", "badge badge--new", "New!"));
  if (job.featured) head.append(el("span", "badge badge--featured", "Featured"));

  // position title
  const title = el("h2", "job__title");
  const link = el("a", "", job.position);
  link.href = "#";
  link.addEventListener("click", (e) => e.preventDefault()); // demo link
  title.append(link);

  // posted / contract / location
  const meta = el("ul", "job__meta");
  [job.postedAt, job.contract, job.location].forEach((item) => {
    meta.append(el("li", "", item));
  });

  const info = el("div", "job__info");
  info.append(head, title, meta);

  // clickable tags
  const tagsList = el("ul", "job__tags");
  const tags = getTags(job);
  tags.forEach((tagName) => {
    const li = el("li");
    const button = el("button", "tag", tagName);
    button.type = "button";
    button.dataset.tag = tagName;
    li.append(button);
    tagsList.append(li);
  });

  card.append(logo, info, tagsList);
  return { el: card, tags };
}

/* ---------- 3. Filtering ---------- */

function addFilter(tagName) {
  if (activeFilters.includes(tagName)) return; // no duplicates
  activeFilters.push(tagName);
  update();
}

function removeFilter(tagName) {
  activeFilters = activeFilters.filter((t) => t !== tagName);
  update();
  // keep keyboard focus somewhere useful after the clicked chip disappears
  const next = filterList.querySelector(".chip__remove");
  if (next) next.focus();
}

function clearFilters() {
  activeFilters = [];
  update();
}

// a job is visible only if it contains EVERY selected filter (AND logic)
function matches(card) {
  return activeFilters.every((filter) => card.tags.includes(filter));
}

function renderChips() {
  filterList.replaceChildren();

  activeFilters.forEach((tagName) => {
    const chip = el("li", "chip");
    chip.append(el("span", "chip__label", tagName));

    const remove = el("button", "chip__remove");
    remove.type = "button";
    remove.dataset.tag = tagName;
    remove.setAttribute("aria-label", `Remove filter ${tagName}`);

    const icon = el("img");
    icon.src = "images/icon-remove.svg";
    icon.alt = "";
    remove.append(icon);

    chip.append(remove);
    filterList.append(chip);
  });
}

function update() {
  // show / hide cards (they are built once, so focus and scroll position are kept)
  let visible = 0;
  cards.forEach((card) => {
    const show = matches(card);
    card.el.hidden = !show;
    if (show) visible++;
  });

  // show / hide the filter bar and redraw its chips
  filtersBar.hidden = activeFilters.length === 0;
  renderChips();

  // tell screen readers what happened
  statusEl.textContent = activeFilters.length
    ? `${visible} job${visible === 1 ? "" : "s"} match ${activeFilters.join(", ")}`
    : `Showing all ${visible} jobs`;
}

/* ---------- Events (delegation: one listener instead of dozens) ---------- */

// clicking any tag inside a card
jobsList.addEventListener("click", (e) => {
  const button = e.target.closest(".tag");
  if (button) addFilter(button.dataset.tag);
});

// clicking the X on a chip
filterList.addEventListener("click", (e) => {
  const button = e.target.closest(".chip__remove");
  if (button) removeFilter(button.dataset.tag);
});

clearBtn.addEventListener("click", clearFilters);

/* ---------- Start ---------- */
loadJobs()
  .then((jobs) => {
    cards = jobs.map(createCard);
    jobsList.append(...cards.map((card) => card.el));
    update();
  })
  .catch((error) => {
    console.error("Could not load the jobs:", error);
    const message = el(
      "li",
      "jobs__error",
      "Sorry, the jobs could not be loaded. Make sure data.json sits next to index.html, " +
        "and open the page with a local server (for example the VS Code “Live Server” extension)."
    );
    jobsList.append(message);
  });
