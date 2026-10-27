"use strict";

/* ---------- Hằng số & tiện ích ---------- */

const STORAGE_KEY = "travel-plan-v1";
const TIME_ZONE = "Asia/Ho_Chi_Minh";
const WEEKDAYS = [
  "Chủ nhật",
  "Thứ hai",
  "Thứ ba",
  "Thứ tư",
  "Thứ năm",
  "Thứ sáu",
  "Thứ bảy",
];
const WEEKDAYS_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const MAX_TRIP_DAYS = 60;

// Ảnh bìa theo từng ngày: tên ảnh khớp với data-place trong index.html và ảnh trong thư mục images/.
// Ngày không có trong danh sách sẽ dùng hình minh họa mặc định.
const DAY_PLACES = {
  "2026-11-19": "hanoi",
  "2026-11-20": "hanoi",
  "2026-11-21": "hagiang",
  "2026-11-22": "hagiang",
  "2026-11-23": "hagiang",
  "2026-11-24": "hanoi",
};

// Biểu tượng đoán theo từ khóa (đã bỏ dấu). Thứ tự quan trọng: mục đầu tiên khớp sẽ được dùng.
const ICON_RULES = [
  [/\b(may bay|san bay|chuyen bay)\b/, "✈️"],
  [/\b(khach san|homestay|hotel|resort|nha nghi|nhan phong|tra phong)\b/, "🏨"],
  [/\b(ca phe|cafe|coffee|tra sua)\b/, "☕"],
  [
    /\b(an|an uong|an sang|an trua|an toi|pho|bun|lau|thang co|nha hang|quan)\b/,
    "🍜",
  ],
  [/\b(xang|xe may|thue xe)\b/, "🛵"],
  [/\b(xe|xe khach|tau|bus|di chuyen|ve)\b/, "🚌"],
  [/\b(deo|nui|song|thac|doc|cong troi|ruong|hang)\b/, "⛰️"],
  [/\b(cho|mua|qua|luu niem)\b/, "🛍️"],
  [/\b(check ?in|chup|song ao)\b/, "📸"],
];

const $ = (selector) => document.querySelector(selector);

const esc = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

const newId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// Ngày hiện tại theo giờ Việt Nam, dạng YYYY-MM-DD (locale en-CA cho đúng định dạng ISO).
function todayVN() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const toUTC = (iso) => new Date(iso + "T00:00:00Z");

