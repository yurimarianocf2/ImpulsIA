-- Adicionar tabela para armazenar análises de preços
CREATE TABLE IF NOT EXISTS analises_preco (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmacia_id UUID REFERENCES farmacias(id) ON DELETE CASCADE,
    produto_id UUID REFERENCES produtos(id) ON DELETE CASCADE,
    preco_local DECIMAL(10,2) NOT NULL,
    preco_medio_mercado DECIMAL(10,2) NOT NULL,
    posicao_competitiva VARCHAR(20) NOT NULL, -- 'abaixo', 'medio', 'acima'
    margem_atual DECIMAL(5,2),
    precos_externos JSONB DEFAULT '[]',
    recomendacao TEXT,
    estado_pesquisado VARCHAR(2) DEFAULT 'SP',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Índices para performance
CREATE INDEX idx_analises_preco_farmacia ON analises_preco(farmacia_id);
CREATE INDEX idx_analises_preco_produto ON analises_preco(produto_id);
CREATE INDEX idx_analises_preco_created ON analises_preco(created_at DESC);

-- View para relatórios de análise de preços
CREATE VIEW v_relatorio_analises_preco AS
SELECT 
    ap.*,
    p.nome as produto_nome,
    p.codigo_barras,
    p.categoria,
    p.principio_ativo,
    f.nome as farmacia_nome,
    -- Calcular economia/prejuízo potencial
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

COMMENT ON TABLE analises_preco IS 'Histórico de análises de preços realizadas com dados de mercado';
COMMENT ON VIEW v_relatorio_analises_preco IS 'Relatório completo de análises de preços com impacto financeiro estimado';