/* ═══════════════════════════════════════════════════════════
   PhotoDuplicateCleaner — Application Logic
   ═══════════════════════════════════════════════════════════ */

// ─── DOM Elements ──────────────────────────────────────────

const scanBtn = document.getElementById("scanBtn");
const progressPanel = document.getElementById("progressPanel");
const progressTitle = document.getElementById("progressTitle");
const progressBadge = document.getElementById("progressBadge");
const progressBar = document.getElementById("progressBar");
const currentZip = document.getElementById("currentZip");
const zipProgress = document.getElementById("zipProgress");
const labelCurrentItem = document.getElementById("labelCurrentItem");
const labelProgressItem = document.getElementById("labelProgressItem");
const photosFound = document.getElementById("photosFound");
const videosFound = document.getElementById("videosFound");
const resultsSummary = document.getElementById("resultsSummary");
const resultAccountA = document.getElementById("resultAccountA");
const resultAccountB = document.getElementById("resultAccountB");
const resultVerified = document.getElementById("resultVerified");
const resultExact = document.getElementById("resultExact");
const resultStrong = document.getElementById("resultStrong");
const resultLikely = document.getElementById("resultLikely");
const resultWeak = document.getElementById("resultWeak");
const scanElapsed = document.getElementById("scanElapsed");
const reviewBtn = document.getElementById("reviewBtn");
const reviewSection = document.getElementById("reviewSection");
const scanSection = document.getElementById("scanSection");
const headerStats = document.getElementById("headerStats");
const verificationStatus = document.getElementById("verificationStatus");
const verificationCount = document.getElementById("verificationCount");
const verificationTotal = document.getElementById("verificationTotal");
const verificationMeterFill = document.getElementById("verificationMeterFill");
const reviewCounterWrap = document.getElementById("reviewCounterWrap");
const reviewCounter = document.getElementById("reviewCounter");
const reviewJumpInput = document.getElementById("reviewJumpInput");
const reviewProgressCanvas = document.getElementById("reviewProgressCanvas");
const matchBadge = document.getElementById("matchBadge");
const matchReasons = document.getElementById("matchReasons");
const matchSha = document.getElementById("matchSha");
const mediaA = document.getElementById("mediaA");
const mediaB = document.getElementById("mediaB");
const metaA = document.getElementById("metaA");
const metaB = document.getElementById("metaB");
const keepBtn = document.getElementById("keepBtn");
const skipBtn = document.getElementById("skipBtn");
const deleteBtn = document.getElementById("deleteBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const undoBtn = document.getElementById("undoBtn");
const finalizeBtn = document.getElementById("finalizeBtn");
const backToScanBtn = document.getElementById("backToScanBtn");
const bulkResolveBtn = document.getElementById("bulkResolveBtn");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const toast = document.getElementById("toast");
const reviewFilter = document.getElementById("reviewFilter");
const yearFilter = document.getElementById("yearFilter");
const duplicateSearch = document.getElementById("duplicateSearch");
const duplicateSort = document.getElementById("duplicateSort");
const filterResultsCount = document.getElementById("filterResultsCount");
const nextUnreviewedBtn = document.getElementById("nextUnreviewedBtn");
const recommendationPanel = document.getElementById("recommendationPanel");
const recommendationText = document.getElementById("recommendationText");

// Phase 3: View & Comparison Mode Elements
const singleViewWrap = document.getElementById("singleViewWrap");
const gridViewWrap = document.getElementById("gridViewWrap");
const comparison = document.getElementById("comparison");
const sliderComparisonWrap = document.getElementById("sliderComparisonWrap");
const sliderViewport = document.getElementById("sliderViewport");
const sliderDivider = document.getElementById("sliderDivider");
const sliderMediaA = document.getElementById("sliderMediaA");
const sliderMediaB = document.getElementById("sliderMediaB");

const duplicatesGrid = document.getElementById("duplicatesGrid");
const gridSelectAllOnPage = document.getElementById("gridSelectAllOnPage");
const gridSelectionCount = document.getElementById("gridSelectionCount");
const gridDeleteSelectedBtn = document.getElementById("gridDeleteSelectedBtn");
const gridKeepSelectedBtn = document.getElementById("gridKeepSelectedBtn");
const gridDeleteExactOnPageBtn = document.getElementById("gridDeleteExactOnPageBtn");
const gridPrevPageBtn = document.getElementById("gridPrevPageBtn");
const gridNextPageBtn = document.getElementById("gridNextPageBtn");
const gridPageIndicator = document.getElementById("gridPageIndicator");
const gridPrevPageBottomBtn = document.getElementById("gridPrevPageBottomBtn");
const gridNextPageBottomBtn = document.getElementById("gridNextPageBottomBtn");
const gridPageIndicatorBottom = document.getElementById("gridPageIndicatorBottom");

let currentView = "single";
let comparisonMode = "side";
let gridPage = 0;
const gridPerPage = 24;
const selectedInGrid = new Set();
let isDraggingSlider = false;

// Running Stats
const runKeep = document.getElementById("runKeep");
const runDelete = document.getElementById("runDelete");
const runSkip = document.getElementById("runSkip");

// Finalize elements
const finalizeSection = document.getElementById("finalizeSection");
const statKeep = document.getElementById("statKeep");
const statDelete = document.getElementById("statDelete");
const statSkip = document.getElementById("statSkip");
const statUnreviewed = document.getElementById("statUnreviewed");
const deleteCount = document.getElementById("deleteCount");
const confirmFinalizeBtn = document.getElementById("confirmFinalizeBtn");
const backToReviewBtn = document.getElementById("backToReviewBtn");
const finalizeResult = document.getElementById("finalizeResult");
const finalizeResultText = document.getElementById("finalizeResultText");
const finalizePreviewCount = document.getElementById("finalizePreviewCount");
const finalizePreviewList = document.getElementById("finalizePreviewList");

// Stage elements
const stageScanA = document.getElementById("stageScanA");
const stageScanB = document.getElementById("stageScanB");
const stageCompare = document.getElementById("stageCompare");
const stageDone = document.getElementById("stageDone");

// History elements
const historyPanel = document.getElementById("historyPanel");
const historyList = document.getElementById("historyList");
const openFolderBtn = document.getElementById("openFolderBtn");
const numberAnimations = new WeakMap();
let scanStartedAt = 0;
let scanTimerId = null;

// ─── Initialization ────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
    loadHistory();
    loadSourceSummary();
    const savedTheme = localStorage.getItem("theme");
    document.documentElement.setAttribute("data-theme", savedTheme === "dark" ? "dark" : "light");
    syncThemeToggle();
    const footerYear = document.getElementById("footerYear");
    if (footerYear) footerYear.textContent = String(new Date().getFullYear());
});

themeToggleBtn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    if (current !== "dark") {
        document.documentElement.setAttribute("data-theme", "dark");
        localStorage.setItem("theme", "dark");
    } else {
        document.documentElement.setAttribute("data-theme", "light");
        localStorage.setItem("theme", "light");
    }
    syncThemeToggle();
});

function syncThemeToggle() {
    const nextTheme = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    const label = themeToggleBtn.querySelector(".theme-label");
    const message = `Switch to ${nextTheme} theme`;
    themeToggleBtn.setAttribute("aria-label", message);
    themeToggleBtn.title = message;
    if (label) label.textContent = nextTheme === "dark" ? "Dark" : "Light";
}

document.querySelectorAll(".site-nav-link").forEach(link => {
    link.addEventListener("click", event => {
        document.querySelectorAll(".site-nav-link").forEach(item => item.removeAttribute("aria-current"));
        link.setAttribute("aria-current", "page");
        if (link.getAttribute("href") !== "#reviewSection" || !reviewSection.classList.contains("hidden")) return;
        event.preventDefault();
        if (!resultsSummary.classList.contains("hidden")) {
            reviewBtn.click();
        } else if (!finalizeSection.classList.contains("hidden")) {
            backToReviewBtn.click();
        } else {
            scanBtn.scrollIntoView({ behavior: "smooth", block: "center" });
            scanBtn.focus({ preventScroll: true });
        }
    });
});

