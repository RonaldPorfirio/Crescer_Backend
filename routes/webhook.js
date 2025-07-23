const express = require("express")
const { getPaymentInfo } = require("../config/mercadopago")

const router = express.Router()

// POST /webhook/mercadopago
router.post("/mercadopago", async (req, res) => {
  try {
    console.log("🔔 Webhook recebido:", {
      headers: req.headers,
      body: req.body,
      timestamp: new Date().toISOString(),
    })

    const { type, data } = req.body

    // Responder rapidamente ao Mercado Pago
    res.status(200).send("OK")

    // Processar webhook de forma assíncrona
    if (type === "payment") {
      await processPaymentWebhook(data)
    } else {
      console.log("ℹ️ Tipo de webhook não processado:", type)
    }
  } catch (error) {
    console.error("❌ Erro no webhook:", error)
    res.status(500).send("Error")
  }
})

// Processar webhook de pagamento
async function processPaymentWebhook(data) {
  try {
    if (!data || !data.id) {
      console.warn("⚠️ Webhook sem ID de pagamento")
      return
    }

    console.log("🔍 Processando pagamento:", data.id)

    // Buscar informações completas do pagamento
    const paymentInfo = await getPaymentInfo(data.id)

    console.log("💳 Informações do pagamento:", {
      id: paymentInfo.id,
      status: paymentInfo.status,
      status_detail: paymentInfo.status_detail,
      transaction_amount: paymentInfo.transaction_amount,
      external_reference: paymentInfo.external_reference,
      payer_email: paymentInfo.payer?.email,
    })

    // Processar baseado no status
    switch (paymentInfo.status) {
      case "approved":
        await handleApprovedPayment(paymentInfo)
        break

      case "pending":
        await handlePendingPayment(paymentInfo)
        break

      case "rejected":
        await handleRejectedPayment(paymentInfo)
        break

      default:
        console.log("ℹ️ Status de pagamento não processado:", paymentInfo.status)
    }
  } catch (error) {
    console.error("❌ Erro ao processar webhook de pagamento:", error)
  }
}

// Processar pagamento aprovado
async function handleApprovedPayment(paymentInfo) {
  console.log("✅ Pagamento aprovado:", paymentInfo.id)

  // Aqui você pode:
  // - Atualizar status do pedido no banco de dados
  // - Enviar e-mail de confirmação
  // - Liberar acesso aos cursos
  // - Gerar certificados

  // Exemplo de log estruturado
  console.log("📊 Pagamento processado:", {
    payment_id: paymentInfo.id,
    amount: paymentInfo.transaction_amount,
    customer_email: paymentInfo.payer?.email,
    order_id: paymentInfo.external_reference,
    processed_at: new Date().toISOString(),
  })
}

// Processar pagamento pendente
async function handlePendingPayment(paymentInfo) {
  console.log("⏳ Pagamento pendente:", paymentInfo.id)

  // Aqui você pode:
  // - Atualizar status para pendente
  // - Enviar e-mail informando sobre o status
  // - Configurar verificação periódica
}

// Processar pagamento rejeitado
async function handleRejectedPayment(paymentInfo) {
  console.log("❌ Pagamento rejeitado:", paymentInfo.id)

  // Aqui você pode:
  // - Atualizar status para rejeitado
  // - Enviar e-mail com orientações
  // - Oferecer outras formas de pagamento
}

module.exports = router
