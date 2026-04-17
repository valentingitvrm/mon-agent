import Anthropic from "@anthropic-ai/sdk";
import express from "express";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const app = express();
const client = new Anthropic();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

await pool.query(`
  CREATE TABLE IF NOT EXISTS scores (
    id SERIAL PRIMARY KEY,
    joueur TEXT NOT NULL,
    niveau TEXT NOT NULL,
    temps INTEGER NOT NULL,
    victoire BOOLEAN NOT NULL,
    date TIMESTAMP DEFAULT NOW()
  )
`);

app.use(express.json());
app.use(express.static("public"));

app.post("/indice", async (req, res) => {
  try {
    const { grille, revele, drapeau, rows, cols } = req.body;

    let description = "Voici la grille du Démineur :\n\n";
    for (let r = 0; r < rows; r++) {
      let ligne = "";
      for (let c = 0; c < cols; c++) {
        if (drapeau[r][c]) ligne += "🚩";
        else if (!revele[r][c]) ligne += "?";
        else if (grille[r][c] === -1) ligne += "💣";
        else if (grille[r][c] === 0) ligne += "·";
        else ligne += grille[r][c];
        ligne += " ";
      }
      description += `Rangée ${r + 1}: ${ligne}\n`;
    }
    description += "\n? = case non révélée, · = case vide, 🚩 = drapeau, les chiffres = nombre de mines adjacentes";

    console.log("Appel API en cours...");
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [{
        role: "user",
        content: `${description}\n\nLes rangées et colonnes commencent à 1 visuellement. Analyse la grille et donne-moi UN seul indice concret : quelle case (rangée X, colonne Y) est la plus sûre à révéler et pourquoi ? Sois bref, 2-3 phrases max.`
      }]
    });

    res.json({ indice: response.content[0].text });

  } catch(err) {
    console.error("ERREUR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/score", async (req, res) => {
  try {
    const { joueur, niveau, temps, victoire } = req.body;
    await pool.query(
      "INSERT INTO scores (joueur, niveau, temps, victoire) VALUES ($1, $2, $3, $4)",
      [joueur, niveau, temps, victoire]
    );
    res.json({ ok: true });
  } catch(err) {
    console.error("ERREUR SCORE:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/scores", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT joueur, niveau, temps, victoire, date
      FROM scores
      WHERE victoire = true
      ORDER BY temps ASC
      LIMIT 10
    `);
    res.json(result.rows);
  } catch(err) {
    console.error("ERREUR SCORES:", err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Serveur lancé sur le port ${PORT}`));