async function loadSourceSummary() {
    try {
        const response = await fetch("/sources");
        const data = await response.json();
        if (data.status !== "ok") return;
        ["A", "B"].forEach(account => {
            const source = data.accounts[account];
            const count = document.getElementById(`source${account}Zips`);
            const size = document.getElementById(`source${account}Size`);
            const status = document.getElementById(`source${account}Status`);
            if (count) animateNumber(count, source.zip_count, 520);
            if (size) size.textContent = source.zip_count ? formatBytes(source.archive_bytes) : "ZIP files";
            if (status) status.textContent = source.zip_count ? "Archives ready" : "No ZIP archives found";
        });
    } catch (error) {
        ["A", "B"].forEach(account => {
            const status = document.getElementById(`source${account}Status`);
            if (status) status.textContent = "Folder status unavailable";
        });
    }
}

function animateNumber(element, target, duration = 620) {
    if (!element) return;
    const previous = numberAnimations.get(element);
    if (previous) cancelAnimationFrame(previous);
    const start = Number(String(element.textContent).replace(/[^0-9]/g, "")) || 0;
    const end = Number(target) || 0;
    if (element === resultVerified) fitVerifiedCandidateCount(end);
    const started = performance.now();
    const tick = now => {
        const t = Math.min((now - started) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 4);
        element.textContent = numberWithCommas(Math.round(start + (end - start) * eased));
        if (t < 1) numberAnimations.set(element, requestAnimationFrame(tick));
        else numberAnimations.delete(element);
    };
    numberAnimations.set(element, requestAnimationFrame(tick));
}

function fitVerifiedCandidateCount(target) {
    const card = resultVerified.parentElement;
    if (!card || !card.clientWidth) return;
    const style = getComputedStyle(card);
    const available = card.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - 4;
    const characters = numberWithCommas(target).length;
    const fontSize = Math.max(10, Math.min(35, available / (characters * 0.56)));
    resultVerified.style.fontSize = `${fontSize.toFixed(1)}px`;
}

