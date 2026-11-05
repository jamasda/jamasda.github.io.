/* =====================================================================
   admin-jamasda.js — Masjid Subardi Al-Huda Kuwon
   Fitur: teks berjalan, kartu pengumuman (Khutbah Jumat & PAP),
          rekap infaq masuk/keluar, login admin, pengaturan iqomah & ihtiyati.
   ===================================================================== */
(function () {
  'use strict';

  // >>> GANTI dengan URL Web App Apps Script (berakhiran /exec) <<<
  const ADMIN_URL = 'https://script.google.com/macros/s/AKfycbzTha8oQdWbq6QIwPhv-n1wbHOpF9OdXchcBorhvxysv742fq8SD6ni8JagPS875d7U/exec';

  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const rp = n => 'Rp' + (Number(n) || 0).toLocaleString('id-ID');
  const tglID = t => {
    if (!t) return '';
    const d = new Date(t + 'T00:00:00');
    return isNaN(d) ? t : d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };
  const KAT_MASUK = ['Infaq Jumat', 'Infaq Subuh', 'Kotak Amal', 'Sedekah / QRIS', 'Zakat (UPZ)', 'Donasi Pembangunan', 'Lainnya'];
  const KAT_KELUAR = ['Listrik & Air', 'Kebersihan', 'Honor Marbot/Petugas', 'Santunan / Sosial', 'Perbaikan & Pembangunan', 'Konsumsi Kajian', 'Lainnya'];
  const INFO_KEYS = ['kjTanggal', 'kjKhatib', 'kjImam', 'kjTema', 'papTanggal', 'papPemateri', 'papTema', 'running'];

  let DATA = { infaq: [], info: {} };
  let PASS = null;

  async function api(payload) {
    const r = await fetch(ADMIN_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
    return r.json();
  }

  /* ---------- CSS ---------- */
  const st = document.createElement('style');
  st.textContent = `
  .jm-track{display:inline-flex;white-space:nowrap;animation:jmscroll var(--d,40s) linear infinite}
  .jm-track:hover{animation-play-state:paused}
  .jm-seg{min-width:100vw;padding-right:60px}
  .jm-seg span.it{margin-right:48px}
  @keyframes jmscroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}`;
  document.head.appendChild(st);

  /* ---------- Teks berjalan + kartu pengumuman ---------- */
  function sisipkanTickerDanKartu() {
    const header = document.querySelector('header');
    if (!header || $('jm-ticker')) return;

    const ticker = document.createElement('div');
    ticker.id = 'jm-ticker';
    ticker.className = 'w-full max-w-6xl mb-4 rounded-2xl gold-line glass overflow-hidden flex items-stretch';
    ticker.innerHTML = `
      <div class="shrink-0 px-4 flex items-center bg-amber-500 text-gray-950 font-extrabold text-xs"><i class="fa-solid fa-bullhorn mr-2"></i>INFO</div>
      <div class="flex-1 overflow-hidden py-2.5 text-xs md:text-sm text-amber-200 font-semibold"><div id="jm-track" class="jm-track"></div></div>`;

    const cards = document.createElement('section');
    cards.id = 'jm-cards';
    cards.className = 'w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-4 mb-6';

    header.after(ticker);
    ticker.after(cards);
  }

  function infaqJumatTerakhir() {
    const arr = DATA.infaq.filter(d => d.jenis === 'Masuk' && d.kategori === 'Infaq Jumat');
    if (!arr.length) return null;
    const last = arr.map(d => d.tanggal).sort().pop();
    return { tanggal: last, total: arr.filter(d => d.tanggal === last).reduce((a, d) => a + (Number(d.nominal) || 0), 0) };
  }

  function renderPengumuman() {
    const i = DATA.info || {};
    const ij = infaqJumatTerakhir();
    const items = [];
    if (i.kjKhatib || i.kjTema) items.push(`📢 Khutbah Jumat${i.kjTanggal ? ' ' + tglID(i.kjTanggal) : ''}: Khatib ${i.kjKhatib || '-'}${i.kjImam ? ', Imam ' + i.kjImam : ''}${i.kjTema ? ' — Tema: ' + i.kjTema : ''}`);
    if (i.papPemateri || i.papTema) items.push(`📖 Pengajian Ahad Pagi${i.papTanggal ? ' ' + tglID(i.papTanggal) : ''}: Pemateri ${i.papPemateri || '-'}${i.papTema ? ' — Tema: ' + i.papTema : ''}`);
    if (ij) items.push(`💰 Infaq Jumat (${tglID(ij.tanggal)}): ${rp(ij.total)}`);
    if (i.running) items.push('📣 ' + i.running);
    if (!items.length) items.push('Selamat datang di website Masjid Subardi Al-Huda Kuwon — Pusat Ibadah & Pemberdayaan Umat');

    const seg = `<div class="jm-seg">${items.map(t => `<span class="it">${esc(t)}</span>`).join('')}</div>`;
    const tr = $('jm-track');
    if (tr) {
      tr.innerHTML = seg + seg;
      const len = items.join('').length;
      tr.style.setProperty('--d', Math.max(25, Math.round(len / 5)) + 's');
    }

    const c = $('jm-cards');
    if (c) c.innerHTML = `
      <div class="glass gold-line rounded-3xl p-5 space-y-2">
        <h4 class="sec-title text-sm font-bold flex items-center gap-2"><i class="fa-solid fa-microphone-lines text-amber-400"></i> KHUTBAH JUMAT</h4>
        <p class="text-[11px] text-teal-300">${esc(tglID(i.kjTanggal)) || 'Jadwal belum diumumkan'}</p>
        <p class="text-xs text-gray-200"><strong class="text-amber-300">Khatib:</strong> ${esc(i.kjKhatib || '-')}</p>
        <p class="text-xs text-gray-200"><strong class="text-amber-300">Imam:</strong> ${esc(i.kjImam || '-')}</p>
        <p class="text-xs text-gray-200"><strong class="text-amber-300">Tema:</strong> ${esc(i.kjTema || '-')}</p>
      </div>
      <div class="glass gold-line rounded-3xl p-5 space-y-2">
        <h4 class="sec-title text-sm font-bold flex items-center gap-2"><i class="fa-solid fa-book-open-reader text-amber-400"></i> PENGAJIAN AHAD PAGI</h4>
        <p class="text-[11px] text-teal-300">${esc(tglID(i.papTanggal)) || 'Jadwal belum diumumkan'}</p>
        <p class="text-xs text-gray-200"><strong class="text-amber-300">Pemateri:</strong> ${esc(i.papPemateri || '-')}</p>
        <p class="text-xs text-gray-200"><strong class="text-amber-300">Tema:</strong> ${esc(i.papTema || '-')}</p>
      </div>
      <div class="glass gold-line rounded-3xl p-5 space-y-2">
        <h4 class="sec-title text-sm font-bold flex items-center gap-2"><i class="fa-solid fa-hand-holding-heart text-amber-400"></i> INFAQ JUMAT TERAKHIR</h4>
        <p class="text-[11px] text-teal-300">${ij ? esc(tglID(ij.tanggal)) : 'Belum ada data'}</p>
        <p class="text-2xl font-black text-emerald-300">${ij ? rp(ij.total) : '-'}</p>
        <button onclick="switchMasjidSubTab('infaq')" class="text-[11px] text-cyan-300 underline">Lihat rekap infaq lengkap →</button>
      </div>`;
  }

  /* ---------- Panel Rekap Infaq + Admin ---------- */
  function sisipkanMenuDanPanel() {
    if ($('m-sub-infaq')) return;
    if (typeof SUBTABS !== 'undefined') SUBTABS.push('infaq');

    // Kartu menu
    const grid = $('menu-grid');
    if (grid) {
      const m = document.createElement('div');
      m.id = 'btn-m-infaq';
      m.setAttribute('onclick', "switchMasjidSubTab('infaq')");
      m.className = 'menu-card cursor-pointer bg-teal-950/80 p-5 rounded-2xl border border-teal-700/60 hover:border-cyan-400 flex flex-col justify-between shadow-lg';
      m.innerHTML = `
        <div class="flex justify-between items-start mb-3">
          <div class="w-12 h-12 bg-emerald-900/70 border border-amber-500/30 text-amber-300 rounded-xl flex items-center justify-center text-xl"><i class="fa-solid fa-sack-dollar"></i></div>
          <span class="text-[10px] font-bold px-2.5 py-1 bg-teal-900/80 border border-amber-500/40 text-amber-300 rounded-full">MENU ADMIN</span>
        </div>
        <div><h4 class="text-sm font-extrabold text-amber-300 uppercase tracking-wide mb-1">REKAP INFAQ & ADMIN</h4>
        <p class="text-xs text-gray-300 leading-relaxed">Rekap infaq masuk & keluar (publik), login admin untuk input data dan pengumuman.</p></div>`;
      grid.appendChild(m);
    }

    const opt = a => a.map(x => `<option>${x}</option>`).join('');
    const panel = document.createElement('div');
    panel.id = 'm-sub-infaq';
    panel.className = 'hidden space-y-6';
    panel.innerHTML = `
    <div class="bg-teal-950/80 p-6 md:p-8 rounded-3xl border-2 border-amber-500/40 space-y-6 shadow-xl backdrop-blur-md">
      <div class="border-b border-teal-800/60 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div><h3 class="text-xl font-black text-amber-300"><i class="fa-solid fa-sack-dollar"></i> Rekap Infaq Masjid</h3>
        <p class="text-xs text-teal-400">Laporan pemasukan & pengeluaran infaq secara terbuka</p></div>
        <button id="jm-btn-login" class="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-gray-950 rounded-xl text-xs font-bold flex items-center gap-2"><i class="fa-solid fa-right-to-bracket"></i> Login Admin</button>
      </div>

      <div id="jm-login" class="hidden p-5 bg-teal-900/90 border border-amber-500/60 rounded-2xl space-y-3 max-w-md mx-auto">
        <h4 class="text-sm font-extrabold text-amber-300"><i class="fa-solid fa-lock"></i> Area Khusus Admin</h4>
        <input type="password" id="jm-pass" placeholder="Password admin" class="w-full bg-teal-950 border border-teal-700 rounded-xl px-3 py-2 text-xs text-gray-100 focus:outline-none focus:border-amber-400">
        <div class="flex items-center justify-between"><span id="jm-login-msg" class="text-[10px] text-amber-300 italic"></span>
        <button id="jm-do-login" class="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-gray-950 rounded-xl text-xs font-bold">Masuk</button></div>
      </div>

      <div id="jm-admin" class="hidden space-y-5">
        <div class="p-5 bg-emerald-950/80 border-2 border-emerald-500/50 rounded-2xl space-y-3">
          <div class="flex justify-between items-center border-b border-emerald-800 pb-2">
            <h4 class="text-sm font-extrabold text-emerald-300"><i class="fa-solid fa-pen-to-square"></i> Input Infaq Masuk / Keluar</h4>
            <button id="jm-logout" class="px-3 py-1 bg-rose-900/80 hover:bg-rose-800 text-rose-200 rounded-xl text-xs font-bold">Logout</button>
          </div>
          <form id="jm-form-infaq" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            <div><label class="block font-semibold text-gray-200 mb-1">Tanggal</label><input type="date" id="jm-tgl" required class="w-full bg-teal-900/60 border border-teal-700 rounded-xl px-3 py-2 text-gray-100"></div>
            <div><label class="block font-semibold text-gray-200 mb-1">Jenis</label><select id="jm-jenis" class="w-full bg-teal-900/60 border border-teal-700 rounded-xl px-3 py-2 text-gray-100"><option>Masuk</option><option>Keluar</option></select></div>
            <div><label class="block font-semibold text-gray-200 mb-1">Kategori</label><select id="jm-kat" class="w-full bg-teal-900/60 border border-teal-700 rounded-xl px-3 py-2 text-gray-100">${opt(KAT_MASUK)}</select></div>
            <div class="sm:col-span-2"><label class="block font-semibold text-gray-200 mb-1">Keterangan</label><input type="text" id="jm-ket" placeholder="Contoh: Infaq Jumat pekan 1" class="w-full bg-teal-900/60 border border-teal-700 rounded-xl px-3 py-2 text-gray-100"></div>
            <div><label class="block font-semibold text-amber-300 mb-1">Nominal (Rp)</label><input type="number" min="0" id="jm-nominal" required class="w-full bg-teal-900/60 border border-amber-500/50 rounded-xl px-3 py-2 text-amber-200"></div>
            <div class="sm:col-span-2 md:col-span-3 flex justify-end"><button id="jm-simpan" type="submit" class="px-5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-extrabold rounded-xl">Simpan</button></div>
          </form>
        </div>

        <div class="p-5 bg-amber-950/40 border-2 border-amber-500/50 rounded-2xl space-y-3">
          <h4 class="text-sm font-extrabold text-amber-300 border-b border-amber-800 pb-2"><i class="fa-solid fa-bullhorn"></i> Pengumuman (Khutbah Jumat, PAP & Teks Berjalan)</h4>
          <form id="jm-form-info" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div><label class="block font-semibold text-gray-200 mb-1">Tgl Khutbah Jumat</label><input type="date" id="jm-kjTanggal" class="w-full bg-teal-900/60 border border-teal-700 rounded-xl px-3 py-2 text-gray-100"></div>
            <div><label class="block font-semibold text-gray-200 mb-1">Khatib</label><input type="text" id="jm-kjKhatib" class="w-full bg-teal-900/60 border border-teal-700 rounded-xl px-3 py-2 text-gray-100"></div>
            <div><label class="block font-semibold text-gray-200 mb-1">Imam</label><input type="text" id="jm-kjImam" class="w-full bg-teal-900/60 border border-teal-700 rounded-xl px-3 py-2 text-gray-100"></div>
            <div><label class="block font-semibold text-gray-200 mb-1">Tema Khutbah</label><input type="text" id="jm-kjTema" class="w-full bg-teal-900/60 border border-teal-700 rounded-xl px-3 py-2 text-gray-100"></div>
            <div><label class="block font-semibold text-gray-200 mb-1">Tgl PAP (Ahad)</label><input type="date" id="jm-papTanggal" class="w-full bg-teal-900/60 border border-teal-700 rounded-xl px-3 py-2 text-gray-100"></div>
            <div><label class="block font-semibold text-gray-200 mb-1">Pemateri PAP</label><input type="text" id="jm-papPemateri" class="w-full bg-teal-900/60 border border-teal-700 rounded-xl px-3 py-2 text-gray-100"></div>
            <div class="sm:col-span-2"><label class="block font-semibold text-gray-200 mb-1">Tema PAP</label><input type="text" id="jm-papTema" class="w-full bg-teal-900/60 border border-teal-700 rounded-xl px-3 py-2 text-gray-100"></div>
            <div class="sm:col-span-2 md:col-span-4"><label class="block font-semibold text-gray-200 mb-1">Teks berjalan tambahan (bebas)</label><input type="text" id="jm-running" placeholder="Contoh: Kerja bakti Ahad depan bakda Subuh" class="w-full bg-teal-900/60 border border-teal-700 rounded-xl px-3 py-2 text-gray-100"></div>
            <div class="sm:col-span-2 md:col-span-4 flex justify-end"><button id="jm-simpan-info" type="submit" class="px-5 py-1.5 bg-amber-500 hover:bg-amber-400 text-gray-950 font-extrabold rounded-xl">Simpan Pengumuman</button></div>
          </form>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-3 text-center text-xs">
        <div class="p-3 bg-emerald-950/70 rounded-2xl border border-emerald-500/40"><span id="jm-sum-in" class="text-lg font-black text-emerald-300">-</span><span class="block text-[10px] text-gray-300">Total Masuk</span></div>
        <div class="p-3 bg-rose-950/50 rounded-2xl border border-rose-500/40"><span id="jm-sum-out" class="text-lg font-black text-rose-300">-</span><span class="block text-[10px] text-gray-300">Total Keluar</span></div>
        <div class="p-3 bg-amber-950/60 rounded-2xl border border-amber-500/40"><span id="jm-sum-saldo" class="text-lg font-black text-amber-300">-</span><span class="block text-[10px] text-gray-300">Saldo</span></div>
      </div>

      <div class="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
        <h4 class="text-sm font-extrabold text-cyan-300"><i class="fa-solid fa-list-check"></i> Rincian Transaksi</h4>
        <div class="flex gap-2 w-full sm:w-auto">
          <input type="month" id="jm-filter-bulan" class="bg-teal-900/50 border border-teal-700 rounded-xl px-3 py-1.5 text-xs text-gray-100">
          <select id="jm-filter-jenis" class="bg-teal-900/50 border border-teal-700 rounded-xl px-3 py-1.5 text-xs text-gray-100"><option value="">Semua</option><option>Masuk</option><option>Keluar</option></select>
          <button id="jm-reload" class="px-3 py-1.5 bg-teal-900/60 border border-teal-700 rounded-xl text-cyan-300 text-xs"><i class="fa-solid fa-rotate"></i></button>
        </div>
      </div>
      <div class="overflow-x-auto rounded-2xl border border-teal-700/50">
        <table class="w-full text-left border-collapse text-xs">
          <thead><tr class="bg-teal-900/80 text-cyan-300 border-b border-teal-700"><th class="p-3">Tanggal</th><th class="p-3">Jenis</th><th class="p-3">Kategori</th><th class="p-3">Keterangan</th><th class="p-3 text-right">Nominal</th><th class="p-3 text-center jm-aksi hidden">Aksi</th></tr></thead>
          <tbody id="jm-tbody" class="divide-y divide-teal-800/40 bg-teal-950/40 text-gray-200"></tbody>
        </table>
      </div>
    </div>`;
    document.querySelector('main').appendChild(panel);

    // Event
    $('jm-btn-login').onclick = () => { if (!PASS) $('jm-login').classList.toggle('hidden'); };
    $('jm-do-login').onclick = login;
    $('jm-pass').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
    $('jm-logout').onclick = logout;
    $('jm-reload').onclick = muat;
    $('jm-filter-bulan').onchange = renderTabel;
    $('jm-filter-jenis').onchange = renderTabel;
    $('jm-jenis').onchange = () => { $('jm-kat').innerHTML = opt($('jm-jenis').value === 'Masuk' ? KAT_MASUK : KAT_KELUAR); };
    $('jm-form-infaq').onsubmit = simpanInfaq;
    $('jm-form-info').onsubmit = simpanInfo;
    $('jm-tgl').value = new Date().toISOString().slice(0, 10);

    // Saat tab dibuka, muat ulang data
    const orig = window.switchMasjidSubTab;
    window.switchMasjidSubTab = function (t) { orig(t); if (t === 'infaq') muat(); };
  }

  /* ---------- Login / Logout ---------- */
  async function login() {
    const pw = $('jm-pass').value, msg = $('jm-login-msg');
    if (!pw) { msg.innerText = 'Isi password.'; return; }
    $('jm-do-login').disabled = true; msg.innerText = 'Memeriksa...';
    try {
      const j = await api({ action: 'login', password: pw });
      if (!j.ok) { msg.innerText = 'Password salah.'; return; }
      PASS = pw; $('jm-pass').value = ''; msg.innerText = '';
      $('jm-login').classList.add('hidden');
      $('jm-admin').classList.remove('hidden');
      $('jm-btn-login').innerHTML = '<i class="fa-solid fa-user-check"></i> Admin Aktif';
      document.querySelectorAll('.jm-aksi').forEach(e => e.classList.remove('hidden'));
      isiFormInfo(); isiFormCfg(); renderTabel();
    } catch (e) { msg.innerText = 'Gagal terhubung ke server.'; }
    finally { $('jm-do-login').disabled = false; }
  }
  function logout() {
    PASS = null;
    $('jm-admin').classList.add('hidden');
    $('jm-btn-login').innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Login Admin';
    document.querySelectorAll('.jm-aksi').forEach(e => e.classList.add('hidden'));
    renderTabel();
  }

  function isiFormInfo() {
    const i = DATA.info || {};
    INFO_KEYS.forEach(k => { const el = $('jm-' + k); if (el) el.value = i[k] || ''; });
  }

  /* ---------- Infaq: simpan / hapus ---------- */
  async function simpanInfaq(e) {
    e.preventDefault();
    if (!PASS) return alert('Silakan login admin dulu.');
    const item = { id: Date.now(), tanggal: $('jm-tgl').value, jenis: $('jm-jenis').value, kategori: $('jm-kat').value, keterangan: $('jm-ket').value.trim(), nominal: parseInt($('jm-nominal').value, 10) || 0 };
    const b = $('jm-simpan'); b.disabled = true; b.innerText = 'Menyimpan...';
    try {
      const j = await api({ action: 'addInfaq', password: PASS, data: item });
      if (!j.ok) throw new Error(j.error || 'Gagal');
      $('jm-ket').value = ''; $('jm-nominal').value = '';
      await muat();
    } catch (err) { alert('Gagal menyimpan: ' + err.message); }
    finally { b.disabled = false; b.innerText = 'Simpan'; }
  }

  async function hapusInfaq(id) {
    if (!PASS || !confirm('Hapus transaksi ini?')) return;
    try {
      const j = await api({ action: 'delInfaq', password: PASS, id });
      if (!j.ok) throw new Error(j.error || 'Gagal');
      await muat();
    } catch (err) { alert('Gagal menghapus: ' + err.message); }
  }
  window.jmHapus = hapusInfaq;

  /* ---------- Pengumuman: simpan ---------- */
  async function simpanInfo(e) {
    e.preventDefault();
    if (!PASS) return alert('Silakan login admin dulu.');
    // Pertahankan data lain (mis. pengaturan jadwal "cfg")
    const data = Object.assign({}, DATA.info);
    INFO_KEYS.forEach(k => { data[k] = $('jm-' + k).value.trim(); });
    const b = $('jm-simpan-info'); b.disabled = true; b.innerText = 'Menyimpan...';
    try {
      const j = await api({ action: 'saveInfo', password: PASS, data });
      if (!j.ok) throw new Error(j.error || 'Gagal');
      DATA.info = data; renderPengumuman();
      alert('Pengumuman berhasil disimpan!');
    } catch (err) { alert('Gagal menyimpan: ' + err.message); }
    finally { b.disabled = false; b.innerText = 'Simpan Pengumuman'; }
  }

  /* ---------- Tabel rekap ---------- */
  function renderTabel() {
    const tb = $('jm-tbody'); if (!tb) return;
    const bln = $('jm-filter-bulan').value, jn = $('jm-filter-jenis').value;
    const rows = DATA.infaq
      .filter(d => (!bln || String(d.tanggal).startsWith(bln)) && (!jn || d.jenis === jn))
      .sort((a, b) => String(b.tanggal).localeCompare(String(a.tanggal)));
    const masuk = rows.filter(d => d.jenis === 'Masuk').reduce((a, d) => a + (Number(d.nominal) || 0), 0);
    const keluar = rows.filter(d => d.jenis === 'Keluar').reduce((a, d) => a + (Number(d.nominal) || 0), 0);
    $('jm-sum-in').innerText = rp(masuk); $('jm-sum-out').innerText = rp(keluar); $('jm-sum-saldo').innerText = rp(masuk - keluar);
    if (!rows.length) { tb.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-gray-400">Belum ada data.</td></tr>'; return; }
    tb.innerHTML = rows.map(d => `<tr class="hover:bg-teal-900/30">
      <td class="p-3 text-gray-300 whitespace-nowrap">${esc(d.tanggal)}</td>
      <td class="p-3"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold border ${d.jenis === 'Masuk' ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40' : 'bg-rose-950 text-rose-300 border-rose-500/40'}">${esc(d.jenis)}</span></td>
      <td class="p-3 text-amber-300">${esc(d.kategori)}</td>
      <td class="p-3">${esc(d.keterangan)}</td>
      <td class="p-3 text-right font-bold ${d.jenis === 'Masuk' ? 'text-emerald-300' : 'text-rose-300'}">${rp(d.nominal)}</td>
      <td class="p-3 text-center jm-aksi ${PASS ? '' : 'hidden'}"><button onclick="jmHapus('${esc(d.id)}')" class="px-2 py-1 bg-rose-900/80 hover:bg-rose-800 text-rose-200 rounded-lg text-[10px] font-bold"><i class="fa-solid fa-trash"></i></button></td>
    </tr>`).join('');
  }

  /* ---------- Pengaturan jadwal salat (iqomah & ihtiyati) ---------- */
  const DEF = JSON.parse(JSON.stringify({ iq: CONFIG.IQOMAH_MENIT, sh: CONFIG.DURASI_SHALAT_MENIT, ih: CONFIG.IHTIYATI_MENIT }));
  let sigIh = JSON.stringify(DEF.ih);
  const SH5 = [['subuh','Subuh'],['dzuhur','Dzuhur'],['ashar','Ashar'],['maghrib','Maghrib'],['isya','Isya']];
  const SH6 = [['subuh','Subuh'],['syuruq','Terbit'],['dzuhur','Dzuhur'],['ashar','Ashar'],['maghrib','Maghrib'],['isya','Isya']];

  function terapkanCfg() {
    const c = (DATA.info || {}).cfg;
    const src = c || DEF;
    Object.assign(CONFIG.IQOMAH_MENIT, src.iq);
    Object.assign(CONFIG.DURASI_SHALAT_MENIT, src.sh);
    Object.assign(CONFIG.IHTIYATI_MENIT, src.ih);
    if (typeof renderLabelIqomah === 'function') renderLabelIqomah();
    const sig = JSON.stringify(CONFIG.IHTIYATI_MENIT);
    if (sig !== sigIh) { sigIh = sig; if (typeof fetchPrayerTimes === 'function') fetchPrayerTimes(); }
  }

  function sisipkanFormCfg() {
    const adm = $('jm-admin');
    if (!adm || $('jm-form-cfg')) return;
    const inp = (id, label) => `<div><label class="block font-semibold text-gray-200 mb-1">${label}</label><input type="number" step="0.5" id="${id}" class="w-full bg-teal-900/60 border border-teal-700 rounded-xl px-3 py-2 text-gray-100"></div>`;
    const box = document.createElement('div');
    box.className = 'p-5 bg-teal-900/50 border-2 border-cyan-500/50 rounded-2xl space-y-3';
    box.innerHTML = `
      <h4 class="text-sm font-extrabold text-cyan-300 border-b border-teal-700 pb-2"><i class="fa-solid fa-clock"></i> Pengaturan Jadwal Salat (Iqomah & Koreksi Adzan)</h4>
      <form id="jm-form-cfg" class="space-y-4 text-xs">
        <div><p class="font-bold text-amber-300 mb-2">Jeda iqomah setelah adzan (menit)</p>
          <div class="grid grid-cols-2 md:grid-cols-5 gap-3">${SH5.map(([k, n]) => inp('jm-iq-' + k, n)).join('')}</div></div>
        <div><p class="font-bold text-amber-300 mb-2">Lama layar "Salat Berlangsung" (menit)</p>
          <div class="grid grid-cols-2 md:grid-cols-5 gap-3">${SH5.map(([k, n]) => inp('jm-sh-' + k, n)).join('')}</div></div>
        <div><p class="font-bold text-amber-300 mb-1">Koreksi / Ihtiyati jam adzan (menit, boleh minus)</p>
          <p class="text-[10px] text-gray-400 mb-2">Ditambahkan ke jadwal dasar Kemenag. Contoh: Subuh 11 = jam adzan digeser 11 menit lebih lambat.</p>
          <div class="grid grid-cols-2 md:grid-cols-6 gap-3">${SH6.map(([k, n]) => inp('jm-ih-' + k, n)).join('')}</div></div>
        <div class="flex justify-end gap-2">
          <button type="button" id="jm-cfg-reset" class="px-4 py-1.5 bg-teal-800 hover:bg-teal-700 text-cyan-200 rounded-xl font-bold">Kembalikan Default</button>
          <button type="submit" id="jm-cfg-save" class="px-5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-extrabold rounded-xl">Simpan Pengaturan</button>
        </div>
      </form>`;
    adm.appendChild(box);
    $('jm-form-cfg').onsubmit = e => { e.preventDefault(); simpanCfg(false); };
    $('jm-cfg-reset').onclick = () => { if (confirm('Kembalikan semua ke nilai bawaan?')) simpanCfg(true); };
  }

  function isiFormCfg() {
    SH5.forEach(([k]) => {
      const a = $('jm-iq-' + k), b = $('jm-sh-' + k);
      if (a) a.value = CONFIG.IQOMAH_MENIT[k];
      if (b) b.value = CONFIG.DURASI_SHALAT_MENIT[k];
    });
    SH6.forEach(([k]) => { const c = $('jm-ih-' + k); if (c) c.value = CONFIG.IHTIYATI_MENIT[k]; });
  }

  async function simpanCfg(reset) {
    if (!PASS) return alert('Silakan login admin dulu.');
    const data = Object.assign({}, DATA.info);
    if (reset) { delete data.cfg; }
    else {
      const num = id => { const v = parseFloat($(id).value); return isNaN(v) ? 0 : v; };
      const cfg = { iq: {}, sh: {}, ih: {} };
      SH5.forEach(([k]) => { cfg.iq[k] = Math.max(0, num('jm-iq-' + k)); cfg.sh[k] = Math.max(0, num('jm-sh-' + k)); });
      SH6.forEach(([k]) => { cfg.ih[k] = num('jm-ih-' + k); });
      data.cfg = cfg;
    }
    const b = $('jm-cfg-save'); b.disabled = true; b.innerText = 'Menyimpan...';
    try {
      const j = await api({ action: 'saveInfo', password: PASS, data });
      if (!j.ok) throw new Error(j.error || 'Gagal');
      DATA.info = data; terapkanCfg(); isiFormCfg();
      alert('Pengaturan jadwal berhasil disimpan!');
    } catch (err) { alert('Gagal menyimpan: ' + err.message); }
    finally { b.disabled = false; b.innerText = 'Simpan Pengaturan'; }
  }

  /* ---------- Muat data dari server ---------- */
  async function muat() {
    try {
      const j = await (await fetch(ADMIN_URL + '?t=' + Date.now())).json();
      if (!j.ok) throw new Error(j.error);
      DATA = { infaq: j.infaq || [], info: j.info || {} };
      terapkanCfg();
      renderPengumuman(); renderTabel();
      if (PASS) { isiFormInfo(); isiFormCfg(); }
    } catch (e) {
      console.error('Gagal memuat data admin:', e);
      const tb = $('jm-tbody');
      if (tb) tb.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-amber-300">Gagal memuat data. Periksa ADMIN_URL & deploy (akses: Anyone).</td></tr>';
    }
  }

  /* ---------- Tombol Login Admin di header ---------- */
  function sisipkanTombolHeader() {
    const hb = document.querySelector('header .flex-wrap');
    if (!hb || $('jm-hdr-btn')) return;
    const b = document.createElement('button');
    b.id = 'jm-hdr-btn';
    b.className = 'px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md';
    b.innerHTML = '<i class="fa-solid fa-user-shield"></i> Login Admin';
    b.onclick = () => {
      switchMasjidSubTab('infaq');
      setTimeout(() => { if (!PASS) $('jm-login').classList.remove('hidden'); }, 400);
    };
    hb.appendChild(b);
  }

  /* ---------- Init ---------- */
  function init() {
    sisipkanTickerDanKartu();
    sisipkanMenuDanPanel();
    sisipkanFormCfg();
    sisipkanTombolHeader();
    renderPengumuman();
    muat();
    // Segarkan otomatis tiap 10 menit (layar TV masjid), kecuali saat admin sedang login
    setInterval(() => { if (!PASS) muat(); }, 600000);
  }
  if (document.readyState === 'complete') setTimeout(init, 0);
  else window.addEventListener('load', () => setTimeout(init, 0));
})();
