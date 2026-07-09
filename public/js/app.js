// ============================================================
//   APP STATE & HELPERS
// ============================================================
let selectedDocIndex = null;
let doctors = [];
let adminSection = 'tokens';
let currentTokenNo = null;
let currentPatientName = '';
let selectedRating = 0;
let mapInitialized = false;
let selectedRole = null;
let selectedHospital = null;

const API_BASE = '/api';

function showToast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast ' + type;
  setTimeout(() => el.classList.add('show'), 10);
  clearTimeout(el._hide);
  el._hide = setTimeout(() => el.classList.remove('show'), 3200);
}

function showPage(id) {
  document.querySelectorAll('.container').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) {
    target.classList.add('active');
    target.style.animation = 'none';
    requestAnimationFrame(() => { target.style.animation = ''; });
  }
  if (id === 'page-select-hospital') {
    loadHospitalSelection();
  }
  if (id === 'page-doctors') {
    loadDoctors();
  }
  if (id === 'page-admin') {
    const role = sessionStorage.getItem('userRole');
    if (role === 'admin') {
      document.getElementById('btn-manage-doctors').style.display = 'inline-block';
    } else {
      document.getElementById('btn-manage-doctors').style.display = 'none';
    }
    showAdminSection('tokens');
  }
}

function formatDate() {
  return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ============================================================
//   API HELPER
// ============================================================
async function apiFetch(endpoint, options = {}) {
  const res = await fetch(API_BASE + endpoint, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || 'Server error');
  }
  return res.json();
}

// ============================================================
//   HOSPITAL SELECTION
// ============================================================
const hospitalsList = [
  {
    name: 'Gramin Rural Hospital',
    address: 'Agashi Road, Virar West (opposite Woodland Cinema)',
    phone: '+91 12345 67890',
    lat: 19.457,
    lng: 72.798
  },
  {
    name: 'Sir D. M. Petit Municipal Hospital',
    address: 'Bangli Road, Par Naka, Vasai West (near Ward Office)',
    phone: '+91 12345 67891',
    lat: 19.393,
    lng: 72.838
  },
  {
    name: 'VVMC Hospital',
    address: 'Virar Road, Nalasopara East',
    phone: '+91 12345 67892',
    lat: 19.420,
    lng: 72.812
  }
];

function loadHospitalSelection() {
  const container = document.getElementById('hospital-list-select');
  container.innerHTML = `<p style="text-align:center;color:var(--gray);"><i class="fas fa-spinner fa-spin"></i> ${getTranslation('loading')}</p>`;

  try {
    const hospitals = hospitalsList;
    container.innerHTML = '';
    hospitals.forEach((hospital, index) => {
      container.innerHTML += `
        <div class="doc-card" onclick="selectHospital(${index})" style="cursor:pointer;">
          <div class="doc-info">
            <h4>${hospital.name}</h4>
            <small>${hospital.address}</small>
          </div>
          <div style="display:flex;align-items:center;gap:10px;">
            <span class="doc-status" style="background:var(--primary-light);color:var(--primary-dark);">${getTranslation('select')}</span>
          </div>
        </div>
      `;
    });
    if (hospitals.length === 0) {
      container.innerHTML = `<p style="text-align:center;color:var(--gray);">${getTranslation('noHospitals') || 'No hospitals available.'}</p>`;
    }
  } catch (err) {
    console.error(err);
    container.innerHTML = `<p style="text-align:center;color:#b91c1c;">⚠️ ${getTranslation('errorFetchHospitals') || 'Could not load hospitals.'}<br><small>${err.message}</small></p>`;
    showToast(getTranslation('errorFetchHospitals') || 'Could not load hospitals.', 'error');
  }
}

function selectHospital(index) {
  const hospital = hospitalsList[index];
  if (!hospital) return;
  selectedHospital = hospital;
  showHospitalDetails(hospital);
}

function showHospitalDetails(hospital) {
  const container = document.getElementById('hospital-details-content');
  container.innerHTML = `
    <div style="background:var(--off-white);border-radius:12px;padding:16px;">
      <h3 style="color:var(--primary-dark);margin-bottom:8px;"><i class="fas fa-hospital" style="color:var(--primary);"></i> ${hospital.name}</h3>
      <p style="margin:6px 0;"><i class="fas fa-map-marker-alt" style="color:var(--primary);width:20px;"></i> ${hospital.address}</p>
      <p style="margin:6px 0;"><i class="fas fa-phone" style="color:var(--primary);width:20px;"></i> ${hospital.phone || 'N/A'}</p>
    </div>
  `;
  showPage('page-hospital-details');
}

