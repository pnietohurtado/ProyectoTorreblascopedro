export const INFANTA_LEONOR_SECTIONS = [
  {
    id: 'patio-b',
    name: 'Patio de Butacas Sector B',
    level: 'Patio de Butacas',
    sector: 'B',
    rows: 20,
    seatStart: 11,
    seatEnd: 20,
    capacity: 200,
    color: '#00a6a6',
    displayOrder: 2,
    assignmentOrder: 2,
  },
  {
    id: 'patio-a',
    name: 'Patio de Butacas Sector A',
    level: 'Patio de Butacas',
    sector: 'A',
    rows: 19,
    seatStart: 1,
    seatEnd: 10,
    capacity: 190,
    color: '#0037ff',
    displayOrder: 3,
    assignmentOrder: 1,
  },
  {
    id: 'patio-c',
    name: 'Patio de Butacas Sector C',
    level: 'Patio de Butacas',
    sector: 'C',
    rows: 20,
    seatStart: 21,
    seatEnd: 30,
    capacity: 200,
    color: '#ff5a1f',
    displayOrder: 1,
    assignmentOrder: 3,
  },
  {
    id: 'anfiteatro-b',
    name: 'Anfiteatro Sector B',
    level: 'Anfiteatro',
    sector: 'B',
    rows: 7,
    seatStart: 11,
    seatEnd: 20,
    capacity: 69,
    color: '#1c9fd1',
    displayOrder: 2,
    assignmentOrder: 5,
  },
  {
    id: 'anfiteatro-a',
    name: 'Anfiteatro Sector A',
    level: 'Anfiteatro',
    sector: 'A',
    rows: 6,
    seatStart: 1,
    seatEnd: 10,
    capacity: 60,
    color: '#0012c4',
    displayOrder: 3,
    assignmentOrder: 4,
  },
  {
    id: 'anfiteatro-c',
    name: 'Anfiteatro Sector C',
    level: 'Anfiteatro',
    sector: 'C',
    rows: 8,
    seatStart: 21,
    seatEnd: 30,
    capacity: 79,
    color: '#d43d12',
    displayOrder: 1,
    assignmentOrder: 6,
  },
  {
    id: 'pmr',
    name: 'Zona discapacitados',
    level: 'Patio de Butacas',
    sector: 'C',
    type: 'pmr',
    rows: 1,
    seatStart: null,
    seatEnd: null,
    capacity: 0,
    color: '#f6c343',
    assignmentOrder: 99,
  },
];

export const THEATER_TOTAL_CAPACITY = INFANTA_LEONOR_SECTIONS
  .filter((section) => section.type !== 'pmr')
  .reduce((total, section) => total + section.capacity, 0);

export const isPmrAccess = (value) => {
  const normalized = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

  return ['pmr', 'discapacidad', 'discapacitado', 'movilidad reducida', 'acceso adaptado'].includes(normalized);
};

export const getAccessTypeFromRow = (row) => (
  row.TipoAcceso ||
  row.tipoAcceso ||
  row.tipo_acceso ||
  row.Acceso ||
  row.acceso ||
  row.PMR ||
  row.pmr ||
  ''
);

export const getSeatId = (sectionId, row, number) => `${sectionId}-fila-${row}-asiento-${number}`;

const normalizeSectionAlias = (value) => {
  const normalized = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');

  const aliases = {
    'patio-a': 'patio-a',
    'patio-b': 'patio-b',
    'patio-c': 'patio-c',
    'patio-sector-a': 'patio-a',
    'patio-sector-b': 'patio-b',
    'patio-sector-c': 'patio-c',
    'patio-de-butacas-sector-a': 'patio-a',
    'patio-de-butacas-sector-b': 'patio-b',
    'patio-de-butacas-sector-c': 'patio-c',
    'anfiteatro-a': 'anfiteatro-a',
    'anfiteatro-b': 'anfiteatro-b',
    'anfiteatro-c': 'anfiteatro-c',
    'anfiteatro-sector-a': 'anfiteatro-a',
    'anfiteatro-sector-b': 'anfiteatro-b',
    'anfiteatro-sector-c': 'anfiteatro-c',
  };

  return aliases[normalized] || normalized;
};

const parseSeatNumbers = (value) => {
  const parts = String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
  return parts.flatMap((part) => {
    const rangeMatch = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (!rangeMatch) return Number.isFinite(Number(part)) ? [Number(part)] : [];

    const start = Number(rangeMatch[1]);
    const end = Number(rangeMatch[2]);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return [];

    const min = Math.min(start, end);
    const max = Math.max(start, end);
    return Array.from({ length: max - min + 1 }, (_, index) => min + index);
  });
};

export const parseReservedSeatsInput = (text, sections = INFANTA_LEONOR_SECTIONS) => {
  const validSections = new Map(sections.map((section) => [section.id, section]));
  const lines = String(text || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const reservedSeatIds = new Set();
  const invalidLines = [];

  lines.forEach((line) => {
    const cleanLine = line.replace(/[;:]/g, ' ');
    const parts = cleanLine.split(/\s+/).filter(Boolean);
    const [sectionAlias, rowValue, ...seatValues] = parts;
    const sectionId = normalizeSectionAlias(sectionAlias);
    const section = validSections.get(sectionId);
    const row = Number(rowValue);
    const seats = parseSeatNumbers(seatValues.join(','));

    if (!section || section.type === 'pmr' || !Number.isInteger(row) || row < 1 || row > section.rows || seats.length === 0) {
      invalidLines.push(line);
      return;
    }

    const validSeats = seats.filter((seat) => seat >= section.seatStart && seat <= section.seatEnd);
    if (validSeats.length === 0) {
      invalidLines.push(line);
      return;
    }

    validSeats.forEach((seat) => reservedSeatIds.add(getSeatId(section.id, row, seat)));
  });

  return {
    reservedSeatIds: Array.from(reservedSeatIds),
    invalidLines,
  };
};

export const formatSeat = (seat) => {
  if (!seat) return 'Sin asiento asignado';
  if (seat.type === 'pmr') return `${seat.level} - ${seat.name}`;
  return `${seat.level} - Sector ${seat.sector} | Fila ${seat.row} - Asiento ${seat.number}`;
};

export const getSeatMapFromSections = (sections = INFANTA_LEONOR_SECTIONS) => (
  sections
    .filter((section) => section.type !== 'pmr')
    .sort((a, b) => (a.assignmentOrder || 0) - (b.assignmentOrder || 0))
    .flatMap((section) => {
      const seats = [];
      for (let row = 1; row <= section.rows; row += 1) {
        for (let number = section.seatStart; number <= section.seatEnd; number += 1) {
          seats.push({
            id: getSeatId(section.id, row, number),
            sectionId: section.id,
            sectionName: section.name,
            level: section.level,
            sector: section.sector,
            row,
            number,
            type: 'seat',
          });
        }
      }
      return seats.slice(0, section.capacity);
    })
);

export const getPmrSeat = (sections = INFANTA_LEONOR_SECTIONS) => {
  const section = sections.find((item) => item.type === 'pmr') || INFANTA_LEONOR_SECTIONS.find((item) => item.type === 'pmr');
  return {
    id: 'pmr-access',
    sectionId: section.id,
    sectionName: section.name,
    level: section.level,
    sector: section.sector,
    name: section.name,
    type: 'pmr',
  };
};