function updateScanClock() {
    if (!scanStartedAt || !scanElapsed) return;
    const seconds = Math.floor((Date.now() - scanStartedAt) / 1000);
    scanElapsed.textContent = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

// ─── State ─────────────────────────────────────────────────

let duplicates = [];
let visibleDuplicates = [];
let currentIndex = 0;
let decisions = {};
let eventSource = null;
let mediaLoadTimeout = null;
let currentFilter = "all";
let reviewMode = "careful";


// ─── Scan ──────────────────────────────────────────────────

scanBtn.addEventListener("click", startScan);

async function startScan() {

    scanBtn.disabled = true;
    progressPanel.classList.remove("hidden");
    resultsSummary.classList.add("hidden");
    scanStartedAt = Date.now();
    if (scanTimerId) clearInterval(scanTimerId);
    updateScanClock();
    scanTimerId = setInterval(updateScanClock, 1000);

    // Reset stages
    resetStages();
    setStageActive("stageScanA");

    const res = await fetch("/scan");
    const data = await res.json();

    if (data.status === "already_running") {
        showToast("Scan already in progress");
        return;
    }

    // Start SSE listener
    listenProgress();
}

function listenProgress() {

    if (eventSource) eventSource.close();

    eventSource = new EventSource("/progress");

    eventSource.onmessage = (event) => {

        const data = JSON.parse(event.data);

        handleProgress(data);
    };

    eventSource.onerror = () => {
        eventSource.close();
        eventSource = null;
    };
}


// ─── Progress Handler ──────────────────────────────────────

function handleProgress(data) {

    const stage = data.stage;

    if (stage === "scanning") {

        const account = data.account;

        if (account === "A") {
            setStageActive("stageScanA");
        } else {
            setStageCompleted("stageScanA");
            setStageActive("stageScanB");
        }

        if (labelCurrentItem) labelCurrentItem.textContent = "Current ZIP";
        if (labelProgressItem) labelProgressItem.textContent = "ZIP Progress";

        if (data.cached) {
            progressTitle.textContent = `Account ${account} — Loaded from cache`;
            progressBadge.textContent = "CACHED";
            currentZip.textContent = "All ZIPs cached";
            zipProgress.textContent = `${data.zip_num} / ${data.zip_total}`;
            progressBar.style.width = "100%";
        } else {
            progressTitle.textContent = `Scanning Account ${account}...`;
            progressBadge.textContent = "SCANNING";
            progressBadge.className = "progress-badge";

            if (data.zip) currentZip.textContent = truncateFilename(data.zip);
            if (data.zip_total > 0) {
                zipProgress.textContent = `${data.zip_num} / ${data.zip_total}`;
                progressBar.style.width = `${(data.zip_num / data.zip_total) * 100}%`;
            }
        }

        animateNumber(photosFound, data.photos, 380);
        animateNumber(videosFound, data.videos, 380);

    } else if (stage === "comparing") {

        setStageCompleted("stageScanB");
        setStageActive("stageCompare");

        progressTitle.textContent = "Comparing files...";
        progressBadge.textContent = "COMPARING";
        progressBar.classList.add("indeterminate");
        currentZip.textContent = "—";
        zipProgress.textContent = "—";

    } else if (stage === "verifying") {

        setStageCompleted("stageScanB");
        setStageActive("stageCompare");

        if (labelCurrentItem) labelCurrentItem.textContent = "Candidate Match";
        if (labelProgressItem) labelProgressItem.textContent = "Verified Candidates";

        const total = data.total || 0;
        const verified = data.verified || 0;
        const pct = total > 0 ? Math.round((verified / total) * 100) : 0;
        updateVerificationCounter(verified, total);
        progressTitle.textContent = "Verifying exact matches...";
        progressBadge.textContent = "VERIFYING";
        progressBar.classList.remove("indeterminate");
        progressBar.style.width = `${pct}%`;
        currentZip.textContent = data.current ? truncateFilename(data.current) : "Verifying...";
        zipProgress.textContent = `${verified} / ${total} (${pct}%)`;
        animateNumber(resultExact, data.exact || 0, 180);
        const exactStat = headerStats?.querySelectorAll(".header-stat")[3];
        if (exactStat) exactStat.innerHTML = `<div class="dot dot-exact"></div>Exact: ${numberWithCommas(data.exact || 0)}`;
        if (verificationStatus) {
            verificationStatus.textContent = `Checking exact matches in the background: ${verified.toLocaleString()} of ${total.toLocaleString()} complete.`;
        }

    } else if (stage === "done") {

        setStageCompleted("stageCompare");
        setStageCompleted("stageDone");
        stageDone.classList.add("active");

        progressTitle.textContent = "Scan complete!";
        progressBadge.textContent = "DONE";
        progressBadge.className = "progress-badge done";
        progressBar.classList.remove("indeterminate");
        progressBar.style.width = "100%";

        scanBtn.disabled = Boolean(data.verification_pending);

        // Show results
        const statsA = data.stats_a;
        const statsB = data.stats_b;
        const total = data.total_candidates;
        updateVerificationCounter(0, total);

        resultsSummary.classList.remove("hidden");

        animateNumber(resultAccountA, statsA.photos + statsA.videos);
        animateNumber(resultAccountB, statsB.photos + statsB.videos);
        animateNumber(resultVerified, total);
        animateNumber(resultExact, data.exact || 0);
        animateNumber(resultStrong, data.strong || 0, 520);
        animateNumber(resultLikely, data.likely || 0, 520);
        animateNumber(resultWeak, data.weak || 0, 520);

        clearInterval(scanTimerId);
        scanTimerId = null;
        updateScanClock();

        // Update header stats
        headerStats.innerHTML = `
            <div class="header-stat"><div class="dot dot-a"></div>A: ${numberWithCommas(statsA.photos + statsA.videos)}</div>
            <div class="header-stat"><div class="dot dot-b"></div>B: ${numberWithCommas(statsB.photos + statsB.videos)}</div>
            <div class="header-stat"><div class="dot dot-dup"></div>Dups: ${numberWithCommas(total)}</div>
            <div class="header-stat"><div class="dot dot-exact"></div>Exact: ${numberWithCommas(data.exact || 0)}</div>
        `;

        if (!data.verification_pending && eventSource) {
            eventSource.close();
            eventSource = null;
        }

    } else if (stage === "verification_complete") {

        updateVerificationCounter(data.total || 0, data.total || 0);
        animateNumber(resultExact, data.exact || 0, 180);
        const exactStat = headerStats?.querySelectorAll(".header-stat")[3];
        if (exactStat) exactStat.innerHTML = `<div class="dot dot-exact"></div>Exact: ${numberWithCommas(data.exact || 0)}`;
        if (verificationStatus) verificationStatus.textContent = data.total
            ? "Exact checks are complete."
            : "No candidate pairs need exact checks.";
        scanBtn.disabled = false;
        if (eventSource) {
            eventSource.close();
            eventSource = null;
        }

    } else if (stage === "error") {

        progressTitle.textContent = `Error: ${data.message}`;
        progressBadge.textContent = "ERROR";
        progressBadge.className = "progress-badge error";
        progressBar.classList.remove("indeterminate");
        scanBtn.disabled = false;
        if (scanTimerId) clearInterval(scanTimerId);
        scanTimerId = null;

        if (eventSource) {
            eventSource.close();
            eventSource = null;
        }
    }
}


// ─── Stage Helpers ─────────────────────────────────────────

function resetStages() {
    [stageScanA, stageScanB, stageCompare, stageDone].forEach(s => {
        s.classList.remove("active", "completed");
    });
}

function setStageActive(id) {
    document.getElementById(id).classList.add("active");
    document.getElementById(id).classList.remove("completed");
}

function setStageCompleted(id) {
    document.getElementById(id).classList.remove("active");
    document.getElementById(id).classList.add("completed");
}

function updateVerificationCounter(verified, total) {
    const count = Math.max(0, Number(total) || 0);
    const checked = Math.max(0, Math.min(Number(verified) || 0, count));
    if (verificationCount) verificationCount.textContent = numberWithCommas(checked);
    if (verificationTotal) verificationTotal.textContent = numberWithCommas(count);
    if (verificationMeterFill) verificationMeterFill.style.width = `${count ? (checked / count) * 100 : 0}%`;
}


// ─── Review ────────────────────────────────────────────────

reviewBtn.addEventListener("click", loadReview);

async function loadReview() {

    const res = await fetch("/duplicates?page=0&per_page=50000");
    const data = await res.json();

    duplicates = data.items.map((pair, idx) => ({
        ...pair,
        originalIndex: idx
    }));
    decisions = {};
    
    // Load persisted session decisions
    if (data.decisions) {
        Object.assign(decisions, data.decisions);
        updateRunningStats();
    }

    decisionHistory = [];
    updateUndoButton();

    if (duplicates.length === 0) {
        showToast("No duplicates found.");
        return;
    }

    populateYearFilter();
    applyReviewMode(reviewMode, false);
    applyFilter(false);

    currentIndex = findNextUnreviewedIndex(0);
    
    if (currentIndex >= visibleDuplicates.length) {
        currentIndex = Math.max(visibleDuplicates.length - 1, 0);
        showToast("Session Resumed: All duplicates have already been reviewed!");
    } else if (currentIndex > 0) {
        showToast(`Session Resumed from Photo #${currentIndex + 1}`);
    }

    setStageCompleted("stageDone");
    scanSection.classList.add("hidden");
    reviewSection.classList.remove("hidden");

    showDuplicate(currentIndex);
}

function getMediaYear(item) {
    if (!item) return null;
    if (item.year && item.year !== "Unknown") return String(item.year);
    if (item.taken) {
        const ts = parseInt(item.taken, 10);
        if (!isNaN(ts) && ts > 0) {
            const yr = new Date(ts * 1000).getFullYear();
            if (yr >= 1970 && yr <= 2099) return String(yr);
        }
    }
    const str = `${item.path || ""} ${item.filename || ""}`;
    const match = str.match(/\b(19\d\d|20\d\d)\b/);
    if (match) return match[1];
    return null;
}

function getPairYear(pair) {
    if (!pair) return "Other";
    const yA = getMediaYear(pair.accountA);
    const yB = getMediaYear(pair.accountB);
    return yA || yB || "Other";
}

function populateYearFilter() {
    if (!yearFilter) return;
    const yearCounts = {};
    duplicates.forEach(p => {
        const y = getPairYear(p);
        yearCounts[y] = (yearCounts[y] || 0) + 1;
    });

    const years = Object.keys(yearCounts).filter(y => y !== "Other").sort().reverse();
    if (yearCounts["Other"]) {
        years.push("Other");
    }

    yearFilter.innerHTML = `<option value="all">All years (${duplicates.length})</option>`;
    years.forEach(yr => {
        const opt = document.createElement("option");
        opt.value = yr;
        opt.textContent = `${yr} (${yearCounts[yr]})`;
        yearFilter.appendChild(opt);
    });
}

backToScanBtn.addEventListener("click", () => {
    reviewSection.classList.add("hidden");
    scanSection.classList.remove("hidden");
});

if (reviewFilter) {
    reviewFilter.addEventListener("change", () => {
        currentFilter = reviewFilter.value;
        applyFilter(true);
    });
}

if (yearFilter) {
    yearFilter.addEventListener("change", () => {
        applyFilter(true);
    });
}

if (duplicateSearch) {
    duplicateSearch.addEventListener("input", () => applyFilter(true));
}

if (duplicateSort) {
    duplicateSort.addEventListener("change", () => applyFilter(true));
}

document.querySelectorAll(".segment[data-mode]").forEach(button => {
    button.addEventListener("click", () => {
        reviewMode = button.dataset.mode;
        document.querySelectorAll(".segment[data-mode]").forEach(b => b.classList.remove("active"));
        button.classList.add("active");
        applyReviewMode(reviewMode, true);
    });
});

// Phase 3: View Mode Switcher (Single vs Grid)
document.querySelectorAll(".segment[data-view]").forEach(button => {
    button.addEventListener("click", () => {
        currentView = button.dataset.view;
        document.querySelectorAll(".segment[data-view]").forEach(b => b.classList.remove("active"));
        button.classList.add("active");

        if (currentView === "grid") {
            if (singleViewWrap) singleViewWrap.classList.add("hidden");
            if (gridViewWrap) gridViewWrap.classList.remove("hidden");
            renderGrid();
        } else {
            if (gridViewWrap) gridViewWrap.classList.add("hidden");
            if (singleViewWrap) singleViewWrap.classList.remove("hidden");
            showDuplicate(currentIndex);
        }
    });
});

// Phase 3: Comparison Mode Switcher (Side-by-Side vs Split Curtain Slider)
document.querySelectorAll(".segment[data-compare]").forEach(button => {
    button.addEventListener("click", () => {
        setComparisonMode(button.dataset.compare);
    });
});

function setComparisonMode(mode) {
    comparisonMode = mode;
    document.querySelectorAll(".segment[data-compare]").forEach(b => {
        b.classList.toggle("active", b.dataset.compare === mode);
    });

    if (mode === "slider") {
        if (comparison) comparison.classList.add("hidden");
        if (sliderComparisonWrap) sliderComparisonWrap.classList.remove("hidden");
        loadSliderMedia();
    } else {
        if (sliderComparisonWrap) sliderComparisonWrap.classList.add("hidden");
        if (comparison) comparison.classList.remove("hidden");
    }
}

function updateSliderPos(clientX) {
    if (!sliderViewport) return;
    const rect = sliderViewport.getBoundingClientRect();
    const offsetX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const pct = (offsetX / rect.width) * 100;
    if (sliderMediaA) sliderMediaA.style.width = pct + "%";
    if (sliderDivider) sliderDivider.style.left = pct + "%";
}

if (sliderViewport) {
    sliderViewport.addEventListener("mousedown", (e) => {
        isDraggingSlider = true;
        updateSliderPos(e.clientX);
    });

    sliderViewport.addEventListener("touchstart", (e) => {
        if (e.touches.length > 0) {
            isDraggingSlider = true;
            updateSliderPos(e.touches[0].clientX);
        }
    }, { passive: true });
}

window.addEventListener("mousemove", (e) => {
    if (isDraggingSlider) {
        updateSliderPos(e.clientX);
    }
});

window.addEventListener("touchmove", (e) => {
    if (isDraggingSlider && e.touches.length > 0) {
        updateSliderPos(e.touches[0].clientX);
    }
}, { passive: true });

window.addEventListener("mouseup", () => {
    isDraggingSlider = false;
});

window.addEventListener("touchend", () => {
    isDraggingSlider = false;
});

function loadSliderMedia() {
    if (!sliderMediaA || !sliderMediaB || visibleDuplicates.length === 0) return;
    const pair = visibleDuplicates[currentIndex];
    const itemA = pair.accountA;
    const itemB = pair.accountB;

    if (itemA.type === "video" || itemB.type === "video") {
        sliderMediaB.innerHTML = `<div class="media-placeholder" style="padding: 40px; text-align: center;">Curtain Slider is for photos only. Use Side-by-Side to play videos.</div>`;
        sliderMediaA.innerHTML = "";
        return;
    }

    const urlA = `/media/A/${encodeURIComponent(itemA.zip)}/${encodeURIComponent(itemA.path)}`;
    const urlB = `/media/B/${encodeURIComponent(itemB.zip)}/${encodeURIComponent(itemB.path)}`;

    sliderMediaB.innerHTML = `<img src="${urlB}" alt="Account B">`;
    sliderMediaA.innerHTML = `<img src="${urlA}" alt="Account A">`;
}

// ─── Grid View Management ──────────────────────────────────

function updateGridSelectionUI() {
    const count = selectedInGrid.size;
    if (gridSelectionCount) gridSelectionCount.textContent = `${count} selected`;
    if (gridDeleteSelectedBtn) gridDeleteSelectedBtn.disabled = count === 0;
    if (gridKeepSelectedBtn) gridKeepSelectedBtn.disabled = count === 0;
}

function renderGrid() {
    if (!duplicatesGrid) return;
    const totalPages = Math.max(1, Math.ceil(visibleDuplicates.length / gridPerPage));
    gridPage = Math.max(0, Math.min(gridPage, totalPages - 1));

    const start = gridPage * gridPerPage;
    const end = Math.min(start + gridPerPage, visibleDuplicates.length);
    const pageItems = visibleDuplicates.slice(start, end);

    const pageText = `Page ${gridPage + 1} of ${totalPages} (${visibleDuplicates.length} items)`;
    if (gridPageIndicator) gridPageIndicator.textContent = pageText;
    if (gridPageIndicatorBottom) gridPageIndicatorBottom.textContent = pageText;

    if (gridPrevPageBtn) gridPrevPageBtn.disabled = gridPage === 0;
    if (gridNextPageBtn) gridNextPageBtn.disabled = gridPage >= totalPages - 1;
    if (gridPrevPageBottomBtn) gridPrevPageBottomBtn.disabled = gridPage === 0;
    if (gridNextPageBottomBtn) gridNextPageBottomBtn.disabled = gridPage >= totalPages - 1;

    const allPageSelected = pageItems.length > 0 && pageItems.every(p => selectedInGrid.has(p.originalIndex));
    if (gridSelectAllOnPage) gridSelectAllOnPage.checked = allPageSelected;

    updateGridSelectionUI();

    if (pageItems.length === 0) {
        duplicatesGrid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">No duplicates match the active filter or year.</div>`;
        return;
    }

    duplicatesGrid.innerHTML = pageItems.map((pair) => {
        const origIdx = pair.originalIndex;
        const decision = decisions[String(origIdx)] || "";
        const isChecked = selectedInGrid.has(origIdx);
        const itemA = pair.accountA;
        const itemB = pair.accountB;
        const urlA = `/media/A/${encodeURIComponent(itemA.zip)}/${encodeURIComponent(itemA.path)}`;
        const urlB = `/media/B/${encodeURIComponent(itemB.zip)}/${encodeURIComponent(itemB.path)}`;

        let badgeClass = "likely";
        let badgeText = `${pair.match_type.toUpperCase()}`;
        if (pair.sha_verified) {
            badgeClass = "exact";
            badgeText = "EXACT";
        } else if (pair.match_type === "weak") {
            badgeClass = "weak";
            badgeText = "REVIEW";
        }

        const cardDecisionClass = decision ? `decision-${decision}` : "";

        const mpA = (itemA.width && itemA.height) ? `${(itemA.width * itemA.height / 1000000).toFixed(1)} MP` : "";
        const mpB = (itemB.width && itemB.height) ? `${(itemB.width * itemB.height / 1000000).toFixed(1)} MP` : "";
        const sizeA = formatBytes(itemA.size);
        const sizeB = formatBytes(itemB.size);
        const evidence = pair.sha_verified
            ? "Byte-for-byte match"
            : (pair.reasons || []).map(reason => ({
                time: "Same capture time",
                name: "Same filename",
                size: "Similar file size",
                ext: "Same format"
            }[reason])).filter(Boolean).join(" · ") || "Review suggested";

        return `
            <div class="grid-card ${cardDecisionClass}" data-original-index="${origIdx}">
                <div class="grid-card-top">
                    <div class="grid-card-top-left">
                        <input type="checkbox" class="grid-card-checkbox" data-index="${origIdx}" ${isChecked ? "checked" : ""}>
                        <span class="grid-card-title" data-open-single="${origIdx}" title="${itemA.filename}">#${origIdx + 1} ${itemA.filename}</span>
                    </div>
                    <span class="match-badge ${badgeClass}" style="font-size: 10px; padding: 2px 6px;">${badgeText}</span>
                </div>
                <div class="grid-card-media" data-open-single="${origIdx}" title="Click to view full comparison">
                    <div class="grid-card-thumb">
                        ${itemA.type === 'video' ? `<video src="${urlA}" preload="metadata"></video>` : `<img src="${urlA}" alt="A" loading="lazy">`}
                        <span class="grid-card-thumb-badge">A: ${sizeA}</span>
                    </div>
                    <div class="grid-card-thumb">
                        ${itemB.type === 'video' ? `<video src="${urlB}" preload="metadata"></video>` : `<img src="${urlB}" alt="B" loading="lazy">`}
                        <span class="grid-card-thumb-badge">B: ${sizeB}</span>
                    </div>
                </div>
                <div class="grid-card-meta">
                    <span>${getMediaYear(itemA) || "Unknown"} · ${itemA.album || "Takeout"}</span>
                    <span>${mpA && mpB ? `${mpA} vs ${mpB}` : sizeA}</span>
                </div>
                <div class="grid-evidence">${evidence}</div>
                <div class="grid-card-actions">
                    <button class="btn-mini ${decision === 'keep' ? 'selected-keep' : ''}" data-act="keep" data-index="${origIdx}">Keep A</button>
                    <button class="btn-mini ${decision === 'skip' ? 'selected-skip' : ''}" data-act="skip" data-index="${origIdx}">Skip</button>
                    <button class="btn-mini ${decision === 'delete' ? 'selected-delete' : ''}" data-act="delete" data-index="${origIdx}">Delete A</button>
                </div>
            </div>
        `;
    }).join("");
}

function applyDecisionToIndex(origIdx, decision) {
    const prevDecision = decisions[String(origIdx)] || null;
    decisions[String(origIdx)] = decision;

    decisionHistory.push({
        originalIndex: origIdx,
        previousDecision: prevDecision,
        newDecision: decision,
        viewIndex: currentIndex
    });
    updateUndoButton();

    fetch("/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index: origIdx, decision: decision })
    }).catch(console.error);

    updateRunningStats();
    drawProgressCanvas();
}