function proceedToDoctors() {
  if (!selectedHospital) {
    showToast('Please select a hospital first.', 'error');
    return;
  }
  showPage('page-doctors');
}

// ============================================================
//   STAFF LOGIN
// ============================================================
function openStaffLogin() {
  document.getElementById('staff-login-modal').style.display = 'flex';
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
  document.getElementById('login-error').textContent = '';
  document.getElementById('login-fields').style.display = 'none';
  document.getElementById('role-selection').style.display = 'block';
  document.querySelectorAll('.role-btn').forEach(btn => {
    btn.style.background = 'var(--light-gray)';
    btn.style.color = 'var(--dark)';
    btn.style.border = '2px solid transparent';
  });
  selectedRole = null;
}

function closeStaffLogin() {
  document.getElementById('staff-login-modal').style.display = 'none';
}

function selectRole(role) {
  selectedRole = role;
  document.querySelectorAll('.role-btn').forEach(btn => {
    if (btn.dataset.role === role) {
      btn.style.background = 'var(--primary)';
      btn.style.color = 'white';
      btn.style.border = '2px solid var(--primary)';
    } else {
      btn.style.background = 'var(--light-gray)';
      btn.style.color = 'var(--dark)';
      btn.style.border = '2px solid transparent';
    }
  });
  document.getElementById('login-fields').style.display = 'block';
  document.getElementById('login-username').focus();
}

async function authenticateStaff() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value.trim();
  const errorEl = document.getElementById('login-error');
  errorEl.textContent = '';

  if (!selectedRole) {
    errorEl.textContent = 'Please select a role first.';
    return;
  }
  if (!username) {
    errorEl.textContent = 'Please enter your username.';
    return;
  }
  if (!password) {
    errorEl.textContent = 'Please enter your password.';
    return;
  }

  try {
    const res = await apiFetch('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    if (res.success) {
      if (res.role !== selectedRole) {
        errorEl.textContent = `This user is not a ${selectedRole}. Select the correct role.`;
        return;
      }
      closeStaffLogin();
      sessionStorage.setItem('userRole', res.role);
      sessionStorage.setItem('username', username);
      showPage('page-admin');
    } else {
      errorEl.textContent = 'Invalid credentials. Try again.';
    }
  } catch (err) {
    errorEl.textContent = err.message || 'Login failed.';
  }
}

document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.star').forEach(star => {
    star.addEventListener('click', function() {
      selectedRating = parseInt(this.dataset.value);
      document.querySelectorAll('.star').forEach(s => {
        s.classList.toggle('active', parseInt(s.dataset.value) <= selectedRating);
      });
    });
  });

  const toggleIcon = document.getElementById('togglePassword');
  const passwordInput = document.getElementById('login-password');
  if (toggleIcon && passwordInput) {
    toggleIcon.addEventListener('click', function(e) {
      e.stopPropagation();
      if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        this.classList.remove('fa-eye');
        this.classList.add('fa-eye-slash');
      } else {
        passwordInput.type = 'password';
        this.classList.remove('fa-eye-slash');
        this.classList.add('fa-eye');
      }
    });
  }

  document.getElementById('login-password').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') authenticateStaff();
  });
  document.getElementById('login-username').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') authenticateStaff();
  });
});

// ============================================================
//   ADMIN DASHBOARD
// ============================================================
function showAdminSection(section) {
  const role = sessionStorage.getItem('userRole');
  if (section === 'doctors' && role !== 'admin') {
    showToast('Access denied. Admin only.', 'error');
    return;
  }
  adminSection = section;
  if (section === 'tokens') loadAdminData();
  else if (section === 'doctors') loadDoctorManagement();
}

function logoutAdmin() {
  sessionStorage.removeItem('userRole');
  sessionStorage.removeItem('username');
  showPage('page-welcome');
  showToast('Logged out successfully.', 'success');
}

