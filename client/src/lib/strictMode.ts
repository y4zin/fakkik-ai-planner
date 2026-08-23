export function strictDurationFor(value: string) {
  const source = value.replace(/[٠-٩]/g, (item) => String("٠١٢٣٤٥٦٧٨٩".indexOf(item))).replace(/[۰-۹]/g, (item) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(item)));
  const number = source.match(/(\d+)/);
  if (!number) return null;
  const amount = Number(number[1]);
  if (/(?:يوم|أيام|day)/i.test(source)) return amount * 86_400;
  if (/(?:ساعة|ساعات|hour)/i.test(source)) return amount * 3600;
  if (/(?:ثانية|ثوان|second)/i.test(source)) return amount;
  if (/(?:دقيقة|دقائق|min)/i.test(source)) return amount * 60;
  return null;
}
