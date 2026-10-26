import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DECK_THEMES, cardBackFor, finisherFor } from '../../shared/decks.js';

const publicDir = fileURLToPath(new URL('../../client/public', import.meta.url));

test('Mỗi theme chơi được có card back + finisher riêng và asset tồn tại', () => {
  const playable = DECK_THEMES.filter((theme) => !theme.comingSoon);
  assert.deepEqual(playable.map((theme) => theme.id), ['default', 'anime', 'lol']);

  for (const theme of playable) {
    assert.equal(theme.cardBack, cardBackFor(theme.id));
    assert.equal(theme.finisher, finisherFor(theme.id));
    assert.ok(existsSync(`${publicDir}${theme.cardBack}`), `thiếu ${theme.cardBack}`);
  }

  assert.equal(new Set(playable.map((theme) => theme.cardBack)).size, 3);
  assert.equal(new Set(playable.map((theme) => theme.finisher)).size, 3);
});

test('Theme lạ fallback về default', () => {
  assert.equal(cardBackFor('halloween'), '/cards/card-back-default.svg');
  assert.equal(finisherFor('hh3d'), 'default');
  assert.equal(cardBackFor(undefined), '/cards/card-back-default.svg');
  assert.equal(finisherFor(undefined), 'default');
});