// ============================================================
//   LOAD DOCTORS
// ============================================================
async function loadDoctors() {
  const list = document.getElementById('doctor-list');
  list.innerHTML = `<p style="text-align:center;color:var(--gray);"><i class="fas fa-spinner fa-spin"></i> ${getTranslation('loading')}</p>`;
  try {
    const data = await apiFetch('/doctors');
    doctors = data.doctors || [];
    const countsRes = await apiFetch('/tokens/counts?date=' + getTodayStr());
    const counts = countsRes.counts || {};

    list.innerHTML = '';
    doctors.forEach((doc, i) => {
      const count = counts[doc.id] || 0;
      const isFull = count >= doc.limit;
      const statusText = isFull ? getTranslation('full') : `${count} / ${doc.limit}`;
      const statusClass = isFull ? 'full' : '';

      list.innerHTML += `
        <div class="doc-card">
          <div class="doc-info">
            <h4>${doc.name}</h4>
            <small>${doc.dept} &bull; starts ${doc.startTime}</small>
          </div>
          <div style="display:flex;align-items:center;gap:10px;">
            <span class="doc-status ${statusClass}">${statusText}</span>
            <button class="btn btn-primary btn-sm" onclick="selectDoctor(${i})" ${isFull ? 'disabled' : ''}>
              ${isFull ? getTranslation('full') : getTranslation('select')}
            </button>
          </div>
        </div>
      `;
    });
    if (doctors.length === 0) {
      list.innerHTML = `<p style="text-align:center;color:var(--gray);">${getTranslation('noDoctors') || 'No doctors available today.'}</p>`;
    }
  } catch (err) {
    console.error(err);
    list.innerHTML = `<p style="text-align:center;color:#b91c1c;">⚠️ ${getTranslation('errorFetchDoctors')} <br><small>${err.message}</small></p>`;
    showToast(getTranslation('errorFetchDoctors'), 'error');
  }
}

function selectDoctor(i) {
  selectedDocIndex = i;
  const doc = doctors[i];
  if (!doc) return;
  document.getElementById('selected-doc-display').value = `${doc.name} — ${doc.dept}`;
  document.getElementById('patient-name').value = '';
  document.getElementById('patient-age').value = '';
  document.getElementById('patient-phone').value = '';
  document.getElementById('patient-address').value = '';
  if (selectedHospital) {
    document.getElementById('form-hospital-name').textContent = selectedHospital.name;
  } else {
    document.getElementById('form-hospital-name').textContent = '—';
  }
  showPage('page-form');
}

