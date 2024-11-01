const express = require('express');
const puppeteer = require('puppeteer');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Servindo o arquivo index.html como página inicial
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/project-info', async (req, res) => {
    const { projectLink } = req.body;
    
    const regex = /https:\/\/editor\.p5js\.org\/([^/]+)\/sketches\/([^/]+)/;
    const match = projectLink.match(regex);

    if (!match) {
        return res.status(400).json({ error: 'Formato de link inválido.' });
    }

    const [ , username, projectCode ] = match;
    const sketchesUrl = `https://editor.p5js.org/${username}/sketches`;

    try {
        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.goto(sketchesUrl, { waitUntil: 'networkidle2' });

        // Captura as informações da tabela de projetos
        const projectInfo = await page.evaluate((projectCode) => {
            const rows = document.querySelectorAll('.sketches-table tbody tr');
            for (const row of rows) {
                const linkElement = row.querySelector('th a');
                const linkHref = linkElement.getAttribute('href');
                const sketchName = linkElement.textContent;
                const dateUpdated = row.querySelectorAll('td')[1].textContent;

                if (linkHref.includes(projectCode)) {
                    return { name: sketchName, dateUpdated };
                }
            }
            return null;
        }, projectCode);

        await browser.close();

        if (!projectInfo) {
            console.log("Projeto não encontrado na página.");  // Log para debug
            return res.status(404).json({ error: 'Projeto não encontrado.' });
        }

        res.json(projectInfo);
    } catch (error) {
        console.error("Erro ao acessar o site do P5.js:", error);  // Log detalhado do erro
        res.status(500).json({ error: 'Erro ao acessar o site do P5.js.' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
