// services/waService.js
const wppconnect = require('@wppconnect-team/wppconnect');

/**
 * Map:
 * sessionName -> {
 *   client, lastQr, lastQrAt,
 *   status, statusAt,        // statusFind (isLogged, qrReadSuccess, browserClose...)
 *   state, stateAt,          // onStateChange (PAIRING, CONNECTED, TIMEOUT...)
 *   roomId
 * }
 */
const sessions = new Map();

async function startSession(sessionName, io, roomIdArg) {
  const existing = sessions.get(sessionName);
  const roomId = roomIdArg || existing?.roomId || sessionName;

  if (existing?.client) {
    // sessão já criada; só atualiza a room e devolve o client
    existing.roomId = roomId;
    return existing.client;
  }

  sessions.set(sessionName, {
    client: null,
    lastQr: null,
    lastQrAt: null,
    status: 'INITIALIZING',
    statusAt: new Date().toISOString(),
    state: undefined,
    stateAt: undefined,
    roomId,
  });

  const client = await wppconnect.create({
    session: sessionName,
    headless: true,
    useChrome: true,
    browserArgs: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
    ],
    logQR: false,
    tokenStore: 'file',
    folderNameToken: './tokens',
    autoClose: 0,
    deviceName: `LavaJá - ${sessionName}`,

    catchQR: (base64Qr, asciiQR, attempts, urlCode) => {
      const entry = sessions.get(sessionName);
      if (!entry) return;
      entry.lastQr = { base64Qr, asciiQR, attempts, urlCode };
      entry.lastQrAt = new Date().toISOString();
      entry.status = 'QRCODE';
      entry.statusAt = new Date().toISOString();

      // 🔊 Envia QR para a room
      io.to(entry.roomId).emit('whatsapp:qr', {
        sessionName,
        base64Qr,
        attempts,
        urlCode,
        lastQrAt: entry.lastQrAt,
      });
    },

    statusFind: (statusSession) => {
      const entry = sessions.get(sessionName);
      if (!entry) return;
      entry.status = statusSession || 'UNKNOWN';
      entry.statusAt = new Date().toISOString();

      // 🔊 Status de alto nível (isLogged, qrReadSuccess, browserClose...)
      io.to(entry.roomId).emit('whatsapp:status', {
        sessionName,
        status: entry.status,
        statusAt: entry.statusAt,
      });
    },
  });

  // Mudança de estado de conexão (PAIRING, CONNECTED, TIMEOUT, etc.)
  client.onStateChange((state) => {
    const entry = sessions.get(sessionName);
    if (!entry) return;
    entry.state = state;
    entry.stateAt = new Date().toISOString();

    io.to(entry.roomId).emit('whatsapp:state', {
      sessionName,
      state,
      at: entry.stateAt,
    });
  });

  // Mensagens recebidas
  /*client.onMessage((msg) => {
    const entry = sessions.get(sessionName);
    if (!entry) return;
    io.to(entry.roomId).emit('whatsapp:message', { sessionName, msg });
  });*/

  const entry = sessions.get(sessionName);
  if (entry) entry.client = client;

  return client;
}

function getEntry(sessionName) {
  return sessions.get(sessionName) || null;
}

function getSession(sessionName) {
  return sessions.get(sessionName)?.client || null;
}

function getStatus(sessionName) {
  const e = sessions.get(sessionName);
  return e
    ? { status: e.status, statusAt: e.statusAt, state: e.state, stateAt: e.stateAt }
    : { status: 'NOT_INITIALIZED' };
}

function getLastQr(sessionName) {
  const e = sessions.get(sessionName);
  return e ? { ...e.lastQr, lastQrAt: e.lastQrAt } : null;
}

async function isLogged(sessionName) {
  const client = sessions.get(sessionName)?.client;
  if (!client) return false;
  try {
    return await client.isLogged();
  } catch {
    return false;
  }
}

async function closeSession(sessionName, io) {
  const entry = sessions.get(sessionName);
  if (!entry?.client) return false;

  try {
    await entry.client.close();
  } catch {}

  sessions.delete(sessionName);

  // 🔊 Notifica fechamento
  if (io && entry?.roomId) {
    io.to(entry.roomId).emit('whatsapp:closed', { sessionName });
  }
  return true;
}


function toJid(phone) {
  const n = String(phone).replace(/\D/g, '');
  return phone.includes('@') ? phone : `${n}@c.us`;
}

/** Envia texto garantindo que a sessão está ativa */
async function sendTextMessage(sessionName, to, message) {
  const client = getSession(sessionName);
  if (!client) {
    const err = new Error('SESSION_NOT_ACTIVE');
    err.code = 'SESSION_NOT_ACTIVE';
    throw err;
  }
  return client.sendText(toJid(to), message);
}
module.exports = {
  startSession,
  getEntry,
  getSession,
  getStatus,
  getLastQr,
  isLogged,
  closeSession,
  sendTextMessage,   
};