if (duplicatesGrid) {
    duplicatesGrid.addEventListener("click", (e) => {
        const openSingle = e.target.closest("[data-open-single]");
        if (openSingle) {
            const origIdx = parseInt(openSingle.dataset.openSingle, 10);
            const viewIdx = visibleDuplicates.findIndex(p => p.originalIndex === origIdx);
            if (viewIdx !== -1) {
                currentIndex = viewIdx;
            }
            currentView = "single";
            document.querySelectorAll(".segment[data-view]").forEach(b => {
                b.classList.toggle("active", b.dataset.view === "single");
            });
            if (gridViewWrap) gridViewWrap.classList.add("hidden");
            if (singleViewWrap) singleViewWrap.classList.remove("hidden");
            showDuplicate(currentIndex);
            return;
        }

        const actBtn = e.target.closest("[data-act]");
        if (actBtn) {
            const origIdx = parseInt(actBtn.dataset.index, 10);
            const act = actBtn.dataset.act;
            applyDecisionToIndex(origIdx, act);
            renderGrid();
            return;
        }

        const chk = e.target.closest(".grid-card-checkbox");
        if (chk) {
            const origIdx = parseInt(chk.dataset.index, 10);
            if (chk.checked) {
                selectedInGrid.add(origIdx);
            } else {
                selectedInGrid.delete(origIdx);
            }
            updateGridSelectionUI();
        }
    });
}

