CREATE TABLE "work_shifts" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "day_of_week" INTEGER NOT NULL,
  "start_time" TEXT NOT NULL,
  "end_time" TEXT NOT NULL,
  CONSTRAINT "work_shifts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "work_shifts_user_id_day_of_week_key" ON "work_shifts"("user_id", "day_of_week");
ALTER TABLE "work_shifts" ADD CONSTRAINT "work_shifts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
