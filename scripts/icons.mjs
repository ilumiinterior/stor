import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
function crc(data) {
  let c = 0xffffffff;
  for (const byte of data) {
    c ^= byte;
    for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const name = Buffer.from(type);
  const size = Buffer.alloc(4);
  size.writeUInt32BE(data.length);
  const check = Buffer.alloc(4);
  check.writeUInt32BE(crc(Buffer.concat([name, data])));
  return Buffer.concat([size, name, data, check]);
}
for (const size of [192, 512]) {
  const pixels = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = (x / size) * 512,
        py = (y / size) * 512;
      const stem = px > 158 && px < 182 && py > 145 && py < 370;
      const branch =
        (Math.abs(Math.hypot((px - 170) * 0.8, py - 145) - 140) < 12 &&
          px > 170 &&
          py > 145) ||
        (Math.abs(Math.hypot((px - 170) * 0.8, py - 145) - 70) < 12 &&
          px > 170 &&
          py > 145);
      const dot = [170, 275, 340].some(
        (cx) => Math.hypot(px - cx, py - 145) < 24,
      );
      const i = y * (size * 4 + 1) + 1 + x * 4;
      pixels.set(
        stem || branch || dot ? [196, 211, 163, 255] : [23, 27, 25, 255],
        i,
      );
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  writeFileSync(
    `public/icon-${size}.png`,
    Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk("IHDR", header),
      chunk("IDAT", deflateSync(pixels)),
      chunk("IEND", Buffer.alloc(0)),
    ]),
  );
}
