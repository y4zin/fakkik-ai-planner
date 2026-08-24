export function strictDurationFor(value: string) {
  const source = value.replace(/[٠-٩]/g, (item) => String("٠١٢٣٤٥٦٧٨٩".indexOf(item))).replace(/[۰-۹]/g, (item) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(item)));
  const number = source.match(/(\d+)/);
  const isYear = /(?:سنة|سنوات|عام|أعوام|year)/i.test(source);
  const amount = number ? Number(number[1]) : /(?:واحد|واحدة|one)/i.test(source) ? 1 : null;
  if (amount === null) return isYear ? 31_536_000 : null;
  if (isYear) return amount * 31_536_000;
  if (/(?:يوم|أيام|day)/i.test(source)) return amount * 86_400;
  if (/(?:ساعة|ساعات|hour)/i.test(source)) return amount * 3600;
  if (/(?:ثانية|ثوان|second)/i.test(source)) return amount;
  if (/(?:دقيقة|دقائق|min)/i.test(source)) return amount * 60;
  return null;
}
