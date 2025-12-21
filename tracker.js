import { money } from "./app.js";

export function mountTracker(){
  const form = document.querySelector("#trackerForm");

  const expenseRange = document.querySelector("#expenseRange");
  const expenseHidden = document.querySelector("#expenseHidden");
  const expenseLabel = document.querySelector("#expenseLabel");
  const expensePct = document.querySelector("#expensePct");
  const backdrop = document.querySelector("#resultBackdrop");
  const modalBody = document.querySelector("#modalBody");
  const modalClose = document.querySelector("#modalClose");

  function openModal(){
    backdrop.classList.remove("hidden");
    backdrop.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
  function closeModal(){
    backdrop.classList.add("hidden");
    backdrop.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  modalClose.addEventListener("click", closeModal);
  backdrop.addEventListener("click", (e)=>{ if(e.target === backdrop) closeModal(); });
  document.addEventListener("keydown", (e)=>{
    if(e.key === "Escape" && !backdrop.classList.contains("hidden")) closeModal();
  });

  function classify(sisa, ratioCicil){
    if (sisa <= 0) return {label:"Survival Mode", cls:"result-bad"};
    if (ratioCicil > 0.35) return {label:"Waspada", cls:"result-warn"};
    return {label:"Cukup Aman", cls:"result-good"};
  }

  function annuityPayment(principal, annualRate, years){
    const r = annualRate / 12;
    const n = years * 12;
    if (!Number.isFinite(principal) || principal <= 0) return 0;
    if (r <= 0) return principal / n;
    return principal * (r * Math.pow(1+r, n)) / (Math.pow(1+r, n) - 1);
  }

  function annuityMaxLoan(maxMonthly, annualRate, years){
    const r = annualRate / 12;
    const n = years * 12;
    if (!Number.isFinite(maxMonthly) || maxMonthly <= 0) return 0;
    if (r <= 0) return maxMonthly * n;
    return maxMonthly * (1 - Math.pow(1+r, -n)) / r;
  }

  function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }

  function calcInsurance(income, age, dependents){
    const cap = income * 0.10;
    let health = income * 0.03;
    let life = dependents > 0 ? income * 0.02 : 0;
    let critical = age >= 30 ? income * 0.01 : 0;
    const sum = health + life + critical;

    let total = sum;
    if (total > cap && sum > 0){
      const ratio = cap / sum;
      health *= ratio;
      life *= ratio;
      critical *= ratio;
      total = cap;
    }

    const types = [];
    types.push("Asuransi Kesehatan (prioritas utama)");
    if (dependents > 0) types.push("Asuransi Jiwa Berjangka (Term Life) untuk tanggungan");
    if (age >= 30) types.push("Asuransi Penyakit Kritis (opsional) sesuai kebutuhan");

    return { health, life, critical, total, types };
  }

  function syncExpenseSlider(){
    const income = Number(form.penghasilan.value || 0);
    const max = Math.max(0, income);
    expenseRange.max = String(max);

    const cur = clamp(Number(expenseRange.value || 0), 0, max);
    expenseRange.value = String(cur);
    expenseHidden.value = String(cur);

    expenseLabel.textContent = `Rp ${money(cur)}`;
    const pct = income > 0 ? Math.round((cur / income) * 100) : 0;
    expensePct.textContent = `${pct}%`;
  }

  form.penghasilan.addEventListener("input", ()=>{
    syncExpenseSlider();
  });

  expenseRange.addEventListener("input", ()=>{
    const v = Number(expenseRange.value || 0);
    expenseHidden.value = String(v);
    expenseLabel.textContent = `Rp ${money(v)}`;
    const income = Number(form.penghasilan.value || 0);
    const pct = income > 0 ? Math.round((v / income) * 100) : 0;
    expensePct.textContent = `${pct}%`;
  });

  syncExpenseSlider();

  function statusBox(statusLabel){
    if (statusLabel === "Survival Mode"){
      return { bg:"#fff1f2", border:"#fecdd3", text:"#9f1239", msg:"Kamu masih dalam Survival Mode (belum bebas finansial)" };
    }
    if (statusLabel === "Waspada"){
      return { bg:"#fffbeb", border:"#fde68a", text:"#92400e", msg:"Kondisimu cukup aman, tapi masih perlu dirapikan" };
    }
    return { bg:"#ecfdf3", border:"#bbf7d0", text:"#166534", msg:"Kamu sudah cukup aman (lebih tenang secara finansial)" };
  }

function getLevelKekayaan({ kas, utangTotal, expense }){
  if (expense > 0 && kas >= expense * 6) return { level: 4, label: "Punya Dana Darurat" };
  if (kas <= 0 && utangTotal > 0) return { level: 0, label: "Palit (Aset < Utang)" };
  if (utangTotal > kas) return { level: 1, label: "Terjerat utang (Utang > Kekayaan)" };
  if (expense > 0 && kas < expense) return { level: 3, label: "Gaji ke gaji" };
  return { level: 2, label: "Mulai stabil" };
}

function calcSkorKesehatan({ income, expense, cicilan, savingsRate, ratioCicil, monthsSafe }){
  let score = 50;
  score += Math.min(25, savingsRate * 0.6);
  if (ratioCicil <= 0.3) score += 15;
  else if (ratioCicil <= 0.4) score += 5;
  else score -= 10;
  if (monthsSafe >= 6) score += 10;
  else if (monthsSafe >= 3) score += 5;
  else score -= 5;
  const expRatio = income > 0 ? (expense/income) : 1;
  if (expRatio > 0.7) score -= 10;

  score = Math.round(Math.max(0, Math.min(100, score)));
  return score;
}

  
function buildSummaryHTML(data){
  const {
    status,
    income, expense, cicilan,
    sisa, savingsRate,
    tabungan, utangTotal,
    monthsSafe,
    kekayaanBersih,
    levelKekayaan,
    skor
  } = data;

  const box = statusBox(status.label);

  const note = (expense > 0)
    ? `Dengan kas/tabungan <b>Rp ${money(Math.round(tabungan))}</b> dan pengeluaran <b>Rp ${money(Math.round(expense))}/bulan</b>, kamu bisa bertahan sekitar <b>${monthsSafe} bulan</b> tanpa pemasukan.`
    : `Masukkan pengeluaran untuk menghitung “bisa hidup tanpa gaji”.`;

  const lunasHariIni = (tabungan >= utangTotal && utangTotal > 0);

  return `
    <div class="card soft">
      <h3 style="margin:0 0 12px">Profil Kekayaan Saat Ini</h3>

      <div class="grid-3">
        <div class="card soft" style="border:1px solid var(--border)">
          <div class="small" style="font-weight:800">Kekayaan Bersih</div>
          <div style="font-size:26px;font-weight:900;margin-top:8px">Rp ${money(Math.round(kekayaanBersih))}</div>
          <div class="small" style="margin-top:6px">Kas/Tabungan − Utang Total</div>
        </div>

        <div class="card soft" style="border:1px solid var(--border)">
          <div class="small" style="font-weight:800">Level Kekayaan</div>
          <div style="font-size:20px;font-weight:900;margin-top:8px">Level ${levelKekayaan.level}</div>
          <div class="small" style="margin-top:6px">${levelKekayaan.label}</div>
        </div>

        <div class="card soft" style="border:1px solid var(--border)">
          <div class="small" style="font-weight:800">Skor Kesehatan Finansial</div>
          <div style="font-size:34px;font-weight:900;margin-top:6px">${skor}</div>
          <div class="small" style="margin-top:6px">Skor sederhana (0–100)</div>
        </div>
      </div>

      <div class="grid-2 section" style="padding-top:12px">
        <div class="card soft" style="border:1px solid var(--border)">
          <div class="small" style="font-weight:800">Kas dan Tabungan</div>
          <div style="font-size:26px;font-weight:900;margin-top:8px">Rp ${money(Math.round(tabungan))}</div>
          <div class="small" style="margin-top:6px">Uang siap pakai (liquid)</div>
          <hr/>
          <div class="small"><b>Utang total:</b> Rp ${money(Math.round(utangTotal))}</div>
        </div>

        <div class="card soft" style="border:1px solid var(--border)">
          <div class="small" style="font-weight:800">Ringkasan Kondisi</div>

          <div style="
            margin-top:10px;
            padding:12px 14px;
            border-radius:14px;
            background:${box.bg};
            border:1px solid ${box.border};
            color:${box.text};
            font-weight:800;
          ">
            ${box.msg}
          </div>

          <div class="small" style="margin-top:12px"><b>Bisa hidup tanpa gaji?</b></div>
          <div style="font-size:26px;font-weight:900;margin-top:6px">${monthsSafe} bulan</div>

          <hr/>
          <div class="small"><b>Rencana pengeluaran/bulan:</b> Rp ${money(Math.round(expense))}</div>
          <div class="small" style="margin-top:6px"><b>Rencana nabung/bulan:</b> Rp ${money(Math.max(0, Math.round(sisa)))}</div>
          <div class="small" style="margin-top:6px"><b>Lunasi semua utang?</b> ${utangTotal === 0 ? "Tidak ada utang" : (lunasHariIni ? "bisa lunas hari ini" : "belum bisa lunas")}</div>
        </div>
      </div>

      <div class="card soft" style="border:1px solid var(--border); margin-top:12px">
        <div class="small" style="font-weight:800;margin-bottom:6px">Catatan</div>
        <div class="notice" style="margin:0">${note}</div>
      </div>

      <div class="btns" style="margin-top:12px">
        <button class="btn primary" id="btnDetail" type="button">Lihat Rekomendasi Lengkap</button>
        <button class="btn" id="btnClose1" type="button">Tutup</button>
      </div>

      <div class="notice small" style="margin-top:12px">
        *Simulasi edukasi (non-AI). Bukan nasihat finansial profesional.
      </div>
    </div>
  `;
}



  function buildDetailHTML(data){
    const {
      nama, status,
      income, expense, cicilan,
      sisa, ratioCicil,
      danaDaruratTarget, kurangDanaDarurat,
      siapKPR, kpr,
      insurance,
      tanggungan
    } = data;

    const reasons = [];
    if (kurangDanaDarurat > 0) reasons.push("dana darurat belum terpenuhi");
    if (ratioCicil > 0.3) reasons.push("rasio cicilan > 30%");
    if (sisa <= 0) reasons.push("sisa uang bulanan belum positif");
    if (kpr.maxKprMonthly < 500000) reasons.push("ruang cicilan KPR aman masih kecil");

    const kprAssume = `Asumsi: bunga efektif ${kpr.ratePct}%/tahun, DP ${kpr.dpPct}%.`;

    const kprHtml = siapKPR ? `
      <div class="card soft">
        <h4 style="margin:0 0 6px">Rekomendasi KPR</h4>
        <ul class="list" style="margin-top:8px">
          <li><b>Batas cicilan KPR aman/bulan:</b> Rp ${money(Math.round(kpr.maxKprMonthly))}</li>
          <li><b>Rekomendasi tenor:</b> ${kpr.recoYears} tahun</li>
          <li><b>Estimasi maksimal pinjaman:</b> Rp ${money(Math.round(kpr.maxLoan))}</li>
          <li><b>Estimasi harga rumah maksimal:</b> Rp ${money(Math.round(kpr.maxHousePrice))}</li>
        </ul>
        <p class="small" style="margin-top:8px">${kprAssume}</p>

        <div class="card soft" style="margin-top:10px">
          <b>Opsi tenor & estimasi cicilan (untuk pinjaman maksimal):</b>
          <ul class="list" style="margin-top:8px">
            ${kpr.options.map(o => `<li>${o.y} tahun → ≈ <b>Rp ${money(Math.round(o.pmt))}</b>/bulan</li>`).join("")}
          </ul>

          ${kpr.targetHousePrice > 0 ? `
            <hr/>
            <b>Kalau target harga rumah: Rp ${money(Math.round(kpr.targetHousePrice))}</b>
            <ul class="list" style="margin-top:8px">
              ${kpr.targetOptions.map(o => `<li>${o.y} tahun → ≈ <b>Rp ${money(Math.round(o.pmt))}</b>/bulan</li>`).join("")}
            </ul>
            <p class="small" style="margin-top:8px">Pinjaman diasumsikan ${100-kpr.dpPct}% dari harga rumah.</p>
          ` : ``}
        </div>
      </div>
    ` : `
      <div class="card soft">
        <h4 style="margin:0 0 6px">KPR</h4>
        <p style="margin:0">⚠️ Saat ini kamu <b>belum ideal</b> untuk KPR (simulasi sederhana).</p>
        <ul class="list" style="margin-top:8px">
          <li>Batas cicilan KPR aman/bulan kamu: <b>Rp ${money(Math.round(kpr.maxKprMonthly))}</b></li>
          <li>Utamakan: dana darurat + rasio cicilan aman + sisa menabung</li>
        </ul>
        ${reasons.length ? `<p class="small" style="margin-top:8px"><b>Catatan:</b> ${reasons.join(", ")}.</p>` : ``}
        <p class="small" style="margin-top:8px">${kprAssume}</p>
      </div>
    `;

    const insHtml = `
      <div class="card soft">
        <h4 style="margin:0 0 6px">Rekomendasi Asuransi</h4>
        <p class="small" style="margin:0">Berdasarkan umur & tanggungan (<b>${tanggungan}</b>).</p>
        <ul class="list" style="margin-top:8px">
          ${insurance.types.map(t => `<li>${t}</li>`).join("")}
        </ul>

        <div class="notice small" style="margin-top:10px">Estimasi premi/bulan (rule-based, maks 10% penghasilan)</div>
        <ul class="list" style="margin-top:8px">
          <li>Kesehatan ≈ <b>Rp ${money(Math.round(insurance.health))}</b>/bulan</li>
          ${tanggungan > 0 ? `<li>Jiwa berjangka ≈ <b>Rp ${money(Math.round(insurance.life))}</b>/bulan</li>` : ``}
          ${insurance.critical > 0 ? `<li>Penyakit kritis (opsional) ≈ <b>Rp ${money(Math.round(insurance.critical))}</b>/bulan</li>` : ``}
          <li><b>Total</b> ≈ <b>Rp ${money(Math.round(insurance.total))}</b>/bulan</li>
        </ul>
      </div>
    `;

    const expRatio = income > 0 ? expense/income : 0;
    let budgetingTip = "Pengeluaran sudah cukup terkendali. Tinggal konsisten dan jaga kebiasaan menabung.";
    if (expRatio > 0.60) budgetingTip = "Pengeluaranmu cenderung tinggi. Coba potong biaya rutin agar ruang tabungan bertambah.";
    if (expRatio < 0.35 && sisa > 0) budgetingTip = "Bagus! Kamu punya ruang besar untuk mempercepat dana darurat / tujuan lain.";

    return `
      <div class="card ${status.cls}">
        <h3 style="margin:0 0 6px">Rekomendasi Lengkap</h3>
        <p style="margin:0">Halo <b>${nama}</b>. Status: <b>${status.label}</b></p>
      </div>

      <div class="grid-2 section" style="padding-top:12px">
        <div class="card soft">
          <h4 style="margin:0 0 6px">Dana Darurat</h4>
          <ul class="list" style="margin-top:8px">
            <li>Target (6× pengeluaran): <b>Rp ${money(Math.round(danaDaruratTarget))}</b></li>
            <li>Kekurangan: <b>Rp ${money(Math.round(kurangDanaDarurat))}</b></li>
          </ul>
          <p class="small" style="margin-top:8px">Prioritaskan dana darurat sebelum target besar lainnya.</p>
        </div>

        ${kprHtml}
      </div>

      <div class="grid-2 section">
        ${insHtml}

        <div class="card soft">
          <h4 style="margin:0 0 6px">Rekomendasi Lainnya</h4>
          <ul class="list" style="margin:0">
            <li><b>Budgeting:</b> ${budgetingTip}</li>
            <li><b>Target menabung:</b> 10–20% penghasilan (jika memungkinkan)</li>
            <li><b>Langkah awal warisan:</b> catat aset & utang, simpan dokumen penting, dan diskusikan rencana dengan keluarga.</li>
          </ul>
        </div>
      </div>

      <div class="btns" style="margin-top:12px">
        <button class="btn" id="btnBack" type="button">← Kembali ke Hasil</button>
        <a class="btn" href="course.html">Buka Course</a>
        <button class="btn primary" id="btnClose2" type="button">Tutup</button>
      </div>

      <div class="notice small" style="margin-top:12px">
        *Simulasi edukasi (non-AI). Bukan nasihat finansial profesional.
      </div>
    `;
  }

  function wireSummary(data){
    modalBody.innerHTML = buildSummaryHTML(data);
    modalBody.querySelector("#btnDetail").addEventListener("click", ()=> wireDetail(data));
    modalBody.querySelector("#btnClose1").addEventListener("click", closeModal);
  }

  function wireDetail(data){
    modalBody.innerHTML = buildDetailHTML(data);
    modalBody.querySelector("#btnBack").addEventListener("click", ()=> wireSummary(data));
    modalBody.querySelector("#btnClose2").addEventListener("click", closeModal);
  }

  form.addEventListener("submit", (e)=>{
    e.preventDefault();

    const nama = form.nama.value.trim() || "Kamu";
    const umur = Number(form.umur.value);
    const tanggungan = Number(form.tanggungan?.value || 0);

    const income = Number(form.penghasilan.value);
    const expense = Number(form.pengeluaran.value);
    const cicilan = Number(form.cicilan.value);
    const tabungan = Number(form.tabungan.value || 0);
    const utangTotal = Number(form.utangTotal?.value || 0);
    const statusRumah = form.rumah.value;
    const hargaRumah = Number(form.hargaRumah?.value || 0);

    const sisa = income - expense - cicilan;
    const ratioCicil = income > 0 ? (cicilan / income) : 0;

    const danaDaruratTarget = expense * 6;
    const kurangDanaDarurat = Math.max(0, danaDaruratTarget - tabungan);

    const savingsRate = income > 0 ? Math.round((Math.max(0, sisa)/income)*100) : 0;


    const monthsSafe = (expense > 0) ? Math.max(0, Math.round((tabungan/expense) * 10) / 10) : 0;

const kekayaanBersih = tabungan - utangTotal;

const levelKekayaan = getLevelKekayaan({
  kas: tabungan,
  utangTotal,
  expense
});

const skor = calcSkorKesehatan({
  income, expense, cicilan,
  savingsRate,
  ratioCicil,
  monthsSafe
});

    
    const maxKprMonthly = Math.max(0, (0.30 * income) - cicilan);

    const maxYearsByAge = clamp(55 - umur, 5, 25);
    const candidates = [10,15,20,25].filter(y => y <= maxYearsByAge);
    const recoYears = candidates.length ? candidates[candidates.length-1] : 10;

    const annualRate = 0.09;
    const dpPct = 20;
    const dpRate = dpPct/100;

    const maxLoan = annuityMaxLoan(maxKprMonthly, annualRate, recoYears);
    const maxHousePrice = dpRate < 1 ? (maxLoan / (1 - dpRate)) : maxLoan;

    const optionsYears = candidates.length ? candidates : [10,15,20];
    const options = optionsYears.map(y => ({ y, pmt: annuityPayment(maxLoan, annualRate, y) }));

    const targetLoan = hargaRumah > 0 ? (hargaRumah * (1 - dpRate)) : 0;
    const targetOptions = hargaRumah > 0 ? optionsYears.map(y => ({ y, pmt: annuityPayment(targetLoan, annualRate, y) })) : [];

    const siapKPR =
      (umur >= 21) &&
      (sisa > income * 0.2) &&
      (kurangDanaDarurat === 0) &&
      (ratioCicil <= 0.3) &&
      (statusRumah === "belum") &&
      (maxKprMonthly >= 500000);

    const kpr = {
      maxKprMonthly, recoYears,
      ratePct: Math.round(annualRate*100),
      dpPct,
      maxLoan, maxHousePrice,
      options,
      targetHousePrice: hargaRumah,
      targetOptions
    };

    const insurance = calcInsurance(income, umur, tanggungan);

    const status = classify(sisa, ratioCicil);


    let noteText = `Saat ini tabungan kamu <b>Rp ${money(Math.round(tabungan))}</b>. Dengan pengeluaran <b>Rp ${money(Math.round(expense))}/bulan</b>, kamu punya “waktu aman” sekitar <b>~${monthsSafe} bulan</b> tanpa pemasukan.`;
    if (kurangDanaDarurat > 0){
      noteText += ` Target dana darurat kamu <b>Rp ${money(Math.round(danaDaruratTarget))}</b>, jadi masih kurang <b>Rp ${money(Math.round(kurangDanaDarurat))}</b>.`;
    } else {
      noteText += ` Dana darurat 6× pengeluaran kamu sudah <b>terpenuhi</b>.`;
    }

    const data = {
      nama, umur, tanggungan,
      status,
      income, expense, cicilan,
      sisa, ratioCicil,
      savingsRate,
      tabungan,
      monthsSafe,
      danaDaruratTarget, kurangDanaDarurat,
      siapKPR, kpr,
      insurance,
      noteText,
      tabungan,
      utangTotal,
      kekayaanBersih,
      levelKekayaan,
      skor
    };

    wireSummary(data);
    openModal();
  });
}
