-- Script SQL para configurar banco de dados
-- Execute este código no SQL Editor do Supabase

-- 1. Criar tabela farmacias
CREATE TABLE IF NOT EXISTS farmacias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    cnpj VARCHAR(18),
    telefone VARCHAR(20),
    whatsapp_number VARCHAR(20),
    endereco JSONB,
    config JSONB DEFAULT '{}',
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criar tabela produtos
CREATE TABLE IF NOT EXISTS produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(farmacia_id, codigo_barras)
);

-- 3. Criar tabela analises_preco
CREATE TABLE IF NOT EXISTS analises_preco (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmacia_id UUID REFERENCES farmacias(id) ON DELETE CASCADE,
    produto_id UUID REFERENCES produtos(id) ON DELETE CASCADE,
    preco_local DECIMAL(10,2) NOT NULL,
    preco_medio_mercado DECIMAL(10,2) NOT NULL,
    posicao_competitiva VARCHAR(20) NOT NULL,
    margem_atual DECIMAL(5,2),
    precos_externos JSONB DEFAULT '[]',
    recomendacao TEXT,
    estado_pesquisado VARCHAR(2) DEFAULT 'SP',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Criar índices
CREATE INDEX IF NOT EXISTS idx_analises_preco_farmacia ON analises_preco(farmacia_id);
CREATE INDEX IF NOT EXISTS idx_analises_preco_produto ON analises_preco(produto_id);
CREATE INDEX IF NOT EXISTS idx_analises_preco_created ON analises_preco(created_at DESC);

-- 5. Inserir farmácia demo
INSERT INTO farmacias (id, nome, cnpj, telefone, whatsapp_number, endereco, config)
VALUES (
    'farmacia-demo-uuid-12345'::uuid,
    'Farmácia Demo',
    '12.345.678/0001-90',
    '11999999999',
    '11999999999',
    '{"rua": "Rua das Flores, 123", "bairro": "Centro", "cidade": "São Paulo", "estado": "SP", "cep": "01000-000"}',
    '{"horario_funcionamento": "08:00-22:00", "entrega_disponivel": true, "taxa_entrega": 5.0}'
)
ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    cnpj = EXCLUDED.cnpj,
    telefone = EXCLUDED.telefone,
    whatsapp_number = EXCLUDED.whatsapp_number,
    endereco = EXCLUDED.endereco,
    config = EXCLUDED.config,
    updated_at = NOW();

-- 6. Inserir produtos demo
INSERT INTO produtos (id, farmacia_id, codigo_barras, nome, descricao, categoria, fabricante, principio_ativo, apresentacao, preco_venda, preco_custo, margem_lucro, estoque_atual, estoque_minimo, requer_receita)
VALUES 
    (
        'produto-demo-dipirona'::uuid,
        'farmacia-demo-uuid-12345'::uuid,
        '7891000100103',
        'Dipirona 500mg',
        'Analgésico e antitérmico',
        'Medicamentos',
        'Medley',
        'Dipirona Sódica',
        'Comprimido 500mg - Caixa com 20 comprimidos',
        8.90,
        4.50,
        49.44,
        45,
        10,
        false
    ),
    (
        'produto-demo-paracetamol'::uuid,
        'farmacia-demo-uuid-12345'::uuid,
        '7891000100104',
        'Paracetamol 750mg',
        'Analgésico e antitérmico',
        'Medicamentos',
        'EMS',
        'Paracetamol',
        'Comprimido 750mg - Caixa com 20 comprimidos',
        12.50,
        6.25,
        50.0,
        67,
        15,
        false
    ),
    (
        'produto-demo-vitamina-c'::uuid,
        'farmacia-demo-uuid-12345'::uuid,
        '7891000100105',
        'Vitamina C 1g',
        'Suplemento vitamínico',
        'Vitaminas',
        'Redoxon',
        'Ácido Ascórbico',
        'Comprimido efervescente 1g - Tubo com 10 comprimidos',
        15.00,
        7.50,
        50.0,
        23,
        5,
        false
    )
ON CONFLICT (farmacia_id, codigo_barras) DO UPDATE SET
    nome = EXCLUDED.nome,
    descricao = EXCLUDED.descricao,
    categoria = EXCLUDED.categoria,
    fabricante = EXCLUDED.fabricante,
    principio_ativo = EXCLUDED.principio_ativo,
    apresentacao = EXCLUDED.apresentacao,
    preco_venda = EXCLUDED.preco_venda,
    preco_custo = EXCLUDED.preco_custo,
    margem_lucro = EXCLUDED.margem_lucro,
    estoque_atual = EXCLUDED.estoque_atual,
    estoque_minimo = EXCLUDED.estoque_minimo,
    requer_receita = EXCLUDED.requer_receita,
    updated_at = NOW();

-- 7. Criar view para relatórios
CREATE OR REPLACE VIEW v_relatorio_analises_preco AS
SELECT 
    ap.*,
    p.nome as produto_nome,
    p.codigo_barras,
    p.categoria,
    p.principio_ativo,
    f.nome as farmacia_nome,
    CASE 
        WHEN ap.posicao_competitiva = 'abaixo' THEN 
            (ap.preco_medio_mercado - ap.preco_local) * p.estoque_atual
        WHEN ap.posicao_competitiva = 'acima' THEN 
            -(ap.preco_local - ap.preco_medio_mercado) * p.estoque_atual
        ELSE 0 
    END as impacto_financeiro_estimado
FROM analises_preco ap
JOIN produtos p ON ap.produto_id = p.id
JOIN farmacias f ON ap.farmacia_id = f.id
ORDER BY ap.created_at DESC;