const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3000;

const HALLS = [
  "Arafah Hall",
  "Ar-Rayyan",
  "Glass Hall",
  "As-Safar",
  "Al-Marwah"
];

const DATA_FILE = path.join(__dirname, "bookings.json");

// ================================
// LOGIN ADMIN
// ================================

const ADMIN_USERNAME = "sales";
const ADMIN_PASSWORD = "quinara4040";

// ================================
// SETUP
// ================================

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, "[]");
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================================
// CUSTOMER
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

*{
  box-sizing:border-box;
}

body{
  margin:0;
  font-family:Arial,sans-serif;
  background:#f5f7f9;
  min-height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
}

.login-box{
  width:100%;
  max-width:400px;
  background:white;
  padding:30px;
  border-radius:16px;
  box-shadow:0 5px 25px rgba(0,0,0,.10);
  margin:20px;
}

.logo{
  text-align:center;
  color:#17324d;
  font-size:30px;
  font-weight:bold;
  margin-bottom:5px;
}

.subtitle{
  text-align:center;
  color:#777;
  margin-bottom:30px;
}

label{
  display:block;
  font-weight:bold;
  margin-top:18px;
  margin-bottom:7px;
}

input{
  width:100%;
  padding:13px;
  border:1px solid #ddd;
  border-radius:8px;
  font-size:15px;
}

button{
  width:100%;
  margin-top:25px;
  padding:14px;
  border:0;
  border-radius:8px;
  background:#17324d;
  color:white;
  font-size:16px;
  font-weight:bold;
  cursor:pointer;
}

button:hover{
  opacity:.9;
}

.error{
  display:none;
  margin-top:15px;
  padding:12px;
  border-radius:8px;
  background:#f8d7da;
  color:#721c24;
  text-align:center;
}

</style>
</head>

<body>

<div class="login-box">

<div class="logo">
QUINARA
</div>

<div class="subtitle">
Admin Login
</div>

<form id="loginForm">

<label>Username</label>

<input
id="username"
type="text"
placeholder="Masukkan username"
required
>

<label>Password</label>

<input
id="password"
type="password"
placeholder="Masukkan password"
required
>

<button type="submit">
LOGIN
</button>

</form>

<div
id="error"
class="error">

Username atau password salah.

</div>

</div>

<script>

document
.getElementById("loginForm")
.addEventListener("submit", async function(e){

e.preventDefault();

const username =
document.getElementById("username").value;

const password =
document.getElementById("password").value;

try{

const response =
await fetch("/api/login",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({
username,
password
})

});

const result =
await response.json();

if(result.success){

window.location.href =
"/admin-dashboard";

}else{

document.getElementById("error")
.style.display="block";

}

}catch(error){

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

  const {
    username,
    password
  } = req.body;

  if (
    username === ADMIN_USERNAME &&
    password === ADMIN_PASSWORD
  ) {

    return res.json({
      success: true
    });

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

  res.json({
    success: true,
    halls: HALLS
  });

});

// ================================
// DAPATKAN SEMUA TEMPAHAN
// ================================

app.get("/api/bookings", (req, res) => {

  try {

    const bookings =
      JSON.parse(
        fs.readFileSync(DATA_FILE, "utf8")
      );

    res.json({
      success: true,
      bookings
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: "Gagal membaca data tempahan."
    });

  }

});

// ================================
// BUAT TEMPAHAN
// ================================

app.post("/api/bookings", (req, res) => {

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

    if (
      !customerName ||
      !phone ||
      !hall ||
      !eventDate ||
      !eventTime ||
      !eventType
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Sila lengkapkan semua maklumat wajib."
      });

    }

    if (!HALLS.includes(hall)) {

      return res.status(400).json({
        success: false,
        message: "Dewan tidak sah."
      });

    }

    const bookings =
      JSON.parse(
        fs.readFileSync(DATA_FILE, "utf8")
      );

    const conflict =
      bookings.find(booking =>
        booking.hall === hall &&
        booking.eventDate === eventDate &&
        booking.status !== "Cancelled"
      );

    if (conflict) {

      return res.status(409).json({
        success: false,
        message:
          "Maaf, dewan tersebut sudah mempunyai tempahan pada tarikh ini."
      });

    }

    const bookingId =
      "QNR-" +
      Date.now().toString().slice(-8);

    const newBooking = {

      id: bookingId,

      customerName:
        customerName.trim(),

      phone:
        phone.trim(),

      email:
        email ? email.trim() : "",

      hall,

      eventDate,

      eventTime,

      eventType,

      pax:
        pax || "",

      notes:
        notes ? notes.trim() : "",

      status:
        "Pending",

      createdAt:
        new Date().toISOString()

    };

    bookings.push(newBooking);

    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(bookings, null, 2)
    );

    res.json({

      success: true,

      message:
        "Tempahan berjaya dihantar.",

      booking:
        newBooking

    });

  } catch (error) {

    console.error(error);

    res.status(500).json({

      success: false,

      message:
        "Ralat server semasa menyimpan tempahan."

    });

  }

});

// ================================
// CONFIRM TEMPAHAN
// ================================

app.put("/api/bookings/:id/confirm", (req, res) => {

  try {

    const bookings =
      JSON.parse(
        fs.readFileSync(DATA_FILE, "utf8")
      );

    const index =
      bookings.findIndex(
        booking =>
          booking.id === req.params.id
      );

    if (index === -1) {

      return res.status(404).json({

        success: false,

        message:
          "Tempahan tidak dijumpai."

      });

    }

    bookings[index].status =
      "Confirmed";

    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(bookings, null, 2)
    );

    res.json({

      success: true,

      message:
        "Tempahan telah disahkan.",

      booking:
        bookings[index]

    });

  } catch (error) {

    console.error(error);

    res.status(500).json({

      success: false,

      message:
        "Gagal confirm tempahan."

    });

  }

});

// ================================
// CANCEL TEMPAHAN
// ================================

app.put("/api/bookings/:id/cancel", (req, res) => {

  try {

    const bookings =
      JSON.parse(
        fs.readFileSync(DATA_FILE, "utf8")
      );

    const index =
      bookings.findIndex(
        booking =>
          booking.id === req.params.id
      );

    if (index === -1) {

      return res.status(404).json({

        success: false,

        message:
          "Tempahan tidak dijumpai."

      });

    }

    bookings[index].status =
      "Cancelled";

    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(bookings, null, 2)
    );

    res.json({

      success: true,

      message:
        "Tempahan telah dibatalkan.",

      booking:
        bookings[index]

    });

  } catch (error) {

    console.error(error);

    res.status(500).json({

      success: false,

      message:
        "Gagal membatalkan tempahan."

    });

  }

});

// ================================
// START SERVER
// ================================

app.listen(PORT, () => {

  console.log("");

  console.log("-----------------------------------");

  console.log(
    "      QUINARA BOOKING SYSTEM"
  );

  console.log("-----------------------------------");

  console.log(
    `Server running at http://localhost:${PORT}`
  );

  console.log("-----------------------------------");

  console.log("");

});