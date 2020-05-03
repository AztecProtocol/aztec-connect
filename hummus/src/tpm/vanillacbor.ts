/*
 * vanilla CBOR decoder / encoder
 * https://github.com/herrjemand/vanillaCBOR
 *
 * Copyright (c) 2018 Yuriy Ackermann <ackermann.yuriy@gmail.com>
 * Licensed under the MIT license.
 */

enum tags {
  'UNSIGNED_INT' = 0,
  'NEGATIVE_INT',
  'BYTE_STRING',
  'TEXT_STRING',
  'ARRAY',
  'MAP',
  'OTHER_SEM',
  'FLOAT_AND_NO_CONTENT',
}

enum float_and_no_content_semantics {
  'FALSE' = 20,
  'TRUE',
  'NULL',
  'UNDEFINED',
  'SIMPLE_CONT', // Simple value (value 32..255 in following byte)
  'FLOAT_16', // IEEE 754 Half-Precision Float (16 bits follow)
  'FLOAT_32', // IEEE 754 Single-Precision Float (32 bits follow)
  'FLOAT_64', // IEEE 754 Double-Precision Float (64 bits follow)
  'INFINITY_BREAK' = 31,
}

var type = (obj: any) => {
  return {}.toString
    .call(obj)
    .replace(/\[|\]/g, '')
    .split(' ')[1];
};

const enforceUint8Array = (buffer: any) => {
  let bufferType = type(buffer);
  if (
    bufferType != 'Uint8Array' &&
    bufferType != 'Uint16Array' &&
    bufferType != 'Uint32Array' &&
    bufferType != 'ArrayBuffer'
  )
    throw new TypeError('Only BufferSource is allowed!');

  if (bufferType == 'ArrayBuffer') {
    return new Uint8Array(buffer.slice());
  } else {
    return new Uint8Array(buffer.buffer.slice());
  }
};

const mergeTwoBuffers = function(buffer1: Uint8Array, buffer2: Uint8Array) {
  buffer1 = enforceBigEndian(enforceUint8Array(buffer1));
  buffer2 = enforceBigEndian(enforceUint8Array(buffer2));

  let totalLength = buffer1.length + buffer2.length;

  let mergedBuffers = new Uint8Array(totalLength);
  mergedBuffers.set(buffer1);
  mergedBuffers.set(buffer2, buffer1.length);

  return mergedBuffers;
};

const isEndianBig = () => {
  let buff = new ArrayBuffer(2);
  let u8 = new Uint8Array(buff);
  let u16 = new Uint16Array(buff);
  u8[0] = 0xcc;
  u8[1] = 0xdd;

  if (u16[0] !== 0xddcc) return false;

  return true;
};

const enforceBigEndian = (buffer: Uint8Array) => {
  if (isEndianBig()) buffer = buffer.reverse();

  return buffer;
};

const readBE81632 = (buffer: any) => {
  if (typeof Buffer === 'undefined') buffer = enforceUint8Array(buffer);

  buffer = enforceBigEndian(buffer);

  if (buffer.length !== 1 && buffer.length !== 2 && buffer.length !== 4)
    throw new Error('Only 2/4/16 byte buffers are allowed!');

  buffer = new Uint8Array(Array.from(buffer));
  if (buffer.length === 1) return buffer[0];
  else if (buffer.length === 2) return new Uint16Array(buffer.buffer)[0];
  else return new Uint32Array(buffer.buffer)[0];
};

interface TLV {
  TAG: string;
  LEN: number;
  VAL: any;
  TLVTOTALLEN: number;
  TLLEN: number;
}

const getTLVForNext = (buffer: Uint8Array): TLV => {
  let lennum = buffer[0] - (buffer[0] & 32) - (buffer[0] & 64) - (buffer[0] & 128);
  let tagnum = (buffer[0] - lennum) >> 5;
  let VAL = undefined;
  let TAG = tags[tagnum];

  let LEN = 0;
  let TLLEN = 1;

  if (lennum < 24) {
    VAL = lennum;
  } else {
    VAL = buffer.slice(1);
    if (lennum === 24) {
      // 1 byte len
      LEN = readBE81632(VAL.slice(0, 1));
      VAL = VAL.slice(1);
      TLLEN += 1;
    } else if (lennum === 25) {
      // 2 byte len
      LEN = readBE81632(VAL.slice(0, 2));
      VAL = VAL.slice(2);
      TLLEN += 2;
    } else if (lennum === 26) {
      // 4 byte len
      LEN = readBE81632(VAL.slice(0, 4));
      VAL = VAL.slice(4);
      TLLEN += 4;
    } else if (lennum === 26) {
      // 8 byte len
      throw new Error('UNABLE TO READ 8 BYTE LENGTHS');
    } else if (lennum === 31) {
      // indefinite length
      VAL = VAL;
      LEN = Infinity;
    } else {
      throw new Error(`Found a length of ${lennum}. Length values 28-30(0x1C-0x1E) are reserved!`);
    }

    if (LEN !== Infinity) VAL = VAL.slice(0, LEN);
  }

  let TLVTOTALLEN = TLLEN + LEN;
  return { TAG, LEN, VAL, TLVTOTALLEN, TLLEN };
};

