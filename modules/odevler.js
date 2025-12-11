    try {
        if (tur === 'GÜNLÜK') {
            const newDocRef = doc(collectionRef);
            batch.set(newDocRef, {
                tur: 'GÜNLÜK',
                title: title,
                aciklama: desc,
                link: link,
                baslangicTarihi: startDateStr,
                bitisTarihi: endDateStr,
                durum: 'devam',
                onayDurumu: 'bekliyor',
                kocId: currentUserIdGlobal,
                eklenmeTarihi: serverTimestamp()
            });
        } else if (tur === 'HAFTALIK') {
            let current = new Date(startDateStr);
            const end = new Date(endDateStr);
            let count = 0;

            while (current <= end) {
                if (current.getDay() === 0) { // Pazar
                    const deadlineStr = current.toISOString().split('T')[0];
                    const newDocRef = doc(collectionRef);
                    batch.set(newDocRef, {
                        tur: 'HAFTALIK',
                        title: `${title} (Hafta Sonu)`,
                        aciklama: desc,
                        link: link,
                        baslangicTarihi: startDateStr,
                        bitisTarihi: deadlineStr,
                        durum: 'devam',
                        onayDurumu: 'bekliyor',
                        kocId: currentUserIdGlobal,
                        eklenmeTarihi: serverTimestamp()
                    });
                    count++;
                }
                current.setDate(current.getDate() + 1);
            }

            if (count === 0) {
                const newDocRef = doc(collectionRef);
                batch.set(newDocRef, {
                    tur: 'HAFTALIK',
                    title: title,
                    aciklama: desc,
                    link: link,
                    baslangicTarihi: startDateStr,
                    bitisTarihi: endDateStr,
                    durum: 'devam',
                    onayDurumu: 'bekliyor',
                    kocId: currentUserIdGlobal,
                    eklenmeTarihi: serverTimestamp()
                });
            }
        }

        await batch.commit();

        // ✅ Yönlendirme YOK, sadece modalı kapat
        const modal = document.getElementById('addOdevModal');
        if (modal) modal.classList.add('hidden');

        // Takvim zaten startOdevListener + onSnapshot ile otomatik güncellenecek

    } catch (e) {
        console.error(e);
        alert("Kayıt hatası: " + e.message);
    } finally {
        btn.disabled = false;
        btn.textContent = "Kaydet";
    }
}