// ============================================================
//   GENERATE TOKEN
// ============================================================
async function generateToken() {
  const name = document.getElementById('patient-name').value.trim();
  const age = document.getElementById('patient-age').value.trim();
  const phone = document.getElementById('patient-phone').value.trim();
  const address = document.getElementById('patient-address').value.trim();
  const btn = document.getElementById('generate-btn');

  if (!name) {
    showToast(getTranslation('enterName'), 'error');
    return;
  }
  if (!age || isNaN(age) || parseInt(age) < 1 || parseInt(age) > 120) {
    showToast(getTranslation('validAge'), 'error');
    return;
  }
  if (selectedDocIndex === null || !doctors[selectedDocIndex]) {
    showToast(getTranslation('selectDoctorFirst'), 'error');
    return;
  }

  const doc = doctors[selectedDocIndex];
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + getTranslation('loading');

  try {
    const nextRes = await apiFetch('/tokens/next', {
      method: 'POST',
      body: JSON.stringify({ doctorId: doc.id, date: getTodayStr() }),
    });
    const tokenNo = nextRes.tokenNo;
    if (tokenNo === null || tokenNo > doc.limit) {
      showToast(getTranslation('doctorFull').replace('{name}', doc.name), 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-ticket-alt"></i> ' + getTranslation('btnConfirmToken');
      return;
    }

    // Calculate appointment time with 10-min gap
    const [h, m] = doc.startTime.split(':').map(Number);
    const totalMinutes = (h * 60) + m + ((tokenNo - 1) * 10);
    const hr = Math.floor(totalMinutes / 60);
    const min = totalMinutes % 60;
    const ampm = hr >= 12 ? 'PM' : 'AM';
    const displayHr = hr > 12 ? hr - 12 : (hr === 0 ? 12 : hr);
    const timeStr = `${displayHr}:${min.toString().padStart(2, '0')} ${ampm}`;

    const payload = {
      doctorId: doc.id,
      doctorName: doc.name,
      patientName: name,
      age: parseInt(age),
      phone: phone || '',
      location: address || '',       // store address as location in DB
      hospital: selectedHospital?.name || '',
      tokenNo: tokenNo,
      time: timeStr,
      date: getTodayStr(),
    };

    await apiFetch('/tokens', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    document.getElementById('res-token').textContent = tokenNo;
    document.getElementById('res-doc').textContent = doc.name;
    document.getElementById('res-name').textContent = name;
    document.getElementById('res-time').textContent = timeStr;
    document.getElementById('res-date').textContent = formatDate();
    document.getElementById('res-hospital').textContent = selectedHospital?.name || '—';
    document.getElementById('res-address').textContent = address || '—';

    currentTokenNo = tokenNo;
    currentPatientName = name;

    showPage('page-result');
    showToast(getTranslation('tokenIssued').replace('{no}', tokenNo).replace('{name}', name), 'success');

    setTimeout(() => {
      document.getElementById('feedback-section').style.display = 'block';
    }, 2000);

  } catch (err) {
    console.error(err);
    showToast(err.message || getTranslation('errorGenerate'), 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-ticket-alt"></i> ' + getTranslation('btnConfirmToken');
  }
}

// ============================================================
//   FEEDBACK
// ============================================================
async function submitFeedback() {
  if (selectedRating === 0) {
    showToast('Please select a rating.', 'error');
    return;
  }
  const comment = document.getElementById('feedback-comment').value.trim();
  try {
    await apiFetch('/feedback', {
      method: 'POST',
      body: JSON.stringify({
        tokenNo: currentTokenNo,
        patientName: currentPatientName,
        rating: selectedRating,
        comment
      })
    });
    showToast('Thank you for your feedback!', 'success');
    document.getElementById('feedback-section').style.display = 'none';
  } catch (err) {
    showToast('Failed to submit feedback.', 'error');
  }
}

// ============================================================
//   ADMIN - TOKENS
// ============================================================
async function loadAdminData() {
  const container = document.getElementById('admin-content');
  container.innerHTML = `<p style="text-align:center;color:var(--gray);"><i class="fas fa-spinner fa-spin"></i> ${getTranslation('loading')}</p>`;
  try {
    const data = await apiFetch('/tokens?date=' + getTodayStr());
    const tokens = data.tokens || [];
    if (tokens.length === 0) {
      container.innerHTML = `
        <div style="text-align:center;padding:20px 0;color:var(--gray);">
          <i class="fas fa-inbox" style="font-size:2rem;display:block;margin-bottom:8px;"></i>
          ${getTranslation('noTokens')}
        </div>
      `;
      return;
    }
    let html = `
      <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
        <thead style="background:var(--primary);color:var(--white);">
          <tr>
            <th style="padding:8px 6px;text-align:left;">#</th>
            <th style="padding:8px 6px;text-align:left;">${getTranslation('resPatient')}</th>
            <th style="padding:8px 6px;text-align:left;">${getTranslation('resDoctor')}</th>
            <th style="padding:8px 6px;text-align:left;">${getTranslation('resHospital')}</th>
            <th style="padding:8px 6px;text-align:left;">${getTranslation('resAddress')}</th>
            <th style="padding:8px 6px;text-align:left;">${getTranslation('resTime')}</th>
          </tr>
        </thead>
        <tbody>
    `;
    tokens.forEach((t, idx) => {
      const bg = idx % 2 === 0 ? '#f9fafb' : 'transparent';
      html += `
        <tr style="background:${bg};border-bottom:1px solid #f0f0f0;">
          <td style="padding:8px 6px;font-weight:700;color:var(--primary-dark);">${t.tokenNo}</td>
          <td style="padding:8px 6px;">${t.patientName}</td>
          <td style="padding:8px 6px;">${t.doctorName}</td>
          <td style="padding:8px 6px;">${t.hospital || '—'}</td>
          <td style="padding:8px 6px;">${t.location || '—'}</td>
          <td style="padding:8px 6px;">${t.time}</td>
        </tr>
      `;
    });
    html += `
        </tbody>
      </table>
      <p style="margin-top:10px;font-size:0.8rem;color:var(--gray);">
        ${getTranslation('totalTokens', { count: tokens.length })} &bull;
        <button class="btn btn-sm" style="width:auto;padding:4px 12px;background:transparent;border:1px solid #ccc;border-radius:6px;cursor:pointer;" onclick="resetToday()">
          <i class="fas fa-trash-alt"></i> ${getTranslation('reset')}
        </button>
      </p>
    `;
    container.innerHTML = html;
  } catch (err) {
    console.error(err);
    container.innerHTML = `<p style="text-align:center;color:#b91c1c;">⚠️ ${getTranslation('errorFetchAdmin')} <br><small>${err.message}</small></p>`;
    showToast(getTranslation('errorFetchAdmin'), 'error');
  }
}

async function resetToday() {
  if (!confirm(getTranslation('confirmReset'))) return;
  if (!confirm(getTranslation('confirmFinal'))) return;
  try {
    await apiFetch('/tokens/reset', {
      method: 'POST',
      body: JSON.stringify({ date: getTodayStr() }),
    });
    showToast(getTranslation('resetSuccess'), 'success');
    loadAdminData();
    if (document.getElementById('page-doctors').classList.contains('active')) {
      loadDoctors();
    }
  } catch (err) {
    console.error(err);
    showToast(getTranslation('resetFailed') + err.message, 'error');
  }
}

// ============================================================
//   ADMIN - DOCTOR CRUD
// ============================================================
async function loadDoctorManagement() {
  const container = document.getElementById('admin-content');
  container.innerHTML = `<p><i class="fas fa-spinner fa-spin"></i> ${getTranslation('loading')}</p>`;
  try {
    const data = await apiFetch('/doctors');
    const doctors = data.doctors || [];
    let html = `
      <div style="margin-bottom:16px;border-bottom:1px solid #eee;padding-bottom:12px;">
        <h4>${getTranslation('addDoctor')}</h4>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <input type="text" id="new-doc-name" placeholder="${getTranslation('labelFullName')}" />
          <input type="text" id="new-doc-dept" placeholder="Department" />
          <input type="time" id="new-doc-time" />
          <input type="number" id="new-doc-limit" placeholder="${getTranslation('dailyLimit')}" />
        </div>
        <button class="btn btn-primary btn-sm" onclick="addDoctor()">${getTranslation('addDoctor')}</button>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
        <thead style="background:var(--primary);color:white;">
          <tr>
            <th style="padding:8px;">${getTranslation('labelFullName')}</th>
            <th style="padding:8px;">Dept</th>
            <th style="padding:8px;">Start</th>
            <th style="padding:8px;">${getTranslation('dailyLimit')}</th>
            <th style="padding:8px;">${getTranslation('actions')}</th>
          </tr>
        </thead>
        <tbody>
    `;
    doctors.forEach(doc => {
      html += `
        <tr id="row-${doc.id}">
          <td><span class="doc-name-${doc.id}">${doc.name}</span></td>
          <td><span class="doc-dept-${doc.id}">${doc.dept}</span></td>
          <td><span class="doc-time-${doc.id}">${doc.startTime}</span></td>
          <td><span class="doc-limit-${doc.id}">${doc.limit}</span></td>
          <td>
            <button class="btn btn-sm" onclick="editDoctor('${doc.id}')" style="background:#fbbf24;width:auto;padding:4px 8px;">${getTranslation('editDoctor')}</button>
            <button class="btn btn-sm" onclick="deleteDoctor('${doc.id}')" style="background:#ef4444;color:white;width:auto;padding:4px 8px;">${getTranslation('deleteDoctor')}</button>
          </td>
        </tr>
      `;
    });
    html += `</tbody></table>`;
    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<p style="color:red;">${getTranslation('errorFetchAdmin')}: ${err.message}</p>`;
  }
}

async function addDoctor() {
  const name = document.getElementById('new-doc-name').value.trim();
  const dept = document.getElementById('new-doc-dept').value.trim();
  const startTime = document.getElementById('new-doc-time').value;
  const limit = document.getElementById('new-doc-limit').value;
  if (!name || !dept || !startTime || !limit) {
    showToast('Please fill all fields.', 'error');
    return;
  }
  try {
    await apiFetch('/doctors', {
      method: 'POST',
      body: JSON.stringify({ name, dept, startTime, limit: parseInt(limit) })
    });
    showToast('Doctor added successfully.');
    loadDoctorManagement();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteDoctor(id) {
  if (!confirm('Delete this doctor? This action is irreversible.')) return;
  try {
    await apiFetch(`/doctors/${id}`, { method: 'DELETE' });
    showToast('Doctor deleted.');
    loadDoctorManagement();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function editDoctor(id) {
  const nameSpan = document.querySelector(`.doc-name-${id}`);
  const deptSpan = document.querySelector(`.doc-dept-${id}`);
  const timeSpan = document.querySelector(`.doc-time-${id}`);
  const limitSpan = document.querySelector(`.doc-limit-${id}`);
  const currentName = nameSpan.textContent;
  const currentDept = deptSpan.textContent;
  const currentTime = timeSpan.textContent;
  const currentLimit = limitSpan.textContent;
  
  nameSpan.innerHTML = `<input type="text" class="edit-name-${id}" value="${currentName}" />`;
  deptSpan.innerHTML = `<input type="text" class="edit-dept-${id}" value="${currentDept}" />`;
  timeSpan.innerHTML = `<input type="time" class="edit-time-${id}" value="${currentTime}" />`;
  limitSpan.innerHTML = `<input type="number" class="edit-limit-${id}" value="${currentLimit}" />`;
  
  const row = document.getElementById(`row-${id}`);
  const actionsCell = row.querySelector('td:last-child');
  actionsCell.innerHTML = `
    <button class="btn btn-sm" onclick="saveDoctor('${id}')" style="background:#22c55e;color:white;width:auto;padding:4px 8px;">${getTranslation('saveDoctor')}</button>
    <button class="btn btn-sm" onclick="cancelEdit('${id}')" style="width:auto;padding:4px 8px;">${getTranslation('cancelEdit')}</button>
  `;
}

async function saveDoctor(id) {
  const name = document.querySelector(`.edit-name-${id}`).value.trim();
  const dept = document.querySelector(`.edit-dept-${id}`).value.trim();
  const startTime = document.querySelector(`.edit-time-${id}`).value;
  const limit = parseInt(document.querySelector(`.edit-limit-${id}`).value);
  if (!name || !dept || !startTime || !limit) {
    showToast('All fields required.', 'error');
    return;
  }
  try {
    await apiFetch(`/doctors/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, dept, startTime, limit })
    });
    showToast('Doctor updated.');
    loadDoctorManagement();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function cancelEdit(id) {
  loadDoctorManagement();
}

// ============================================================
//   NEARBY HOSPITALS (Map)
// ============================================================
function showHospitals() {
  showPage('page-hospitals');
  if (mapInitialized) return;
  mapInitialized = true;

  const hospitals = hospitalsList.map(h => ({
    name: h.name + ', ' + h.address,
    lat: h.lat,
    lng: h.lng
  }));

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        initMap(userLat, userLng, hospitals);
      },
      () => {
        initMap(hospitals[0].lat, hospitals[0].lng, hospitals);
      }
    );
  } else {
    initMap(hospitals[0].lat, hospitals[0].lng, hospitals);
  }
}

