/**************************************************************
 * HOA Booking Form - script.js (FROM SCRATCH)
 * - EmailJS send to admin
 * - Open WhatsApp at customer after successful email
 * - Dynamic fields: Occasion + Group (4+) + Kids
 * - Preview summary
 **************************************************************/

// =============================
// CONFIG
// =============================
const WHATSAPP_NUMBER = "9647737079079"; // رقم واتساب الاستلام (تجربة/بيت التحفيات)

const EMAILJS_PUBLIC_KEY  = "tivoinl7MHIKAOORE";
const EMAILJS_SERVICE_ID  = "service_bm4mbb9";
const EMAILJS_TEMPLATE_ID = "template_ht88c8b";

const ADMIN_RECEIVER_EMAIL = "houseofantique30@gmail.com";

// =============================
// INIT EmailJS
// =============================
(function initEmailJS(){
  if (window.emailjs) {
    emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
  }
})();

// =============================
// HELPERS
// =============================
const $ = (s) => document.querySelector(s);

function toast(msg){
  const t = $("#toast");
  if(!t){ alert(msg); return; }
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"), 2600);
}

function pad2(n){ return String(n).padStart(2,"0"); }

function humanDate(iso){
  if(!iso) return "—";
  const [y,m,d] = iso.split("-");
  return `${pad2(d)}/${pad2(m)}/${y}`;
}

function timeToArabicLabel(t){
  if(!t) return "—";
  const [hh, mm] = t.split(":").map(Number);
  if(Number.isNaN(hh)) return "—";
  const isPM = hh >= 12;
  const hour12 = ((hh + 11) % 12) + 1;
  const suffix = isPM ? "مساءً" : "صباحاً";
  return `${hour12}:${pad2(mm)} ${suffix}`;
}

function makeBookingId(){
  const now = new Date();
  const y = now.getFullYear();
  const m = pad2(now.getMonth()+1);
  const d = pad2(now.getDate());
  const r = Math.random().toString(36).slice(2,6).toUpperCase();
  return `HOA-${y}${m}${d}-${r}`;
}

