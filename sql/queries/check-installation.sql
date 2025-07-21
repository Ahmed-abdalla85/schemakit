SELECT COUNT(*) as count 
FROM sqlite_master 
WHERE type = ? AND name = ?