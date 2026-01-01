const params = new URLSearchParams(window.location.search);

const fields = [
  "booking_id","created_at","event_type","booking_date",
  "start_time","end_time","duration_hours",
  "full_name","phone","customer_email","birthdate",
  "has_kids","youngest_kid_age"
];

fields.forEach(f=>{
  const el = document.getElementById(f);
  if(el) el.textContent = params.get(f) || "—";
});

function downloadPDF(){
  const element = document.getElementById("printArea");
  html2pdf().set({
    margin:10,
    filename:`booking-${params.get("booking_id")}.pdf`,
    image:{ type:"jpeg", quality:0.98 },
    html2canvas:{ scale:2 },
    jsPDF:{ unit:"mm", format:"a4", orientation:"portrait" }
  }).from(element).save();
}
