const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
const persianDigits = "۰۱۲۳۴۵۶۷۸۹";

function normalizeDigits(value: string) {
  return value
    .replace(/[٠-٩]/g, (digit) => String(arabicDigits.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String(persianDigits.indexOf(digit)));
}

/** مدة آمنة لجلسة التركيز، من دقيقة إلى يوم واحد، تستخلص من وصف خطوة الخطة. */
export function durationSecondsFromPlanText(text: string) {
  const source = normalizeDigits(text);
  const seconds = source.match(/(\d+)\s*(?:ثانية|ثوان|second)/i);
  if (seconds) return Math.max(60, Math.min(Number(seconds[1]), 86_400));
  const minutes = source.match(/(\d+)\s*(?:دقيقة|دقائق|min)/i);
  if (minutes) return Math.max(60, Math.min(Number(minutes[1]) * 60, 86_400));
  const hours = source.match(/(\d+)\s*(?:ساعة|ساعات|hour)/i);
  return hours ? Math.max(60, Math.min(Number(hours[1]) * 3600, 86_400)) : 25 * 60;
}