function addDays(iso, n) {
  const d = toUTC(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const dayDiff = (from, to) => Math.round((toUTC(to) - toUTC(from)) / 86400000);

function formatDate(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

const weekday = (iso) => WEEKDAYS[toUTC(iso).getUTCDay()];

const groupDigits = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const formatMoney = (n) => (n < 0 ? "-" : "") + groupDigits(Math.abs(n)) + " ₫";

// "1.200.000" hoặc "1200000" -> 1200000
const parseMoney = (text) =>
  Number(String(text).replace(/\D/g, "").slice(0, 12)) || 0;
const formatMoneyInput = (text) =>
  String(text).trim() === "" ? "" : groupDigits(parseMoney(text));

// So sánh không phân biệt hoa thường và dấu tiếng Việt.
const normalize = (text) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();

function guessIcon(text, fallback) {
  const key = normalize(text);
  const rule = ICON_RULES.find(([pattern]) => pattern.test(key));
  return rule ? rule[1] : fallback;
}

// Lấy link http(s) đầu tiên trong đoạn chữ dán vào (Google Maps hay chia sẻ kèm tên địa điểm).
const extractUrl = (text) => (text.match(/https?:\/\/\S+/i) || [""])[0];

const mapLink = (a) =>
  a.mapUrl ||
  "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent(a.place);

/* ---------- Dữ liệu ---------- */

function defaultState() {
  const sample = (date, start, end, name, place, note = "") => ({
    id: newId(),
    date,
    start,
    end,
    name,
    place,
    mapUrl: "",
    note,
    done: false,
    sample: true,
    createdAt: Date.now(),
  });
  return {
    trip: {
      name: "Hà Nội – Hà Giang",
      start: "2026-11-19",
      end: "2026-11-24",
      budget: 10000000,
    },
    activities: [
      sample(
        "2026-11-19",
        "06:30",
        "13:00",
        "Đi xe khách Hà Nội – Hà Giang",
        "Bến xe Mỹ Đình",
      ),
      sample(
        "2026-11-19",
        "14:00",
        "15:00",
        "Nhận phòng homestay",
        "Thành phố Hà Giang",
      ),
      sample(
        "2026-11-20",
        "07:00",
        "17:00",
        "Vượt Cổng trời Quản Bạ – Dốc Thẩm Mã",
        "Cổng trời Quản Bạ",
      ),
      sample(
        "2026-11-21",
        "08:00",
        "16:00",
        "Đèo Mã Pì Lèng – Sông Nho Quế",
        "Đèo Mã Pì Lèng",
        "Mang áo ấm",
      ),
      sample(
        "2026-11-24",
        "08:00",
        "15:00",
        "Đi xe về Hà Nội",
        "Bến xe Hà Giang",
      ),
    ],
    expenses: [],
  };
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (
      saved &&
      saved.trip &&
      Array.isArray(saved.activities) &&
      Array.isArray(saved.expenses)
    )
      return saved;
  } catch (err) {
    /* dữ liệu hỏng hoặc bị chặn: dùng dữ liệu mặc định */
  }
  return defaultState();
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    alert("Không lưu được dữ liệu trên trình duyệt này.");
  }
}

const state = loadState();
const ui = { tab: "plan", day: null, expenseDay: null };

const totalSpent = () => state.expenses.reduce((sum, e) => sum + e.amount, 0);
const remaining = () => state.trip.budget - totalSpent();

// Mức sử dụng ngân sách: 'ok' | 'warn' (từ 80%) | 'over' (vượt)
function budgetStatus() {
  const { budget } = state.trip;
  const spent = totalSpent();
  const ratio = budget > 0 ? spent / budget : spent > 0 ? Infinity : 0;
  const percent = ratio > 1 ? Math.ceil(ratio * 100) : Math.floor(ratio * 100);
  const level = ratio > 1 ? "over" : ratio >= 0.8 ? "warn" : "ok";
  return { ratio, percent: Number.isFinite(percent) ? percent : 100, level };
}

/* ---------- Hiển thị ---------- */

function countdownText() {
  const { start, end } = state.trip;
  const today = todayVN();
  if (today < start) {
    const days = dayDiff(today, start);
    return days === 1
      ? "🎒 Ngày mai khởi hành"
      : `🎒 Còn ${days} ngày nữa khởi hành`;
  }
  if (today <= end)
    return `🚀 Đang đi · Ngày ${dayDiff(start, today) + 1}/${dayDiff(start, end) + 1}`;
  return "✅ Chuyến đi đã kết thúc";
}

function renderHeader() {
  const { name, start, end } = state.trip;
  $("#tripName").textContent = name;
  $("#tripDates").textContent =
    `📅 ${formatDate(start)} → ${formatDate(end)} · ${dayDiff(start, end) + 1} ngày`;
  $("#countdown").textContent = countdownText();
  document.title = name;
}

function renderSummary() {
  const left = remaining();
  const { ratio, percent, level } = budgetStatus();
  const summary = $("#summary");
  summary.className = `summary glass is-${level}`;
  summary.innerHTML = `
    <div class="summary-top">
      <div class="summary-remaining"><small>Còn lại</small><strong class="${left < 0 ? "negative" : ""}">${formatMoney(left)}</strong></div>
      <span class="pill">Đã dùng ${percent}%</span>
    </div>
    <div class="bar" role="progressbar" aria-label="Ngân sách đã dùng" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.min(percent, 100)}">
      <span style="width:${Math.min(ratio, 1) * 100}%"></span>
    </div>
    <div class="summary-stats">
      <div><small>Tổng ngân sách</small><strong>${formatMoney(state.trip.budget)}</strong></div>
      <div><small>Đã chi</small><strong>${formatMoney(totalSpent())}</strong></div>
    </div>`;
}

function renderTabs() {
  document.querySelectorAll('.tabs [role="tab"]').forEach((btn) => {
    btn.setAttribute("aria-selected", String(btn.dataset.tab === ui.tab));
  });
  ["plan", "budget", "expenses"].forEach((tab) => {
    $("#panel-" + tab).hidden = tab !== ui.tab;
  });
}

// Các ngày trong chuyến đi và các ngày khác có hoạt động.
function getDays() {
  const days = new Set(state.activities.map((a) => a.date));
  const { start, end } = state.trip;
  for (
    let d = start, i = 0;
    d <= end && i < MAX_TRIP_DAYS;
    d = addDays(d, 1), i++
  )
    days.add(d);
  return [...days].sort();
}

function currentDay(days) {
  if (!days.includes(ui.day)) {
    const today = todayVN();
    ui.day = days.includes(today) ? today : days[0];
  }
  return ui.day;
}

function activityItem(a) {
  const mapLabel = a.mapUrl ? "Mở Google Maps" : "Tìm trên bản đồ";
  return `
    <li class="${a.done ? "done" : ""}" data-row="${a.id}">
      <div class="t-icon" aria-hidden="true">${guessIcon(a.name + " " + a.place, "📍")}</div>
      <div class="swipe">
      ${swipeDelete("delete-activity", a.id)}
      <div class="act swipe-content">
        <div class="act-head">
          <div>
            <div class="time">🕐 ${a.start} – ${a.end}</div>
            <div class="act-title">${esc(a.name)}</div>
            <div class="act-meta">📍 ${esc(a.place)}</div>
          </div>
          <label class="check" title="Đánh dấu hoàn thành">
            <input type="checkbox" data-action="toggle-done" data-id="${a.id}" ${a.done ? "checked" : ""} aria-label="Đã hoàn thành">
          </label>
        </div>
        ${a.note ? `<div class="act-note">${esc(a.note)}</div>` : ""}
        <div class="act-actions">
          <a class="map-btn ${a.mapUrl ? "saved" : ""}" href="${esc(mapLink(a))}" target="_blank" rel="noopener noreferrer">${mapLabel}</a>
          <button type="button" class="icon-btn" data-action="edit-activity" data-id="${a.id}" aria-label="Sửa" title="Sửa">✎</button>
        </div>
      </div>
      </div>
    </li>`;
}

// Nút xóa nằm phía sau, lộ ra khi vuốt hàng sang trái.
const swipeDelete = (action, id) => `
  <div class="swipe-action">
    <button type="button" class="swipe-delete" data-action="${action}" data-id="${id}" tabindex="-1"><span aria-hidden="true">🗑</span>Xóa</button>
  </div>`;

function renderHero(day) {
  const place = DAY_PLACES[day];
  $(".hero").classList.toggle("has-photo", Boolean(place));
  document
    .querySelectorAll(".hero-photo")
    .forEach((el) =>
      el.classList.toggle("is-active", el.dataset.place === place),
    );
}

function renderPlan() {
  const days = getDays();
  const day = currentDay(days);
  renderHero(day);
  const { start, end } = state.trip;
  const busyDays = new Set(state.activities.map((a) => a.date));

  $("#dayChips").innerHTML = days
    .map(
      (d) => `
    <button type="button" class="chip ${busyDays.has(d) ? "has-items" : ""}" data-action="pick-day" data-day="${d}" aria-pressed="${d === day}">
      <small>${WEEKDAYS_SHORT[toUTC(d).getUTCDay()]}</small><b>${d.slice(8)}/${d.slice(5, 7)}</b>
    </button>`,
    )
    .join("");
  const active = $('.chip[aria-pressed="true"]');
  if (active) active.scrollIntoView({ block: "nearest", inline: "center" });

  const inTrip = day >= start && day <= end;
  $("#dayTitle").textContent =
    `${inTrip ? `Ngày ${dayDiff(start, day) + 1} · ` : ""}${weekday(day)}, ${formatDate(day)}`;

  const items = state.activities
    .filter((a) => a.date === day)
    .sort(
      (a, b) =>
        a.start.localeCompare(b.start) ||
        a.end.localeCompare(b.end) ||
        a.createdAt - b.createdAt,
    );
  const doneCount = items.filter((a) => a.done).length;
  $("#dayProgress").innerHTML = items.length
    ? `${items.length} hoạt động · đã xong ${doneCount}/${items.length}`
    : "Chưa có hoạt động";

  $("#activityList").innerHTML = items.length
    ? items.map(activityItem).join("")
    : '<li class="empty"><span class="emoji">🏕️</span>Ngày này còn trống. Bấm “+ Thêm” để lên lịch.</li>';
}

function renderBudget() {
  const input = $("#budgetInput");
  if (document.activeElement !== input)
    input.value = formatMoneyInput(state.trip.budget);

  const { ratio, percent, level } = budgetStatus();
  const left = remaining();
  const message = {
    ok: "👍 Chi tiêu đang trong tầm kiểm soát.",
    warn:
      percent >= 100
        ? "⚠️ Bạn đã dùng hết ngân sách."
        : "⚠️ Cảnh báo: bạn đã dùng từ 80% ngân sách.",
    over: `🚨 Vượt ngân sách ${formatMoney(-left)}.`,
  }[level];
  const circumference = 2 * Math.PI * 52;
  $("#budgetStatus").innerHTML = `
    <div class="ring is-${level}">
      <svg viewBox="0 0 128 128" aria-hidden="true">
        <circle class="track" cx="64" cy="64" r="52"/>
        <circle class="value" cx="64" cy="64" r="52" stroke-dasharray="${circumference}" stroke-dashoffset="${circumference * (1 - Math.min(ratio, 1))}"/>
      </svg>
      <div class="ring-label"><b>${percent}%</b><small>đã sử dụng</small></div>
    </div>
    <div class="budget-info">
      <div class="budget-line"><span>Tổng ngân sách</span><b>${formatMoney(state.trip.budget)}</b></div>
      <div class="budget-line"><span>Đã chi</span><b>${formatMoney(totalSpent())}</b></div>
      <div class="budget-line"><span>Còn lại</span><b class="${left < 0 ? "over" : ""}">${formatMoney(left)}</b></div>
      <div class="alert alert-${level}">${message}</div>
    </div>`;
}

const sumAmount = (list) => list.reduce((sum, e) => sum + e.amount, 0);

const expenseRow = (e) => `
  <li class="swipe" data-row="${e.id}">
    ${swipeDelete("delete-expense", e.id)}
    <div class="expense swipe-content">
      <div class="e-icon" aria-hidden="true">${guessIcon(e.name, "💸")}</div>
      <div class="e-main">
        <div class="e-name">${esc(e.name)}</div>
        ${e.note ? `<div class="e-note">${esc(e.note)}</div>` : ""}
        <div class="amount">${formatMoney(e.amount)}</div>
      </div>
      <div class="e-actions">
        <button type="button" class="icon-btn" data-action="edit-expense" data-id="${e.id}" aria-label="Sửa" title="Sửa">✎</button>
        <button type="button" class="icon-btn danger desktop-only" data-action="delete-expense" data-id="${e.id}" aria-label="Xóa" title="Xóa">🗑</button>
      </div>
    </div>
  </li>`;

// Ngày mặc định khi lọc chi tiêu: hôm nay nếu đang trong chuyến đi, ngược lại xem tất cả.
function defaultExpenseDay() {
  const today = todayVN();
  return today >= state.trip.start && today <= state.trip.end ? today : "all";
}

// Lọc chi tiêu theo ngày: ui.expenseDay là một ngày (YYYY-MM-DD) hoặc 'all'.
function renderExpenses() {
  const today = todayVN();
  const { start, end } = state.trip;
  const items = [...state.expenses].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt,
  );
  const groups = new Map();
  items.forEach((e) => groups.set(e.date, [...(groups.get(e.date) || []), e]));

  // Các ngày của chuyến đi, cộng thêm ngày ngoài chuyến đi có chi tiêu (ví dụ mua vé trước).
  const tripDays = [];
  for (
    let d = start, i = 0;
    d <= end && i < MAX_TRIP_DAYS;
    d = addDays(d, 1), i++
  )
    tripDays.push(d);
  const otherDays = [...groups.keys()]
    .filter((d) => !tripDays.includes(d))
    .sort();
  if (
    ui.expenseDay !== "all" &&
    !tripDays.includes(ui.expenseDay) &&
    !groups.has(ui.expenseDay)
  )
    ui.expenseDay = defaultExpenseDay();
  const selected = ui.expenseDay;
  const dayLabel = (d) => {
    const prefix = tripDays.includes(d)
      ? `Ngày ${dayDiff(start, d) + 1} · `
      : "";
    return `${prefix}${d === today ? "Hôm nay" : weekday(d)}`;
  };

  const option = (value, label) =>
    `<option value="${value}" ${value === selected ? "selected" : ""}>${label}</option>`;
  const dayOption = (d) => {
    const total = sumAmount(groups.get(d) || []);
    const prefix = tripDays.includes(d)
      ? `Ngày ${dayDiff(start, d) + 1} · `
      : "";
    return option(
      d,
      `${prefix}${WEEKDAYS_SHORT[toUTC(d).getUTCDay()]}, ${formatDate(d)} — ${formatMoney(total)}`,
    );
  };
  $("#expenseDay").innerHTML =
    option("all", `Tất cả các ngày — ${formatMoney(sumAmount(items))}`) +
    `<optgroup label="Trong chuyến đi">${tripDays.map(dayOption).join("")}</optgroup>` +
    (otherDays.length
      ? `<optgroup label="Ngày khác">${otherDays.map(dayOption).join("")}</optgroup>`
      : "");

  const shown = selected === "all" ? items : groups.get(selected) || [];
  const total = sumAmount(shown);
  $("#expenseStats").innerHTML = `
    <div class="stats-today">
      <div>
        <small>${selected === "all" ? "Tất cả các ngày" : `${dayLabel(selected)} · ${formatDate(selected)}`}</small>
        <strong>${formatMoney(total)}</strong>
        <div class="muted">${shown.length ? `${shown.length} khoản chi` : "Chưa có khoản chi nào"}</div>
      </div>
      <div class="stats-emoji" aria-hidden="true">${total ? "🧾" : "🌤️"}</div>
    </div>`;

  if (!shown.length) {
    $("#expenseList").innerHTML =
      '<div class="empty"><span class="emoji">👛</span>Chưa có khoản chi nào. Nhập tên và số tiền ở trên để thêm.</div>';
    return;
  }

  const hint =
    '<p class="swipe-hint touch-only">Vuốt khoản chi sang trái để xóa</p>';
  // Xem một ngày: danh sách phẳng. Xem tất cả: nhóm theo ngày, mỗi nhóm có tổng tiền.
  $("#expenseList").innerHTML =
    hint +
    (selected === "all"
      ? [...groups]
          .map(
            ([date, list]) => `
      <section class="day-group">
        <div class="day-group-head">
          <span>${dayLabel(date)} · ${formatDate(date)}</span>
          <span>${formatMoney(sumAmount(list))}</span>
        </div>
        <ul>${list.map(expenseRow).join("")}</ul>
      </section>`,
          )
          .join("")
      : `<section class="day-group"><ul>${shown.map(expenseRow).join("")}</ul></section>`);
}

