//const Budget = require("../models/Budget");
const fetch = require("node-fetch"); // importe o método para acessar o io global
const { PDFDocument } = require("pdf-lib");
const Establishment = require("../models/Establishment");
const streamifier = require("streamifier");
const { getIO } = require("../config/socket");

exports.createBudget = async (req, res) => {
  const cloudinary = require("../config/cloudinary");
  try {
    const payload = JSON.parse(req.body.data);
    const {
      phone,
      clientName,
      serviceDescription,
      establishmentId,
      date,
      dateValidate,
      deliveryDate,
      value,
      services,
      plate,
      brand,
      model,
      year,
      referencePoint,
      address,
      observation,
    } = payload;

    if (!req.file || !req.file.buffer) {
      return res
        .status(400)
        .json({ error: "Arquivo PDF não enviado corretamente" });
    }

    const establishment = await Establishment.findById(establishmentId);
    if (!establishment) {
      return res.status(404).json({ error: "Estabelecimento não encontrado" });
    }

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: "image",
          public_id: `orcamento-${Date.now()}`,
          folder: "orcamentos",
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
    });

    const newBudget = {
      phone,
      clientName,
      serviceDescription,
      plate,
      brand,
      model,
      year,
      referencePoint,
      address,
      observation,
      date: date || new Date(),
      dateValidate: dateValidate || new Date(),
      deliveryDate: deliveryDate || new Date(),
      value,
      services,
      documentUrl: result.secure_url,
      signatureUrl: "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    establishment.budgets.push(newBudget);
    await establishment.save();

    const addedBudget = establishment.budgets[establishment.budgets.length - 1];
    const publicLink = `https://adminlavaja.vercel.app/orcamento?id=${addedBudget._id}`;
    try {
      const controller = new AbortController();
      const sanitizedPhone = phone.replace(/\D/g, "");
      console.log("Enviando WhatsApp para:", sanitizedPhone);
      const whatsappResponse = await fetch(
        "https://gateway.apibrasil.io/api/v2/whatsapp/sendText",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            DeviceToken: "d98654e6-d47b-48a6-89d5-7cac993c371c",
            Authorization:
              "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL2dhdGV3YXkuYXBpYnJhc2lsLmlvL2FwaS92Mi9hdXRoL3JlZ2lzdGVyIiwiaWF0IjoxNzQ2MjkzODEwLCJleHAiOjE3Nzc4Mjk4MTAsIm5iZiI6MTc0NjI5MzgxMCwianRpIjoiUmpxOUNqcTgxeEJCMjBXMSIsInN1YiI6IjE1MDQwIiwicHJ2IjoiMjNiZDVjODk0OWY2MDBhZGIzOWU3MDFjNDAwODcyZGI3YTU5NzZmNyJ9.VW_KwDX30rsXJBKn7KpR9cqSK1HIz9Wej1qyeaFqs3Y",
            signal: controller.signal,
          },
          body: JSON.stringify({
            number: `55${sanitizedPhone}`,
            text: `Olá ${clientName}!\n\nSeu orçamento está disponível no link abaixo:\n\n${publicLink}`,
          }),
        }
      );

      if (!whatsappResponse.ok) {
        const errorText = await whatsappResponse.text();
        console.error("Erro na API Brasil:", errorText);
      }
    } catch (err) {
      if (err.name === "AbortError") {
        console.error("Timeout na chamada WhatsApp");
      } else {
        console.error("Erro ao enviar WhatsApp:", err);
      }
    }

    res.status(201).json({
      ...addedBudget.toObject(),
      publicLink,
    });
  } catch (err) {
    console.error("Erro ao criar orçamento:", err);
    res.status(500).json({ error: "Erro ao criar orçamento" });
  }
};

