// tests/tool.test.ts
import { describe, it, expect } from 'vitest';
import { parseCSV, detectDelimiter, inferType, parseCSVLine, formatAsJSON } from '../src/tool';

describe('CSV to JSON Tool', () => {
  describe('detectDelimiter', () => {
    it('should detect comma delimiter', () => {
      const input = 'a,b,c\n1,2,3';
      expect(detectDelimiter(input)).toBe(',');
    });

    it('should detect tab delimiter', () => {
      const input = 'a\tb\tc\n1\t2\t3';
      expect(detectDelimiter(input)).toBe('\t');
    });

    it('should detect semicolon delimiter', () => {
      const input = 'a;b;c\n1;2;3';
      expect(detectDelimiter(input)).toBe(';');
    });

    it('should detect pipe delimiter', () => {
      const input = 'a|b|c\n1|2|3';
      expect(detectDelimiter(input)).toBe('|');
    });
  });

  describe('parseCSVLine', () => {
    it('should parse simple line', () => {
      expect(parseCSVLine('a,b,c', ',')).toEqual(['a', 'b', 'c']);
    });

    it('should handle quoted fields with commas', () => {
      expect(parseCSVLine('"a,b",c', ',')).toEqual(['a,b', 'c']);
    });

    it('should handle escaped quotes', () => {
      expect(parseCSVLine('"a""b",c', ',')).toEqual(['a"b', 'c']);
    });

    it('should handle empty fields', () => {
      expect(parseCSVLine('a,,c', ',')).toEqual(['a', '', 'c']);
    });
  });

  describe('inferType', () => {
    it('should infer integers', () => {
      expect(inferType('42')).toBe(42);
      expect(inferType('0')).toBe(0);
      expect(inferType('-10')).toBe(-10);
    });

    it('should infer floats', () => {
      expect(inferType('3.14')).toBe(3.14);
      expect(inferType('-2.5')).toBe(-2.5);
    });

    it('should infer booleans', () => {
      expect(inferType('true')).toBe(true);
      expect(inferType('false')).toBe(false);
      expect(inferType('TRUE')).toBe(true);
    });

    it('should infer null', () => {
      expect(inferType('null')).toBeNull();
      expect(inferType('NULL')).toBeNull();
    });

    it('should keep strings as strings', () => {
      expect(inferType('hello')).toBe('hello');
      expect(inferType('0123')).toBe('0123'); // leading zero
      expect(inferType('3.14.15')).toBe('3.14.15'); // not a valid number
    });
  });

  describe('parseCSV', () => {
    it('should parse CSV with header to objects', () => {
      const input = 'name,age,active\nJohn,30,true\nJane,25,false';
      const result = parseCSV(input, { outputFormat: 'objects' });

      expect(result.headers).toEqual(['name', 'age', 'active']);
      expect(result.rowCount).toBe(2);
      expect(result.outputFormat).toBe('objects');
      expect(result.data).toEqual([
        { name: 'John', age: 30, active: true },
        { name: 'Jane', age: 25, active: false }
      ]);
    });

    it('should parse CSV to 2D array', () => {
      const input = 'a,b,c\n1,2,3\n4,5,6';
      const result = parseCSV(input, { outputFormat: 'array' });

      expect(result.outputFormat).toBe('array');
      expect(result.data).toEqual([
        ['a', 'b', 'c'],
        [1, 2, 3],
        [4, 5, 6]
      ]);
    });

    it('should handle missing values as empty strings', () => {
      const input = 'a,b,c\n1,2,\n3,,';
      const result = parseCSV(input, { outputFormat: 'objects' });

      expect(result.data).toEqual([
        { a: 1, b: 2, c: '' },
        { a: 3, b: '', c: '' }
      ]);
    });

    it('should handle quoted fields with delimiters', () => {
      const input = 'name,description\n"Product A","Has, comma"\n"Product B","Has; semicolon"';
      const result = parseCSV(input, { outputFormat: 'objects' });

      expect(result.data).toEqual([
        { name: 'Product A', description: 'Has, comma' },
        { name: 'Product B', description: 'Has; semicolon' }
      ]);
    });

    it('should handle TSV input', () => {
      const input = 'col1\tcol2\nval1\tval2';
      const result = parseCSV(input, { outputFormat: 'objects' });

      expect(result.delimiter).toBe('\t');
      expect(result.data).toEqual([{ col1: 'val1', col2: 'val2' }]);
    });

    it('should handle empty input', () => {
      const result = parseCSV('', { outputFormat: 'objects' });
      expect(result.data).toEqual([]);
      expect(result.rowCount).toBe(0);
    });

    it('should handle input without header', () => {
      const input = '1,2,3\n4,5,6';
      const result = parseCSV(input, { outputFormat: 'objects', hasHeader: false });

      expect(result.headers).toEqual(['1', '2', '3']);
      expect(result.data).toEqual([
        { '1': 1, '2': 2, '3': 3 },
        { '1': 4, '2': 5, '3': 6 }
      ]);
    });
  });

  describe('formatAsJSON', () => {
    it('should format as pretty JSON', () => {
      const result = parseCSV('a,b\n1,2', { outputFormat: 'objects' });
      const json = formatAsJSON(result, true);
      expect(json).toBe('[\n  {\n    "a": 1,\n    "b": 2\n  }\n]');
    });

    it('should format as compact JSON', () => {
      const result = parseCSV('a,b\n1,2', { outputFormat: 'objects' });
      const json = formatAsJSON(result, false);
      expect(json).toBe('[{"a":1,"b":2}]');
    });
  });
});

