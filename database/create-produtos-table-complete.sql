-- COMPLETE produtos table creation with all necessary columns
-- Run this in Supabase SQL Editor if the table doesn't exist or is incomplete

-- First, check if table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'produtos') THEN
        RAISE NOTICE 'Creating produtos table...';
        
        -- Create the complete produtos table
        CREATE TABLE produtos (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            farmacia_id UUID NOT NULL,
            codigo_barras VARCHAR(50),
            nome VARCHAR(255) NOT NULL,
            descricao TEXT,
            categoria VARCHAR(100),
            subcategoria VARCHAR(100),
            fabricante VARCHAR(255),
            principio_ativo VARCHAR(255),
            apresentacao VARCHAR(255),
            preco_venda DECIMAL(10,2),
            preco_custo DECIMAL(10,2),
            margem_lucro DECIMAL(5,2),
            estoque_atual INTEGER DEFAULT 0,
            estoque_minimo INTEGER DEFAULT 5,
            unidade VARCHAR(20) DEFAULT 'UN',
            requer_receita BOOLEAN DEFAULT false,
            tipo_receita VARCHAR(50),
            validade DATE,  -- This is the key column for expiring products
            ativo BOOLEAN DEFAULT true,
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Add foreign key constraint if farmacias table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'farmacias') THEN
            ALTER TABLE produtos ADD CONSTRAINT fk_produtos_farmacia 
            FOREIGN KEY (farmacia_id) REFERENCES farmacias(id) ON DELETE CASCADE;
        END IF;
        
    ELSE
        RAISE NOTICE 'Table produtos already exists';
        
        -- Check if validade column exists, add it if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'produtos' AND column_name = 'validade'
        ) THEN
            RAISE NOTICE 'Adding validade column...';
            ALTER TABLE produtos ADD COLUMN validade DATE;
        END IF;
        
        -- Check if data_vencimento exists and rename it
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'produtos' AND column_name = 'data_vencimento'
        ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'produtos' AND column_name = 'validade'
        ) THEN
            RAISE NOTICE 'Renaming data_vencimento to validade...';
            ALTER TABLE produtos RENAME COLUMN data_vencimento TO validade;
        END IF;
    END IF;
END $$;

-- Create essential indexes
CREATE INDEX IF NOT EXISTS idx_produtos_farmacia ON produtos(farmacia_id);
CREATE INDEX IF NOT EXISTS idx_produtos_nome ON produtos(nome);
CREATE INDEX IF NOT EXISTS idx_produtos_ativo ON produtos(ativo) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_produtos_validade ON produtos(farmacia_id, validade) 
WHERE ativo = true AND validade IS NOT NULL;

-- Create index for expiring products query specifically
CREATE INDEX IF NOT EXISTS idx_produtos_expiring 
ON produtos(farmacia_id, validade, ativo) 
WHERE ativo = true AND validade IS NOT NULL;

-- Ensure farmacias table exists with default pharmacy
INSERT INTO farmacias (id, nome, cnpj, telefone, whatsapp, ativo)
VALUES (
    '550e8400-e29b-41d4-a716-446655440000'::uuid,
    'Farmácia Padrão',
    '12.345.678/0001-90',
    '11999999999',
    '5511999999999',
    true
) ON CONFLICT (id) DO NOTHING;

-- Insert sample products for testing
INSERT INTO produtos (
    farmacia_id,
    nome,
    categoria,
    preco_venda,
    preco_custo,
    estoque_atual,
    validade,
    ativo
) VALUES 
    (
        '550e8400-e29b-41d4-a716-446655440000'::uuid,
        'Dipirona 500mg',
        'Analgésicos',
        8.90,
        4.50,
        45,
        CURRENT_DATE + INTERVAL '30 days',
        true
    ),
    (
        '550e8400-e29b-41d4-a716-446655440000'::uuid,
        'Paracetamol 750mg',
        'Analgésicos',
        12.50,
        6.25,
        67,
        CURRENT_DATE + INTERVAL '45 days',
        true
    ),
    (
        '550e8400-e29b-41d4-a716-446655440000'::uuid,
        'Vitamina C 1g',
        'Vitaminas',
        15.00,
        7.50,
        23,
        CURRENT_DATE + INTERVAL '60 days',
        true
    ),
    (
        '550e8400-e29b-41d4-a716-446655440000'::uuid,
        'Xarope Expectorante',
        'Respiratório',
        22.00,
        11.00,
        12,
        CURRENT_DATE + INTERVAL '20 days',
        true
    ),
    (
        '550e8400-e29b-41d4-a716-446655440000'::uuid,
        'Produto Vencido (teste)',
        'Teste',
        5.00,
        2.50,
        5,
        CURRENT_DATE - INTERVAL '5 days',
        true
    )
ON CONFLICT DO NOTHING;

-- Verify the setup
SELECT 
    'produtos table' as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE validade IS NOT NULL) as records_with_validade,
    COUNT(*) FILTER (WHERE validade < CURRENT_DATE + INTERVAL '60 days') as expiring_soon
FROM produtos
WHERE farmacia_id = '550e8400-e29b-41d4-a716-446655440000'::uuid;