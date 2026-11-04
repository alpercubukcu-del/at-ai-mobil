/**
 * TJK 39-alan arşiv sözleşmesi — yalnız doğrulama/normalleştirme.
 * Mevcut Klasik / FOGD / Son 800 motorlarını ve arşiv kayıtlarını değiştirmez.
 */
export const ORIGINAL_FIELDS = Object.freeze([
  'der','pno','kilo','ganyan','tarih','mes','ikramiye','yarrno','yas','kno',
  'hpu','hsi','gsi','hpo','ghpo','g2hpo','sno','atadi','akses','orjin',
  'jokey','jimi','sahip','antrenor','muddet','sehir','yaradi1','yaradi2',
  'yaradi3','pist','irk','pdurum','uyr','ci','yaradi4'
]);
export const AGF_FIELDS = Object.freeze(['agfs1','agfo1','agfs2','agfo2']);
export const ALL_FIELDS = Object.freeze([...ORIGINAL_FIELDS,...AGF_FIELDS]);

const blank = value => value === null || value === undefined ||
  (typeof value === 'string' && value.trim() === '');

function parseAgfNumber(value, field) {
  if (blank(value)) return null;
  const raw = typeof value === 'string' ? value.trim().replace(/%/g,'').replace(',','.') : value;
  const number = Number(raw);
  if (!Number.isFinite(number)) throw new TypeError(`${field}: sayısal değer gerekli`);
  if (field.startsWith('agfs') && (!Number.isInteger(number) || number < 1)) {
    throw new RangeError(`${field}: sıra pozitif tamsayı olmalı`);
  }
  if (field.startsWith('agfo') && (number < 0 || number > 100)) {
    throw new RangeError(`${field}: oran 0–100 arasında olmalı`);
  }
  return number;
}

/** Kaynaktan verilmemiş AGF2 alanlarını AGF1 ile doldurmaz. */
export function normalizeAgf(source = {}) {
  return Object.fromEntries(AGF_FIELDS.map(name => [name, parseAgfNumber(source[name], name)]));
}

/** Orijinal 35 sütun sırasını ve sonundaki dört AGF alanını korur. */
export function toCanonical39(source = {}) {
  const result = Object.fromEntries(ORIGINAL_FIELDS.map(name => [name,
    Object.prototype.hasOwnProperty.call(source,name) ? source[name] : null
  ]));
  return {...result, ...normalizeAgf(source)};
}

/** Geçersiz koşu/altılı eşleşmesini işaretler, var olan veriyi silmez. */
export function inspect39(row, {raceNo = null, secondSixStartRaceNo = null} = {}) {
  const errors = [], warnings = [];
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    return {ok:false,errors:['Satır nesne olmalı'],warnings};
  }
  for (const name of ALL_FIELDS) if (!Object.prototype.hasOwnProperty.call(row,name)) {
    errors.push(`Eksik sütun: ${name}`);
  }
  for (const [rank,rate] of [['agfs1','agfo1'],['agfs2','agfo2']]) {
    if (blank(row[rank]) !== blank(row[rate])) errors.push(`${rank}/${rate}: sıra ve oran birlikte bulunmalı`);
  }
  for (const name of AGF_FIELDS) {
    try { parseAgfNumber(row[name],name); }
    catch(error){errors.push(error.message);}
  }
  const hasAgf2 = !blank(row.agfs2) || !blank(row.agfo2);
  if (hasAgf2) {
    if (!Number.isInteger(secondSixStartRaceNo) || secondSixStartRaceNo < 1) {
      warnings.push('AGF2 var ancak gerçek ikinci altılı başlangıcı doğrulanmadı');
    } else if (!Number.isInteger(raceNo) || raceNo < 1) {
      errors.push('AGF2 için geçerli koşu numarası gerekli');
    } else if (raceNo < secondSixStartRaceNo) {
      errors.push('AGF2, gerçek ikinci altılı başlamadan önce bulunuyor');
    }
  }
  return {ok:errors.length===0,errors,warnings};
}
