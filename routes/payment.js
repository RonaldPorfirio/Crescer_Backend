const express = require("express")
const { body, validationResult } = require("express-validator")
const { createPaymentPreference } = require("../config/mercadopago")

const router = express.Router()

// Middleware de validação para criação de preferência
const validateCreatePreference = [
  body("items").isArray({ min: 1 }).withMessage("Pelo menos um item é obrigatório"),

  body("items.*.title")
    .notEmpty()
    .isLength({ min: 1, max: 256 })
    .withMessage("Título do item é obrigatório (máximo 256 caracteres)"),

  body("items.*.unit_price").isFloat({ min: 0 }).withMessage("Preço deve ser um número válido maior ou igual a 0"),

  body("items.*.quantity")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Quantidade deve ser um número inteiro maior que 0"),

  body("customer_email").optional().isEmail().withMessage("E-mail deve ter formato válido"),
]

// POST /api/payment/create-preference
router.post("/create-preference", validateCreatePreference, async (req, res) => {
  try {
    // Verificar erros de validação
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Dados inválidos",
        details: errors.array(),
      })
    }

    const { items, customer_email, order_id } = req.body

    // Log da requisição
    console.log(`📝 Recebida nova solicitação de pagamento para ${items.length} item(ns).`)

    // Criar preferência no Mercado Pago
    const preference = await createPaymentPreference(items, {
      customerEmail: customer_email,
      orderId: order_id || `order_${Date.now()}`,
    })

    // Resposta de sucesso
    res.json({
      success: true,
      preference: {
        id: preference.id,
        init_point: preference.init_point,
        sandbox_init_point: preference.sandbox_init_point,
        total_amount: preference.total_amount,
        items_count: preference.items_count,
        expires_at: preference.expires_at,
      },
      message: "Preferência de pagamento criada com sucesso",
    })
  } catch (error) {
    console.error("❌ Erro na rota create-preference:", error)

    res.status(500).json({
      error: "Erro interno do servidor",
      message: process.env.NODE_ENV === "development" ? error.message : "Falha ao processar pagamento",
      timestamp: new Date().toISOString(),
    })
  }
})

// GET /api/payment/config
router.get("/config", (req, res) => {
  res.json({
    public_key: process.env.MERCADOPAGO_PUBLIC_KEY,
    currency: "BRL",
    max_installments: 12,
    environment: process.env.NODE_ENV || "development",
  })
})

// GET /api/payment/status
router.get("/status", (req, res) => {
  const isConfigured = !!(
    process.env.MERCADOPAGO_ACCESS_TOKEN && process.env.MERCADOPAGO_ACCESS_TOKEN !== "TEST-your-access-token-here"
  )

  res.json({
    configured: isConfigured,
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  })
})

module.exports = router
