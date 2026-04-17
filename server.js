import Anthropic from "@anthropic-ai/sdk";
import express from "express";
import dotenv from "dotenv";

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
    model: "claude-opus-4-5",
    max_tokens: 300,
    messages: [{
      role: "user",
      content: `${description}\n\nAnalyse la grille et donne-moi UN seul indice concret : quelle case (rangée, colonne) est la plus sûre à révéler et pourquoi ? Sois bref, 2-3 phrases max.`
    }]
  });

  res.json({ indice: response.content[0].text });
});

app.listen(3000, () => console.log("✅ Serveur lancé sur http://localhost:3000"));