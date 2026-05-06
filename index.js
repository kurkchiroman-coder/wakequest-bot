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

    const isAdmin = ctx.from.id === ADMIN_ID

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
    ...(isAdmin ? [[Markup.button.callback("👑 ADMIN", "admin")]] : [])
]),
Markup.keyboard([
    ['🏄 /start', '📊 Профіль'],
    ['🏆 Quest', '📰 Новини']
]).resize()
    )
})

// ---------------- CALLBACKS ----------------
bot.on('callback_query', async (ctx) => {
    const db = loadDB()
    const data = ctx.callbackQuery.data

    const user = db.users.find(u => u.id === ctx.from.id)
    if (!user) return ctx.answerCbQuery()

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
`🏆 WAKE QUEST

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

        if (data === 'broadcast') return ctx.reply("Напиши: /broadcast текст")
        if (data === 'pm') return ctx.reply("Напиши: /pm userID текст")
        if (data === 'confirm') return ctx.reply("Напиши: /confirm userID")
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

bot.command('pm', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return

    const parts = ctx.message.text.split(' ')
    const id = parts[1]
    const text = parts.slice(2).join(' ')

    if (!id || !text) return ctx.reply("формат: /pm id текст")

    bot.telegram.sendMessage(id, `📩 ${text}`)
    ctx.reply("OK")
})

bot.command('confirm', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return

    const parts = ctx.message.text.split(' ')
    const userId = parts[1]

    if (!userId) return ctx.reply("формат: /confirm userID")

    try {
        await bot.telegram.sendMessage(
            userId,
            "✅ Бронювання підтверджено!\n🏄 Чекаємо тебе"
        )
        ctx.reply("✔ відправлено")
    } catch (e) {
        ctx.reply("❌ помилка")
    }
})

bot.launch()

console.log("AqvaWake Bot LIVE 🚀")
