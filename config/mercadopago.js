const { MercadoPagoConfig, Preference, Payment } = require("mercadopago")

// Configuração do cliente Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
  options: {
    timeout: 5000,
    idempotencyKey: "abc",
  },
})

// Instâncias dos serviços
const preference = new Preference(client)
const payment = new Payment(client)

// Configurações padrão
const DEFAULT_CONFIG = {
  currency: "BRL",
  maxInstallments: 12,
  minInstallmentAmount: 5.0,
  expirationDays: 7,
  autoReturn: "approved",
}

// Validar configuração
function validateConfig() {
  const requiredEnvVars = ["MERCADOPAGO_ACCESS_TOKEN", "SUCCESS_URL", "FAILURE_URL", "PENDING_URL"]

  const missing = requiredEnvVars.filter((envVar) => !process.env[envVar])

  if (missing.length > 0) {
    throw new Error(`Variáveis de ambiente obrigatórias não configuradas: ${missing.join(", ")}`)
  }

  if (process.env.MERCADOPAGO_ACCESS_TOKEN === "TEST-your-access-token-here") {
    throw new Error("Configure um Access Token válido do Mercado Pago")
  }

  return true
}

// Criar preferência de pagamento
async function createPaymentPreference(items, options = {}) {
  try {
    validateConfig()

    // Validar itens
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("Itens do pedido são obrigatórios")
    }

    // Processar itens
    const processedItems = items.map((item, index) => {
      if (!item.title || !item.unit_price) {
        throw new Error(`Item ${index + 1}: título e preço são obrigatórios`)
      }

      return {
        id: item.id || `item_${index + 1}`,
        title: String(item.title).substring(0, 256), // Limite do MP
        description: item.description ? String(item.description).substring(0, 600) : undefined,
        quantity: Number.parseInt(item.quantity) || 1,
        unit_price: Number.parseFloat(item.unit_price),
        currency_id: DEFAULT_CONFIG.currency,
      }
    })

    // Calcular total
    const totalAmount = processedItems.reduce((sum, item) => {
      return sum + item.unit_price * item.quantity
    }, 0)

    // Configurar preferência
    const preferenceData = {
      items: processedItems,

      // URLs de retorno (camelCase para o SDK v2)
      backUrls: {
        success: process.env.SUCCESS_URL,
        failure: process.env.FAILURE_URL,
        pending: process.env.PENDING_URL,
      },
      autoReturn: DEFAULT_CONFIG.autoReturn,

      // Configurações de pagamento
      payment_methods: {
        excluded_payment_methods: [],
        excluded_payment_types: [],
        installments: DEFAULT_CONFIG.maxInstallments,
        default_installments: 1,
      },

      // Configurações de expiração
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + DEFAULT_CONFIG.expirationDays * 24 * 60 * 60 * 1000).toISOString(),

      // Informações adicionais
      statement_descriptor: "CRESCER CURSOS",
      external_reference: options.orderId || `order_${Date.now()}`,

      // Notificação webhook
      notification_url: process.env.WEBHOOK_URL,

      // Metadados
      metadata: {
        order_id: options.orderId,
        customer_email: options.customerEmail,
        total_amount: totalAmount,
        created_at: new Date().toISOString(),
      },
    }

    // Criar preferência
    const result = await preference.create({ body: preferenceData })

    console.log("✅ Preferência criada:", {
      id: result.id,
      total: totalAmount,
      items: processedItems.length,
    })

    return {
      id: result.id,
      init_point: result.init_point,
      sandbox_init_point: result.sandbox_init_point,
      total_amount: totalAmount,
      items_count: processedItems.length,
      expires_at: preferenceData.expiration_date_to,
    }
  } catch (error) {
    console.error("❌ Erro ao criar preferência:", error)
    throw new Error(`Falha ao criar preferência de pagamento: ${error.message}`)
  }
}

// Buscar informações de pagamento
async function getPaymentInfo(paymentId) {
  try {
    const result = await payment.get({ id: paymentId })
    return result
  } catch (error) {
    console.error("❌ Erro ao buscar pagamento:", error)
    throw new Error(`Falha ao buscar informações do pagamento: ${error.message}`)
  }
}

module.exports = {
  createPaymentPreference,
  getPaymentInfo,
  validateConfig,
  DEFAULT_CONFIG,
}