function render() {
  renderHeader();
  renderSummary();
  renderTabs();
  renderPlan();
  renderBudget();
  renderExpenses();
}

/* ---------- Hộp thoại & biểu mẫu ---------- */

const dialogs = {
  activity: { dialog: $("#activityDialog"), form: $("#activityForm") },
  expense: { dialog: $("#expenseDialog"), form: $("#expenseForm") },
  trip: { dialog: $("#tripDialog"), form: $("#tripForm") },
};
const quickForm = $("#quickExpenseForm");

function openForm(kind, values) {
  const { dialog, form } = dialogs[kind];
  form.reset();
  form.dataset.id = values.id || "";
  Object.entries(values).forEach(([key, value]) => {
    if (form.elements[key]) form.elements[key].value = value;
  });
  form.querySelector(".form-error").textContent = "";
  dialog.showModal();
}

function showError(form, message, field) {
  form.querySelector(".form-error").textContent = message;
  if (field) form.elements[field].focus();
}

// Kiểm tra các ô bắt buộc, trả về giá trị đã cắt khoảng trắng hoặc null nếu thiếu.
function readForm(form) {
  const values = {};
  for (const el of form.elements) {
    if (!el.name) continue;
    values[el.name] = el.value.trim();
    if (el.required && !values[el.name]) {
      showError(form, "Vui lòng điền đầy đủ các ô bắt buộc.", el.name);
      return null;
    }
  }
  return values;
}