if (gridSelectAllOnPage) {
    gridSelectAllOnPage.addEventListener("change", () => {
        const start = gridPage * gridPerPage;
        const end = Math.min(start + gridPerPage, visibleDuplicates.length);
        const pageItems = visibleDuplicates.slice(start, end);
        if (gridSelectAllOnPage.checked) {
            pageItems.forEach(p => selectedInGrid.add(p.originalIndex));
        } else {
            pageItems.forEach(p => selectedInGrid.delete(p.originalIndex));
        }
        renderGrid();
    });
}

if (gridDeleteSelectedBtn) {
    gridDeleteSelectedBtn.addEventListener("click", () => {
        if (selectedInGrid.size === 0) return;
        const count = selectedInGrid.size;
        selectedInGrid.forEach(origIdx => {
            applyDecisionToIndex(origIdx, "delete");
        });
        selectedInGrid.clear();
        showToast(`Marked ${count} selected duplicates to delete from A.`);
        renderGrid();
    });
}

if (gridKeepSelectedBtn) {
    gridKeepSelectedBtn.addEventListener("click", () => {
        if (selectedInGrid.size === 0) return;
        const count = selectedInGrid.size;
        selectedInGrid.forEach(origIdx => {
            applyDecisionToIndex(origIdx, "keep");
        });
        selectedInGrid.clear();
        showToast(`Marked ${count} selected duplicates to keep in A.`);
        renderGrid();
    });
}

if (gridDeleteExactOnPageBtn) {
    gridDeleteExactOnPageBtn.addEventListener("click", () => {
        const start = gridPage * gridPerPage;
        const end = Math.min(start + gridPerPage, visibleDuplicates.length);
        const pageItems = visibleDuplicates.slice(start, end);
        let count = 0;
        pageItems.forEach(p => {
            if (p.sha_verified && !decisions[String(p.originalIndex)]) {
                applyDecisionToIndex(p.originalIndex, "delete");
                count++;
            }
        });
        showToast(count > 0 ? `Marked ${count} exact matches on page to delete.` : "No unresolved exact matches on this page.");
        renderGrid();
    });
}

[gridPrevPageBtn, gridPrevPageBottomBtn].forEach(btn => {
    if (btn) btn.addEventListener("click", () => {
        if (gridPage > 0) {
            gridPage--;
            renderGrid();
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    });
});

[gridNextPageBtn, gridNextPageBottomBtn].forEach(btn => {
    if (btn) btn.addEventListener("click", () => {
        const totalPages = Math.max(1, Math.ceil(visibleDuplicates.length / gridPerPage));
        if (gridPage < totalPages - 1) {
            gridPage++;
            renderGrid();
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    });
});

if (nextUnreviewedBtn) {
    nextUnreviewedBtn.addEventListener("click", () => {
        const next = findNextUnreviewedIndex(currentIndex + 1);
        if (next < visibleDuplicates.length) {
            currentIndex = next;
            showDuplicate(currentIndex);
        } else {
            showToast("No more unreviewed items in this view.");
        }
    });
}

function applyReviewMode(mode, refresh) {
    if (mode === "exact") {
        currentFilter = "exact";
        if (reviewFilter) reviewFilter.value = "exact";
    } else if (mode === "fast") {
        currentFilter = "unreviewed";
        if (reviewFilter) reviewFilter.value = "unreviewed";
    } else if (reviewFilter && reviewFilter.value === "exact" && mode === "careful") {
        currentFilter = "all";
        reviewFilter.value = "all";
    }

    applyFilter(refresh);
}

function applyFilter(refresh) {
    const selectedYear = yearFilter ? yearFilter.value : "all";
    const query = duplicateSearch ? duplicateSearch.value.trim().toLocaleLowerCase() : "";

    visibleDuplicates = duplicates.filter(pair => {
        if (selectedYear !== "all") {
            const pairYear = getPairYear(pair);
            if (pairYear !== selectedYear) return false;
        }

        const decision = decisions[String(pair.originalIndex)];
        if (currentFilter === "exact") return pair.sha_verified;
        if (currentFilter === "likely") return pair.match_type === "likely";
        if (currentFilter === "needs_review") return !pair.sha_verified;
        if (currentFilter === "photos") return pair.accountA.type === "photo";
        if (currentFilter === "videos") return pair.accountA.type === "video";
        if (currentFilter === "unreviewed") return !decision;
        if (currentFilter === "delete") return decision === "delete";
        return true;
    });

    if (query) {
        visibleDuplicates = visibleDuplicates.filter(pair => {
            const fields = [pair.accountA, pair.accountB].flatMap(item => [
                item.filename, item.path, item.album
            ]);
            return fields.some(value => String(value || "").toLocaleLowerCase().includes(query));
        });
    }

    const sortMode = duplicateSort ? duplicateSort.value : "confidence";
    visibleDuplicates.sort((left, right) => {
        if (sortMode === "name") {
            return String(left.accountA.filename || "").localeCompare(String(right.accountA.filename || ""), undefined, { numeric: true, sensitivity: "base" });
        }
        if (sortMode === "largest") {
            const sizeDiff = Math.max(right.accountA.size || 0, right.accountB.size || 0) - Math.max(left.accountA.size || 0, left.accountB.size || 0);
            return sizeDiff || left.originalIndex - right.originalIndex;
        }
        if (sortMode === "year") {
            const yearDiff = Number(getPairYear(right)) - Number(getPairYear(left));
            return (Number.isNaN(yearDiff) ? 0 : yearDiff) || left.originalIndex - right.originalIndex;
        }
        return Number(right.sha_verified) - Number(left.sha_verified) ||
            (right.match_score || 0) - (left.match_score || 0) ||
            left.originalIndex - right.originalIndex;
    });

    if (filterResultsCount) {
        filterResultsCount.textContent = `${numberWithCommas(visibleDuplicates.length)} of ${numberWithCommas(duplicates.length)} matches`;
    }

    currentIndex = Math.min(currentIndex, Math.max(visibleDuplicates.length - 1, 0));

    if (refresh) {
        if (currentView === "grid") {
            renderGrid();
        } else {
            showDuplicate(currentIndex);
        }
        updateRunningStats();
    } else if (currentView === "grid") {
        renderGrid();
    }
}

function findNextUnreviewedIndex(start) {
    for (let i = Math.max(start, 0); i < visibleDuplicates.length; i++) {
        if (!decisions[String(visibleDuplicates[i].originalIndex)]) return i;
    }
    return visibleDuplicates.length;
}

function getRecommendation(pair) {
    const itemA = pair.accountA;
    const itemB = pair.accountB;
    const areaA = (itemA.width || 0) * (itemA.height || 0);
    const areaB = (itemB.width || 0) * (itemB.height || 0);

    if (pair.sha_verified) {
        return {
            decision: "delete",
            tone: "delete",
            text: "Exact byte-for-byte SHA match. Safe to delete Account A."
        };
    }

    if (areaA && areaB && areaB > areaA) {
        const mpA = (areaA / 1000000).toFixed(1);
        const mpB = (areaB / 1000000).toFixed(1);
        return {
            decision: "delete",
            tone: "delete",
            text: `Account B has higher resolution (${itemB.width}×${itemB.height}, ${mpB} MP vs ${mpA} MP). Recommend deleting Account A.`
        };
    }

    if (areaA && areaB && areaA > areaB) {
        const mpA = (areaA / 1000000).toFixed(1);
        const mpB = (areaB / 1000000).toFixed(1);
        return {
            decision: "keep",
            tone: "keep",
            text: `Account A has higher resolution (${itemA.width}×${itemA.height}, ${mpA} MP vs ${mpB} MP). Keep Account A.`
        };
    }

    if (itemB.size > itemA.size * 1.05) {
        return {
            decision: "delete",
            tone: "delete",
            text: `Account B is larger (${formatBytes(itemB.size)} vs ${formatBytes(itemA.size)}). Consider deleting Account A.`
        };
    }

    if (itemA.size > itemB.size * 1.05) {
        return {
            decision: "keep",
            tone: "keep",
            text: `Account A is larger (${formatBytes(itemA.size)} vs ${formatBytes(itemB.size)}). Keep Account A.`
        };
    }

    return {
        decision: "skip",
        tone: "neutral",
        text: "Files have equal quality. Review visually or skip."
    };
}

bulkResolveBtn.addEventListener("click", async () => {
    let resolvedCount = 0;
    const selectedYear = yearFilter ? yearFilter.value : "all";
    const targetList = (selectedYear !== "all") ? visibleDuplicates : duplicates;
    
    // Find all unreviewed exact matches in current scope
    const payloads = [];
    targetList.forEach((pair) => {
        const idx = pair.originalIndex;
        if (pair.sha_verified && !decisions[String(idx)]) {
            const prevDecision = decisions[String(idx)] || null;
            decisions[String(idx)] = "delete";
            resolvedCount++;

            decisionHistory.push({
                originalIndex: idx,
                previousDecision: prevDecision,
                newDecision: "delete",
                viewIndex: currentIndex
            });

            payloads.push(fetch("/review", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ index: idx, decision: "delete" })
            }).catch(console.error));
        }
    });

    if (resolvedCount === 0) {
        showToast("No unresolved exact matches found in this view.");
        return;
    }
    
    updateUndoButton();
    const scopeLabel = (selectedYear !== "all") ? ` (${selectedYear})` : "";
    showToast(`Marked ${resolvedCount} exact matches to delete from A${scopeLabel}.`);
    updateRunningStats();
    
    // Fire off all server requests in parallel
    Promise.all(payloads);

    // Update progress UI
    drawProgressCanvas();
    updateRunningStats();
    
    // Advance to next unreviewed
    applyFilter(false);
    currentIndex = findNextUnreviewedIndex(currentIndex);
    
    if (currentIndex < visibleDuplicates.length) {
        showDuplicate(currentIndex);
    } else {
        currentIndex = Math.max(visibleDuplicates.length - 1, 0); // Cap it
        showDuplicate(currentIndex);
        showToast("All duplicates in this view reviewed!");
    }
});


