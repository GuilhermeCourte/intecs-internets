export default async function handler(request, response) {
    const { message } = request.query;

    if (!message) {
        return response.status(400).json({ error: 'Message is required' });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
        return response.status(500).json({ error: 'Server configuration error' });
    }

    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

    try {
        const telegramResponse = await fetch(telegramUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'Markdown'
            })
        });

        const data = await telegramResponse.json();

        if (!data.ok) {
            throw new Error(data.description);
        }

        return response.status(200).json({ success: true, data });

    } catch (error) {
        return response.status(500).json({ error: error.message });
    }
}