// Đọc biểu mẫu khoản chi (dùng chung cho thêm nhanh và sửa).
function readExpense(form) {
  const values = readForm(form);
  if (!values) return null;
  const amount = parseMoney(values.amount);
  if (amount <= 0) {
    showError(form, "Số tiền phải lớn hơn 0.", "amount");
    return null;
  }
  return { ...values, amount, note: values.note || "" };
}

function upsert(list, id, data) {
  const existing = list.find((item) => item.id === id);
  if (existing) Object.assign(existing, data);
  else list.push({ id: newId(), createdAt: Date.now(), ...data });
}

function resetQuickForm() {
  quickForm.reset();
  quickForm.elements.date.value = todayVN();
  quickForm.querySelector(".form-error").textContent = "";
}

function openActivityForm(id) {
  const a = state.activities.find((item) => item.id === id);
  $("#activityDialogTitle").textContent = a
    ? "Sửa hoạt động"
    : "Thêm hoạt động";
  openForm("activity", a || { date: currentDay(getDays()) });
}

dialogs.activity.form.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const values = readForm(form);
  if (!values) return;
  if (values.end <= values.start)
    return showError(form, "Giờ kết thúc phải sau giờ bắt đầu.", "end");
  const mapUrl = extractUrl(values.mapUrl);
  if (values.mapUrl && !mapUrl)
    return showError(
      form,
      "Link bản đồ phải bắt đầu bằng http:// hoặc https://",
      "mapUrl",
    );
  upsert(state.activities, form.dataset.id, {
    ...values,
    mapUrl,
    sample: false,
    ...(form.dataset.id ? {} : { done: false }),
  });
  ui.day = values.date;
  save();
  dialogs.activity.dialog.close();
  render();
});

quickForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const values = readExpense(quickForm);
  if (!values) return;
  upsert(state.expenses, null, values);
  if (ui.expenseDay !== "all") ui.expenseDay = values.date;
  save();
  resetQuickForm();
  render();
  quickForm.elements.name.focus();
});

dialogs.expense.form.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const values = readExpense(form);
  if (!values) return;
  upsert(state.expenses, form.dataset.id, values);
  save();
  dialogs.expense.dialog.close();
  render();
});

dialogs.trip.form.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const values = readForm(form);
  if (!values) return;
  if (values.end < values.start)
    return showError(form, "Ngày về không được trước ngày đi.", "end");
  Object.assign(state.trip, values);
  save();
  dialogs.trip.dialog.close();
  render();
});

$("#expenseDay").addEventListener("change", (event) => {
  ui.expenseDay = event.target.value;
  renderExpenses();
});

$("#budgetForm").addEventListener("submit", (event) => {
  event.preventDefault();
  state.trip.budget = parseMoney($("#budgetInput").value);
  save();
  $("#budgetInput").blur();
  render();
});

// Tự thêm dấu chấm ngăn cách hàng nghìn khi nhập tiền.
document.addEventListener("input", (event) => {
  const el = event.target;
  if (el.id === "budgetInput" || el.name === "amount")
    el.value = formatMoneyInput(el.value);
});

