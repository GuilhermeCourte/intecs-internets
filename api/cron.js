export default async function handler(request, response) {
    // -------------------------------------------------------------
    // BUSINESS LOGIC: Only run 06:00 - 22:00 BRT
    // -------------------------------------------------------------
    const formatter = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: 'numeric',
        hour12: false
    });
    const currentHour = parseInt(formatter.format(new Date()));

    if (currentHour < 6 || currentHour >= 22) {
        return response.status(200).json({
            status: "SLEEPING",
            message: `Outside operating hours (Current BRT: ${currentHour}h). Only runs 06-22.`
        });
    }
    // -------------------------------------------------------------

    const TELEGRAM_BOT_TOKEN = "8277634336:AAFVjzG-4dkBEAnld5xU8amKhX7xkUy_wcs";
    const TELEGRAM_CHAT_ID = "5952530884";

    const UNIDADES = [
        { nome: "SÃO MIGUEL", url: "http://ssintecsbr.ddns.com.br:3000/api/public/dashboard/d1f43c3c-459b-4eaf-a5cb-c1b4dbfd00fd/dashcard/3443/card/1545" },
        { nome: "CITY JARAGUÁ", url: "http://ssintecsbr.ddns.com.br:3000/api/public/dashboard/d1f43c3c-459b-4eaf-a5cb-c1b4dbfd00fd/dashcard/3434/card/1543" },
        { nome: "JARAGUÁ", url: "http://ssintecsbr.ddns.com.br:3000/api/public/dashboard/d1f43c3c-459b-4eaf-a5cb-c1b4dbfd00fd/dashcard/3445/card/1546" },
        { nome: "BRASILÂNDIA", url: "http://ssintecsbr.ddns.com.br:3000/api/public/dashboard/d1f43c3c-459b-4eaf-a5cb-c1b4dbfd00fd/dashcard/3435/card/1544" },
        { nome: "GUAIANASES", url: "http://ssintecsbr.ddns.com.br:3000/api/public/dashboard/d1f43c3c-459b-4eaf-a5cb-c1b4dbfd00fd/dashcard/3444/card/1547" },
        { nome: "TIRADENTES", url: "http://ssintecsbr.ddns.com.br:3000/api/public/dashboard/d1f43c3c-459b-4eaf-a5cb-c1b4dbfd00fd/dashcard/3447/card/1548" },
        { nome: "M'BOI MIRIM", url: "http://ssintecsbr.ddns.com.br:3000/api/public/dashboard/d1f43c3c-459b-4eaf-a5cb-c1b4dbfd00fd/dashcard/3446/card/1549" }
    ];

    async function notifyTelegram(message) {
        try {
            const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
            await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message })
            });
        } catch (e) {
            console.error("Telegram Error:", e);
        }
    }

    async function checkUnit(unit) {
        try {
            console.log(`Checking ${unit.nome}...`);
            const res = await fetch(unit.url, { signal: AbortSignal.timeout(8000) });
            if (!res.ok) return false;

            const json = await res.json();
            const statusText = json.data?.rows?.[0]?.[0];
            return statusText && String(statusText).toUpperCase().includes("ONLINE");
        } catch (e) {
            console.error(`Check Failed ${unit.nome}:`, e);
            return false;
        }
    }

    const results = [];

    // Check all units
    for (const unit of UNIDADES) {
        const isOnline = await checkUnit(unit);
        if (!isOnline) {
            // Found an OFFLINE unit!
            // Note: Since we are serverless/stateless, we can't easily know if it was *already* offline.
            // We will send an alert every time the cron runs (e.g. 10 mins) if it is still down.
            // This ensures you never miss it, but might repeat until fixed.
            const msg = `🔴 ${unit.nome} está OFFLINE! (Verificação Automática Cloud)`;
            await notifyTelegram(msg);
            results.push({ unit: unit.nome, status: "OFFLINE", alerted: true });
        } else {
            results.push({ unit: unit.nome, status: "ONLINE", alerted: false });
        }
    }

    return response.status(200).json({
        timestamp: new Date().toISOString(),
        summary: results
    });
}
