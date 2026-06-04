/**
 * Log de depuración opcional.
 *
 * Este módulo existe para evitar fallos cuando el backend intenta importar
 * una utilidad de logging durante el desarrollo.
 */

export function agentLog(...args) {
  // Si quieres forzar logging, setea AGENT_LOG=true.
  if (process.env.AGENT_LOG !== 'true') return
  // eslint-disable-next-line no-console
  console.log('[agent-log]', ...args)
}

export default agentLog

