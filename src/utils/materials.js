// Material database
export const MATERIALS = {
  Concrete: {
    'United States': {
      '3000Psi': { fc: 20.68, E: 21538.1, density: 23.56, name: 'Concrete 3000 Psi' },
      '4000Psi': { fc: 27.58, E: 24855.58, density: 23.56, name: 'Concrete 4000 Psi' },
      '5000Psi': { fc: 34.47, E: 27788.93, density: 23.56, name: 'Concrete 5000 Psi' },
      '6000Psi': { fc: 41.37, E: 30452.63, density: 23.56, name: 'Concrete 6000 Psi' },
    },
    'Metric': {
      'C20': { fc: 20.0, E: 21019.04, density: 24.0, name: 'Concrete C20' },
      'C25': { fc: 25.0, E: 23500.0, density: 24.0, name: 'Concrete C25' },
      'C30': { fc: 30.0, E: 25742.96, density: 24.0, name: 'Concrete C30' },
      'C35': { fc: 35.0, E: 27806.24, density: 24.0, name: 'Concrete C35' },
    },
  },
  Steel: {
    'United States': {
      'A36': { fc: 250.0, E: 200000.0, density: 78.5, name: 'Steel A36' },
      'A572-50': { fc: 345.0, E: 200000.0, density: 78.5, name: 'Steel A572-50' },
      'A992': { fc: 345.0, E: 200000.0, density: 78.5, name: 'Steel A992' },
    },
    'Metric': {
      'S235': { fc: 235.0, E: 210000.0, density: 78.5, name: 'Steel S235' },
      'S275': { fc: 275.0, E: 210000.0, density: 78.5, name: 'Steel S275' },
      'S355': { fc: 355.0, E: 210000.0, density: 78.5, name: 'Steel S355' },
    },
  },
};

export function getLibraries(materialType) {
  return Object.keys(MATERIALS[materialType] || {});
}

export function getGrades(materialType, library) {
  return Object.keys((MATERIALS[materialType] || {})[library] || {});
}

export function getMaterialProps(materialType, library, grade) {
  return ((MATERIALS[materialType] || {})[library] || {})[grade] || null;
}

export function getMaterialLabel(materialType) {
  if (materialType === 'Concrete') return 'f\'c (MPa)';
  if (materialType === 'Steel') return 'Fy (MPa)';
  return 'Strength';
}
