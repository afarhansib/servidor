const sharp = require('sharp')
const { fonts } = require('./tiro/fonts')
const { styles } = require('./tiro/styles')

const createSvgFromMatrix = (options) => {
    const style = options.style
        ? styles.find(s => {
            const normalize = str => str?.toLowerCase().replace(/[\s\-_]/g, '')
            return normalize(s.name) === normalize(options.style)
        })
        : null || styles[Math.floor(Math.random() * styles.length)]

    const {
        text = 'Yotbu',
        font = fonts[style.settings.font],
        textColor = style.settings.textColor,
        patterns = style.patterns,
        leftWidth = style.settings.leftWidth,
        middleWidth = style.settings.middleWidth,
        rightWidth = style.settings.rightWidth,
        charSpacing = 1,
        spaceWidth = 3
    } = options

    // Calculate dimensions
    const chars = text.split('')
    const textWidth = chars.reduce((width, char, index) => {
        const isLast = index === chars.length - 1
        if (char === ' ') return width + spaceWidth
        const charData = font.characters.find(c => c.char === char)
        return width + (charData ? charData.matrix[0].length + (isLast ? 0 : charSpacing) : 1)
    }, 0)

    const finalWidth = textWidth + leftWidth + rightWidth
    const height = 10

    let svgContent = `<svg width="${finalWidth}" height="${height}" xmlns="http://www.w3.org/2000/svg">`

    // Draw middle pattern
    let x = leftWidth
    while (x < leftWidth + textWidth) {
        patterns.middle.forEach((row, y) => {
            row.forEach((pixel, px) => {
                if (pixel.active) {
                    svgContent += `<rect x="${x + (px % middleWidth)}" y="${y}" width="1" height="1" fill="${pixel.color}"/>`
                }
            })
        })
        x += middleWidth
    }

    // Draw text
    let currentX = leftWidth
    chars.forEach((char, index) => {
        const isLast = index === chars.length - 1
        if (char === ' ') {
            currentX += spaceWidth
            return
        }
        const charData = font.characters.find(c => c.char === char)
        if (charData) {
            charData.matrix.forEach((row, y) => {
                row.forEach((pixel, x) => {
                    if (pixel) {
                        svgContent += `<rect x="${currentX + x}" y="${y}" width="1" height="1" fill="${textColor}"/>`
                    }
                })
            })
            currentX += charData.matrix[0].length + (isLast ? 0 : charSpacing)
        }
    })

    // Draw left decoration
    patterns.left.forEach((row, y) => {
        row.forEach((pixel, x) => {
            if (pixel.active) {
                svgContent += `<rect x="${x}" y="${y}" width="1" height="1" fill="${pixel.color}"/>`
            }
        })
    })

    // Draw right decoration
    patterns.right.forEach((row, y) => {
        row.forEach((pixel, x) => {
            if (pixel.active) {
                svgContent += `<rect x="${finalWidth - rightWidth + x}" y="${y}" width="1" height="1" fill="${pixel.color}"/>`
            }
        })
    })

    svgContent += '</svg>'
    return { svg: svgContent, width: finalWidth, height, style }
}

const generateTiro = async (options) => {
    const { svg, width, height, style } = createSvgFromMatrix(options)

    // Scale up the image to make it more visible
    const scale = 32 // Each pixel becomes 10x10
    const padding = Number(options.padding) || 128 // Default padding of 20 pixels

    const generatedImage = await sharp(Buffer.from(svg))
        .resize(width * scale, height * scale, {
            kernel: sharp.kernel.nearest // Maintain pixel perfect scaling
        })
        .extend({
            top: padding,
            bottom: padding,
            left: padding,
            right: padding,
            background: { r: 0, g: 0, b: 0, alpha: 0 } // Black background, can be customized
        })
        .png()
        .toBuffer()

    return [generatedImage, style]
}

module.exports = { generateTiro }