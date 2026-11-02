import { readFile, access } from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map(m => m[1]).filter(s => s.includes('const books ='));
assert.equal(scripts.length, 1);
new vm.Script(scripts[0]);
const block = scripts[0].slice(scripts[0].indexOf('const books ='), scripts[0].indexOf('const reviews ='));
const books = JSON.parse(JSON.stringify(vm.runInNewContext(block + ';books')));
assert.equal(books.length, 19);
assert.equal(new Set(books.map(b => b.id)).size, 19);
const expected = {104:[30,8],105:[15,5],107:[25,8],108:[12,7],109:[25,5],110:[15,7],111:[20,7],112:[30,7],113:[35,9],114:[15,5],115:[8,5],116:[40,9],117:[12,6],118:[20,7],119:[20,5]};
let total = 0, count = 0;
for (const [id, [price, photos]] of Object.entries(expected)) {
  const book = books.find(b => b.id === Number(id));
  assert.ok(book, id);
  assert.equal(book.price, price, id);
  assert.equal(book.images.length, photos, id);
  assert.equal(book.thumbnails.length, photos, id);
  assert.match(book.lb_url, /^https:\/\/www\.leboncoin\.fr\/ad\/[a-z_]+\/\d+$/, id);
  assert.ok(!book.desc.includes('Annonce Leboncoin à venir'), id);
  assert.equal(book.img, book.images[0]);
  assert.equal(new Set(book.images).size, photos);
  total += price; count += photos;
  for (const file of [...book.images, ...book.thumbnails, book.card_img]) {
    assert.ok(file.startsWith('/PRODUITS/Catalogue-2026-11/'));
    await access(new URL('..' + file, import.meta.url));
  }
}
assert.equal(total, 322);
assert.equal(count, 100);
assert.equal(new Set(books.map(b => b.lb_url)).size, books.length);
assert.ok(!scripts[0].includes('schema.org/InStock'));
const sandbox = { URL };
vm.runInNewContext(scripts[0].slice(scripts[0].indexOf('function safeUrl('), scripts[0].indexOf('let cart =')), sandbox);
assert.equal(sandbox.safeUrl(null), null);
assert.equal(sandbox.safeUrl('https://fakeleboncoin.fr/ad/123'), null);
assert.equal(sandbox.safeUrl('https://leboncoin.fr@evil.test/ad/123'), null);
assert.equal(sandbox.safeUrl('https://www.leboncoin.fr/ad/livres/123'), 'https://www.leboncoin.fr/ad/livres/123');
// A saved selection from before publication must use current catalogue data.
let savedCart;
const restored = { URL, localStorage: { getItem: () => JSON.stringify(savedCart) } };
vm.runInNewContext(scripts[0].slice(0, scripts[0].indexOf('let cart =')), restored);
for (const legacy of [false, true]) {
  savedCart = Object.keys(expected).map(Number).map(id => legacy
    ? { id, lb_url: null, desc: 'Annonce Leboncoin à venir', price: 1 }
    : id);
  const selection = restored.loadCart();
  assert.equal(selection.length, 15);
  selection.forEach(book => assert.deepEqual(JSON.parse(JSON.stringify(book)), books.find(b => b.id === book.id)));
}
for (const book of books) {
  assert.equal(restored.getListingUrl({ ...book, lb_url: null }), book.lb_url);
  assert.equal(restored.getListingUrl({ ...book, lb_url: 'https://evil.test' }), book.lb_url);
}
assert.equal(restored.getListingUrl({ id: -1, lb_url: books[0].lb_url }), null);
assert.ok(!html.includes('Annonce Leboncoin à venir'));
console.log('OK: catalogue, 100 images, 19 liens et migration des sélections anciennes.');
