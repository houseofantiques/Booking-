/******************************************************
 * HOA Booking - print.js (FINAL FIXED)
 ******************************************************/

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);

  console.log("PRINT PARAMS:", Object.fromEntries(params.entries()));

  const fields = [
    "booking_id",
    "created_at",
    "event_type",
    "booking_date",
    "start_time",
    "end_time",
    "duration_hours",
    "full_name",
    "phone",
    "customer_email",
    "birthdate",
    "has_kids",
    "youngest_kid_age"
  ];

  fields.forEach((key) => {
    const el = document.getElementById(key);
    if (!el) {
      console.warn("Missing ID in print.html:", key);
      return;
    }
    const val = params.get(key);
    el.textContent = val && val.trim() ? val : "—";
  });
});

function downloadPDF(){
  const element = document.getElementById("printArea");
  const params = new URLSearchParams(window.location.search);
  const id = params.get("booking_id") || "HOA";

  html2pdf().set({
    margin:10,
    filename:`booking-${id}.pdf`,
    image:{ type:"jpeg", quality:0.98 },
    html2canvas:{ scale:2 },
    jsPDF:{ unit:"mm", format:"a4", orientation:"portrait" }
  }).from(element).save();
}
