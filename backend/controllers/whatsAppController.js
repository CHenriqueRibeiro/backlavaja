// controllers/whatsAppController.js
const {
  startSession,
  getSession,
  getEntry,
  getStatus: getStatusInfo,
  getLastQr,
  isLogged,
  closeSession,
} = require('../services/waService');

exports.createInstance = async (req, res) => {

  const io = req.app.get('socketio');

  const sessionName =
    req.body?.sessionName ?? req.query?.sessionName ?? req.params?.sessionName;

  // Room opcional (ex.: establishmentId). Se não vier, usa o próprio sessionName
  const room = req.body?.establishmentId ?? req.query?.establishmentId ?? sessionName;

  if (!sessionName) {
    return res.status(400).json({
      message: 'sessionName é obrigatório.',
      debug: { body: req.body, query: req.query, params: req.params },
    });
  }

  try {
    // 1) Já está logado? Não recria nada.
    if (await isLogged(sessionName)) {
      // garante que a room usada será a mais recente
      const entry = getEntry(sessionName);
      if (entry && entry.roomId !== room) entry.roomId = room;
      return res.status(200).json({
        ok: true,
        alreadyLogged: true,
        sessionName,
        room,
      });
    }

    // 2) Sessão já existe (aguardando QR / conectando)? Re-emite o último QR e não recria.
    const entry = getEntry(sessionName);
    if (entry?.client) {
      if (entry.roomId !== room) entry.roomId = room;

      if (entry.lastQr?.base64Qr) {
        io.to(entry.roomId).emit('whatsapp:qr', {
          sessionName,
          base64Qr: entry.lastQr.base64Qr,
          attempts: entry.lastQr.attempts,
          urlCode: entry.lastQr.urlCode,
          lastQrAt: entry.lastQrAt,
        });
      }

      return res.status(200).json({
        ok: true,
        alreadyStarted: true,
        sessionName,
        room: entry.roomId,
      });
    }

    // 3) Não existe: inicia de fato
    await startSession(sessionName, io, room);
    return res.status(200).json({
      ok: true,
      started: true,
      sessionName,
      room,
      message:
        'Instância iniciada. Aguarde evento "whatsapp:qr" no Socket.IO ou use GET /api/whatsapp/qr?sessionName=...',
    });
  } catch (err) {
    console.error('Erro ao iniciar instância:', err);
    return res
      .status(500)
      .json({ message: 'Erro ao iniciar a instância.', error: String(err) });
  }
};

exports.getQr = async (req, res) => {
  const { sessionName } = req.query;
  if (!sessionName) return res.status(400).json({ message: 'sessionName é obrigatório.' });

  const qr = getLastQr(sessionName);
  if (!qr)
    return res.status(404).json({ message: 'QR ainda não disponível ou sessão já logada.' });
  return res.status(200).json(qr);
};

exports.getQrPng = (req, res) => {
  const { sessionName } = req.query;
  const qr = getLastQr(sessionName);
  if (!qr?.base64Qr) return res.status(404).json({ message: 'QR ainda não disponível.' });
  const b64 = qr.base64Qr.includes(',') ? qr.base64Qr.split(',')[1] : qr.base64Qr;
  res.set('Content-Type', 'image/png');
  res.send(Buffer.from(b64, 'base64'));
};

exports.getStatus = async (req, res) => {
  const { sessionName } = req.query;
  if (!sessionName) return res.status(400).json({ message: 'sessionName é obrigatório.' });

  const info = getStatusInfo(sessionName); // { status, statusAt, state, stateAt } ou NOT_INITIALIZED
  const logged = await isLogged(sessionName); // boolean real do WhatsApp
  return res.status(200).json({ sessionName, logged, ...info });
};

function toJid(phone) {
  const n = String(phone).replace(/\D/g, '');
  return phone.includes('@') ? phone : `${n}@c.us`;
}

exports.sendMessage = async (req, res) => {
  const { sessionName, to, message } = req.body;
  const io = req.app.get('socketio');

  if (!sessionName || !to || !message)
    return res.status(400).json({ message: 'sessionName, to e message são obrigatórios.' });

  const client = getSession(sessionName);
  if (!client) return res.status(404).json({ message: 'Sessão não encontrada ou não iniciada.' });

  try {
    const jid = toJid(to);
    const result = await client.sendText(jid, message);
    io.emit('whatsapp:sent', { sessionName, to: jid, ok: true, result });
    return res.status(200).json({ ok: true, result });
  } catch (err) {
    io.emit('whatsapp:sent', { sessionName, to, ok: false, error: String(err) });
    return res.status(500).json({ ok: false, error: err?.message || 'Erro interno' });
  }
};

exports.closeInstance = async (req, res) => {
  const { sessionName } = req.body;
  const io = req.app.get('socketio');

  if (!sessionName) return res.status(400).json({ message: 'sessionName é obrigatório.' });
  const ok = await closeSession(sessionName, io);
  if (!ok) return res.status(404).json({ message: 'Sessão não encontrada.' });
  return res.status(200).json({ message: 'Sessão encerrada.' });
};
