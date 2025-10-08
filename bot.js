const { Telegraf } = require('telegraf');
const express = require('express');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;

// Инициализация бота
const bot = new Telegraf(process.env.BOT_TOKEN);

// Переменные для управления ботом
let keepAliveChatId = null;
let isKeepAliveActive = false;

// 📊 Список рандомных сообщений для keep-alive
const randomMessages = [
    "🤖 Бот активен и работает!",
    "✅ Система удаления точек функционирует",
    "🔧 Техническое сообщение поддержания активности",
    "📡 Бот онлайн и мониторит сообщения",
    "⚙️ Проверка работы системы...",
    "🌐 Связь с сервером установлена",
    "🛡 Защита от точек активирована",
    "📝 Логирование работает в штатном режиме"
];

// 🎯 Функция для получения случайного сообщения
function getRandomMessage() {
    return randomMessages[Math.floor(Math.random() * randomMessages.length)];
}

// 🔄 Система поддержания активности
function startKeepAliveSystem(chatId) {
    if (isKeepAliveActive) return;
    
    keepAliveChatId = chatId;
    isKeepAliveActive = true;
    
    console.log('🚀 Запуск системы поддержания активности...');
    
    // Задача выполняется каждые 7 минут
    cron.schedule('*/7 * * * *', async () => {
        if (!keepAliveChatId) return;
        
        try {
            const randomMessage = getRandomMessage();
            console.log(`⏰ Отправка keep-alive сообщения: ${randomMessage}`);
            
            // Отправляем сообщение
            await bot.telegram.sendMessage(keepAliveChatId, randomMessage);
            
            console.log('✅ Keep-alive сообщение отправлено успешно');
        } catch (error) {
            console.error('❌ Ошибка отправки keep-alive сообщения:', error.message);
        }
    });
    
    console.log('✅ Система поддержания активности запущена');
}

// 🛑 Функция остановки keep-alive системы
function stopKeepAliveSystem() {
    isKeepAliveActive = false;
    keepAliveChatId = null;
    console.log('🛑 Система поддержания активности остановлена');
}

// 👋 Команда /start
bot.command('start', (ctx) => {
    const chatType = ctx.chat.type;
    const isGroup = chatType === 'group' || chatType === 'supergroup';
    
    let response = `🤖 <b>AntiDot Bot активирован!</b>\n\n`;
    response += `✅ <b>Функции бота:</b>\n`;
    response += `• Автоматическое удаление сообщений с точками\n`;
    response += `• Работа в группах и личных сообщениях\n`;
    
    if (isGroup) {
        response += `\n📋 <b>Для работы в группе убедитесь, что:</b>\n`;
        response += `• Бот добавлен как администратор\n`;
        response += `• Включены права на удаление сообщений\n`;
        
        // Автоматически запускаем keep-alive в группах
        startKeepAliveSystem(ctx.chat.id);
        response += `\n🔧 <b>Система поддержания активности активирована!</b>`;
    } else {
        response += `\n💡 <b>Для работы в группе:</b>\n`;
        response += `Добавьте бота в группу и сделайте администратором`;
    }
    
    ctx.replyWithHTML(response);
});

// 🛠 Команда /keepalive (для ручного управления)
bot.command('keepalive', (ctx) => {
    if (ctx.chat.type === 'private') {
        ctx.reply('❌ Эта команда работает только в группах!');
        return;
    }
    
    startKeepAliveSystem(ctx.chat.id);
    ctx.replyWithHTML('🔧 <b>Система поддержания активности запущена!</b>\n\nБот будет отправлять сообщения каждые 7 минут для предотвращения отключения.');
});

// 🛑 Команда /stopalive
bot.command('stopalive', (ctx) => {
    if (ctx.chat.type === 'private') {
        ctx.reply('❌ Эта команда работает только в группах!');
        return;
    }
    
    stopKeepAliveSystem();
    ctx.reply('🛑 Система поддержания активности остановлена.');
});

