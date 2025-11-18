// script.js - booking/calendar/contact + admin filtering
// Uses localStorage for persistence and sessionStorage for auth (auth.js provides getCurrentUser/checkAuth)

// Utility helpers
const pad = n => String(n).padStart(2, "0");
const buildDate = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

function calcEndTime(start, dur) {
  if (!start || !dur) return '';
  const [h, m] = start.split(':').map(Number);
  const total = h * 60 + m + dur * 60;
  const endH = Math.floor((total % 1440) / 60);
  const endM = total % 60;
  return `${pad(endH)}:${pad(endM)}`;
}

function readBookings() {
  return JSON.parse(localStorage.getItem('bookings')) || [];
}
function writeBookings(arr) {
  localStorage.setItem('bookings', JSON.stringify(arr));
}
function readContacts() {
  return JSON.parse(localStorage.getItem('contacts')) || [];
}
function writeContacts(arr) {
  localStorage.setItem('contacts', JSON.stringify(arr));
}

// --- CONTACT FORM HANDLING (contact.html) ---
(function contactHandler() {
  if (!document.getElementById) return;
  const contactForm = document.getElementById("contactForm");
  if (!contactForm) return;
  contactForm.addEventListener("submit", function(e) {
    e.preventDefault();
    const name = contactForm.name.value.trim();
    const email = contactForm.email.value.trim();
    const subject = contactForm.subject.value.trim();
    const message = contactForm.message.value.trim();
    if (!name || !email || !message) return alert("Please fill required fields");
    // Allow optionally relatedAdmin to be saved in future (not required)
    const contacts = readContacts();
    contacts.push({ name, email, subject, message, createdAt: new Date().toISOString() });
    writeContacts(contacts);
    alert("Message submitted successfully ✅");
    contactForm.reset();
  });
})();

