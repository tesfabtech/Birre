-- Create the new enum type
CREATE TYPE "MoneySourceFrequency" AS ENUM (
  'WEEKLY',
  'BIWEEKLY',
  'TWICE_MONTHLY',
  'MONTHLY',
  'CUSTOM'
);

-- Convert the existing frequency values without losing them
ALTER TABLE "MoneySource"
ALTER COLUMN "frequency" TYPE "MoneySourceFrequency"
USING "frequency"::text::"MoneySourceFrequency";

-- Remove the temporary period schedule table
DROP TABLE "FinancialPeriodSchedule";