function escapeHtml(str){
  return String(str ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

// فرق الساعات إذا النهاية لليوم الثاني
function calcDurationHours(start, end){
  if(!start || !end) return "";
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if([sh,sm,eh,em].some(Number.isNaN)) return "";
  let s = sh*60 + sm;
  let e = eh*60 + em;
  if(e < s) e += 24*60;
  const diff = (e - s) / 60;
  return diff.toFixed(1).replace(".0","");
}

function show(el){ if(el) el.style.display = "block"; }
function hide(el){ if(el) el.style.display = "none"; }

// =============================
// UI RULES
// =============================
function syncOccasionRules(){
  const v = $("#eventType")?.value;
  const wrap = $("#occasionFields");
  if(!wrap) return;

  if(v === "occasion"){
    show(wrap);
    $("#occasionType").required = true;
    $("#decorProvider").required = true;
    $("#foodProvider").required = true;
    $("#hasBand").required = true;
  }else{
    hide(wrap);

    // remove required
    $("#occasionType").required = false;
    $("#decorProvider").required = false;
    $("#foodProvider").required = false;
    $("#hasBand").required = false;

    // reset values
    if($("#occasionType")) $("#occasionType").value = "";
    if($("#occasionOther")) $("#occasionOther").value = "";
    hide($("#occasionOtherWrap"));
    if($("#decorProvider")) $("#decorProvider").value = "";
    if($("#foodProvider")) $("#foodProvider").value = "";
    if($("#endTime")) $("#endTime").value = "";
    if($("#durationHours")) $("#durationHours").value = "";
    if($("#hasBand")) $("#hasBand").value = "";
    if($("#bandDetails")) $("#bandDetails").value = "";
    hide($("#bandDetailsWrap"));
  }
}

function syncOccasionOther(){
  const v = $("#occasionType")?.value;
  const wrap = $("#occasionOtherWrap");
  if(!wrap) return;

  if(v === "أخرى"){
    show(wrap);
  }else{
    hide(wrap);
    if($("#occasionOther")) $("#occasionOther").value = "";
  }
}

function syncBandDetails(){
  const v = $("#hasBand")?.value;
  const wrap = $("#bandDetailsWrap");
  if(!wrap) return;

  if(v === "yes"){
    show(wrap);
  }else{
    hide(wrap);
    if($("#bandDetails")) $("#bandDetails").value = "";
  }
}

function syncPeopleRules(){
  const n = Number($("#peopleCount")?.value || 0);
  const group = $("#groupFields");
  if(!group) return;

  if(n >= 4){
    show(group);
    $("#groupType").required = true;
    $("#isForeign").required = true;
    $("#interests").required = true;
  }else{
    hide(group);

    $("#groupType").required = false;
    $("#isForeign").required = false;
    $("#interests").required = false;

    if($("#groupType")) $("#groupType").value = "";
    if($("#isForeign")) $("#isForeign").value = "";
    if($("#country")) $("#country").value = "";
    if($("#province")) $("#province").value = "";
    if($("#interests")) $("#interests").value = "";

    hide($("#countryWrap"));
    hide($("#provinceWrap"));
    if($("#country")) $("#country").required = false;
    if($("#province")) $("#province").required = false;
  }

  validateExtraLogic();
}

function validateExtraLogic(){
  const groupVisible = $("#groupFields") && $("#groupFields").style.display !== "none";
  if(!groupVisible) return;

  const isForeign = $("#isForeign")?.value;

  if(isForeign === "yes"){
    show($("#countryWrap"));
    hide($("#provinceWrap"));
    $("#country").required = true;
    $("#province").required = false;
    if($("#province")) $("#province").value = "";
  }else if(isForeign === "no"){
    show($("#provinceWrap"));
    hide($("#countryWrap"));
    $("#province").required = true;
    $("#country").required = false;
    if($("#country")) $("#country").value = "";
  }else{
    hide($("#countryWrap"));
    hide($("#provinceWrap"));
    $("#country").required = false;
    $("#province").required = false;
  }
}

function syncKidsRules(){
  const v = $("#hasKids")?.value;
  const row = $("#kidsAgeRow");
  const age = $("#youngestKidAge");
  if(!row || !age) return;

  if(v === "yes"){
    row.style.display = "grid"; // مهم حتى يضبط القياس داخل grid
    age.required = true;
  }else{
    row.style.display = "none";
    age.required = false;
    age.value = "";
  }
}

function syncTimeHints(){
  const hint = $("#timeHint");
  if(hint) hint.textContent = timeToArabicLabel($("#time")?.value);

  const endHint = $("#endTimeHint");
  if(endHint) endHint.textContent = timeToArabicLabel($("#endTime")?.value);
}

// =============================
// DATA
// =============================
function getData(){
  return {
    eventType: $("#eventType").value,
    peopleCount: $("#peopleCount").value,
    date: $("#date").value,
    time: $("#time").value,

    // occasion
    occasionType: $("#occasionType")?.value || "",
    occasionOther: $("#occasionOther")?.value?.trim() || "",
    decorProvider: $("#decorProvider")?.value || "",
    foodProvider: $("#foodProvider")?.value || "",
    endTime: $("#endTime")?.value || "",
    durationHours: $("#durationHours")?.value || "",
    hasBand: $("#hasBand")?.value || "",
    bandDetails: $("#bandDetails")?.value?.trim() || "",

    // customer
    fullName: $("#fullName").value.trim(),
    birthdate: $("#birthdate").value,
    phone: $("#phone").value.trim(),
    email: $("#email").value.trim(),
    notes: $("#notes")?.value?.trim() || "",

    // kids
    hasKids: $("#hasKids").value,
    youngestKidAge: $("#youngestKidAge")?.value || "",

    // group
    groupType: $("#groupType")?.value || "",
    isForeign: $("#isForeign")?.value || "",
    country: $("#country")?.value?.trim() || "",
    province: $("#province")?.value?.trim() || "",
    interests: $("#interests")?.value?.trim() || "",
  };
}

function firstInvalidField(form){
  const els = [...form.querySelectorAll("input, select, textarea")];
  for(const el of els){
    if(el.disabled) continue;
    const hidden = el.offsetParent === null;
    if(hidden) continue;
    if(!el.checkValidity()) return el;
  }
  return null;
}

// =============================
// SUMMARY
// =============================
function kv(k, v){
  return `<div class="kv-row"><span>${k}</span><b>${v}</b></div>`;
}
function dividerRow(){
  return `<div class="kv-divider"></div>`;
}

function renderSummary(data, bookingId){
  const isOccasion = data.eventType === "occasion";
  const isGroup = Number(data.peopleCount || 0) >= 4;
  const eventLabel = isOccasion ? "إقامة مناسبة (Private Occasion)" : data.eventType;

  const rows = [];

  rows.push(kv("رقم الحجز / Booking ID", `<span dir="ltr">${escapeHtml(bookingId)}</span>`));
  rows.push(kv("نوع الفعالية / Event Type", escapeHtml(eventLabel)));
  rows.push(kv("التاريخ / Date", escapeHtml(humanDate(data.date))));
  rows.push(kv("وقت البداية / Start", `${escapeHtml(data.time)} — ${escapeHtml(timeToArabicLabel(data.time))}`));
  rows.push(kv("عدد الأشخاص / Guests", escapeHtml(data.peopleCount)));

  if(isOccasion){
    const occ = (data.occasionType === "أخرى" && data.occasionOther)
      ? `${data.occasionType} — ${data.occasionOther}`
      : (data.occasionType || "—");

    const computed = calcDurationHours(data.time, data.endTime);
    const durationFinal = data.durationHours || computed || "—";

    rows.push(dividerRow());
    rows.push(kv("نوع المناسبة / Occasion", escapeHtml(occ)));
    rows.push(kv("التزيين / Decoration", escapeHtml(data.decorProvider || "—")));
    rows.push(kv("الطعام / Catering", data.foodProvider === "yes" ? "نعم (Yes)" : data.foodProvider === "no" ? "لا (No)" : "—"));
    rows.push(kv("وقت النهاية / End", data.endTime ? `${escapeHtml(data.endTime)} — ${escapeHtml(timeToArabicLabel(data.endTime))}` : "—"));
    rows.push(kv("مدة الحجز (ساعات) / Duration", escapeHtml(durationFinal)));
    rows.push(kv("فرقة موسيقية؟ / Band", data.hasBand === "yes" ? "نعم (Yes)" : data.hasBand === "no" ? "بدون (No)" : "—"));
    rows.push(kv("تفاصيل الفرقة / Details", data.hasBand === "yes" ? escapeHtml(data.bandDetails || "—") : "—"));
  }

  rows.push(dividerRow());
  rows.push(kv("الاسم الكامل / Full Name", escapeHtml(data.fullName)));
  rows.push(kv("تاريخ الولادة / Birthdate", escapeHtml(humanDate(data.birthdate))));
  rows.push(kv("رقم الهاتف / Phone", `<span dir="ltr">${escapeHtml(data.phone)}</span>`));
  rows.push(kv("الإيميل / Email", `<span dir="ltr">${escapeHtml(data.email)}</span>`));

  rows.push(dividerRow());
  rows.push(kv("هل يوجد أطفال؟ / Children", data.hasKids === "yes" ? "نعم (Yes)" : data.hasKids === "no" ? "لا (No)" : "—"));
  rows.push(kv("عمر أصغر طفل / Youngest Age", data.hasKids === "yes" ? escapeHtml(data.youngestKidAge || "—") : "—"));

  if(isGroup){
    rows.push(dividerRow());
    rows.push(kv("نوع الزوار / Group Type", escapeHtml(data.groupType || "—")));
    rows.push(kv("أجانب؟ / Foreign?", data.isForeign === "yes" ? "نعم (Yes)" : data.isForeign === "no" ? "لا (No)" : "—"));
    rows.push(kv("الدولة / Country", data.isForeign === "yes" ? escapeHtml(data.country || "—") : "—"));
    rows.push(kv("المحافظة / Governorate", data.isForeign === "no" ? escapeHtml(data.province || "—") : "—"));
    rows.push(kv("الاهتمامات / Interests", escapeHtml(data.interests || "—")));
  }

  if(data.notes){
    rows.push(dividerRow());
    rows.push(kv("ملاحظات / Notes", escapeHtml(data.notes)));
  }

  const box = $("#summaryBox");
  if(box) box.innerHTML = `<div class="kv">${rows.join("")}</div>`;
}

// =============================
// EMAIL TEMPLATE (HTML content)
// =============================
function buildEmailHtml(data, bookingId){
  const isOccasion = data.eventType === "occasion";
  const isGroup = Number(data.peopleCount || 0) >= 4;
  const eventLabel = isOccasion ? "Private Occasion / إقامة مناسبة" : data.eventType;

  const computed = calcDurationHours(data.time, data.endTime);
  const durationFinal = isOccasion ? (data.durationHours || computed || "—") : "—";

  const occ = (data.occasionType === "أخرى" && data.occasionOther)
    ? `${data.occasionType} — ${data.occasionOther}`
    : (data.occasionType || "—");

  const createdAt = new Date().toLocaleString("ar-IQ");

  const tr = (k, v) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid rgba(0,0,0,0.06);width:40%;font-weight:600;">${k}</td>
      <td style="padding:10px 12px;border-bottom:1px solid rgba(0,0,0,0.06);">${v}</td>
    </tr>`;

  const sep = () => `
    <tr>
      <td colspan="2" style="padding:10px 0;border:none;">
        <div style="height:1px;background:rgba(0,0,0,0.08);"></div>
      </td>
    </tr>`;

  let rows = "";
  rows += tr("رقم الحجز / Booking ID", `<span dir="ltr">${escapeHtml(bookingId)}</span>`);
  rows += tr("تاريخ الإرسال", escapeHtml(createdAt));
  rows += sep();

  rows += tr("نوع الفعالية / Event Type", escapeHtml(eventLabel));
  rows += tr("عدد الأشخاص / Guests", escapeHtml(data.peopleCount));
  rows += tr("التاريخ / Date", escapeHtml(humanDate(data.date)));
  rows += tr("وقت البداية / Start", `${escapeHtml(data.time)} — ${escapeHtml(timeToArabicLabel(data.time))}`);

  if(isOccasion){
    rows += sep();
    rows += tr("نوع المناسبة / Occasion", escapeHtml(occ));
    rows += tr("التزيين / Decoration", escapeHtml(data.decorProvider || "—"));
    rows += tr("وجبات من بيت التحفيات؟", data.foodProvider === "yes" ? "نعم (Yes)" : data.foodProvider === "no" ? "لا (No)" : "—");
    rows += tr("وقت النهاية / End", data.endTime ? `${escapeHtml(data.endTime)} — ${escapeHtml(timeToArabicLabel(data.endTime))}` : "—");
    rows += tr("مدة الحجز (ساعات)", escapeHtml(durationFinal));
    rows += tr("فرقة موسيقية؟", data.hasBand === "yes" ? "نعم (Yes)" : data.hasBand === "no" ? "بدون (No)" : "—");
    rows += tr("تفاصيل الفرقة", data.hasBand === "yes" ? escapeHtml(data.bandDetails || "—") : "—");
  }

  rows += sep();
  rows += tr("الاسم الكامل", escapeHtml(data.fullName));
  rows += tr("تاريخ الولادة", escapeHtml(humanDate(data.birthdate)));
  rows += tr("الهاتف", `<span dir="ltr">${escapeHtml(data.phone)}</span>`);
  rows += tr("إيميل الزبون", `<span dir="ltr">${escapeHtml(data.email)}</span>`);

  rows += sep();
  rows += tr("هل يوجد أطفال؟", data.hasKids === "yes" ? "نعم (Yes)" : data.hasKids === "no" ? "لا (No)" : "—");
  rows += tr("عمر أصغر طفل", data.hasKids === "yes" ? escapeHtml(data.youngestKidAge || "—") : "—");

  if(isGroup){
    rows += sep();
    rows += tr("نوع الزوار", escapeHtml(data.groupType || "—"));
    rows += tr("أجانب؟", data.isForeign === "yes" ? "نعم (Yes)" : data.isForeign === "no" ? "لا (No)" : "—");
    rows += tr("الدولة", data.isForeign === "yes" ? escapeHtml(data.country || "—") : "—");
    rows += tr("المحافظة", data.isForeign === "no" ? escapeHtml(data.province || "—") : "—");
    rows += tr("الاهتمامات", escapeHtml(data.interests || "—"));
  }

  if(data.notes){
    rows += sep();
    rows += tr("ملاحظات", escapeHtml(data.notes));
  }

  return `
    <div style="font-family:Arial, sans-serif; direction:rtl; text-align:right; color:#1a1a1a;">
      <h2 style="margin:0 0 8px;">📌 حجز جديد — بيت التحفيات</h2>
      <div style="background:#fff;border:1px solid rgba(0,0,0,0.08);border-radius:12px;overflow:hidden;">
        <table style="width:100%; border-collapse:collapse; font-size:14px;">
          ${rows}
        </table>
      </div>
    </div>
  `;
}

// =============================
// WHATSAPP (opens for customer)
// =============================
function buildWhatsAppText(data, bookingId){
  const isOccasion = data.eventType === "occasion";
  const eventLabel = isOccasion ? "إقامة مناسبة" : data.eventType;

  const durationAuto = calcDurationHours(data.time, data.endTime);
  const durationFinal = isOccasion ? (data.durationHours || durationAuto || "—") : "—";

  const occ = (data.occasionType === "أخرى" && data.occasionOther)
    ? `${data.occasionType} - ${data.occasionOther}`
    : (data.occasionType || "—");

  return [
    "📌 حجز جديد — بيت التحفيات",
    `رقم الحجز: ${bookingId}`,
    "—",
    `نوع الفعالية: ${eventLabel}`,
    `عدد الأشخاص: ${data.peopleCount}`,
    `التاريخ: ${humanDate(data.date)}`,
    `وقت البداية: ${data.time} (${timeToArabicLabel(data.time)})`,
    isOccasion ? `وقت النهاية: ${data.endTime || "—"} ${data.endTime ? `(${timeToArabicLabel(data.endTime)})` : ""}` : null,
    isOccasion ? `مدة الحجز (ساعات): ${durationFinal}` : null,
    "—",
    `الاسم: ${data.fullName}`,
    `المواليد: ${humanDate(data.birthdate)}`,
    `الهاتف: ${data.phone}`,
    `الإيميل: ${data.email}`,
    "—",
    `أطفال؟: ${data.hasKids === "yes" ? "نعم" : "لا"}`,
    data.hasKids === "yes" ? `عمر أصغر طفل: ${data.youngestKidAge || "—"}` : null,
    "—",
    isOccasion ? `نوع المناسبة: ${occ}` : null,
    isOccasion ? `التزيين: ${data.decorProvider || "—"}` : null,
    isOccasion ? `الطعام من بيت التحفيات؟: ${data.foodProvider === "yes" ? "نعم" : data.foodProvider === "no" ? "لا" : "—"}` : null,
    isOccasion ? `فرقة موسيقية؟: ${data.hasBand === "yes" ? "نعم" : data.hasBand === "no" ? "بدون" : "—"}` : null,
    isOccasion && data.hasBand === "yes" ? `تفاصيل الفرقة: ${data.bandDetails || "—"}` : null,
    "—",
    `ملاحظات: ${data.notes || "—"}`
  ].filter(Boolean).join("\n");
}

function openWhatsApp(data, bookingId){
  const text = buildWhatsAppText(data, bookingId);
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank");
}

// =============================
// EVENTS
// =============================
let bookingId = null;

$("#peopleCount")?.addEventListener("input", () => { syncPeopleRules(); });
$("#eventType")?.addEventListener("change", () => { syncOccasionRules(); });

$("#occasionType")?.addEventListener("change", syncOccasionOther);
$("#hasBand")?.addEventListener("change", syncBandDetails);
$("#isForeign")?.addEventListener("change", validateExtraLogic);
$("#hasKids")?.addEventListener("change", syncKidsRules);

$("#time")?.addEventListener("input", syncTimeHints);
$("#endTime")?.addEventListener("input", syncTimeHints);

$("#previewBtn")?.addEventListener("click", () => {
  syncPeopleRules();
  syncOccasionRules();
  syncOccasionOther();
  syncBandDetails();
  validateExtraLogic();
  syncKidsRules();
  syncTimeHints();

  const form = $("#bookingForm");
  const bad = firstInvalidField(form);
  if(bad){
    toast("يرجى إكمال الحقول المطلوبة ❗");
    bad.focus();
    return;
  }

  if(!bookingId) bookingId = makeBookingId();
  const data = getData();
  renderSummary(data, bookingId);
  toast("تم تحديث الملخص ✅");
});

$("#bookingForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  syncPeopleRules();
  syncOccasionRules();
  syncOccasionOther();
  syncBandDetails();
  validateExtraLogic();
  syncKidsRules();
  syncTimeHints();

  const form = $("#bookingForm");
  const bad = firstInvalidField(form);
  if(bad){
    toast("يرجى إكمال الحقول المطلوبة ❗");
    bad.focus();
    return;
  }

  if(!bookingId) bookingId = makeBookingId();
  const data = getData();
  renderSummary(data, bookingId);

  if(!window.emailjs){
    toast("EmailJS غير محمّل.");
    return;
  }

  const submitBtn = $("#submitBtn");
  const spinner = submitBtn?.querySelector(".spinner");
  const btnText = submitBtn?.querySelector(".btn-text");

  const subject = `HOA Booking | ${data.eventType === "occasion" ? "Occasion" : data.eventType} | ${humanDate(data.date)} | ${data.time}`;

  // IMPORTANT:
  // استخدمي داخل EmailJS Template متغير {{message_html}} لعرض المحتوى
  const templateParams = {
    to_email: ADMIN_RECEIVER_EMAIL,
    subject,

    booking_id: bookingId,
    created_at: new Date().toLocaleString("ar-IQ"),

    event_type: data.eventType === "occasion" ? "إقامة مناسبة (Private Occasion)" : data.eventType,
    people_count: data.peopleCount,
    booking_date: humanDate(data.date),

    start_time: data.time,
    start_time_ar: timeToArabicLabel(data.time),

    end_time: data.endTime || "-",
    end_time_ar: data.endTime ? timeToArabicLabel(data.endTime) : "-",

    duration_hours: (data.durationHours || calcDurationHours(data.time, data.endTime) || "-"),

    full_name: data.fullName,
    birthdate: humanDate(data.birthdate),
    phone: data.phone,
    customer_email: data.email,

    has_kids: data.hasKids === "yes" ? "نعم (Yes)" : "لا (No)",
    youngest_kid_age: data.hasKids === "yes" ? (data.youngestKidAge || "-") : "-",

    occasion_type:
      data.eventType === "occasion"
        ? (data.occasionType === "أخرى" && data.occasionOther
            ? `${data.occasionType} - ${data.occasionOther}`
            : (data.occasionType || "-"))
        : "-",

    decor_provider: data.eventType === "occasion" ? (data.decorProvider || "-") : "-",
    food_from_hoa:
      data.eventType === "occasion"
        ? (data.foodProvider === "yes" ? "نعم (Yes)" : data.foodProvider === "no" ? "لا (No)" : "-")
        : "-",

    has_band:
      data.eventType === "occasion"
        ? (data.hasBand === "yes" ? "نعم (Yes)" : data.hasBand === "no" ? "بدون (No)" : "-")
        : "-",

    band_details: data.eventType === "occasion" ? (data.bandDetails || "-") : "-",

    group_type: Number(data.peopleCount || 0) >= 4 ? (data.groupType || "-") : "-",
    is_foreign: Number(data.peopleCount || 0) >= 4 ? (data.isForeign === "yes" ? "نعم (Yes)" : data.isForeign === "no" ? "لا (No)" : "-") : "-",
    country: Number(data.peopleCount || 0) >= 4 ? (data.country || "-") : "-",
    province: Number(data.peopleCount || 0) >= 4 ? (data.province || "-") : "-",
    interests: Number(data.peopleCount || 0) >= 4 ? (data.interests || "-") : "-",

    notes: data.notes || "-",

    // Email HTML Content
    message_html: buildEmailHtml(data, bookingId),
  };

  try{
    if(submitBtn){
      submitBtn.disabled = true;
      if(spinner) spinner.style.display = "inline-block";
      if(btnText) btnText.textContent = "جاري الإرسال... / Sending...";
    }

    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);

    toast("تم إرسال الحجز للإدارة ✅");
    if(btnText) btnText.textContent = "تم الإرسال ✅ / Sent ✅";

    // ✅ Open WhatsApp for the customer AFTER successful email
    openWhatsApp(data, bookingId);

  }catch(err){
    console.error("EmailJS error:", err);
    toast("فشل الإرسال — راجعي إعدادات EmailJS / IDs.");
    if(btnText) btnText.textContent = "تأكيد وإرسال الحجز / Submit";
  }finally{
    if(submitBtn){
      submitBtn.disabled = false;
      if(spinner) spinner.style.display = "none";
    }
  }
});

// =============================
// PRINT (Open print.html)
// =============================
function openPrintPage(){
  const form = document.getElementById("bookingForm");
  const bad = firstInvalidField(form);

  if (bad){
    toast("يرجى إكمال الحقول المطلوبة ❗");
    bad.focus();
    return;
  }

  // توليد رقم الحجز إذا غير موجود
  if(!bookingId) bookingId = makeBookingId();

  const data = getData();

  // تمرير البيانات إلى صفحة الطباعة عبر URL
  const qs = new URLSearchParams({
    booking_id: bookingId,
    created_at: new Date().toLocaleString("ar-IQ"),
    event_type: data.eventType === "occasion" ? "إقامة مناسبة" : data.eventType,
    booking_date: humanDate(data.date),
    start_time: data.time,
    end_time: data.endTime || "—",
    duration_hours: data.durationHours || calcDurationHours(data.time, data.endTime) || "—",
    full_name: data.fullName,
    phone: data.phone,
    customer_email: data.email,
    birthdate: humanDate(data.birthdate),
    has_kids: data.hasKids === "yes" ? "نعم" : "لا",
    youngest_kid_age: data.hasKids === "yes" ? (data.youngestKidAge || "—") : "—"
  });

  window.open(`print.html?${qs.toString()}`, "_blank");
}

// =============================
// Bind Print Button
// =============================
document.getElementById("printBtn")?.addEventListener("click", openPrintPage);

// =============================
// INIT on page load
// =============================
(function init(){
  syncPeopleRules();
  syncOccasionRules();
  syncOccasionOther();
  syncBandDetails();
  validateExtraLogic();
  syncKidsRules();
  syncTimeHints();
})();

