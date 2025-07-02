-- Fix validade column in produtos table
-- This ensures the API can find the expiration date column

-- Check if the table exists and what columns it has
DO $$
BEGIN
    -- First, check if validade column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'produtos' 
        AND column_name = 'validade'
    ) THEN
        -- Check if data_vencimento exists instead
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'produtos' 
            AND column_name = 'data_vencimento'
        ) THEN
            -- Rename data_vencimento to validade for consistency
            RAISE NOTICE 'Renaming data_vencimento to validade for API compatibility';
            ALTER TABLE produtos RENAME COLUMN data_vencimento TO validade;
        ELSE
            -- Add validade column if neither exists
            RAISE NOTICE 'Adding validade column to produtos table';
            ALTER TABLE produtos ADD COLUMN validade DATE;
            
            -- Add comment for documentation
            COMMENT ON COLUMN produtos.validade IS 'Data de validade do produto (YYYY-MM-DD)';
            
            -- Create index for performance on expiration queries
            CREATE INDEX IF NOT EXISTS idx_produtos_validade 
            ON produtos(farmacia_id, validade) 
            WHERE ativo = true AND validade IS NOT NULL;
        END IF;
    ELSE
        RAISE NOTICE 'Column validade already exists in produtos table';
    END IF;
END $$;

-- Ensure we have proper indexes for expiring products queries
CREATE INDEX IF NOT EXISTS idx_produtos_expiring 
ON produtos(farmacia_id, validade, ativo) 
WHERE ativo = true AND validade IS NOT NULL;

-- Update any existing triggers to work with validade column
-- (The trigger in the schema should already handle this)

-- Add some sample data for testing if the table is empty
INSERT INTO produtos (
    farmacia_id, 
    nome, 
    preco_venda, 
    preco_custo, 
    estoque_atual, 
    validade, 
    ativo
) 
SELECT 
    '550e8400-e29b-41d4-a716-446655440000',
    'Produto Teste ' || generate_series,
    10.50 + (generate_series * 2.30),
    5.25 + (generate_series * 1.15),
    50 - (generate_series * 2),
    CURRENT_DATE + (generate_series * 10) + INTERVAL '30 days',
    true
FROM generate_series(1, 5)
WHERE NOT EXISTS (
    SELECT 1 FROM produtos 
    WHERE farmacia_id = '550e8400-e29b-41d4-a716-446655440000'
);

-- Verify the fix
SELECT 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'produtos' 
AND column_name IN ('validade', 'data_vencimento')
ORDER BY column_name;