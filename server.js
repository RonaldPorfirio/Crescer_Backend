const express = require("express")
const cors = require("cors") // Adicionar esta linha
require("dotenv").config()

const paymentRoutes = require("./routes/payment")
const webhookRoutes = require("./routes/webhook")

const app = express()
const port = process.env.PORT || 3001

// Configuração do CORS para produção
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:5500", // Usa a variável de ambiente
  optionsSuccessStatus: 200,
}
app.use(cors(corsOptions)) // Adicionar esta linha

app.use(express.json())
app.use(express.static("public"))

// Rotas da API
app.use("/api/payment", paymentRoutes)
app.use("/webhook", webhookRoutes)

// Rota de status
app.get("/api/status", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() })
})

app.listen(port, () => {
  console.log(`🚀 Servidor rodando na porta ${port}`)
  console.log(`🔗 Frontend URL configurado: ${corsOptions.origin}`)
})
