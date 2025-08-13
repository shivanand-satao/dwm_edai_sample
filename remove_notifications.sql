-- Remove notifications feature from the database
USE db;

-- Drop the notifications table
DROP TABLE IF EXISTS notifications;

-- Note: This will permanently remove all notification data
-- Make sure to backup your database before running this script if needed