function initMap(lat, lng, hospitals) {
  const map = L.map('map').setView([lat, lng], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  L.marker([lat, lng]).addTo(map)
    .bindPopup('You are here')
    .openPopup();

  hospitals.forEach(h => {
    L.marker([h.lat, h.lng]).addTo(map)
      .bindPopup(h.name);
  });

  const list = document.getElementById('hospital-list');
  list.innerHTML = '<ul style="list-style:none;padding:0;">' +
    hospitals.map(h => `<li style="padding:6px 0;border-bottom:1px solid #eee;"><i class="fas fa-hospital" style="color:var(--primary);"></i> ${h.name}</li>`).join('') +
    '</ul>';
}

// ============================================================
//   EXPOSE GLOBALLY
// ============================================================
window.showPage = showPage;
window.selectDoctor = selectDoctor;
window.generateToken = generateToken;
window.loadAdminData = loadAdminData;
window.resetToday = resetToday;
window.loadDoctors = loadDoctors;
window.openStaffLogin = openStaffLogin;
window.closeStaffLogin = closeStaffLogin;
window.authenticateStaff = authenticateStaff;
window.showAdminSection = showAdminSection;
window.logoutAdmin = logoutAdmin;
window.addDoctor = addDoctor;
window.deleteDoctor = deleteDoctor;
window.editDoctor = editDoctor;
window.saveDoctor = saveDoctor;
window.cancelEdit = cancelEdit;
window.submitFeedback = submitFeedback;
window.showHospitals = showHospitals;
window.selectRole = selectRole;
window.loadHospitalSelection = loadHospitalSelection;
window.selectHospital = selectHospital;
window.proceedToDoctors = proceedToDoctors;
window.showHospitalDetails = showHospitalDetails;