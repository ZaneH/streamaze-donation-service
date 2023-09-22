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

function censorBadWords(str, words) {
  const badWordsPattern = new RegExp([...words, ...BAD_WORDS].join('|'), 'gi')
  const censoredStr = str.replace(badWordsPattern, 'censored')

  return censoredStr
}

module.exports = {
  censorBadWords,
}
