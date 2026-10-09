-- CreateTable
CREATE TABLE "program_exercise_sets" (
    "id" TEXT NOT NULL,
    "program_exercise_id" TEXT NOT NULL,
    "set_number" INTEGER NOT NULL,
    "reps" INTEGER,
    "weight_kg" DECIMAL(6,2),
    "rest_seconds" INTEGER,

    CONSTRAINT "program_exercise_sets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "program_exercise_sets_program_exercise_id_idx" ON "program_exercise_sets"("program_exercise_id");

-- AddForeignKey
ALTER TABLE "program_exercise_sets" ADD CONSTRAINT "program_exercise_sets_program_exercise_id_fkey" FOREIGN KEY ("program_exercise_id") REFERENCES "program_exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;
