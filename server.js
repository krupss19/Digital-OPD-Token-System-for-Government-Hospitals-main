const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

const DATA_DIR = path.join(__dirname, 'data');
const TOKENS_FILE = path.join(DATA_DIR, 'tokens.json');
const DOCTORS_FILE = path.join(DATA_DIR, 'doctors.json');
const FEEDBACK_FILE = path.join(DATA_DIR, 'feedback.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(TOKENS_FILE)) fs.writeFileSync(TOKENS_FILE, JSON.stringify({}));
if (!fs.existsSync(DOCTORS_FILE)) {
  const defaultDocs = [
    { id: 'doc1', name: 'Dr. Prasad Raut', dept: 'General OPD', startTime: '08:00', limit: 40 },
    { id: 'doc2', name: 'Dr. Prabhat Sinha', dept: 'Pediatrics', startTime: '09:00', limit: 30 },
    { id: 'doc3', name: 'Dr. Raj Sharma', dept: 'Dental Unit', startTime: '08:30', limit: 20 },
    { id: 'doc4', name: 'Dr. Mayuri Shinde', dept: 'Dental Unit', startTime: '08:30', limit: 20 }
  ];
  fs.writeFileSync(DOCTORS_FILE, JSON.stringify(defaultDocs, null, 2));
}
if (!fs.existsSync(FEEDBACK_FILE)) fs.writeFileSync(FEEDBACK_FILE, JSON.stringify([]));
if (!fs.existsSync(USERS_FILE)) {
  const defaultUsers = {
    admin: { password: 'admin123', role: 'admin' },
    staff: { password: 'staff123', role: 'staff' }
  };
  fs.writeFileSync(USERS_FILE, JSON.stringify(defaultUsers, null, 2));
}

function readTokens() { return JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8')); }
function writeTokens(data) { fs.writeFileSync(TOKENS_FILE, JSON.stringify(data, null, 2)); }
function readDoctors() { return JSON.parse(fs.readFileSync(DOCTORS_FILE, 'utf8')); }
function writeDoctors(doctors) { fs.writeFileSync(DOCTORS_FILE, JSON.stringify(doctors, null, 2)); }
function readFeedback() { return JSON.parse(fs.readFileSync(FEEDBACK_FILE, 'utf8')); }
function writeFeedback(data) { fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(data, null, 2)); }
function readUsers() { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); }

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

app.get('/api/doctors', (req, res) => {
  res.json({ doctors: readDoctors() });
});
app.post('/api/doctors', (req, res) => {
  const { name, dept, startTime, limit } = req.body;
  if (!name || !dept || !startTime || !limit) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  const doctors = readDoctors();
  const newId = 'doc' + Date.now();
  const newDoc = { id: newId, name, dept, startTime, limit: parseInt(limit) };
  doctors.push(newDoc);
  writeDoctors(doctors);
  res.json({ success: true, doctor: newDoc });
});
app.put('/api/doctors/:id', (req, res) => {
  const { id } = req.params;
  const { name, dept, startTime, limit } = req.body;
  let doctors = readDoctors();
  const index = doctors.findIndex(d => d.id === id);
  if (index === -1) return res.status(404).json({ error: 'Doctor not found' });
  doctors[index] = { ...doctors[index], name, dept, startTime, limit: parseInt(limit) };
  writeDoctors(doctors);
  res.json({ success: true, doctor: doctors[index] });
});
app.delete('/api/doctors/:id', (req, res) => {
  const { id } = req.params;
  let doctors = readDoctors();
  const filtered = doctors.filter(d => d.id !== id);
  if (filtered.length === doctors.length) return res.status(404).json({ error: 'Doctor not found' });
  writeDoctors(filtered);
  res.json({ success: true });
});

app.get('/api/tokens/counts', (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const tokens = readTokens();
  const doctors = readDoctors();
  const counts = {};
  doctors.forEach(doc => {
    const key = `${doc.id}_${date}`;
    counts[doc.id] = (tokens[key] || []).length;
  });
  res.json({ counts });
});
app.post('/api/tokens/next', (req, res) => {
  const { doctorId, date } = req.body;
  if (!doctorId) return res.status(400).json({ error: 'doctorId required' });
  const today = date || new Date().toISOString().slice(0, 10);
  const tokens = readTokens();
  const key = `${doctorId}_${today}`;
  const existing = tokens[key] || [];
  const nextNo = existing.length + 1;
  res.json({ tokenNo: nextNo });
});
app.post('/api/tokens', (req, res) => {
  const { doctorId, doctorName, patientName, age, phone, location, hospital, tokenNo, time, date } = req.body;
  if (!doctorId || !patientName || !tokenNo) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const today = date || new Date().toISOString().slice(0, 10);
  const tokens = readTokens();
  const key = `${doctorId}_${today}`;
  if (!tokens[key]) tokens[key] = [];
  if (tokens[key].find(t => t.tokenNo === tokenNo)) {
    return res.status(409).json({ error: 'Token already exists' });
  }
  tokens[key].push({
    tokenNo,
    patientName,
    age,
    phone: phone || '',
    location: location || '',
    hospital: hospital || '',
    doctorName,
    time,
    date: today
  });
  writeTokens(tokens);
  res.json({ success: true, tokenNo });
});
app.get('/api/tokens', (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const tokens = readTokens();
  const all = [];
  Object.keys(tokens).forEach(key => {
    if (key.endsWith(`_${date}`)) {
      all.push(...tokens[key]);
    }
  });
  all.sort((a, b) => a.tokenNo - b.tokenNo);
  res.json({ tokens: all });
});
app.post('/api/tokens/reset', (req, res) => {
  const date = req.body.date || new Date().toISOString().slice(0, 10);
  const tokens = readTokens();
  const toDelete = Object.keys(tokens).filter(k => k.endsWith(`_${date}`));
  toDelete.forEach(k => delete tokens[k]);
  writeTokens(tokens);
  res.json({ success: true });
});
app.post('/api/feedback', (req, res) => {
  const { tokenNo, patientName, rating, comment } = req.body;
  if (!tokenNo || !rating) return res.status(400).json({ error: 'Missing tokenNo or rating' });
  const feedback = readFeedback();
  feedback.push({ tokenNo, patientName, rating, comment, date: new Date().toISOString() });
  writeFeedback(feedback);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});