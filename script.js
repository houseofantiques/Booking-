/**************************************************************
 * HOA Booking Form - script.js
 * Clean rewrite:
 * - Visit / Tour => per person pricing
 * - Photography => per hour pricing
 **************************************************************/

const WHATSAPP_NUMBER = "9647737079079";

const EMAILJS_PUBLIC_KEY  = "tivoinl7MHIKAOORE";
const EMAILJS_SERVICE_ID  = "service_bm4mbb9";
const EMAILJS_TEMPLATE_ID = "template_ht88c8b";

const ADMIN_RECEIVER_EMAIL = "houseofantique30@gmail.com";
const MASTERCARD_NUMBER = "7146148577";

const PAYMENT_PRICES = {
  "زيارة": 10,
  "جولة": 15,
};

const PHOTOGRAPHY_PRICE_PER_HOUR = 400;

(function initEmailJS(){
  if (window.emailjs) {
    emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
  }
})();

const $ = (s) => document.querySelector(s);

function toast(msg){
  const t = $("#toast");
  if(!t){
    alert(msg);
    return;
  }
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2600);
}

function pad2(n){
  return String(n).padStart(2, "0");
}

function humanDate(iso){
  if(!iso) return "—";
  const [y, m, d] = iso.split("-");
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
  const m = pad2(now.getMonth() + 1);
  const d = pad2(now.getDate());
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `HOA-${y}${m}${d}-${r}`;
}

