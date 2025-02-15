const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const JIRA_BASE_URL = "https://tu-jira-instance.atlassian.net/rest/api/3";
const JIRA_USER = "tu-email@empresa.com";
const JIRA_API_TOKEN = "tu-token-jira";
const GITHUB_TOKEN = "tu-github-token";
const GITHUB_REPO = "tu-org/tu-repo";
const JIRA_HEADERS = {
    Authorization: `Basic ${Buffer.from(`${JIRA_USER}:${JIRA_API_TOKEN}`).toString("base64")}`,
    "Content-Type": "application/json",
};

// Webhook endpoint en Node.js para recibir eventos de Jira
app.post("/jira-webhook-io", async (req, res) => {
    try {
        const issue = req.body.issue;
        const status = issue.fields.status.name;

        if (status !== "In QA") {
            console.log(`El issue ${issue.key} no está en "In QA".`);
            return res.status(200).send("No action needed.");
        }

        const subtasks = issue.fields.subtasks || [];
        const allSubtasksValid = subtasks.every((subtask) =>
            ["QE - Verificación Code Coverage", "QE - Preparación de Entorno de Prueba"].includes(subtask.fields.summary) &&
            ["Done", "No Aplica"].includes(subtask.fields.status.name)
        );

        if (!allSubtasksValid) {
            console.log(`Las subtareas del issue ${issue.key} no cumplen los criterios.`);
            return res.status(200).send("No action needed.");
        }

        const securityReviewIssue = issue.fields.issuelinks.find(
            (link) => link.type.name === "Relates" && link.inwardIssue.fields.issuetype.name === "Revisión Seguridad"
        );

        if (!securityReviewIssue) {
            console.log(`No se encontró un issue de "Revisión Seguridad" relacionado con ${issue.key}.`);
            return res.status(200).send("No action needed.");
        }

        const securityReviewStatus = securityReviewIssue.inwardIssue.fields.status.name;
        if (!["Habilitado UAT", "Habilitado Pase Producción"].includes(securityReviewStatus)) {
            console.log(`El issue de seguridad ${securityReviewIssue.inwardIssue.key} no está en el estado adecuado.`);
            return res.status(200).send("No action needed.");
        }

        console.log(`Condiciones cumplidas para ${issue.key}. Aprobando PR en GitHub...`);
        await approveGitHubPR();

        console.log(`Transicionando el issue ${issue.key} a "Ready for UAT"...`);
        await transitionJiraIssue(issue.key, "Ready for UAT");

        res.status(200).send("PR aprobado y issue actualizado.");
    } catch (error) {
        console.error("Error procesando webhook:", error.message);
        res.status(500).send("Error interno del servidor");
    }
});

// Función para aprobar un PR en GitHub
async function approveGitHubPR() {
    const pullRequestNumber = 123; // Reemplazar con lógica real para obtener el PR
    const url = `https://api.github.com/repos/${GITHUB_REPO}/pulls/${pullRequestNumber}/reviews`;

    await axios.post(
        url,
        { event: "APPROVE" },
        { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: "application/vnd.github.v3+json" } }
    );
    console.log(`PR #${pullRequestNumber} aprobado.`);
}

// Función para transicionar un issue en Jira
async function transitionJiraIssue(issueKey, newStatus) {
    const transitionId = await getJiraTransitionId(issueKey, newStatus);
    if (!transitionId) return;

    const url = `${JIRA_BASE_URL}/issue/${issueKey}/transitions`;
    await axios.post(url, { transition: { id: transitionId } }, { headers: JIRA_HEADERS });
    console.log(`Issue ${issueKey} transicionado a ${newStatus}.`);
}

// Obtiene el ID de transición en Jira
async function getJiraTransitionId(issueKey, newStatus) {
    const url = `${JIRA_BASE_URL}/issue/${issueKey}/transitions`;
    const response = await axios.get(url, { headers: JIRA_HEADERS });
    const transition = response.data.transitions.find((t) => t.name === newStatus);
    return transition ? transition.id : null;
}

// Inicia el servidor
app.listen(3000, () => console.log("Servidor corriendo en puerto 3000"));
