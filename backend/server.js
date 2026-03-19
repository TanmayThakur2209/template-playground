const express = require("express");
const cors = require("cors");
const fs = require("fs-extra");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const { Template } = require("@accordproject/cicero-core");
const { TemplateArchiveProcessor } = require("@accordproject/template-engine");

const app = express();

app.use(cors());
app.use(express.json());

const TEMP_DIR = path.join(__dirname, "temp");

async function createTemplateFiles(id, model, template, logic) {
  const basePath = path.join(TEMP_DIR, id);

  await fs.ensureDir(basePath);
  await fs.ensureDir(path.join(basePath, "model"));
  await fs.ensureDir(path.join(basePath, "text"));
  await fs.ensureDir(path.join(basePath, "logic"));

  await fs.writeFile(
  path.join(basePath, "model", "model.cto"),
  model || `namespace org.example

    @template
    concept MyContract {
    o Double value
    }`
    );

  await fs.writeFile(
    path.join(basePath, "text", "grammar.tem.md"),
    template || "Sample Template"
  );

  await fs.writeFile(
    path.join(basePath, "logic", "logic.ts"),
    logic || ""
  );

await fs.writeFile(
  path.join(basePath, "package.json"),
  JSON.stringify({
    name: "temp-template",
    version: "0.0.1",
    description: "Temporary template",
    accordproject: {
      cicero: "0.25.2",
      template: "clause"
    }
  }, null, 2)
);

  return basePath;
}

app.post("/execute", async (req, res) => {
  const id = uuidv4();

  try {
    const { model, template, logic, data, request } = req.body;

    if (!logic) {
      return res.status(400).json({ error: "Missing logic.ts" });
    }

    const templatePath = await createTemplateFiles(id, model, template, logic);

    const templateInstance = await Template.fromDirectory(templatePath);

    const processor = new TemplateArchiveProcessor(templateInstance);

    let triggerResult;

    try {
      triggerResult = await processor.trigger(data || {}, request || {});
    } catch (logicErr) {
      return res.status(400).json({
        error: "Logic execution failed",
        details: logicErr.message,
      });
    }

    res.json({
      success: true,
      result: triggerResult.result || null,
      state: triggerResult.state || {},
      events: triggerResult.events || [],
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: err.message,
    });

  } finally {
    await fs.remove(path.join(TEMP_DIR, id));
  }
});

app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});