// Bấm ra ngoài hộp thoại để đóng.
Object.values(dialogs).forEach(({ dialog }) => {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
});

/* ---------- Thao tác ---------- */

function shiftDay(step) {
  const days = getDays();
  const index = days.indexOf(currentDay(days)) + step;
  if (index >= 0 && index < days.length) {
    ui.day = days[index];
    renderPlan();
  }
}

/* ---------- Vuốt để xóa & xác nhận ---------- */

const SWIPE_WIDTH = 88;
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
let drag = null;
let openRow = null;
let dragEndedAt = 0;

function setOffset(row, x, animate = true) {
  const content = row.querySelector(".swipe-content");
  content.style.transition = animate ? "" : "none";
  content.style.transform = x ? `translateX(${x}px)` : "";
  row.style.setProperty("--reveal", Math.min(1, -x / SWIPE_WIDTH));
}

function closeOpenRow() {
  if (openRow) setOffset(openRow, 0);
  openRow = null;
}

document.addEventListener("pointerdown", (event) => {
  const row = event.target.closest(".swipe");
  if (openRow && openRow !== row) closeOpenRow();
  if (!row || event.button !== 0 || event.target.closest(".swipe-action"))
    return;
  drag = {
    row,
    startX: event.clientX,
    startY: event.clientY,
    base: row === openRow ? -SWIPE_WIDTH : 0,
    axis: null,
    x: 0,
  };
});