// ─── Canvas Progress & Jumping ─────────────────────────────

function drawProgressCanvas() {
    if (!reviewProgressCanvas || duplicates.length === 0) return;
    const ctx = reviewProgressCanvas.getContext('2d');
    const width = reviewProgressCanvas.width;
    const height = reviewProgressCanvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    const segmentWidth = width / duplicates.length;
    const currentOriginalIndex = visibleDuplicates[currentIndex]
        ? visibleDuplicates[currentIndex].originalIndex
        : -1;
    
    for (let i = 0; i < duplicates.length; i++) {
        let color = 'var(--text-muted)'; // Unreviewed (default gray)
        
        const decision = decisions[String(i)];
        if (decision === 'delete') color = 'var(--red)';
        else if (decision === 'keep') color = 'var(--green)';
        else if (decision === 'skip') color = 'var(--yellow)';
        
        if (i === currentOriginalIndex) color = '#ffffff'; // White for current cursor position
        
        ctx.fillStyle = color;
        // Extend 1 extra pixel to avoid aliasing gaps
        ctx.fillRect(Math.floor(i * segmentWidth), 0, Math.ceil(segmentWidth) + 1, height);
    }
}

reviewCounterWrap.addEventListener("click", () => {
    reviewCounter.classList.add("hidden");
    reviewJumpInput.classList.remove("hidden");
    reviewJumpInput.value = currentIndex + 1;
    reviewJumpInput.focus();
    reviewJumpInput.select();
});

reviewJumpInput.addEventListener("blur", () => {
    reviewJumpInput.classList.add("hidden");
    reviewCounter.classList.remove("hidden");
});

reviewJumpInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        let num = parseInt(reviewJumpInput.value, 10);
        if (!isNaN(num)) {
            num = Math.max(1, Math.min(num, visibleDuplicates.length));
            currentIndex = num - 1;
            showDuplicate(currentIndex);
            drawProgressCanvas();
        }
        reviewJumpInput.blur();
    }
});


// ─── Show Duplicate ────────────────────────────────────────

const verifyingPairs = new Set();

function updatePairVerificationUI(pair) {
    const checking = pair.exact_status === "pending" || pair.exact_status === "checking";

    if (pair.sha_verified) {
        matchBadge.textContent = "EXACT MATCH";
        matchBadge.className = "match-badge exact";
        matchSha.textContent = "SHA verified";
        matchSha.style.color = "var(--green)";
    } else if (pair.match_type === "weak") {
        matchBadge.textContent = "NEEDS REVIEW";
        matchBadge.className = "match-badge weak";
        matchSha.textContent = checking ? "Checking exact match…" : `Score: ${pair.match_score}`;
        matchSha.style.color = "var(--text-muted)";
    } else {
        matchBadge.textContent = `${pair.match_type.toUpperCase()} MATCH`;
        matchBadge.className = `match-badge ${pair.match_type}`;
        matchSha.textContent = checking ? "Checking exact match…" : `Score: ${pair.match_score}`;
        matchSha.style.color = checking ? "var(--text-muted)" : pair.match_score >= 5 ? "var(--yellow)" : "var(--red)";
    }

    matchReasons.textContent = pair.reasons.join(" + ");

    const recommendation = getRecommendation(pair);
    window.currentRecommendation = recommendation.decision;
    recommendationText.textContent = checking
        ? "Exact match check runs while you review this pair."
        : recommendation.text;
    recommendationPanel.className = `recommendation-panel ${checking ? "neutral" : recommendation.tone}`;
    keepBtn.classList.toggle("recommended", !checking && recommendation.decision === "keep");
    skipBtn.classList.toggle("recommended", checking || recommendation.decision === "skip");
    deleteBtn.classList.toggle("recommended", !checking && recommendation.decision === "delete");
}

function verifyPairOnOpen(pair) {
    if (pair.exact_status !== "checking" || verifyingPairs.has(pair.originalIndex)) return;

    const index = pair.originalIndex;
    verifyingPairs.add(index);
    updatePairVerificationUI(pair);

    const poll = () => fetch(`/verify/${index}`, { method: "POST" })
        .then(response => response.json())
        .then(data => {
            if (data.status === "pending") {
                setTimeout(poll, 300);
                return;
            }
            if (data.status !== "ok") throw new Error(data.message || "Verification failed");
            Object.assign(pair, data.item);
            pair.originalIndex = index;
            const checkedCount = duplicates.filter(item => item.exact_status !== "checking").length;
            updateVerificationCounter(checkedCount, duplicates.length);
            const exactCount = duplicates.filter(item => item.sha_verified).length;
            animateNumber(resultExact, exactCount, 240);
            const headerStat = headerStats?.querySelectorAll(".header-stat")[3];
            if (headerStat) {
                headerStat.innerHTML = `<div class="dot dot-exact"></div>Exact: ${numberWithCommas(exactCount)}`;
            }
            renderGrid();
            if (visibleDuplicates[currentIndex]?.originalIndex === index) {
                updatePairVerificationUI(pair);
                renderMeta(metaA, pair.accountA, pair.accountB);
                renderMeta(metaB, pair.accountB, pair.accountA);
            }
        })
        .catch(error => {
            console.error(error);
            verifyingPairs.delete(index);
        })
        .finally(() => {
            if (pair.exact_status !== "checking") verifyingPairs.delete(index);
        });

    poll();
}

