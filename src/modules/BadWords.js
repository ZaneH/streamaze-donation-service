const BAD_WORDS = [
  'abbos',
  'aboos',
  'abos',
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

function censorBadString(str) {
  // Create a regular expression pattern to match any of the bad words
  const badWordsPattern = new RegExp(BAD_WORDS.join('|'), 'gi')

  // Replace bad words with 'censored'
  const censoredStr = str.replace(badWordsPattern, 'censored')

  return censoredStr
}

module.exports = {
  censorBadString,
}
