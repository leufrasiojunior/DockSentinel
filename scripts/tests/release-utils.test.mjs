import assert from "node:assert/strict";
import test from "node:test";
import {
  parseVersion,
  suggestTag,
  validateTagForChannel,
} from "../lib/release-utils.mjs";

test("parseVersion: stable", () => {
  assert.deepEqual(parseVersion("1.2.3"), {
    base: "1.2.3",
    channel: null,
    n: null,
  });
});

test("parseVersion: alpha", () => {
  assert.deepEqual(parseVersion("1.2.3-alpha.7"), {
    base: "1.2.3",
    channel: "alpha",
    n: 7,
  });
});

test("parseVersion: beta", () => {
  assert.deepEqual(parseVersion("9.8.1-beta.2"), {
    base: "9.8.1",
    channel: "beta",
    n: 2,
  });
});

test("parseVersion: invalid", () => {
  assert.equal(parseVersion("1.2"), null);
  assert.equal(parseVersion("1.2.3-rc.1"), null);
  assert.equal(parseVersion("v1.2.3"), null);
});

test("suggestTag: increment same channel", () => {
  assert.equal(suggestTag("alpha", "1.2.3-alpha.2"), "v1.2.3-alpha.3");
  assert.equal(suggestTag("beta", "1.2.3-beta.9"), "v1.2.3-beta.10");
});

test("suggestTag: switch channel starts at 1", () => {
  assert.equal(suggestTag("alpha", "1.2.3-beta.4"), "v1.2.3-alpha.1");
  assert.equal(suggestTag("beta", "1.2.3-alpha.4"), "v1.2.3-beta.1");
});

test("suggestTag: release strips prerelease", () => {
  assert.equal(suggestTag("release", "1.2.3-alpha.4"), "v1.2.3");
  assert.equal(suggestTag("release", "1.2.3"), "v1.2.3");
});

test("validateTagForChannel: positive cases", () => {
  assert.equal(validateTagForChannel("v1.2.3", "release").ok, true);
  assert.equal(validateTagForChannel("v1.2.3-alpha.1", "alpha").ok, true);
  assert.equal(validateTagForChannel("v1.2.3-beta.1", "beta").ok, true);
});

test("validateTagForChannel: channel mismatch", () => {
  const result = validateTagForChannel("v1.2.3-beta.1", "alpha");
  assert.equal(result.ok, false);
  assert.match(result.error, /Canal não bate com a tag/);
});

test("validateTagForChannel: bad format", () => {
  const result = validateTagForChannel("1.2.3", "release");
  assert.equal(result.ok, false);
  assert.match(result.error, /Formato de tag inválido/);
});
