-- CreateIndex
CREATE INDEX "ActivityLog_activityId_timestamp_idx" ON "ActivityLog"("activityId", "timestamp");

-- CreateIndex
CREATE INDEX "Message_groupId_timestamp_idx" ON "Message"("groupId", "timestamp");
