export const GST_ENGINE_VERSION = 'GST_ENGINE_V1.0';

export interface TerritoryConfig {
  code: string;
  name: string;
  isUnionTerritory: boolean;
  utgstApplicable: boolean;
}

/**
 * Master 2-Digit Indian State & Union Territory Codes with UTGST Flag configuration.
 * Official GST State Code List (01 to 38) + Export/Overseas Codes (96, 97, 99).
 */
export const GST_TERRITORIES: Record<string, TerritoryConfig> = {
  '01': { code: '01', name: 'Jammu & Kashmir', isUnionTerritory: true, utgstApplicable: false }, // UT with legislature
  '02': { code: '02', name: 'Himachal Pradesh', isUnionTerritory: false, utgstApplicable: false },
  '03': { code: '03', name: 'Punjab', isUnionTerritory: false, utgstApplicable: false },
  '04': { code: '04', name: 'Chandigarh', isUnionTerritory: true, utgstApplicable: true }, // UT without legislature
  '05': { code: '05', name: 'Uttarakhand', isUnionTerritory: false, utgstApplicable: false },
  '06': { code: '06', name: 'Haryana', isUnionTerritory: false, utgstApplicable: false },
  '07': { code: '07', name: 'Delhi', isUnionTerritory: true, utgstApplicable: false }, // NCT with legislature
  '08': { code: '08', name: 'Rajasthan', isUnionTerritory: false, utgstApplicable: false },
  '09': { code: '09', name: 'Uttar Pradesh', isUnionTerritory: false, utgstApplicable: false },
  '10': { code: '10', name: 'Bihar', isUnionTerritory: false, utgstApplicable: false },
  '11': { code: '11', name: 'Sikkim', isUnionTerritory: false, utgstApplicable: false },
  '12': { code: '12', name: 'Arunachal Pradesh', isUnionTerritory: false, utgstApplicable: false },
  '13': { code: '13', name: 'Nagaland', isUnionTerritory: false, utgstApplicable: false },
  '14': { code: '14', name: 'Manipur', isUnionTerritory: false, utgstApplicable: false },
  '15': { code: '15', name: 'Mizoram', isUnionTerritory: false, utgstApplicable: false },
  '16': { code: '16', name: 'Tripura', isUnionTerritory: false, utgstApplicable: false },
  '17': { code: '17', name: 'Meghalaya', isUnionTerritory: false, utgstApplicable: false },
  '18': { code: '18', name: 'Assam', isUnionTerritory: false, utgstApplicable: false },
  '19': { code: '19', name: 'West Bengal', isUnionTerritory: false, utgstApplicable: false },
  '20': { code: '20', name: 'Jharkhand', isUnionTerritory: false, utgstApplicable: false },
  '21': { code: '21', name: 'Odisha', isUnionTerritory: false, utgstApplicable: false },
  '22': { code: '22', name: 'Chhattisgarh', isUnionTerritory: false, utgstApplicable: false },
  '23': { code: '23', name: 'Madhya Pradesh', isUnionTerritory: false, utgstApplicable: false },
  '24': { code: '24', name: 'Gujarat', isUnionTerritory: false, utgstApplicable: false },
  '26': { code: '26', name: 'Dadra & Nagar Haveli and Daman & Diu', isUnionTerritory: true, utgstApplicable: true }, // UT without legislature
  '27': { code: '27', name: 'Maharashtra', isUnionTerritory: false, utgstApplicable: false },
  '29': { code: '29', name: 'Karnataka', isUnionTerritory: false, utgstApplicable: false },
  '30': { code: '30', name: 'Goa', isUnionTerritory: false, utgstApplicable: false },
  '31': { code: '31', name: 'Lakshadweep', isUnionTerritory: true, utgstApplicable: true }, // UT without legislature
  '32': { code: '32', name: 'Kerala', isUnionTerritory: false, utgstApplicable: false },
  '33': { code: '33', name: 'Tamil Nadu', isUnionTerritory: false, utgstApplicable: false },
  '34': { code: '34', name: 'Puducherry', isUnionTerritory: true, utgstApplicable: false }, // UT with legislature
  '35': { code: '35', name: 'Andaman & Nicobar Islands', isUnionTerritory: true, utgstApplicable: true }, // UT without legislature
  '36': { code: '36', name: 'Telangana', isUnionTerritory: false, utgstApplicable: false },
  '37': { code: '37', name: 'Andhra Pradesh', isUnionTerritory: false, utgstApplicable: false },
  '38': { code: '38', name: 'Ladakh', isUnionTerritory: true, utgstApplicable: true }, // UT without legislature
  '96': { code: '96', name: 'Foreign Country / Overseas', isUnionTerritory: false, utgstApplicable: false },
  '97': { code: '97', name: 'Other Territory', isUnionTerritory: false, utgstApplicable: false },
  '99': { code: '99', name: 'Center Jurisdiction / Export', isUnionTerritory: false, utgstApplicable: false },
};

export function isValidGstStateCode(code: string): boolean {
  const trimmed = code ? code.trim() : '';
  return Boolean(GST_TERRITORIES[trimmed]);
}

export function getTerritoryConfig(code: string): TerritoryConfig | undefined {
  const trimmed = code ? code.trim() : '';
  return GST_TERRITORIES[trimmed];
}
