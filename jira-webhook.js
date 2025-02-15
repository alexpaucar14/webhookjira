const express = require("express");
const axios = require("axios");

const app = express();
const PORT = 3000;

// Middleware para parsear JSON
app.use(express.json());

// Configuración de GitHub
require("dotenv").config();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = process.env.REPO_OWNER;
const REPO_NAME = process.env.REPO_NAME;
const WORKFLOW_FILE = process.env.WORKFLOW_FILE;

// Endpoint para manejar eventos de Jira
app.post("/jira-webhook", async (req, res) => {
    try {
        const { webhookEvent, issue } = req.body;

        console.log("Evento recibido:", webhookEvent);

        // Filtrar eventos específicos
        if (webhookEvent === "jira:issue_updated") {
            const issueKey = issue.key;
            const status = issue.fields.status.name;

            console.log(`Issue ${issueKey} actualizado, estado: ${status}`);

            console.log("Evento REPO_OWNER:", REPO_OWNER);
            console.log("Evento REPO_NAME:", REPO_NAME);
            console.log("Evento WORKFLOW_FILE:", WORKFLOW_FILE);
            // Condición para ejecutar el workflow
            if (status === "In Progress") {
                console.log("Ejecutando workflow en GitHub...");

                // Llamar a la API de GitHub para ejecutar el workflow
                const response = await axios.post(
                    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
                    {
                        ref: "main", // Rama del repositorio
                        inputs: {
                            issue_key: issueKey, // Datos opcionales para el workflow
                        },
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${GITHUB_TOKEN}`,
                            Accept: "application/vnd.github+json",
                        },
                    }
                );

                console.log("Workflow ejecutado:", response.data);
            }
        }

        res.status(200).send("Evento procesado correctamente.");
    } catch (error) {
        console.error("Error al procesar el evento:", error.message);
        res.status(500).send("Error interno del servidor.");
    }
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