exports.deleteBudget = async (req, res) => {
  try {
    const { establishmentId, budgetId } = req.params;

    const establishment = await Establishment.findById(establishmentId);
    if (!establishment) {
      return res.status(404).json({ error: "Estabelecimento não encontrado" });
    }

    const index = establishment.budgets.findIndex(
      (b) => String(b._id) === budgetId
    );
    if (index === -1) {
      return res.status(404).json({ error: "Orçamento não encontrado" });
    }

    establishment.budgets.splice(index, 1);
    await establishment.save();

    res.status(200).json({ message: "Orçamento removido com sucesso" });
  } catch (err) {
    console.error("Erro ao deletar orçamento:", err);
    res.status(500).json({ error: "Erro ao deletar orçamento" });
  }
};

exports.getPublicBudget = async (req, res) => {
  try {
    const { budgetId } = req.params;
    const establishment = await Establishment.findOne({
      "budgets._id": budgetId,
    });

    if (!establishment) {
      return res.status(404).json({ error: "Orçamento não encontrado" });
    }

    const budget = establishment.budgets.id(budgetId).toObject();

    if (budget.signedDocumentUrl) {
      budget.documentUrl = budget.signedDocumentUrl;
    }

    res.status(200).json(budget);
  } catch (err) {
    console.error("Erro ao buscar orçamento:", err);
    res.status(500).json({ error: "Erro ao buscar orçamento" });
  }
};

// Adicione isso no topo (após os requires do Express, Cloudinary etc.)

exports.signBudget = async (req, res) => {
  const cloudinary = require("../config/cloudinary");
  try {
    const { budgetId } = req.params;

    const establishment = await Establishment.findOne({
      "budgets._id": budgetId,
    });
    if (!establishment) {
      return res.status(404).json({ error: "Orçamento não encontrado" });
    }

    const budget = establishment.budgets.id(budgetId);

    if (!req.file || !req.file.buffer) {
      return res
        .status(400)
        .json({ error: "Assinatura não enviada corretamente" });
    }

    // 1️⃣ Upload da assinatura
    const signatureResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: "image",
          public_id: `assinatura-${Date.now()}`,
          folder: "orcamentos/assinaturas",
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
    });

    budget.signatureUrl = signatureResult.secure_url;
    budget.updatedAt = new Date();

    // 2️⃣ Baixa o PDF original
    const pdfResponse = await fetch(budget.documentUrl);
    const pdfBuffer = await pdfResponse.arrayBuffer();

    // 3️⃣ Baixa a imagem da assinatura
    const signatureResponse = await fetch(budget.signatureUrl);
    const signatureBuffer = await signatureResponse.arrayBuffer();

    // 4️⃣ Usa pdf-lib para colocar a assinatura no PDF
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const signatureImage = await pdfDoc.embedPng(signatureBuffer);

    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    firstPage.drawImage(signatureImage, {
      x: 50,
      y: 50,
      width: 150,
      height: 50,
    });

    const signedPdfBytes = await pdfDoc.save();

    // 5️⃣ Upload do PDF assinado
    const signedPdfUpload = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: "raw",
          public_id: `orcamento-assinado-${Date.now()}`,
          folder: "orcamentos/assinados",
          format: "pdf",
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      streamifier
        .createReadStream(Buffer.from(signedPdfBytes))
        .pipe(uploadStream);
    });

    budget.signedDocumentUrl = signedPdfUpload.secure_url;
    await establishment.save();

    // 🚀 Emitir evento Socket.IO aqui
    const io = getIO(); // chama a função para obter o io
    io.emit("budgetSigned", {
      budgetId: budget._id,
      signatureUrl: budget.signatureUrl,
      signedDocumentUrl: budget.signedDocumentUrl,
    });

    res.status(200).json({
      message: "Assinatura enviada e documento assinado gerado com sucesso",
      signatureUrl: budget.signatureUrl,
      signedDocumentUrl: budget.signedDocumentUrl,
    });
  } catch (err) {
    console.error("Erro ao enviar assinatura:", err);
    res.status(500).json({ error: "Erro ao enviar assinatura" });
  }
};
