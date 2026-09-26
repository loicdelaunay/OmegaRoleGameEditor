import type { StatusTone } from '../types/notifications'

export function inferStatusTone(message: string): StatusTone {
  const normalizedMessage = message.trim().toLowerCase()

  if (
    /impossible|invalide|introuvable|manquant|ignore|bloquee|erreur|verrouille|fermee|aucun calque actif|connecte une salle/.test(
      normalizedMessage,
    )
  ) {
    return 'error'
  }

  if (/annulee|ferme la salle|connexion en cours/.test(normalizedMessage)) {
    return 'warning'
  }

  return 'info'
}
