const { Telegraf, Markup } = require('telegraf')
const fs = require('fs')
const tricks = require('./tricks')

const bot = new Telegraf(process.env.BOT_TOKEN)

const ADMIN_ID = 312438642
const DB_FILE = './db.json'

// ---------------- DB ----------------
function loadDB() {
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], news: "Поки що немає новин" }))
    }
    return JSON.parse(fs.readFileSync(DB_FILE))
}

function saveDB(db) {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2))
}

// ---------------- START ----------------
bot.start((ctx) => {
    const db = loadDB()

    let user = db.users.find(u => u.id === ctx.from.id)

    if (!user) {
        user = {
            id: ctx.from.id,
            first_name: ctx.from.first_name,
            username: ctx.from.username || "no_username",
            points: 0,
            rides: 0
        }

        db.users.push(user)
        saveDB(db)
    }

    ctx.reply(
`🏄 *AqvaWake Bot*

📰 Остання новина:
${db.news}

👇 Обери дію:`,
Markup.inlineKeyboard([
    [Markup.button.callback("🏄 Бронювання", "book")],
    [Markup.button.callback("📊 Мій профіль", "profile")],
    [Markup.button.callback("🏆 WAKE QUEST", "quest")],
    [Markup.button.callback("📰 Новини", "news")],
])
)
})

// ---------------- CALLBACKS ----------------
bot.on('callback_query', async (ctx) => {
    const db = loadDB()
    const data = ctx.callbackQuery.data

    const user = db.users.find(u => u.id === ctx.from.id)

    // USER
    if (data === 'profile') {
        return ctx.reply(
`👤 Профіль

Ім'я: ${user.first_name}
Username: @${user.username}
ID: ${user.id}

⭐ Бали: ${user.points}
🏄 Заїзди: ${user.rides}`
        )
    }

    if (data === 'news') {
        return ctx.reply(`📰 ${db.news}`)
    }

    if (data === 'book') {
        return ctx.reply("🏄 https://aqvawakeche.simplybook.it/v2/#book")
    }

    if (data === 'quest') {
        return ctx.reply(
`🏆 WAKE QUEST: ROAD TO 5000

👇 Обери:`,
Markup.inlineKeyboard([
    [Markup.button.callback("🏄 Трюки", "tricks")],
    [Markup.button.callback("📜 Правила", "rules")]
])
        )
    }

    if (data === 'tricks') {
        const list = tricks.map(t => `🏄 ${t.name} — ${t.points}`).join('\n')
        return ctx.reply("🏄 ТРЮКИ:\n\n" + list)
    }

    if (data === 'rules') {
        return ctx.reply(
`📜 ПРАВИЛА

1. Інструктор рахує трюки
2. Макс 250 балів за сет
3. Свіч = x2
4. Безпека`
        )
    }

    // ADMIN
    if (ctx.from.id === ADMIN_ID) {

        if (data === 'admin') {
            return ctx.reply(
`👑 ADMIN PANEL`,
Markup.inlineKeyboard([
    [Markup.button.callback("📣 Розсилка", "broadcast")],
    [Markup.button.callback("✉ PM", "pm")],
    [Markup.button.callback("✔ Confirm", "confirm")],
    [Markup.button.callback("⭐ Бали", "points")],
    [Markup.button.callback("👤 Users", "users")]
])
            )
        }

        if (data === 'points') {
            return ctx.reply(
`⭐ БАЛИ

/addpoints userID 10
/addpoints userID 50
/addpoints userID 100`
            )
        }

        if (data === 'users') {
            const list = db.users.map(u =>
                `${u.first_name} (@${u.username}) - ${u.id}`
            ).join('\n')

            return ctx.reply(list || "Порожньо")
        }
    }

    ctx.answerCbQuery()
})

// ---------------- ADMIN COMMANDS ----------------
bot.command('broadcast', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return

    const db = loadDB()
    const text = ctx.message.text.replace('/broadcast', '').trim()

    db.news = text
    saveDB(db)

    db.users.forEach(u => {
        bot.telegram.sendMessage(u.id, `📰 НОВИНА:\n${text}`)
    })

    ctx.reply("✔ розіслано")
})

bot.command('addpoints', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return

    const parts = ctx.message.text.split(' ')
    const userId = Number(parts[1])
    const points = Number(parts[2])

    const db = loadDB()
    const user = db.users.find(u => u.id === userId)

    if (!user) return ctx.reply("нема юзера")

    user.points += points
    user.rides += 1

    saveDB(db)

    bot.telegram.sendMessage(userId, `⭐ +${points} балів`)
    ctx.reply("OK")
})

bot.launch()

console.log("AqvaWake Bot LIVE 🚀")