function showDuplicate(index) {

    if (visibleDuplicates.length === 0) {
        reviewCounter.textContent = "0 of 0";
        mediaA.innerHTML = `<div class="media-placeholder">No matches in this view</div>`;
        mediaB.innerHTML = `<div class="media-placeholder">No matches in this view</div>`;
        metaA.innerHTML = "";
        metaB.innerHTML = "";
        recommendationText.textContent = "Change the filter or review mode";
        return;
    }

    currentIndex = Math.max(0, Math.min(index, visibleDuplicates.length - 1));

    const pair = visibleDuplicates[currentIndex];
    const itemA = pair.accountA;
    const itemB = pair.accountB;
    const decisionKey = String(pair.originalIndex);

    // Counter
    reviewCounter.textContent = `${currentIndex + 1} of ${visibleDuplicates.length}`;

    updatePairVerificationUI(pair);

    // Media
    if (mediaLoadTimeout) clearTimeout(mediaLoadTimeout);
    
    mediaA.innerHTML = `<div class="media-loading"><div class="spinner"></div></div>`;
    mediaB.innerHTML = `<div class="media-loading"><div class="spinner"></div></div>`;
    
    mediaLoadTimeout = setTimeout(() => {
        loadMedia(mediaA, "A", itemA);
        loadMedia(mediaB, "B", itemB);
        if (comparisonMode === "slider") {
            loadSliderMedia();
        }
    }, 150);

    // Metadata
    renderMeta(metaA, itemA, itemB);
    renderMeta(metaB, itemB, itemA);

    // Highlight selected decision
    const decision = decisions[decisionKey];
    keepBtn.classList.toggle("selected", decision === "keep");
    skipBtn.classList.toggle("selected", decision === "skip");
    deleteBtn.classList.toggle("selected", decision === "delete");

    drawProgressCanvas();
    verifyPairOnOpen(pair);
}

function loadMedia(container, account, item) {

    const url = `/media/${account}/${encodeURIComponent(item.zip)}/${encodeURIComponent(item.path)}`;

    container.innerHTML = `<div class="media-loading"><div class="spinner"></div></div>`;

    if (item.type === "video") {
        const video = document.createElement("video");
        video.controls = true;
        video.preload = "metadata";
        video.src = url;
        video.onloadeddata = () => {
            container.innerHTML = "";
            container.appendChild(video);
        };
        video.onerror = () => {
            container.innerHTML = `<div class="media-placeholder">Cannot load video</div>`;
        };
    } else {
        const img = new Image();
        img.src = url;
        img.onload = () => {
            container.innerHTML = "";
            container.appendChild(img);
        };
        img.onerror = () => {
            container.innerHTML = `<div class="media-placeholder">Cannot load image</div>`;
        };
    }
}

function renderMeta(container, item, otherItem) {

    const taken = item.taken ? formatTimestamp(item.taken) : "Unknown";
    const size = formatBytes(item.size);

    let resText = "Unknown";
    let resBadge = "";
    if (item.width && item.height) {
        const mp = (item.width * item.height / 1000000).toFixed(1);
        resText = `${item.width} x ${item.height}`;

        if (otherItem && otherItem.width && otherItem.height) {
            const areaThis = item.width * item.height;
            const areaOther = otherItem.width * otherItem.height;
            if (areaThis > areaOther) {
                resBadge = `<span class="quality-badge higher" title="Higher resolution than other account">★ ${mp} MP</span>`;
            } else if (areaThis < areaOther) {
                resBadge = `<span class="quality-badge lower" title="Lower resolution than other account">${mp} MP</span>`;
            } else {
                resBadge = `<span class="quality-badge same" title="Identical resolution">${mp} MP</span>`;
            }
        } else {
            resBadge = `<span class="quality-badge same">${mp} MP</span>`;
        }
    }

    let sizeBadge = "";
    if (item.size && otherItem && otherItem.size) {
        if (item.size > otherItem.size * 1.05) {
            sizeBadge = `<span class="quality-badge higher" title="Larger file size">Larger</span>`;
        } else if (otherItem.size > item.size * 1.05) {
            sizeBadge = `<span class="quality-badge lower" title="Smaller file size">Smaller</span>`;
        } else if (item.size === otherItem.size) {
            sizeBadge = `<span class="quality-badge same" title="Identical file size">Identical</span>`;
        }
    }

    container.innerHTML = `
        <div class="meta-row"><span class="meta-label">File</span><span class="meta-value" title="${item.filename}">${item.filename}</span></div>
        <div class="meta-row"><span class="meta-label">Type</span><span class="meta-value">${item.type}</span></div>
        <div class="meta-row"><span class="meta-label">Taken</span><span class="meta-value">${taken}</span></div>
        <div class="meta-row"><span class="meta-label">Size</span><span class="meta-value">${size} ${sizeBadge}</span></div>
        <div class="meta-row"><span class="meta-label">Resolution</span><span class="meta-value">${resText} ${resBadge}</span></div>
        <div class="meta-row"><span class="meta-label">Album</span><span class="meta-value" title="${item.album || 'Unknown'}">${item.album || 'Takeout'}</span></div>
        <div class="meta-row"><span class="meta-label">Path</span><span class="meta-value" title="${item.path}">${shortPath(item.path)}</span></div>
        <div class="meta-row"><span class="meta-label">ZIP</span><span class="meta-value" title="${item.zip}">${truncateFilename(item.zip)}</span></div>
    `;
}


// ─── Actions ───────────────────────────────────────────────

keepBtn.addEventListener("click", () => saveDecision("keep"));
skipBtn.addEventListener("click", () => saveDecision("skip"));
deleteBtn.addEventListener("click", () => saveDecision("delete"));

let isSaving = false;
let decisionHistory = [];

function updateUndoButton() {
    if (undoBtn) {
        undoBtn.disabled = decisionHistory.length === 0;
        undoBtn.title = decisionHistory.length > 0
            ? `Undo Last Decision (${decisionHistory.length} in history, Ctrl+Z)`
            : "Nothing to undo";
    }
}

function saveDecision(decision) {
    if (isSaving || currentIndex >= visibleDuplicates.length) return;
    isSaving = true;

    const pair = visibleDuplicates[currentIndex];
    const decisionKey = String(pair.originalIndex);
    const prevDecision = decisions[decisionKey] || null;

    decisionHistory.push({
        originalIndex: pair.originalIndex,
        previousDecision: prevDecision,
        newDecision: decision,
        viewIndex: currentIndex
    });
    updateUndoButton();

    decisions[decisionKey] = decision;

    fetch("/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index: pair.originalIndex, decision: decision })
    }).catch(console.error);

    // Update button states
    keepBtn.classList.toggle("selected", decision === "keep");
    skipBtn.classList.toggle("selected", decision === "skip");
    deleteBtn.classList.toggle("selected", decision === "delete");

    // Update progress
    drawProgressCanvas();
    updateRunningStats();

    // Auto-advance
    const filterBeforeSave = currentFilter;
    applyFilter(false);

    if (filterBeforeSave === "unreviewed") {
        setTimeout(() => {
            showDuplicate(currentIndex);
            isSaving = false;
        }, 300);
    } else if (currentIndex < visibleDuplicates.length - 1) {
        setTimeout(() => {
            currentIndex++;
            showDuplicate(currentIndex);
            isSaving = false;
        }, 300);
    } else {
        showToast("All duplicates reviewed! Click Finalize to proceed.");
        isSaving = false;
    }
}

function updateRunningStats() {
    let keep = 0, del = 0, skip = 0;
    for (const key in decisions) {
        if (decisions[key] === "keep") keep++;
        else if (decisions[key] === "delete") del++;
        else if (decisions[key] === "skip") skip++;
    }
    
    if (runKeep) runKeep.textContent = keep;
    if (runDelete) runDelete.textContent = del;
    if (runSkip) runSkip.textContent = skip;
}

// ─── Navigation ────────────────────────────────────────────

prevBtn.addEventListener("click", () => {
    if (currentIndex > 0) {
        currentIndex--;
        showDuplicate(currentIndex);
        drawProgressCanvas();
    }
});

nextBtn.addEventListener("click", () => {
    if (currentIndex < visibleDuplicates.length - 1) {
        currentIndex++;
        showDuplicate(currentIndex);
        drawProgressCanvas();
    }
});

if (undoBtn) {
    undoBtn.addEventListener("click", undoLastDecision);
}

// ─── Undo ──────────────────────────────────────────────────

