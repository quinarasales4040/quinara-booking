const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// ================================
// SUPABASE
// ================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

// ================================
// DEWAN
// ================================

const HALLS = [
  "Arafah Hall",
  "Ar-Rayyan",
  "Glass Hall",
  "As-Safar",
  "Al-Marwah"
];

// ================================
// LOGIN ADMIN
// ================================

const ADMIN_USERNAME = "sales";
const ADMIN_PASSWORD = "quinara4040";

// ================================
// SETUP
// ================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// ================================
// SUPABASE REQUEST
// ================================

async function supabaseRequest(endpoint, options = {}) {
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    throw new Error("Supabase environment variables belum diset.");
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${endpoint}`,
    {
      ...options,
      headers: {
        apikey: SUPABASE_SECRET_KEY,
        Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
        ...(options.headers || {})
      }
    }
  );

  const text = await response.text();
  let data = [];

  try {
    data = text ? JSON.parse(text) : [];
  } catch {
    data = text;
  }

  if (!response.ok) {
    console.error("SUPABASE ERROR:", data);
    throw new Error(
      typeof data === "string" ? data : JSON.stringify(data)
    );
  }

  return data;
}

// ================================
// CONVERT DATABASE → APP
// ================================

function formatBooking(row) {
  return {
    id: row.id,
    customerName: row.customer_name || "",
    phone: row.phone || "",
    email: row.email || "",
    hall: row.hall || "",
    eventDate: row.event_date || "",
    eventTime: row.event_time || "",
    eventType: row.event_type || "",
    pax: row.pax ?? "",
    notes: row.notes || "",
    status: row.status || "Pending",
    createdAt: row.created_at || ""
  };
}

// ================================
// CUSTOMER PAGE
// ================================

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "customer.html"));
});

// ================================
// ADMIN LOGIN PAGE
// ================================

app.get("/admin", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="ms">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Quinara Admin Login</title>
<style>
*{box-sizing:border-box}
body{
  margin:0;font-family:Arial,sans-serif;background:#f5f7f9;
  min-height:100vh;display:flex;align-items:center;justify-content:center
}
.login-box{
  width:100%;max-width:400px;background:white;padding:30px;
  border-radius:16px;box-shadow:0 5px 25px rgba(0,0,0,.10);margin:20px
}
.logo{text-align:center;color:#17324d;font-size:30px;font-weight:bold;margin-bottom:5px}
.subtitle{text-align:center;color:#777;margin-bottom:30px}
label{display:block;font-weight:bold;margin-top:18px;margin-bottom:7px}
input{width:100%;padding:13px;border:1px solid #ddd;border-radius:8px;font-size:15px}
button{
  width:100%;margin-top:25px;padding:14px;border:0;border-radius:8px;
  background:#17324d;color:white;font-size:16px;font-weight:bold;cursor:pointer
}
button:hover{opacity:.9}
.error{
  display:none;margin-top:15px;padding:12px;border-radius:8px;
  background:#f8d7da;color:#721c24;text-align:center
}
</style>
</head>
<body>
<div class="login-box">
  <div class="logo">QUINARA</div>
  <div class="subtitle">Admin Login</div>
  <form id="loginForm">
    <label>Username</label>
    <input id="username" type="text" placeholder="Masukkan username" required>
    <label>Password</label>
    <input id="password" type="password" placeholder="Masukkan password" required>
    <button type="submit">LOGIN</button>
  </form>
  <div id="error" class="error">Username atau password salah.</div>
</div>
<script>
document.getElementById("loginForm").addEventListener("submit", async function(e){
  e.preventDefault();

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({username, password})
    });

    const result = await response.json();

    if (result.success) {
      window.location.href = "/admin-dashboard";
    } else {
      document.getElementById("error").style.display = "block";
    }
  } catch(error) {
    alert("Server tidak dapat dihubungi.");
  }
});
</script>
</body>
</html>
  `);
});

// ================================
// LOGIN API
// ================================

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  if (
    username === ADMIN_USERNAME &&
    password === ADMIN_PASSWORD
  ) {
    return res.json({ success: true });
  }

  res.status(401).json({
    success: false,
    message: "Username atau password salah."
  });
});

// ================================
// ADMIN DASHBOARD
// ================================

