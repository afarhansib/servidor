const { decodeStyle } = require("./style-encoder")

let stylesCache = null
let lastFetch = 0
const CACHE_DURATION = 1000 * 60 * 60

const fetchStyles = async () => {
  try {
    const response = await fetch('http://tiro.yotbu.my.id/styles.php')
    if (!response.ok) throw new Error('Failed to fetch styles')
    const data = await response.json()
    if (data.styles) {
        return data.styles.map(style => decodeStyle(style))
    }
    return []
  } catch (err) {
    console.error('Error fetching styles:', err)
    return []
  }
}

const getStyles = async () => {
  if (!stylesCache || Date.now() - lastFetch > CACHE_DURATION) {
    stylesCache = await fetchStyles()
    lastFetch = Date.now()
  }
  return stylesCache
}

module.exports = { getStyles }