document.addEventListener("pointermove", (event) => {
  if (!drag) return;
  const dx = event.clientX - drag.startX;
  const dy = event.clientY - drag.startY;
  // Chỉ coi là vuốt ngang khi di chuyển ngang rõ hơn dọc, để vẫn cuộn trang bình thường.
  if (!drag.axis) {
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
    drag.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
  }
  if (drag.axis !== "x") return;
  let x = Math.min(0, drag.base + dx);
  if (x < -SWIPE_WIDTH) x = -SWIPE_WIDTH + (x + SWIPE_WIDTH) * 0.3; // kéo quá thì chậm lại như dây thun
  drag.x = x;
  setOffset(drag.row, x, false);
});

function endDrag() {
  if (!drag) return;
  const { row, axis, x } = drag;
  drag = null;
  if (axis !== "x") return;
  dragEndedAt = Date.now();
  const open = x < -SWIPE_WIDTH / 2;
  setOffset(row, open ? -SWIPE_WIDTH : 0);
  openRow = open ? row : null;
}
document.addEventListener("pointerup", endDrag);
document.addEventListener("pointercancel", endDrag);

// Chặn cú bấm ngay sau khi vuốt, và bấm vào hàng đang mở thì chỉ đóng lại.
document.addEventListener(
  "click",
  (event) => {
    const justDragged = Date.now() - dragEndedAt < 300;
    const tappedOpenRow =
      openRow && openRow.querySelector(".swipe-content").contains(event.target);
    if (justDragged || tappedOpenRow) {
      event.preventDefault();
      event.stopPropagation();
      if (tappedOpenRow && !justDragged) closeOpenRow();
    }
  },
  true,
);