app.get("/admin-dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

// ================================
// STATUS
// ================================

app.get("/api/status", (req, res) => {
  res.json({
    success: true,
    message: "Quinara Booking Server is running"
  });
});

// ================================
// SENARAI DEWAN
// ================================

app.get("/api/halls", (req, res) => {
  res.json({ success: true, halls: HALLS });
});

// ================================
// DAPATKAN SEMUA TEMPAHAN
// ================================

app.get("/api/bookings", async (req, res) => {
  try {
    const rows = await supabaseRequest(
      "bookings?select=*&order=created_at.desc"
    );

    res.json({
      success: true,
      bookings: rows.map(formatBooking)
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Gagal membaca data tempahan."
    });
  }
});

// ================================
// BUAT TEMPAHAN
// ================================

app.post("/api/bookings", async (req, res) => {
  try {
    const {
      customerName,
      phone,
      email,
      hall,
      eventDate,
      eventTime,
      eventType,
      pax,
      notes
    } = req.body;

    // ============================
    // VALIDASI MAKLUMAT WAJIB
    // eventTime TIDAK diwajibkan
    // ============================

    if (
      typeof customerName !== "string" ||
      !customerName.trim() ||
      typeof phone !== "string" ||
      !phone.trim() ||
      typeof hall !== "string" ||
      !hall.trim() ||
      typeof eventDate !== "string" ||
      !eventDate.trim() ||
      typeof eventType !== "string" ||
      !eventType.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Sila lengkapkan semua maklumat wajib."
      });
    }

    if (!HALLS.includes(hall)) {
      return res.status(400).json({
        success: false,
        message: "Dewan tidak sah."
      });
    }

    // ============================
    // SEMAK DEWAN + TARIKH
    // ============================

    const conflictRows = await supabaseRequest(
      `bookings?select=id,status&hall=eq.${encodeURIComponent(hall)}&event_date=eq.${encodeURIComponent(eventDate)}&status=neq.Cancelled`
    );

    if (conflictRows && conflictRows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Maaf, dewan tersebut sudah mempunyai tempahan pada tarikh ini."
      });
    }

    // ============================
    // BOOKING ID
    // ============================

    const bookingId = "QNR-" + Date.now().toString().slice(-8);

    // ============================
    // DATA TEMPAHAN
    // ============================

    const newBooking = {
      id: bookingId,
      customer_name: customerName.trim(),
      phone: phone.trim(),
      email: typeof email === "string" ? email.trim() : "",
      hall: hall,
      event_date: eventDate,

      // Masa tidak wajib dalam borang.
      // Kekalkan kolum event_time dalam database.
      event_time:
        typeof eventTime === "string" && eventTime.trim()
          ? eventTime.trim()
          : null,

      event_type: eventType.trim(),
      pax:
        pax !== undefined && pax !== null && String(pax).trim() !== ""
          ? parseInt(pax, 10)
          : null,
      notes: typeof notes === "string" ? notes.trim() : "",
      status: "Pending"
    };

    // ============================
    // SIMPAN SUPABASE
    // ============================

    const insertedRows = await supabaseRequest(
      "bookings",
      {
        method: "POST",
        body: JSON.stringify(newBooking)
      }
    );

    if (!insertedRows || !insertedRows[0]) {
      throw new Error("Supabase tidak memulangkan rekod tempahan.");
    }

    const savedBooking = formatBooking(insertedRows[0]);

    // ============================
    // RESPONSE
    // ============================

    return res.json({
      success: true,
      message: "Tempahan berjaya dihantar.",
      booking: savedBooking
    });

  } catch (error) {
    console.error("BOOKING ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Ralat server semasa menyimpan tempahan."
    });
  }
});

// ================================
// CONFIRM TEMPAHAN
// ================================

app.put("/api/bookings/:id/confirm", async (req, res) => {
  try {
    const rows = await supabaseRequest(
      `bookings?id=eq.${encodeURIComponent(req.params.id)}&select=*`
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Tempahan tidak dijumpai."
      });
    }

    const updatedRows = await supabaseRequest(
      `bookings?id=eq.${encodeURIComponent(req.params.id)}`,
      {
        method: "PATCH",
        body: JSON.stringify({ status: "Confirmed" })
      }
    );

    res.json({
      success: true,
      message: "Tempahan telah disahkan.",
      booking: formatBooking(updatedRows[0])
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Gagal confirm tempahan."
    });
  }
});

// ================================
// CANCEL TEMPAHAN
// ================================

app.put("/api/bookings/:id/cancel", async (req, res) => {
  try {
    const rows = await supabaseRequest(
      `bookings?id=eq.${encodeURIComponent(req.params.id)}&select=*`
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Tempahan tidak dijumpai."
      });
    }

    const updatedRows = await supabaseRequest(
      `bookings?id=eq.${encodeURIComponent(req.params.id)}`,
      {
        method: "PATCH",
        body: JSON.stringify({ status: "Cancelled" })
      }
    );

    res.json({
      success: true,
      message: "Tempahan telah dibatalkan.",
      booking: formatBooking(updatedRows[0])
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Gagal membatalkan tempahan."
    });
  }
});

// ================================
// START SERVER
// ================================

app.listen(PORT, () => {
  console.log("");
  console.log("-----------------------------------");
  console.log("      QUINARA BOOKING SYSTEM");
  console.log("-----------------------------------");
  console.log(`Server running on port ${PORT}`);
  console.log("Supabase database enabled");
  console.log("-----------------------------------");
  console.log("");
});