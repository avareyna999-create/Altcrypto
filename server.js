const express = require('express');
const app = express();
const PORT = 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.send("OK SERVER HIDUP");
});

app.post('/api/register', (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: "Data tidak lengkap" });
  }

  res.json({
    success: true,
    message: "Register berhasil"
  });
});

app.listen(PORT, () => {
  console.log("Server jalan di port " + PORT);
});
