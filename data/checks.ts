export interface Check {
  name: string;
  region: string;
  service: "Tesakan" | "Gorcnakan";
  branchId: string;
  serviceId: string;
  maxDate: number;
}

const MAX_DATE = new Date("2026-12-31").getTime();

export const regions = [
  { name: "Ashtarak", label: "Աշտարակ", branchId: "2046" },
  { name: "Ararat", label: "Արարատ", branchId: "2047" },
  { name: "Armavir", label: "Արմավիր", branchId: "2041" },
  { name: "Gyumri", label: "Գյումրի", branchId: "2042" },
  { name: "Goris", label: "Գորիս", branchId: "2040" },
  { name: "Yeghegnadzor", label: "Եղեգնաձոր", branchId: "2048" },
  { name: "Yerevan", label: "Երևան", branchId: "2036" },
  { name: "Ijevan", label: "Իջևան", branchId: "2044" },
  { name: "Kapan", label: "Կապան", branchId: "2039" },
  { name: "Kotayq", label: "Կոտայք", branchId: "2045" },
  { name: "Martuni", label: "Մարտունի", branchId: "2038" },
  { name: "Sevan", label: "Սևան", branchId: "2037" },
  { name: "Vanadzor", label: "Վանաձոր", branchId: "2043" },
] as const;

export const checks: Check[] = [];

for (const r of regions) {
  checks.push(
    { name: r.name + " - Tesakan", region: r.name, service: "Tesakan", branchId: r.branchId, serviceId: "300691", maxDate: MAX_DATE },
    { name: r.name + " - Gorcnakan", region: r.name, service: "Gorcnakan", branchId: r.branchId, serviceId: "300693", maxDate: MAX_DATE },
  );
}
