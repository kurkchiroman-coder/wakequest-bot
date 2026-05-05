const { Telegraf } = require('telegraf')

const bot = new Telegraf(process.env.BOT_TOKEN)

let users = []
let lastNews = "Поки що немає новин"

bot.start((ctx) => {
    const id = ctx.from.id

    if (!users.includes(id)) users.push(id)

    ctx.reply(
`🏄 Welcome to AqvaWake!

📰 Остання новина:
${lastNews}`
    )
})

bot.command('broadcast', (ctx) => {
    const text = ctx.message.text.replace('/broadcast', '').trim()

    lastNews = text

    users.forEach(id => {
        bot.telegram.sendMessage(id, `📰 НОВИНА:\n${text}`)
    })

    ctx.reply("Розсилка відправлена 🚀")
})

bot.launch()

console.log("Bot запущено 🚀")
