/**
 * Copyright 2023, Zane Helton, All rights reserved.
 */

const BAD_WORDS = [] // populate the defaults yourself lol

// Replace words in str that match words or BAD_WORDS with "censored"
// Only replace whole words, not substrings
function censorBadWords(str, words = []) {
  const regex = new RegExp(
    '\\b(' + [...words, ...BAD_WORDS].join('|') + ')\\b',
    'gi',
  )
  return str.replace(regex, 'censored')
}

module.exports = {
  censorBadWords,
}
