import Anthropic from "@anthropic-ai/sdk";
import express from "express";
import dotenv from "dotenv";
import Database from "better-sqlite3";

const db = new Database("scores.db");

// Crée la table si elle n'existe pas
db.exec(`
  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    joueur TEXT NOT NULL,
    niveau TEXT NOT NULL,
    temps INTEGER NOT NULL,
    victoire INTEGER NOT NULL,
    date TEXT DEFAULT (datetime('now'))
  )
`);

dotenv.config();

const app = express();
const client = new Anthropic();

app.use(express.json());
app.use(express.static("public"));

app.post("/indice", async (req, res) => {
  const { grille, revele, drapeau, rows, cols } = req.body;

  // On construit une représentation textuelle de la grille pour Claude
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
    description += `Rangée ${r}: ${ligne}\n`;
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
});

const PORT = process.env.PORT || 3000;

// Sauvegarder un score
app.post("/score", (req, res) => {
  const { joueur, niveau, temps, victoire } = req.body;
  const stmt = db.prepare("INSERT INTO scores (joueur, niveau, temps, victoire) VALUES (?, ?, ?, ?)");
  stmt.run(joueur, niveau, temps, victoire ? 1 : 0);
  res.json({ ok: true });
});

// Récupérer les meilleurs scores
app.get("/scores", (req, res) => {
  const scores = db.prepare(`
    SELECT joueur, niveau, temps, victoire, date 
    FROM scores 
    WHERE victoire = 1 
    ORDER BY temps ASC 
    LIMIT 10
  `).all();
  res.json(scores);
});

app.listen(PORT, () => console.log(`✅ Serveur lancé sur le port ${PORT}`));