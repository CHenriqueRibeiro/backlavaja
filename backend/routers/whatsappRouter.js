const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/whatsAppController');

router.get('/_ping', (_req, res) => res.json({ ok: true, at: '/whatsapp/_ping' }));
router.post('/create-instance', ctrl.createInstance);
router.get('/qr', ctrl.getQr);
router.get('/qr.png', ctrl.getQrPng); // opcional: ver o QR como imagem
router.get('/status', ctrl.getStatus);
router.post('/send-message', ctrl.sendMessage);
router.post('/close-instance', ctrl.closeInstance);

module.exports = router;
