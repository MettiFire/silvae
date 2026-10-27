import test from "node:test";
import assert from "node:assert/strict";
import { photoEditGeometry, editPhoto, FULL_PHOTO } from "../src/lib/photo-edit.ts";

test("quarter turns swap dimensions and crop in rotated coordinates, independent of display size", () => {
  const g = photoEditGeometry(1200, 800, 1, { x: 25, y: 10, width: 50, height: 60 });
  assert.equal(g.rotation, 1);
  assert.deepEqual([g.rotatedWidth, g.rotatedHeight], [800, 1200]);
  assert.deepEqual([g.x, g.y, g.outputWidth, g.outputHeight], [200, 120, 400, 720]);
  assert.equal(photoEditGeometry(1200, 800, -1, FULL_PHOTO).rotation, 3);
  assert.deepEqual(
    photoEditGeometry(1200, 800, 4, FULL_PHOTO),
    photoEditGeometry(1200, 800, 0, FULL_PHOTO),
  );
  const large = photoEditGeometry(8000, 4000, 0, FULL_PHOTO);
  assert.deepEqual([large.outputWidth, large.outputHeight], [2400, 1200]);
});

test("invalid, empty, overflowing and excessive decoded images cannot be exported", () => {
  for (const crop of [
    { ...FULL_PHOTO, width: 0 },
    { ...FULL_PHOTO, x: -1 },
    { ...FULL_PHOTO, x: 20 },
    { ...FULL_PHOTO, y: NaN },
  ])
    assert.throws(() => photoEditGeometry(1200, 800, 0, crop));
  assert.throws(() => photoEditGeometry(9000, 9000, 0, FULL_PHOTO));
  assert.throws(() => photoEditGeometry(1200, 800, 0.5, FULL_PHOTO));
});

test("export applies crop and rotation to pixels, emits WebP, and closes decoded images on success and failure", async (t) => {
  const oldBitmap = globalThis.createImageBitmap,
    oldDocument = globalThis.document;
  t.after(() => {
    globalThis.createImageBitmap = oldBitmap;
    globalThis.document = oldDocument;
  });
  const events = [];
  globalThis.createImageBitmap = async () => ({
    width: 1200,
    height: 800,
    close: () => events.push(["close"]),
  });
  const ctx = Object.fromEntries(
    ["scale", "translate", "rotate", "drawImage"].map((name) => [
      name,
      (...args) => events.push([name, ...(name === "drawImage" ? args.slice(1) : args)]),
    ]),
  );
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ctx,
    toBlob: (cb) => cb(new Blob(["pixels"], { type: "image/webp" })),
  };
  globalThis.document = { createElement: () => canvas };
  const file = new File(["input"], "page.jpg", { type: "image/jpeg" });
  const result = await editPhoto(file, 1, { x: 25, y: 10, width: 50, height: 60 });
  assert.equal(result.type, "image/webp");
  assert.deepEqual([canvas.width, canvas.height], [400, 720]);
  assert.deepEqual(events.slice(0, 5), [
    ["scale", 1, 1],
    ["translate", -200, -120],
    ["translate", 400, 600],
    ["rotate", Math.PI / 2],
    ["drawImage", -600, -400],
  ]);
  assert.equal(events.at(-1)[0], "close");
  canvas.getContext = () => null;
  await assert.rejects(editPhoto(file, 0), /preparare/);
  assert.equal(events.filter((e) => e[0] === "close").length, 2);
});
