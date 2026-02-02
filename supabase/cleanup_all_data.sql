-- ============================================
-- CLEANUP SCRIPT - REMOVES ALL DATA
-- ============================================
-- WARNING: This will delete ALL contracts and related data
-- Run this before re-running the seed files for a clean demo

-- Delete in order to respect foreign key constraints
DELETE FROM passthrough_actuals;
DELETE FROM passthrough_costs;
DELETE FROM vendor_revenue_share;
DELETE FROM milestone_changes;
DELETE FROM milestones;
DELETE FROM documents;
DELETE FROM change_orders;
DELETE FROM contracts;
DELETE FROM users;

-- Verify deletion
SELECT 'Contracts remaining: ' || COUNT(*) FROM contracts;
SELECT 'Users remaining: ' || COUNT(*) FROM users;
SELECT 'Milestones remaining: ' || COUNT(*) FROM milestones;
SELECT 'Change orders remaining: ' || COUNT(*) FROM change_orders;
