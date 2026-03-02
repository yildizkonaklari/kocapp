import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { openModalWithBackHistory, closeModalWithBackHistory } from './helpers.js';

export async function openReportModal(db, coachId, studentId, studentName) {
    const modalId = 'reportModal';
    const select = document.getElementById('reportMonthSelect');

    // Select kutusunu temizle ve son 3 ayı doldur
    select.innerHTML = '';
    const months = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
    const today = new Date();

    for (let i = 0; i < 6; i++) { // Son 6 aya kadar genişletildi
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const text = `${months[d.getMonth()]} ${d.getFullYear()}`;
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = text;
        select.appendChild(opt);
    }

    // Modal aç (Geri tuşu desteğiyle)
    openModalWithBackHistory(modalId);

    // İlk yükleme (Varsayılan seçili ay)
    await loadReportData(db, coachId, studentId, select.value);

    // Event Listener'lar (Tekrar eklenmesini önlemek için kontrol edilebilir ama modal yapısı statikse sorun olmaz)
    // Ancak her açılışta listener eklenmemesi için elementleri temizleyip yeniden atamak veya onclick kullanmak daha güvenli.

    select.onchange = () => loadReportData(db, coachId, studentId, select.value);

    const btnShare = document.getElementById('btnShareWhatsapp');
    btnShare.onclick = () => shareToWhatsapp(studentName, select.options[select.selectedIndex].text);

    // Kapatma butonu
    const closeBtn = document.querySelector(`#${modalId} .close-modal`) || document.querySelector(`#${modalId} button[onclick*="none"]`);
    if (closeBtn) {
        // Eski onclick attribute'unu kaldır
        closeBtn.removeAttribute('onclick');
        closeBtn.onclick = () => {
            window.history.back(); // History'den çıkararak kapat
        };
    }
}

async function loadReportData(db, coachId, studentId, yearMonth) {
    // UI Loading Durumu
    document.getElementById('repTotalQuestions').textContent = '...';
    document.getElementById('repHomeworkRate').textContent = '...';
    document.getElementById('repExamAvg').textContent = '...';
    document.getElementById('repAttendance').textContent = '...';

    // Tarih Aralığı
    const [year, month] = yearMonth.split('-');
    const startDate = `${year}-${month}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // Ayın son günü

    try {
        const [snapSoru, snapOdev, snapDeneme, snapSeans] = await Promise.all([
            getDocs(query(collection(db, "artifacts", "kocluk-sistemi", "users", coachId, "ogrencilerim", studentId, "soruTakibi"), where("tarih", ">=", startDate), where("tarih", "<=", endDate))),
            getDocs(query(collection(db, "artifacts", "kocluk-sistemi", "users", coachId, "ogrencilerim", studentId, "odevler"), where("bitisTarihi", ">=", startDate), where("bitisTarihi", "<=", endDate))),
            getDocs(query(collection(db, "artifacts", "kocluk-sistemi", "users", coachId, "ogrencilerim", studentId, "denemeler"), where("tarih", ">=", startDate), where("tarih", "<=", endDate))),
            getDocs(query(collection(db, "artifacts", "kocluk-sistemi", "users", coachId, "ajandam"), where("studentId", "==", studentId), where("tarih", ">=", startDate), where("tarih", "<=", endDate)))
        ]);

        // 1. Soru Sayısı
        let totalQuestions = 0;
        snapSoru.forEach(d => totalQuestions += (parseInt(d.data().adet) || 0));

        // 2. Ödev Başarısı
        let totalHw = 0, doneHw = 0;
        snapOdev.forEach(d => {
            totalHw++;
            if (d.data().durum === 'tamamlandi') doneHw++;
        });
        const hwRate = totalHw === 0 ? "%0" : `%${Math.round((doneHw / totalHw) * 100)}`;

        // 3. Deneme Ortalaması
        let totalNet = 0;
        snapDeneme.forEach(d => {
            if (d.data().analizHaric !== true) totalNet += (parseFloat(d.data().toplamNet) || 0);
        });
        const validExams = snapDeneme.docs.filter(d => d.data().analizHaric !== true).length;
        const examAvg = validExams === 0 ? "-" : (totalNet / validExams).toFixed(2) + " Net";

        // 4. Seans Katılımı
        let attended = 0;
        snapSeans.forEach(d => { if (d.data().durum === 'tamamlandi') attended++; });

        // UI Güncelle
        document.getElementById('repTotalQuestions').textContent = totalQuestions;
        document.getElementById('repHomeworkRate').textContent = hwRate;
        document.getElementById('repExamAvg').textContent = examAvg;
        document.getElementById('repAttendance').textContent = `${attended} Seans`;

    } catch (e) {
        console.error("Rapor verisi hatası:", e);
        alert("Veriler yüklenirken hata oluştu.");
    }
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
        `📚 *Ödev Başarısı:* ${h}\n` +
        `📈 *Deneme Ort:* ${e}\n` +
        `🎯 *Seans:* ${s}\n\n` +
        `💬 *Koç Notu:* ${comment ? comment : 'Başarılarının devamını dilerim.'}\n\n` +
        `🚀 *NetKoç Takip Sistemi*`;

    // Masaüstü ve Mobil ayrımı yapılabilir, şimdilik evrensel api
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
}