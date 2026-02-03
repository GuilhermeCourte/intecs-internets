export default async function handler(req, res) {
    // 1. CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // 2. Get URL
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: "URL não fornecida" });
    }

    try {
        // 3. Fetch
        const response = await fetch(url, {
            method: "GET",
            redirect: "follow",
        });

        // 4. Response
        const data = await response.text();
        res.status(response.status).send(data);
    } catch (error) {
        res.status(500).json({ error: "Erro na requisição: " + error.message });
    }
}
