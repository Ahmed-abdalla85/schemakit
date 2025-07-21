SELECT * 
FROM system_fields 
WHERE entity_id = ? AND is_active = ? 
ORDER BY order_index ASC