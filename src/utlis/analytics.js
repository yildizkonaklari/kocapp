// Öğrencinin son 5 denemesine göre hangi derste düşüş var analiz eder
export function analyzeProgress(tests) {
  if (!tests || tests.length < 2) return "Yeterli veri yok.";
  const sorted = [...tests].sort((a, b) => new Date(a.date) - new Date(b.date));

  const trend = sorted[sorted.length - 1].net - sorted[0].net;
  if (trend > 0) {
    return `Net artışı gözlemleniyor (+${trend.toFixed(1)} net). Tebrikler! 🎯`;
  } else if (trend < 0) {
    return `Son denemelerde net düşüşü (-${Math.abs(trend).toFixed(1)} net). Dikkat! 📉`;
  } else {
    return "Net performansı sabit. Daha fazla deneme ekleyin.";
  }
   }
