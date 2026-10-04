-- Remplace l'unicité globale (session_id, user_id) par un index unique
-- partiel qui ne porte que sur les réservations actives. Une réservation
-- CANCELLED ne doit pas empêcher une nouvelle réservation sur la même
-- séance (bug trouvé en testant le flux de réservation depuis l'app
-- mobile : un adhérent qui annule puis réserve à nouveau se heurtait à
-- une erreur 500 due à la contrainte trop stricte).
DROP INDEX IF EXISTS "booking_session_user_active_unique";

CREATE UNIQUE INDEX "booking_session_user_active_unique"
  ON "bookings" ("session_id", "user_id")
  WHERE "status" IN ('CONFIRMED', 'WAITLISTED', 'ATTENDED');
