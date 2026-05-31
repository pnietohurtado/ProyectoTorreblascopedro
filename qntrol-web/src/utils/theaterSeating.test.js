import { getSeatMapFromSections, INFANTA_LEONOR_SECTIONS } from './theaterSeating';

describe('Theater Seating Sector Order', () => {
  it('should order sections by assignmentOrder correctly', () => {
    const seatMap = getSeatMapFromSections();
    
    // Group seats by their sectionId in the order they appear
    const sectionOrder = [];
    seatMap.forEach((seat) => {
      if (!sectionOrder.includes(seat.sectionId)) {
        sectionOrder.push(seat.sectionId);
      }
    });

    // The expected order is: patio-a -> patio-b -> patio-c -> anfiteatro-a -> anfiteatro-b -> anfiteatro-c
    expect(sectionOrder).toEqual([
      'patio-a',
      'patio-b',
      'patio-c',
      'anfiteatro-a',
      'anfiteatro-b',
      'anfiteatro-c',
    ]);
  });
});