function undoLastDecision() {
    if (decisionHistory.length === 0) {
        showToast("Nothing to undo.");
        return;
    }

    const lastAction = decisionHistory.pop();
    updateUndoButton();

    const decisionKey = String(lastAction.originalIndex);

    // Restore prior state locally
    if (lastAction.previousDecision) {
        decisions[decisionKey] = lastAction.previousDecision;
    } else {
        delete decisions[decisionKey];
    }

    // Update server in background
    fetch("/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            index: lastAction.originalIndex,
            decision: lastAction.previousDecision
        })
    }).catch(console.error);

    // Reapply current filter
    applyFilter(false);

    // Find the restored item in visible list
    let targetIndex = visibleDuplicates.findIndex(
        p => p.originalIndex === lastAction.originalIndex
    );

    if (targetIndex === -1) {
        // If not in current view (e.g. filtered out), switch filter to 'all' so user sees it
        reviewFilter.value = "all";
        currentFilter = "all";
        applyFilter(false);
        targetIndex = visibleDuplicates.findIndex(
            p => p.originalIndex === lastAction.originalIndex
        );
    }

    if (targetIndex !== -1) {
        currentIndex = targetIndex;
    }

    showDuplicate(currentIndex);
    updateRunningStats();
    drawProgressCanvas();

    const pairItem = duplicates.find(p => p.originalIndex === lastAction.originalIndex);
    const restoredName = pairItem?.accountA?.filename || `item #${lastAction.originalIndex + 1}`;
    showToast(`Undid decision for ${restoredName}`);
}

// Keyboard shortcuts
document.addEventListener("keydown", (e) => {

    if (reviewSection.classList.contains("hidden")) return;
    
    // Ignore keyboard shortcuts if focus is inside an input
    if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "TEXTAREA") {
        return;
    }

    if ((e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "Z")) {
        undoLastDecision();
        e.preventDefault();
        return;
    }

    if (e.key === "ArrowLeft") { keepBtn.click(); e.preventDefault(); }
    else if (e.key === " ") { skipBtn.click(); e.preventDefault(); }
    else if (e.key === "ArrowRight") { deleteBtn.click(); e.preventDefault(); }
    else if (e.key === "ArrowUp") { prevBtn.click(); e.preventDefault(); }
    else if (e.key === "ArrowDown") { nextBtn.click(); e.preventDefault(); }
    else if (e.key === "Backspace") { undoLastDecision(); e.preventDefault(); }
    else if (e.key === "Enter") {
        if (window.currentRecommendation === "keep") keepBtn.click();
        else if (window.currentRecommendation === "delete") deleteBtn.click();
        else skipBtn.click();
        e.preventDefault();
    }
    else if ((e.key === "s" || e.key === "S") && currentView === "single") {
        setComparisonMode(comparisonMode === "side" ? "slider" : "side");
        e.preventDefault();
    }
});


// ─── Finalize ──────────────────────────────────────────────

finalizeBtn.addEventListener("click", async () => {

    // Fetch summary from server
    const [summaryRes, previewRes] = await Promise.all([
        fetch("/summary"),
        fetch("/finalize_preview")
    ]);
    const data = await summaryRes.json();
    const preview = await previewRes.json();

    statKeep.textContent = data.keep;
    statDelete.textContent = data.delete;
    statSkip.textContent = data.skip;
    statUnreviewed.textContent = data.unreviewed;
    deleteCount.textContent = data.delete;
    renderFinalizePreview(preview.items || []);

    // Show finalize section
    reviewSection.classList.add("hidden");
    finalizeSection.classList.remove("hidden");
    finalizeResult.classList.add("hidden");

    // Disable confirm if nothing to delete
    if (data.delete === 0) {
        confirmFinalizeBtn.disabled = true;
        confirmFinalizeBtn.textContent = "No files marked for deletion";
    } else {
        confirmFinalizeBtn.disabled = false;
        confirmFinalizeBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            Confirm & Extract ${data.delete} Files
        `;
    }
});

function renderFinalizePreview(items) {
    if (!finalizePreviewList || !finalizePreviewCount) return;

    finalizePreviewCount.textContent = `${items.length} item${items.length === 1 ? "" : "s"}`;
    finalizePreviewList.innerHTML = "";

    if (items.length === 0) {
        finalizePreviewList.innerHTML = `<div class="preview-empty">No files marked for extraction.</div>`;
        return;
    }

    items.slice(0, 100).forEach(item => {
        const row = document.createElement("div");
        row.className = "preview-row";
        row.innerHTML = `
            <span class="preview-index">${String(item.item).padStart(3, "0")}</span>
            <span class="preview-name" title="${item.path}">${item.filename}</span>
            <span class="preview-size">${formatBytes(item.size)}</span>
            <span class="preview-badge ${item.sha_verified ? "exact" : ""}">${item.sha_verified ? "Exact" : item.match_type}</span>
        `;
        finalizePreviewList.appendChild(row);
    });

    if (items.length > 100) {
        const more = document.createElement("div");
        more.className = "preview-empty";
        more.textContent = `Showing first 100 of ${items.length} files.`;
        finalizePreviewList.appendChild(more);
    }
}

backToReviewBtn.addEventListener("click", () => {
    finalizeSection.classList.add("hidden");
    reviewSection.classList.remove("hidden");
});

confirmFinalizeBtn.addEventListener("click", async () => {

    confirmFinalizeBtn.disabled = true;
    confirmFinalizeBtn.textContent = "Extracting...";

    try {

        const res = await fetch("/finalize", { method: "POST" });
        const data = await res.json();

        if (data.status === "ok") {

            // Trigger CSV download
            const link = document.createElement("a");
            link.href = `/reports/${data.csv}`;
            link.download = data.csv;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            finalizeResult.classList.remove("hidden");
            finalizeResultText.innerHTML = `
                ✅ Extracted <strong>${data.extracted}</strong> files to <code>to_delete/</code> folder<br>
                📄 CSV report saved! <a href="/reports/${data.csv}" download style="color: var(--accent); text-decoration: underline;">Click here to download again</a><br><br>
                You can now use these files and the CSV to delete them from Google Photos Account A.
            `;

            if (data.replaced) {
                finalizeResultText.insertAdjacentHTML(
                    "beforeend",
                    `<br>Replaced <strong>${data.replaced}</strong> existing extracted files with fresh copies.`
                );
            }

            confirmFinalizeBtn.textContent = "Done!";

        } else {
            showToast("Error during finalization");
            confirmFinalizeBtn.disabled = false;
        }

    } catch (err) {
        showToast("Error: " + err.message);
        confirmFinalizeBtn.disabled = false;
        confirmFinalizeBtn.textContent = "Retry";
    }
});

if (openFolderBtn) {
    openFolderBtn.addEventListener("click", async () => {
        try {
            const res = await fetch("/open_folder", { method: "POST" });
            const data = await res.json();
            if (data.status !== "ok") {
                showToast("Failed to open folder");
            }
        } catch (err) {
            showToast("Error opening folder");
        }
    });
}

// ─── History ───────────────────────────────────────────────

async function loadHistory() {
    try {
        const res = await fetch("/history");
        const data = await res.json();
        
        if (data.status === "ok" && data.history && data.history.length > 0) {
            historyPanel.classList.remove("hidden");
            historyList.innerHTML = "";
            
            data.history.forEach(run => {
                const totalBytes = run.summary.extracted_bytes || 0;
                
                const item = document.createElement("div");
                item.className = "history-item";
                item.innerHTML = `
                    <div class="history-info">
                        <span class="history-date">${run.date}</span>
                        <span class="history-stats">${run.summary.delete} files deleted (${formatBytes(totalBytes)})</span>
                    </div>
                    <a href="/reports/${run.csv_file}" download class="btn-secondary" style="font-size: 12px; padding: 6px 12px; text-decoration: none;">Download CSV</a>
                `;
                historyList.appendChild(item);
            });
        }
    } catch (e) {
        console.error("Failed to load history", e);
    }
}

// ─── Utilities ─────────────────────────────────────────────

function numberWithCommas(n) {
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function truncateFilename(name) {
    if (name.length > 30) {
        return name.substring(0, 14) + "..." + name.substring(name.length - 12);
    }
    return name;
}

function shortPath(path) {
    if (!path) return "";
    const normalized = path.replaceAll("\\", "/");
    const parts = normalized.split("/");
    if (parts.length <= 3) return normalized;
    return `${parts[parts.length - 3]}/${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
}

function formatTimestamp(ts) {
    try {
        const d = new Date(parseInt(ts) * 1000);
        return d.toLocaleDateString("en-US", {
            year: "numeric", month: "short", day: "numeric",
            hour: "2-digit", minute: "2-digit"
        });
    } catch {
        return ts;
    }
}

function formatBytes(bytes) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function showToast(message) {
    toast.textContent = message;
    toast.classList.remove("hidden");
    toast.classList.add("show");
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.classList.add("hidden"), 300);
    }, 3000);
}
