import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  EC_CODEWORDS_TABLE,
  DATA_CODEWORDS_TABLE,
  ALIGNMENT_POSITIONS,
  FORMAT_INFO_STRINGS,
  VERSION_INFO_STRINGS,
  ALPHANUMERIC_CHARSET,
  CHAR_COUNT_BITS,
  TOTAL_CODEWORDS,
} from '../src/tables.mjs';

describe('tables', () => {
  it('should have entries for versions 1-15', () => {
    for (let v = 1; v <= 15; v++) {
      assert.ok(EC_CODEWORDS_TABLE[v], `Missing EC table for version ${v}`);
      assert.ok(DATA_CODEWORDS_TABLE[v], `Missing data table for version ${v}`);
    }
  });

  it('should have alignment positions for versions 2-15', () => {
    assert.equal(ALIGNMENT_POSITIONS[1], undefined);
    assert.deepEqual(ALIGNMENT_POSITIONS[2], [6, 18]);
    assert.deepEqual(ALIGNMENT_POSITIONS[7], [6, 22, 38]);
  });

  it('should have 32 format info strings', () => {
    assert.equal(FORMAT_INFO_STRINGS.length, 32);
    assert.equal(FORMAT_INFO_STRINGS[0].length, 15);
  });

  it('should have version info for versions 7-15', () => {
    assert.equal(VERSION_INFO_STRINGS[7].length, 18);
    assert.equal(VERSION_INFO_STRINGS[6], undefined);
  });

  it('should have 45 alphanumeric chars', () => {
    assert.equal(Object.keys(ALPHANUMERIC_CHARSET).length, 45);
    assert.equal(ALPHANUMERIC_CHARSET['0'], 0);
    assert.equal(ALPHANUMERIC_CHARSET['A'], 10);
    assert.equal(ALPHANUMERIC_CHARSET[' '], 36);
  });

  it('should have correct char count bits', () => {
    assert.equal(CHAR_COUNT_BITS[1].numeric, 10);
    assert.equal(CHAR_COUNT_BITS[1].alphanumeric, 9);
    assert.equal(CHAR_COUNT_BITS[1].byte, 8);
    assert.equal(CHAR_COUNT_BITS[10].numeric, 12);
    assert.equal(CHAR_COUNT_BITS[10].alphanumeric, 11);
    assert.equal(CHAR_COUNT_BITS[10].byte, 16);
  });

  it('should have correct Version 1-L data capacity', () => {
    assert.equal(DATA_CODEWORDS_TABLE[1].L, 19);
  });

  it('should have correct EC codewords per block for Version 1-L', () => {
    assert.equal(EC_CODEWORDS_TABLE[1].L.ecPerBlock, 7);
    assert.equal(EC_CODEWORDS_TABLE[1].L.blocks.length, 1);
  });

  it('should have correct total codewords per version', () => {
    // Version N: total codewords = (4*N+17)^2 / 8 minus function pattern modules, approximately
    // Known values:
    assert.equal(TOTAL_CODEWORDS[1], 26);
    assert.equal(TOTAL_CODEWORDS[2], 44);
    assert.equal(TOTAL_CODEWORDS[10], 346);
  });

  it('should have data + EC = total codewords for each version/level', () => {
    for (let v = 1; v <= 15; v++) {
      for (const level of ['L', 'M', 'Q', 'H']) {
        const dataCount = DATA_CODEWORDS_TABLE[v][level];
        const ecInfo = EC_CODEWORDS_TABLE[v][level];
        let ecTotal = 0;
        for (const block of ecInfo.blocks) {
          ecTotal += block.count * ecInfo.ecPerBlock;
        }
        assert.equal(dataCount + ecTotal, TOTAL_CODEWORDS[v],
          `V${v}-${level}: data(${dataCount}) + ec(${ecTotal}) != total(${TOTAL_CODEWORDS[v]})`);
      }
    }
  });
});
