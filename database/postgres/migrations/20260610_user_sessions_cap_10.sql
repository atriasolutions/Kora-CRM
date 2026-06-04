-- Conserva como máximo 10 sesiones recientes por usuario (elimina el exceso más antiguo).

DELETE FROM crm_user_sessions
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           row_number() OVER (
             PARTITION BY user_id ORDER BY occurred_at DESC
           ) AS rn
    FROM crm_user_sessions
  ) ranked
  WHERE rn > 10
);
