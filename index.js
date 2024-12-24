const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, delay } = require('baileys')
const { generateTiro } = require('./tiro')
const cloudyPlayers = require('./cloudy-player')

const groups = [
    {
        id: '120363350080547462@g.us',
        app: 'tiro',
    }
]

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')

    const servidor = makeWASocket({
        printQRInTerminal: true,
        auth: state
    })

    servidor.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
            console.log('connection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect)
            // reconnect if not logged out
            if (shouldReconnect) {
                connectToWhatsApp()
            }

        } else if (connection === 'open') {
            console.log('opened connection')
        }
    })

    servidor.ev.on('messages.upsert', async m => {
        console.log(JSON.stringify(m, undefined, 2))
        if (m.messages[0].key.fromMe) return

        handleNewMessage(m.messages[0], servidor)

        // await sendMessageWTyping(servidor, { text: 'Hai there!' }, m.messages[0].key.remoteJid, [m.messages[0].key])
    })

    servidor.ev.on('creds.update', saveCreds)
}

const sendMessageWTyping = async (servidor, msg, jid, key) => {
    await servidor.presenceSubscribe(jid)
    await delay(500)
    await servidor.sendPresenceUpdate('composing', jid)
    await servidor.readMessages(key)
    await delay(2000)
    await servidor.sendPresenceUpdate('paused', jid)
    await servidor.sendMessage(jid, msg)
}

const hasApp = (group, appName) => {
    const normalize = str => str?.toLowerCase().replace(/[\s\-_]/g, '')
    return normalize(group?.app) === normalize(appName)
}

const parseCommand = (messageText, group) => {
    // Get command type from first word after dot
    const match = messageText?.match(/^\.(\w+)/)
    if (!match) return null

    const app = match[1]
    if (!hasApp(group, app)) return null

    const input = messageText.slice(app.length + 1).trim()
    const params = {}

    if (input) {
        const words = input.split(' ')

        // Extract named parameters
        const namedParams = words.filter(w => w.includes('='))
        namedParams.forEach(param => {
            const [key, value] = param.split('=')
            params[key] = value
        })

        // Get remaining text
        const text = words
            .filter(w => !w.includes('='))
            .join(' ')

        if (text) params.text = text
    }

    return {
        app,
        params
    }
}

// const createSimpleSvg = () => {
//     // Create a 5x5 plus symbol
//     const svg = `
//         <svg width="5" height="5" xmlns="http://www.w3.org/2000/svg">
//             <rect x="2" y="0" width="1" height="5" fill="white"/>
//             <rect x="0" y="2" width="5" height="1" fill="white"/>
//         </svg>
//     `
//     return svg
// }

const getDefaultText = () => {
    const defaults = [
        "VICTORIA",
        "FUEGO",
        "VAMOS",
        "RAPIDO",
        "FUERZA",
        "EQUIPO",
        "BATALLA",
        "CAMPEON",
        "GUERRERO",
        "LEYENDA",
        "PODER",
        "GLORIA",
        "LUCHA",
        "AMIGO",
        "VENGANZA",
        "DESTINO",
        "HONOR",
        "VALIENTE"
    ]
    return defaults[Math.floor(Math.random() * defaults.length)]
}

const handleNewMessage = async (message, servidor) => {
    const sender = message?.key?.remoteJid
    const senderGroup = groups.find(group => group.id === sender)
    const participant = message?.key?.participant
    if (!senderGroup) return

    const messageText = message?.message?.conversation
    const command = parseCommand(messageText, senderGroup)
    console.log('Message received:', JSON.stringify(command, null, 2))

    if (command) {
        console.log('Command received:', command)
        try {
            // Get the participant's phone number without the "@s.whatsapp.net"
            const participantNumber = participant?.split('@')[0]

            // Find the player in cloudyPlayers
            const player = cloudyPlayers.find(p => p.no === participantNumber)

            // Use player's gamertag, or provided text, or random Spanish word
            if (!command.params.text) {
                command.params.text = player?.gt || getDefaultText()
            }

            const generatedImage = await generateTiro(command?.params)
            const style = generatedImage[1]

            await servidor.sendMessage(
                sender,
                {
                    image: generatedImage[0],
                    caption: `Style: ${style.name} by ${style.author}`
                },
                { quoted: message }
            )

        } catch (error) {
            console.error('Error generating image:', error)
            await servidor.sendMessage(
                sender,
                { text: 'Sorry, there was an error generating the image.' },
                { quoted: message }
            )
        }
        // sendMessageWTyping(servidor, { text: 'Command received! \n' + JSON.stringify(command, null, 2) }, sender, [message.key])
    }

}

connectToWhatsApp()