const bufferToString = (buffer: Buffer) => {
  if (typeof Buffer !== 'undefined')
    //NodeJS decoding
    return buffer.toString('utf8');

  return new TextDecoder('UTF-8').decode(buffer);
};

const removeTagValue = (num: number) => {
  return num - (num & 32) - (num & 64) - (num & 128);
};

const bufferToHex = (buffer: Uint8Array) => {
  return Array.from(buffer)
    .map(num => {
      if (num < 16) return '0' + num.toString(16);

      return num.toString(16);
    })
    .join('');
};

const arrayPairsToMap = (seq: any) => {
  let finalMap: { [key: string]: any } = {};
  let isKey = true;
  let keyVal = '';
  for (let member of seq) {
    if (isKey) keyVal = member;
    else finalMap[keyVal] = member;

    isKey = !isKey;
  }

  return finalMap;
};

const findLegthOfIndefiniteLengthBuffer = (buffer: Uint8Array) => {
  for (let i = 0; i < buffer.length; i++) {
    if (buffer[i] === 0xff) return i + 1;
  }
  return 0;
};

export const decode = (buffer: any, expectedLength: number) => {
  buffer = Array.from(buffer);

  let results: any = [];
  let bLength = 0;
  let workbuffer = buffer.slice();

  for (let i = 0; i < buffer.length; i++) {
    let tlv = getTLVForNext(workbuffer);

    let result = undefined;
    switch (tlv.TAG) {
      case 'UNSIGNED_INT':
        if (tlv.TLLEN === 1) result = tlv.VAL;
        else if (tlv.TLLEN <= 5) result = readBE81632(workbuffer.slice(1, tlv.TLLEN));
        else throw new Error('Ints over 4 bytes are not supported at this moment!');

        results.push(result);
        i += tlv.TLLEN - 1;
        break;
      case 'NEGATIVE_INT':
        if (tlv.TLLEN === 1) result = -(1 + tlv.VAL);
        else if (tlv.TLLEN <= 5) result = -(1 + readBE81632(workbuffer.slice(1, tlv.TLLEN)));
        else throw new Error('Negative ints over 4 bytes are not supported at this moment!');

        results.push(result);
        i += tlv.TLLEN - 1;
        break;
      case 'BYTE_STRING':
        if (tlv.LEN === Infinity) {
          let length = findLegthOfIndefiniteLengthBuffer(tlv.VAL);
          result = tlv.VAL.slice(0, length);
          i += length;
        } else {
          if (tlv.LEN === 0) {
            result = workbuffer.slice(1, 1 + tlv.VAL);
            i += tlv.VAL;
          } else {
            result = tlv.VAL;
            i += tlv.TLVTOTALLEN - 1;
          }
        }

        results.push(result);
        break;
      case 'TEXT_STRING':
        if (tlv.LEN === Infinity) {
          let length = findLegthOfIndefiniteLengthBuffer(tlv.VAL);
          result = tlv.VAL.slice(0, length);
          i += length;
        } else {
          if (tlv.LEN === 0) {
            result = workbuffer.slice(1, 1 + tlv.VAL);
            i += tlv.VAL;
          } else {
            result = tlv.VAL;
            i += tlv.TLVTOTALLEN - 1;
          }
        }

        results.push(bufferToString(result));
        break;
      case 'ARRAY':
        result = decode(workbuffer.slice(1), tlv.VAL);
        if (result.length !== tlv.VAL) throw new Error('SEQ missing elements!');

        results.push(result);
        i += result.byteLength;
        break;
      case 'MAP':
        result = decode(workbuffer.slice(1), tlv.VAL * 2);
        if (result.length !== tlv.VAL * 2) throw new Error('MAP is missing keypairs!');

        results.push(arrayPairsToMap(result));
        i += result.byteLength;
        break;
      case 'OTHER_SEM':
        break;
      case 'FLOAT_AND_NO_CONTENT':
        let type = float_and_no_content_semantics[tlv.VAL];
        switch (type) {
          case 'FALSE':
            results.push(false);
            i += 1;
            break;
          case 'TRUE':
            results.push(true);
            i += 1;
            break;
          case 'NULL':
            results.push(null);
            i += 1;
            break;
          case 'UNDEFINED':
            results.push(undefined);
            i += 1;
            break;
          // case "SIMPLE_CONT"
          // break
          // case "FLOAT_16"
          // break
          // case "FLOAT_32"
          // break
          // case "FLOAT_64"
          // break
          // case "INFINITY_BREAK"
          // break
          default:
            if (!type) throw new Error(`VALUE ${tlv.VAL} IS UNASSIGNED`);

            throw new Error(`${type} IS NOT CURRENTLY IMPLEMENTED!`);
            break;
        }
        break;
    }

    workbuffer = buffer.slice(i + 1);
    bLength = i + 1;

    if (expectedLength && results.length === expectedLength) break;
  }

  results.byteLength = bLength;
  return results;
};

export const decodeOnlyFirst = (buffer: Uint8Array) => {
  return decode(buffer, 1);
};

export const encode = () => {
  throw new Error('NOT IMPLEMENTED YET');
};
