import { formatDate, formatProjectDate } from '../date';

describe('formatDate', () => {
  describe('short format', () => {
    it('should format valid date string to yy/MM/dd', () => {
      const result = formatDate('2024-03-15');
      expect(result).toBe('24/03/15');
    });

    it('should format Date object to yy/MM/dd', () => {
      const date = new Date('2024-03-15');
      const result = formatDate(date);
      expect(result).toBe('24/03/15');
    });

    it('should pad month and day with zeros', () => {
      const result = formatDate('2024-01-05');
      expect(result).toBe('24/01/05');
    });
  });

  describe('full format', () => {
    it('should format valid date to yyyy/MM/dd', () => {
      const result = formatDate('2024-03-15', 'full');
      expect(result).toBe('2024/03/15');
    });

    it('should format Date object to yyyy/MM/dd', () => {
      const date = new Date('2024-12-25');
      const result = formatDate(date, 'full');
      expect(result).toBe('2024/12/25');
    });
  });

  describe('yearMonth format', () => {
    it('should format valid date to year-month format', () => {
      const result = formatDate('2024-03-15', 'yearMonth');
      expect(result).toContain('2024');
      expect(result).toContain('3');
    });

    it('should format Date object to year-month format', () => {
      const date = new Date('2024-12-25');
      const result = formatDate(date, 'yearMonth');
      expect(result).toContain('2024');
      expect(result).toContain('12');
    });
  });

  describe('edge cases', () => {
    it('should return "-" when null is passed', () => {
      const result = formatDate(null);
      expect(result).toBe('-');
    });

    it('should return "-" when undefined is passed', () => {
      const result = formatDate(undefined);
      expect(result).toBe('-');
    });

    it('should return "-" for invalid date string', () => {
      const result = formatDate('invalid-date');
      expect(result).toBe('-');
    });

    it('should return "-" for empty string', () => {
      const result = formatDate('');
      expect(result).toBe('-');
    });

    it('should return "-" for invalid Date object', () => {
      const invalidDate = new Date('invalid');
      const result = formatDate(invalidDate);
      expect(result).toBe('-');
    });
  });

  describe('boundary years', () => {
    it('should correctly format early 2000s dates', () => {
      const result = formatDate('2000-01-01', 'short');
      expect(result).toBe('00/01/01');
    });

    it('should correctly format 1999 dates', () => {
      const result = formatDate('1999-12-31', 'short');
      expect(result).toBe('99/12/31');
    });

    it('should correctly format year 2100 dates', () => {
      const result = formatDate('2100-06-15', 'full');
      expect(result).toBe('2100/06/15');
    });
  });
});

describe('formatProjectDate', () => {
  it('should format valid date string to year-month format', () => {
    const result = formatProjectDate('2024-03-15');
    expect(result).toContain('2024');
    expect(result).toContain('3');
  });

  it('should return current text when null is passed', () => {
    const result = formatProjectDate(null);
    expect(result).toContain('');
  });

  it('should correctly format multiple dates', () => {
    const result1 = formatProjectDate('2023-01-01');
    const result2 = formatProjectDate('2024-12-31');

    expect(result1).toContain('2023');
    expect(result1).toContain('1');

    expect(result2).toContain('2024');
    expect(result2).toContain('12');
  });
});
