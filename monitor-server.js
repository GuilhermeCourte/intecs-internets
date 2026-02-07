const fetch = require('node-fetch'); // You need to install this: npm install node-fetch
const fs = require('fs');
const path = require('path');

// CONFIGURAÇÃO
const CHECK_INTERVAL_MS = 300000; // 5 minutos
const TELEGRAM_BOT_TOKEN = "8277634336:AAFVjzG-4dkBEAnld5xU8amKhX7xkUy_wcs";
const TELEGRAM_CHAT_ID = "5952530884";
const STATUS_FILE = path.join(__dirname, 'monitor_status.json');

const UNIDADES = [
    { nome: "SÃO MIGUEL", url: "http://ssintecsbr.ddns.com.br:3000/api/public/dashboard/d1f43c3c-459b-4eaf-a5cb-c1b4dbfd00fd/dashcard/3443/card/1545" },
    { nome: "CITY JARAGUÁ", url: "http://ssintecsbr.ddns.com.br:3000/api/public/dashboard/d1f43c3c-459b-4eaf-a5cb-c1b4dbfd00fd/dashcard/3434/card/1543" },
    { nome: "JARAGUÁ", url: "http://ssintecsbr.ddns.com.br:3000/api/public/dashboard/d1f43c3c-459b-4eaf-a5cb-c1b4dbfd00fd/dashcard/3445/card/1546" },
    { nome: "BRASILÂNDIA", url: "http://ssintecsbr.ddns.com.br:3000/api/public/dashboard/d1f43c3c-459b-4eaf-a5cb-c1b4dbfd00fd/dashcard/3435/card/1544" },
    { nome: "GUAIANASES", url: "http://ssintecsbr.ddns.com.br:3000/api/public/dashboard/d1f43c3c-459b-4eaf-a5cb-c1b4dbfd00fd/dashcard/3444/card/1547" },
    { nome: "TIRADENTES", url: "http://ssintecsbr.ddns.com.br:3000/api/public/dashboard/d1f43c3c-459b-4eaf-a5cb-c1b4dbfd00fd/dashcard/3447/card/1548" },
    { nome: "M'BOI MIRIM", url: "http://ssintecsbr.ddns.com.br:3000/api/public/dashboard/d1f43c3c-459b-4eaf-a5cb-c1b4dbfd00fd/dashcard/3446/card/1549" }
];

// Helper to load/save status
function loadStatus() {
    if (fs.existsSync(STATUS_FILE)) {
        return JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'));
    }
    return {};
}

function saveStatus(status) {
    fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));
}

// Telegram Sender
async function notifyTelegram(unitName, newStatus) {
    let message = "";
    if (newStatus === "ONLINE") {
        message = `🟢 ${unitName} está ONLINE!`;
    } else {
        message = `🔴 ${unitName} está OFFLINE!`;
    }

    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message })
        });
        console.log(`[Telegram] Enviado: ${message}`);
    } catch (e) {
        console.error(`[Telegram] Erro ao enviar: ${e.message}`);
    }
}

// Check Logic (Identical to Frontend but Node-compatible)
async function checkUnit(unit) {
    try {
        // Direct fetch since we are in Node (no CORS issues like browser)
        const response = await fetch(unit.url, { timeout: 10000 });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const json = await response.json();
        // Adjust this logic if the API structure matches your frontend proxy
        // Assuming direct API access returns similar structure:
        const statusText = json.data?.rows?.[0]?.[0];

        return statusText && String(statusText).toUpperCase().includes("ONLINE");
    } catch (error) {
        console.error(`[Check] Falha em ${unit.nome}: ${error.message}`);
        return false;
    }
}

async function runMonitor() {
    console.log(`\n--- Rodando Monitoramento: ${new Date().toLocaleString()} ---`);
    const lastStatus = loadStatus();
    const currentStatus = { ...lastStatus };

    for (const unit of UNIDADES) {
        const isOnline = await checkUnit(unit);
        const statusStr = isOnline ? "ONLINE" : "OFFLINE";
        const previous = lastStatus[unit.nome];

        process.stdout.write(`Unit: ${unit.nome.padEnd(15)} | Status: ${statusStr}`);

        // Notification Logic
        if (previous !== undefined && previous !== statusStr) {
            console.log(` -> MUDANÇA DETECTADA! (Era ${previous})`);
            await notifyTelegram(unit.nome, statusStr);
        } else if (previous === undefined) {
            console.log(` -> Primeira verificação (Salvo)`);
        } else {
            console.log(` -> (Sem mudança)`);
        }

        currentStatus[unit.nome] = statusStr;
    }

    saveStatus(currentStatus);
}

// Start
console.log("🚀 Monitoramento 24/7 Iniciado...");
runMonitor(); // Run immediately
setInterval(runMonitor, CHECK_INTERVAL_MS); // Then every 5 mins
