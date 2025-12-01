import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { formatDateTR } from './helpers.js';

export async function openReportModal(db, coachId, studentId, studentName) {
    const modal = document.getElementById('reportModal');
    const select = document.getElementById('reportMonthSelect');
    
    // Son 3 ayı doldur
    select.innerHTML = '';
    const months = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
    const today = new Date();
    
    for (let i = 0; i < 3; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const text = `${months[d.getMonth()]} ${d.getFullYear()}`;
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = text;
        select.appendChild(opt);
    }

    // Modal açıldığında varsayılan ay (bu ay) için verileri çek
    await loadReportData(db, coachId, studentId, select.value);

    // Ay değişince tekrar yükle
    select.onchange = () => loadReportData(db, coachId, studentId, select.value);

    // Whatsapp Paylaşımı
    document.getElementById('btnShareWhatsapp').onclick = () => shareToWhatsapp(studentName, select.options[select.selectedIndex].text);

    modal.style.display = 'flex';
}

async function loadReportData(db, coachId, studentId, yearMonth) {
    // Tarih Aralığı (Ayın başı ve sonu)
    const [year, month] = yearMonth.split('-');
    const startDate = `${year}-${month}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // Ayın son günü

    // --- SORGULAR ---
    const qSoru = query(collection(db, "artifacts", "kocluk-sistemi", "users", coachId, "ogrencilerim", studentId, "soruTakibi"), 
        where("tarih", ">=", startDate), where("tarih", "<=", endDate));
        
    const qOdev = query(collection(db, "artifacts", "kocluk-sistemi", "users", coachId, "ogrencilerim", studentId, "odevler"),
        where("bitisTarihi", ">=", startDate), where("bitisTarihi", "<=", endDate));
        
    const qDeneme = query(collection(db, "artifacts", "kocluk-sistemi", "users", coachId, "ogrencilerim", studentId, "denemeler"),
        where("tarih", ">=", startDate), where("tarih", "<=", endDate));
        
    const qSeans = query(collection(db, "artifacts", "kocluk-sistemi", "users", coachId, "ajandam"),
        where("studentId", "==", studentId), where("tarih", ">=", startDate), where("tarih", "<=", endDate));

    // Verileri Çek
    const [snapSoru, snapOdev, snapDeneme, snapSeans] = await Promise.all([
        getDocs(qSoru), getDocs(qOdev), getDocs(qDeneme), getDocs(qSeans)
    ]);

    // --- HESAPLAMALAR ---
    
    // 1. Soru Sayısı
    let totalQuestions = 0;
    snapSoru.forEach(d => totalQuestions += (parseInt(d.data().adet) || 0));

    // 2. Ödev Başarısı
    let totalHw = 0;
    let doneHw = 0;
    snapOdev.forEach(d => {
        totalHw++;
        if(d.data().durum === 'tamamlandi') doneHw++;
    });
    const hwRate = totalHw === 0 ? "Veri Yok" : `%${Math.round((doneHw/totalHw)*100)}`;

    // 3. Deneme Ortalaması
    let totalNet = 0;
    snapDeneme.forEach(d => totalNet += (parseFloat(d.data().toplamNet) || 0));
    const examAvg = snapDeneme.size === 0 ? "Veri Yok" : (totalNet / snapDeneme.size).toFixed(2) + " Net";

    // 4. Seans Katılımı
    let attended = 0;
    snapSeans.forEach(d => { if(d.data().durum === 'tamamlandi') attended++; });
    
    // --- UI GÜNCELLEME ---
    document.getElementById('repTotalQuestions').textContent = totalQuestions;
    document.getElementById('repHomeworkRate').textContent = hwRate;
    document.getElementById('repExamAvg').textContent = examAvg;
    document.getElementById('repAttendance').textContent = `${attended} Seans`;
}

function shareToWhatsapp(studentName, periodText) {
    const q = document.getElementById('repTotalQuestions').textContent;
    const h = document.getElementById('repHomeworkRate').textContent;
    const e = document.getElementById('repExamAvg').textContent;
    const s = document.getElementById('repAttendance').textContent;
    const comment = document.getElementById('reportCoachComment').value;

    const text = `📊 *Öğrenci Gelişim Raporu* 📊\n` +
                 `👤 Öğrenci: ${studentName}\n` +
                 `🗓️ Dönem: ${periodText}\n\n` +
                 `✅ *Çözülen Soru:* ${q}\n` +
                 `📚 *Ödev Tamamlama:* ${h}\n` +
                 `📈 *Deneme Ortalaması:* ${e}\n` +
                 `🎯 *Gerçekleşen Seans:* ${s}\n\n` +
                 `💬 *Koç Notu:* ${comment ? comment : 'Başarılarının devamını dilerim.'}\n\n` +
                 `🚀 *Koçluk Takip Sistemi*`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
}
