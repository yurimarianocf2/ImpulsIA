-- Check the current produtos table schema
-- Run this to see what columns exist

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'produtos'
ORDER BY ordinal_position;

-- Check if validade column exists specifically
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'produtos' AND column_name = 'validade'
        ) THEN 'validade column EXISTS' 
        ELSE 'validade column MISSING'
    END as validade_status;

-- Check if data_vencimento exists instead
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'produtos' AND column_name = 'data_vencimento'
        ) THEN 'data_vencimento column EXISTS' 
        ELSE 'data_vencimento column MISSING'
    END as data_vencimento_status;

-- Count products in the table
SELECT COUNT(*) as total_produtos FROM produtos;

-- Check farmacia table
SELECT id, nome FROM farmacias LIMIT 5;