// 📊 Команда /status
bot.command('status', (ctx) => {
    const status = isKeepAliveActive ? '🟢 АКТИВНА' : '🔴 НЕАКТИВНА';
    const nextMessage = isKeepAliveActive ? 'через 7 минут' : 'не запланировано';
    
    ctx.replyWithHTML(
        `📊 <b>Статус системы AntiDot Bot</b>\n\n` +
        `• Удаление точек: 🟢 РАБОТАЕТ\n` +
        `• Keep-alive система: ${status}\n` +
        `• Следующее сообщение: ${nextMessage}\n` +
        `• Тип чата: ${ctx.chat.type}\n\n` +
        `<i>Используйте /keepalive для активации системы</i>`
    );
});

// 🎯 Основной обработчик - удаление сообщений с точками
bot.on('message', async (ctx) => {
    try {
        // Проверяем, есть ли текст в сообщении
        if (!ctx.message.text) return;
        
        const messageText = ctx.message.text.trim();
        
        // Удаляем сообщения содержащие только точку
        if (messageText === '.') {
            // Проверяем права бота на удаление сообщений
            try {
                await ctx.deleteMessage();
                console.log(`✅ Удалено сообщение с точкой от ${ctx.from.username || ctx.from.id} в чате ${ctx.chat.id}`);
                
                // Отправляем уведомление об удалении (опционально)
                // await ctx.reply('❌ Сообщения с точками запрещены!').then(msg => {
                //     setTimeout(() => ctx.deleteMessage(msg.message_id), 3000);
                // });
                
            } catch (deleteError) {
                console.error('❌ Ошибка при удалении сообщения:', deleteError.message);
                
                // Если нет прав на удаление, отправляем предупреждение
                if (deleteError.description && deleteError.description.includes('not enough rights')) {
                    await ctx.replyWithHTML(
                        `⚠️ <b>Недостаточно прав!</b>\n\n` +
                        `Для работы мне нужны права администратора с возможностью удаления сообщений.\n\n` +
                        `💡 <i>Пожалуйста, предоставьте нужные права в настройках группы</i>`
                    );
                }
            }
        }
    } catch (error) {
        console.error('❌ Общая ошибка обработки сообщения:', error);
    }
});

// 🚀 Настройка webhook для Render.com
app.use(express.json());

// Маршрут для вебхука Telegram
app.post(`/webhook`, async (req, res) => {
    try {
        await bot.handleUpdate(req.body);
        res.sendStatus(200);
    } catch (error) {
        console.error('❌ Ошибка обработки вебхука:', error);
        res.sendStatus(200);
    }
});

// Основной маршрут для проверки работы
app.get('/', (req, res) => {
    res.json({ 
        status: 'Bot is running!', 
        keepAliveActive: isKeepAliveActive,
        keepAliveChatId: keepAliveChatId 
    });
});

// 📡 Запуск сервера
app.listen(PORT, async () => {
    console.log(`🤖 Telegram AntiDot Bot запущен на порту ${PORT}`);
    console.log(`⏰ Keep-alive система: ${isKeepAliveActive ? 'активна' : 'неактивна'}`);
    
    // Настройка вебхука для production
    if (process.env.RENDER_EXTERNAL_URL) {
        const webhookUrl = `${process.env.RENDER_EXTERNAL_URL}/webhook`;
        await bot.telegram.setWebhook(webhookUrl);
        console.log(`🌐 Webhook установлен: ${webhookUrl}`);
    } else {
        // Локальная разработка - используем polling
        bot.launch();
        console.log('🔮 Бот запущен в режиме polling (локальная разработка)');
    }
    
    // Обработка graceful shutdown
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
});

// 🎯 Обработчик ошибок бота
bot.catch((err, ctx) => {
    console.error(`❌ Ошибка в боте для ${ctx.updateType}:`, err);
});