const confirmDialog = $("#confirmDialog");
confirmDialog.addEventListener("click", (event) => {
  if (event.target === confirmDialog) confirmDialog.close();
});

function askConfirm(title, message) {
  $("#confirmTitle").textContent = title;
  $("#confirmMessage").textContent = message;
  confirmDialog.returnValue = "";
  confirmDialog.showModal();
  return new Promise((resolve) => {
    confirmDialog.addEventListener(
      "close",
      () => resolve(confirmDialog.returnValue === "ok"),
      { once: true },
    );
  });
}

async function animateOut(el) {
  if (reduceMotion.matches) return;
  await el.animate(
    [
      { opacity: 1, transform: "translateX(0)" },
      { opacity: 0, transform: "translateX(-40%)" },
    ],
    { duration: 220, easing: "ease-in", fill: "forwards" },
  ).finished;
  el.style.overflow = "hidden";
  await el.animate(
    [
      { height: el.offsetHeight + "px" },
      {
        height: "0px",
        paddingTop: 0,
        paddingBottom: 0,
        marginTop: 0,
        marginBottom: 0,
      },
    ],
    { duration: 180, easing: "ease-out", fill: "forwards" },
  ).finished;
}

async function remove(listName, id, title, message) {
  const ok = await askConfirm(title, message);
  if (!ok) return closeOpenRow();
  const row = document.querySelector(`[data-row="${id}"]`);
  if (row) await animateOut(row);
  openRow = null;
  state[listName] = state[listName].filter((item) => item.id !== id);
  save();
  render();
}

document.addEventListener("click", (event) => {
  const el = event.target.closest("[data-action]");
  if (!el) return;
  const { action, id } = el.dataset;
  const find = (list) => state[list].find((item) => item.id === id);

  switch (action) {
    case "tab":
      ui.tab = el.dataset.tab;
      renderTabs();
      if (ui.tab === "plan") renderPlan();
      break;
    case "add-activity":
      openActivityForm();
      break;
    case "edit-trip":
      openForm("trip", state.trip);
      break;
    case "toggle-theme":
      setTheme(
        document.documentElement.dataset.theme === "dark" ? "light" : "dark",
      );
      break;
    case "close-dialog":
      el.closest("dialog").close();
      break;
    case "prev-day":
      shiftDay(-1);
      break;
    case "next-day":
      shiftDay(1);
      break;
    case "pick-day":
      ui.day = el.dataset.day;
      renderPlan();
      break;
    case "toggle-done":
      find("activities").done = el.checked;
      save();
      renderPlan();
      break;
    case "edit-activity":
      openActivityForm(id);
      break;
    case "delete-activity": {
      const a = find("activities");
      remove(
        "activities",
        id,
        "Xóa hoạt động?",
        `“${a.name}” lúc ${a.start} sẽ bị xóa khỏi lịch trình.`,
      );
      break;
    }
    case "edit-expense": {
      const e = find("expenses");
      openForm("expense", { ...e, amount: formatMoneyInput(e.amount) });
      break;
    }
    case "delete-expense": {
      const e = find("expenses");
      remove(
        "expenses",
        id,
        "Xóa khoản chi?",
        `“${e.name}” · ${formatMoney(e.amount)} sẽ bị xóa và ngân sách được tính lại.`,
      );
      break;
    }
  }
});

/* ---------- Giao diện sáng / tối ---------- */

const THEME_KEY = "travel-plan-theme";

function renderThemeToggle() {
  const dark = document.documentElement.dataset.theme === "dark";
  const btn = $("#themeToggle");
  btn.textContent = dark ? "☀️" : "🌙";
  btn.setAttribute(
    "aria-label",
    dark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối",
  );
  btn.title = btn.getAttribute("aria-label");
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (err) {
    /* không lưu được thì chỉ áp dụng cho lần này */
  }
  renderThemeToggle();
}

renderThemeToggle();
ui.expenseDay = defaultExpenseDay();
resetQuickForm();
render();
