-- AlterTable
ALTER TABLE "Exam" ADD COLUMN     "editalUrl" TEXT;

-- AlterTable
ALTER TABLE "Subject" ALTER COLUMN "examWeight" DROP NOT NULL,
ALTER COLUMN "examWeight" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Topic" ALTER COLUMN "weight" DROP NOT NULL,
ALTER COLUMN "weight" DROP DEFAULT;