// --- BOOKING / CALENDAR HANDLING (booking.html) ---
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('bookingForm');
  const list = document.getElementById('bookingList');
  const clearBtn = document.getElementById('clearBookings');
  const calendarView = document.getElementById('calendarView');
  const timeSlotsDiv = document.getElementById('timeSlots');
  const monthSelect = document.getElementById('monthSelect');
  const yearSelect = document.getElementById('yearSelect');
  const roomFilter = document.getElementById('roomFilter');
  const dateInput = document.getElementById('date');
  const timeInput = document.getElementById('time');
  const durationSelect = document.getElementById('duration');
  const endTimeInput = document.getElementById('endTime');

  // if booking page not present, exit
  if (!calendarView || !form) {
    // However we still populate admin-select on pages that have booking form in other structure
    injectAdminSelectIfNeeded();
    return;
  }

  // Insert "Assigned Admin" select into form (so staff can choose which admin is head)
  injectAdminSelectIfNeeded();

  function injectAdminSelectIfNeeded() {
    // avoid multiple injection
    if (!form) return;
    if (form.querySelector('[name="assignedAdmin"]')) return;

    // find admin usernames from users list in auth.js (if available)
    let adminUsernames = [];
    try {
      if (typeof users !== "undefined" && Array.isArray(users)) {
        adminUsernames = users.filter(u => u.role === "admin").map(u => u.username);
      }
    } catch (e) { adminUsernames = []; }

    if (adminUsernames.length === 0) {
      // show owner as fallback
      adminUsernames = ["admin1"];
    }

    // create a wrapper block similar to other form fields to keep styling consistent
    const label = document.createElement('label');
    label.setAttribute('for', 'assignedAdmin');
    label.textContent = 'Admin In-charge (Select)';

    const sel = document.createElement('select');
    sel.id = 'assignedAdmin';
    sel.name = 'assignedAdmin';
    sel.style.marginBottom = '0.75rem';
    sel.innerHTML = `<option value="">Select Admin</option>` + adminUsernames.map(u => `<option value="${u}">${u}</option>`).join('');
    // Insert before description field if present
    const desc = form.querySelector('#description');
    if (desc) {
      desc.parentNode.insertBefore(sel, desc);
      desc.parentNode.insertBefore(label, sel);
    } else {
      form.insertBefore(sel, form.querySelector('button[type="submit"]'));
      form.insertBefore(label, sel);
    }
  }

  // Populate month/year dropdowns
  (function populateDropdowns() {
    if (!monthSelect || !yearSelect) return;
    monthSelect.innerHTML = "";
    for (let m = 0; m < 12; m++) {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = new Date(2000, m, 1).toLocaleString('default', { month: 'long' });
      monthSelect.appendChild(opt);
    }
    const yNow = new Date().getFullYear();
    for (let y = yNow - 1; y <= yNow + 2; y++) {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      yearSelect.appendChild(opt);
    }
    monthSelect.value = new Date().getMonth();
    yearSelect.value = yNow;
  })();

  function generateCalendar(y, m) {
    if (!calendarView) return;
    calendarView.innerHTML = '';
    const firstDay = new Date(y, m, 1).getDay();
    const days = new Date(y, m + 1, 0).getDate();
    const grid = document.createElement('div'); grid.className = 'calendar';
    for (let i = 0; i < firstDay; i++) grid.appendChild(document.createElement('div'));
    for (let d = 1; d <= days; d++) {
      const cell = document.createElement('div');
      cell.className = 'calendar-day';
      cell.textContent = d;
      const cellDate = new Date(y, m, d);
      const today = new Date(); today.setHours(0,0,0,0);
      if (cellDate < today) cell.classList.add('past-date');
      cell.addEventListener('click', () => {
        if (cell.classList.contains('past-date')) return;
        const dateStr = buildDate(y, m, d);
        showSlots(y, m, d, dateStr);
      });
      grid.appendChild(cell);
    }
    calendarView.appendChild(grid);
  }

  function showSlots(y, m, d, dateStr) {
    const allBookings = readBookings();
    const room = roomFilter ? roomFilter.value : (form ? form.room.value : 'Room A');
    const taken = [];
    const now = new Date();
    const selectedDate = new Date(y, m, d);
    const isToday = selectedDate.toDateString() === now.toDateString();

    allBookings.forEach(b => {
      if (b.date === dateStr && b.room === room) {
        const startMin = parseInt(b.time.split(':')[0]) * 60 + parseInt(b.time.split(':')[1]);
        const endMin = parseInt(b.endTime.split(':')[0]) * 60 + parseInt(b.endTime.split(':')[1]);
        for (let t = startMin; t < endMin; t += 60) taken.push(t);
      }
    });

    timeSlotsDiv.innerHTML = `<h4>Available slots for ${pad(d)}/${pad(m + 1)}/${y} in ${room}</h4>`;
    const slots = ['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'];

    slots.forEach(time => {
      const [hh, mm] = time.split(':').map(Number);
      const mins = hh * 60 + mm;
      const slot = document.createElement('div');
      slot.className = 'time-slot';
      slot.textContent = time;

      const pastTime = isToday && (hh < now.getHours() || (hh === now.getHours() && mm <= now.getMinutes()));

      if (taken.includes(mins) || pastTime) slot.classList.add('past-time');
      else {
        slot.addEventListener('click', () => {
          dateInput.value = dateStr;
          timeInput.value = time;
          if (form && form.room) form.room.value = room;
          const dur = parseInt(durationSelect.value, 10);
          endTimeInput.value = dur ? calcEndTime(time, dur) : '';
          form.style.display = 'block';
          form.scrollIntoView({ behavior: 'smooth' });
        });
      }
      timeSlotsDiv.appendChild(slot);
    });

    if (!timeSlotsDiv.querySelector('.time-slot:not(.past-time)')) {
      timeSlotsDiv.innerHTML += '<p><em>No free slots available for this day.</em></p>';
    }
  }

  function loadBookingsList() {
    // small booking list below form
    const b = readBookings();
    list.innerHTML = '';
    if (!b || b.length === 0) {
      if (clearBtn) clearBtn.style.display = 'none';
      list.textContent = 'No bookings yet.';
      return;
    }
    if (clearBtn) clearBtn.style.display = 'inline-block';
    b.forEach(x => {
      const div = document.createElement('div');
      div.className = 'card';
      div.style.marginBottom = '8px';
      div.innerHTML = `<strong>${x.name}</strong> booked <b>${x.room}</b> on <b>${x.date}</b> ${x.time}–${x.endTime} (${x.duration}h) — Admin: ${x.assignedAdmin || '—'}`;
      list.appendChild(div);
    });
  }

  // Save booking from form
  form.addEventListener('submit', e => {
    e.preventDefault();

    // Get assignedAdmin value (if select present)
    const assignedAdminEl = form.querySelector('[name="assignedAdmin"]');
    const assignedAdmin = assignedAdminEl ? assignedAdminEl.value : "";

    const booking = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      room: form.room.value,
      date: form.date.value,
      time: form.time.value,
      duration: form.duration.value,
      endTime: form.endTime.value,
      description: form.description ? form.description.value.trim() : '',
      bookedBy: (getCurrentUser() && getCurrentUser().username) || 'anonymous',
      assignedAdmin: assignedAdmin || null,
      createdAt: new Date().toISOString()
    };

    if (Object.values(booking).some(v => v === "" || v === null) && !booking.description) {
      // require basics
      if (!booking.name || !booking.email || !booking.room || !booking.date || !booking.time || !booking.duration) {
        return alert('Fill all required fields');
      }
    }
    const all = readBookings();
    all.push(booking);
    writeBookings(all);
    loadBookingsList();
    alert('Booking confirmed ✅');
    form.reset();
    form.style.display = 'none';
  });

  if (clearBtn) clearBtn.addEventListener('click', () => {
    if (confirm('Clear all bookings?')) {
      localStorage.removeItem('bookings');
      loadBookingsList();
    }
  });

  // duration change updates end time
  if (durationSelect) durationSelect.addEventListener('change', () => {
    const start = timeInput.value;
    const dur = parseInt(durationSelect.value, 10);
    endTimeInput.value = start && dur ? calcEndTime(start, dur) : '';
  });

  // initial render
  const now = new Date();
  generateCalendar(now.getFullYear(), now.getMonth());
  loadBookingsList();

  // dropdown handlers
  if (monthSelect) monthSelect.addEventListener('change', () => generateCalendar(+yearSelect.value, +monthSelect.value));
  if (yearSelect) yearSelect.addEventListener('change', () => generateCalendar(+yearSelect.value, +monthSelect.value));
  if (roomFilter) roomFilter.addEventListener('change', () => generateCalendar(+yearSelect.value, +monthSelect.value));
});
