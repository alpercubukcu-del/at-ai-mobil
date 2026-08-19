/* AT AI Mobil — V11.12 GENERIC CLASS MATCH UI GUARD
   Sunucu tarafındaki V10.2.2 çift yönlü sınıf eşleştirmesini kullanır.
   Null skorlu atlar program numarasına göre model sırası gibi gösterilmez. */

const CLASS_MATCH_V1112 = 'GENERIC-CLASS-MATCH-V11.12';

const rankRaceForModelBeforeV1112 = rankRaceForModelV11;
rankRaceForModelV11 = function(raceData, modelId) {
  const ranking = rankRaceForModelBeforeV1112(raceData, modelId);
  // null = model karar skoru üretemedi.
  // Eski davranış null satırları at numarasına göre 1-2-3-4... sıralıyordu.
  // Bu bir model sıralaması değildir; artık yalnız gerçek skorlu satırlar döner.
  return (Array.isArray(ranking) ? ranking : []).filter(row => {
    if (row?.score === null || row?.score === undefined || row?.score === '') return false;
    return Number.isFinite(Number(row.score));
  });
};

console.info('[AT AI]', CLASS_MATCH_V1112, 'aktif');
