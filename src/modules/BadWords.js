const BAD_WORDS = [
  'abbos',
  'aboos',
  'abos',
  'abo',
  'coons',
  'nick gurs',
  'naggers',
  'nigers',
  'pedo',
  'pedophile',
  'pedaphile',
  'pediphile',
  'pdf file',
  'knick cars',
  'nick cars',
  'abbo',
  'chinky chonks',
  'chink chonk',
]

// Replace words in str that match words or BAD_WORDS with "censored"
// Only replace whole words, not substrings
function censorBadWords(str, words) {
  const regex = new RegExp(
    '\\b(' + [...words, ...BAD_WORDS].join('|') + ')\\b',
    'gi',
  )
  return str.replace(regex, 'censored')
}

module.exports = {
  censorBadWords,
}
