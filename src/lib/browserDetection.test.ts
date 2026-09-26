import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isGoogleChrome, getDetectedBrowserName } from './browserDetection';

test('isGoogleChrome accurately identifies Google Chrome user agents', () => {
  const chromeWindowsUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  const chromeMacUA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
  const chromeLinuxUA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';
  const chromeVendor = 'Google Inc.';

  assert.equal(isGoogleChrome(chromeWindowsUA, chromeVendor), true);
  assert.equal(isGoogleChrome(chromeMacUA, chromeVendor), true);
  assert.equal(isGoogleChrome(chromeLinuxUA, chromeVendor), true);
  assert.equal(getDetectedBrowserName(chromeWindowsUA), 'Google Chrome');
});

test('isGoogleChrome returns false for Firefox', () => {
  const firefoxUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0';
  assert.equal(isGoogleChrome(firefoxUA, ''), false);
  assert.equal(getDetectedBrowserName(firefoxUA), 'Mozilla Firefox');
});

test('isGoogleChrome returns false for Microsoft Edge', () => {
  const edgeUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0';
  assert.equal(isGoogleChrome(edgeUA, 'Google Inc.'), false);
  assert.equal(getDetectedBrowserName(edgeUA), 'Microsoft Edge');
});

test('isGoogleChrome returns false for Safari', () => {
  const safariUA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15';
  assert.equal(isGoogleChrome(safariUA, 'Apple Computer, Inc.'), false);
  assert.equal(getDetectedBrowserName(safariUA), 'Apple Safari');
});

test('isGoogleChrome returns false for Opera', () => {
  const operaUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0';
  assert.equal(isGoogleChrome(operaUA, 'Google Inc.'), false);
  assert.equal(getDetectedBrowserName(operaUA), 'Opera');
});

test('isGoogleChrome returns false for Samsung Internet', () => {
  const samsungUA = 'Mozilla/5.0 (Linux; Android 13; SAMSUNG SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36';
  assert.equal(isGoogleChrome(samsungUA, 'Google Inc.'), false);
  assert.equal(getDetectedBrowserName(samsungUA), 'Samsung Internet');
});
