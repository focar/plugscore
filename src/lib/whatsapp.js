// /src/lib/whatsapp.js

import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState
} from 'baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import path from 'path';

// Objeto para armazenar as sessões ativas e os status, indexados pelo userId
const activeSessions = {};
const sessionStatus = {};

const logger = pino({ level: 'silent' });

/**
 * Inicia uma sessão de WhatsApp para um utilizador específico.
 * @param {string} userId - O ID do utilizador do Supabase.
 */
export async function startWhatsApp(userId) {
  if (!userId) {
    throw new Error("O ID do utilizador é obrigatório para iniciar a sessão.");
  }

  // Se já existe uma sessão ativa para este utilizador, não faz nada.
  if (activeSessions[userId]) {
    console.log(`[${userId}] Sessão já existe.`);
    return activeSessions[userId];
  }

  console.log(`[${userId}] Iniciando nova sessão do WhatsApp...`);
  // Define o status inicial para este utilizador específico
  sessionStatus[userId] = { status: 'INITIALIZING', qr: null };

  // Usa o userId para criar uma pasta de autenticação única para cada utilizador
  const authPath = path.join(process.cwd(), 'whatsapp-sessions', userId);
  const { state, saveCreds } = await useMultiFileAuthState(authPath);

  const session = makeWASocket({
    auth: state,
    printQRInTerminal: false, // Nunca imprimir QR no terminal do servidor
    logger,
    browser: ['PlugScore', 'Chrome', '1.0.0']
  });

  // Armazena a sessão ativa na memória
  activeSessions[userId] = session;

  // Evento para salvar as credenciais na pasta correta do utilizador
  session.ev.on('creds.update', saveCreds);

  // Evento para monitorar o status da conexão
  session.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log(`[${userId}] QR Code recebido.`);
      sessionStatus[userId] = { status: 'QR_RECEIVED', qr: qr };
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log(`[${userId}] Conexão fechada. Motivo: ${lastDisconnect.error}, reconectar: ${shouldReconnect}`);
      
      // Limpa a sessão da memória e define o status como desconectado
      delete activeSessions[userId];
      sessionStatus[userId] = { status: 'DISCONNECTED', qr: null };

    } else if (connection === 'open') {
      console.log(`[${userId}] Conexão aberta com sucesso!`);
      sessionStatus[userId] = { status: 'CONNECTED', qr: null };
    }
  });

  return session;
}

/**
 * Retorna o status da sessão de um utilizador específico.
 * @param {string} userId - O ID do utilizador.
 */
export function getSessionStatus(userId) {
  // Retorna o status armazenado na memória ou 'DISCONNECTED' se não houver nada
  return sessionStatus[userId] || { status: 'DISCONNECTED', qr: null };
}

/**
 * Retorna a instância da sessão ativa para um utilizador.
 * @param {string} userId - O ID do utilizador.
 */
export function getSession(userId) {
  return activeSessions[userId];
}