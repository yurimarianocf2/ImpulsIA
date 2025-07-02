-- Script para aplicar as atualizações do schema
-- Execute este script no Supabase SQL Editor

-- 1. Verificar se a tabela farmacias existe e suas colunas
DO $$
BEGIN
    -- Adicionar coluna whatsapp_number se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'farmacias' AND column_name = 'whatsapp_number'
    ) THEN
        ALTER TABLE farmacias ADD COLUMN whatsapp_number VARCHAR(20) UNIQUE;
    END IF;
    
    -- Adicionar coluna config se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'farmacias' AND column_name = 'config'
    ) THEN
        ALTER TABLE farmacias ADD COLUMN config JSONB DEFAULT '{}';
    END IF;
    
    -- Adicionar coluna ativo se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'farmacias' AND column_name = 'ativo'
    ) THEN
        ALTER TABLE farmacias ADD COLUMN ativo BOOLEAN DEFAULT true;
    END IF;
    
    -- Adicionar coluna endereco se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'farmacias' AND column_name = 'endereco'
    ) THEN
        ALTER TABLE farmacias ADD COLUMN endereco JSONB;
    END IF;
END
$$;

-- 2. Criar tabela produtos se não existir
CREATE TABLE IF NOT EXISTS produtos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmacia_id UUID REFERENCES farmacias(id) ON DELETE CASCADE,
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
    ativo BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(farmacia_id, codigo_barras)
);

-- 3. Criar tabela analises_preco se não existir
CREATE TABLE IF NOT EXISTS analises_preco (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmacia_id UUID REFERENCES farmacias(id) ON DELETE CASCADE,
    produto_id UUID REFERENCES produtos(id),
    preco_local DECIMAL(10,2),
    preco_medio_mercado DECIMAL(10,2),
    posicao_competitiva VARCHAR(20), -- 'abaixo', 'medio', 'acima'
    margem_atual DECIMAL(5,2),
    precos_externos JSONB DEFAULT '[]',
    recomendacao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 4. Criar índices se não existirem
CREATE INDEX IF NOT EXISTS idx_produtos_farmacia ON produtos(farmacia_id);
CREATE INDEX IF NOT EXISTS idx_produtos_nome ON produtos(nome);
CREATE INDEX IF NOT EXISTS idx_produtos_codigo_barras ON produtos(codigo_barras);
CREATE INDEX IF NOT EXISTS idx_analises_preco_farmacia ON analises_preco(farmacia_id);
CREATE INDEX IF NOT EXISTS idx_analises_preco_produto ON analises_preco(produto_id);
CREATE INDEX IF NOT EXISTS idx_analises_preco_data ON analises_preco(created_at DESC);

-- 5. Inserir farmácia exemplo (caso não exista)
INSERT INTO farmacias (id, nome, cnpj, telefone) 
VALUES (
    '550e8400-e29b-41d4-a716-446655440000', 
    'Farmácia Saúde Total', 
    '98.765.432/0001-10', 
    '11987654321'
)
ON CONFLICT (id) DO NOTHING;

-- 6. Atualizar farmácia com dados adicionais se existir
UPDATE farmacias 
SET 
    whatsapp_number = COALESCE(whatsapp_number, '5511987654321'),
    config = COALESCE(config, '{"horario_funcionamento": {"seg-sex": "08:00-22:00", "sab": "08:00-20:00", "dom": "09:00-18:00"}, "delivery": {"ativo": true, "raio_km": 5, "taxa_minima": 3.00}}'::jsonb),
    ativo = COALESCE(ativo, true)
WHERE id = '550e8400-e29b-41d4-a716-446655440000';

-- 7. Comentários nas tabelas
COMMENT ON TABLE analises_preco IS 'Histórico de análises de preços e comparações de mercado';
COMMENT ON TABLE produtos IS 'Catálogo de produtos das farmácias com informações de preço e estoque';

SELECT 'Schema atualizado com sucesso!' as status;