function escapeHtml(str){
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function calcDurationHours(start, end){
  if(!start || !end) return "";
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if([sh, sm, eh, em].some(Number.isNaN)) return "";
  let s = sh * 60 + sm;
  let e = eh * 60 + em;
  if(e < s) e += 24 * 60;
  const diff = (e - s) / 60;
  return diff.toFixed(1).replace(".0", "");
}

function show(el){
  if(el) el.style.display = "block";
}

function hide(el){
  if(el) el.style.display = "none";
}

function isStandardPaymentEvent(type){
  return type === "زيارة" || type === "جولة";
}

function isPhotographyEvent(type){
  return type === "تصوير";
}

function isPaymentEvent(type){
  return isStandardPaymentEvent(type) || isPhotographyEvent(type);
}

function getPaymentMeta(eventType, peopleCount, photographyHours){
  if(isPhotographyEvent(eventType)){
    const hours = Math.max(Number(photographyHours || 0), 0);
    const total = hours * PHOTOGRAPHY_PRICE_PER_HOUR;

    return {
      enabled: true,
      isPhotography: true,
      perPerson: 0,
      total,
      hours,
      perHour: PHOTOGRAPHY_PRICE_PER_HOUR,
      label: `$${PHOTOGRAPHY_PRICE_PER_HOUR} / hour`,
      totalLabel: total ? `$${total}` : "—",
    };
  }

  const count = Math.max(Number(peopleCount || 0), 0);
  const perPerson = PAYMENT_PRICES[eventType] || 0;
  const total = perPerson * count;

  return {
    enabled: isStandardPaymentEvent(eventType),
    isPhotography: false,
    perPerson,
    total,
    hours: 0,
    perHour: 0,
    label: perPerson ? `$${perPerson} / person` : "—",
    totalLabel: total ? `$${total}` : "—",
  };
}

function syncOccasionRules(){
  const v = $("#eventType")?.value;
  const wrap = $("#occasionFields");
  if(!wrap) return;

  if(v === "occasion"){
    show(wrap);

    if($("#occasionType")) $("#occasionType").required = true;
    if($("#decorProvider")) $("#decorProvider").required = true;
    if($("#foodProvider")) $("#foodProvider").required = true;
    if($("#hasBand")) $("#hasBand").required = true;
  } else {
    hide(wrap);

    if($("#occasionType")) $("#occasionType").required = false;
    if($("#decorProvider")) $("#decorProvider").required = false;
    if($("#foodProvider")) $("#foodProvider").required = false;
    if($("#hasBand")) $("#hasBand").required = false;

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
  } else {
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
  } else {
    hide(wrap);
    if($("#bandDetails")) $("#bandDetails").value = "";
  }
}

function syncPhotographyFields(){
  const eventType = $("#eventType")?.value || "";
  const wrap = $("#photographyFields");
  const typeSelect = $("#photographyType");
  const hoursInput = $("#photographyHours");

  if(!wrap || !typeSelect || !hoursInput) return;

  if(isPhotographyEvent(eventType)){
    show(wrap);
    typeSelect.required = true;
    hoursInput.required = true;
  } else {
    hide(wrap);
    typeSelect.required = false;
    hoursInput.required = false;
    typeSelect.value = "";
    hoursInput.value = "";
    if($("#photographyOther")) $("#photographyOther").value = "";
    if($("#photographyTotalDisplay")) $("#photographyTotalDisplay").value = "—";
    hide($("#photographyOtherWrap"));
  }
}

function syncPhotographyOther(){
  const v = $("#photographyType")?.value;
  const wrap = $("#photographyOtherWrap");
  const input = $("#photographyOther");
  if(!wrap || !input) return;

  if(v === "أخرى"){
    show(wrap);
    input.required = true;
  } else {
    hide(wrap);
    input.required = false;
    input.value = "";
  }
}

function syncPeopleRules(){
  const n = Number($("#peopleCount")?.value || 0);
  const group = $("#groupFields");
  if(!group) return;

  if(n >= 4){
    show(group);

    if($("#groupType")) $("#groupType").required = true;
    if($("#isForeign")) $("#isForeign").required = true;
    if($("#interests")) $("#interests").required = true;
  } else {
    hide(group);

    if($("#groupType")) $("#groupType").required = false;
    if($("#isForeign")) $("#isForeign").required = false;
    if($("#interests")) $("#interests").required = false;

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

  syncPaymentUI();
  validateExtraLogic();
}

function validateExtraLogic(){
  const groupVisible = $("#groupFields") && $("#groupFields").style.display !== "none";
  if(!groupVisible) return;

  const isForeign = $("#isForeign")?.value;

  if(isForeign === "yes"){
    show($("#countryWrap"));
    hide($("#provinceWrap"));

    if($("#country")) $("#country").required = true;
    if($("#province")) $("#province").required = false;
    if($("#province")) $("#province").value = "";
  } else if(isForeign === "no"){
    show($("#provinceWrap"));
    hide($("#countryWrap"));

    if($("#province")) $("#province").required = true;
    if($("#country")) $("#country").required = false;
    if($("#country")) $("#country").value = "";
  } else {
    hide($("#countryWrap"));
    hide($("#provinceWrap"));

    if($("#country")) $("#country").required = false;
    if($("#province")) $("#province").required = false;
  }
}

function syncKidsRules(){
  const v = $("#hasKids")?.value;
  const row = $("#kidsAgeRow");
  const age = $("#youngestKidAge");
  if(!row || !age) return;

  if(v === "yes"){
    row.style.display = "grid";
    age.required = true;
  } else {
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

function syncPaymentUI(){
  const eventType = $("#eventType")?.value || "";
  const peopleCount = $("#peopleCount")?.value || "0";
  const photographyHours = $("#photographyHours")?.value || "0";

  const paymentSection = $("#paymentSection");
  const paymentMethod = $("#paymentMethod");
  const paymentRef = $("#paymentRef");
  const paymentNotice = $("#paymentNotice");
  const pricePerPerson = $("#pricePerPerson");
  const paymentTotal = $("#paymentTotal");
  const badge = $("#paymentTypeBadge");
  const mastercardNumber = $("#mastercardNumber");

  const photoRateRow = $("#photoRateRow");
  const photoHoursRow = $("#photoHoursRow");
  const photoTotalRow = $("#photoTotalRow");
  const photoRate = $("#photoRate");
  const photoHoursValue = $("#photoHoursValue");
  const photoTotal = $("#photoTotal");
  const photoDisplay = $("#photographyTotalDisplay");

  const meta = getPaymentMeta(eventType, peopleCount, photographyHours);

  if(meta.enabled){
    show(paymentSection);

    if(paymentMethod) paymentMethod.required = true;
    if(badge) badge.textContent = eventType;
    if(mastercardNumber) mastercardNumber.textContent = MASTERCARD_NUMBER;

    if(meta.isPhotography){
      if(pricePerPerson) pricePerPerson.textContent = "—";
      if(paymentTotal) paymentTotal.textContent = meta.totalLabel;

      show(photoRateRow);
      show(photoHoursRow);
      show(photoTotalRow);

      if(photoRate) photoRate.textContent = `$${meta.perHour}`;
      if(photoHoursValue) photoHoursValue.textContent = meta.hours ? String(meta.hours) : "—";
      if(photoTotal) photoTotal.textContent = meta.totalLabel;
      if(photoDisplay) photoDisplay.value = meta.totalLabel;
    } else {
      if(pricePerPerson) pricePerPerson.textContent = meta.label;
      if(paymentTotal) paymentTotal.textContent = meta.totalLabel;

      hide(photoRateRow);
      hide(photoHoursRow);
      hide(photoTotalRow);

      if(photoRate) photoRate.textContent = "—";
      if(photoHoursValue) photoHoursValue.textContent = "—";
      if(photoTotal) photoTotal.textContent = "—";
      if(photoDisplay) photoDisplay.value = "—";
    }
  } else {
    hide(paymentSection);

    if(paymentMethod){
      paymentMethod.required = false;
      paymentMethod.value = "";
    }

    if(paymentRef) paymentRef.value = "";
    if(paymentNotice) paymentNotice.value = "";
    if(pricePerPerson) pricePerPerson.textContent = "—";
    if(paymentTotal) paymentTotal.textContent = "—";
    if(badge) badge.textContent = "—";

    hide(photoRateRow);
    hide(photoHoursRow);
    hide(photoTotalRow);

    if(photoRate) photoRate.textContent = "—";
    if(photoHoursValue) photoHoursValue.textContent = "—";
    if(photoTotal) photoTotal.textContent = "—";
    if(photoDisplay) photoDisplay.value = "—";
  }
}

function getData(){
  const eventType = $("#eventType").value;
  const peopleCount = $("#peopleCount").value;
  const photographyHours = $("#photographyHours")?.value || "";
  const paymentMeta = getPaymentMeta(eventType, peopleCount, photographyHours);

  return {
    eventType,
    peopleCount,
    date: $("#date").value,
    time: $("#time").value,

    photographyType: $("#photographyType")?.value || "",
    photographyOther: $("#photographyOther")?.value?.trim() || "",

    occasionType: $("#occasionType")?.value || "",
    occasionOther: $("#occasionOther")?.value?.trim() || "",
    decorProvider: $("#decorProvider")?.value || "",
    foodProvider: $("#foodProvider")?.value || "",
    endTime: $("#endTime")?.value || "",
    durationHours: $("#durationHours")?.value || "",
    hasBand: $("#hasBand")?.value || "",
    bandDetails: $("#bandDetails")?.value?.trim() || "",

    fullName: $("#fullName").value.trim(),
    birthdate: $("#birthdate").value,
    phone: $("#phone").value.trim(),
    email: $("#email").value.trim(),
    notes: $("#notes")?.value?.trim() || "",

    hasKids: $("#hasKids").value,
    youngestKidAge: $("#youngestKidAge")?.value || "",

    groupType: $("#groupType")?.value || "",
    isForeign: $("#isForeign")?.value || "",
    country: $("#country")?.value?.trim() || "",
    province: $("#province")?.value?.trim() || "",
    interests: $("#interests")?.value?.trim() || "",

    paymentEnabled: paymentMeta.enabled,
    paymentMethod: $("#paymentMethod")?.value || "",
    paymentRef: $("#paymentRef")?.value?.trim() || "",
    paymentNotice: $("#paymentNotice")?.value?.trim() || "",
    pricePerPerson: paymentMeta.perPerson,
    paymentTotal: paymentMeta.total,
    mastercardNumber: MASTERCARD_NUMBER,

    photographyHours: paymentMeta.isPhotography ? paymentMeta.hours : 0,
    photographyPricePerHour: paymentMeta.isPhotography ? paymentMeta.perHour : 0,
    isPhotographyPayment: paymentMeta.isPhotography,
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

function kv(k, v){
  return `<div class="kv-row"><span>${k}</span><b>${v}</b></div>`;
}

function dividerRow(){
  return `<div class="kv-divider"></div>`;
}

function renderSummary(data, bookingId){
  const isOccasion = data.eventType === "occasion";
  const isGroup = Number(data.peopleCount || 0) >= 4;
  const isPhotography = data.eventType === "تصوير";
  const eventLabel = isOccasion ? "إقامة مناسبة (Private Occasion)" : data.eventType;
  const rows = [];

  rows.push(kv("رقم الحجز / Booking ID", `<span dir="ltr">${escapeHtml(bookingId)}</span>`));
  rows.push(kv("نوع الفعالية / Event Type", escapeHtml(eventLabel)));
  rows.push(kv("التاريخ / Date", escapeHtml(humanDate(data.date))));
  rows.push(kv("وقت البداية / Start", `${escapeHtml(data.time)} — ${escapeHtml(timeToArabicLabel(data.time))}`));
  rows.push(kv("عدد الأشخاص / Guests", escapeHtml(data.peopleCount)));

  if(isPhotography){
    const photoTypeLabel =
      data.photographyType === "أخرى" && data.photographyOther
        ? `${data.photographyType} — ${data.photographyOther}`
        : (data.photographyType || "—");

    rows.push(kv("نوع التصوير / Photography Type", escapeHtml(photoTypeLabel)));
    rows.push(kv("عدد الساعات / Hours", escapeHtml(data.photographyHours || "—")));
  }

  if(data.paymentEnabled){
    rows.push(dividerRow());
    rows.push(kv("الدفع / Payment", "مطلوب قبل تثبيت الحجز / Required before confirmation"));

    if(isPhotography){
      rows.push(kv("سعر الساعة / Price Per Hour", `$${escapeHtml(data.photographyPricePerHour)}`));
      rows.push(kv("إجمالي المبلغ / Final Total", `$${escapeHtml(data.paymentTotal)}`));
    } else {
      rows.push(kv("سعر الشخص / Per Person", `$${escapeHtml(data.pricePerPerson)}`));
      rows.push(kv("المبلغ الكلي / Total", `$${escapeHtml(data.paymentTotal)}`));
    }

    rows.push(kv("رقم بطاقة التحويل / Transfer Card", `<span dir="ltr">${escapeHtml(data.mastercardNumber)}</span>`));
    rows.push(kv("طريقة الدفع / Method", escapeHtml(data.paymentMethod || "—")));
    rows.push(kv("مرجع الدفع / Payment Ref", escapeHtml(data.paymentRef || "—")));
    rows.push(kv("ملاحظة الدفع / Payment Note", escapeHtml(data.paymentNotice || "—")));
  }

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

function buildEmailHtml(data, bookingId){
  const isOccasion = data.eventType === "occasion";
  const isGroup = Number(data.peopleCount || 0) >= 4;
  const isPhotography = data.eventType === "تصوير";
  const eventLabel = isOccasion ? "Private Occasion / إقامة مناسبة" : data.eventType;
  const computed = calcDurationHours(data.time, data.endTime);
  const durationFinal = isOccasion ? (data.durationHours || computed || "—") : "—";
  const occ = (data.occasionType === "أخرى" && data.occasionOther)
    ? `${data.occasionType} — ${data.occasionOther}`
    : (data.occasionType || "—");
  const photoTypeLabel =
    data.photographyType === "أخرى" && data.photographyOther
      ? `${data.photographyType} — ${data.photographyOther}`
      : (data.photographyType || "—");

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

  if(isPhotography){
    rows += tr("نوع التصوير / Photography Type", escapeHtml(photoTypeLabel));
    rows += tr("عدد الساعات / Hours", escapeHtml(data.photographyHours || "—"));
  }

  if(data.paymentEnabled){
    rows += sep();

    if(isPhotography){
      rows += tr("الدفع مطلوب؟", "نعم — تصوير");
      rows += tr("سعر الساعة", `$${escapeHtml(data.photographyPricePerHour)}`);
      rows += tr("إجمالي المبلغ", `$${escapeHtml(data.paymentTotal)}`);
    } else {
      rows += tr("الدفع مطلوب؟", "نعم — زيارة أو جولة");
      rows += tr("سعر الشخص", `$${escapeHtml(data.pricePerPerson)}`);
      rows += tr("المبلغ الكلي", `$${escapeHtml(data.paymentTotal)}`);
    }

    rows += tr("رقم بطاقة التحويل", `<span dir="ltr">${escapeHtml(data.mastercardNumber)}</span>`);
    rows += tr("طريقة الدفع", escapeHtml(data.paymentMethod || "—"));
    rows += tr("مرجع الدفع", escapeHtml(data.paymentRef || "—"));
    rows += tr("ملاحظة الدفع", escapeHtml(data.paymentNotice || "—"));
  } else {
    rows += sep();
    rows += tr("الدفع الإلكتروني", "لا يظهر — يتم الاتفاق أولاً عبر التواصل");
  }

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

function buildWhatsAppText(data, bookingId){
  const isOccasion = data.eventType === "occasion";
  const isPhotography = data.eventType === "تصوير";
  const eventLabel = isOccasion ? "إقامة مناسبة" : data.eventType;
  const durationAuto = calcDurationHours(data.time, data.endTime);
  const durationFinal = isOccasion ? (data.durationHours || durationAuto || "—") : "—";
  const occ = (data.occasionType === "أخرى" && data.occasionOther)
    ? `${data.occasionType} - ${data.occasionOther}`
    : (data.occasionType || "—");
  const photoTypeLabel =
    data.photographyType === "أخرى" && data.photographyOther
      ? `${data.photographyType} - ${data.photographyOther}`
      : (data.photographyType || "—");

  return [
    "📌 حجز جديد — بيت التحفيات",
    `رقم الحجز: ${bookingId}`,
    "—",
    `نوع الفعالية: ${eventLabel}`,
    `عدد الأشخاص: ${data.peopleCount}`,
    `التاريخ: ${humanDate(data.date)}`,
    `وقت البداية: ${data.time} (${timeToArabicLabel(data.time)})`,
    isPhotography ? `نوع التصوير: ${photoTypeLabel}` : null,
    isPhotography ? `عدد الساعات: ${data.photographyHours}` : null,
    isPhotography ? `سعر الساعة: $${data.photographyPricePerHour}` : null,
    data.paymentEnabled ? `الدفع المطلوب: $${data.paymentTotal}` : null,
    !isPhotography && data.paymentEnabled ? `سعر الشخص: $${data.pricePerPerson}` : null,
    data.paymentEnabled ? `رقم بطاقة التحويل: ${data.mastercardNumber}` : null,
    data.paymentEnabled ? `مرجع الدفع: ${data.paymentRef || "—"}` : null,
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

let bookingId = null;

$("#peopleCount")?.addEventListener("input", syncPeopleRules);

$("#eventType")?.addEventListener("change", () => {
  syncOccasionRules();
  syncPhotographyFields();
  syncPaymentUI();
});

$("#occasionType")?.addEventListener("change", syncOccasionOther);
$("#hasBand")?.addEventListener("change", syncBandDetails);
$("#isForeign")?.addEventListener("change", validateExtraLogic);
$("#hasKids")?.addEventListener("change", syncKidsRules);
$("#time")?.addEventListener("input", syncTimeHints);
$("#endTime")?.addEventListener("input", syncTimeHints);
$("#photographyType")?.addEventListener("change", syncPhotographyOther);
$("#photographyHours")?.addEventListener("input", syncPaymentUI);

$("#previewBtn")?.addEventListener("click", () => {
  syncPeopleRules();
  syncOccasionRules();
  syncOccasionOther();
  syncBandDetails();
  validateExtraLogic();
  syncKidsRules();
  syncTimeHints();
  syncPhotographyFields();
  syncPhotographyOther();
  syncPaymentUI();

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
  syncPhotographyFields();
  syncPhotographyOther();
  syncPaymentUI();

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

    photography_type:
      data.photographyType === "أخرى" && data.photographyOther
        ? `${data.photographyType} - ${data.photographyOther}`
        : (data.photographyType || "-"),
    photography_hours: data.isPhotographyPayment ? String(data.photographyHours) : "-",
    photography_price_per_hour: data.isPhotographyPayment ? `$${data.photographyPricePerHour}` : "-",

    full_name: data.fullName,
    birthdate: humanDate(data.birthdate),
    phone: data.phone,
    customer_email: data.email,

    has_kids: data.hasKids === "yes" ? "نعم (Yes)" : "لا (No)",
    youngest_kid_age: data.hasKids === "yes" ? (data.youngestKidAge || "-") : "-",

    payment_required: data.paymentEnabled ? "نعم (Yes)" : "لا (No)",
    payment_method: data.paymentEnabled ? (data.paymentMethod || "-") : "-",
    payment_per_person: !data.isPhotographyPayment && data.paymentEnabled ? `$${data.pricePerPerson}` : "-",
    payment_total: data.paymentEnabled ? `$${data.paymentTotal}` : "-",
    payment_card_number: data.paymentEnabled ? data.mastercardNumber : "-",
    payment_ref: data.paymentEnabled ? (data.paymentRef || "-") : "-",
    payment_notice: data.paymentEnabled ? (data.paymentNotice || "-") : "-",

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
    is_foreign: Number(data.peopleCount || 0) >= 4
      ? (data.isForeign === "yes" ? "نعم (Yes)" : data.isForeign === "no" ? "لا (No)" : "-")
      : "-",
    country: Number(data.peopleCount || 0) >= 4 ? (data.country || "-") : "-",
    province: Number(data.peopleCount || 0) >= 4 ? (data.province || "-") : "-",
    interests: Number(data.peopleCount || 0) >= 4 ? (data.interests || "-") : "-",

    notes: data.notes || "-",
    message_html: buildEmailHtml(data, bookingId),
  };

  try {
    if(submitBtn){
      submitBtn.disabled = true;
      if(spinner) spinner.style.display = "inline-block";
      if(btnText) btnText.textContent = "جاري الإرسال... / Sending...";
    }

    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);

    toast("تم إرسال الحجز للإدارة ✅");
    if(btnText) btnText.textContent = "تم الإرسال ✅ / Sent ✅";

    openWhatsApp(data, bookingId);
  } catch(err){
    console.error("EmailJS error:", err);
    toast("فشل الإرسال — راجعي إعدادات EmailJS / IDs.");
    if(btnText) btnText.textContent = "تأكيد وإرسال الحجز / Submit";
  } finally {
    if(submitBtn){
      submitBtn.disabled = false;
      if(spinner) spinner.style.display = "none";
    }
  }
});

function openPrintPage(){
  const form = document.getElementById("bookingForm");
  const bad = firstInvalidField(form);

  if(bad){
    toast("يرجى إكمال الحقول المطلوبة ❗");
    bad.focus();
    return;
  }

  if(!bookingId) bookingId = makeBookingId();

  const data = getData();

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
    youngest_kid_age: data.hasKids === "yes" ? (data.youngestKidAge || "—") : "—",
    payment_total: data.paymentEnabled ? `$${data.paymentTotal}` : "—",
    payment_per_person: !data.isPhotographyPayment && data.paymentEnabled ? `$${data.pricePerPerson}` : "—",
    payment_card_number: data.paymentEnabled ? data.mastercardNumber : "—",
    payment_method: data.paymentEnabled ? (data.paymentMethod || "—") : "—",
    payment_ref: data.paymentEnabled ? (data.paymentRef || "—") : "—",
    photography_type:
      data.photographyType === "أخرى" && data.photographyOther
        ? `${data.photographyType} - ${data.photographyOther}`
        : (data.photographyType || "—"),
    photography_hours: data.isPhotographyPayment ? String(data.photographyHours) : "—",
    photography_price_per_hour: data.isPhotographyPayment ? `$${data.photographyPricePerHour}` : "—",
  });

  window.open(`print.html?${qs.toString()}`, "_blank");
}

document.getElementById("printBtn")?.addEventListener("click", openPrintPage);

(function init(){
  syncPeopleRules();
  syncOccasionRules();
  syncOccasionOther();
  syncBandDetails();
  validateExtraLogic();
  syncKidsRules();
  syncTimeHints();
  syncPhotographyFields();
  syncPhotographyOther();
  syncPaymentUI();
})();