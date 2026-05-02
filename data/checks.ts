interface Check {
  name: string;
  branchId: string;
  serviceId: string;
  maxDate: number;
}
export const checks: Check[] = [
  // Աշտարակ
  { name: "Ashtarak - Tesakan", branchId: "2046", serviceId: "300691", maxDate: new Date("2026-12-31").getTime() },
  { name: "Ashtarak - Gorcnakan", branchId: "2046", serviceId: "300692", maxDate: new Date("2026-12-31").getTime() },

  // Արարատ
  { name: "Ararat - Tesakan", branchId: "2047", serviceId: "300691", maxDate: new Date("2026-12-31").getTime() },
  { name: "Ararat - Gorcnakan", branchId: "2047", serviceId: "300692", maxDate: new Date("2026-12-31").getTime() },

  // Արմավիր (Մեծամոր)
  { name: "Armavir - Tesakan", branchId: "2041", serviceId: "300691", maxDate: new Date("2026-12-31").getTime() },
  { name: "Armavir - Gorcnakan", branchId: "2041", serviceId: "300692", maxDate: new Date("2026-12-31").getTime() },

  // Գյումրի
  { name: "Gyumri - Tesakan", branchId: "2042", serviceId: "300691", maxDate: new Date("2026-12-31").getTime() },
  { name: "Gyumri - Gorcnakan", branchId: "2042", serviceId: "300692", maxDate: new Date("2026-12-31").getTime() },

  // Գորիս
  { name: "Goris - Tesakan", branchId: "2040", serviceId: "300691", maxDate: new Date("2026-12-31").getTime() },
  { name: "Goris - Gorcnakan", branchId: "2040", serviceId: "300692", maxDate: new Date("2026-12-31").getTime() },

  // Եղեգնաձոր
  { name: "Yeghegnadzor - Tesakan", branchId: "2048", serviceId: "300691", maxDate: new Date("2026-12-31").getTime() },
  { name: "Yeghegnadzor - Gorcnakan", branchId: "2048", serviceId: "300692", maxDate: new Date("2026-12-31").getTime() },

  // Երևան
  { name: "Yerevan - Tesakan", branchId: "2036", serviceId: "300691", maxDate: new Date("2026-12-31").getTime() },
  { name: "Yerevan - Gorcnakan", branchId: "2036", serviceId: "300692", maxDate: new Date("2026-12-31").getTime() },

  // Իջևան
  { name: "Ijevan - Tesakan", branchId: "2044", serviceId: "300691", maxDate: new Date("2026-12-31").getTime() },
  { name: "Ijevan - Gorcnakan", branchId: "2044", serviceId: "300692", maxDate: new Date("2026-12-31").getTime() },

  // Կապան
  { name: "Kapan - Tesakan", branchId: "2039", serviceId: "300691", maxDate: new Date("2026-12-31").getTime() },
  { name: "Kapan - Gorcnakan", branchId: "2039", serviceId: "300692", maxDate: new Date("2026-12-31").getTime() },

  // Կոտայք (Աբովյան/Նոր Գյուղ)
  { name: "Kotayq - Tesakan", branchId: "2045", serviceId: "300691", maxDate: new Date("2026-12-31").getTime() },
  { name: "Kotayq - Gorcnakan", branchId: "2045", serviceId: "300692", maxDate: new Date("2026-12-31").getTime() },

  // Մարտունի
  { name: "Martuni - Tesakan", branchId: "2038", serviceId: "300691", maxDate: new Date("2026-12-31").getTime() },
  { name: "Martuni - Gorcnakan", branchId: "2038", serviceId: "300692", maxDate: new Date("2026-12-31").getTime() },

  // Սևան
  { name: "Sevan - Tesakan", branchId: "2037", serviceId: "300691", maxDate: new Date("2026-12-31").getTime() },
  { name: "Sevan - Gorcnakan", branchId: "2037", serviceId: "300692", maxDate: new Date("2026-12-31").getTime() },

  // Վանաձոր
  { name: "Vanadzor - Tesakan", branchId: "2043", serviceId: "300691", maxDate: new Date("2026-12-31").getTime() },
  { name: "Vanadzor - Gorcnakan", branchId: "2043", serviceId: "300692", maxDate: new Date("2026-12-31").getTime() }
];