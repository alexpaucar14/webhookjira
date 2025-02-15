const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

// Middleware para procesar JSON
app.use(bodyParser.json());

// Endpoint para el webhook
app.post('/github-webhook', (req, res) => {
    // Log para ver el payload recibido
    console.log('Payload recibido:', req.body);

    // Extraer datos relevantes del payload
    const { action, workflow_run } = req.body;

    if (workflow_run) {
        const status = workflow_run.conclusion || workflow_run.status;
        const workflowName = workflow_run.name;
        const url = workflow_run.html_url;

        console.log(`Workflow: ${workflowName}`);
        console.log(`Estado: ${status}`);
        console.log(`URL: ${url}`);

        // Procesar lógica aquí (por ejemplo, enviar datos a Jira)
    }

    // Responder a GitHub
    res.status(200).send('Webhook recibido');
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
