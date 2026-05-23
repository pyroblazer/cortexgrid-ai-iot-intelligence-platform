-- Add unique constraint on AlertRule for (organizationId, name)
CREATE UNIQUE INDEX "AlertRule_organizationId_name_key" ON "AlertRule"("organizationId", "name");
