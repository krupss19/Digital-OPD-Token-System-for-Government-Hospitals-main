require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Users (keep in JSON) ----------
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(USERS_FILE)) {
  const defaultUsers = {
    admin: { password: process.env.ADMIN_PASSWORD || 'admin123', role: 'admin' },
    staff: { password: process.env.STAFF_PASSWORD || 'staff123', role: 'staff' }
  };
  fs.writeFileSync(USERS_FILE, JSON.stringify(defaultUsers, null, 2));
}
function readUsers() { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); }

// ---------- Routes ----------

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  const users = readUsers();
  const user = users[username];
  if (user && user.password === password) {
    res.json({ success: true, role: user.role });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// ---------- Doctors (Supabase) ----------
app.get('/api/doctors', async (req, res) => {
  const { data, error } = await supabase.from('doctors').select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.json({ doctors: data });
});

app.post('/api/doctors', async (req, res) => {
  const { name, dept, startTime, limit } = req.body;
  if (!name || !dept || !startTime || !limit) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  const newId = 'doc' + Date.now();
  const { data, error } = await supabase
    .from('doctors')
    .insert([{ id: newId, name, dept, start_time: startTime, daily_limit: parseInt(limit) }])
    .select();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, doctor: data[0] });
});

app.put('/api/doctors/:id', async (req, res) => {
  const { id } = req.params;
  const { name, dept, startTime, limit } = req.body;
  const { data, error } = await supabase
    .from('doctors')
    .update({ name, dept, start_time: startTime, daily_limit: parseInt(limit) })
    .eq('id', id)
    .select();
  if (error) return res.status(500).json({ error: error.message });
  if (data.length === 0) return res.status(404).json({ error: 'Doctor not found' });
  res.json({ success: true, doctor: data[0] });
});

app.delete('/api/doctors/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('doctors').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// ---------- Tokens (Supabase) ----------
app.get('/api/tokens/counts', async (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const { data: doctors, error: docError } = await supabase.from('doctors').select('id, daily_limit');
  if (docError) return res.status(500).json({ error: docError.message });

  const counts = {};
  for (const doc of doctors) {
    const { count, error } = await supabase
      .from('tokens')
      .select('*', { count: 'exact', head: true })
      .eq('doctor_id', doc.id)
      .eq('date', date);
    if (error) return res.status(500).json({ error: error.message });
    counts[doc.id] = count;
  }
  res.json({ counts });
});

app.post('/api/tokens/next', async (req, res) => {
  const { doctorId, date } = req.body;
  if (!doctorId) return res.status(400).json({ error: 'doctorId required' });
  const today = date || new Date().toISOString().slice(0, 10);
  const { count, error } = await supabase
    .from('tokens')
    .select('*', { count: 'exact', head: true })
    .eq('doctor_id', doctorId)
    .eq('date', today);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ tokenNo: count + 1 });
});

app.post('/api/tokens', async (req, res) => {
  const { doctorId, doctorName, patientName, age, phone, location, hospital, tokenNo, time, date } = req.body;
  if (!doctorId || !patientName || !tokenNo) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const today = date || new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('tokens')
    .insert([{
      doctor_id: doctorId,
      doctor_name: doctorName,
      patient_name: patientName,
      age: parseInt(age),
      phone: phone || '',
      location: location || '',
      hospital: hospital || '',
      token_no: tokenNo,
      time: time,
      date: today
    }])
    .select();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, tokenNo });
});

app.get('/api/tokens', async (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('tokens')
    .select('*')
    .eq('date', date)
    .order('token_no', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ tokens: data });
});

app.post('/api/tokens/reset', async (req, res) => {
  const date = req.body.date || new Date().toISOString().slice(0, 10);
  const { error } = await supabase
    .from('tokens')
    .delete()
    .eq('date', date);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// ---------- Feedback (Supabase) ----------
app.post('/api/feedback', async (req, res) => {
  const { tokenNo, patientName, rating, comment } = req.body;
  if (!tokenNo || !rating) return res.status(400).json({ error: 'Missing tokenNo or rating' });
  const { error } = await supabase
    .from('feedback')
    .insert([{ token_no: tokenNo, patient_name: patientName, rating, comment }]);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// ---------- Health & fallback ----------
app.get('/health', (req, res) => res.send('OK'));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

module.exports = app;

// Local only
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}